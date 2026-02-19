import { describe, it, expect, beforeEach, vi } from "vitest"
import { webviewMessageHandler } from "../webviewMessageHandler"
import { ClineProvider } from "../ClineProvider"

// Mock dependencies
vi.mock("../../../core/config/ContextProxy")
vi.mock("../../../services/code-index/config-manager")
vi.mock("../../../core/secret-storage/secret-storage")
vi.mock("../../../shared/ExtensionMessage")

describe("webviewMessageHandler - Code Index Settings", () => {
	let mockProvider: Partial<ClineProvider>

	beforeEach(() => {
		vi.clearAllMocks()

		// Setup mock provider
		mockProvider = {
			context: {
				globalState: {
					update: vi.fn().mockResolvedValue(undefined),
					get: vi.fn(),
				},
				workspaceState: {
					update: vi.fn().mockResolvedValue(undefined),
					get: vi.fn(),
				},
			},
			postMessageToWebview: vi.fn(),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
			contextProxy: {
				getValue: vi.fn().mockReturnValue({}), // Return empty config by default
				setValue: vi.fn().mockResolvedValue(undefined),
				storeSecret: vi.fn().mockResolvedValue(undefined),
				globalStorageUri: { fsPath: "/test/path" },
			},
			getCurrentWorkspaceCodeIndexManager: vi.fn().mockReturnValue(undefined),
			codebaseIndexManager: {
				handleSettingsChange: vi.fn().mockResolvedValue(undefined),
			},
		} as any
	})

	describe("saveCodeIndexSettingsAtomic", () => {
		it("should save vectorStoreName to workspaceState", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.context?.workspaceState?.update).toHaveBeenCalledWith(
				"codebaseIndexVectorStoreName",
				"my-vector-store",
			)
		})

		it("should persist empty vectorStoreName when value is empty", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "", // Empty name
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.context?.workspaceState?.update).toHaveBeenCalledWith(
				"codebaseIndexVectorStoreName",
				"",
			)
		})

		it("should persist whitespace-only vectorStoreName when value is whitespace", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "   ", // Whitespace only
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.context?.workspaceState?.update).toHaveBeenCalledWith(
				"codebaseIndexVectorStoreName",
				"   ",
			)
		})

		it("should save other settings to globalState via contextProxy", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			// Should update globalState via contextProxy.setValue with other settings
			expect(mockProvider.contextProxy?.setValue).toHaveBeenCalledWith(
				"codebaseIndexConfig",
				expect.objectContaining({
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				}),
			)
		})

		it("should not update codebaseIndexConfig when secret storage throws", async () => {
			// FIX: code-index-settings-atomic (TestAnalyzer)
			// Root cause: non-atomic save (global state updated before secrets) could leave UI/state inconsistent.
			const storeSecretError = new Error("secret store failed")
			;(mockProvider.contextProxy?.storeSecret as any).mockRejectedValueOnce(storeSecretError)

			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codeIndexOpenAiKey: "sk-test-should-not-be-logged",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.contextProxy?.setValue).not.toHaveBeenCalled()
			expect(mockProvider.context?.workspaceState?.update).not.toHaveBeenCalled()

			expect(mockProvider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "codeIndexSettingsSaved",
					success: false,
					error: storeSecretError.message,
				}),
			)

			// Ensure the webview state is kept in sync even on failure.
			expect(mockProvider.postStateToWebview).toHaveBeenCalled()
		})

		it("should save vectorStoreName to globalState for backward compatibility", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			const setValueMock = mockProvider.contextProxy?.setValue as ReturnType<typeof vi.fn>
			const globalStateUpdateCall = setValueMock?.mock?.calls?.[0]
			expect(globalStateUpdateCall).toBeDefined()
			const updatedConfig = globalStateUpdateCall?.[1]
			expect(updatedConfig).toBeDefined()
			expect(updatedConfig).toHaveProperty("codebaseIndexVectorStoreName", "my-vector-store")
		})

		// kilocode_change start: Neo4j settings persistence
		it("should save Neo4j settings to globalState", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://localhost:7687",
					codebaseIndexNeo4jUsername: "neo4j",
					codebaseIndexNeo4jDatabase: "neo4j",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.contextProxy?.setValue).toHaveBeenCalledWith(
				"codebaseIndexConfig",
				expect.objectContaining({
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://localhost:7687",
					codebaseIndexNeo4jUsername: "neo4j",
					codebaseIndexNeo4jDatabase: "neo4j",
				}),
			)
		})

		it("should persist Neo4j password via SecretStorage when included in atomic payload", async () => {
			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://localhost:7687",
					codebaseIndexNeo4jUsername: "neo4j",
					codebaseIndexNeo4jDatabase: "neo4j",
					codebaseIndexNeo4jPassword: "neo4j-super-secret",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(mockProvider.contextProxy?.storeSecret).toHaveBeenCalledWith(
				"codebaseIndexNeo4jPassword",
				"neo4j-super-secret",
			)
		})

		it("should clear neo4j-cache when Neo4j connection config changes", async () => {
			// Arrange previous config
			;(mockProvider.context?.globalState?.get as any).mockImplementation((key: string) => {
				if (key !== "codebaseIndexConfig") return undefined
				return {
					codebaseIndexNeo4jUri: "bolt://old-host:7687",
					codebaseIndexNeo4jUsername: "old-user",
					codebaseIndexNeo4jDatabase: "old-db",
				}
			})

			const clearNeo4jCache = vi.fn().mockResolvedValue(undefined)
			;(mockProvider.getCurrentWorkspaceCodeIndexManager as any).mockReturnValue({
				clearNeo4jCache,
				getCurrentStatus: vi.fn().mockReturnValue({}),
				handleSettingsChange: vi.fn().mockResolvedValue(undefined),
				isFeatureEnabled: true,
				isFeatureConfigured: false,
				isInitialized: true,
				initialize: vi.fn().mockResolvedValue({ requiresRestart: false }),
			})

			const message = {
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexVectorStoreName: "my-vector-store",
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://new-host:7687",
					codebaseIndexNeo4jUsername: "new-user",
					codebaseIndexNeo4jDatabase: "new-db",
				},
			} as const

			await webviewMessageHandler(mockProvider as ClineProvider, message)

			expect(clearNeo4jCache).toHaveBeenCalledTimes(1)
		})
		// kilocode_change end: Neo4j settings persistence
	})
})
