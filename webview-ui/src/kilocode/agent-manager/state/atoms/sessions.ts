import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

export type AgentStatus = "creating" | "running" | "done" | "error" | "stopped"
export type SessionSource = "local" | "remote"

export interface ParallelModeInfo {
	enabled: boolean
	branch?: string
	worktreePath?: string
	parentBranch?: string
	completionMessage?: string
}

export interface SessionGroup {
	groupId: string
	rootSessionId: string
	parentGroupId?: string
	label?: string
	sessionIndex?: number
	sessionCount?: number
}

export interface AgentSession {
	sessionId: string
	label: string
	prompt: string
	status: AgentStatus
	startTime: number
	endTime?: number
	exitCode?: number
	error?: string
	pid?: number
	source: SessionSource
	parallelMode?: ParallelModeInfo
	sessionGroup?: SessionGroup
	gitUrl?: string
	// kilocode_change start
	taskId?: string
	rootTaskId?: string
	parentTaskId?: string
	childTaskIds?: string[]
	restartCount?: number
	restartLimit?: number
	autoRestartEnabled?: boolean
	lastStopReason?: string
	lastStopSummary?: string
	restartHandoff?: string
	lifecycleStatus?: string
	activityState?: string
	needsAttention?: boolean
	recoveryState?: string
	pendingReaction?: string
	lastEventAt?: number
	// kilocode_change end
	autoMode?: boolean // True if session was started with --auto flag (non-interactive)
	model?: string // Model ID used for this session
	mode?: string // Mode slug used for this session (e.g., "code", "architect")
}

/**
 * Represents a session that is being created (waiting for CLI's session_created event)
 */
export interface PendingSession {
	prompt: string
	label: string
	startTime: number
	parallelMode?: boolean
	gitUrl?: string
	autoMode?: boolean // True if session will be started with --auto flag
}

export interface SchedulerState {
	maxConcurrentStarts: number
	activeSessionLoad: number
	queuedLaunchCount: number
	activeRootCount?: number
	queuedRootLaunchCount?: number
	maxConcurrentPerQueueKey?: number
	queueKeyPressure?: Record<string, number>
	backpressure: boolean
}

export interface RemoteSession {
	session_id: string
	title: string
	created_at: string
	updated_at: string
	git_url?: string
	last_model?: string | null
}

// kilocode_change start
export interface RootTaskMessage {
	messageId: string
	rootTaskId: string
	sourceSessionId: string
	sourceLabel?: string
	content: string
	includeSender?: boolean
	timestamp: number
}
// kilocode_change end

// Core atoms
export const sessionsMapAtom = atom<Record<string, AgentSession>>({})
export const sessionOrderAtom = atom<string[]>([])
export const selectedSessionIdAtom = atom<string | null>(null)
export const selectedRootTaskIdAtom = atom<string | null>(null)
export const remoteSessionsAtom = atom<RemoteSession[]>([])
export const isRefreshingRemoteSessionsAtom = atom(false)
export const pendingSessionAtom = atom<PendingSession | null>(null)
export const sessionGroupEventsAtom = atom<Record<string, SessionGroupEvent>>({})
export const rootTaskMessagesAtom = atom<Record<string, RootTaskMessage>>({})
export const schedulerStateAtom = atom<SchedulerState | null>(null)

export const startSessionFailedCounterAtom = atom(0)

// Per-session input value for the chat input field
export const sessionInputAtomFamily = atomFamily((_sessionId: string) => atom(""))

// Per-session images (data URLs) for the chat input field
export const sessionImagesAtomFamily = atomFamily((_sessionId: string) => atom<string[]>([]))

// Maximum images per message (limited to fit in the input field UI)
export const MAX_IMAGES_PER_MESSAGE = 4

// User preference for run mode (persisted across new agent forms)
export type RunMode = "local" | "worktree"
// Default to local until worktree mode is ready to ship
export const preferredRunModeAtom = atom<RunMode>("local")

// Version count for multi-version mode (1 = single, 2-4 = multi-version with worktrees)
export type VersionCount = 1 | 2 | 3 | 4
export const MAX_VERSION_COUNT = 4
// Derive options from MAX_VERSION_COUNT to ensure consistency
export const VERSION_COUNT_OPTIONS = Array.from({ length: MAX_VERSION_COUNT }, (_, i) => (i + 1) as VersionCount)
export const versionCountAtom = atom<VersionCount>(1)

/**
 * Generate version labels with (v1), (v2), etc. suffixes for multi-version mode.
 * Single version (count=1) returns the original label without suffix.
 */
export function generateVersionLabels(baseLabel: string, count: VersionCount): string[] {
	if (count === 1) {
		return [baseLabel]
	}

	return Array.from({ length: count }, (_, i) => `${baseLabel} (v${i + 1})`)
}

// Derived - local sessions only
export const sessionsArrayAtom = atom((get) => {
	const map = get(sessionsMapAtom)
	const order = get(sessionOrderAtom)
	return order.map((id) => map[id]).filter((s): s is AgentSession => s !== undefined)
})

function toAgentSession(remote: RemoteSession): AgentSession {
	// Parse dates safely - invalid dates will produce NaN from getTime()
	const createdTime = remote.created_at ? new Date(remote.created_at).getTime() : 0
	const updatedTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0

	return {
		sessionId: remote.session_id,
		label: remote.title || "Untitled",
		prompt: "",
		status: "done",
		// Use 0 as fallback if dates are invalid (NaN)
		startTime: Number.isNaN(createdTime) ? 0 : createdTime,
		endTime: Number.isNaN(updatedTime) ? 0 : updatedTime,
		source: "remote",
		gitUrl: remote.git_url,
		model: remote.last_model ?? undefined,
	}
}

// Merged sessions: local sessions + remote sessions (deduplicated)
export interface SessionGroupView {
	groupId: string
	rootSessionId: string
	parentGroupId?: string
	label: string
	sessions: AgentSession[]
}

export interface SessionGroupEvent {
	groupId: string
	sessionId: string
	eventType: "creating" | "running" | "completed" | "stopped" | "error"
	summary?: string
	timestamp: number
}

export interface SessionGroupMessage {
	messageId: string
	groupId: string
	sourceSessionId: string
	sourceLabel?: string
	content: string
	includeSender?: boolean
	timestamp: number
}

export interface RootTaskView {
	rootTaskId: string
	label: string
	summary?: string
	lastStartTime: number
	status: "running" | "done" | "stopped" | "error"
}

function getSessionBranchSummary(sessions: AgentSession[]) {
	const summary = { total: sessions.length, creating: 0, running: 0, done: 0, error: 0, stopped: 0 }
	for (const session of sessions) {
		summary[session.status] += 1
	}
	return summary
}

function formatSessionBranchSummaryLabel(summary: ReturnType<typeof getSessionBranchSummary>): string | undefined {
	if (summary.total <= 1) {
		return undefined
	}
	const parts = [`Branches ${summary.total}`]
	if (summary.creating > 0) parts.push(`C${summary.creating}`)
	if (summary.running > 0) parts.push(`A${summary.running}`)
	if (summary.done > 0) parts.push(`Done ${summary.done}`)
	if (summary.error > 0) parts.push(`Err ${summary.error}`)
	if (summary.stopped > 0) parts.push(`Stop ${summary.stopped}`)
	return parts.join(" · ")
}

function formatRootTaskBranchSummaryLabel(summary: ReturnType<typeof getSessionBranchSummary>): string | undefined {
	if (summary.total <= 0) {
		return undefined
	}
	const parts = [`Branches ${summary.total}`]
	if (summary.creating > 0) parts.push(`C${summary.creating}`)
	if (summary.running > 0) parts.push(`A${summary.running}`)
	if (summary.done > 0) parts.push(`Done ${summary.done}`)
	if (summary.error > 0) parts.push(`Err ${summary.error}`)
	if (summary.stopped > 0) parts.push(`Stop ${summary.stopped}`)
	return parts.join(" · ")
}

function getTopLevelGroupRootSessionIds(groups: SessionGroupView[]): Record<string, string> {
	const groupsById = new Map(groups.map((group) => [group.groupId, group]))
	const cache = new Map<string, string>()
	const resolve = (groupId: string): string | undefined => {
		if (cache.has(groupId)) {
			return cache.get(groupId)
		}
		const group = groupsById.get(groupId)
		if (!group) {
			return undefined
		}
		if (!group.parentGroupId || !groupsById.has(group.parentGroupId)) {
			cache.set(groupId, group.rootSessionId)
			return group.rootSessionId
		}
		const resolved = resolve(group.parentGroupId) ?? group.rootSessionId
		cache.set(groupId, resolved)
		return resolved
	}
	for (const group of groups) {
		resolve(group.groupId)
	}
	return Object.fromEntries(cache.entries())
}

export function getEffectiveRootTaskId(
	session: AgentSession,
	topLevelGroupRootIds?: Record<string, string>,
): string | undefined {
	if (session.rootTaskId || session.taskId) {
		return session.rootTaskId ?? session.taskId
	}
	const sessionGroupId = session.sessionGroup?.groupId
	if (sessionGroupId && topLevelGroupRootIds?.[sessionGroupId]) {
		return topLevelGroupRootIds[sessionGroupId]
	}
	return undefined
}

export const sessionGroupMessagesAtom = atom<Record<string, SessionGroupMessage>>({})
export const sessionGroupsAtom = atom((get): SessionGroupView[] => {
	const sessions = get(mergedSessionsAtom)
	const grouped = new Map<string, SessionGroupView>()

	for (const session of sessions) {
		const sessionGroup = session.sessionGroup
		if (!sessionGroup) {
			continue
		}

		const existing = grouped.get(sessionGroup.groupId)
		if (existing) {
			existing.sessions.push(session)
		} else {
			grouped.set(sessionGroup.groupId, {
				groupId: sessionGroup.groupId,
				rootSessionId: sessionGroup.rootSessionId,
				parentGroupId: sessionGroup.parentGroupId,
				label: sessionGroup.label || session.label,
				sessions: [session],
			})
		}
	}

	return Array.from(grouped.values())
		.map((group) => ({
			...group,
			sessions: [...group.sessions].sort((left, right) => {
				const leftIndex = left.sessionGroup?.sessionIndex ?? 0
				const rightIndex = right.sessionGroup?.sessionIndex ?? 0
				return leftIndex - rightIndex || right.startTime - left.startTime
			}),
		}))
		.sort((left, right) => (right.sessions[0]?.startTime ?? 0) - (left.sessions[0]?.startTime ?? 0))
})

export const mergedSessionsAtom = atom((get) => {
	const localSessions = get(sessionsArrayAtom)
	const remoteSessions = get(remoteSessionsAtom)

	// Build set of session IDs we already have locally
	const localSessionIds = new Set(localSessions.filter((s) => s.sessionId).map((s) => s.sessionId))

	// Convert remote sessions, excluding those we already have locally
	const remoteAsDisplay = remoteSessions.filter((rs) => !localSessionIds.has(rs.session_id)).map(toAgentSession)

	// Local sessions first (may be running), then remote sessions (completed)
	return [...localSessions, ...remoteAsDisplay]
})

export const topLevelGroupRootIdsAtom = atom((get) => getTopLevelGroupRootSessionIds(get(sessionGroupsAtom)))

export const rootTaskViewsAtom = atom((get): RootTaskView[] => {
	const sessions = get(mergedSessionsAtom)
	const topLevelGroupRootIds = get(topLevelGroupRootIdsAtom)
	const grouped = new Map<string, AgentSession[]>()
	for (const session of sessions) {
		if (!session.rootTaskId && !session.taskId) {
			continue
		}
		const rootTaskId = getEffectiveRootTaskId(session, topLevelGroupRootIds)
		if (!rootTaskId) {
			continue
		}
		const existing = grouped.get(rootTaskId) ?? []
		existing.push(session)
		grouped.set(rootTaskId, existing)
	}
	return Array.from(grouped.entries())
		.map(([rootTaskId, rootSessions]) => {
			const representative =
				rootSessions.find(
					(session) =>
						(session.taskId ?? session.sessionGroup?.rootSessionId ?? session.sessionId) === rootTaskId ||
						!session.parentTaskId,
				) ?? [...rootSessions].sort((left, right) => right.startTime - left.startTime)[0]
			const summary = getSessionBranchSummary(rootSessions)
			const status: RootTaskView["status"] =
				summary.creating > 0 || summary.running > 0
					? "running"
					: summary.error > 0
						? "error"
						: summary.done > 0
							? "done"
							: "stopped"
			return {
				rootTaskId,
				label: representative?.label ?? rootTaskId,
				summary: formatSessionBranchSummaryLabel(summary),
				lastStartTime: Math.max(...rootSessions.map((session) => session.startTime)),
				status,
			}
		})
		.sort((left, right) => right.lastStartTime - left.lastStartTime)
})

export const effectiveSelectedRootTaskIdAtom = atom((get) => {
	const rootTaskViews = get(rootTaskViewsAtom)
	const selectedRootTaskId = get(selectedRootTaskIdAtom)
	if (selectedRootTaskId && rootTaskViews.some((view) => view.rootTaskId === selectedRootTaskId)) {
		return selectedRootTaskId
	}
	const selectedId = get(selectedSessionIdAtom)
	const sessions = get(mergedSessionsAtom)
	const topLevelGroupRootIds = get(topLevelGroupRootIdsAtom)
	const selectedSession = selectedId ? sessions.find((session) => session.sessionId === selectedId) : undefined
	const selectedSessionRootTaskId = selectedSession
		? getEffectiveRootTaskId(selectedSession, topLevelGroupRootIds)
		: undefined
	if (selectedSessionRootTaskId && rootTaskViews.some((view) => view.rootTaskId === selectedSessionRootTaskId)) {
		return selectedSessionRootTaskId
	}
	return rootTaskViews[0]?.rootTaskId ?? null
})

export const visibleSessionGroupsAtom = atom((get) => {
	const effectiveSelectedRootTaskId = get(effectiveSelectedRootTaskIdAtom)
	const sessionGroups = get(sessionGroupsAtom)
	const topLevelGroupRootIds = get(topLevelGroupRootIdsAtom)
	return effectiveSelectedRootTaskId
		? sessionGroups.filter((group) =>
				group.sessions.some(
					(session) => getEffectiveRootTaskId(session, topLevelGroupRootIds) === effectiveSelectedRootTaskId,
				),
			)
		: sessionGroups
})

export const rootTaskRollupAtom = atom((get) => {
	const effectiveSelectedRootTaskId = get(effectiveSelectedRootTaskIdAtom)
	if (!effectiveSelectedRootTaskId) {
		return {
			summaryLabel: undefined,
			pressureLabel: undefined,
			queueLabel: undefined,
			relayLabel: undefined,
			guardrailLabel: undefined,
			problemLabel: undefined,
		}
	}

	const sessions = get(mergedSessionsAtom)
	const topLevelGroupRootIds = get(topLevelGroupRootIdsAtom)
	const rootSessions = sessions.filter(
		(session) => getEffectiveRootTaskId(session, topLevelGroupRootIds) === effectiveSelectedRootTaskId,
	)
	const groups = get(visibleSessionGroupsAtom)
	const scheduler = get(schedulerStateAtom)
	const explicitRootMessage = get(rootTaskMessagesAtom)[effectiveSelectedRootTaskId]
	const groupMessages = get(sessionGroupMessagesAtom)
	const groupEvents = get(sessionGroupEventsAtom)
	const visibleGroupIds = groups.map((group) => group.groupId)
	const maxPressure = getMaxPressureForGroupIds(visibleGroupIds, scheduler?.queueKeyPressure)
	const latestRelayMessage = getLatestMessageForGroupIds(visibleGroupIds, groupMessages)
	const latestGuardrail = getLatestGuardrailEventForGroupIds(visibleGroupIds, groupEvents)
	const problemCount = countProblemSessions(groups.flatMap((group) => group.sessions))

	return {
		summaryLabel:
			rootSessions.length > 0
				? formatRootTaskBranchSummaryLabel(getSessionBranchSummary(rootSessions))
				: undefined,
		pressureLabel: maxPressure
			? maxPressure >= 2
				? `root pressure ${maxPressure} · throttled`
				: `root pressure ${maxPressure}`
			: undefined,
		queueLabel: scheduler?.queuedRootLaunchCount
			? `root queue ${scheduler.queuedRootLaunchCount} · active roots ${scheduler.activeRootCount ?? 0}`
			: undefined,
		relayLabel: explicitRootMessage
			? `root ${explicitRootMessage.sourceLabel ?? "agent"} -> ${explicitRootMessage.content.slice(0, 18)}`
			: latestRelayMessage
				? `root ${latestRelayMessage.sourceLabel ?? "agent"} -> ${latestRelayMessage.content.slice(0, 18)}`
				: undefined,
		guardrailLabel: latestGuardrail
			? (() => {
					const label = getGuardrailLabel(latestGuardrail.summary, latestGuardrail.eventType)
					return label ? `root ${label}` : undefined
				})()
			: undefined,
		problemLabel: problemCount > 0 ? `root issues ${problemCount}` : undefined,
	}
})

function getGuardrailLabel(summary?: string, eventType?: SessionGroupEvent["eventType"]) {
	if (!summary) {
		return undefined
	}
	const normalizedSummary = summary.trim().toLowerCase()
	if (
		normalizedSummary.includes("budget") ||
		normalizedSummary.includes("token") ||
		normalizedSummary.includes("restart_limit") ||
		normalizedSummary.includes("restart limit")
	) {
		return "guard budget"
	}
	if (
		normalizedSummary.includes("loop") ||
		normalizedSummary.includes("consecutive mistake") ||
		normalizedSummary.includes("mistake limit")
	) {
		return "guard loop"
	}
	if (
		normalizedSummary.includes("streaming_failed") ||
		normalizedSummary.includes("stream failed") ||
		normalizedSummary.includes("api request failed")
	) {
		return "guard stream"
	}
	if (
		normalizedSummary.includes("timed out") ||
		normalizedSummary.includes("timeout") ||
		normalizedSummary.includes("stall")
	) {
		return "guard stall"
	}
	if (normalizedSummary.includes("parent_cancelled") || normalizedSummary.includes("parent cancelled")) {
		return "guard parent-cancel"
	}
	if (normalizedSummary.includes("parent_completed") || normalizedSummary.includes("parent completed")) {
		return "guard parent-done"
	}
	if (
		eventType === "stopped" &&
		(normalizedSummary.includes("stopped by user") ||
			normalizedSummary.includes("cancelled") ||
			normalizedSummary.includes("interrupted"))
	) {
		return "guard manual"
	}
	return undefined
}

function getChildrenByParentGroup(groups: SessionGroupView[]) {
	const childrenByParent = new Map<string, string[]>()
	for (const group of groups) {
		if (!group.parentGroupId) {
			continue
		}
		const existing = childrenByParent.get(group.parentGroupId) ?? []
		existing.push(group.groupId)
		childrenByParent.set(group.parentGroupId, existing)
	}
	return childrenByParent
}

function getDescendantGroupIdsFromChildrenByParent(childrenByParent: Map<string, string[]>, groupId: string): string[] {
	const descendantIds: string[] = []
	const queue = [...(childrenByParent.get(groupId) ?? [])]
	while (queue.length > 0) {
		const currentGroupId = queue.shift()
		if (!currentGroupId) {
			continue
		}
		descendantIds.push(currentGroupId)
		queue.push(...(childrenByParent.get(currentGroupId) ?? []))
	}

	return descendantIds
}

function getLatestMessageForGroupIds(
	groupIds: string[],
	messages: Record<string, SessionGroupMessage>,
): SessionGroupMessage | undefined {
	let latestMessage: SessionGroupMessage | undefined
	for (const groupId of groupIds) {
		const message = messages[groupId]
		if (!message) {
			continue
		}
		if (!latestMessage || message.timestamp > latestMessage.timestamp) {
			latestMessage = message
		}
	}
	return latestMessage
}

function getLatestGuardrailEventForGroupIds(
	groupIds: string[],
	events: Record<string, SessionGroupEvent>,
): SessionGroupEvent | undefined {
	let latestEvent: SessionGroupEvent | undefined
	for (const groupId of groupIds) {
		const event = events[groupId]
		if (!event || !getGuardrailLabel(event.summary, event.eventType)) {
			continue
		}
		if (!latestEvent || event.timestamp > latestEvent.timestamp) {
			latestEvent = event
		}
	}
	return latestEvent
}

function getMaxPressureForGroupIds(groupIds: string[], queueKeyPressure?: Record<string, number>) {
	let maxPressure = 0
	for (const groupId of groupIds) {
		const pressure = queueKeyPressure?.[groupId] ?? 0
		if (pressure > maxPressure) {
			maxPressure = pressure
		}
	}
	return maxPressure > 0 ? maxPressure : undefined
}

function countProblemSessions(sessions: AgentSession[]) {
	let count = 0
	for (const session of sessions) {
		if (session.status === "error" || session.status === "stopped") {
			count += 1
		}
	}
	return count
}

function formatSubtreeSummaryLabel(summary?: ReturnType<typeof getSessionBranchSummary>): string | undefined {
	if (!summary || summary.total <= 1) {
		return undefined
	}

	const branchSummary = formatSessionBranchSummaryLabel(summary)
	return branchSummary ? `subtree ${branchSummary}` : undefined
}

function formatSubtreePressureLabel(maxPressure?: number): string | undefined {
	if (!maxPressure) {
		return undefined
	}

	return maxPressure >= 2 ? `subtree pressure ${maxPressure} · throttled` : `subtree pressure ${maxPressure}`
}

function formatSubtreeProblemLabel(problemCount: number): string | undefined {
	return problemCount > 0 ? `subtree issues ${problemCount}` : undefined
}

function formatSubtreeRelayLabel(message?: SessionGroupMessage): string | undefined {
	if (!message) {
		return undefined
	}

	return `subtree ${message.sourceLabel ?? "agent"} -> ${message.content.slice(0, 18)}`
}

function formatSubtreeGuardrailLabel(event?: SessionGroupEvent): string | undefined {
	if (!event) {
		return undefined
	}
	const guardrailLabel = getGuardrailLabel(event.summary, event.eventType)
	return guardrailLabel ? `subtree ${guardrailLabel}` : undefined
}

export const subtreeRollupByGroupAtom = atom((get) => {
	const groups = get(visibleSessionGroupsAtom)
	const scheduler = get(schedulerStateAtom)
	const messages = get(sessionGroupMessagesAtom)
	const events = get(sessionGroupEventsAtom)
	const groupById: Record<string, SessionGroupView> = Object.fromEntries(
		groups.map((group) => [group.groupId, group]),
	)
	const childrenByParent = getChildrenByParentGroup(groups)
	const descendantsByGroup = Object.fromEntries(
		groups.map((group) => [
			group.groupId,
			getDescendantGroupIdsFromChildrenByParent(childrenByParent, group.groupId),
		]),
	)
	const queueKeyPressure = scheduler?.queueKeyPressure

	return Object.fromEntries(
		groups.map((group) => {
			const descendantGroupIds = descendantsByGroup[group.groupId] ?? []
			const allGroupIds = [group.groupId, ...descendantGroupIds]
			const subtreeGroups = allGroupIds
				.map((groupId) => groupById[groupId])
				.filter((entry): entry is SessionGroupView => Boolean(entry))
			const subtreeSessions = subtreeGroups.flatMap((entry) => entry.sessions)
			const subtreeSummary = subtreeSessions.length > 0 ? getSessionBranchSummary(subtreeSessions) : undefined
			const maxPressure = getMaxPressureForGroupIds(allGroupIds, queueKeyPressure)
			const latestMessage = getLatestMessageForGroupIds(allGroupIds, messages)
			const latestGuardrail = getLatestGuardrailEventForGroupIds(allGroupIds, events)
			const problemCount = countProblemSessions(subtreeSessions)
			const problematicDescendantGroupIds = descendantGroupIds.filter((candidateGroupId) => {
				const candidateGroup = groupById[candidateGroupId]
				return Boolean(candidateGroup && countProblemSessions(candidateGroup.sessions) > 0)
			})

			return [
				group.groupId,
				{
					descendantGroupIds,
					summaryLabel: subtreeSummary ? formatSubtreeSummaryLabel(subtreeSummary) : undefined,
					pressureLabel: formatSubtreePressureLabel(maxPressure),
					problemLabel: formatSubtreeProblemLabel(problemCount),
					relayLabel: formatSubtreeRelayLabel(latestMessage),
					guardrailLabel: formatSubtreeGuardrailLabel(latestGuardrail),
					problematicDescendantGroupIds,
				},
			]
		}),
	)
})

export const visibleStandaloneSessionsAtom = atom((get) => {
	const effectiveSelectedRootTaskId = get(effectiveSelectedRootTaskIdAtom)
	const sessions = get(mergedSessionsAtom)
	const topLevelGroupRootIds = get(topLevelGroupRootIdsAtom)
	return sessions.filter(
		(session) =>
			!session.sessionGroup &&
			(!effectiveSelectedRootTaskId ||
				getEffectiveRootTaskId(session, topLevelGroupRootIds) === effectiveSelectedRootTaskId),
	)
})

export interface SessionGroupUiMeta {
	branchSummaryLabel?: string
	taskLinkageLabel?: string
	pressureLabel?: string
	relayLabel?: string
	relayPolicyLabel?: string
	guardrailLabel?: string
	stopReasonLabel?: string
	statusLabel?: string
	problematicSessionId?: string
	problematicSessionCount: number
	restartPolicyLabel?: string
	autoRestartLabel?: string
	showRestartPolicy: boolean
	isPressureSaturated: boolean
}

function normalizeStopReason(summary?: string) {
	if (!summary) {
		return undefined
	}
	const trimmedSummary = summary.trim()
	const normalizedSummary = trimmedSummary.toLowerCase()
	if (normalizedSummary.includes("loop")) {
		return "loop detected"
	}
	if (
		normalizedSummary.includes("restart_limit") ||
		normalizedSummary.includes("restart limit") ||
		normalizedSummary.includes("limit exceeded")
	) {
		return "restart limit"
	}
	if (
		normalizedSummary.includes("stopped by user") ||
		normalizedSummary.includes("cancelled") ||
		normalizedSummary.includes("interrupted")
	) {
		return "interrupted"
	}
	if (normalizedSummary.includes("timed out") || normalizedSummary.includes("timeout")) {
		return "timeout"
	}
	if (normalizedSummary.startsWith("exit code")) {
		return trimmedSummary.toLowerCase()
	}
	return trimmedSummary.replace(/_/g, " ")
}

function getGroupTaskLinkageLabel(sessions: AgentSession[]): string | undefined {
	const rootIds = Array.from(
		new Set(
			sessions.map((session) => session.rootTaskId ?? session.taskId).filter((id): id is string => Boolean(id)),
		),
	)
	const subtaskCount = sessions.filter((session) => Boolean(session.parentTaskId)).length
	const parentCount = sessions.filter((session) => (session.childTaskIds?.length ?? 0) > 0).length
	const parts: string[] = []
	if (rootIds.length === 1) {
		parts.push(`root ${rootIds[0]}`)
	} else if (rootIds.length > 1) {
		parts.push(`roots ${rootIds.length}`)
	}
	if (subtaskCount > 0) {
		parts.push(`subtasks ${subtaskCount}`)
	}
	if (parentCount > 0) {
		parts.push(`parents ${parentCount}`)
	}
	return parts.length > 0 ? parts.join(" · ") : undefined
}

function getProblematicSession(group: SessionGroupView, latestEvent?: SessionGroupEvent) {
	const problematicCandidates = group.sessions.filter(
		(session) => session.status === "error" || session.status === "stopped",
	)
	if (problematicCandidates.length === 0) {
		return group.sessions[group.sessions.length - 1]
	}
	const latestProblematicSession =
		latestEvent && (latestEvent.eventType === "error" || latestEvent.eventType === "stopped")
			? problematicCandidates.find((session) => session.sessionId === latestEvent.sessionId)
			: undefined
	if (latestProblematicSession) {
		return latestProblematicSession
	}
	return [...problematicCandidates].sort((left, right) => {
		const statusWeight = (session: AgentSession) => (session.status === "error" ? 2 : 1)
		const weightDiff = statusWeight(right) - statusWeight(left)
		if (weightDiff !== 0) {
			return weightDiff
		}
		const rightTime = right.endTime ?? right.startTime ?? 0
		const leftTime = left.endTime ?? left.startTime ?? 0
		if (rightTime !== leftTime) {
			return rightTime - leftTime
		}
		const rightIndex = right.sessionGroup?.sessionIndex ?? 0
		const leftIndex = left.sessionGroup?.sessionIndex ?? 0
		return rightIndex - leftIndex
	})[0]
}

function formatGroupPressureLabel(pressureLevel?: number): string | undefined {
	if (!pressureLevel) {
		return undefined
	}
	return pressureLevel >= 2 ? `pressure ${pressureLevel} · throttled` : `pressure ${pressureLevel}`
}

function formatGroupRelayLabel(message?: SessionGroupMessage): string | undefined {
	if (!message) {
		return undefined
	}
	return `${message.sourceLabel ?? "agent"} -> ${message.content.slice(0, 18)}`
}

function formatGroupStatusLabel(group: SessionGroupView): string | undefined {
	const hasRunning = group.sessions.some((session) => session.status === "running" || session.status === "creating")
	if (hasRunning) {
		return "status.running"
	}
	const hasError = group.sessions.some((session) => session.status === "error")
	if (hasError) {
		return "status.error"
	}
	const hasStopped = group.sessions.some((session) => session.status === "stopped")
	if (hasStopped) {
		return "status.stopped"
	}
	const hasDone = group.sessions.some((session) => session.status === "done")
	if (hasDone) {
		return "status.done"
	}
	return undefined
}

function formatRestartPolicyLabel(session?: AgentSession): string | undefined {
	return session?.restartLimit !== undefined
		? `restarts ${session.restartCount ?? 0}/${session.restartLimit}`
		: undefined
}

function formatAutoRestartLabel(session?: AgentSession): string | undefined {
	return session?.autoRestartEnabled !== undefined
		? `auto-restart ${session.autoRestartEnabled ? "on" : "off"}`
		: undefined
}

function formatRelayPolicyLabel(shouldCompact: boolean): string | undefined {
	return shouldCompact ? "relay compact" : undefined
}

export const groupUiMetaByGroupAtom = atom((get): Record<string, SessionGroupUiMeta> => {
	const groups = get(visibleSessionGroupsAtom)
	const events = get(sessionGroupEventsAtom)
	const messages = get(sessionGroupMessagesAtom)
	const scheduler = get(schedulerStateAtom)
	return Object.fromEntries(
		groups.map((group) => {
			const latestEvent = events[group.groupId]
			const latestMessage = messages[group.groupId]
			const pressureLevel = scheduler?.queueKeyPressure?.[group.groupId]
			const isPressureSaturated = (pressureLevel ?? 0) >= 2
			const problematicSession = getProblematicSession(group, latestEvent)
			const problematicSessionCount = group.sessions.filter(
				(session) => session.status === "error" || session.status === "stopped",
			).length
			const showRestartPolicy =
				!!problematicSession &&
				(problematicSession.status === "error" ||
					problematicSession.status === "stopped" ||
					latestEvent?.eventType === "error" ||
					latestEvent?.eventType === "stopped" ||
					isPressureSaturated)
			const guardrailLabel = latestEvent
				? getGuardrailLabel(latestEvent.summary, latestEvent.eventType)
				: undefined
			return [
				group.groupId,
				{
					branchSummaryLabel: formatSessionBranchSummaryLabel(getSessionBranchSummary(group.sessions)),
					taskLinkageLabel: getGroupTaskLinkageLabel(group.sessions),
					pressureLabel: formatGroupPressureLabel(pressureLevel),
					relayLabel: formatGroupRelayLabel(latestMessage),
					relayPolicyLabel: formatRelayPolicyLabel(isPressureSaturated || Boolean(scheduler?.backpressure)),
					guardrailLabel,
					stopReasonLabel:
						latestEvent && (latestEvent.eventType === "error" || latestEvent.eventType === "stopped")
							? normalizeStopReason(latestEvent.summary)
							: undefined,
					statusLabel: formatGroupStatusLabel(group),
					problematicSessionId: problematicSession?.sessionId,
					problematicSessionCount,
					restartPolicyLabel: showRestartPolicy ? formatRestartPolicyLabel(problematicSession) : undefined,
					autoRestartLabel: showRestartPolicy ? formatAutoRestartLabel(problematicSession) : undefined,
					showRestartPolicy,
					isPressureSaturated,
				} satisfies SessionGroupUiMeta,
			]
		}),
	)
})

export const selectedSessionAtom = atom((get) => {
	const id = get(selectedSessionIdAtom)
	if (!id) return null

	// First check local sessions map
	const localSession = get(sessionsMapAtom)[id]
	if (localSession) return localSession

	// Then check remote sessions (converted to AgentSession format)
	const remoteSessions = get(remoteSessionsAtom)
	const remoteSession = remoteSessions.find((rs) => rs.session_id === id)
	if (remoteSession) return toAgentSession(remoteSession)

	return null
})

// Actions
export const upsertSessionAtom = atom(null, (get, set, session: AgentSession) => {
	const current = get(sessionsMapAtom)
	const order = get(sessionOrderAtom)
	const isNewSession = !order.includes(session.sessionId)

	set(sessionsMapAtom, { ...current, [session.sessionId]: session })
	if (isNewSession) {
		set(sessionOrderAtom, [session.sessionId, ...order])
		if (get(selectedSessionIdAtom) === null) {
			set(selectedSessionIdAtom, session.sessionId)
		}
	}
})

export const removeSessionAtom = atom(null, (get, set, sessionId: string) => {
	const current = get(sessionsMapAtom)
	const { [sessionId]: _, ...rest } = current
	set(sessionsMapAtom, rest)
	set(
		sessionOrderAtom,
		get(sessionOrderAtom).filter((id) => id !== sessionId),
	)
	if (get(selectedSessionIdAtom) === sessionId) {
		const remaining = get(sessionOrderAtom)
		set(selectedSessionIdAtom, remaining[0] || null)
	}
})

export const updateSessionStatusAtom = atom(
	null,
	(
		get,
		set,
		payload: {
			sessionId: string
			status: AgentStatus
			exitCode?: number
			error?: string
		},
	) => {
		const current = get(sessionsMapAtom)
		const session = current[payload.sessionId]
		if (!session) return

		set(sessionsMapAtom, {
			...current,
			[payload.sessionId]: {
				...session,
				status: payload.status,
				exitCode: payload.exitCode,
				error: payload.error,
				endTime: payload.status !== "running" ? Date.now() : session.endTime,
			},
		})
	},
)

export const updateSessionModeAtom = atom(null, (get, set, payload: { sessionId: string; mode: string }) => {
	const current = get(sessionsMapAtom)
	const session = current[payload.sessionId]
	if (!session) return

	set(sessionsMapAtom, {
		...current,
		[payload.sessionId]: {
			...session,
			mode: payload.mode,
		},
	})
})

export const setRemoteSessionsAtom = atom(null, (_get, set, sessions: RemoteSession[]) => {
	set(remoteSessionsAtom, sessions)
	set(isRefreshingRemoteSessionsAtom, false)
})

export const updateSessionGroupEventAtom = atom(null, (get, set, event: SessionGroupEvent) => {
	set(sessionGroupEventsAtom, { ...get(sessionGroupEventsAtom), [event.groupId]: event })
})

export const updateSessionGroupMessageAtom = atom(null, (get, set, message: SessionGroupMessage) => {
	set(sessionGroupMessagesAtom, { ...get(sessionGroupMessagesAtom), [message.groupId]: message })
})

export const updateRootTaskMessageAtom = atom(null, (get, set, message: RootTaskMessage) => {
	set(rootTaskMessagesAtom, { ...get(rootTaskMessagesAtom), [message.rootTaskId]: message })
})
