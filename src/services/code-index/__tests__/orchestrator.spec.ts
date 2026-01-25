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

const { loadRequiredLanguageParsersMock, indexFileMock, isReadyMock } = vi.hoisted(() => ({
	loadRequiredLanguageParsersMock: vi.fn(),
	indexFileMock: vi.fn(),
	isReadyMock: vi.fn(),
}))

vi.mock("../../tree-sitter/languageParser", async () => {
	const actual = await vi.importActual<typeof import("../../tree-sitter/languageParser")>(
		"../../tree-sitter/languageParser",
	)
	return {
		...actual,
		loadRequiredLanguageParsers: loadRequiredLanguageParsersMock,
	}
})

vi.mock("../../neo4j/relationship-indexer", () => ({
	RelationshipIndexer: class {
		indexFile = indexFileMock
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

	describe("Neo4j relationship indexing", () => {
		const languageParsers = {
			bsl: {
				parser: {
					parse: vi.fn().mockReturnValue({ rootNode: { type: "module" } }),
				},
			},
			ts: {
				parser: {
					parse: vi.fn().mockReturnValue({ rootNode: { type: "program" } }),
				},
			},
		}

		beforeEach(() => {
			configManager = {
				isFeatureConfigured: true,
				isNeo4jEnabled: true,
			}
			isReadyMock.mockResolvedValue(true)
			indexFileMock.mockResolvedValue({ entities: 0, relationships: 0 })
			loadRequiredLanguageParsersMock.mockResolvedValue(languageParsers)
			;(stat as unknown as { mockResolvedValue: (value: any) => void }).mockResolvedValue({ size: 1024 })
			;(vscode.workspace.fs.readFile as unknown as { mockImplementation: (fn: any) => void }).mockImplementation(
				(uri: { fsPath: string }) => Promise.resolve(Buffer.from(uri.fsPath)),
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

			expect(loadRequiredLanguageParsersMock).toHaveBeenCalledWith([
				"/test/workspace/module.bsl",
				"/test/workspace/app.ts",
			])
			expect(languageParsers.bsl.parser.parse).toHaveBeenCalled()
			expect(languageParsers.ts.parser.parse).toHaveBeenCalled()
			expect(indexFileMock).toHaveBeenCalledWith(
				"/test/workspace/module.bsl",
				expect.any(String),
				expect.any(Object),
				"onec",
			)
			expect(indexFileMock).toHaveBeenCalledWith(
				"/test/workspace/app.ts",
				expect.any(String),
				expect.any(Object),
				"typescript",
			)
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

			expect(loadRequiredLanguageParsersMock).toHaveBeenCalledWith([
				"/test/workspace/app.ts",
			])
			expect(indexFileMock).toHaveBeenCalledTimes(1)
		})
	})
})
