import { describe, it, expect, beforeEach, vi } from "vitest"
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
		},
		RelativePattern: vi.fn().mockImplementation((base: string, pattern: string) => ({ base, pattern })),
	}
})

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
		stateManager = {
			get state() {
				return currentState
			},
			setSystemState: vi.fn().mockImplementation((state: string, _msg: string) => {
				currentState = state
			}),
			reportFileQueueProgress: vi.fn(),
			reportBlockIndexingProgress: vi.fn(),
		}

		cacheManager = {
			clearCacheFile: vi.fn().mockResolvedValue(undefined),
		}

		vectorStore = {
			initialize: vi.fn(),
			hasIndexedData: vi.fn(),
			markIndexingIncomplete: vi.fn(),
			markIndexingComplete: vi.fn(),
			clearCollection: vi.fn().mockResolvedValue(undefined),
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

	describe("1C (.bsl) file indexing for Neo4j", () => {
		let relationshipIndexer: any
		let codeParser: any
		let languageParser: any

		beforeEach(() => {
			vi.clearAllMocks()

			// Mock RelationshipIndexer
			relationshipIndexer = {
				indexFile: vi.fn().mockResolvedValue(undefined),
			}

			// Mock CodeParser
			codeParser = {
				parseFile: vi.fn().mockResolvedValue({
					symbols: [],
					chunks: [],
				}),
			}

			// Mock loadRequiredLanguageParsers
			languageParser = {
				bsl: {
					parser: {
						parse: vi.fn().mockReturnValue({
							rootNode: {
								type: "module",
								childCount: 0,
							},
						}),
					},
				},
			}

			// Mock the loadRequiredLanguageParsers function
			vi.doMock("../processors/languageParser", () => ({
				loadRequiredLanguageParsers: vi.fn().mockResolvedValue(languageParser),
			}))
		})

		it("should use tree-sitter parser directly for .bsl files", async () => {
			// Arrange
			const { loadRequiredLanguageParsers } = await import("../processors/languageParser")
			const testContent = `
Процедура ТестоваяПроцедура()
	Сообщить("Привет, мир!");
КонецПроцедуры
			`.trim()
			const testFilePath = "/test/workspace/module.bsl"

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
				relationshipIndexer,
				codeParser,
			)

			// Act - simulate indexing a .bsl file
			// This would normally be called internally, but we can test the logic
			// by calling the method that handles .bsl files
			await orchestrator.indexRelationshipsForChangedFiles([
				{ path: testFilePath, content: testContent },
			])

			// Assert
			expect(loadRequiredLanguageParsers).toHaveBeenCalledWith([testFilePath])
			expect(languageParser.bsl.parser.parse).toHaveBeenCalledWith(testContent)
			expect(relationshipIndexer.indexFile).toHaveBeenCalledWith(
				testFilePath,
				testContent,
				expect.any(Object), // rootNode
				"bsl"
			)
		})

		it("should use tree-sitter parser directly for .os files", async () => {
			// Arrange
			const { loadRequiredLanguageParsers } = await import("../processors/languageParser")
			const testContent = `
Функция Сложить(А, Б)
	Возврат А + Б;
КонецФункции
			`.trim()
			const testFilePath = "/test/workspace/module.os"

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
				relationshipIndexer,
				codeParser,
			)

			// Act
			await orchestrator.indexRelationshipsForChangedFiles([
				{ path: testFilePath, content: testContent },
			])

			// Assert
			expect(loadRequiredLanguageParsers).toHaveBeenCalledWith([testFilePath])
			expect(languageParser.bsl.parser.parse).toHaveBeenCalledWith(testContent)
			expect(relationshipIndexer.indexFile).toHaveBeenCalledWith(
				testFilePath,
				testContent,
				expect.any(Object),
				"bsl"
			)
		})

		it("should use standard CodeParser for non-1C files", async () => {
			// Arrange
			const testContent = `
function testFunction() {
	return "hello";
}
			`.trim()
			const testFilePath = "/test/workspace/test.js"

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
				relationshipIndexer,
				codeParser,
			)

			// Act
			await orchestrator.indexRelationshipsForChangedFiles([
				{ path: testFilePath, content: testContent },
			])

			// Assert
			expect(codeParser.parseFile).toHaveBeenCalledWith(testFilePath, {
				content: testContent,
			})
			// Should NOT call relationshipIndexer if CodeParser returns empty symbols
			// (this is the existing behavior for non-1C files)
		})

		it("should handle uppercase .BSL extension", async () => {
			// Arrange
			const { loadRequiredLanguageParsers } = await import("../processors/languageParser")
			const testContent = `Процедура Тест() КонецПроцедуры`
			const testFilePath = "/test/workspace/MODULE.BSL"

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
				relationshipIndexer,
				codeParser,
			)

			// Act
			await orchestrator.indexRelationshipsForChangedFiles([
				{ path: testFilePath, content: testContent },
			])

			// Assert
			expect(loadRequiredLanguageParsers).toHaveBeenCalledWith([testFilePath])
			expect(relationshipIndexer.indexFile).toHaveBeenCalledWith(
				testFilePath,
				testContent,
				expect.any(Object),
				"bsl"
			)
		})

		it("should handle mixed 1C and non-1C files", async () => {
			// Arrange
			const { loadRequiredLanguageParsers } = await import("../processors/languageParser")
			const files = [
				{
					path: "/test/workspace/onec.bsl",
					content: `Процедура Тест() КонецПроцедуры`,
				},
				{
					path: "/test/workspace/javascript.js",
					content: `function test() { return "hello"; }`,
				},
				{
					path: "/test/workspace/another.bsl",
					content: `Функция Сложить(А, Б) Возврат А + Б; КонецФункции`,
				},
			]

			const orchestrator = new CodeIndexOrchestrator(
				configManager,
				stateManager,
				workspacePath,
				cacheManager,
				vectorStore,
				scanner,
				fileWatcher,
				relationshipIndexer,
				codeParser,
			)

			// Act
			await orchestrator.indexRelationshipsForChangedFiles(files)

			// Assert
			// Should call loadRequiredLanguageParsers for all files
			expect(loadRequiredLanguageParsers).toHaveBeenCalledWith([
				"/test/workspace/onec.bsl",
				"/test/workspace/javascript.js",
				"/test/workspace/another.bsl",
			])

			// Should index both .bsl files
			expect(relationshipIndexer.indexFile).toHaveBeenCalledTimes(2)
			expect(relationshipIndexer.indexFile).toHaveBeenCalledWith(
				"/test/workspace/onec.bsl",
				files[0].content,
				expect.any(Object),
				"bsl"
			)
			expect(relationshipIndexer.indexFile).toHaveBeenCalledWith(
				"/test/workspace/another.bsl",
				files[2].content,
				expect.any(Object),
				"bsl"
			)
		})
	})
})
