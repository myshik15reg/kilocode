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

		it("should generate default vectorStoreName when empty", async () => {
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
				"codebase-index-vectors",
			)
		})

		it("should generate default vectorStoreName when whitespace-only", async () => {
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
				"codebase-index-vectors",
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
	})
})
