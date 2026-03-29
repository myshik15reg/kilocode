import React, { useEffect, useMemo, useRef, useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useTranslation } from "react-i18next"
import {
	mergedSessionsAtom,
	selectedSessionIdAtom,
	selectedRootTaskIdAtom,
	rootTaskViewsAtom,
	effectiveSelectedRootTaskIdAtom,
	visibleSessionGroupsAtom,
	visibleStandaloneSessionsAtom,
	topLevelGroupRootIdsAtom,
	// kilocode_change start
	subtreeRollupByGroupAtom,
	groupUiMetaByGroupAtom,
	// kilocode_change end
	getEffectiveRootTaskId,
	isRefreshingRemoteSessionsAtom,
	pendingSessionAtom,
	schedulerStateAtom,
	type AgentSession,
	type SessionGroupView,
} from "../state/atoms/sessions"
import { sessionMachineUiStateAtom } from "../state/atoms/stateMachine"
import { rootTaskHasTodosAtom } from "../state/atoms/todos"
import { vscode } from "../utils/vscode"
import { formatRelativeTime, createRelativeTimeLabels } from "../utils/timeUtils"
import { useExtensionState } from "../../../context/ExtensionStateContext"
import {
	Plus,
	Loader2,
	RefreshCw,
	GitBranch,
	Folder,
	MoreVertical,
	FileCode,
	Layers,
	Square,
	RotateCcw,
	Share2,
	X,
} from "lucide-react"

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

function buildGroupRootRelayContent(params: {
	group: SessionGroupView
	problematicSession?: AgentSession
	compact?: boolean
}): string | undefined {
	const session =
		params.problematicSession ??
		params.group.sessions.find((candidate) => candidate.status === "error" || candidate.status === "stopped")
	if (!session?.rootTaskId) {
		return undefined
	}
	const summary = params.compact
		? (session.lastStopSummary ?? normalizeStopReason(session.lastStopReason))
		: (session.restartHandoff ?? session.lastStopSummary ?? normalizeStopReason(session.lastStopReason))
	if (!summary) {
		return undefined
	}
	return `Branch handoff from ${session.label}: ${summary}`
}
interface SessionGroupTreeRow {
	group: SessionGroupView
	depth: number
}

function buildSessionGroupTreeRows(groups: SessionGroupView[]): SessionGroupTreeRow[] {
	const groupsById = new Map(groups.map((group) => [group.groupId, group]))
	const childrenByParent = new Map<string, SessionGroupView[]>()
	const rootGroups: SessionGroupView[] = []

	for (const group of groups) {
		const parentGroupId = group.parentGroupId
		if (parentGroupId && groupsById.has(parentGroupId)) {
			const existingChildren = childrenByParent.get(parentGroupId) ?? []
			existingChildren.push(group)
			childrenByParent.set(parentGroupId, existingChildren)
		} else {
			rootGroups.push(group)
		}
	}

	const sortGroups = (items: SessionGroupView[]) =>
		[...items].sort((left, right) => (right.sessions[0]?.startTime ?? 0) - (left.sessions[0]?.startTime ?? 0))

	const rows: SessionGroupTreeRow[] = []
	const visit = (group: SessionGroupView, depth: number) => {
		rows.push({ group, depth })
		const children = childrenByParent.get(group.groupId)
		if (!children || children.length === 0) {
			return
		}
		for (const child of sortGroups(children)) {
			visit(child, depth + 1)
		}
	}

	for (const group of sortGroups(rootGroups)) {
		visit(group, 0)
	}

	return rows
}

function getGroupIndentStyle(depth: number) {
	return depth > 0 ? { paddingLeft: `${depth * 16}px` } : undefined
}

function getTaskLinkageLabel(session: AgentSession): string | undefined {
	if (session.parentTaskId) {
		return `subtask of ${session.parentTaskId}`
	}
	if (session.rootTaskId && session.taskId && session.rootTaskId === session.taskId) {
		return "root task"
	}
	if (session.rootTaskId && session.taskId && session.rootTaskId !== session.taskId) {
		return `root ${session.rootTaskId}`
	}
	if (session.childTaskIds && session.childTaskIds.length > 0) {
		return `children ${session.childTaskIds.length}`
	}
	return undefined
}

function getRootTaskStatusLabel(status: "running" | "done" | "stopped" | "error", t: (key: string) => string) {
	switch (status) {
		case "running":
			return t("status.running")
		case "done":
			return t("status.done")
		case "error":
			return t("status.error")
		default:
			return t("status.stopped")
	}
}

type RootTaskStatusSummaryItem = {
	status: "running" | "done" | "stopped" | "error"
	label: string
	count: number
}

function buildRootTaskStatusSummaryItems(params: {
	rootTaskViews: Array<{ rootTaskId: string; status: "running" | "done" | "stopped" | "error" }>
	rootTaskHasTodos: Record<string, boolean>
	t: (key: string) => string
}): RootTaskStatusSummaryItem[] {
	const summary = { running: 0, done: 0, stopped: 0, error: 0 }
	for (const rootTask of params.rootTaskViews) {
		if (!params.rootTaskHasTodos[rootTask.rootTaskId]) {
			continue
		}
		summary[rootTask.status] += 1
	}

	// kilocode_change start
	const items = [
		{ status: "done" as const, label: params.t("status.done"), count: summary.done },
		{ status: "running" as const, label: params.t("status.running"), count: summary.running },
		{ status: "stopped" as const, label: params.t("status.stopped"), count: summary.stopped },
		{ status: "error" as const, label: params.t("status.error"), count: summary.error },
	] satisfies RootTaskStatusSummaryItem[]
	// kilocode_change end

	return items.filter((item) => item.count > 0)
}

export function SessionSidebar() {
	const { t } = useTranslation("agentManager")
	const { focusedRootTaskId } = useExtensionState()
	const sessions = useAtomValue(mergedSessionsAtom)
	const rootTaskViews = useAtomValue(rootTaskViewsAtom)
	const rootTaskHasTodos = useAtomValue(rootTaskHasTodosAtom)
	const topLevelGroupRootIds = useAtomValue(topLevelGroupRootIdsAtom)
	const visibleSessionGroups = useAtomValue(visibleSessionGroupsAtom)
	const visibleStandaloneSessions = useAtomValue(visibleStandaloneSessionsAtom)
	const effectiveSelectedRootTaskIdFromState = useAtomValue(effectiveSelectedRootTaskIdAtom)
	// kilocode_change start
	const subtreeRollupByGroup = useAtomValue(subtreeRollupByGroupAtom)
	const groupUiMetaByGroup = useAtomValue(groupUiMetaByGroupAtom)
	// kilocode_change end
	const pendingSession = useAtomValue(pendingSessionAtom)
	const schedulerState = useAtomValue(schedulerStateAtom)
	const [selectedId, setSelectedId] = useAtom(selectedSessionIdAtom)
	const [selectedRootTaskId, setSelectedRootTaskId] = useAtom(selectedRootTaskIdAtom)
	const isRefreshing = useAtomValue(isRefreshingRemoteSessionsAtom)
	const setIsRefreshing = useSetAtom(isRefreshingRemoteSessionsAtom)
	const machineUiState = useAtomValue(sessionMachineUiStateAtom)
	const [showOptionsMenu, setShowOptionsMenu] = useState(false)
	const [visitedRootTaskIds, setVisitedRootTaskIds] = useState<Record<string, true>>({})
	const menuRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const rootTaskStatusSummaryItems = useMemo(
		() => buildRootTaskStatusSummaryItems({ rootTaskViews, rootTaskHasTodos, t }),
		[rootTaskHasTodos, rootTaskViews, t],
	)
	const rootTaskStatusSummary = useMemo(() => {
		const summary = { running: 0, done: 0, stopped: 0, error: 0 }
		for (const rootTask of rootTaskViews) {
			if (!rootTaskHasTodos[rootTask.rootTaskId]) {
				continue
			}
			summary[rootTask.status] += 1
		}
		const parts: string[] = []
		if (summary.done > 0) parts.push(`${t("status.done")} ${summary.done}`)
		if (summary.running > 0) parts.push(`${t("status.running")} ${summary.running}`)
		if (summary.stopped > 0) parts.push(`${t("status.stopped")} ${summary.stopped}`)
		if (summary.error > 0) parts.push(`${t("status.error")} ${summary.error}`)
		return parts.join(" Р’В· ")
	}, [rootTaskHasTodos, rootTaskViews, t])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				buttonRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setShowOptionsMenu(false)
			}
		}

		if (showOptionsMenu) {
			document.addEventListener("mousedown", handleClickOutside)
			return () => document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [showOptionsMenu])

	const handleNewSession = () => setSelectedId(null)
	const handleSelectSession = (id: string) => {
		setSelectedId(id)
		vscode.postMessage({ type: "agentManager.selectSession", sessionId: id })
	}
	const handleRefresh = () => {
		if (!isRefreshing) {
			setIsRefreshing(true)
			vscode.postMessage({ type: "agentManager.refreshRemoteSessions" })
		}
	}
	const handleSelectRootTask = (rootTaskId: string) => {
		setVisitedRootTaskIds((prev) => ({ ...prev, [rootTaskId]: true }))
		setSelectedRootTaskId(rootTaskId)
		vscode.postMessage({ type: "showTaskWithId", text: rootTaskId })
		const matchingSession = sessions.find(
			(session) => getEffectiveRootTaskId(session, topLevelGroupRootIds) === rootTaskId,
		)
		if (matchingSession) {
			handleSelectSession(matchingSession.sessionId)
		}
	}
	const effectiveSelectedRootTaskId = focusedRootTaskId ?? effectiveSelectedRootTaskIdFromState
	useEffect(() => {
		if ((selectedRootTaskId ?? null) !== (effectiveSelectedRootTaskId ?? null)) {
			setSelectedRootTaskId(effectiveSelectedRootTaskId ?? null)
		}
	}, [effectiveSelectedRootTaskId, selectedRootTaskId, setSelectedRootTaskId])

	useEffect(() => {
		if (effectiveSelectedRootTaskId) {
			setVisitedRootTaskIds((prev) =>
				prev[effectiveSelectedRootTaskId] ? prev : { ...prev, [effectiveSelectedRootTaskId]: true },
			)
		}
	}, [effectiveSelectedRootTaskId])

	return (
		<div className="am-sidebar">
			<div className="am-sidebar-header">
				<span>{t("sidebar.title")}</span>
				<div className="am-options-menu-container">
					<button
						ref={buttonRef}
						className="am-icon-btn"
						onClick={() => setShowOptionsMenu(!showOptionsMenu)}
						title={t("sidebar.options")}>
						<MoreVertical size={14} />
					</button>
					{showOptionsMenu && (
						<div ref={menuRef} className="am-options-dropdown" role="menu">
							<button
								className="am-options-item"
								onClick={() => vscode.postMessage({ type: "agentManager.configureSetupScript" })}
								role="menuitem">
								<FileCode size={14} />
								<span>{t("sidebar.configureSetupScript")}</span>
							</button>
						</div>
					)}
				</div>
			</div>

			<div
				className={`am-new-agent-item ${selectedId === null && !pendingSession ? "am-selected" : ""}`}
				onClick={handleNewSession}
				role="button"
				tabIndex={0}>
				<Plus size={16} />
				<span>{t("sidebar.newAgent")}</span>
			</div>

			<div className="am-sidebar-section-header">
				<span>{t("sidebar.sessionsSection")}</span>
				<button
					className="am-icon-btn"
					onClick={handleRefresh}
					disabled={isRefreshing}
					title={t("sidebar.refresh")}>
					{isRefreshing ? <Loader2 size={14} className="am-spinning" /> : <RefreshCw size={14} />}
				</button>
			</div>

			<div className="am-session-list">
				{rootTaskViews.length > 0 && (
					<div className="am-no-sessions" data-testid="agent-root-switcher">
						{rootTaskStatusSummary && (
							<div className="am-root-task-rollup" data-testid="agent-root-status-summary">
								{rootTaskStatusSummaryItems.map((item, index) => (
									<React.Fragment key={item.status}>
										{index > 0 && (
											<span className="am-root-task-rollup-separator" aria-hidden="true">
												·
											</span>
										)}
										<span
											className={`am-root-task-rollup-segment am-root-task-rollup-${item.status}`}
											data-testid={`agent-root-status-summary-${item.status}`}>
											{item.label} {item.count}
										</span>
									</React.Fragment>
								))}
							</div>
						)}
						<div className="am-root-task-list">
							{rootTaskViews.map((rootTask) => {
								const isSelected = effectiveSelectedRootTaskId === rootTask.rootTaskId
								const isVisited = Boolean(visitedRootTaskIds[rootTask.rootTaskId])
								const showStatusBadge = Boolean(rootTaskHasTodos[rootTask.rootTaskId])
								const badgeClassName = [
									"am-root-task-status-badge",
									`am-root-task-status-${rootTask.status}`,
									rootTask.status === "done" && isVisited ? "am-root-task-status-seen" : "",
								]
									.filter(Boolean)
									.join(" ")
								return (
									<button
										key={rootTask.rootTaskId}
										type="button"
										className={`am-root-task-item ${isSelected ? "am-root-task-item-selected" : ""}`}
										onClick={() => handleSelectRootTask(rootTask.rootTaskId)}
										data-testid={`agent-root-switch-${rootTask.rootTaskId}`}
										title={rootTask.label}>
										<span className="am-root-task-label">{rootTask.label}</span>
										{showStatusBadge && (
											<span
												className={badgeClassName}
												data-testid={`agent-root-status-${rootTask.rootTaskId}`}>
												{getRootTaskStatusLabel(rootTask.status, t)}
											</span>
										)}
									</button>
								)
							})}
						</div>
					</div>
				)}
				{schedulerState?.backpressure && (
					<div className="am-no-sessions" data-testid="scheduler-backpressure">
						<p>
							{t("sidebar.launchQueue", {
								queued: schedulerState.queuedLaunchCount,
								active: schedulerState.activeSessionLoad,
								max: schedulerState.maxConcurrentStarts,
							})}
							{schedulerState.maxConcurrentPerQueueKey
								? ` Р’В· ${t("sidebar.perGroupLimit", { count: schedulerState.maxConcurrentPerQueueKey })}`
								: ""}
						</p>
					</div>
				)}

				{pendingSession && (
					<PendingSessionItem
						pendingSession={pendingSession}
						isSelected={selectedId === null}
						onSelect={() => setSelectedId(null)}
					/>
				)}

				{visibleSessionGroups.length === 0 && visibleStandaloneSessions.length === 0 && !pendingSession ? (
					<div className="am-no-sessions">{t("sidebar.emptyState")}</div>
				) : (
					<>
						{buildSessionGroupTreeRows(visibleSessionGroups).map(({ group, depth }) => (
							<SessionGroupItem
								key={group.groupId}
								group={group}
								depth={depth}
								selectedId={selectedId}
								onSelect={handleSelectSession}
								maxConcurrentPerQueueKey={schedulerState?.maxConcurrentPerQueueKey}
								// kilocode_change start
								subtreeRollup={subtreeRollupByGroup[group.groupId]}
								// kilocode_change end
								groupUiMeta={groupUiMetaByGroup[group.groupId]}
							/>
						))}
						{visibleStandaloneSessions.map((session) => (
							<SessionItem
								key={session.sessionId}
								session={session}
								isSelected={selectedId === session.sessionId}
								uiState={machineUiState[session.sessionId]}
								onSelect={() => handleSelectSession(session.sessionId)}
							/>
						))}
					</>
				)}
			</div>
		</div>
	)
}

function SessionGroupItem({
	group,
	depth,
	selectedId,
	onSelect,
	maxConcurrentPerQueueKey,
	// kilocode_change start
	subtreeRollup,
	// kilocode_change end
	groupUiMeta,
}: {
	group: SessionGroupView
	depth: number
	selectedId: string | null
	onSelect: (id: string) => void
	maxConcurrentPerQueueKey?: number
	// kilocode_change start
	subtreeRollup?: {
		descendantGroupIds: string[]
		summaryLabel?: string
		pressureLabel?: string
		problemLabel?: string
		relayLabel?: string
		guardrailLabel?: string
		problematicDescendantGroupIds: string[]
	}
	// kilocode_change end
	groupUiMeta?: import("../state/atoms/sessions").SessionGroupUiMeta
}) {
	const { t } = useTranslation("agentManager")
	const anySelected = group.sessions.some((session) => session.sessionId === selectedId)
	const runningCount = group.sessions.filter(
		(session) => session.status === "running" || session.status === "creating",
	).length
	const queuedCount = Math.max(
		(group.sessions[0]?.sessionGroup?.sessionCount ?? group.sessions.length) - group.sessions.length,
		0,
	)
	const groupBudget = maxConcurrentPerQueueKey ? `${runningCount}/${maxConcurrentPerQueueKey}` : undefined
	const pressureLabel = groupUiMeta?.pressureLabel
	const relayLabel = groupUiMeta?.relayLabel
	const guardrailLabel = groupUiMeta?.guardrailLabel
	const relayPolicyLabel = groupUiMeta?.relayPolicyLabel
	const stopReasonLabel = groupUiMeta?.stopReasonLabel
	const statusLabel = groupUiMeta?.statusLabel
	const problematicSession = groupUiMeta?.problematicSessionId
		? group.sessions.find((session) => session.sessionId === groupUiMeta.problematicSessionId)
		: undefined
	const problematicSessionCount = groupUiMeta?.problematicSessionCount ?? 0
	// kilocode_change start
	const descendantGroupIds = subtreeRollup?.descendantGroupIds ?? []
	const subtreeSummaryLabel = subtreeRollup?.summaryLabel
	const subtreePressureLabel = subtreeRollup?.pressureLabel
	const subtreeProblemLabel = subtreeRollup?.problemLabel
	const subtreeRelayLabel = subtreeRollup?.relayLabel
	const subtreeGuardrailLabel = subtreeRollup?.guardrailLabel
	const problematicSubtreeGroupIds = subtreeRollup?.problematicDescendantGroupIds ?? []
	// kilocode_change end
	const problematicSubtreeGroupIdsExcludingSelf = problematicSubtreeGroupIds.filter(
		(groupId) => groupId !== group.groupId,
	)
	const showRestartPolicy = groupUiMeta?.showRestartPolicy ?? false
	const isPressureSaturated = groupUiMeta?.isPressureSaturated ?? false
	const restartPolicyLabel = groupUiMeta?.restartPolicyLabel
	const autoRestartLabel = groupUiMeta?.autoRestartLabel
	const branchSummaryLabel = groupUiMeta?.branchSummaryLabel
	const groupTaskLinkageLabel = groupUiMeta?.taskLinkageLabel
	const rootRelayContent = buildGroupRootRelayContent({ group, problematicSession, compact: false })
	const compactRootRelayContent = buildGroupRootRelayContent({ group, problematicSession, compact: true })
	const groupRelayContent = rootRelayContent
	const compactGroupRelayContent = compactRootRelayContent
	const canBroadcastToRootTask = !!(rootRelayContent || compactRootRelayContent)
	const canBroadcastToGroup = !!(groupRelayContent || compactGroupRelayContent)
	const relayWillCompactUnderPressure = Boolean(relayPolicyLabel)

	return (
		<div
			className={`am-session-item ${anySelected ? "am-selected" : ""}`}
			onClick={() => onSelect(group.rootSessionId)}
			style={getGroupIndentStyle(depth)}
			data-testid={`group-item-${group.groupId}`}>
			<div className="am-session-content">
				<div className="am-session-label">
					{depth > 0 ? `${String.fromCharCode(0x21b3)} ${group.label}` : group.label}
				</div>
				<div className="am-session-meta">
					<Layers size={10} />
					<span>{t("sidebar.sessionCount", { count: group.sessions.length })}</span>
					{branchSummaryLabel && (
						<span data-testid={`group-branch-summary-${group.groupId}`}>{branchSummaryLabel}</span>
					)}
					{groupTaskLinkageLabel && (
						<span data-testid={`group-task-linkage-${group.groupId}`}>{groupTaskLinkageLabel}</span>
					)}
					{subtreeSummaryLabel && (
						<span data-testid={`group-subtree-summary-${group.groupId}`}>{subtreeSummaryLabel}</span>
					)}
					{subtreePressureLabel && (
						<span data-testid={`group-subtree-pressure-${group.groupId}`}>{subtreePressureLabel}</span>
					)}
					{subtreeProblemLabel && (
						<span data-testid={`group-subtree-problems-${group.groupId}`}>{subtreeProblemLabel}</span>
					)}
					{subtreeRelayLabel && (
						<span data-testid={`group-subtree-relay-${group.groupId}`}>{subtreeRelayLabel}</span>
					)}
					{subtreeGuardrailLabel && (
						<span data-testid={`group-subtree-guardrail-${group.groupId}`}>{subtreeGuardrailLabel}</span>
					)}

					{groupBudget && <span>{t("sidebar.budgetLabel", { value: groupBudget })}</span>}
					{queuedCount > 0 && <span>{t("sidebar.queuedLabel", { count: queuedCount })}</span>}
					{pressureLabel && <span data-testid={`group-pressure-${group.groupId}`}>{pressureLabel}</span>}
					{guardrailLabel && <span data-testid={`group-guardrail-${group.groupId}`}>{guardrailLabel}</span>}
					{relayLabel && <span data-testid={`group-relay-${group.groupId}`}>{relayLabel}</span>}
					{relayPolicyLabel && (
						<span data-testid={`group-relay-policy-${group.groupId}`}>{relayPolicyLabel}</span>
					)}
					{stopReasonLabel && (
						<span data-testid={`group-stop-reason-${group.groupId}`}>{stopReasonLabel}</span>
					)}
					{restartPolicyLabel && (
						<span data-testid={`group-restart-policy-${group.groupId}`}>{restartPolicyLabel}</span>
					)}
					{autoRestartLabel && (
						<span data-testid={`group-auto-restart-${group.groupId}`}>{autoRestartLabel}</span>
					)}
					{statusLabel && <span data-testid={`group-status-${group.groupId}`}>{t(statusLabel)}</span>}
				</div>
			</div>
			<div style={{ display: "flex", gap: 4 }}>
				{isPressureSaturated && problematicSession && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.restartSession",
								sessionId: problematicSession.sessionId,
							})
						}}
						title="Restart branch"
						data-testid={`group-restart-${group.groupId}`}>
						<RotateCcw size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.restartSessionCompact",
								sessionId: problematicSession.sessionId,
							})
						}}
						title="Restart compactly"
						data-testid={`group-restart-compact-${group.groupId}`}>
						<Layers size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSessionCount > 1 && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.restartSessionGroupCompact",
								groupId: group.groupId,
							})
						}}
						title="Restart problematic branches compactly"
						data-testid={`group-restart-all-compact-${group.groupId}`}>
						<Layers size={12} />
					</button>
				)}
				{problematicSubtreeGroupIdsExcludingSelf.length > 0 && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							for (const subtreeGroupId of problematicSubtreeGroupIdsExcludingSelf) {
								vscode.postMessage({
									type: "agentManager.restartSessionGroupCompact",
									groupId: subtreeGroupId,
								})
							}
						}}
						title="Restart problematic descendant branches compactly"
						data-testid={`group-restart-subtree-compact-${group.groupId}`}>
						<Layers size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.setSessionAutoRestart",
								sessionId: problematicSession.sessionId,
								enabled: problematicSession.autoRestartEnabled === false,
							})
						}}
						title={
							problematicSession.autoRestartEnabled === false
								? "Enable auto-restart"
								: "Disable auto-restart"
						}
						data-testid={`group-toggle-auto-restart-${group.groupId}`}>
						<X size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && canBroadcastToGroup && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.broadcastToGroup",
								sessionId: problematicSession.sessionId,
								content: groupRelayContent,
								includeSender: false,
							})
						}}
						title={
							relayWillCompactUnderPressure
								? "Share handoff with sibling branches (auto-compact under pressure)"
								: "Share handoff with sibling branches"
						}
						data-testid={`group-broadcast-siblings-${group.groupId}`}>
						<Share2 size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && canBroadcastToGroup && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.broadcastToGroup",
								sessionId: problematicSession.sessionId,
								content: compactGroupRelayContent,
								includeSender: false,
							})
						}}
						title="Share compact handoff with sibling branches"
						data-testid={`group-broadcast-siblings-compact-${group.groupId}`}>
						<Layers size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && canBroadcastToRootTask && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.broadcastToRootTask",
								sessionId: problematicSession.sessionId,
								content: rootRelayContent,
								includeSender: false,
								compact: false,
							})
						}}
						title={
							relayWillCompactUnderPressure
								? "Share handoff with root branches (auto-compact under pressure)"
								: "Share handoff with root branches"
						}
						data-testid={`group-broadcast-root-${group.groupId}`}>
						<Share2 size={12} />
					</button>
				)}
				{showRestartPolicy && problematicSession && canBroadcastToRootTask && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							vscode.postMessage({
								type: "agentManager.broadcastToRootTask",
								sessionId: problematicSession.sessionId,
								content: compactRootRelayContent,
								includeSender: false,
								compact: true,
							})
						}}
						title="Share compact handoff with root branches"
						data-testid={`group-broadcast-root-compact-${group.groupId}`}>
						<Layers size={12} />
					</button>
				)}
				{runningCount > 0 && (
					<button
						className="am-icon-btn"
						onClick={(event) => {
							event.stopPropagation()
							for (const targetGroupId of [group.groupId, ...descendantGroupIds]) {
								vscode.postMessage({ type: "agentManager.stopSessionGroup", groupId: targetGroupId })
							}
						}}
						title="Stop group"
						data-testid={`group-stop-${group.groupId}`}>
						<Square size={12} />
					</button>
				)}
			</div>
		</div>
	)
}

function PendingSessionItem({
	pendingSession,
	isSelected,
	onSelect,
}: {
	pendingSession: { label: string; startTime: number }
	isSelected: boolean
	onSelect: () => void
}) {
	const { t } = useTranslation("agentManager")
	return (
		<div className={`am-session-item pending ${isSelected ? "am-selected" : ""}`} onClick={onSelect}>
			<div className="am-status-icon creating" title={t("status.creating")}>
				<Loader2 size={14} className="am-spinning" />
			</div>
			<div className="am-session-content">
				<div className="am-session-label">{pendingSession.label}</div>
				<div className="am-session-meta">{t("status.creating")}</div>
			</div>
		</div>
	)
}

function SessionItem({
	session,
	isSelected,
	uiState,
	onSelect,
}: {
	session: AgentSession
	isSelected: boolean
	uiState: { showSpinner: boolean; isActive: boolean } | undefined
	onSelect: () => void
}) {
	const { t } = useTranslation("agentManager")
	const timeLabels = useMemo(() => createRelativeTimeLabels(t), [t])
	const showSpinner = uiState?.showSpinner ?? false
	const isWorktree = session.parallelMode?.enabled
	const branchName = session.parallelMode?.branch
	const showRecoveryActions = session.status === "error" || session.status === "stopped" || !!session.lastStopSummary
	const restartPolicyLabel =
		session.restartLimit !== undefined ? `restarts ${session.restartCount ?? 0}/${session.restartLimit}` : undefined
	const autoRestartLabel =
		session.autoRestartEnabled !== undefined
			? `auto-restart ${session.autoRestartEnabled ? "on" : "off"}`
			: undefined
	const taskLinkageLabel = getTaskLinkageLabel(session)

	return (
		<div className={`am-session-item ${isSelected ? "am-selected" : ""}`} onClick={onSelect}>
			<div className="am-session-content">
				<div className="am-session-label">{session.label}</div>
				<div className="am-session-meta">
					{showSpinner && <Loader2 size={12} className="am-spinning" />}
					<span>{formatRelativeTime(session.startTime, timeLabels)}</span>
					{isWorktree ? (
						<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<GitBranch size={10} />
							{branchName || t("sidebar.worktree")}
						</span>
					) : (
						<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<Folder size={10} />
							{t("sidebar.local")}
						</span>
					)}
					{restartPolicyLabel && (
						<span data-testid={`session-restart-policy-${session.sessionId}`}>{restartPolicyLabel}</span>
					)}
					{autoRestartLabel && (
						<span data-testid={`session-auto-restart-${session.sessionId}`}>{autoRestartLabel}</span>
					)}
					{taskLinkageLabel && (
						<span data-testid={`session-task-linkage-${session.sessionId}`}>{taskLinkageLabel}</span>
					)}
				</div>
			</div>
			<div style={{ display: "flex", gap: 4 }}>
				{showRecoveryActions && (
					<>
						<button
							className="am-icon-btn"
							onClick={(event) => {
								event.stopPropagation()
								vscode.postMessage({
									type: "agentManager.restartSession",
									sessionId: session.sessionId,
								})
							}}
							data-testid={`session-restart-${session.sessionId}`}
							title="Restart branch">
							<RotateCcw size={12} />
						</button>
						<button
							className="am-icon-btn"
							onClick={(event) => {
								event.stopPropagation()
								vscode.postMessage({
									type: "agentManager.restartSessionCompact",
									sessionId: session.sessionId,
								})
							}}
							data-testid={`session-restart-compact-${session.sessionId}`}
							title="Restart compactly">
							<Layers size={12} />
						</button>
						<button
							className="am-icon-btn"
							onClick={(event) => {
								event.stopPropagation()
								vscode.postMessage({
									type: "agentManager.setSessionAutoRestart",
									sessionId: session.sessionId,
									enabled: session.autoRestartEnabled === false,
								})
							}}
							data-testid={`session-toggle-auto-restart-${session.sessionId}`}
							title={
								session.autoRestartEnabled === false ? "Enable auto-restart" : "Disable auto-restart"
							}>
							<X size={12} />
						</button>
					</>
				)}
			</div>
		</div>
	)
}
