import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"

const mockSpawn = vi.fn()
const mockCreateInterface = vi.fn()

// Mock Package
vi.mock("../../../shared/package", () => ({
	Package: {
		name: "roo-cline",
		publisher: "RooVeterinaryInc",
		version: "1.0.0",
		outputChannel: "Roo-Code",
	},
}))

// Mock vscode
vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(),
	},
	env: {
		appRoot: "/mock/app/root",
	},
}))

// Mock getBinPath
vi.mock("../../ripgrep", () => ({
	getBinPath: vi.fn(async () => null), // Return null to skip actual ripgrep execution
}))

// Mock child_process
vi.mock("child_process", () => ({
	spawn: mockSpawn,
}))

vi.mock("readline", () => ({
	createInterface: mockCreateInterface,
}))

beforeEach(() => {
	vi.resetModules()
	vi.clearAllMocks()
})

describe("file-search", () => {
	describe("configuration integration", () => {
		it("should read VSCode search configuration settings", async () => {
			const mockSearchConfig = {
				get: vi.fn((key: string) => {
					if (key === "useIgnoreFiles") return false
					if (key === "useGlobalIgnoreFiles") return false
					if (key === "useParentIgnoreFiles") return false
					return undefined
				}),
			}
			const mockRooConfig = {
				get: vi.fn(() => 10000),
			}

			;(vscode.workspace.getConfiguration as any).mockImplementation((section: string) => {
				if (section === "search") return mockSearchConfig
				if (section === "roo-cline") return mockRooConfig
				return { get: vi.fn() }
			})

			// Import the module - this will call getConfiguration during import
			await import("../file-search")

			// Verify that configuration is accessible
			expect(vscode.workspace.getConfiguration).toBeDefined()
		})

		it("should read maximumIndexedFilesForFileSearch configuration", async () => {
			const { Package } = await import("../../../shared/package")
			const mockRooConfig = {
				get: vi.fn((key: string, defaultValue: number) => {
					if (key === "maximumIndexedFilesForFileSearch") return 50000
					return defaultValue
				}),
			}

			;(vscode.workspace.getConfiguration as any).mockImplementation((section: string) => {
				if (section === Package.name) return mockRooConfig
				return { get: vi.fn() }
			})

			// The configuration should be readable
			const config = vscode.workspace.getConfiguration(Package.name)
			const limit = config.get("maximumIndexedFilesForFileSearch", 10000)

			expect(limit).toBe(50000)
		})

		it("should use default limit when configuration is not provided", async () => {
			const { Package } = await import("../../../shared/package")
			const mockRooConfig = {
				get: vi.fn((key: string, defaultValue: number) => defaultValue),
			}

			;(vscode.workspace.getConfiguration as any).mockImplementation((section: string) => {
				if (section === Package.name) return mockRooConfig
				return { get: vi.fn() }
			})

			const config = vscode.workspace.getConfiguration(Package.name)
			const limit = config.get("maximumIndexedFilesForFileSearch", 10000)

			expect(limit).toBe(10000)
		})
	})

	// kilocode_change start
	describe("UTF-8 stderr decoding", () => {
		it("should decode split UTF-8 stderr chunks before rejecting", async () => {
			const mockSearchConfig = { get: vi.fn() }
			const mockRooConfig = { get: vi.fn(() => 10000) }
			;(vscode.workspace.getConfiguration as any).mockImplementation((section: string) => {
				if (section === "search") return mockSearchConfig
				if (section === "roo-cline") return mockRooConfig
				return { get: vi.fn() }
			})

			const { PassThrough } = await import("stream")
			const ripgrep = await import("../../ripgrep")
			vi.mocked(ripgrep.getBinPath).mockResolvedValue("/mock/path/to/rg")
			const { executeRipgrep } = await import("../file-search")
			const stdout = new PassThrough()
			const stderr = new PassThrough()
			const rlHandlers: Record<string, (() => void) | undefined> = {}
			const kill = vi.fn(() => {
				rlHandlers.close?.()
			})

			mockSpawn.mockReturnValue({
				stdout,
				stderr,
				on: vi.fn(),
				kill,
			} as any)

			mockCreateInterface.mockReturnValue({
				on: vi.fn((event: string, handler: () => void) => {
					rlHandlers[event] = handler
				}),
				close: vi.fn(() => {
					rlHandlers.close?.()
				}),
			} as any)

			const promise = executeRipgrep({
				args: ["--files", "/tmp/workspace"],
				workspacePath: "/tmp/workspace",
				limit: 5,
			})
			await Promise.resolve()

			stderr.write(new Uint8Array([0xd0]))
			stderr.write(new Uint8Array([0x96]))
			stderr.end()
			rlHandlers.close?.()

			await expect(promise).rejects.toThrow("ripgrep process error: Ж")
		})
	})
	// kilocode_change end
})
