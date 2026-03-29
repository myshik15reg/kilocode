// kilocode_change start
import * as fs from "node:fs"
import * as path from "node:path"
import type { AgentSession } from "./types"
import type { SessionData } from "./RemoteSessionService"

export interface ResumeWorktreeInfo {
	branch: string
	path: string
	parentBranch: string
}

export interface ResumeSessionSpawnOptions {
	sessionId: string
	label?: string
	parallelMode?: boolean
	gitUrl?: string
	worktreeInfo?: ResumeWorktreeInfo
	effectiveWorkspace?: string
	model?: string
	mode?: string
	images?: string[]
	sessionData?: SessionData
}

export type ResumeSessionPlan =
	| {
			kind: "send-message"
	  }
	| {
			kind: "queued"
	  }
	| {
			kind: "spawn"
			prompt: string
			spawnOptions: ResumeSessionSpawnOptions
	  }

export interface ResumeSessionRequest {
	sessionId: string
	content: string
	sessionLabel?: string
	images?: string[]
	session?: AgentSession
}

export interface AgentManagerResumeOrchestratorOptions {
	hasRunningRuntime: (sessionId: string) => boolean
	getCachedSessionData: (sessionId: string) => SessionData | undefined
	cacheSessionData: (sessionId: string, sessionData: SessionData) => void
	fetchSessionDataForResume: (sessionId: string) => Promise<SessionData | null>
	createWorktree: (params: { prompt?: string; existingBranch?: string }) => Promise<ResumeWorktreeInfo>
	updateSessionParallelMode: (sessionId: string, info: { worktreePath: string }) => void
	isReusableWorktree?: (worktreePath: string) => boolean
	log: (message: string) => void
}

/**
 * Plans the narrow resume/runtime path for AgentManagerProvider.
 *
 * Responsibilities intentionally limited to:
 * - runtime liveness branching for resume
 * - cached vs remote resume-data loading
 * - resume mode resolution
 * - parallel-worktree recovery for resume
 * - normalized respawn option assembly
 */
export class AgentManagerResumeOrchestrator {
	constructor(private readonly options: AgentManagerResumeOrchestratorOptions) {}

	async planResumeSession(request: ResumeSessionRequest): Promise<ResumeSessionPlan> {
		const { sessionId, content, sessionLabel, images, session } = request

		if (this.options.hasRunningRuntime(sessionId)) {
			return { kind: "send-message" }
		}

		if (session?.status === "creating") {
			this.options.log(`[AgentManager] Session ${sessionId} is already starting, queueing message for later`)
			return { kind: "queued" }
		}

		if (images && images.length > 0) {
			this.options.log(`[AgentManager] Passing ${images.length} images (base64) to resumed session`)
		}

		this.options.log(`[AgentManager] Resuming session ${sessionId} with new prompt`)

		const sessionData = await this.loadResumeSessionData(sessionId)
		const resumeMode = sessionData?.metadata?.mode || session?.mode
		if (resumeMode) {
			this.options.log(`[AgentManager] Resuming with mode: ${resumeMode}`)
		}

		if (session?.parallelMode?.enabled && session.parallelMode.branch) {
			const worktreeInfo = await this.prepareWorktreeForResume(session)
			if (worktreeInfo) {
				return {
					kind: "spawn",
					prompt: content,
					spawnOptions: {
						sessionId,
						parallelMode: true,
						gitUrl: session.gitUrl,
						worktreeInfo,
						effectiveWorkspace: worktreeInfo.path,
						images,
						sessionData,
						model: session.model,
						mode: resumeMode ?? undefined,
					},
				}
			}
			this.options.log(`[AgentManager] Failed to prepare worktree, resuming without parallel mode`)
		}

		return {
			kind: "spawn",
			prompt: content,
			spawnOptions: {
				sessionId,
				label: sessionLabel || session?.label,
				parallelMode: session?.parallelMode?.enabled,
				gitUrl: session?.gitUrl,
				images,
				sessionData,
				model: session?.model,
				mode: resumeMode ?? undefined,
			},
		}
	}

	private async loadResumeSessionData(sessionId: string): Promise<SessionData | undefined> {
		try {
			const cachedSessionData = this.options.getCachedSessionData(sessionId)
			const fetchedData = cachedSessionData ?? (await this.options.fetchSessionDataForResume(sessionId))
			if (fetchedData) {
				this.options.cacheSessionData(sessionId, fetchedData)
				this.options.log(
					`[AgentManager] Fetched session data: ${fetchedData.uiMessages.length} UI messages, ${fetchedData.apiConversationHistory.length} API history entries${cachedSessionData ? " (cache)" : ""}`,
				)
				return fetchedData
			}
			this.options.log(`[AgentManager] No session data available for resume`)
			return undefined
		} catch (error) {
			this.options.log(
				`[AgentManager] Failed to fetch session data for resume: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}

	private async prepareWorktreeForResume(session: AgentSession): Promise<ResumeWorktreeInfo | undefined> {
		if (!session.parallelMode?.branch) {
			return undefined
		}

		const existingPath = session.parallelMode.worktreePath
		const branch = session.parallelMode.branch
		const parentBranch = session.parallelMode.parentBranch || "main"

		if (existingPath && this.isReusableWorktree(existingPath)) {
			this.options.log(`[AgentManager] Reusing existing worktree at: ${existingPath}`)
			return { branch, path: existingPath, parentBranch }
		}

		this.options.log(`[AgentManager] Recreating worktree for branch: ${branch}`)
		try {
			const worktreeInfo = await this.options.createWorktree({ existingBranch: branch })
			this.options.updateSessionParallelMode(session.sessionId, { worktreePath: worktreeInfo.path })
			return worktreeInfo
		} catch (error) {
			this.options.log(
				`[AgentManager] Failed to recreate worktree: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}

	private isReusableWorktree(worktreePath: string): boolean {
		if (this.options.isReusableWorktree) {
			return this.options.isReusableWorktree(worktreePath)
		}
		return fs.existsSync(worktreePath) && fs.existsSync(path.join(worktreePath, ".git"))
	}
}
// kilocode_change end
