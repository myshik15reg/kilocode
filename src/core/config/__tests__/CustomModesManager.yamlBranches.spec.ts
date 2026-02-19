import type { Mock } from "vitest"

import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as yaml from "yaml"

import { CustomModesManager } from "../CustomModesManager"

vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [],
		onDidSaveTextDocument: vi.fn(),
		createFileSystemWatcher: vi.fn(),
		getConfiguration: vi.fn(() => ({ get: vi.fn(() => "") })),
	},
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
	},
}))

vi.mock("fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
	stat: vi.fn(),
	readdir: vi.fn(),
	rm: vi.fn(),
}))

// Critical: mock yaml.parse so we can force it to throw non-Error values and cover ternary branches.
vi.mock("yaml", async () => {
	const actual = await vi.importActual<any>("yaml")
	return {
		...actual,
		parse: vi.fn(() => {
			throw "mock yaml parse error"
		}),
	}
})

vi.mock("../../../i18n", () => ({
	t: (key: string) => key,
}))

vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn(async () => false),
}))

vi.mock("../../../utils/path", () => ({
	getWorkspacePath: vi.fn(() => null),
}))

vi.mock("../../../services/roo-config", async () => {
	const actual = await vi.importActual<any>("../../../services/roo-config")
	return {
		...actual,
		getGlobalRooDirectory: vi.fn(() => "/mock/.kilocode"),
		getProjectRooDirectoryForCwd: vi.fn((cwd: string) => `${cwd}/.kilocode`),
	}
})

describe("CustomModesManager - YAML error branch coverage", () => {
	let manager: CustomModesManager
	let mockContext: vscode.ExtensionContext

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.NODE_ENV = "test"

		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
				keys: vi.fn(() => []),
				setKeysForSync: vi.fn(),
			},
			globalStorageUri: { fsPath: "/mock/settings" },
		} as unknown as vscode.ExtensionContext

		manager = new CustomModesManager(mockContext, vi.fn())
	})

	it("parseYamlSafely uses String(yamlError) and extracts line number when YAML error contains 'at line N'", () => {
		vi.mocked(yaml.parse).mockImplementationOnce(() => {
			throw "something bad at line 12"
		})

		const anyManager = manager as any
		const parsed = anyManager.parseYamlSafely("{", "/tmp/.kilocodemodes")
		expect(parsed).toEqual({})
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("common:customModes.errors.yamlParseError")
	})

	it("parseYamlSafely uses 'unknown' when YAML error has no line info", () => {
		vi.mocked(yaml.parse).mockImplementationOnce(() => {
			throw "yaml error without line info"
		})

		const anyManager = manager as any
		const parsed = anyManager.parseYamlSafely("{", "/tmp/.kilocodemodes")
		expect(parsed).toEqual({})
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("common:customModes.errors.yamlParseError")
	})

	it("parseYamlSafely for non-.kilocodemodes files logs using String(yamlError) branch", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		vi.mocked(yaml.parse).mockImplementationOnce(() => {
			throw "yaml error non-roomodes"
		})

		const anyManager = manager as any
		const parsed = anyManager.parseYamlSafely("invalid", "/tmp/customModes.yaml")
		expect(parsed).toEqual({})
		expect(consoleSpy).toHaveBeenCalled()
		consoleSpy.mockRestore()
	})

	it("loadModesFromFile logs when fs.readFile rejects with non-Error and alreadyHandled is falsy", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		;(fs.readFile as unknown as Mock).mockRejectedValueOnce("boom")

		const anyManager = manager as any
		const result = await anyManager.loadModesFromFile("/tmp/customModes.yaml")
		expect(result).toEqual([])
		expect(consoleSpy).toHaveBeenCalled()
		consoleSpy.mockRestore()
	})

	it("importModeWithRules uses 'Failed to parse YAML' when yaml.parse throws non-Error", async () => {
		vi.mocked(yaml.parse).mockImplementationOnce(() => {
			throw "boom"
		})

		const result = await manager.importModeWithRules("definitely-not-yaml")
		expect(result.success).toBe(false)
		expect(result.error).toContain("Failed to parse YAML")
	})
})
