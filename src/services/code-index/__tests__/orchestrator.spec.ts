import { describe, it, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { stat } from "fs/promises"
import { CodeIndexOrchestrator } from "../orchestrator"

// Mock vscode workspace so startIndexing passes workspace check
vi.mock("vscode", () => {
	const path = require("path")
	const testWorkspacePath = path.join(path.sep, "test", "workspace")
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
			fs: {
				readFile: vi.fn(),
			},
		},
		RelativePattern: vi.fn().mockImplementation((base: string, pattern: string) => ({ base, pattern })),
		Uri: {
			file: (fsPath: string) => ({ fsPath }),
		},
	}
})

vi.mock("fs/promises", () => ({
	stat: vi.fn(),
}))

// Mock TelemetryService
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

// Mock i18n translator used in orchestrator messages
vi.mock("../../i18n", () => ({
	t: (key: string, params?: any) => {
		if (key === "embeddings:orchestrator.failedDuringInitialScan" && params?.errorMessage) {
			return `Failed during initial scan: ${params.errorMessage}`
		}
		return key
	},
}))

const { indexFileMock, deleteFilesMock, clearIndexMock, isReadyMock } = vi.hoisted(() => ({
	indexFileMock: vi.fn(),
	deleteFilesMock: vi.fn(),
	clearIndexMock: vi.fn(),
	isReadyMock: vi.fn(),
}))

const { connectMock, initializeMock } = vi.hoisted(() => ({
	connectMock: vi.fn(),
	initializeMock: vi.fn(),
}))

const { getCodeEntityCountMock } = vi.hoisted(() => ({
	getCodeEntityCountMock: vi.fn(),
}))

vi.mock("../../neo4j/connection-manager", () => ({
	Neo4jConnectionManager: {
		getInstance: () => ({
			connect: connectMock,
		}),
	},
}))

vi.mock("../../neo4j/graph-service", () => ({
	Neo4jGraphService: class {
		constructor(_connectionManager: any) {}
		initialize = initializeMock
		getCodeEntityCount = getCodeEntityCountMock
	},
}))

vi.mock("../../neo4j/relationship-indexer", () => ({
	RelationshipIndexer: class {
		indexFile = indexFileMock
		deleteFiles = deleteFilesMock
		clearIndex = clearIndexMock
		isReady = isReadyMock
	},
}))

describe("CodeIndexOrchestrator - error path cleanup gating", () => {
	const workspacePath = "/test/workspace"

	let configManager: any
	let stateManager: any
	let cacheManager: any
	let vectorStore: any
	let scanner: any
	let fileWatcher: any

	beforeEach(() => {
		vi.clearAllMocks()

		configManager = {
			isFeatureConfigured: true,
		}

		// Minimal state manager that tracks state transitions
		let currentState = "Standby"
		let currentMessage = ""
		stateManager = {
			get state() {
				return currentState
			},
			getCurrentStatus: vi.fn().mockImplementation(() => ({
				systemStatus: currentState,
				message: currentMessage,
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "blocks",
			})),
			setSystemState: vi.fn().mockImplementation((state: string, msg: string) => {
				currentState = state
				currentMessage = msg
			}),
			reportFileQueueProgress: vi.fn(),
			reportBlockIndexingProgress: vi.fn(),
		}

		cacheManager = {
			clearCacheFile: vi.fn().mockResolvedValue(undefined),
			clearNeo4jCacheFile: vi.fn().mockResolvedValue(undefined),
			getHash: vi.fn().mockReturnValue(undefined),
			getAllHashes: vi.fn().mockReturnValue({}),
			getNeo4jHash: vi.fn().mockReturnValue(undefined),
			getAllNeo4jHashes: vi.fn().mockReturnValue({}),
			updateNeo4jHash: vi.fn(),
			deleteNeo4jHash: vi.fn(),
		}

		vectorStore = {
			initialize: vi.fn(),
			hasIndexedData: vi.fn(),
			markIndexingIncomplete: vi.fn(),
			markIndexingComplete: vi.fn(),
			clearCollection: vi.fn().mockResolvedValue(undefined),
			deleteCollection: vi.fn().mockResolvedValue(undefined),
		}

		scanner = {
			scanDirectory: vi.fn(),
		}

		fileWatcher = {
			initialize: vi.fn().mockResolvedValue(undefined),
			onDidStartBatchProcessing: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			onBatchProgressUpdate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			onDidFinishBatchProcessing: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			dispose: vi.fn(),
		}
	})

	it("should not call clearCollection() or clear cache when initialize() fails (indexing not started)", async () => {
		// Arrange: fail at initialize()
		vectorStore.initialize.mockRejectedValue(new Error("Qdrant unreachable"))

		const orchestrator = new CodeIndexOrchestrator(
			configManager,
			stateManager,
			workspacePath,
			cacheManager,
			vectorStore,
			scanner,
			fileWatcher,
		)

		// Act
		await orchestrator.startIndexing()

		// Assert
		expect(vectorStore.clearCollection).not.toHaveBeenCalled()
		expect(cacheManager.clearCacheFile).not.toHaveBeenCalled()

		// Error state should be set
		expect(stateManager.setSystemState).toHaveBeenCalled()
		const lastCall = stateManager.setSystemState.mock.calls[stateManager.setSystemState.mock.calls.length - 1]
		expect(lastCall[0]).toBe("Error")
	})

	it("should clear Neo4j graph and both caches when clearing index data", async () => {
		configManager = {
			isFeatureConfigured: true,
			isNeo4jEnabled: true,
			neo4jConfig: {
				uri: "bolt://test:7687",
				username: "neo4j",
				password: "test-password",
				database: "neo4j",
			},
		}
		connectMock.mockResolvedValue(undefined)
		initializeMock.mockResolvedValue(false)
		isReadyMock.mockResolvedValue(true)

		const orchestrator = new CodeIndexOrchestrator(
			configManager,
			stateManager,
			workspacePath,
			cacheManager,
			vectorStore,
			scanner,
			fileWatcher,
		)

		await orchestrator.clearIndexData()

		expect(vectorStore.deleteCollection).toHaveBeenCalledTimes(1)
		expect(clearIndexMock).toHaveBeenCalledTimes(1)
		expect(cacheManager.clearCacheFile).toHaveBeenCalledTimes(1)
		expect(cacheManager.clearNeo4jCacheFile).toHaveBeenCalledTimes(1)
	})

	it("should call clearCollection() and clear cache when an error occurs after initialize() succeeds (indexing started)", async () => {
		// Arrange: initialize succeeds; fail soon after to enter error path with indexingStarted=true
		vectorStore.initialize.mockResolvedValue(false) // existing collection
		vectorStore.hasIndexedData.mockResolvedValue(false) // force full scan path
		vectorStore.markIndexingIncomplete.mockRejectedValue(new Error("mark incomplete failure"))

		const orchestrator = new CodeIndexOrchestrator(
			configManager,
			stateManager,
			workspacePath,
			cacheManager,
			vectorStore,
			scanner,
			fileWatcher,
		)

		// Act
		await orchestrator.startIndexing()

		// Assert: cleanup gated behind indexingStarted should have happened
		expect(vectorStore.clearCollection).toHaveBeenCalledTimes(1)
		expect(cacheManager.clearCacheFile).toHaveBeenCalledTimes(1)

		// Error state should be set
		expect(stateManager.setSystemState).toHaveBeenCalled()
		const lastCall = stateManager.setSystemState.mock.calls[stateManager.setSystemState.mock.calls.length - 1]
		expect(lastCall[0]).toBe("Error")
	})

	describe("Neo4j relationship indexing", () => {
		beforeEach(() => {
			configManager = {
				isFeatureConfigured: true,
				isNeo4jEnabled: true,
				neo4jConfig: {
					uri: "bolt://test:7687",
					username: "neo4j",
					password: "test-password",
					database: "neo4j",
				},
			}
			connectMock.mockResolvedValue(undefined)
			initializeMock.mockResolvedValue(false)
			getCodeEntityCountMock.mockResolvedValue(1)
			isReadyMock.mockResolvedValue(true)
			indexFileMock.mockResolvedValue({ entities: 0, relationships: 0 })
			deleteFilesMock.mockResolvedValue(undefined)
			;(stat as unknown as { mockResolvedValue: (value: any) => void }).mockResolvedValue({ size: 1024 })
			;(vscode.workspace.fs.readFile as unknown as { mockImplementation: (fn: any) => void }).mockImplementation(
				(uri: { fsPath: string }) => Promise.resolve(Buffer.from(uri.fsPath)),
			)
		})

		it("connects and initializes Neo4j before checking indexer readiness", async () => {
			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles(["/test/workspace/app.ts"])

			expect(connectMock).toHaveBeenCalledWith({
				uri: "bolt://test:7687",
				username: "neo4j",
				password: "test-password",
				database: "neo4j",
			})
			expect(initializeMock).toHaveBeenCalledTimes(1)
			expect(isReadyMock).toHaveBeenCalledTimes(1)
			expect(connectMock.mock.invocationCallOrder[0]).toBeLessThan(isReadyMock.mock.invocationCallOrder[0])
			expect(initializeMock.mock.invocationCallOrder[0]).toBeLessThan(isReadyMock.mock.invocationCallOrder[0])
		})

		it("does not leave state in Indexing when Neo4j connection fails", async () => {
			connectMock.mockRejectedValue(new Error("ECONNREFUSED"))

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles(["/test/workspace/app.ts"])

			expect(isReadyMock).not.toHaveBeenCalled()
			expect(indexFileMock).not.toHaveBeenCalled()
			expect(stateManager.state).not.toBe("Indexing")
			expect(stateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("Neo4j connection failed"),
			)
		})

		it("indexes supported files using resolved language ids", async () => {
			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles([
				"/test/workspace/module.bsl",
				"/test/workspace/app.ts",
			])

			expect(indexFileMock).toHaveBeenCalledWith("module.bsl", expect.any(String), expect.any(Object), "onec")
			expect(indexFileMock).toHaveBeenCalledWith("app.ts", expect.any(String), expect.any(Object), "typescript")
		})

		it("skips files with unsupported extensions", async () => {
			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles([
				"/test/workspace/ignored.vb",
				"/test/workspace/app.ts",
			])

			expect(indexFileMock).toHaveBeenCalledTimes(1)
		})

		it("calls Neo4j relationship indexing step after full scan when Neo4j is enabled", async () => {
			vectorStore.initialize.mockResolvedValue(false)
			vectorStore.hasIndexedData.mockResolvedValue(false)
			vectorStore.markIndexingIncomplete.mockResolvedValue(undefined)
			vectorStore.markIndexingComplete.mockResolvedValue(undefined)
			scanner.scanDirectory.mockResolvedValue({
				stats: { processed: 1, skipped: 0 },
				totalBlockCount: 1,
				supportedPaths: ["/test/workspace/app.ts"],
			})

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			const indexRelationshipsSpy = vi.spyOn(orchestrator as any, "indexRelationshipsForChangedFiles")

			await orchestrator.startIndexing()

			expect(indexRelationshipsSpy).toHaveBeenCalledWith(["/test/workspace/app.ts"])
		})

		it("processes watcher batch summary for upserts and deletions", async () => {
			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			const summary = {
				processedFiles: [],
				upsertedPaths: ["/test/workspace/app.ts"],
				deletedPaths: ["/test/workspace/removed.ts"],
			}

			await (orchestrator as any).handleNeo4jBatchSummary(summary)

			expect(indexFileMock).toHaveBeenCalledWith("app.ts", expect.any(String), expect.any(Object), "typescript")
			expect(deleteFilesMock).toHaveBeenCalledWith(["removed.ts"])
			expect(cacheManager.deleteNeo4jHash).toHaveBeenCalledWith("/test/workspace/removed.ts")
		})

		it("syncs Neo4j cache with indexed files and removes stale Neo4j-only entries", async () => {
			cacheManager.getAllHashes.mockReturnValue({
				"/test/workspace/app.ts": "vector-hash",
			})
			cacheManager.getAllNeo4jHashes.mockReturnValue({
				"/test/workspace/app.ts": "old-neo4j-hash",
				"/test/workspace/stale.ts": "stale-hash",
			})

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await orchestrator.syncNeo4jWithCurrentIndex()

			expect(deleteFilesMock).toHaveBeenCalledWith(["stale.ts"])
			expect(indexFileMock).toHaveBeenCalledWith("app.ts", expect.any(String), expect.any(Object), "typescript")
			expect(cacheManager.updateNeo4jHash).toHaveBeenCalledWith("/test/workspace/app.ts", expect.any(String))
		})

		it("clears neo4j-cache and indexes when graph is empty even if cache skip condition matches", async () => {
			getCodeEntityCountMock.mockResolvedValue(0)

			let neo4jCacheCleared = false
			cacheManager.getHash.mockImplementation(() => "same-hash")
			cacheManager.getNeo4jHash.mockImplementation(() => (neo4jCacheCleared ? undefined : "same-hash"))
			cacheManager.clearNeo4jCacheFile.mockImplementation(async () => {
				neo4jCacheCleared = true
			})

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles(["/test/workspace/app.ts"])

			expect(cacheManager.clearNeo4jCacheFile).toHaveBeenCalledTimes(1)
			expect(indexFileMock).toHaveBeenCalledWith("app.ts", expect.any(String), expect.any(Object), "typescript")
		})

		it("keeps cache skip behavior when graph is not empty", async () => {
			getCodeEntityCountMock.mockResolvedValue(5)
			cacheManager.getHash.mockImplementation(() => "same-hash")
			cacheManager.getNeo4jHash.mockImplementation(() => "same-hash")

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await (orchestrator as any).indexRelationshipsForChangedFiles(["/test/workspace/app.ts"])

			expect(cacheManager.clearNeo4jCacheFile).not.toHaveBeenCalled()
			expect(indexFileMock).not.toHaveBeenCalled()
		})

		it("skips Neo4j relationship indexing without failing full scan when indexer is not ready", async () => {
			isReadyMock.mockResolvedValue(false)
			vectorStore.initialize.mockResolvedValue(false)
			vectorStore.hasIndexedData.mockResolvedValue(false)
			vectorStore.markIndexingIncomplete.mockResolvedValue(undefined)
			vectorStore.markIndexingComplete.mockResolvedValue(undefined)
			scanner.scanDirectory.mockResolvedValue({
				stats: { processed: 1, skipped: 0 },
				totalBlockCount: 1,
				supportedPaths: ["/test/workspace/app.ts"],
			})

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
			)

			await orchestrator.startIndexing()

			expect(isReadyMock).toHaveBeenCalledTimes(1)
			expect(indexFileMock).not.toHaveBeenCalled()
			expect(fileWatcher.initialize).toHaveBeenCalledTimes(1)
			expect(vectorStore.markIndexingComplete).toHaveBeenCalledTimes(1)
		})
	})
})
