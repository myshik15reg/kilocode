import * as path from "path"

import { workspace } from "vscode"

import type { ReadFileToolUse, ToolParamName, ToolResponse } from "../../../shared/tools"

type ReadWithBudgetResult = { content: string; tokenCount: number; lineCount: number; complete: boolean }

// Hoisted mocks (must be defined before vi.mock factories)
const { fileExistsAtPathMock, readFileWithTokenBudgetMock, fsPromisesMock } = vi.hoisted(() => {
	return {
		fileExistsAtPathMock: vi.fn<(filePath: string) => Promise<boolean>>(),
		readFileWithTokenBudgetMock:
			vi.fn<(filePath: string, options: { budgetTokens: number }) => Promise<ReadWithBudgetResult>>(),
		fsPromisesMock: {
			stat: vi.fn(),
			mkdir: vi.fn(),
			copyFile: vi.fn(),
		},
	}
})

vi.mock("os", () => ({
	homedir: vi.fn(() => "/home-test"),
}))

vi.mock("fs/promises", () => fsPromisesMock)

vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: (filePath: string) => fileExistsAtPathMock(filePath),
}))

vi.mock("../helpers/fileTokenBudget", () => ({
	FILE_READ_BUDGET_PERCENT: 0.6,
	readFileWithTokenBudget: (filePath: string, options: { budgetTokens: number }) =>
		readFileWithTokenBudgetMock(filePath, options),
}))

vi.mock("isbinaryfile", () => ({
	isBinaryFile: vi.fn(async () => false),
}))

vi.mock("../../../integrations/misc/line-counter", () => ({
	countFileLines: vi.fn(async () => 1),
}))

vi.mock("../../../integrations/misc/extract-text", () => ({
	extractTextFromFile: vi.fn(async () => ""),
	addLineNumbers: vi.fn((text: string) => text),
	getSupportedBinaryFormats: vi.fn(() => []),
}))

vi.mock("../../../services/tree-sitter", () => ({
	parseSourceCodeDefinitionsForFile: vi.fn(async () => ""),
}))

vi.mock("../../../integrations/misc/read-lines", () => ({
	readLines: vi.fn(async () => ""),
}))

vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		rooIgnoreError: (p: string) => `Blocked: ${p}`,
		toolDenied: () => "Denied",
		toolDeniedWithFeedback: (feedback?: string) => `Denied: ${feedback ?? ""}`,
		toolApprovedWithFeedback: (feedback?: string) => `Approved: ${feedback ?? ""}`,
		toolResult: (text: string) => text,
		imageBlocks: () => [],
	},
}))

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string, params?: Record<string, any>) => {
		if (key === "tools:readFile.maxLines") return ` (max ${params?.max} lines)`
		if (key === "tools:readFile.definitionsOnly") return " (definitions only)"
		if (key === "tools:readFile.linesRange") return ` (lines ${params?.start}-${params?.end})`
		return key
	}),
}))

function createMockTask(options: { cwd: string }) {
	const mockProvider = {
		getState: vi.fn(async () => ({
			maxConcurrentFileReads: 5,
			maxReadFileLine: 500,
			maxImageFileSize: 20,
			maxTotalImageSize: 20,
		})),
		deref: vi.fn().mockReturnThis(),
	}

	const mockTask: any = {
		cwd: options.cwd,
		providerRef: mockProvider,
		rooIgnoreController: {
			validateAccess: vi.fn().mockReturnValue(true),
		},
		say: vi.fn(async () => undefined),
		ask: vi.fn(async () => ({ response: "yesButtonClicked" })),
		sayAndCreateMissingParamError: vi.fn(async () => "missing"),
		fileContextTracker: {
			trackFileContext: vi.fn(async () => undefined),
		},
		recordToolUsage: vi.fn(),
		recordToolError: vi.fn(),
		consecutiveMistakeCount: 0,
		didRejectTool: false,
		didToolFailInCurrentTurn: false,
		getTokenUsage: vi.fn(() => ({ contextTokens: 0 })),
		apiConfiguration: { apiProvider: "anthropic" },
		api: {
			getModel: vi.fn(() => ({
				id: "test-model",
				info: {
					supportsImages: false,
					contextWindow: 200000,
					maxTokens: 4096,
					supportsPromptCache: false,
					supportsNativeTools: true,
				},
			})),
		},
	}

	return { mockTask, mockProvider }
}

function mockWorkspaceFolders(workspaceRoot: string) {
	const resolvedRoot = path.resolve(workspaceRoot)
	;(workspace as any).workspaceFolders = [{ uri: { fsPath: resolvedRoot } }] // kilocode_change
}

describe("read_file global fallback", () => {
	let readFileTool: typeof import("../ReadFileTool").readFileTool

	beforeEach(async () => {
		// Import after mocks are registered
		;({ readFileTool } = await import("../ReadFileTool"))

		fileExistsAtPathMock.mockReset()
		readFileWithTokenBudgetMock.mockReset()
		fsPromisesMock.stat.mockReset()
		fsPromisesMock.mkdir.mockReset()
		fsPromisesMock.copyFile.mockReset()

		fsPromisesMock.stat.mockResolvedValue({
			isDirectory: () => false,
			isFile: () => true,
		} as any)

		fsPromisesMock.mkdir.mockResolvedValue(undefined)
		fsPromisesMock.copyFile.mockResolvedValue(undefined)

		readFileWithTokenBudgetMock.mockResolvedValue({
			content: "hello",
			tokenCount: 1,
			lineCount: 1,
			complete: true,
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should prefer workspace file over global when both exist", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/rules/memory-bank-instructions.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const globalPath = path.resolve("/home-test/.kilocode", "rules/memory-bank-instructions.md")

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === workspacePath) return true
			if (p === globalPath) return true
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		})

		// Global fallback resolution should stop after confirming workspace exists.
		expect(fileExistsAtPathMock).toHaveBeenCalledTimes(1)
		expect(fileExistsAtPathMock).toHaveBeenCalledWith(workspacePath)

		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))
		expect(String(toolResult)).not.toContain(`Resolved from global AlfaCode assistant directory: ${globalPath}`)

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(workspacePath)
		expect(approvalPayload.isOutsideWorkspace).toBe(false)
	})

	it("should read from global .kilocode when workspace file is missing", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/rules/memory-bank-instructions.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const globalPath = path.resolve("/home-test/.kilocode", "rules/memory-bank-instructions.md")

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === workspacePath) return false
			if (p === globalPath) return true
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		})

		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(globalPath, expect.any(Object))
		expect(String(toolResult)).toContain(`Resolved from global AlfaCode assistant directory: ${globalPath}`)

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(globalPath)
		expect(approvalPayload.isOutsideWorkspace).toBe(true)
	})

	it("should read from global .kilocode when legacy .roo path is requested and workspace file is missing", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".roo/rules/memory-bank-instructions.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const globalPath = path.resolve("/home-test/.kilocode", "rules/memory-bank-instructions.md")

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === workspacePath) return false
			if (p === globalPath) return true
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		})

		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(globalPath, expect.any(Object))
		expect(String(toolResult)).toContain(`Resolved from global AlfaCode assistant directory: ${globalPath}`)

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(globalPath)
		expect(approvalPayload.isOutsideWorkspace).toBe(true)
	})

	it("should not attempt global fallback for .kilocode/memory-bank/*", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/memory-bank/index.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(fileExistsAtPathMock).not.toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))
		expect(String(toolResult)).not.toContain("Resolved from global AlfaCode assistant directory:")

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(workspacePath)
		expect(approvalPayload.isOutsideWorkspace).toBe(false)
	})

	it("should scaffold Memory Bank + .protocols from global templates when missing (ENOENT) and then read successfully", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/memory-bank/index.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const templatesRoot = path.resolve("/home-test/.kilocode", "workflowai/templates")
		const memoryBankTemplateDir = path.resolve(templatesRoot, "memory-bank")
		const protocolsTemplateDir = path.resolve(templatesRoot, "protocols")

		// First stat fails (missing file), then after scaffold it succeeds.
		fsPromisesMock.stat
			.mockRejectedValueOnce(Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" }))
			.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any)

		// Templates exist; destination files initially missing.
		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === memoryBankTemplateDir) return true
			if (p === protocolsTemplateDir) return true
			if (p.startsWith(memoryBankTemplateDir + path.sep)) return true
			if (p.startsWith(protocolsTemplateDir + path.sep)) return true
			// Dest files under workspace are missing at start.
			if (p.startsWith(path.resolve(workspaceRoot, ".kilocode/memory-bank") + path.sep)) return false
			if (p.startsWith(path.resolve(workspaceRoot, ".protocols") + path.sep)) return false
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(fsPromisesMock.stat).toHaveBeenCalledTimes(2)
		const memoryBankCreate = fsPromisesMock.mkdir.mock.calls.find(
			([dirPath]) => typeof dirPath === "string" && dirPath.endsWith(".kilocode\\memory-bank"),
		)
		const protocolsCreate = fsPromisesMock.mkdir.mock.calls.find(
			([dirPath]) => typeof dirPath === "string" && dirPath.endsWith("\\.protocols"),
		)
		expect(memoryBankCreate?.[1]).toEqual({ recursive: true })
		expect(protocolsCreate?.[1]).toEqual({ recursive: true })
		expect(fsPromisesMock.copyFile).toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))

		const resultText = String(toolResult)
		expect(resultText).toContain(`File: ${relPath}`)
		expect(resultText).toContain("hello")
		expect(resultText).not.toContain("Создайте Memory Bank")

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(workspacePath)
		expect(approvalPayload.isOutsideWorkspace).toBe(false)
	})

	it("should scaffold legacy .roo/memory-bank/* from global templates when missing (ENOENT)", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".roo/memory-bank/index.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const templatesRoot = path.resolve("/home-test/.kilocode", "workflowai/templates")
		const memoryBankTemplateDir = path.resolve(templatesRoot, "memory-bank")
		const protocolsTemplateDir = path.resolve(templatesRoot, "protocols")

		fsPromisesMock.stat
			.mockRejectedValueOnce(Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" }))
			.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any)

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === memoryBankTemplateDir) return true
			if (p === protocolsTemplateDir) return true
			if (p.startsWith(memoryBankTemplateDir + path.sep)) return true
			if (p.startsWith(protocolsTemplateDir + path.sep)) return true

			if (p.startsWith(path.resolve(workspaceRoot, ".kilocode/memory-bank") + path.sep)) return false
			if (p.startsWith(path.resolve(workspaceRoot, ".roo/memory-bank") + path.sep)) return false
			if (p.startsWith(path.resolve(workspaceRoot, ".protocols") + path.sep)) return false
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(fsPromisesMock.stat).toHaveBeenCalledTimes(2)
		const memoryBankCreate = fsPromisesMock.mkdir.mock.calls.find(
			([dirPath]) => typeof dirPath === "string" && dirPath.endsWith(".kilocode\\memory-bank"),
		)
		const legacyMemoryBankCreate = fsPromisesMock.mkdir.mock.calls.find(
			([dirPath]) => typeof dirPath === "string" && dirPath.endsWith(".roo\\memory-bank"),
		)
		const protocolsCreate = fsPromisesMock.mkdir.mock.calls.find(
			([dirPath]) => typeof dirPath === "string" && dirPath.endsWith("\\.protocols"),
		)
		expect(memoryBankCreate?.[1]).toEqual({ recursive: true })
		expect(legacyMemoryBankCreate?.[1]).toEqual({ recursive: true })
		expect(protocolsCreate?.[1]).toEqual({ recursive: true })
		expect(fsPromisesMock.copyFile).toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))

		const resultText = String(toolResult)
		expect(resultText).toContain(`File: ${relPath}`)
		expect(resultText).toContain("hello")
	})

	it("should keep existing Memory Bank guidance when templates are missing (ENOENT)", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/memory-bank/index.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)

		fsPromisesMock.stat
			.mockRejectedValueOnce(Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" }))
			.mockRejectedValueOnce(Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" }))

		// No templates available.
		fileExistsAtPathMock.mockResolvedValue(false)

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(fsPromisesMock.stat).toHaveBeenCalledTimes(2)
		expect(fsPromisesMock.copyFile).not.toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).not.toHaveBeenCalled()

		const resultText = String(toolResult)
		expect(resultText).toContain(`File: ${relPath}`)
		expect(resultText).toContain("Создайте Memory Bank")
		expect(resultText).toContain(".kilocode/memory-bank/")

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(workspacePath)
		expect(approvalPayload.isOutsideWorkspace).toBe(false)
	})

	it("should read .protocols/README.md from global templates when workspace file is missing", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".protocols/README.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const globalPath = path.resolve("/home-test/.kilocode", "workflowai/templates/protocols/README.md")

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === workspacePath) return false
			if (p === globalPath) return true
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(globalPath, expect.any(Object))
		expect(String(toolResult)).toContain(`Resolved from global AlfaCode assistant directory: ${globalPath}`)

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(globalPath)
		expect(approvalPayload.isOutsideWorkspace).toBe(true)
	})

	it("should read .protocols/index.md from global templates when workspace file is missing", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".protocols/index.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)
		const globalPath = path.resolve("/home-test/.kilocode", "workflowai/templates/protocols/index.md")

		fileExistsAtPathMock.mockImplementation(async (p: string) => {
			if (p === workspacePath) return false
			if (p === globalPath) return true
			return false
		})

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(globalPath, expect.any(Object))
		expect(String(toolResult)).toContain(`Resolved from global AlfaCode assistant directory: ${globalPath}`)

		const askCall = mockTask.ask.mock.calls[0]
		const approvalPayload = JSON.parse(askCall[1])
		expect(approvalPayload.content).toBe(globalPath)
		expect(approvalPayload.isOutsideWorkspace).toBe(true)
	})

	it("should not attempt global fallback for .protocols/* other than templates", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".protocols/some-task/brief.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		let toolResult: ToolResponse | undefined
		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: (result: ToolResponse) => {
				toolResult = result
			},
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		} as any)

		expect(fileExistsAtPathMock).not.toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))
		expect(String(toolResult)).not.toContain("Resolved from global AlfaCode assistant directory:")
	})

	it("should not attempt global fallback for non-whitelisted paths", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = "docs/readme.md"
		const workspacePath = path.resolve(workspaceRoot, relPath)

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: vi.fn(),
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		})

		expect(fileExistsAtPathMock).not.toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))
	})

	it("should not attempt global fallback for traversal paths", async () => {
		const workspaceRoot = "/workspace"
		mockWorkspaceFolders(workspaceRoot)

		const relPath = ".kilocode/../secrets.txt"
		const workspacePath = path.resolve(workspaceRoot, relPath)

		const { mockTask } = createMockTask({ cwd: workspaceRoot })
		const toolUse: ReadFileToolUse = {
			type: "tool_use",
			name: "read_file",
			params: { args: `<file><path>${relPath}</path></file>` },
			partial: false,
		}

		await readFileTool.handle(mockTask, toolUse, {
			askApproval: mockTask.ask,
			handleError: vi.fn(async () => undefined),
			pushToolResult: vi.fn(),
			removeClosingTag: (_: ToolParamName, content?: string) => content ?? "",
			toolProtocol: "native",
		})

		expect(fileExistsAtPathMock).not.toHaveBeenCalled()
		expect(readFileWithTokenBudgetMock).toHaveBeenCalledWith(workspacePath, expect.any(Object))
	})
})
