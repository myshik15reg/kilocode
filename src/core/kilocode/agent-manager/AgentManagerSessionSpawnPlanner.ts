// kilocode_change - new file
import type { ModeConfig, ProviderSettings } from "@roo-code/types"
import type { SessionData } from "./RemoteSessionService"
import type { SessionGroup } from "./types"

export interface SessionSpawnWorktreeInfo {
	branch: string
	path: string
	parentBranch: string
}

export interface SessionSpawnOptions {
	parallelMode?: boolean
	label?: string
	gitUrl?: string
	existingBranch?: string
	sessionId?: string
	worktreeInfo?: SessionSpawnWorktreeInfo
	effectiveWorkspace?: string
	model?: string
	mode?: string
	helperProfile?: string
	images?: string[]
	sessionGroup?: SessionGroup
	sessionData?: SessionData
	apiConfiguration?: ProviderSettings
	customModes?: ModeConfig[]
}

export interface StartSessionPlanningOptions {
	parallelMode?: boolean
	labelOverride?: string
	sessionId?: string
	existingBranch?: string
	model?: string
	mode?: string
	helperProfile?: string
	images?: string[]
	sessionGroup?: SessionGroup
}

export interface NormalizedAgentSpawnPlan {
	prompt: string
	workspace: string
	processStartTime: number
	spawnOptions: SessionSpawnOptions
}

export type StartSessionPlan =
	| {
			kind: "failed"
			reason: "missing-workspace" | "setup-failed"
	  }
	| {
			kind: "spawn"
			spawnPlan: NormalizedAgentSpawnPlan
			groupEvent?: {
				groupId: string
				sessionId: string
				label?: string
			}
	  }

export interface AgentManagerSessionSpawnPlannerDeps {
	getWorkspaceFolder: () => string | undefined
	resolveGitUrl: (workspaceFolder: string) => Promise<string | undefined>
	rememberCurrentGitUrl: (gitUrl: string) => void
	prepareWorktreeForSession: (
		prompt: string,
		existingBranch?: string,
	) => Promise<SessionSpawnWorktreeInfo | undefined>
	runSetupScriptForWorktree: (worktreePath: string) => Promise<void>
	getApiConfigurationForCli: (helperProfile?: string) => Promise<ProviderSettings | undefined>
	getCustomModes: () => Promise<ModeConfig[]>
	log: (message: string) => void
}

/**
 * Plans session start/spawn preparation for AgentManagerProvider.
 *
 * Responsibilities intentionally limited to:
 * - workspace and git startup preparation
 * - parallel worktree + setup-script preparation
 * - provider/custom-mode spawn composition
 * - normalized spawn plan assembly for provider-owned execution
 */
export class AgentManagerSessionSpawnPlanner {
	constructor(private readonly deps: AgentManagerSessionSpawnPlannerDeps) {}

	public async planStartSession(params: {
		prompt: string
		options?: StartSessionPlanningOptions
	}): Promise<StartSessionPlan> {
		const workspaceFolder = this.deps.getWorkspaceFolder()
		if (!workspaceFolder) {
			return { kind: "failed", reason: "missing-workspace" }
		}

		const gitUrl = await this.resolveWorkspaceGitUrl(workspaceFolder)
		let effectiveWorkspace = workspaceFolder
		let worktreeInfo: SessionSpawnWorktreeInfo | undefined

		if (params.options?.parallelMode) {
			worktreeInfo = await this.deps.prepareWorktreeForSession(params.prompt, params.options.existingBranch)
			if (!worktreeInfo) {
				return { kind: "failed", reason: "setup-failed" }
			}

			effectiveWorkspace = worktreeInfo.path

			if (!params.options.existingBranch) {
				await this.deps.runSetupScriptForWorktree(worktreeInfo.path)
			}
		}

		const spawnPlan = await this.buildNormalizedSpawnPlan({
			prompt: params.prompt,
			options: {
				parallelMode: params.options?.parallelMode,
				label: params.options?.labelOverride,
				gitUrl,
				sessionId: params.options?.sessionId,
				existingBranch: params.options?.existingBranch,
				worktreeInfo,
				effectiveWorkspace,
				model: params.options?.model,
				mode: params.options?.mode,
				helperProfile: params.options?.helperProfile,
				images: params.options?.images,
				sessionGroup: params.options?.sessionGroup,
			},
		})

		if (!spawnPlan) {
			return { kind: "failed", reason: "missing-workspace" }
		}

		return {
			kind: "spawn",
			spawnPlan,
			groupEvent: params.options?.sessionGroup
				? {
						groupId: params.options.sessionGroup.groupId,
						sessionId: params.options.sessionId || params.options.sessionGroup.rootSessionId,
						label: params.options.labelOverride || params.options.sessionGroup.label,
					}
				: undefined,
		}
	}

	public async buildNormalizedSpawnPlan(params: {
		prompt: string
		options?: SessionSpawnOptions
	}): Promise<NormalizedAgentSpawnPlan | undefined> {
		const workspaceFolder = this.deps.getWorkspaceFolder()
		if (!workspaceFolder) {
			this.deps.log("ERROR: No workspace folder open")
			return undefined
		}

		const workspace = params.options?.effectiveWorkspace || workspaceFolder
		const [apiConfiguration, customModes] = await Promise.all([
			this.loadApiConfiguration(params.options?.helperProfile),
			this.loadCustomModes(params.options?.mode),
		])

		return {
			prompt: params.prompt,
			workspace,
			processStartTime: Date.now(),
			spawnOptions: {
				...params.options,
				apiConfiguration,
				customModes,
			},
		}
	}

	private async resolveWorkspaceGitUrl(workspaceFolder: string): Promise<string | undefined> {
		try {
			const gitUrl = await this.deps.resolveGitUrl(workspaceFolder)
			if (gitUrl) {
				this.deps.rememberCurrentGitUrl(gitUrl)
			}
			return gitUrl
		} catch (error) {
			this.deps.log(
				`[AgentManager] Could not get git URL: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}

	private async loadApiConfiguration(helperProfile?: string): Promise<ProviderSettings | undefined> {
		try {
			return await this.deps.getApiConfigurationForCli(helperProfile)
		} catch (error) {
			this.deps.log(
				`[AgentManager] Failed to read provider settings: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}

	private async loadCustomModes(requestedMode?: string): Promise<ModeConfig[] | undefined> {
		try {
			const customModes = await this.deps.getCustomModes()
			const modeSlugs = customModes.map((m) => `${m.slug}(${m.source || "local"})`).join(", ")
			this.deps.log(`[AgentManager] Fetched ${customModes.length} custom modes for agent process: [${modeSlugs}]`)
			this.deps.log(`[AgentManager] Requested mode for session: ${requestedMode || "code"} (default)`)
			return customModes
		} catch (error) {
			this.deps.log(
				`[AgentManager] Failed to fetch custom modes: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}
}
