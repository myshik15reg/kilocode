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
			log: vi.fn(),
			contextProxy: {
				getValue: vi.fn().mockReturnValue({}), // Return empty config by default
				setValue: vi.fn().mockResolvedValue(undefined),
				storeSecret: vi.fn().mockResolvedValue(undefined),
				globalStorageUri: { fsPath: "/test/path" },
			},
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

		it("should reject empty vectorStoreName", async () => {
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

			// Should send error response
			expect(mockProvider.postMessageToWebview).toHaveBeenCalledWith({
				type: "codeIndexSettingsSaved",
				success: false,
				error: "Vector Store Name cannot be empty",
			})

			// Should NOT update workspaceState
			expect(mockProvider.context?.workspaceState?.update).not.toHaveBeenCalledWith(
				"codebaseIndexVectorStoreName",
				expect.any(String),
			)
		})

		it("should reject whitespace-only vectorStoreName", async () => {
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

			// Should send error response
			expect(mockProvider.postMessageToWebview).toHaveBeenCalledWith({
				type: "codeIndexSettingsSaved",
				success: false,
				error: "Vector Store Name cannot be empty",
			})

			// Should NOT update workspaceState
			expect(mockProvider.context?.workspaceState?.update).not.toHaveBeenCalledWith(
				"codebaseIndexVectorStoreName",
				expect.any(String),
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

		it("should NOT save vectorStoreName to globalState", async () => {
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

			// Check that vectorStoreName is NOT in globalState update
			const setValueMock = mockProvider.contextProxy?.setValue as ReturnType<typeof vi.fn>
			const globalStateUpdateCall = setValueMock?.mock?.calls?.[0]
			expect(globalStateUpdateCall).toBeDefined()
			const updatedConfig = globalStateUpdateCall?.[1]
			expect(updatedConfig).toBeDefined()
			expect(updatedConfig).not.toHaveProperty("codebaseIndexVectorStoreName")
		})
	})
})
