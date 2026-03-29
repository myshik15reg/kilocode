// kilocode_change - new file
import { describe, expect, it, vi } from "vitest"
import {
	BackgroundSubagentEventBridge,
	type BackgroundSubagentCompletionOutcome,
} from "../BackgroundSubagentEventBridge"

describe("BackgroundSubagentEventBridge", () => {
	it("passes listener registration and launch announcements through the delegated seam", () => {
		const unsubscribeStatus = vi.fn()
		const unsubscribeResult = vi.fn()
		const onStatus = vi.fn(() => unsubscribeStatus)
		const onResult = vi.fn(() => unsubscribeResult)
		const announceLaunch = vi.fn()
		const handleSessionCompleted = vi.fn<
			(sessionId: string, exitCode: number) => BackgroundSubagentCompletionOutcome
		>(() => ({ isSuccess: true, terminalStatus: "completed" }))
		const bridge = new BackgroundSubagentEventBridge({
			onStatus,
			onResult,
			announceLaunch,
			handleSessionCompleted,
			postWebviewMessage: vi.fn(),
		})
		const statusListener = vi.fn()
		const resultListener = vi.fn()

		const disposeStatus = bridge.onStatus(statusListener)
		const disposeResult = bridge.onResult(resultListener)
		bridge.announceLaunch("child-1", true)
		disposeStatus()
		disposeResult()

		expect(onStatus).toHaveBeenCalledWith(statusListener)
		expect(onResult).toHaveBeenCalledWith(resultListener)
		expect(announceLaunch).toHaveBeenCalledWith("child-1", true)
		expect(unsubscribeStatus).toHaveBeenCalledTimes(1)
		expect(unsubscribeResult).toHaveBeenCalledTimes(1)
	})

	it("posts completion state events only for successful delegated completions", () => {
		const handleSessionCompleted = vi
			.fn<(sessionId: string, exitCode: number) => BackgroundSubagentCompletionOutcome>()
			.mockReturnValueOnce({ isSuccess: true, terminalStatus: "completed" })
			.mockReturnValueOnce({ isSuccess: false, terminalStatus: "failed" })
		const postWebviewMessage = vi.fn()
		const bridge = new BackgroundSubagentEventBridge({
			onStatus: vi.fn(),
			onResult: vi.fn(),
			announceLaunch: vi.fn(),
			handleSessionCompleted,
			postWebviewMessage,
		})

		expect(bridge.handleSessionCompleted("child-success", 0)).toEqual({
			isSuccess: true,
			terminalStatus: "completed",
		})
		expect(bridge.handleSessionCompleted("child-failed", null)).toEqual({
			isSuccess: false,
			terminalStatus: "failed",
		})
		expect(handleSessionCompleted).toHaveBeenNthCalledWith(1, "child-success", 0)
		expect(handleSessionCompleted).toHaveBeenNthCalledWith(2, "child-failed", 1)
		expect(postWebviewMessage).toHaveBeenCalledTimes(1)
		expect(postWebviewMessage).toHaveBeenCalledWith({
			type: "agentManager.stateEvent",
			sessionId: "child-success",
			eventType: "ask_completion_result",
		})
	})
})
