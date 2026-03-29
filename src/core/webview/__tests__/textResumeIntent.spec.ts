// kilocode_change - new file
import { buildPausedTasksSelectionMessage, tryHandleTextResumeIntent } from "../textResumeIntent"

describe("text resume intent", () => {
	it("prompts to choose when several tasks are paused", async () => {
		const postMessageToWebview = vi.fn().mockResolvedValue(undefined)
		const handled = await tryHandleTextResumeIntent(
			{
				getTaskHistory: () => [
					{
						id: "task-1",
						number: 1,
						task: "First",
						ts: 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						lifecycleState: "paused",
					},
					{
						id: "task-2",
						number: 2,
						task: "Second",
						ts: 2,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						lifecycleState: "paused",
					},
				],
				postMessageToWebview,
				resumeTask: vi.fn(),
				getCurrentTask: () => undefined,
				log: vi.fn(),
			},
			"resume",
		)

		expect(handled).toBe(true)
		expect(postMessageToWebview).toHaveBeenCalledWith({
			type: "invoke",
			invoke: "setChatBoxMessage",
			text: buildPausedTasksSelectionMessage([
				{
					id: "task-2",
					number: 2,
					task: "Second",
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					lifecycleState: "paused",
				},
				{
					id: "task-1",
					number: 1,
					task: "First",
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					lifecycleState: "paused",
				},
			]),
		})
	})

	it("resumes the single paused task and confirms the ask", async () => {
		let currentTask: any
		const handleWebviewAskResponse = vi.fn()
		const resumeTask = vi.fn((taskId: string) => {
			currentTask = { taskId, handleWebviewAskResponse }
		})

		const handled = await tryHandleTextResumeIntent(
			{
				getTaskHistory: () => [
					{
						id: "task-1",
						number: 1,
						task: "Only paused task",
						ts: 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						lifecycleState: "paused",
					},
				],
				postMessageToWebview: vi.fn().mockResolvedValue(undefined),
				resumeTask,
				getCurrentTask: () => currentTask,
				log: vi.fn(),
			},
			"continue",
		)

		expect(handled).toBe(true)
		expect(resumeTask).toHaveBeenCalledWith("task-1", "continue")
		expect(handleWebviewAskResponse).toHaveBeenCalledWith("yesButtonClicked")
	})

	it("logs and still handles resume intent when confirmation never binds to the resumed task", async () => {
		const log = vi.fn()
		const resumeTask = vi.fn()

		const handled = await tryHandleTextResumeIntent(
			{
				getTaskHistory: () => [
					{
						id: "task-timeout",
						number: 1,
						task: "Slow paused task",
						ts: 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						lifecycleState: "paused",
					},
				],
				postMessageToWebview: vi.fn().mockResolvedValue(undefined),
				resumeTask,
				getCurrentTask: () => undefined,
				log,
			},
			"resume",
		)

		expect(handled).toBe(true)
		expect(resumeTask).toHaveBeenCalledWith("task-timeout", "continue")
		expect(log).toHaveBeenCalledWith(expect.stringContaining("Failed to confirm resume for task-timeout"))
	})
})
