import { describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { AgentManagerRuntimeCallbackCoordinator } from "../AgentManagerRuntimeCallbackCoordinator"
import type { ClineMessage } from "@roo-code/types"

function createMessage(ts: number, text: string): ClineMessage {
	return {
		ts,
		type: "say",
		say: "text",
		text,
		partial: false,
	} as ClineMessage
}

describe("AgentManagerRuntimeCallbackCoordinator", () => {
	it("merges runtime chat messages by timestamp, updates duplicates, and posts merged history", () => {
		const registry = new AgentRegistry()
		const sessionMessages = new Map<string, ClineMessage[]>([
			["session-1", [createMessage(2, "second"), createMessage(1, "first")]],
		])
		const postChatMessages = vi.fn()
		const coordinator = new AgentManagerRuntimeCallbackCoordinator({
			log: vi.fn(),
			registry,
			sessionMessages,
			firstApiReqStarted: new Map(),
			processStartTimes: new Map(),
			sendingMessageMap: new Map(),
			lastPostedChatMessages: new Map(),
			postMessage: vi.fn(),
			postChatMessages,
			postStateToWebview: vi.fn(),
			publishGroupEvent: vi.fn(),
			trackSessionStarted: vi.fn(),
			renameBackgroundSessionBinding: vi.fn(),
			handleWorktreeSessionCreated: vi.fn(),
		})

		coordinator
			.createCallbacks()
			.onChatMessages("session-1", [createMessage(2, "second updated"), createMessage(3, "third")])

		expect(sessionMessages.get("session-1")).toEqual([
			expect.objectContaining({ ts: 1, text: "first" }),
			expect.objectContaining({ ts: 2, text: "second updated" }),
			expect.objectContaining({ ts: 3, text: "third" }),
		])
		expect(postChatMessages).toHaveBeenCalledWith("session-1", [
			expect.objectContaining({ ts: 1, text: "first" }),
			expect.objectContaining({ ts: 2, text: "second updated" }),
			expect.objectContaining({ ts: 3, text: "third" }),
		])
	})

	it("hydrates resumed sessions on runtime session created and preserves first api request state", () => {
		const registry = new AgentRegistry()
		registry.createSession("session-1", "Prompt", 100, {
			parallelMode: true,
			sessionGroup: { groupId: "group-1", rootSessionId: "root-1", label: "Worker A" },
		})
		const sessionMessages = new Map<string, ClineMessage[]>([["session-1", [createMessage(10, "resume history")]]])
		const firstApiReqStarted = new Map<string, boolean>()
		const postChatMessages = vi.fn()
		const trackSessionStarted = vi.fn()
		const publishGroupEvent = vi.fn()
		const log = vi.fn()
		const coordinator = new AgentManagerRuntimeCallbackCoordinator({
			log,
			registry,
			sessionMessages,
			firstApiReqStarted,
			processStartTimes: new Map(),
			sendingMessageMap: new Map(),
			lastPostedChatMessages: new Map(),
			postMessage: vi.fn(),
			postChatMessages,
			postStateToWebview: vi.fn(),
			publishGroupEvent,
			trackSessionStarted,
			renameBackgroundSessionBinding: vi.fn(),
			handleWorktreeSessionCreated: vi.fn(),
		})

		coordinator.createCallbacks().onSessionCreated(false, { prompt: "resume prompt" })

		expect(log).toHaveBeenCalledWith(
			"[AgentManager] onSessionCreated: sessionId=session-1, existingMessages=1, isResumed=true, hasResumeInfo=true",
		)
		expect(postChatMessages).toHaveBeenCalledWith(
			"session-1",
			[expect.objectContaining({ ts: 10, text: "resume history" })],
			{ force: true },
		)
		expect(firstApiReqStarted.get("session-1")).toBe(true)
		expect(trackSessionStarted).toHaveBeenCalledWith("session-1", true)
		expect(publishGroupEvent).toHaveBeenCalledWith("group-1", "session-1", "running", "Prompt")
	})

	it("renames runtime session-owned maps, invalidates posted cache, and rebinds background bindings", () => {
		const registry = new AgentRegistry()
		const sessionMessages = new Map<string, ClineMessage[]>([["old-session", [createMessage(1, "hello")]]])
		const firstApiReqStarted = new Map<string, boolean>([["old-session", true]])
		const processStartTimes = new Map<string, number>([["old-session", 123]])
		const sendingMessageMap = new Map<string, string>([["old-session", "message-1"]])
		const lastPostedChatMessages = new Map<string, string>([
			["old-session", "stale-old"],
			["new-session", "stale-new"],
		])
		const postChatMessages = vi.fn()
		const renameBackgroundSessionBinding = vi.fn()
		const log = vi.fn()
		const coordinator = new AgentManagerRuntimeCallbackCoordinator({
			log,
			registry,
			sessionMessages,
			firstApiReqStarted,
			processStartTimes,
			sendingMessageMap,
			lastPostedChatMessages,
			postMessage: vi.fn(),
			postChatMessages,
			postStateToWebview: vi.fn(),
			publishGroupEvent: vi.fn(),
			trackSessionStarted: vi.fn(),
			renameBackgroundSessionBinding,
			handleWorktreeSessionCreated: vi.fn(),
		})

		coordinator.createCallbacks().onSessionRenamed?.("old-session", "new-session")

		expect(log).toHaveBeenCalledWith("[AgentManager] Renaming session: old-session -> new-session")
		expect(sessionMessages.has("old-session")).toBe(false)
		expect(sessionMessages.get("new-session")).toEqual([expect.objectContaining({ text: "hello" })])
		expect(firstApiReqStarted.has("old-session")).toBe(false)
		expect(firstApiReqStarted.get("new-session")).toBe(true)
		expect(processStartTimes.has("old-session")).toBe(false)
		expect(processStartTimes.get("new-session")).toBe(123)
		expect(sendingMessageMap.has("old-session")).toBe(false)
		expect(sendingMessageMap.get("new-session")).toBe("message-1")
		expect(lastPostedChatMessages.has("old-session")).toBe(false)
		expect(lastPostedChatMessages.has("new-session")).toBe(false)
		expect(postChatMessages).toHaveBeenCalledWith("new-session", [expect.objectContaining({ text: "hello" })], {
			force: true,
		})
		expect(renameBackgroundSessionBinding).toHaveBeenCalledWith("old-session", "new-session")
	})

	it("updates registry mode and posts webview sync events when runtime mode changes", () => {
		const registry = new AgentRegistry()
		registry.createSession("session-1", "Prompt", 100, { mode: "code" })
		const postMessage = vi.fn()
		const postStateToWebview = vi.fn()
		const log = vi.fn()
		const coordinator = new AgentManagerRuntimeCallbackCoordinator({
			log,
			registry,
			sessionMessages: new Map(),
			firstApiReqStarted: new Map(),
			processStartTimes: new Map(),
			sendingMessageMap: new Map(),
			lastPostedChatMessages: new Map(),
			postMessage,
			postChatMessages: vi.fn(),
			postStateToWebview,
			publishGroupEvent: vi.fn(),
			trackSessionStarted: vi.fn(),
			renameBackgroundSessionBinding: vi.fn(),
			handleWorktreeSessionCreated: vi.fn(),
		})

		coordinator.createCallbacks().onModeChanged?.("session-1", "architect", "code")

		expect(log).toHaveBeenCalledWith("[AgentManager] Mode changed for session session-1: code -> architect")
		expect(registry.getSession("session-1")?.mode).toBe("architect")
		expect(postMessage).toHaveBeenCalledWith({
			type: "agentManager.modeChanged",
			sessionId: "session-1",
			mode: "architect",
			previousMode: "code",
		})
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("posts pending session changes and delegates worktree session creation", () => {
		const postMessage = vi.fn()
		const handleWorktreeSessionCreated = vi.fn()
		const coordinator = new AgentManagerRuntimeCallbackCoordinator({
			log: vi.fn(),
			registry: new AgentRegistry(),
			sessionMessages: new Map(),
			firstApiReqStarted: new Map(),
			processStartTimes: new Map(),
			sendingMessageMap: new Map(),
			lastPostedChatMessages: new Map(),
			postMessage,
			postChatMessages: vi.fn(),
			postStateToWebview: vi.fn(),
			publishGroupEvent: vi.fn(),
			trackSessionStarted: vi.fn(),
			renameBackgroundSessionBinding: vi.fn(),
			handleWorktreeSessionCreated,
		})
		const callbacks = coordinator.createCallbacks()

		callbacks.onPendingSessionChanged({ prompt: "Prompt", label: "Prompt", startTime: 123 })
		callbacks.onWorktreeSessionCreated?.("session-1", "/tmp/worktree")

		expect(postMessage).toHaveBeenCalledWith({
			type: "agentManager.pendingSession",
			pendingSession: { prompt: "Prompt", label: "Prompt", startTime: 123 },
		})
		expect(handleWorktreeSessionCreated).toHaveBeenCalledWith("session-1", "/tmp/worktree")
	})
})
