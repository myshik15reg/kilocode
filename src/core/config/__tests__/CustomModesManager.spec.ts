// npx vitest core/config/__tests__/CustomModesManager.spec.ts

import type { Mock } from "vitest"

import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"

import * as yaml from "yaml"
import * as vscode from "vscode"

import type { ModeConfig } from "@roo-code/types"

import { fileExistsAtPath } from "../../../utils/fs"
import { getWorkspacePath, arePathsEqual } from "../../../utils/path"
import { GlobalFileNames } from "../../../shared/globalFileNames"
import { logger } from "../../../utils/logging"

import { CustomModesManager } from "../CustomModesManager"
import { getProjectRooDirectoryForCwd } from "../../../services/roo-config" // kilocode_change

vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [],
		onDidSaveTextDocument: vi.fn(),
		createFileSystemWatcher: vi.fn(),
	},
	window: {
		showErrorMessage: vi.fn(),
	},
}))

vi.mock("fs/promises", () => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	stat: vi.fn(),
	readdir: vi.fn(),
	rm: vi.fn(),
}))

vi.mock("../../../utils/fs")
vi.mock("../../../utils/path")

vi.mock("../../../utils/logging", () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}))

describe("CustomModesManager", () => {
	let manager: CustomModesManager
	let mockContext: vscode.ExtensionContext
	let mockOnUpdate: Mock
	let mockWorkspaceFolders: { uri: { fsPath: string } }[]

	// Use path.sep to ensure correct path separators for the current platform
	const mockStoragePath = `${path.sep}mock${path.sep}settings`
	const mockSettingsPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)
	const mockWorkspacePath = path.resolve("/mock/workspace")
	const mockRoomodes = path.join(mockWorkspacePath, ".kilocodemodes")

	beforeEach(() => {
		mockOnUpdate = vi.fn()
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
				keys: vi.fn(() => []),
				setKeysForSync: vi.fn(),
			},
			globalStorageUri: {
				fsPath: mockStoragePath,
			},
		} as unknown as vscode.ExtensionContext

		// mockWorkspacePath is now defined at the top level
		mockWorkspaceFolders = [{ uri: { fsPath: mockWorkspacePath } }]
		;(vscode.workspace as any).workspaceFolders = mockWorkspaceFolders
		;(vscode.workspace.onDidSaveTextDocument as Mock).mockReturnValue({ dispose: vi.fn() })
		;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
		;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
			return path === mockSettingsPath || path === mockRoomodes
		})
		;(fs.mkdir as Mock).mockResolvedValue(undefined)
		;(fs.writeFile as Mock).mockResolvedValue(undefined)
		;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
		;(fs.readdir as Mock).mockResolvedValue([])
		;(fs.rm as Mock).mockResolvedValue(undefined)
		;(fs.readFile as Mock).mockImplementation(async (path: string) => {
			if (path === mockSettingsPath) {
				return yaml.stringify({ customModes: [] })
			}

			throw new Error("File not found")
		})

		manager = new CustomModesManager(mockContext, mockOnUpdate)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("getCustomModes", () => {
		it("should handle valid YAML in .roomodes file and JSON for global customModes", async () => {
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]

			const roomodesModes = [{ slug: "mode2", name: "Mode 2", roleDefinition: "Role 2", groups: ["read"] }]

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				if (path === mockRoomodes) {
					return yaml.stringify({ customModes: roomodesModes })
				}
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			expect(modes).toHaveLength(2)
		})

		it("should merge modes with .kilocodemodes taking precedence", async () => {
			const settingsModes = [
				{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] },
				{ slug: "mode2", name: "Mode 2", roleDefinition: "Role 2", groups: ["read"] },
			]

			const roomodesModes = [
				{ slug: "mode2", name: "Mode 2 Override", roleDefinition: "Role 2 Override", groups: ["read"] },
				{ slug: "mode3", name: "Mode 3", roleDefinition: "Role 3", groups: ["read"] },
			]

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				if (path === mockRoomodes) {
					return yaml.stringify({ customModes: roomodesModes })
				}
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should contain 3 modes (mode1 from settings, mode2 and mode3 from roomodes)
			expect(modes).toHaveLength(3)
			expect(modes.map((m) => m.slug)).toEqual(["mode2", "mode3", "mode1"])

			// mode2 should come from .kilocodemodes since it takes precedence
			const mode2 = modes.find((m) => m.slug === "mode2")
			expect(mode2?.name).toBe("Mode 2 Override")
			expect(mode2?.roleDefinition).toBe("Role 2 Override")
		})

		it("should handle missing .kilocodemodes file", async () => {
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			expect(modes).toHaveLength(1)
			expect(modes[0].slug).toBe("mode1")
		})

		it("should include WorkFlowAI managed modes with the lowest precedence", async () => {
			const settingsModes = [
				{ slug: "override-me", name: "Global Override", roleDefinition: "Role", groups: ["read"] },
			]
			const managedModes = [
				{ slug: "override-me", name: "Managed Mode", roleDefinition: "Managed", groups: ["read"] },
				{ slug: "managed-only", name: "Managed Only", roleDefinition: "Managed", groups: ["read"] },
			]

			const managedModesPath = path.join(
				path.join(os.homedir(), ".kilocode"),
				"workflowai",
				"managed_custom_modes.yaml",
			)

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				return p === mockSettingsPath || p === managedModesPath
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				if (p === managedModesPath) {
					return yaml.stringify({ customModes: managedModes })
				}
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Global overrides managed when slugs overlap.
			expect(modes.map((m) => m.slug)).toEqual(["override-me", "managed-only"])
			const override = modes.find((m) => m.slug === "override-me")
			expect(override?.name).toBe("Global Override")
		})

		it("should handle invalid YAML in .kilocodemodes", async () => {
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				if (path === mockRoomodes) {
					return "invalid yaml content"
				}
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should fall back to settings modes when .kilocodemodes is invalid
			expect(modes).toHaveLength(1)
			expect(modes[0].slug).toBe("mode1")
		})

		it("should memoize results for 10 seconds", async () => {
			// Setup test data
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})

			// Mock fileExistsAtPath to only return true for settings path
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})

			// First call should read from file
			const firstResult = await manager.getCustomModes()

			// Reset mock to verify it's not called again
			vi.clearAllMocks()

			// Setup mocks again for second call
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})

			// Second call should use cached result
			const secondResult = await manager.getCustomModes()
			expect(fs.readFile).not.toHaveBeenCalled()
			expect(secondResult).toHaveLength(1)
			expect(secondResult[0].slug).toBe("mode1")

			// Results should be the same object (not just equal)
			expect(secondResult).toBe(firstResult)
		})

		it("should invalidate cache when modes are updated", async () => {
			// Setup initial data
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			// First call to cache the result
			await manager.getCustomModes()

			// Reset mocks to track new calls
			vi.clearAllMocks()

			// Update a mode
			const updatedMode: ModeConfig = {
				slug: "mode1",
				name: "Updated Mode 1",
				roleDefinition: "Updated Role 1",
				groups: ["read"],
				source: "global",
			}

			// Mock the updated file content
			const updatedSettingsModes = [updatedMode]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: updatedSettingsModes })
				}
				throw new Error("File not found")
			})

			// Update the mode
			await manager.updateCustomMode("mode1", updatedMode)

			// Reset mocks again
			vi.clearAllMocks()

			// Next call should read from file again (cache invalidated)
			await manager.getCustomModes()
			expect(fs.readFile).toHaveBeenCalled()
		})

		it("should invalidate cache when modes are deleted", async () => {
			// Setup initial data
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			// First call to cache the result
			await manager.getCustomModes()

			// Reset mocks to track new calls
			vi.clearAllMocks()

			// Delete a mode
			await manager.deleteCustomMode("mode1")

			// Mock the updated file content (empty)
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				throw new Error("File not found")
			})

			// Reset mocks again
			vi.clearAllMocks()

			// Next call should read from file again (cache invalidated)
			await manager.getCustomModes()
			expect(fs.readFile).toHaveBeenCalled()
		})

		it("should invalidate cache when modes are updated (simulating file changes)", async () => {
			// Setup initial data
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			// First call to cache the result
			await manager.getCustomModes()

			// Reset mocks to track new calls
			vi.clearAllMocks()

			// Setup for update
			const updatedMode: ModeConfig = {
				slug: "mode1",
				name: "Updated Mode 1",
				roleDefinition: "Updated Role 1",
				groups: ["read"],
				source: "global",
			}

			// Mock the updated file content
			const updatedSettingsModes = [updatedMode]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: updatedSettingsModes })
				}
				throw new Error("File not found")
			})

			// Simulate a file change by updating a mode
			// This should invalidate the cache
			await manager.updateCustomMode("mode1", updatedMode)

			// Reset mocks again
			vi.clearAllMocks()

			// Setup mocks again
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: updatedSettingsModes })
				}
				throw new Error("File not found")
			})

			// Next call should read from file again (cache was invalidated by the update)
			await manager.getCustomModes()
			expect(fs.readFile).toHaveBeenCalled()
		})

		it("should refresh cache after TTL expires", async () => {
			// Setup test data
			const settingsModes = [{ slug: "mode1", name: "Mode 1", roleDefinition: "Role 1", groups: ["read"] }]
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: settingsModes })
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})

			// Mock Date.now to control time
			const originalDateNow = Date.now
			let currentTime = 1000
			Date.now = vi.fn(() => currentTime)

			try {
				// First call should read from file
				await manager.getCustomModes()

				// Reset mock to verify it's not called again
				vi.clearAllMocks()

				// Setup mocks again for second call
				;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
					return path === mockSettingsPath
				})
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: settingsModes })
					}
					throw new Error("File not found")
				})

				// Second call within TTL should use cache
				await manager.getCustomModes()
				expect(fs.readFile).not.toHaveBeenCalled()

				// Advance time beyond TTL (10 seconds)
				currentTime += 11000

				// Reset mocks again
				vi.clearAllMocks()

				// Setup mocks again for third call
				;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
					return path === mockSettingsPath
				})
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: settingsModes })
					}
					throw new Error("File not found")
				})

				// Call after TTL should read from file again
				await manager.getCustomModes()
				expect(fs.readFile).toHaveBeenCalled()
			} finally {
				// Restore original Date.now
				Date.now = originalDateNow
			}
		})
	})

	describe("updateCustomMode", () => {
		it("should update mode in settings file while preserving .kilocodemodes precedence", async () => {
			const newMode: ModeConfig = {
				slug: "mode1",
				name: "Updated Mode 1",
				roleDefinition: "Updated Role 1",
				groups: ["read"],
				source: "global",
			}

			const roomodesModes = [
				{
					slug: "mode1",
					name: "Roomodes Mode 1",
					roleDefinition: "Role 1",
					groups: ["read"],
					source: "project",
				},
			]

			const existingModes = [
				{ slug: "mode2", name: "Mode 2", roleDefinition: "Role 2", groups: ["read"], source: "global" },
			]

			let settingsContent = { customModes: existingModes }
			let roomodesContent = { customModes: roomodesModes }

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path === mockSettingsPath) {
					return yaml.stringify(settingsContent)
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string, _encoding?: string) => {
				if (path === mockSettingsPath) {
					settingsContent = yaml.parse(content)
				}
				if (path === mockRoomodes) {
					roomodesContent = yaml.parse(content)
				}
				return Promise.resolve()
			})

			await manager.updateCustomMode("mode1", newMode)

			// Should write to settings file
			expect(fs.writeFile).toHaveBeenCalledWith(mockSettingsPath, expect.any(String), "utf-8")

			// Verify the content of the write
			const writeCall = (fs.writeFile as Mock).mock.calls[0]
			const content = yaml.parse(writeCall[1])
			expect(content.customModes).toContainEqual(
				expect.objectContaining({
					slug: "mode1",
					name: "Updated Mode 1",
					roleDefinition: "Updated Role 1",
					source: "global",
				}),
			)

			// Should update global state with merged modes where .kilocodemodes takes precedence
			expect(mockContext.globalState.update).toHaveBeenCalledWith(
				"customModes",
				expect.arrayContaining([
					expect.objectContaining({
						slug: "mode1",
						name: "Roomodes Mode 1", // .kilocodemodes version should take precedence
						source: "project",
					}),
				]),
			)

			// Should trigger onUpdate
			expect(mockOnUpdate).toHaveBeenCalled()
		})

		it("creates .kilocodemodes file when adding project-specific mode", async () => {
			const projectMode: ModeConfig = {
				slug: "project-mode",
				name: "Project Mode",
				roleDefinition: "Project Role",
				groups: ["read"],
				source: "project",
			}

			// Mock .kilocodemodes to not exist initially
			let roomodesContent: any = null
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (path === mockRoomodes) {
					if (!roomodesContent) {
						throw new Error("File not found")
					}
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
				if (path === mockRoomodes) {
					roomodesContent = yaml.parse(content)
				}
				return Promise.resolve()
			})

			await manager.updateCustomMode("project-mode", projectMode)

			// Verify .kilocodemodes was created with the project mode
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.any(String), // Don't check exact path as it may have different separators on different platforms
				expect.stringContaining("project-mode"),
				"utf-8",
			)

			// Verify the path is correct regardless of separators
			const writeCall = (fs.writeFile as Mock).mock.calls[0]
			expect(path.normalize(writeCall[0])).toBe(path.normalize(mockRoomodes))

			// Verify the content written to .kilocodemodes
			expect(roomodesContent).toEqual({
				customModes: [
					expect.objectContaining({
						slug: "project-mode",
						name: "Project Mode",
						roleDefinition: "Project Role",
						source: "project",
					}),
				],
			})
		})

		it("queues write operations", async () => {
			const mode1: ModeConfig = {
				slug: "mode1",
				name: "Mode 1",
				roleDefinition: "Role 1",
				groups: ["read"],
				source: "global",
			}
			const mode2: ModeConfig = {
				slug: "mode2",
				name: "Mode 2",
				roleDefinition: "Role 2",
				groups: ["read"],
				source: "global",
			}

			let settingsContent = { customModes: [] }
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify(settingsContent)
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string, _encoding?: string) => {
				if (path === mockSettingsPath) {
					settingsContent = yaml.parse(content)
				}
				return Promise.resolve()
			})

			// Start both updates simultaneously
			await Promise.all([manager.updateCustomMode("mode1", mode1), manager.updateCustomMode("mode2", mode2)])

			// Verify final state in settings file
			expect(settingsContent.customModes).toHaveLength(2)
			expect(settingsContent.customModes.map((m: ModeConfig) => m.name)).toContain("Mode 1")
			expect(settingsContent.customModes.map((m: ModeConfig) => m.name)).toContain("Mode 2")

			// Verify global state was updated
			expect(mockContext.globalState.update).toHaveBeenCalledWith(
				"customModes",
				expect.arrayContaining([
					expect.objectContaining({
						slug: "mode1",
						name: "Mode 1",
						source: "global",
					}),
					expect.objectContaining({
						slug: "mode2",
						name: "Mode 2",
						source: "global",
					}),
				]),
			)

			// Should trigger onUpdate
			expect(mockOnUpdate).toHaveBeenCalled()
		})
	})

	describe("File Operations", () => {
		it("creates settings directory if it doesn't exist", async () => {
			const settingsPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)
			await manager.getCustomModesFilePath()

			expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(settingsPath), { recursive: true })
		})

		it("creates default config if file doesn't exist", async () => {
			const settingsPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)

			// Mock fileExists to return false first time, then true
			let firstCall = true
			;(fileExistsAtPath as Mock).mockImplementation(async () => {
				if (firstCall) {
					firstCall = false
					return false
				}
				return true
			})

			await manager.getCustomModesFilePath()

			expect(fs.writeFile).toHaveBeenCalledWith(settingsPath, expect.stringMatching(/^customModes: \[\]/))
		})

		it("watches file for changes", async () => {
			const configPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)

			;(fs.readFile as Mock).mockResolvedValue(yaml.stringify({ customModes: [] }))
			;(arePathsEqual as Mock).mockImplementation(
				(path1: string, path2: string) => path.normalize(path1) === path.normalize(path2),
			)

			// Mock createFileSystemWatcher to return a mock watcher
			const mockWatcher = {
				onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				dispose: vi.fn(),
			}
			const createFileSystemWatcherMock = vi.fn().mockReturnValue(mockWatcher)
			;(vscode.workspace as any).createFileSystemWatcher = createFileSystemWatcherMock

			// Temporarily set NODE_ENV to allow file watching
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "development"

			try {
				// Create a new manager to trigger the file watcher setup
				const testManager = new CustomModesManager(mockContext, mockOnUpdate)

				// Wait a bit for the async watchCustomModesFiles to complete
				await new Promise((resolve) => setTimeout(resolve, 10))

				// Verify createFileSystemWatcher was called
				expect(createFileSystemWatcherMock).toHaveBeenCalled()

				// Get the onChange callback that was registered
				const onChangeCall = mockWatcher.onDidChange.mock.calls[0]
				expect(onChangeCall).toBeDefined()
				const [onChangeCallback] = onChangeCall

				// Simulate file change event
				await onChangeCallback()

				// Verify file was processed
				expect(fs.readFile).toHaveBeenCalledWith(configPath, "utf-8")
				expect(mockContext.globalState.update).toHaveBeenCalled()
				expect(mockOnUpdate).toHaveBeenCalled()

				// Clean up
				testManager.dispose()
			} finally {
				// Restore original NODE_ENV
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("watches .kilocodemodes file for changes (handleRoomodesChange)", async () => {
			const configPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)
			const roomodesPath = path.join(mockWorkspacePath, ".kilocodemodes")

			// Make sure we can find both settings and roomodes files.
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				return p === configPath || p === roomodesPath
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === configPath) {
					return yaml.stringify({
						customModes: [{ slug: "g", name: "G", roleDefinition: "g", groups: ["read"] }],
					})
				}
				if (p === roomodesPath) {
					return yaml.stringify({
						customModes: [{ slug: "p", name: "P", roleDefinition: "p", groups: ["read"] }],
					})
				}
				throw new Error("File not found")
			})
			;(mockContext.globalState.get as Mock).mockResolvedValue([])

			const settingsWatcher = {
				onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				dispose: vi.fn(),
			}
			const roomodesWatcher = {
				onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				dispose: vi.fn(),
			}

			const createFileSystemWatcherMock = vi.fn().mockImplementation((watchPath: string) => {
				if (path.normalize(watchPath) === path.normalize(configPath)) return settingsWatcher
				if (path.normalize(watchPath) === path.normalize(roomodesPath)) return roomodesWatcher
				return settingsWatcher
			})
			;(vscode.workspace as any).createFileSystemWatcher = createFileSystemWatcherMock

			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "development"
			try {
				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				await new Promise((resolve) => setTimeout(resolve, 10))

				const onChangeCall = roomodesWatcher.onDidChange.mock.calls[0]
				expect(onChangeCall).toBeDefined()
				const [onChangeCallback] = onChangeCall

				await onChangeCallback()

				expect(fs.readFile).toHaveBeenCalledWith(configPath, "utf-8")
				expect(fs.readFile).toHaveBeenCalledWith(roomodesPath, "utf-8")
				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([
						expect.objectContaining({ slug: "p", source: "project" }),
						expect.objectContaining({ slug: "g", source: "global" }),
					]),
				)
				expect(mockOnUpdate).toHaveBeenCalled()

				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})
	})

	describe("resetCustomModes", () => {
		it("resets global custom modes file and clears global state", async () => {
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockSettingsPath)
			;(fs.readFile as Mock).mockResolvedValue(
				yaml.stringify({ customModes: [{ slug: "m", name: "M", roleDefinition: "r", groups: ["read"] }] }),
			)
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			await manager.resetCustomModes()

			expect(fs.writeFile).toHaveBeenCalledWith(mockSettingsPath, expect.stringContaining("customModes"))
			expect(mockContext.globalState.update).toHaveBeenCalledWith("customModes", [])
			expect(mockOnUpdate).toHaveBeenCalled()
		})

		it("shows error when reset fails", async () => {
			const mockShowError = vi.fn()
			;(vscode.window.showErrorMessage as Mock) = mockShowError
			;(fs.writeFile as Mock).mockRejectedValue(new Error("Disk full"))

			await manager.resetCustomModes()

			expect(mockShowError).toHaveBeenCalledWith("customModes.errors.resetFailed")
		})
	})

	describe("deleteCustomMode", () => {
		it("deletes mode from settings file", async () => {
			const existingMode = {
				slug: "mode-to-delete",
				name: "Mode To Delete",
				roleDefinition: "Test role",
				groups: ["read"],
				source: "global",
			}

			let settingsContent = { customModes: [existingMode] }
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify(settingsContent)
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string, encoding?: string) => {
				if (path === mockSettingsPath && encoding === "utf-8") {
					settingsContent = yaml.parse(content)
				}
				return Promise.resolve()
			})

			// Mock the global state update to actually update the settingsContent
			;(mockContext.globalState.update as Mock).mockImplementation((key: string, value: any) => {
				if (key === "customModes") {
					settingsContent.customModes = value
				}
				return Promise.resolve()
			})

			await manager.deleteCustomMode("mode-to-delete")

			// Verify mode was removed from settings file
			expect(settingsContent.customModes).toHaveLength(0)

			// Verify global state was updated
			expect(mockContext.globalState.update).toHaveBeenCalledWith("customModes", [])

			// Should trigger onUpdate
			expect(mockOnUpdate).toHaveBeenCalled()
		})

		it("handles errors gracefully", async () => {
			const mockShowError = vi.fn()
			;(vscode.window.showErrorMessage as Mock) = mockShowError
			;(fs.writeFile as Mock).mockRejectedValue(new Error("Write error"))

			await manager.deleteCustomMode("non-existent-mode")

			expect(mockShowError).toHaveBeenCalledWith("customModes.errors.deleteFailed")
		})
	})

	describe("updateModesInFile", () => {
		it("handles corrupted YAML content gracefully", async () => {
			const corruptedYaml = "customModes: [invalid yaml content"
			;(fs.readFile as Mock).mockResolvedValue(corruptedYaml)

			const newMode: ModeConfig = {
				slug: "test-mode",
				name: "Test Mode",
				roleDefinition: "Test Role",
				groups: ["read"],
				source: "global",
			}

			await manager.updateCustomMode("test-mode", newMode)

			// Verify that a valid YAML structure was written
			const writeCall = (fs.writeFile as Mock).mock.calls[0]
			const writtenContent = yaml.parse(writeCall[1])
			expect(writtenContent).toEqual({
				customModes: [
					expect.objectContaining({
						slug: "test-mode",
						name: "Test Mode",
						roleDefinition: "Test Role",
					}),
				],
			})
		})

		describe("importModeWithRules", () => {
			it("should return error when YAML content is invalid", async () => {
				const invalidYaml = "invalid yaml content"

				const result = await manager.importModeWithRules(invalidYaml)

				expect(result.success).toBe(false)
				expect(result.error).toContain("Invalid import format")
			})

			it("should return error when no custom modes found in YAML", async () => {
				const emptyYaml = yaml.stringify({ customModes: [] })

				const result = await manager.importModeWithRules(emptyYaml)

				expect(result.success).toBe(false)
				expect(result.error).toBe("Invalid import format: Expected 'customModes' array in YAML")
			})

			it("should return error when no workspace is available", async () => {
				;(getWorkspacePath as Mock).mockReturnValue(null)
				const validYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
						},
					],
				})

				const result = await manager.importModeWithRules(validYaml)

				expect(result.success).toBe(false)
				expect(result.error).toBe("No workspace found")
			})

			it("should successfully import mode without rules files", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "imported-mode",
							name: "Imported Mode",
							roleDefinition: "Imported Role",
							groups: ["read", "edit"],
						},
					],
				})

				let roomodesContent: any = null
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes && roomodesContent) {
						return yaml.stringify(roomodesContent)
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
					if (path === mockRoomodes) {
						roomodesContent = yaml.parse(content)
					}
					return Promise.resolve()
				})

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)
				expect(fs.writeFile).toHaveBeenCalledWith(
					expect.stringContaining(".kilocodemodes"),
					expect.stringContaining("imported-mode"),
					"utf-8",
				)
			})

			it("should successfully import mode with rules files", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "imported-mode",
							name: "Imported Mode",
							roleDefinition: "Imported Role",
							groups: ["read"],
							rulesFiles: [
								{
									relativePath: "rules-imported-mode/rule1.md",
									content: "Rule 1 content",
								},
								{
									relativePath: "rules-imported-mode/subfolder/rule2.md",
									content: "Rule 2 content",
								},
							],
						},
					],
				})

				let roomodesContent: any = null
				let writtenFiles: Record<string, string> = {}
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes && roomodesContent) {
						return yaml.stringify(roomodesContent)
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
					if (path === mockRoomodes) {
						roomodesContent = yaml.parse(content)
					} else {
						writtenFiles[path] = content
					}
					return Promise.resolve()
				})
				;(fs.mkdir as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)

				// Verify mode was imported
				expect(fs.writeFile).toHaveBeenCalledWith(
					expect.stringContaining(".kilocodemodes"),
					expect.stringContaining("imported-mode"),
					"utf-8",
				)

				// Verify rules files were created
				expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("rules-imported-mode"), {
					recursive: true,
				})
				expect(fs.mkdir).toHaveBeenCalledWith(
					expect.stringContaining(path.join("rules-imported-mode", "subfolder")),
					{ recursive: true },
				)

				// Verify file contents
				const rule1Path = Object.keys(writtenFiles).find((p) => p.includes("rule1.md"))
				const rule2Path = Object.keys(writtenFiles).find((p) => p.includes("rule2.md"))
				expect(writtenFiles[rule1Path!]).toBe("Rule 1 content")
				expect(writtenFiles[rule2Path!]).toBe("Rule 2 content")
			})

			it("should import multiple modes at once", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "mode1",
							name: "Mode 1",
							roleDefinition: "Role 1",
							groups: ["read"],
						},
						{
							slug: "mode2",
							name: "Mode 2",
							roleDefinition: "Role 2",
							groups: ["edit"],
							rulesFiles: [
								{
									relativePath: "rules-mode2/rule.md",
									content: "Mode 2 rules",
								},
							],
						},
					],
				})

				let roomodesContent: any = null
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes && roomodesContent) {
						return yaml.stringify(roomodesContent)
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
					if (path === mockRoomodes) {
						roomodesContent = yaml.parse(content)
					}
					return Promise.resolve()
				})

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)
				expect(roomodesContent.customModes).toHaveLength(2)
				expect(roomodesContent.customModes[0].slug).toBe("mode1")
				expect(roomodesContent.customModes[1].slug).toBe("mode2")
			})

			it("should handle import errors gracefully", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
							rulesFiles: [
								{
									relativePath: "rules-test-mode/rule.md",
									content: "Rule content",
								},
							],
						},
					],
				})

				// Mock fs.readFile to work normally
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes) {
						throw new Error("File not found")
					}
					throw new Error("File not found")
				})

				// Mock fs.mkdir to fail when creating rules directory
				;(fs.mkdir as Mock).mockRejectedValue(new Error("Permission denied"))

				// Mock fs.writeFile to work normally for .roomodes but we won't get there
				;(fs.writeFile as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(false)
				expect(result.error).toContain("Permission denied")
			})

			it("should prevent path traversal attacks in import", async () => {
				const maliciousYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
							rulesFiles: [
								{
									relativePath: "../../../etc/passwd",
									content: "malicious content",
								},
								{
									relativePath: "rules-test-mode/../../../sensitive.txt",
									content: "malicious content",
								},
								{
									relativePath: "/absolute/path/file.txt",
									content: "malicious content",
								},
							],
						},
					],
				})

				let writtenFiles: string[] = []
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string) => {
					writtenFiles.push(path)
					return Promise.resolve()
				})
				;(fs.mkdir as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(maliciousYaml)

				expect(result.success).toBe(true)

				// Verify that no files were written outside the .roo directory
				const mockWorkspacePath = path.resolve("/mock/workspace")
				const writtenRuleFiles = writtenFiles.filter((p) => !p.includes(".kilocodemodes"))
				writtenRuleFiles.forEach((filePath) => {
					const normalizedPath = path.normalize(filePath)
					const expectedBasePath = path.normalize(
						getProjectRooDirectoryForCwd(mockWorkspacePath), // kilocode_change
					)
					expect(normalizedPath.startsWith(expectedBasePath)).toBe(true)
				})

				// Verify that malicious paths were not written
				expect(writtenFiles.some((p) => p.includes("etc/passwd"))).toBe(false)
				expect(writtenFiles.some((p) => p.includes("sensitive.txt"))).toBe(false)
				expect(writtenFiles.some((p) => path.isAbsolute(p) && !p.startsWith(mockWorkspacePath))).toBe(false)
			})

			it("rejects POSIX-absolute rule file paths via the resolved-path base directory check", async () => {
				const posixAbsoluteYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
							rulesFiles: [
								{
									relativePath: "/abs/path/escape.txt",
									content: "malicious",
								},
							],
						},
					],
				})

				const writtenPaths: string[] = []
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					throw new Error("File not found")
				})
				;(fs.rm as Mock).mockResolvedValue(undefined)
				;(fs.mkdir as Mock).mockResolvedValue(undefined)
				;(fs.writeFile as Mock).mockImplementation(async (p: string) => {
					writtenPaths.push(p)
					return Promise.resolve()
				})

				const result = await manager.importModeWithRules(posixAbsoluteYaml)
				expect(result.success).toBe(true)
				// If the resolved-path base directory check fires, the rules file should NOT be written.
				// (There will still be writes to the .kilocodemodes file.)
				const nonModesWrites = writtenPaths.filter((p) => !p.includes(".kilocodemodes"))
				expect(nonModesWrites.some((p) => p.includes("escape.txt"))).toBe(false)
			})

			it("should handle malformed YAML gracefully", async () => {
				const malformedYaml = `
	customModes:
			- slug: test-mode
			  name: Test Mode
			  roleDefinition: Test Role
			  groups: [read
			    invalid yaml here
				`

				const result = await manager.importModeWithRules(malformedYaml)

				expect(result.success).toBe(false)
				expect(result.error).toContain("Invalid YAML format")
			})

			it("should validate mode configuration during import", async () => {
				const invalidModeYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "", // Invalid: empty name
							roleDefinition: "", // Invalid: empty role definition
							groups: ["invalid-group"], // Invalid group
						},
					],
				})

				const result = await manager.importModeWithRules(invalidModeYaml)

				expect(result.success).toBe(false)
				expect(result.error).toContain("Invalid mode configuration")
			})

			it("should remove existing rules folder when importing mode without rules", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
							// No rulesFiles property - this mode has no rules
						},
					],
				})

				let roomodesContent: any = null
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes && roomodesContent) {
						return yaml.stringify(roomodesContent)
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
					if (path === mockRoomodes) {
						roomodesContent = yaml.parse(content)
					}
					return Promise.resolve()
				})
				;(fs.rm as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)

				// Verify that fs.rm was called to remove the existing rules folder
				expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining(path.join(".kilocode", "rules-test-mode")), {
					recursive: true,
					force: true,
				})

				// Verify mode was imported
				expect(fs.writeFile).toHaveBeenCalledWith(
					expect.stringContaining(".kilocodemodes"),
					expect.stringContaining("test-mode"),
					"utf-8",
				)
			})

			it("should remove existing rules folder and create new ones when importing mode with rules", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "test-mode",
							name: "Test Mode",
							roleDefinition: "Test Role",
							groups: ["read"],
							rulesFiles: [
								{
									relativePath: "rules-test-mode/new-rule.md",
									content: "New rule content",
								},
							],
						},
					],
				})

				let roomodesContent: any = null
				let writtenFiles: Record<string, string> = {}
				;(fs.readFile as Mock).mockImplementation(async (path: string) => {
					if (path === mockSettingsPath) {
						return yaml.stringify({ customModes: [] })
					}
					if (path === mockRoomodes && roomodesContent) {
						return yaml.stringify(roomodesContent)
					}
					throw new Error("File not found")
				})
				;(fs.writeFile as Mock).mockImplementation(async (path: string, content: string) => {
					if (path === mockRoomodes) {
						roomodesContent = yaml.parse(content)
					} else {
						writtenFiles[path] = content
					}
					return Promise.resolve()
				})
				;(fs.rm as Mock).mockResolvedValue(undefined)
				;(fs.mkdir as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)

				// Verify that fs.rm was called to remove the existing rules folder
				expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining(path.join(".kilocode", "rules-test-mode")), {
					recursive: true,
					force: true,
				})

				// Verify new rules files were created
				expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("rules-test-mode"), { recursive: true })

				// Verify file contents
				const newRulePath = Object.keys(writtenFiles).find((p) => p.includes("new-rule.md"))
				expect(writtenFiles[newRulePath!]).toBe("New rule content")
			})

			it("logs overwrite when importing a mode that already exists", async () => {
				const importYaml = yaml.stringify({
					customModes: [
						{
							slug: "existing-mode",
							name: "Existing Mode",
							roleDefinition: "Existing Role",
							groups: ["read"],
						},
					],
				})

				// Pretend the mode already exists in global settings.
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) {
						return yaml.stringify({
							customModes: [
								{ slug: "existing-mode", name: "Old", roleDefinition: "Old", groups: ["read"] },
							],
						})
					}
					throw new Error("File not found")
				})
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockSettingsPath)
				;(fs.writeFile as Mock).mockResolvedValue(undefined)

				const result = await manager.importModeWithRules(importYaml)

				expect(result.success).toBe(true)
				expect(vi.mocked(logger.info)).toHaveBeenCalledWith("Overwriting existing mode: existing-mode")
			})
		})
	})

	describe("checkRulesDirectoryHasContent", () => {
		it("should return false when no workspace is available", async () => {
			;(getWorkspacePath as Mock).mockReturnValue(null)

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(false)
		})

		it("should return false when mode is not in .roomodes file", async () => {
			const roomodesContent = { customModes: [{ slug: "other-mode", name: "Other Mode" }] }
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(false)
		})

		it("should return false when .roomodes doesn't exist and mode is not a custom mode", async () => {
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				throw new Error("File not found")
			})

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(false)
		})

		it("should return false when rules directory doesn't exist", async () => {
			const roomodesContent = { customModes: [{ slug: "test-mode", name: "Test Mode" }] }
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("Directory not found"))

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(false)
		})

		it("should return false when rules directory is empty", async () => {
			const roomodesContent = { customModes: [{ slug: "test-mode", name: "Test Mode" }] }
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([])

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(false)
		})

		it("should return true when rules directory has content files", async () => {
			const roomodesContent = { customModes: [{ slug: "test-mode", name: "Test Mode" }] }
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path.includes("rules-test-mode")) {
					return "Some rule content"
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true, parentPath: "/mock/workspace/.roo/rules-test-mode" },
			])

			const result = await manager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(true)
		})

		it("should work with global custom modes when .roomodes doesn't exist", async () => {
			const settingsContent = {
				customModes: [{ slug: "test-mode", name: "Test Mode", groups: ["read"], roleDefinition: "Test Role" }],
			}

			// Create a fresh manager instance to avoid cache issues
			const freshManager = new CustomModesManager(mockContext, mockOnUpdate)

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath // .roomodes doesn't exist
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify(settingsContent)
				}
				if (path.includes("rules-test-mode")) {
					return "Some rule content"
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true, parentPath: "/mock/workspace/.kilocode/rules-test-mode" },
			])

			const result = await freshManager.checkRulesDirectoryHasContent("test-mode")

			expect(result).toBe(true)
		})
	})

	describe("exportModeWithRules", () => {
		it("should return error when mode is not found and no workspace is available", async () => {
			// Create a fresh manager instance to avoid cache issues
			const freshManager = new CustomModesManager(mockContext, mockOnUpdate)

			// Mock no workspace folders
			;(vscode.workspace as any).workspaceFolders = []
			;(getWorkspacePath as Mock).mockReturnValue(null)
			;(fileExistsAtPath as Mock).mockResolvedValue(false)
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				throw new Error("File not found")
			})

			const result = await freshManager.exportModeWithRules("test-mode")

			expect(result.success).toBe(false)
			expect(result.error).toBe("Mode not found")
		})

		it("should return error when mode is not found", async () => {
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})

			const result = await manager.exportModeWithRules("test-mode")

			expect(result.success).toBe(false)
			expect(result.error).toBe("Mode not found")
		})

		it("should successfully export mode without rules when rules directory doesn't exist", async () => {
			const roomodesContent = {
				customModes: [{ slug: "test-mode", name: "Test Mode", roleDefinition: "Test Role", groups: ["read"] }],
			}
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("Directory not found"))

			const result = await manager.exportModeWithRules("test-mode")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("test-mode")
			expect(result.yaml).toContain("Test Mode")
		})

		it("should successfully export mode without rules when no rule files are found", async () => {
			const roomodesContent = {
				customModes: [{ slug: "test-mode", name: "Test Mode", roleDefinition: "Test Role", groups: ["read"] }],
			}
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([])

			const result = await manager.exportModeWithRules("test-mode")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("test-mode")
		})

		it("should successfully export mode with rules for a custom mode in .roomodes", async () => {
			const roomodesContent = {
				customModes: [
					{
						slug: "test-mode",
						name: "Test Mode",
						roleDefinition: "Test Role",
						groups: ["read"],
						customInstructions: "Existing instructions",
					},
				],
			}

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path.includes("rules-test-mode")) {
					return "New rule content from files"
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true, parentPath: "/mock/workspace/.kilocode/rules-test-mode" },
			])

			const result = await manager.exportModeWithRules("test-mode")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("test-mode")
			expect(result.yaml).toContain("Existing instructions")
			expect(result.yaml).toContain("New rule content from files")
			// Should NOT delete the rules directory
			expect(fs.rm).not.toHaveBeenCalled()
		})

		it("should successfully export mode with rules for a built-in mode customized in .roomodes", async () => {
			const roomodesContent = {
				customModes: [
					{
						slug: "code",
						name: "Custom Code Mode",
						roleDefinition: "Custom Role",
						groups: ["read"],
					},
				],
			}

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path.includes("rules-code")) {
					return "Custom rules for code mode"
				}
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true, parentPath: "/mock/workspace/.kilocode/rules-code" },
			])

			const result = await manager.exportModeWithRules("code")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("Custom Code Mode")
			expect(result.yaml).toContain("Custom rules for code mode")
			// Should NOT delete the rules directory
			expect(fs.rm).not.toHaveBeenCalled()
		})

		it("should handle file read errors gracefully", async () => {
			const roomodesContent = {
				customModes: [
					{
						slug: "test-mode",
						name: "Test Mode",
						roleDefinition: "Test Role",
						groups: ["read"],
					},
				],
			}

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path.includes("rules-test-mode")) {
					throw new Error("Permission denied")
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true, parentPath: "/mock/workspace/.kilocode/rules-test-mode" },
			])

			const result = await manager.exportModeWithRules("test-mode")

			// Should still succeed even if file read fails
			expect(result.success).toBe(true)
			expect(result.yaml).toContain("test-mode")
		})

		it("should successfully export global mode with rules from global .roo directory", async () => {
			// Mock a global mode
			const globalMode = {
				slug: "global-test-mode",
				name: "Global Test Mode",
				roleDefinition: "Global Test Role",
				groups: ["read"],
				source: "global",
			}

			// Create a fresh manager instance to avoid cache issues
			const freshManager = new CustomModesManager(mockContext, mockOnUpdate)

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [globalMode] })
				}
				if (path.includes("rules-global-test-mode") && path.includes("rule1.md")) {
					return "Global rule content"
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.stat as Mock).mockImplementation(async (path: string) => {
				if (path.includes("rules-global-test-mode")) {
					return { isDirectory: () => true }
				}
				throw new Error("Directory not found")
			})
			;(fs.readdir as Mock).mockImplementation(async (path: string) => {
				if (path.includes("rules-global-test-mode")) {
					return [{ name: "rule1.md", isFile: () => true }]
				}
				return []
			})

			const result = await freshManager.exportModeWithRules("global-test-mode")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("global-test-mode")
			expect(result.yaml).toContain("Global Test Mode")
			expect(result.yaml).toContain("Global rule content")
		})

		it("should successfully export global mode without rules when global rules directory doesn't exist", async () => {
			// Mock a global mode
			const globalMode = {
				slug: "global-test-mode",
				name: "Global Test Mode",
				roleDefinition: "Global Test Role",
				groups: ["read"],
				source: "global",
			}

			// Create a fresh manager instance to avoid cache issues
			const freshManager = new CustomModesManager(mockContext, mockOnUpdate)

			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [globalMode] })
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("Directory not found"))

			const result = await freshManager.exportModeWithRules("global-test-mode")

			expect(result.success).toBe(true)
			expect(result.yaml).toContain("global-test-mode")
			expect(result.yaml).toContain("Global Test Mode")
			// Should not contain rulesFiles since no rules directory exists
			expect(result.yaml).not.toContain("rulesFiles")
		})

		it("should handle global mode export when workspace is not available", async () => {
			// Mock a global mode
			const globalMode = {
				slug: "global-test-mode",
				name: "Global Test Mode",
				roleDefinition: "Global Test Role",
				groups: ["read"],
				source: "global",
			}

			// Create a fresh manager instance to avoid cache issues
			const freshManager = new CustomModesManager(mockContext, mockOnUpdate)

			// Mock no workspace folders
			;(vscode.workspace as any).workspaceFolders = []
			;(getWorkspacePath as Mock).mockReturnValue(null)
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockSettingsPath) {
					return yaml.stringify({ customModes: [globalMode] })
				}
				if (path.includes("rules-global-test-mode") && path.includes("rule1.md")) {
					return "Global rule content"
				}
				throw new Error("File not found")
			})
			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockSettingsPath
			})
			;(fs.stat as Mock).mockImplementation(async (path: string) => {
				if (path.includes("rules-global-test-mode")) {
					return { isDirectory: () => true }
				}
				throw new Error("Directory not found")
			})
			;(fs.readdir as Mock).mockImplementation(async (path: string) => {
				if (path.includes("rules-global-test-mode")) {
					return [{ name: "rule1.md", isFile: () => true }]
				}
				return []
			})

			const result = await freshManager.exportModeWithRules("global-test-mode")

			// Should succeed even without workspace since it's a global mode
			expect(result.success).toBe(true)
			expect(result.yaml).toContain("global-test-mode")
			expect(result.yaml).toContain("Global rule content")
		})

		it("should normalize paths to use forward slashes in exported YAML", async () => {
			const roomodesContent = {
				customModes: [
					{
						slug: "test-mode",
						name: "Test Mode",
						roleDefinition: "Test Role",
						groups: ["read"],
					},
				],
			}

			;(fileExistsAtPath as Mock).mockImplementation(async (path: string) => {
				return path === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (path: string) => {
				if (path === mockRoomodes) {
					return yaml.stringify(roomodesContent)
				}
				if (path.includes("rules-test-mode")) {
					return "Rule content"
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })

			// Mock readdir to return entries with subdirectories
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "rule1.md", isFile: () => true },
				{ name: "rule2.md", isFile: () => true },
			])

			const result = await manager.exportModeWithRules("test-mode")

			expect(result.success).toBe(true)

			// Parse the YAML to check the paths
			const exportedData = yaml.parse(result.yaml!)
			const rulesFiles = exportedData.customModes[0].rulesFiles

			// Verify that all paths use forward slashes
			expect(rulesFiles).toBeDefined()
			expect(rulesFiles.length).toBe(2)

			// Check that all paths use forward slashes and do NOT include the rules-{slug} prefix
			rulesFiles.forEach((file: any) => {
				expect(file.relativePath).not.toContain("\\")
				// The PR excludes the rules-{slug} folder from paths
				expect(file.relativePath).not.toMatch(/^rules-test-mode\//)
				// Files should be at the root level now
				expect(file.relativePath).toMatch(/^rule\d+\.md$/)
			})

			// Ensure no backslashes in the entire exported YAML
			expect(result.yaml).not.toContain("\\")
		})
	})

	describe("Coverage gaps (targeted)", () => {
		it("loadModesFromFile logs unexpected errors when not alreadyHandled", async () => {
			const anyManager = manager as any
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
			;(fs.readFile as Mock).mockRejectedValueOnce(new Error("boom"))
			const result = await anyManager.loadModesFromFile("/any/path.yaml")
			expect(result).toEqual([])
			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it("parseYamlSafely returns empty object when YAML parses to null", () => {
			const anyManager = manager as any
			const parsed = anyManager.parseYamlSafely("null", mockSettingsPath)
			expect(parsed).toEqual({})
		})

		it("loadModesFromFile catch avoids logging when error.alreadyHandled=true", async () => {
			const anyManager = manager as any
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
			;(fs.readFile as Mock).mockRejectedValueOnce({ alreadyHandled: true })
			const result = await anyManager.loadModesFromFile("/any/path.yaml")
			expect(result).toEqual([])
			expect(consoleSpy).not.toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it("handleSettingsChange covers roomodesPath missing branch", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			const originalFolders = (vscode.workspace as any).workspaceFolders
			try {
				let settingsOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn((cb: any) => {
						settingsOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockReturnValue(settingsWatcher)
				;(vscode.workspace as any).workspaceFolders = []
				;(fs.readFile as Mock).mockResolvedValueOnce(
					yaml.stringify({
						customModes: [{ slug: "m", name: "M", roleDefinition: "R", groups: ["read"] }],
					}),
				)
				;(fileExistsAtPath as Mock).mockResolvedValue(false)
				;(mockContext.globalState.get as Mock).mockResolvedValue([])

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(settingsOnChange).toBeDefined()

				await settingsOnChange!()
				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([expect.objectContaining({ slug: "m" })]),
				)
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("deleteCustomMode covers roomodesPath missing branch", async () => {
			const originalFolders = (vscode.workspace as any).workspaceFolders
			;(vscode.workspace as any).workspaceFolders = []
			try {
				const slug = "global-only"
				;(fs.readFile as Mock).mockResolvedValueOnce(
					yaml.stringify({
						customModes: [{ slug, name: "G", roleDefinition: "R", groups: ["read"], source: "global" }],
					}),
				)
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockSettingsPath)
				;(fs.writeFile as Mock).mockResolvedValue(undefined)
				;(fs.rm as Mock).mockResolvedValue(undefined)

				await manager.deleteCustomMode(slug)
				// Should not attempt to write to .kilocodemodes when no workspace is available.
				expect((fs.writeFile as Mock).mock.calls.some((c) => String(c[0]).includes(".kilocodemodes"))).toBe(
					false,
				)
			} finally {
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("checkRulesDirectoryHasContent covers roomodesData?.customModes fallback branch", async () => {
			const anyManager = manager as any
			anyManager.cachedModes = []
			anyManager.cachedAt = Date.now()
			;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockRoomodes)
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockRoomodes) return "{}"
				throw new Error("File not found")
			})

			const result = await manager.checkRulesDirectoryHasContent("missing-mode")
			expect(result).toBe(false)
		})

		it("exportModeWithRules covers roomodesData?.customModes fallback branch", async () => {
			vi.spyOn(manager, "getCustomModes").mockResolvedValueOnce([])
			;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
			const roomodesPath = path.join(mockWorkspacePath, ".kilocodemodes")
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === roomodesPath)
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === roomodesPath) return "{}"
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("no rules dir"))

			const result = await manager.exportModeWithRules("code")
			expect(result.success).toBe(true)
		})
		it("covers early-return paths in processWriteQueue", async () => {
			const anyManager = manager as any

			anyManager.isWriting = true
			anyManager.writeQueue = [async () => undefined]
			await anyManager.processWriteQueue()

			anyManager.isWriting = false
			anyManager.writeQueue = []
			await anyManager.processWriteQueue()
		})

		it("cleans problematic/invisible characters deterministically", () => {
			const anyManager = manager as any
			const input = `a\u00A0b\u200Bc\u200Cd\u200De\u2018f\u2019\u201Cg\u201Dh\u2014i\u2212j`
			const output = anyManager.cleanInvisibleCharacters(input)

			// NBSP => space
			expect(output).toContain("a b")
			// Zero-width chars removed
			expect(output).not.toContain("\u200B")
			expect(output).not.toContain("\u200C")
			expect(output).not.toContain("\u200D")
			// Smart quotes normalized
			expect(output).toContain("'")
			expect(output).toContain('"')
			// Dashes normalized
			expect(output).toContain("-")
		})

		it("watchCustomModesFiles returns early when NODE_ENV=test", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				const createWatcherMock = vi.fn()
				;(vscode.workspace as any).createFileSystemWatcher = createWatcherMock

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				await (testManager as any).watchCustomModesFiles()

				expect(createWatcherMock).not.toHaveBeenCalled()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("handleSettingsChange shows invalid format when parseYamlSafely throws", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			const originalFolders = (vscode.workspace as any).workspaceFolders
			try {
				let settingsOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn((cb: any) => {
						settingsOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockReturnValue(settingsWatcher)
				;(vscode.workspace as any).workspaceFolders = []

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)

				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(settingsOnChange).toBeDefined()
				;(fs.readFile as Mock).mockResolvedValueOnce(yaml.stringify({ customModes: [] }))
				;(testManager as any).parseYamlSafely = () => {
					throw new Error("boom")
				}

				await settingsOnChange!()
				expect(vscode.window.showErrorMessage).toHaveBeenCalled()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("handleSettingsChange shows invalid format when schema validation fails", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			const originalFolders = (vscode.workspace as any).workspaceFolders
			try {
				let settingsOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn((cb: any) => {
						settingsOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockReturnValue(settingsWatcher)
				;(vscode.workspace as any).workspaceFolders = []

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)

				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(settingsOnChange).toBeDefined()

				// invalid mode entries => schema validation failure
				;(fs.readFile as Mock).mockResolvedValueOnce(yaml.stringify({ customModes: [{ slug: "bad" }] }))

				await settingsOnChange!()
				expect(vscode.window.showErrorMessage).toHaveBeenCalled()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("handleSettingsChange merges managed modes when managed file exists", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let settingsOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn((cb: any) => {
						settingsOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})

				const managedModesPath = path.join(os.homedir(), ".kilocode", "workflowai", "managed_custom_modes.yaml")
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
					return p === mockSettingsPath || p === mockRoomodes || p === managedModesPath
				})
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) return yaml.stringify({ customModes: [] })
					if (p === managedModesPath) {
						return yaml.stringify({
							customModes: [{ slug: "managed-only", name: "M", roleDefinition: "R", groups: ["read"] }],
						})
					}
					throw new Error("File not found")
				})

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(settingsOnChange).toBeDefined()

				await settingsOnChange!()

				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([expect.objectContaining({ slug: "managed-only" })]),
				)
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("handleSettingsChange outer catch is exercised when read fails", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let settingsOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn((cb: any) => {
						settingsOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})
				const testManager = new CustomModesManager(mockContext, mockOnUpdate)

				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(settingsOnChange).toBeDefined()

				const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
				;(fs.readFile as Mock).mockRejectedValueOnce(new Error("read failed"))
				await settingsOnChange!()
				expect(consoleSpy).toHaveBeenCalled()
				consoleSpy.mockRestore()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("handleRoomodesChange includes managed modes when managed file exists", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let roomodesOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn((cb: any) => {
						roomodesOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}

				const managedModesPath = path.join(os.homedir(), ".kilocode", "workflowai", "managed_custom_modes.yaml")
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
					return p === mockSettingsPath || p === mockRoomodes || p === managedModesPath
				})
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) return yaml.stringify({ customModes: [] })
					if (p === mockRoomodes) return yaml.stringify({ customModes: [] })
					if (p === managedModesPath) {
						return yaml.stringify({
							customModes: [{ slug: "managed-only", name: "M", roleDefinition: "R", groups: ["read"] }],
						})
					}
					throw new Error("File not found")
				})
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(roomodesOnChange).toBeDefined()

				await roomodesOnChange!()
				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([expect.objectContaining({ slug: "managed-only" })]),
				)
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("handleRoomodesChange outer catch is exercised when loadModesFromFile throws", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let roomodesOnChange: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn((cb: any) => {
						roomodesOnChange = cb
						return { dispose: vi.fn() }
					}),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockReturnValue(roomodesWatcher)

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				;(testManager as any).loadModesFromFile = vi.fn().mockRejectedValue(new Error("boom"))

				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(roomodesOnChange).toBeDefined()

				const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
				await roomodesOnChange!()
				expect(consoleSpy).toHaveBeenCalled()
				consoleSpy.mockRestore()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("roomodes onDidDelete refresh path is covered", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let roomodesOnDelete: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn((cb: any) => {
						roomodesOnDelete = cb
						return { dispose: vi.fn() }
					}),
					dispose: vi.fn(),
				}
				const managedModesPath = path.join(os.homedir(), ".kilocode", "workflowai", "managed_custom_modes.yaml")
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
					return p === mockSettingsPath || p === mockRoomodes || p === managedModesPath
				})
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) {
						return yaml.stringify({
							customModes: [{ slug: "g", name: "G", roleDefinition: "r", groups: ["read"] }],
						})
					}
					if (p === managedModesPath) {
						return yaml.stringify({
							customModes: [{ slug: "managed", name: "M", roleDefinition: "r", groups: ["read"] }],
						})
					}
					throw new Error("File not found")
				})
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(roomodesOnDelete).toBeDefined()

				await roomodesOnDelete!()
				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([
						expect.objectContaining({ slug: "g" }),
						expect.objectContaining({ slug: "managed" }),
					]),
				)
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("updateCustomMode rejects invalid configs with a user-visible error", async () => {
			const invalidMode = {
				slug: "bad",
				name: "Bad",
				// roleDefinition missing
				groups: ["read"],
				source: "global",
			} as unknown as ModeConfig

			await expect(manager.updateCustomMode("bad", invalidMode)).rejects.toBeDefined()
			expect(vscode.window.showErrorMessage).toHaveBeenCalled()
		})

		it("updateCustomMode for project mode fails when no workspace folders exist", async () => {
			const originalFolders = (vscode.workspace as any).workspaceFolders
			;(vscode.workspace as any).workspaceFolders = []
			try {
				const projectMode: ModeConfig = {
					slug: "p",
					name: "P",
					roleDefinition: "R",
					groups: ["read"],
					source: "project",
				}
				await expect(manager.updateCustomMode("p", projectMode)).rejects.toBeDefined()
			} finally {
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("updateCustomMode catch path is exercised when write fails", async () => {
			;(fs.writeFile as Mock).mockRejectedValueOnce("disk full")
			const mode: ModeConfig = {
				slug: "mode1",
				name: "Mode 1",
				roleDefinition: "Role",
				groups: ["read"],
				source: "global",
			}
			await expect(manager.updateCustomMode("mode1", mode)).rejects.toBeDefined()
			expect(vscode.window.showErrorMessage).toHaveBeenCalled()
		})

		it("updateModesInFile uses fallback settings when parseYamlSafely throws", async () => {
			const anyManager = manager as any
			anyManager.parseYamlSafely = () => {
				throw new Error("boom")
			}
			;(fs.readFile as Mock).mockResolvedValueOnce("{}")
			;(fs.writeFile as Mock).mockResolvedValueOnce(undefined)

			const mode: ModeConfig = {
				slug: "m",
				name: "M",
				roleDefinition: "R",
				groups: ["read"],
				source: "global",
			}
			await manager.updateCustomMode("m", mode)
		})

		it("updateModesInFile normalizes non-object YAML parse results", async () => {
			const anyManager = manager as any
			anyManager.parseYamlSafely = () => "not-an-object"
			;(fs.readFile as Mock).mockResolvedValueOnce("not-an-object")
			;(fs.writeFile as Mock).mockResolvedValueOnce(undefined)

			const mode: ModeConfig = {
				slug: "m2",
				name: "M2",
				roleDefinition: "R",
				groups: ["read"],
				source: "global",
			}
			await manager.updateCustomMode("m2", mode)
		})

		it("deleteCustomMode deletes from both project and global when mode exists in both", async () => {
			const slug = "both"
			;(fileExistsAtPath as Mock).mockImplementation(
				async (p: string) => p === mockSettingsPath || p === mockRoomodes,
			)
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSettingsPath) {
					return yaml.stringify({
						customModes: [{ slug, name: "G", roleDefinition: "R", groups: ["read"] }],
					})
				}
				if (p === mockRoomodes) {
					return yaml.stringify({
						customModes: [{ slug, name: "P", roleDefinition: "R", groups: ["read"] }],
					})
				}
				throw new Error("File not found")
			})
			;(fs.writeFile as Mock).mockResolvedValue(undefined)
			;(fs.rm as Mock).mockResolvedValue(undefined)

			await manager.deleteCustomMode(slug)

			// updateModesInFile should have been invoked for both files
			expect(
				(fs.writeFile as Mock).mock.calls.some((c) => path.normalize(c[0]) === path.normalize(mockRoomodes)),
			).toBe(true)
			expect(
				(fs.writeFile as Mock).mock.calls.some(
					(c) => path.normalize(c[0]) === path.normalize(mockSettingsPath),
				),
			).toBe(true)
		})

		it("deleteRulesFolder returns early for project scope when workspacePath is missing", async () => {
			const anyManager = manager as any
			;(getWorkspacePath as Mock).mockReturnValueOnce(null)
			await anyManager.deleteRulesFolder("p", { slug: "p", source: "project" } as any, false)
		})

		it("deleteRulesFolder warns when removal fails (marketplace + custom modes)", async () => {
			const anyManager = manager as any
			;(vscode.window as any).showWarningMessage = vi.fn()

			// Global scope (simpler to control)
			const rulesFolder = path.join(os.homedir(), ".kilocode", "rules-x")
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === rulesFolder)
			;(fs.rm as Mock).mockRejectedValueOnce(new Error("permission denied"))
			await anyManager.deleteRulesFolder("x", { slug: "x", source: "global" } as any, false)
			expect((vscode.window as any).showWarningMessage).toHaveBeenCalled()
			;(fs.rm as Mock).mockRejectedValueOnce(new Error("permission denied"))
			await anyManager.deleteRulesFolder("x", { slug: "x", source: "global" } as any, true)
			expect((vscode.window as any).showWarningMessage).toHaveBeenCalled()
		})

		it("deleteRulesFolder outer catch is exercised when fileExistsAtPath throws", async () => {
			const anyManager = manager as any
			;(fileExistsAtPath as Mock).mockRejectedValueOnce(new Error("boom"))
			await anyManager.deleteRulesFolder("x", { slug: "x", source: "global" } as any, false)
			expect(vi.mocked(logger.error)).toHaveBeenCalled()
		})

		it("resetCustomModes catch path uses non-Error thrown values", async () => {
			;(fs.writeFile as Mock).mockRejectedValueOnce("disk full")
			await manager.resetCustomModes()
			expect(vscode.window.showErrorMessage).toHaveBeenCalled()
		})

		it("checkRulesDirectoryHasContent covers workspace-missing + read errors", async () => {
			const anyManager = manager as any

			// workspace missing (mode not found anywhere) - avoid consuming the mock in getWorkspaceRoomodes
			anyManager.cachedModes = []
			anyManager.cachedAt = Date.now()
			;(getWorkspacePath as Mock).mockReturnValueOnce(null)
			const noWorkspace = await manager.checkRulesDirectoryHasContent("missing")
			expect(noWorkspace).toBe(false)

			// workspace present but roomodes read fails => false
			;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockRoomodes)
			;(fs.readFile as Mock).mockRejectedValueOnce(new Error("cannot read"))
			const readFails = await manager.checkRulesDirectoryHasContent("missing")
			expect(readFails).toBe(false)

			// mode exists (project) but workspace missing when resolving rules dir
			anyManager.cachedModes = [
				{ slug: "proj", name: "P", roleDefinition: "R", groups: ["read"], source: "project" },
			]
			anyManager.cachedAt = Date.now()
			;(getWorkspacePath as Mock).mockReturnValueOnce(null)
			const noWorkspaceForRules = await manager.checkRulesDirectoryHasContent("proj")
			expect(noWorkspaceForRules).toBe(false)
		})

		it("checkRulesDirectoryHasContent covers non-directory, readdir error, and outer catch", async () => {
			const anyManager = manager as any
			anyManager.cachedModes = [
				{ slug: "proj", name: "P", roleDefinition: "R", groups: ["read"], source: "project" },
			]
			anyManager.cachedAt = Date.now()
			;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)

			// not a directory
			;(fs.stat as Mock).mockResolvedValueOnce({ isDirectory: () => false })
			const notDir = await manager.checkRulesDirectoryHasContent("proj")
			expect(notDir).toBe(false)

			// readdir throws
			;(fs.stat as Mock).mockResolvedValueOnce({ isDirectory: () => true })
			;(fs.readdir as Mock).mockRejectedValueOnce(new Error("nope"))
			const readdirFails = await manager.checkRulesDirectoryHasContent("proj")
			expect(readdirFails).toBe(false)

			// outer catch
			;(manager as any).getCustomModes = vi.fn().mockRejectedValueOnce(new Error("boom"))
			const outerCatch = await manager.checkRulesDirectoryHasContent("proj")
			expect(outerCatch).toBe(false)
			expect(vi.mocked(logger.error)).toHaveBeenCalled()
		})

		it("exportModeWithRules covers customPrompts merge and catch", async () => {
			// customPrompts merge
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockRoomodes)
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockRoomodes) {
					return yaml.stringify({
						customModes: [{ slug: "test-mode", name: "Test Mode", roleDefinition: "R", groups: ["read"] }],
					})
				}
				throw new Error("File not found")
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("no rules dir"))

			const result = await manager.exportModeWithRules("test-mode", {
				roleDefinition: "NEW ROLE",
				description: "DESC",
				whenToUse: "WHEN",
				customInstructions: "INSTR",
			})
			expect(result.success).toBe(true)
			expect(result.yaml).toContain("NEW ROLE")
			expect(result.yaml).toContain("DESC")

			// catch path
			vi.spyOn(manager, "getCustomModes").mockRejectedValueOnce(new Error("boom"))
			const fail = await manager.exportModeWithRules("test-mode")
			expect(fail.success).toBe(false)
			expect(vi.mocked(logger.error)).toHaveBeenCalled()
		})

		it("importModeWithRules covers parseError catch and outer catch", async () => {
			const malformed = `
			customModes:
			  - slug: x
			    name: X
			    roleDefinition: R
			    groups: [read
			`
			const parseErrorResult = await manager.importModeWithRules(malformed)
			expect(parseErrorResult.success).toBe(false)
			expect(parseErrorResult.error).toContain("Invalid YAML format")

			// outer catch: make updateCustomMode throw
			vi.spyOn(manager, "updateCustomMode").mockRejectedValueOnce(new Error("update failed"))
			const okYaml = yaml.stringify({
				customModes: [{ slug: "x", name: "X", roleDefinition: "R", groups: ["read"] }],
			})
			const outerCatchResult = await manager.importModeWithRules(okYaml)
			expect(outerCatchResult.success).toBe(false)
			expect(vi.mocked(logger.error)).toHaveBeenCalled()
		})

		it("importModeWithRules exercises importRulesFiles global path + rm catch", async () => {
			const importYaml = yaml.stringify({
				customModes: [
					{
						slug: "global-import",
						name: "Global Import",
						roleDefinition: "R",
						groups: ["read"],
						rulesFiles: [{ relativePath: "sub/rule.md", content: "RULE" }],
					},
				],
			})

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === mockSettingsPath)
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSettingsPath) return yaml.stringify({ customModes: [] })
				throw new Error("File not found")
			})
			;(fs.rm as Mock).mockRejectedValueOnce(new Error("not found"))
			;(fs.mkdir as Mock).mockResolvedValue(undefined)
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			const result = await manager.importModeWithRules(importYaml, "global")
			expect(result.success).toBe(true)
		})

		it("roomodes onDidDelete covers managedModesPath missing (false branch)", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let roomodesOnDelete: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn((cb: any) => {
						roomodesOnDelete = cb
						return { dispose: vi.fn() }
					}),
					dispose: vi.fn(),
				}
				const managedModesPath = path.join(os.homedir(), ".kilocode", "workflowai", "managed_custom_modes.yaml")
				;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
					return p === mockSettingsPath || p === mockRoomodes // managed file does NOT exist
				})
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) {
						return yaml.stringify({
							customModes: [{ slug: "g", name: "G", roleDefinition: "r", groups: ["read"] }],
						})
					}
					if (p === managedModesPath) {
						throw new Error("File not found")
					}
					throw new Error("File not found")
				})
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(roomodesOnDelete).toBeDefined()

				await roomodesOnDelete!()
				expect(mockContext.globalState.update).toHaveBeenCalledWith(
					"customModes",
					expect.arrayContaining([expect.objectContaining({ slug: "g" })]),
				)
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("roomodes onDidDelete catch branch is exercised when load fails", async () => {
			const originalNodeEnv = process.env.NODE_ENV
			process.env.NODE_ENV = "test"
			try {
				let roomodesOnDelete: undefined | (() => Promise<void>)
				const settingsWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
					dispose: vi.fn(),
				}
				const roomodesWatcher = {
					onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
					onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
					onDidDelete: vi.fn((cb: any) => {
						roomodesOnDelete = cb
						return { dispose: vi.fn() }
					}),
					dispose: vi.fn(),
				}
				;(vscode.workspace as any).createFileSystemWatcher = vi.fn().mockImplementation((watchPath: string) => {
					if (path.normalize(watchPath) === path.normalize(mockRoomodes)) return roomodesWatcher
					return settingsWatcher
				})

				const testManager = new CustomModesManager(mockContext, mockOnUpdate)
				;(testManager as any).loadModesFromFile = vi.fn().mockRejectedValue(new Error("boom"))

				process.env.NODE_ENV = "development"
				await (testManager as any).watchCustomModesFiles()
				expect(roomodesOnDelete).toBeDefined()

				const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
				await roomodesOnDelete!()
				expect(consoleSpy).toHaveBeenCalled()
				consoleSpy.mockRestore()
				testManager.dispose()
			} finally {
				process.env.NODE_ENV = originalNodeEnv
			}
		})

		it("deleteRulesFolder logs success when removal succeeds", async () => {
			const anyManager = manager as any
			const rulesFolder = path.join(os.homedir(), ".kilocode", "rules-y")
			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => p === rulesFolder)
			;(fs.rm as Mock).mockResolvedValueOnce(undefined)
			await anyManager.deleteRulesFolder("y", { slug: "y", source: "global" } as any, false)
			expect(vi.mocked(logger.info)).toHaveBeenCalled()
		})

		it("deleteCustomMode catch path covers non-Error thrown values", async () => {
			;(manager as any).updateModesInFile = vi.fn().mockImplementation(async () => {
				throw "boom"
			})
			// Ensure the mode exists so delete proceeds into queueWrite
			;(fs.readFile as Mock).mockResolvedValueOnce(
				yaml.stringify({ customModes: [{ slug: "x", name: "X", roleDefinition: "R", groups: ["read"] }] }),
			)
			await manager.deleteCustomMode("x")
			expect(vscode.window.showErrorMessage).toHaveBeenCalled()
		})

		it("checkRulesDirectoryHasContent outer catch covers non-Error thrown values", async () => {
			;(manager as any).getCustomModes = vi.fn().mockRejectedValueOnce("boom")
			const result = await manager.checkRulesDirectoryHasContent("x")
			expect(result).toBe(false)
		})

		it("exportModeWithRules reads .kilocodemodes when not present in merged modes", async () => {
			const originalFolders = (vscode.workspace as any).workspaceFolders
			;(vscode.workspace as any).workspaceFolders = []
			try {
				;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
				const roomodesPath = path.join(mockWorkspacePath, ".kilocodemodes")
				;(fileExistsAtPath as Mock).mockImplementation(
					async (p: string) => p === mockSettingsPath || p === roomodesPath,
				)
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) return yaml.stringify({ customModes: [] })
					if (p === roomodesPath) {
						return yaml.stringify({
							customModes: [
								{ slug: "fallback", name: "Fallback", roleDefinition: "R", groups: ["read"] },
							],
						})
					}
					throw new Error("File not found")
				})
				;(fs.stat as Mock).mockRejectedValue(new Error("no rules dir"))

				const result = await manager.exportModeWithRules("fallback")
				expect(result.success).toBe(true)
				expect(result.yaml).toContain("Fallback")
			} finally {
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("exportModeWithRules ignores roomodes read errors and falls back to built-in", async () => {
			const originalFolders = (vscode.workspace as any).workspaceFolders
			;(vscode.workspace as any).workspaceFolders = []
			try {
				;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
				const roomodesPath = path.join(mockWorkspacePath, ".kilocodemodes")
				;(fileExistsAtPath as Mock).mockImplementation(
					async (p: string) => p === mockSettingsPath || p === roomodesPath,
				)
				;(fs.readFile as Mock).mockImplementation(async (p: string) => {
					if (p === mockSettingsPath) return yaml.stringify({ customModes: [] })
					if (p === roomodesPath) throw new Error("permission denied")
					throw new Error("File not found")
				})
				;(fs.stat as Mock).mockRejectedValue(new Error("no rules dir"))

				const result = await manager.exportModeWithRules("code")
				expect(result.success).toBe(true)
			} finally {
				;(vscode.workspace as any).workspaceFolders = originalFolders
			}
		})

		it("exportModeWithRules returns No workspace found for project-ish modes", async () => {
			vi.spyOn(manager, "getCustomModes").mockResolvedValueOnce([
				{ slug: "proj", name: "P", roleDefinition: "R", groups: ["read"], source: "project" } as any,
			])
			;(getWorkspacePath as Mock).mockReturnValue(null)
			const result = await manager.exportModeWithRules("proj")
			expect(result.success).toBe(false)
			expect(result.error).toBe("No workspace found")
			;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)
		})

		it("importRulesFiles covers expectedBasePath already ending with path.sep", async () => {
			const anyManager = manager as any
			;(fs.rm as Mock).mockResolvedValueOnce(undefined)
			;(fs.mkdir as Mock).mockResolvedValue(undefined)
			;(fs.writeFile as Mock).mockResolvedValue(undefined)

			await anyManager.importRulesFiles(
				{ slug: "sep/" } as any,
				[{ relativePath: "rule.md", content: "RULE" }],
				"global",
			)
		})

		it("exportModeWithRules catch path covers non-Error thrown values", async () => {
			;(manager as any).getCustomModes = vi.fn().mockRejectedValueOnce("boom")
			const result = await manager.exportModeWithRules("x")
			expect(result.success).toBe(false)
		})

		it("importModeWithRules catch path covers non-Error thrown values", async () => {
			vi.spyOn(manager, "updateCustomMode").mockRejectedValueOnce("boom" as any)
			const okYaml = yaml.stringify({
				customModes: [{ slug: "x", name: "X", roleDefinition: "R", groups: ["read"] }],
			})
			const result = await manager.importModeWithRules(okYaml)
			expect(result.success).toBe(false)
		})

		it("deleteRulesFolder outer catch covers non-Error thrown values", async () => {
			const anyManager = manager as any
			;(fileExistsAtPath as Mock).mockRejectedValueOnce("boom")
			await anyManager.deleteRulesFolder("x", { slug: "x" } as any, false)
			expect(vi.mocked(logger.error)).toHaveBeenCalled()
		})
	})
})
