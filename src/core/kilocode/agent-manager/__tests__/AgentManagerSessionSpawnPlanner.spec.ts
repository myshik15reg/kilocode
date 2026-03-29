import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ModeConfig, ProviderSettings } from "@roo-code/types"
import { AgentManagerSessionSpawnPlanner, type SessionSpawnWorktreeInfo } from "../AgentManagerSessionSpawnPlanner"

describe("AgentManagerSessionSpawnPlanner", () => {
	const getWorkspaceFolder = vi.fn<() => string | undefined>()
	const resolveGitUrl = vi.fn<(workspaceFolder: string) => Promise<string | undefined>>()
	const rememberCurrentGitUrl = vi.fn<(gitUrl: string) => void>()
	const prepareWorktreeForSession =
		vi.fn<(prompt: string, existingBranch?: string) => Promise<SessionSpawnWorktreeInfo | undefined>>()
	const runSetupScriptForWorktree = vi.fn<(worktreePath: string) => Promise<void>>()
	const getApiConfigurationForCli = vi.fn<(helperProfile?: string) => Promise<ProviderSettings | undefined>>()
	const getCustomModes = vi.fn<() => Promise<ModeConfig[]>>()
	const log = vi.fn<(message: string) => void>()

	beforeEach(() => {
		vi.clearAllMocks()
		getWorkspaceFolder.mockReturnValue("/tmp/workspace")
		resolveGitUrl.mockResolvedValue("https://example.test/repo.git")
		prepareWorktreeForSession.mockResolvedValue({
			branch: "feature/test",
			path: "/tmp/workspace/.kilocode/worktrees/feature-test",
			parentBranch: "main",
		})
		runSetupScriptForWorktree.mockResolvedValue(undefined)
		getApiConfigurationForCli.mockResolvedValue({
			apiProvider: "kilocode",
			kilocodeToken: "token",
		} as ProviderSettings)
		getCustomModes.mockResolvedValue([
			{ slug: "architect", name: "Architect", roleDefinition: "Plan", groups: ["read"] } as ModeConfig,
		])
	})

	function createPlanner() {
		return new AgentManagerSessionSpawnPlanner({
			getWorkspaceFolder,
			resolveGitUrl,
			rememberCurrentGitUrl,
			prepareWorktreeForSession,
			runSetupScriptForWorktree,
			getApiConfigurationForCli,
			getCustomModes,
			log,
		})
	}

	it("builds a normalized start plan with git, session-group, and spawn config", async () => {
		const planner = createPlanner()

		const plan = await planner.planStartSession({
			prompt: "Implement feature",
			options: {
				labelOverride: "Worker A",
				sessionId: "session-1",
				model: "gpt-5",
				mode: "architect",
				helperProfile: "helper-a",
				images: ["img-1"],
				sessionGroup: {
					groupId: "group-1",
					rootSessionId: "root-1",
					label: "Swarm",
					sessionIndex: 0,
					sessionCount: 2,
				},
			},
		})

		expect(plan.kind).toBe("spawn")
		if (plan.kind !== "spawn") {
			throw new Error("Expected spawn plan")
		}
		expect(resolveGitUrl).toHaveBeenCalledWith("/tmp/workspace")
		expect(rememberCurrentGitUrl).toHaveBeenCalledWith("https://example.test/repo.git")
		expect(plan.groupEvent).toEqual({
			groupId: "group-1",
			sessionId: "session-1",
			label: "Worker A",
		})
		expect(plan.spawnPlan.workspace).toBe("/tmp/workspace")
		expect(plan.spawnPlan.prompt).toBe("Implement feature")
		expect(plan.spawnPlan.processStartTime).toEqual(expect.any(Number))
		expect(plan.spawnPlan.spawnOptions).toEqual({
			parallelMode: undefined,
			label: "Worker A",
			gitUrl: "https://example.test/repo.git",
			sessionId: "session-1",
			existingBranch: undefined,
			worktreeInfo: undefined,
			effectiveWorkspace: "/tmp/workspace",
			model: "gpt-5",
			mode: "architect",
			helperProfile: "helper-a",
			images: ["img-1"],
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "root-1",
				label: "Swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
			apiConfiguration: { apiProvider: "kilocode", kilocodeToken: "token" },
			customModes: [{ slug: "architect", name: "Architect", roleDefinition: "Plan", groups: ["read"] }],
		})
		expect(log).toHaveBeenCalledWith("[AgentManager] Fetched 1 custom modes for agent process: [architect(local)]")
		expect(log).toHaveBeenCalledWith("[AgentManager] Requested mode for session: architect (default)")
	})

	it("prepares worktrees and setup scripts only for fresh parallel starts", async () => {
		const planner = createPlanner()

		const plan = await planner.planStartSession({
			prompt: "Implement in parallel",
			options: {
				parallelMode: true,
				sessionId: "parallel-1",
			},
		})

		expect(plan.kind).toBe("spawn")
		expect(prepareWorktreeForSession).toHaveBeenCalledWith("Implement in parallel", undefined)
		expect(runSetupScriptForWorktree).toHaveBeenCalledWith("/tmp/workspace/.kilocode/worktrees/feature-test")
		if (plan.kind !== "spawn") {
			throw new Error("Expected spawn plan")
		}
		expect(plan.spawnPlan.workspace).toBe("/tmp/workspace/.kilocode/worktrees/feature-test")
		expect(plan.spawnPlan.spawnOptions.worktreeInfo).toEqual({
			branch: "feature/test",
			path: "/tmp/workspace/.kilocode/worktrees/feature-test",
			parentBranch: "main",
		})
	})

	it("skips setup script for existing worktree resumes", async () => {
		const planner = createPlanner()

		const plan = await planner.planStartSession({
			prompt: "Resume branch",
			options: {
				parallelMode: true,
				existingBranch: "feature/existing",
			},
		})

		expect(plan.kind).toBe("spawn")
		expect(prepareWorktreeForSession).toHaveBeenCalledWith("Resume branch", "feature/existing")
		expect(runSetupScriptForWorktree).not.toHaveBeenCalled()
	})

	it("returns a failed plan when worktree setup fails", async () => {
		prepareWorktreeForSession.mockResolvedValue(undefined)
		const planner = createPlanner()

		const plan = await planner.planStartSession({
			prompt: "Broken parallel start",
			options: { parallelMode: true },
		})

		expect(plan).toEqual({ kind: "failed", reason: "setup-failed" })
		expect(runSetupScriptForWorktree).not.toHaveBeenCalled()
	})

	it("returns undefined normalized spawn plan when no workspace exists", async () => {
		getWorkspaceFolder.mockReturnValue(undefined)
		const planner = createPlanner()

		const plan = await planner.buildNormalizedSpawnPlan({
			prompt: "Resume without workspace",
			options: { sessionId: "resume-1" },
		})

		expect(plan).toBeUndefined()
		expect(log).toHaveBeenCalledWith("ERROR: No workspace folder open")
	})

	it("logs and tolerates provider-config and custom-mode lookup failures", async () => {
		getApiConfigurationForCli.mockRejectedValue(new Error("profile missing"))
		getCustomModes.mockRejectedValue(new Error("mode registry unavailable"))
		const planner = createPlanner()

		const plan = await planner.buildNormalizedSpawnPlan({
			prompt: "Fallback start",
			options: {
				helperProfile: "missing",
				mode: "debug",
			},
		})

		expect(plan).toEqual({
			prompt: "Fallback start",
			workspace: "/tmp/workspace",
			processStartTime: expect.any(Number),
			spawnOptions: {
				helperProfile: "missing",
				mode: "debug",
				apiConfiguration: undefined,
				customModes: undefined,
			},
		})
		expect(log).toHaveBeenCalledWith("[AgentManager] Failed to read provider settings: profile missing")
		expect(log).toHaveBeenCalledWith("[AgentManager] Failed to fetch custom modes: mode registry unavailable")
	})

	it("logs and tolerates git-url lookup failures while preserving spawn planning", async () => {
		resolveGitUrl.mockRejectedValue(new Error("no remote"))
		const planner = createPlanner()

		const plan = await planner.planStartSession({
			prompt: "No remote repo",
		})

		expect(plan.kind).toBe("spawn")
		expect(rememberCurrentGitUrl).not.toHaveBeenCalled()
		expect(log).toHaveBeenCalledWith("[AgentManager] Could not get git URL: no remote")
		if (plan.kind !== "spawn") {
			throw new Error("Expected spawn plan")
		}
		expect(plan.spawnPlan.spawnOptions.gitUrl).toBeUndefined()
	})
})
