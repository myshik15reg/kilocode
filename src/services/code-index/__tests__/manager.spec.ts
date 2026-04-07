import { CodeIndexManager } from "../manager"
import { CodeIndexServiceFactory } from "../service-factory"
import type { MockedClass } from "vitest"
import * as path from "path"

// Mock ManagedIndexer before importing anything that uses it
vi.mock("../managed/ManagedIndexer", () => ({
	ManagedIndexer: {
		getInstance: vi.fn().mockReturnValue({
			isEnabled: vi.fn().mockReturnValue(false),
			organization: null,
		}),
	},
}))

// Mock vscode module
vi.mock("vscode", () => {
	const testPath = require("path")
	const testWorkspacePath = testPath.join(testPath.sep, "test", "workspace")
	return {
		window: {
			activeTextEditor: null,
		},
		workspace: {
			workspaceFolders: [
				{
					uri: { fsPath: testWorkspacePath },
					name: "test",
					index: 0,
				},
			],
			createFileSystemWatcher: vi.fn().mockReturnValue({
				onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				dispose: vi.fn(),
			}),
		},
		RelativePattern: vi.fn().mockImplementation((base, pattern) => ({ base, pattern })),
	}
})

// Mock only the essential dependencies
vi.mock("../../../utils/path", () => {
	const testPath = require("path")
	const testWorkspacePath = testPath.join(testPath.sep, "test", "workspace")
	return {
		getWorkspacePath: vi.fn(() => testWorkspacePath),
	}
})

// Mock fs/promises for RooIgnoreController
vi.mock("fs/promises", () => ({
	default: {
		readFile: vi.fn().mockRejectedValue(new Error("File not found")), // Simulate no .gitignore/.rooignore
	},
}))

// Mock file utils for RooIgnoreController
vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn().mockResolvedValue(false), // Simulate no .rooignore file
}))

// Mock ignore module
vi.mock("ignore", () => ({
	default: vi.fn().mockReturnValue({
		add: vi.fn(),
		ignores: vi.fn().mockReturnValue(false),
	}),
}))

vi.mock("../state-manager", () => ({
	CodeIndexStateManager: vi.fn().mockImplementation(() => ({
		onProgressUpdate: vi.fn(),
		getCurrentStatus: vi.fn(),
		dispose: vi.fn(),
		setSystemState: vi.fn(),
	})),
}))

// Mock TelemetryService
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

vi.mock("../service-factory")
const MockedCodeIndexServiceFactory = CodeIndexServiceFactory as MockedClass<typeof CodeIndexServiceFactory>

describe("CodeIndexManager - handleSettingsChange regression", () => {
	let mockContext: any
	let manager: CodeIndexManager

	// Define test paths for use in tests
	const testWorkspacePath = path.join(path.sep, "test", "workspace")
	const testExtensionPath = path.join(path.sep, "test", "extension")
	const testStoragePath = path.join(path.sep, "test", "storage")
	const testGlobalStoragePath = path.join(path.sep, "test", "global-storage")
	const testLogPath = path.join(path.sep, "test", "log")

	beforeEach(async () => {
		// Clear all instances before each test
		await CodeIndexManager.disposeAll()

		mockContext = {
			subscriptions: [],
			workspaceState: {} as any,
			globalState: {} as any,
			extensionUri: {} as any,
			extensionPath: testExtensionPath,
			asAbsolutePath: vi.fn(),
			storageUri: {} as any,
			storagePath: testStoragePath,
			globalStorageUri: {} as any,
			globalStoragePath: testGlobalStoragePath,
			logUri: {} as any,
			logPath: testLogPath,
			extensionMode: 3, // vscode.ExtensionMode.Test
			secrets: {} as any,
			environmentVariableCollection: {} as any,
			extension: {} as any,
			languageModelAccessInformation: {} as any,
		}

		manager = CodeIndexManager.getInstance(mockContext)!
	})

	afterEach(async () => {
		await CodeIndexManager.disposeAll()
	})

	describe("handleSettingsChange", () => {
		it("should not throw when called on uninitialized manager (regression test)", async () => {
			// This is the core regression test: handleSettingsChange() should not throw
			// when called before the manager is initialized (during first-time configuration)

			// Ensure manager is not initialized
			expect(manager.isInitialized).toBe(false)

			// Mock a minimal config manager that simulates first-time configuration
			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: true }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			const mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Mock the feature state to simulate valid configuration that would normally trigger restart
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			vi.spyOn(manager, "isFeatureConfigured", "get").mockReturnValue(true)

			// Mock service factory to handle _recreateServices call
			const mockServiceFactoryInstance = {
				configManager: mockConfigManager,
				workspacePath: testWorkspacePath,
				cacheManager: mockCacheManager,
				createEmbedder: vi.fn().mockReturnValue({ embedderInfo: { name: "openai" } }),
				createVectorStore: vi.fn().mockReturnValue({}),
				createDirectoryScanner: vi.fn().mockReturnValue({}),
				createFileWatcher: vi.fn().mockReturnValue({
					onDidStartBatchProcessing: vi.fn(),
					onBatchProgressUpdate: vi.fn(),
					watch: vi.fn(),
					stopWatcher: vi.fn(),
					dispose: vi.fn(),
				}),
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(() => mockServiceFactoryInstance as any)

			// The key test: this should NOT throw "CodeIndexManager not initialized" error
			await expect(manager.handleSettingsChange()).resolves.not.toThrow()

			// Verify that loadConfiguration was called (the method should still work)
			expect(mockConfigManager.loadConfiguration).toHaveBeenCalled()
		})

		it("should work normally when manager is initialized", async () => {
			// Mock a complete config manager with all required properties
			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: true }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			const mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Simulate an initialized manager by setting the required properties
			;(manager as any)._orchestrator = { stopWatcher: vi.fn() }
			;(manager as any)._searchService = {}

			// Verify manager is considered initialized
			expect(manager.isInitialized).toBe(true)

			// Mock the feature state
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			vi.spyOn(manager, "isFeatureConfigured", "get").mockReturnValue(true)

			// Mock service factory to handle _recreateServices call
			const mockServiceFactoryInstance = {
				configManager: mockConfigManager,
				workspacePath: testWorkspacePath,
				cacheManager: mockCacheManager,
				createEmbedder: vi.fn().mockReturnValue({ embedderInfo: { name: "openai" } }),
				createVectorStore: vi.fn().mockReturnValue({}),
				createDirectoryScanner: vi.fn().mockReturnValue({}),
				createFileWatcher: vi.fn().mockReturnValue({
					onDidStartBatchProcessing: vi.fn(),
					onBatchProgressUpdate: vi.fn(),
					watch: vi.fn(),
					stopWatcher: vi.fn(),
					dispose: vi.fn(),
				}),
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(() => mockServiceFactoryInstance as any)

			// Mock the methods that would be called during restart
			const recreateServicesSpy = vi.spyOn(manager as any, "_recreateServices")

			await manager.handleSettingsChange()

			// Verify that the restart sequence was called
			expect(mockConfigManager.loadConfiguration).toHaveBeenCalled()
			// _recreateServices should be called when requiresRestart is true
			expect(recreateServicesSpy).toHaveBeenCalled()
			// Note: startIndexing is NOT called by handleSettingsChange - it's only called by initialize()
		})

		it("should handle case when config manager is not set", async () => {
			// Ensure config manager is not set (edge case)
			;(manager as any)._configManager = undefined

			// This should not throw an error
			await expect(manager.handleSettingsChange()).resolves.not.toThrow()
		})

		it("should run Neo4j catch-up when Neo4j is enabled and no restart is required", async () => {
			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				isNeo4jEnabled: true,
				currentRerankConfig: {},
			}
			;(manager as any)._configManager = mockConfigManager

			const syncNeo4jWithCurrentIndex = vi.fn().mockResolvedValue(undefined)
			;(manager as any)._orchestrator = { syncNeo4jWithCurrentIndex }
			;(manager as any)._searchService = { updateRerankConfig: vi.fn() }

			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			vi.spyOn(manager, "isFeatureConfigured", "get").mockReturnValue(true)

			await manager.handleSettingsChange()

			expect(syncNeo4jWithCurrentIndex).toHaveBeenCalledTimes(1)
		})
	})

	describe("embedder validation integration", () => {
		let mockServiceFactoryInstance: any
		let mockStateManager: any
		let mockEmbedder: any
		let mockVectorStore: any
		let mockScanner: any
		let mockFileWatcher: any

		beforeEach(() => {
			// Mock service factory objects
			mockEmbedder = { embedderInfo: { name: "openai" } }
			mockVectorStore = {}
			mockScanner = {}
			mockFileWatcher = {
				onDidStartBatchProcessing: vi.fn(),
				onBatchProgressUpdate: vi.fn(),
				watch: vi.fn(),
				stopWatcher: vi.fn(),
				dispose: vi.fn(),
			}

			// Mock service factory instance
			mockServiceFactoryInstance = {
				createServices: vi.fn().mockReturnValue({
					embedder: mockEmbedder,
					vectorStore: mockVectorStore,
					scanner: mockScanner,
					fileWatcher: mockFileWatcher,
				}),
				validateEmbedder: vi.fn(),
			}

			// Mock the ServiceFactory constructor
			MockedCodeIndexServiceFactory.mockImplementation(() => mockServiceFactoryInstance)

			// Mock state manager methods directly on the existing instance
			mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()

			// Mock config manager
			const mockConfigManager = {
				loadConfiguration: vitest.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vitest.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager
		})

		it("should validate embedder during _recreateServices when validation succeeds", async () => {
			// Arrange
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({ valid: true })

			// Act - directly call the private method for testing
			await (manager as any)._recreateServices()

			// Assert
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).not.toHaveBeenCalledWith("Error", expect.any(String))
		})

		it("should set error state when embedder validation fails", async () => {
			// Arrange
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({
				valid: false,
				error: "embeddings:validation.authenticationFailed",
			})

			// Act & Assert
			await expect((manager as any)._recreateServices()).rejects.toThrow(
				"embeddings:validation.authenticationFailed",
			)

			// Assert other expectations
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				"embeddings:validation.authenticationFailed",
			)
		})

		it("should set generic error state when embedder validation throws", async () => {
			// Arrange
			// Since the real service factory catches exceptions, we should mock it to resolve with an error
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({
				valid: false,
				error: "embeddings:validation.configurationError",
			})

			// Act & Assert
			await expect((manager as any)._recreateServices()).rejects.toThrow(
				"embeddings:validation.configurationError",
			)

			// Assert other expectations
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				"embeddings:validation.configurationError",
			)
		})

		it("should handle embedder creation failure", async () => {
			// Arrange
			mockServiceFactoryInstance.createServices.mockImplementation(() => {
				throw new Error("Invalid configuration")
			})

			// Act & Assert - should throw the error
			await expect((manager as any)._recreateServices()).rejects.toThrow("Invalid configuration")

			// Should not attempt validation if embedder creation fails
			expect(mockServiceFactoryInstance.validateEmbedder).not.toHaveBeenCalled()
		})
	})

	describe("recoverFromError", () => {
		let mockConfigManager: any
		let mockCacheManager: any
		let mockStateManager: any

		beforeEach(() => {
			// Mock config manager
			mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Mock state manager
			mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()
			mockStateManager.getCurrentStatus = vi.fn().mockReturnValue({
				systemStatus: "Error",
				message: "Failed during initial scan: fetch failed",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			// Mock orchestrator and search service to simulate initialized state
			;(manager as any)._orchestrator = { stopWatcher: vi.fn(), state: "Error" }
			;(manager as any)._searchService = {}
			;(manager as any)._serviceFactory = {}
		})

		it("should clear error state when recoverFromError is called", async () => {
			// Act
			await manager.recoverFromError()

			// Assert
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Standby", "")
		})

		it("should reset internal service instances", async () => {
			// Verify initial state
			expect((manager as any)._configManager).toBeDefined()
			expect((manager as any)._serviceFactory).toBeDefined()
			expect((manager as any)._orchestrator).toBeDefined()
			expect((manager as any)._searchService).toBeDefined()

			// Act
			await manager.recoverFromError()

			// Assert - all service instances should be undefined
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()
		})

		it("should make manager report as not initialized after recovery", async () => {
			// Verify initial state
			expect(manager.isInitialized).toBe(true)

			// Act
			await manager.recoverFromError()

			// Assert
			expect(manager.isInitialized).toBe(false)
		})

		it("should allow re-initialization after recovery", async () => {
			// Setup mock for re-initialization
			const mockServiceFactoryInstance = {
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(() => mockServiceFactoryInstance as any)

			// Act - recover from error
			await manager.recoverFromError()

			// Verify manager is not initialized
			expect(manager.isInitialized).toBe(false)

			// Mock context proxy for initialization
			const mockContextProxy = {
				getValue: vi.fn(),
				setValue: vi.fn(),
				storeSecret: vi.fn(),
				getSecret: vi.fn(),
				refreshSecrets: vi.fn().mockResolvedValue(undefined),
				getWorkspaceState: vi.fn().mockResolvedValue(undefined),
				updateWorkspaceState: vi.fn().mockResolvedValue(undefined),
				getGlobalState: vi.fn().mockReturnValue({
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codebaseIndexEmbedderModelDimension: 1536,
					codebaseIndexSearchMaxResults: 10,
					codebaseIndexSearchMinScore: 0.4,
				}),
			}

			// Re-initialize
			await manager.initialize(mockContextProxy as any)

			// Assert - manager should be initialized again
			expect(manager.isInitialized).toBe(true)
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalled()
		})

		it("should be safe to call when not in error state (idempotent)", async () => {
			// Setup manager in non-error state
			mockStateManager.getCurrentStatus.mockReturnValue({
				systemStatus: "Standby",
				message: "",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			// Verify initial state is not error
			const initialStatus = manager.getCurrentStatus()
			expect(initialStatus.systemStatus).not.toBe("Error")

			// Act - call recoverFromError when not in error state
			await expect(manager.recoverFromError()).resolves.not.toThrow()

			// Assert - should still clear state and service instances
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Standby", "")
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()
		})

		it("should continue recovery even if setSystemState throws", async () => {
			// Setup state manager to throw on setSystemState
			mockStateManager.setSystemState.mockImplementation(() => {
				throw new Error("State update failed")
			})

			// Setup manager with service instances
			;(manager as any)._configManager = mockConfigManager
			;(manager as any)._serviceFactory = {}
			;(manager as any)._orchestrator = { stopWatcher: vi.fn() }
			;(manager as any)._searchService = {}

			// Spy on console.error
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			// Act - should not throw despite setSystemState error
			await expect(manager.recoverFromError()).resolves.not.toThrow()

			// Assert - error should be logged
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to clear error state during recovery:",
				expect.any(Error),
			)

			// Assert - service instances should still be cleared
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()

			// Cleanup
			consoleErrorSpy.mockRestore()
		})
	})

	describe("searchIndexDetailed", () => {
		it("returns a disabled structured envelope when the feature is off", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(false)

			await expect(manager.searchIndexDetailed("impact query")).resolves.toEqual({
				query: "impact query",
				queryClass: "broad_repo_research",
				retrievalMode: "adaptive",
				retrievalConfidence: 0,
				results: [],
				keyPoints: [],
				sources: [],
				warnings: ["Code indexing is disabled."],
				postprocessUsed: false,
				compressionApplied: false,
			})
		})

		it("returns artifact-only matches when code indexing is disabled for workflow queries", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(false)
			;(manager as any)._artifactSearchService = {
				searchDetailed: vi.fn().mockResolvedValue({
					query: "workflow protocol guide",
					queryClass: "workflow_docs",
					retrievalMode: "adaptive",
					retrievalConfidence: 0.82,
					results: [
						{
							id: "artifact-1",
							score: 0.82,
							filePath: "/test/workspace/.kilocode/workflows/quickref.md",
							codeChunk: "workflow docs guidance",
							startLine: 1,
							endLine: 3,
							citationLabel: ".kilocode/workflows/quickref.md:1-3",
							sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.82 }],
							confidence: 0.82,
						},
					],
					keyPoints: [".kilocode/workflows/quickref.md:1-3"],
					sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.82 }],
					warnings: [],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("workflow protocol guide")).resolves.toMatchObject({
				queryClass: "workflow_docs",
				results: [expect.objectContaining({ filePath: "/test/workspace/.kilocode/workflows/quickref.md" })],
				warnings: ["Code indexing is disabled; returned artifact matches only."],
			})
		})

		it("merges artifact hits ahead of code search results for workflow queries", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._configManager = {
				isFeatureEnabled: true,
				isFeatureConfigured: true,
				currentSearchMaxResults: 5,
			}
			;(manager as any)._orchestrator = {}
			;(manager as any)._cacheManager = {}
			;(manager as any)._stateManager.getCurrentStatus = vi.fn().mockReturnValue({ systemStatus: "Indexed" })
			;(manager as any)._artifactSearchService = {
				searchDetailed: vi.fn().mockResolvedValue({
					query: "workflow protocol guide",
					queryClass: "workflow_docs",
					retrievalMode: "adaptive",
					retrievalConfidence: 0.71,
					results: [
						{
							id: "artifact-1",
							score: 0.71,
							filePath: "/test/workspace/.kilocode/workflows/quickref.md",
							codeChunk: "workflow docs guidance",
							startLine: 1,
							endLine: 3,
							citationLabel: ".kilocode/workflows/quickref.md:1-3",
							sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.71 }],
							confidence: 0.71,
						},
					],
					keyPoints: [".kilocode/workflows/quickref.md:1-3"],
					sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.71 }],
					warnings: [],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}
			;(manager as any)._searchService = {
				searchIndexDetailed: vi.fn().mockResolvedValue({
					query: "workflow protocol guide",
					queryClass: "workflow_docs",
					retrievalMode: "hybrid",
					retrievalConfidence: 0.65,
					results: [
						{
							id: "code-1",
							score: 0.65,
							filePath: "/test/workspace/src/core/task/Task.ts",
							codeChunk: "load protocol context",
							startLine: 40,
							endLine: 42,
							citationLabel: "src/core/task/Task.ts:40-42",
							sources: [{ type: "semantic", label: "semantic match", score: 0.65 }],
							confidence: 0.65,
						},
					],
					keyPoints: ["src/core/task/Task.ts:40-42"],
					sources: [{ type: "semantic", label: "semantic match", score: 0.65 }],
					warnings: [],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("workflow protocol guide")).resolves.toMatchObject({
				retrievalMode: "hybrid",
				results: [
					expect.objectContaining({ filePath: "/test/workspace/.kilocode/workflows/quickref.md" }),
					expect.objectContaining({ filePath: "/test/workspace/src/core/task/Task.ts" }),
				],
			})
		})

		it("returns degraded lexical code matches when code indexing is not initialized and artifact search is irrelevant", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._artifactSearchService = {
				searchCodeFallbackDetailed: vi.fn().mockResolvedValue({
					query: "load config",
					queryClass: "implementation_search",
					retrievalMode: "adaptive",
					retrievalConfidence: 0.41,
					results: [
						{
							id: "fallback-1",
							score: 0.41,
							filePath: "/test/workspace/src/config.ts",
							codeChunk: "load config",
							startLine: 10,
							endLine: 12,
							citationLabel: "src/config.ts:10-12",
							sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.41 }],
							confidence: 0.41,
						},
					],
					keyPoints: ["src/config.ts:10-12"],
					sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.41 }],
					warnings: ["Semantic retrieval failed; returned bounded lexical fallback over code surfaces."],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("load config", "src")).resolves.toMatchObject({
				results: [expect.objectContaining({ filePath: "/test/workspace/src/config.ts" })],
				warnings: [
					"Semantic retrieval failed; returned bounded lexical fallback over code surfaces.",
					"Code indexing is not initialized; returned degraded lexical code matches.",
				],
			})
			expect((manager as any)._artifactSearchService.searchCodeFallbackDetailed).toHaveBeenCalledWith({
				query: "load config",
				directoryPrefix: "src",
			})
		})

		it("returns degraded lexical code matches when index status is not ready and artifact search is irrelevant", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._configManager = { isFeatureEnabled: true, isFeatureConfigured: true }
			;(manager as any)._orchestrator = {}
			;(manager as any)._cacheManager = {}
			;(manager as any)._searchService = { searchIndexDetailed: vi.fn() }
			;(manager as any)._stateManager.getCurrentStatus = vi.fn().mockReturnValue({ systemStatus: "Standby" })
			;(manager as any)._artifactSearchService = {
				searchCodeFallbackDetailed: vi.fn().mockResolvedValue({
					query: "load config",
					queryClass: "implementation_search",
					retrievalMode: "adaptive",
					retrievalConfidence: 0.39,
					results: [
						{
							id: "fallback-standby-1",
							score: 0.39,
							filePath: "/test/workspace/src/config.ts",
							codeChunk: "load config",
							startLine: 10,
							endLine: 12,
							citationLabel: "src/config.ts:10-12",
							sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.39 }],
							confidence: 0.39,
						},
					],
					keyPoints: ["src/config.ts:10-12"],
					sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.39 }],
					warnings: ["Semantic retrieval failed; returned bounded lexical fallback over code surfaces."],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("load config", "src")).resolves.toMatchObject({
				results: [expect.objectContaining({ filePath: "/test/workspace/src/config.ts" })],
				warnings: [
					"Semantic retrieval failed; returned bounded lexical fallback over code surfaces.",
					"Code indexing has not started; returned degraded lexical code matches.",
				],
			})
			expect((manager as any)._searchService.searchIndexDetailed).not.toHaveBeenCalled()
		})

		it("delegates detailed retrieval to the search service when initialized", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._configManager = { isFeatureEnabled: true, isFeatureConfigured: true }
			;(manager as any)._orchestrator = {}
			;(manager as any)._cacheManager = {}
			;(manager as any)._searchService = {
				searchIndexDetailed: vi.fn().mockResolvedValue({
					query: "load config",
					queryClass: "symbol_lookup",
					retrievalMode: "hybrid",
					retrievalConfidence: 0.91,
					results: [],
					keyPoints: ["src/config.ts:10-14"],
					sources: [{ type: "semantic", label: "semantic match", score: 0.9 }],
					warnings: [],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("load config", "src")).resolves.toMatchObject({
				query: "load config",
				retrievalMode: "hybrid",
				keyPoints: ["src/config.ts:10-14"],
			})
			expect((manager as any)._searchService.searchIndexDetailed).toHaveBeenCalledWith({
				query: "load config",
				directoryPrefix: "src",
			})
		})

		it("returns degraded lexical code matches when semantic retrieval fails without artifact hits", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._configManager = { isFeatureEnabled: true, isFeatureConfigured: true }
			;(manager as any)._orchestrator = {}
			;(manager as any)._cacheManager = {}
			;(manager as any)._stateManager.getCurrentStatus = vi.fn().mockReturnValue({ systemStatus: "Indexed" })
			;(manager as any)._searchService = {
				searchIndexDetailed: vi.fn().mockRejectedValue(new Error("Qdrant unavailable")),
			}
			;(manager as any)._artifactSearchService = {
				searchCodeFallbackDetailed: vi.fn().mockResolvedValue({
					query: "load config",
					queryClass: "implementation_search",
					retrievalMode: "adaptive",
					retrievalConfidence: 0.44,
					results: [
						{
							id: "fallback-1",
							score: 0.44,
							filePath: "/test/workspace/src/config.ts",
							codeChunk: "load config",
							startLine: 10,
							endLine: 12,
							citationLabel: "src/config.ts:10-12",
							sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.44 }],
							confidence: 0.44,
						},
					],
					keyPoints: ["src/config.ts:10-12"],
					sources: [{ type: "lexical", label: "degraded code fallback in config.ts", score: 0.44 }],
					warnings: ["Semantic retrieval failed; returned bounded lexical fallback over code surfaces."],
					postprocessUsed: true,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("load config", "src")).resolves.toMatchObject({
				queryClass: "implementation_search",
				results: [expect.objectContaining({ filePath: "/test/workspace/src/config.ts" })],
				warnings: [
					"Semantic retrieval failed; returned bounded lexical fallback over code surfaces.",
					"Code index retrieval failed; returned degraded lexical code matches.",
				],
			})
			expect((manager as any)._artifactSearchService.searchCodeFallbackDetailed).toHaveBeenCalledWith({
				query: "load config",
				directoryPrefix: "src",
			})
		})

		it("rethrows the original retrieval error when degraded fallback is empty", async () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			;(manager as any)._configManager = { isFeatureEnabled: true, isFeatureConfigured: true }
			;(manager as any)._orchestrator = {}
			;(manager as any)._cacheManager = {}
			;(manager as any)._stateManager.getCurrentStatus = vi.fn().mockReturnValue({ systemStatus: "Indexed" })
			;(manager as any)._searchService = {
				searchIndexDetailed: vi.fn().mockRejectedValue(new Error("Qdrant unavailable")),
			}
			;(manager as any)._artifactSearchService = {
				searchCodeFallbackDetailed: vi.fn().mockResolvedValue({
					query: "load config",
					queryClass: "implementation_search",
					retrievalMode: "adaptive",
					retrievalConfidence: 0,
					results: [],
					keyPoints: [],
					sources: [],
					warnings: [],
					postprocessUsed: false,
					compressionApplied: false,
				}),
			}

			await expect(manager.searchIndexDetailed("load config", "src")).rejects.toThrow("Qdrant unavailable")
		})
	})
})
