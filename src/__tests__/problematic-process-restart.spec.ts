// npx vitest run __tests__/problematic-process-restart.spec.ts

import { describe, it, expect, vi } from "vitest"
import type { HistoryItem } from "@roo-code/types"

import { ClineProvider } from "../core/webview/ClineProvider"
import * as apiModule from "../api"
import { TaskRecoveryPacketService } from "../core/orchestration/task-control/TaskRecoveryPacketService"
import { TaskRestartService } from "../core/orchestration/task-control/TaskRestartService"

describe("problematic process restart foundation", () => {
	const attachRestartServices = (provider: any) => {
		const logSpy = vi.fn()
		provider.log = logSpy
		provider.getState = provider.getState ?? vi.fn(async () => ({}))
		provider.providerSettingsManager = provider.providerSettingsManager ?? { getProfile: vi.fn() }
		provider.persistTaskStopState = provider.persistTaskStopState ?? vi.fn().mockResolvedValue(undefined)
		provider.showProblematicProcessNotification =
			provider.showProblematicProcessNotification ?? vi.fn().mockResolvedValue(undefined)
		provider.updateTaskHistory = provider.updateTaskHistory ?? vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = provider.createTaskWithHistoryItem ?? vi.fn().mockResolvedValue(undefined)
		provider.taskRecoveryPacketService = new TaskRecoveryPacketService({
			getState: () => provider.getState(),
			providerSettingsManager: provider.providerSettingsManager,
			log: logSpy,
		})
		provider.buildRecoveryPacket = ClineProvider.prototype["buildRecoveryPacket"]
		provider.taskRestartService = new TaskRestartService({
			getTaskWithId: (taskId: string) => provider.getTaskWithId(taskId),
			getState: () => provider.getState(),
			persistTaskStopState: (...args: any[]) => provider.persistTaskStopState(...args),
			showProblematicProcessNotification: (params: any) => provider.showProblematicProcessNotification(params),
			buildRecoveryPacket: (params: any) => provider.buildRecoveryPacket(params),
			updateTaskHistory: (item: any) => provider.updateTaskHistory(item),
			createTaskWithHistoryItem: (historyItem: any, options?: { startTask?: boolean }) =>
				provider.createTaskWithHistoryItem(historyItem, options),
			log: logSpy,
		})
		provider.restartTaskFromHistoryWithHandoff = ClineProvider.prototype["restartTaskFromHistoryWithHandoff"]
		return { logSpy }
	}

	it("restarts a problematic task with handoff when below restart limit", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-1",
			number: 1,
			ts: 1,
			task: "Fix the failing task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Task reached consecutive mistake limit (3).",
			restartCount: 0,
		}

		const submitUserMessage = vi.fn().mockResolvedValue(undefined)
		provider.getTaskWithId = vi.fn(async () => ({
			historyItem,
			apiConversationHistory: [
				{
					role: "user",
					content: [{ type: "text", text: "Inspect the failing branch and finish the bugfix." }],
				},
				{
					role: "assistant",
					content: [{ type: "text", text: "I kept retrying the same path and hit the mistake limit." }],
				},
			],
		}))
		provider.getState = vi.fn(async () => ({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 2,
		}))
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = vi.fn().mockResolvedValue({ submitUserMessage })
		attachRestartServices(provider)

		const result = await provider.restartTaskFromHistoryWithHandoff("task-1")

		expect(result).toBe(true)
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "active",
				restartCount: 1,
				restartSourceTaskId: "task-1",
			}),
		)
		expect(submitUserMessage).toHaveBeenCalledWith(expect.stringContaining("<restart_handoff>"))
		expect(submitUserMessage).toHaveBeenCalledWith(expect.stringContaining("loop_detected"))
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				lastStopSummary: expect.stringContaining("Recent user intent:"),
			}),
		)
	})

	it("stops restarting when restart limit is reached", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-2",
			number: 2,
			ts: 2,
			task: "Stuck task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Repeated problematic process.",
			restartCount: 2,
		}

		provider.getTaskWithId = vi.fn(async () => ({ historyItem, apiConversationHistory: [] }))
		provider.getState = vi.fn(async () => ({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 2,
		}))
		provider.persistTaskStopState = vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = vi.fn()
		provider.log = vi.fn()
		attachRestartServices(provider)

		const result = await provider.restartTaskFromHistoryWithHandoff("task-2")

		expect(result).toBe(false)
		expect(provider.persistTaskStopState).toHaveBeenCalledWith(
			"task-2",
			"restart_limit_exceeded",
			expect.stringContaining("restart limit (2) was reached"),
			"aborted",
		)
		expect(provider.createTaskWithHistoryItem).not.toHaveBeenCalled()
	})

	it("does not force manual restart to depend on auto-restart setting", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-3",
			number: 3,
			ts: 3,
			task: "Manual restart task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Stopped after a loop.",
			restartCount: 0,
		}

		const submitUserMessage = vi.fn().mockResolvedValue(undefined)
		provider.getTaskWithId = vi.fn(async () => ({ historyItem, apiConversationHistory: [] }))
		provider.getState = vi.fn(async () => ({
			autoRestartProblematicProcesses: false,
			problematicProcessRestartLimit: 2,
		}))
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = vi.fn().mockResolvedValue({ submitUserMessage })
		attachRestartServices(provider)

		const result = await provider.restartTaskFromHistoryWithHandoff("task-3", { force: true })

		expect(result).toBe(true)
		expect(provider.createTaskWithHistoryItem).toHaveBeenCalled()
		expect(submitUserMessage).toHaveBeenCalledWith(expect.stringContaining("<restart_handoff>"))
	})

	it("uses condensing profile for cheaper restart summary when available", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-4",
			number: 4,
			ts: 4,
			task: "Cheap summary task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Verbose previous summary.",
			restartCount: 0,
		}

		const submitUserMessage = vi.fn().mockResolvedValue(undefined)
		provider.getTaskWithId = vi.fn(async () => ({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Fix the flaky agent branch." }] },
				{ role: "assistant", content: [{ type: "text", text: "I repeated the same fix path twice." }] },
			],
		}))
		provider.getState = vi.fn(async () => ({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 2,
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "cheap-1",
			listApiConfigMeta: [{ id: "cheap-1", name: "Cheap helper" }],
		}))
		provider.providerSettingsManager = {
			getProfile: vi.fn().mockResolvedValue({ apiProvider: "fake-ai" }),
		}
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = vi.fn().mockResolvedValue({ submitUserMessage })
		attachRestartServices(provider)

		const fakeHandler = {
			createMessage: vi.fn(() => ({
				async *[Symbol.asyncIterator]() {
					yield { type: "text", text: "Cheap handoff summary" }
				},
			})),
		}

		const buildApiHandlerSpy = vi.spyOn(apiModule, "buildApiHandler").mockReturnValue(fakeHandler as any)

		const result = await provider.restartTaskFromHistoryWithHandoff("task-4")

		expect(result).toBe(true)
		expect(buildApiHandlerSpy).toHaveBeenCalled()
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ lastStopSummary: "Cheap handoff summary" }),
		)

		buildApiHandlerSpy.mockRestore()
	})

	it("falls back to heuristic restart summary when cheap summary fails", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-5",
			number: 5,
			ts: 5,
			task: "Fallback summary task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Original stop summary.",
			restartCount: 0,
		}

		provider.getState = vi.fn(async () => ({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "cheap-1",
			listApiConfigMeta: [{ id: "cheap-1", name: "Cheap helper" }],
		}))
		provider.providerSettingsManager = {
			getProfile: vi.fn().mockResolvedValue({ apiProvider: "fake-ai" }),
		}
		const { logSpy } = attachRestartServices(provider)
		const buildApiHandlerSpy = vi.spyOn(apiModule, "buildApiHandler").mockImplementation(() => {
			throw new Error("cheap profile failed")
		})

		const summary = await provider.taskRecoveryPacketService["maybeBuildCheapRestartSummary"]({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Retry safely" }] },
				{ role: "assistant", content: [{ type: "text", text: "Model looped on same path" }] },
			],
		})

		expect(summary).toContain("Original stop summary.")
		expect(summary).toContain("Recent user intent:")
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Falling back to heuristic summary"))

		buildApiHandlerSpy.mockRestore()
	})

	it("uses primary model for relay_compact when no helper route is selected", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-primary-relay",
			number: 55,
			ts: 55,
			task: "Primary relay summary task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Original stop summary.",
			restartCount: 0,
		}

		provider.getState = vi.fn(async () => ({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "",
			listApiConfigMeta: [],
		}))
		provider.providerSettingsManager = {
			getProfile: vi.fn(),
		}
		attachRestartServices(provider)
		const createMessage = vi.fn(() => ({
			async *[Symbol.asyncIterator]() {
				yield { type: "text", text: "Primary model compact summary" }
			},
		}))
		const buildApiHandlerSpy = vi.spyOn(apiModule, "buildApiHandler").mockReturnValue({ createMessage } as any)

		const summary = await provider.taskRecoveryPacketService["maybeBuildCheapRestartSummary"]({
			historyItem,
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Retry safely" }] }],
		})

		expect(summary).toBe("Primary model compact summary")
		expect(buildApiHandlerSpy).toHaveBeenCalledWith(expect.objectContaining({ apiProvider: "anthropic" }))

		buildApiHandlerSpy.mockRestore()
	})

	it("uses pressure recovery mode for repeated restart handoff", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-6",
			number: 6,
			ts: 6,
			task: "Pressure restart task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "The branch looped on the same broken patch and exceeded safety budget.",
			restartCount: 2,
		}

		provider.getState = vi.fn(async () => ({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "",
			listApiConfigMeta: [],
		}))
		attachRestartServices(provider)
		vi.spyOn(apiModule, "buildApiHandler").mockImplementation(() => {
			throw new Error("skip helper")
		})

		const packet = await provider.buildRecoveryPacket({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Retry with a minimal safe fix." }] },
				{
					role: "assistant",
					content: [{ type: "text", text: "I retried the same patch path multiple times." }],
				},
			],
			useCache: false,
		})

		expect(packet.summary).toContain("Recovery mode: compact retry")
		expect(packet.summary.length).toBeLessThanOrEqual(700)
		expect(packet.handoff).toContain("Recovery mode: pressure")
		expect(packet.handoff).toContain("smallest viable context")
		vi.restoreAllMocks()
	})

	it("passes pressure recovery mode into cheap restart summary generation", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-7",
			number: 7,
			ts: 7,
			task: "Pressure summary task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Verbose stop summary.",
			restartCount: 2,
		}

		const submitUserMessage = vi.fn().mockResolvedValue(undefined)
		provider.getTaskWithId = vi.fn(async () => ({
			historyItem,
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Recover safely." }] }],
		}))
		provider.getState = vi.fn(async () => ({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 4,
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "",
			listApiConfigMeta: [],
		}))
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined)
		provider.createTaskWithHistoryItem = vi.fn().mockResolvedValue({ submitUserMessage })
		attachRestartServices(provider)

		const buildRecoveryPacketSpy = vi.spyOn(provider.taskRecoveryPacketService, "buildRecoveryPacket")
		vi.spyOn(apiModule, "buildApiHandler").mockImplementation(() => {
			throw new Error("skip helper")
		})

		const result = await provider.restartTaskFromHistoryWithHandoff("task-7")

		expect(result).toBe(true)
		expect(buildRecoveryPacketSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				historyItem,
				apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Recover safely." }] }],
			}),
		)
		expect(submitUserMessage).toHaveBeenCalledWith(expect.stringContaining("Recovery mode: pressure"))
		vi.restoreAllMocks()
	})

	it("deduplicates and truncates recent history before cheap recovery summarization", () => {
		const provider = Object.create(ClineProvider.prototype) as any
		attachRestartServices(provider)

		const repeated = "Repeated branch output ".repeat(60)
		const summary = provider.taskRecoveryPacketService["buildRecoveryHistorySummary"](
			[
				{ role: "user", content: [{ type: "text", text: repeated }] },
				{ role: "user", content: [{ type: "text", text: repeated }] },
				{ role: "assistant", content: [{ type: "text", text: "Need a safe next step." }] },
			],
			"pressure",
		)

		expect(summary.match(/user:/g)?.length ?? 0).toBe(1)
		expect(summary).toContain("assistant: Need a safe next step.")
		expect(summary.length).toBeLessThanOrEqual(600)
	})

	it("requests ultra-compact helper summary under pressure mode", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-8",
			number: 8,
			ts: 8,
			task: "Ultra compact task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Original stop summary.",
			restartCount: 3,
		}

		provider.getState = vi.fn(async () => ({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "cheap-1",
			listApiConfigMeta: [{ id: "cheap-1", name: "Cheap helper" }],
		}))
		provider.providerSettingsManager = {
			getProfile: vi.fn().mockResolvedValue({ apiProvider: "fake-ai" }),
		}
		attachRestartServices(provider)

		const createMessage = vi.fn(() => ({
			async *[Symbol.asyncIterator]() {
				yield { type: "text", text: "A very small retry summary" }
			},
		}))
		const buildApiHandlerSpy = vi.spyOn(apiModule, "buildApiHandler").mockReturnValue({ createMessage } as any)

		const summary = await provider.taskRecoveryPacketService["maybeBuildCheapRestartSummary"]({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Retry with minimal context." }] },
			],
			recoveryMode: "pressure",
		})

		expect(summary).toBe("A very small retry summary")
		expect(createMessage).toHaveBeenCalledWith(
			expect.stringContaining("ultra-compact restart handoff summary"),
			expect.anything(),
		)

		buildApiHandlerSpy.mockRestore()
	})

	it("falls back to pressure heuristic summary when helper fails", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-9",
			number: 9,
			ts: 9,
			task: "Pressure fallback task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Original stop summary.",
			restartCount: 4,
		}

		provider.getState = vi.fn(async () => ({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "cheap-1",
			listApiConfigMeta: [{ id: "cheap-1", name: "Cheap helper" }],
		}))
		provider.providerSettingsManager = {
			getProfile: vi.fn().mockResolvedValue({ apiProvider: "fake-ai" }),
		}
		const { logSpy } = attachRestartServices(provider)
		const buildApiHandlerSpy = vi.spyOn(apiModule, "buildApiHandler").mockImplementation(() => {
			throw new Error("cheap profile failed")
		})

		const summary = await provider.taskRecoveryPacketService["maybeBuildCheapRestartSummary"]({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Retry safely with tiny context." }] },
				{ role: "assistant", content: [{ type: "text", text: "Looped again." }] },
			],
			recoveryMode: "pressure",
		})

		expect(summary).toContain("Recovery mode: compact retry")
		expect(summary.length).toBeLessThanOrEqual(700)
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Falling back to heuristic summary"))

		buildApiHandlerSpy.mockRestore()
	})

	it("caches recovery packet summaries for identical restart context", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		const historyItem: HistoryItem = {
			id: "task-cache",
			number: 10,
			ts: 10,
			task: "Cache task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			lastStopReason: "loop_detected",
			lastStopSummary: "Original stop summary.",
			restartCount: 1,
		}

		attachRestartServices(provider)
		const maybeBuildCheapRestartSummarySpy = vi.spyOn(
			provider.taskRecoveryPacketService as any,
			"maybeBuildCheapRestartSummary",
		)
		maybeBuildCheapRestartSummarySpy.mockResolvedValue("Cached compact summary")

		const first = await provider.buildRecoveryPacket({
			historyItem,
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Retry safely" }] }],
		})
		const second = await provider.buildRecoveryPacket({
			historyItem,
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Retry safely" }] }],
		})

		expect(first.summary).toBe("Cached compact summary")
		expect(second.handoff).toBe(first.handoff)
		expect(maybeBuildCheapRestartSummarySpy).toHaveBeenCalledTimes(1)
	})

	it("keeps provider buildRecoveryPacket as a thin facade to the recovery packet service", async () => {
		const provider = {
			taskRecoveryPacketService: {
				buildRecoveryPacket: vi.fn().mockResolvedValue({
					summary: "Summary",
					handoff: "Handoff",
					recoveryMode: "standard",
					restartAttempt: 1,
				}),
			},
		} as any

		const params = {
			historyItem: {
				id: "facade-task",
				number: 11,
				ts: 11,
				task: "Facade task",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "aborted",
			} as HistoryItem,
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: "Retry safely" }] }],
			useCache: false,
		}

		const result = await (ClineProvider.prototype as any).buildRecoveryPacket.call(provider, params)

		expect(result).toEqual({
			summary: "Summary",
			handoff: "Handoff",
			recoveryMode: "standard",
			restartAttempt: 1,
		})
		expect(provider.taskRecoveryPacketService.buildRecoveryPacket).toHaveBeenCalledWith(params)
	})
})
