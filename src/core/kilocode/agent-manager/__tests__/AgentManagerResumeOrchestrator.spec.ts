import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SessionData } from "../RemoteSessionService"
import { AgentManagerResumeOrchestrator } from "../AgentManagerResumeOrchestrator"
import type { AgentSession } from "../types"

function createSession(overrides?: Partial<AgentSession>): AgentSession {
	return {
		sessionId: "session-1",
		label: "Saved label",
		prompt: "Saved prompt",
		status: "done",
		startTime: Date.now(),
		logs: [],
		source: "local",
		mode: "code",
		...overrides,
	}
}

function createSessionData(overrides?: Partial<SessionData>): SessionData {
	return {
		uiMessages: [{ ts: 1, type: "say", say: "text", text: "hello", partial: false } as any],
		apiConversationHistory: [{ role: "user", content: "hello" } as any],
		metadata: {
			sessionId: "session-1",
			title: "Saved task",
			createdAt: "2026-01-01T00:00:00.000Z",
			mode: "architect",
		},
		...overrides,
	}
}

describe("AgentManagerResumeOrchestrator", () => {
	const log = vi.fn()
	const hasRunningRuntime = vi.fn()
	const getCachedSessionData = vi.fn()
	const cacheSessionData = vi.fn()
	const fetchSessionDataForResume = vi.fn()
	const createWorktree = vi.fn()
	const updateSessionParallelMode = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		hasRunningRuntime.mockReturnValue(false)
		getCachedSessionData.mockReturnValue(undefined)
		fetchSessionDataForResume.mockResolvedValue(null)
		createWorktree.mockResolvedValue({
			branch: "feature/resume",
			path: "/tmp/recreated-worktree",
			parentBranch: "main",
		})
	})

	function createOrchestrator(isReusableWorktree?: (worktreePath: string) => boolean) {
		return new AgentManagerResumeOrchestrator({
			hasRunningRuntime,
			getCachedSessionData,
			cacheSessionData,
			fetchSessionDataForResume,
			createWorktree,
			updateSessionParallelMode,
			isReusableWorktree,
			log,
		})
	}

	it("returns send-message plan when runtime is still alive", async () => {
		hasRunningRuntime.mockReturnValue(true)
		const orchestrator = createOrchestrator()

		const plan = await orchestrator.planResumeSession({
			sessionId: "session-1",
			content: "Resume work",
			session: createSession(),
		})

		expect(plan).toEqual({ kind: "send-message" })
		expect(fetchSessionDataForResume).not.toHaveBeenCalled()
		expect(createWorktree).not.toHaveBeenCalled()
	})

	it("uses cached resume data and reuses an existing parallel worktree", async () => {
		const cachedData = createSessionData()
		getCachedSessionData.mockReturnValue(cachedData)
		const orchestrator = createOrchestrator((worktreePath) => worktreePath === "/tmp/existing-worktree")

		const plan = await orchestrator.planResumeSession({
			sessionId: "session-1",
			content: "Resume work",
			images: ["base64-image"],
			session: createSession({
				gitUrl: "https://example.test/repo.git",
				model: "gpt-5",
				mode: "code",
				parallelMode: {
					enabled: true,
					branch: "feature/resume",
					worktreePath: "/tmp/existing-worktree",
					parentBranch: "develop",
				},
			}),
		})

		expect(fetchSessionDataForResume).not.toHaveBeenCalled()
		expect(cacheSessionData).toHaveBeenCalledWith("session-1", cachedData)
		expect(plan).toEqual({
			kind: "spawn",
			prompt: "Resume work",
			spawnOptions: {
				sessionId: "session-1",
				parallelMode: true,
				gitUrl: "https://example.test/repo.git",
				worktreeInfo: {
					branch: "feature/resume",
					path: "/tmp/existing-worktree",
					parentBranch: "develop",
				},
				effectiveWorkspace: "/tmp/existing-worktree",
				images: ["base64-image"],
				sessionData: cachedData,
				model: "gpt-5",
				mode: "architect",
			},
		})
		expect(log).toHaveBeenCalledWith(
			"[AgentManager] Fetched session data: 1 UI messages, 1 API history entries (cache)",
		)
		expect(log).toHaveBeenCalledWith("[AgentManager] Reusing existing worktree at: /tmp/existing-worktree")
		expect(updateSessionParallelMode).not.toHaveBeenCalled()
	})

	it("fetches remote resume data, recreates missing worktree, and normalizes parallel spawn options", async () => {
		const fetchedData = createSessionData({
			metadata: {
				sessionId: "session-1",
				title: "Saved task",
				createdAt: "2026-01-01T00:00:00.000Z",
				mode: "debug",
			},
		})
		fetchSessionDataForResume.mockResolvedValue(fetchedData)
		const orchestrator = createOrchestrator(() => false)

		const plan = await orchestrator.planResumeSession({
			sessionId: "session-1",
			content: "Resume branch task",
			session: createSession({
				parallelMode: {
					enabled: true,
					branch: "feature/resume",
					worktreePath: "/tmp/missing-worktree",
					parentBranch: "main",
				},
			}),
		})

		expect(fetchSessionDataForResume).toHaveBeenCalledWith("session-1")
		expect(cacheSessionData).toHaveBeenCalledWith("session-1", fetchedData)
		expect(createWorktree).toHaveBeenCalledWith({ existingBranch: "feature/resume" })
		expect(updateSessionParallelMode).toHaveBeenCalledWith("session-1", {
			worktreePath: "/tmp/recreated-worktree",
		})
		expect(plan).toEqual({
			kind: "spawn",
			prompt: "Resume branch task",
			spawnOptions: {
				sessionId: "session-1",
				parallelMode: true,
				gitUrl: undefined,
				worktreeInfo: {
					branch: "feature/resume",
					path: "/tmp/recreated-worktree",
					parentBranch: "main",
				},
				effectiveWorkspace: "/tmp/recreated-worktree",
				images: undefined,
				sessionData: fetchedData,
				model: undefined,
				mode: "debug",
			},
		})
	})

	it("falls back to non-worktree spawn when parallel recovery fails", async () => {
		fetchSessionDataForResume.mockRejectedValue(new Error("network down"))
		createWorktree.mockRejectedValue(new Error("branch missing"))
		const orchestrator = createOrchestrator(() => false)

		const plan = await orchestrator.planResumeSession({
			sessionId: "session-1",
			content: "Resume after failure",
			sessionLabel: "Manual label",
			session: createSession({
				mode: "code",
				parallelMode: {
					enabled: true,
					branch: "feature/resume",
				},
			}),
		})

		expect(plan).toEqual({
			kind: "spawn",
			prompt: "Resume after failure",
			spawnOptions: {
				sessionId: "session-1",
				label: "Manual label",
				parallelMode: true,
				gitUrl: undefined,
				images: undefined,
				sessionData: undefined,
				model: undefined,
				mode: "code",
			},
		})
		expect(log).toHaveBeenCalledWith("[AgentManager] Failed to fetch session data for resume: network down")
		expect(log).toHaveBeenCalledWith("[AgentManager] Failed to recreate worktree: branch missing")
		expect(log).toHaveBeenCalledWith("[AgentManager] Failed to prepare worktree, resuming without parallel mode")
	})

	it("returns queued plan when session is already creating", async () => {
		const orchestrator = createOrchestrator()

		const plan = await orchestrator.planResumeSession({
			sessionId: "session-1",
			content: "Resume work",
			session: createSession({ status: "creating" }),
		})

		expect(plan).toEqual({ kind: "queued" })
		expect(fetchSessionDataForResume).not.toHaveBeenCalled()
		expect(log).toHaveBeenCalledWith(
			"[AgentManager] Session session-1 is already starting, queueing message for later",
		)
	})
})
