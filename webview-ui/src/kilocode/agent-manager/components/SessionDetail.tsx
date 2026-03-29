import React, { useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { useTranslation } from "react-i18next"
import {
	selectedSessionAtom,
	groupUiMetaByGroupAtom,
	rootTaskRollupAtom,
	pendingSessionAtom,
	sessionInputAtomFamily,
	sessionImagesAtomFamily,
} from "../state/atoms/sessions"
import { sessionMachineUiStateAtom, selectedSessionMachineStateAtom } from "../state/atoms/stateMachine"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { vscode } from "../utils/vscode"
import { formatRelativeTime, createRelativeTimeLabels } from "../utils/timeUtils"
import { Loader2, GitBranch, Folder, AlertCircle, Zap, Layers, RotateCcw, X, Terminal, Share2 } from "lucide-react"

export function SessionDetail() {
	const { t } = useTranslation("agentManager")
	const selectedSession = useAtomValue(selectedSessionAtom)
	const groupUiMetaByGroup = useAtomValue(groupUiMetaByGroupAtom)
	const rootTaskRollup = useAtomValue(rootTaskRollupAtom)
	const pendingSession = useAtomValue(pendingSessionAtom)
	const machineUiState = useAtomValue(sessionMachineUiStateAtom)
	const selectedSessionState = useAtomValue(selectedSessionMachineStateAtom)
	const prevSessionStateRef = useRef<{ id: string; status: string } | undefined>(undefined)
	// kilocode_change start
	const sessionDraftMessage = useAtomValue(sessionInputAtomFamily(selectedSession?.sessionId ?? "__no-session__"))
	const sessionDraftImages = useAtomValue(sessionImagesAtomFamily(selectedSession?.sessionId ?? "__no-session__"))
	// kilocode_change end
	const timeLabels = createRelativeTimeLabels(t)

	const rootTaskSummaryLabel = rootTaskRollup.summaryLabel
	const rootTaskPressureLabel = rootTaskRollup.pressureLabel
	const rootTaskRelayLabel = rootTaskRollup.relayLabel
	const rootTaskGuardrailLabel = rootTaskRollup.guardrailLabel
	const rootTaskProblemLabel = rootTaskRollup.problemLabel

	useEffect(() => {
		if (!selectedSession) return
		const prevState = prevSessionStateRef.current
		const currentState = { id: selectedSession.sessionId, status: selectedSession.status }
		prevSessionStateRef.current = currentState
		if (prevState?.id === currentState.id && prevState.status === "running" && currentState.status !== "running") {
			vscode.postMessage({ type: "agentManager.cancelSession", sessionId: selectedSession.sessionId })
		}
	}, [selectedSession])

	if (pendingSession && !selectedSession) {
		return <PendingSessionView pendingSession={pendingSession} />
	}
	if (!selectedSession) {
		return <NewAgentForm />
	}

	const sessionUiState = machineUiState[selectedSession.sessionId]
	const isActive = sessionUiState?.isActive ?? false
	const showSpinner = sessionUiState?.showSpinner ?? false
	const isWorktree = selectedSession.parallelMode?.enabled
	const branchName = selectedSession.parallelMode?.branch
	const isProvisionalSession = selectedSession.sessionId.startsWith("provisional-")
	const isSessionRunning = selectedSession.status === "running"
	const canFinishWorktree = !!isWorktree && isSessionRunning
	const canCreatePR = !!isWorktree && !!branchName
	const parentBranch = selectedSession.parallelMode?.parentBranch
	const shouldShowRestartContext =
		selectedSession.status === "error" || selectedSession.status === "stopped" || !!selectedSession.lastStopSummary
	const normalizedStopReason = selectedSession.lastStopReason?.replace(/_/g, " ")
	const restartPolicyLabel =
		selectedSession.restartLimit !== undefined
			? `restarts ${selectedSession.restartCount ?? 0}/${selectedSession.restartLimit}`
			: undefined
	const autoRestartLabel =
		selectedSession.autoRestartEnabled !== undefined
			? `auto-restart ${selectedSession.autoRestartEnabled ? "on" : "off"}`
			: undefined
	const selectedGroupUiMeta = selectedSession.sessionGroup?.groupId
		? groupUiMetaByGroup[selectedSession.sessionGroup.groupId]
		: undefined
	const sessionGroupSummaryLabel = selectedGroupUiMeta?.branchSummaryLabel
	const sessionPressureLabel = selectedGroupUiMeta?.pressureLabel
	const sessionRelayLabel = selectedGroupUiMeta?.relayLabel
	// kilocode_change start
	const relayCompactPolicyLabel = selectedGroupUiMeta?.relayPolicyLabel
	// kilocode_change end
	const taskLinkageLabel = selectedSession.parentTaskId
		? `subtask of ${selectedSession.parentTaskId}`
		: selectedSession.rootTaskId && selectedSession.rootTaskId !== selectedSession.taskId
			? `root ${selectedSession.rootTaskId}`
			: selectedSession.childTaskIds && selectedSession.childTaskIds.length > 0
				? `children ${selectedSession.childTaskIds.length}`
				: undefined
	const rootRelaySummary = selectedSession.lastStopSummary ?? selectedSession.restartHandoff ?? normalizedStopReason
	const rootRelayContent = rootRelaySummary
		? `Branch handoff from ${selectedSession.label}: ${rootRelaySummary}`
		: undefined
	const compactRootRelaySummary = selectedSession.lastStopSummary ?? normalizedStopReason
	const compactRootRelayContent = compactRootRelaySummary
		? `Branch handoff from ${selectedSession.label}: ${compactRootRelaySummary}`
		: undefined
	const groupRelayContent = rootRelayContent
	const compactGroupRelayContent = compactRootRelayContent
	const canBroadcastToRootTask = !!selectedSession.rootTaskId && !!(rootRelayContent || compactRootRelayContent)
	const canBroadcastToGroup =
		!!selectedSession.sessionGroup?.groupId && !!(groupRelayContent || compactGroupRelayContent)
	const relayWillCompactUnderPressure = Boolean(relayCompactPolicyLabel)
	// kilocode_change start
	const canResumeSession =
		selectedSessionState === "paused" ||
		selectedSessionState === "stopped" ||
		(!selectedSessionState && selectedSession.status === "stopped")
	const trimmedResumeDraft = sessionDraftMessage.trim()
	const hasResumeDraftImages = sessionDraftImages.length > 0
	const resumeContent = trimmedResumeDraft || selectedSession.prompt
	const handleResumeSession = () =>
		vscode.postMessage({
			type: "agentManager.resumeSession",
			sessionId: selectedSession.sessionId,
			sessionLabel: selectedSession.label,
			content: resumeContent,
			images: hasResumeDraftImages ? sessionDraftImages : undefined,
		})
	// kilocode_change end
	const handleRestartBranch = () =>
		vscode.postMessage({ type: "agentManager.restartSession", sessionId: selectedSession.sessionId })
	const handleRestartCompact = () =>
		vscode.postMessage({ type: "agentManager.restartSessionCompact", sessionId: selectedSession.sessionId })
	const handleToggleAutoRestart = () =>
		vscode.postMessage({
			type: "agentManager.setSessionAutoRestart",
			sessionId: selectedSession.sessionId,
			enabled: selectedSession.autoRestartEnabled === false,
		})
	const handleBroadcastToRootTask = () => {
		vscode.postMessage({
			type: "agentManager.broadcastToRootTask",
			sessionId: selectedSession.sessionId,
			content: rootRelayContent,
			includeSender: false,
			compact: false,
		})
	}
	const handleBroadcastCompactToRootTask = () => {
		vscode.postMessage({
			type: "agentManager.broadcastToRootTask",
			sessionId: selectedSession.sessionId,
			content: compactRootRelayContent,
			includeSender: false,
			compact: true,
		})
	}
	const handleBroadcastToGroup = () => {
		vscode.postMessage({
			type: "agentManager.broadcastToGroup",
			sessionId: selectedSession.sessionId,
			content: groupRelayContent,
			includeSender: false,
		})
	}
	const handleBroadcastCompactToGroup = () => {
		vscode.postMessage({
			type: "agentManager.broadcastToGroup",
			sessionId: selectedSession.sessionId,
			content: compactGroupRelayContent,
			includeSender: false,
		})
	}

	return (
		<div className="am-session-detail">
			<div className="am-detail-header">
				<div className="am-header-info">
					<div className="am-header-title" title={selectedSession.prompt}>
						{selectedSession.label}
					</div>
					<div className="am-header-meta">
						{showSpinner && (
							<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<Loader2 size={12} className="am-spinning" />
								<span>
									{selectedSessionState === "creating" ? t("status.creating") : t("status.running")}
								</span>
							</div>
						)}
						<span>{formatRelativeTime(selectedSession.startTime, timeLabels)}</span>
						{isWorktree ? (
							<div
								className="am-worktree-badge"
								style={{ display: "flex", alignItems: "center", gap: 4 }}
								title={branchName || t("sessionDetail.runningInWorktree")}>
								<GitBranch size={12} />
								<span>{branchName || t("sidebar.worktree")}</span>
							</div>
						) : (
							<div
								className="am-local-badge"
								style={{ display: "flex", alignItems: "center", gap: 4 }}
								title={t("sessionDetail.runningLocally")}>
								<Folder size={12} />
								<span>{t("sessionDetail.runModeLocal")}</span>
							</div>
						)}
						{sessionGroupSummaryLabel && (
							<span data-testid="session-detail-group-summary">{sessionGroupSummaryLabel}</span>
						)}
						{sessionPressureLabel && (
							<span data-testid="session-detail-group-pressure">{sessionPressureLabel}</span>
						)}
						{sessionRelayLabel && <span data-testid="session-detail-group-relay">{sessionRelayLabel}</span>}
						{relayCompactPolicyLabel && (
							<span data-testid="session-detail-relay-policy">{relayCompactPolicyLabel}</span>
						)}
						{taskLinkageLabel && <span data-testid="session-detail-task-linkage">{taskLinkageLabel}</span>}
						{rootTaskSummaryLabel && (
							<span data-testid="session-detail-root-summary">{rootTaskSummaryLabel}</span>
						)}
						{rootTaskPressureLabel && (
							<span data-testid="session-detail-root-pressure">{rootTaskPressureLabel}</span>
						)}
						{rootTaskProblemLabel && (
							<span data-testid="session-detail-root-problems">{rootTaskProblemLabel}</span>
						)}
						{rootTaskRelayLabel && (
							<span data-testid="session-detail-root-relay">{rootTaskRelayLabel}</span>
						)}
						{rootTaskGuardrailLabel && (
							<span data-testid="session-detail-root-guardrail">{rootTaskGuardrailLabel}</span>
						)}
					</div>
				</div>
				<div className="am-header-actions">
					{/* kilocode_change start */}
					{canResumeSession && (
						<button
							className="am-icon-btn"
							data-testid="resume-session-button"
							onClick={handleResumeSession}
							aria-label={t("chatInput.resumeTitle")}
							title={t("chatInput.resumeTitle")}>
							<RotateCcw size={14} />
						</button>
					)}
					{/* kilocode_change end */}
					{!isProvisionalSession && (
						<button
							className="am-icon-btn"
							onClick={() =>
								vscode.postMessage({
									type: "agentManager.showTerminal",
									sessionId: selectedSession.sessionId,
								})
							}
							aria-label={t("sessionDetail.openTerminal")}
							title={t("sessionDetail.openTerminal")}>
							<Terminal size={14} />
						</button>
					)}
				</div>
			</div>

			{selectedSession.status === "error" && selectedSession.error && (
				<div className="am-session-error-banner" role="alert">
					<AlertCircle size={16} />
					<span>{selectedSession.error}</span>
				</div>
			)}

			{shouldShowRestartContext &&
				(selectedSession.lastStopSummary || selectedSession.restartHandoff || normalizedStopReason) && (
					<div className="am-session-error-banner" data-testid="restart-handoff-card">
						<Layers size={16} />
						<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
							<strong>{t("sessionDetail.restartHandoffTitle")}</strong>
							{normalizedStopReason && (
								<span data-testid="restart-handoff-reason">
									{t("sessionDetail.restartReason", { reason: normalizedStopReason })}
								</span>
							)}
							{selectedSession.lastStopSummary && (
								<span data-testid="restart-handoff-summary">{selectedSession.lastStopSummary}</span>
							)}
							{selectedSession.restartHandoff && (
								<span data-testid="restart-handoff-text">{selectedSession.restartHandoff}</span>
							)}
							{restartPolicyLabel && (
								<span data-testid="restart-handoff-policy">{restartPolicyLabel}</span>
							)}
							{autoRestartLabel && <span data-testid="restart-handoff-auto">{autoRestartLabel}</span>}
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								<button
									className="am-icon-btn"
									data-testid="restart-branch-button"
									onClick={handleRestartBranch}
									title="Restart branch">
									<RotateCcw size={12} />
								</button>
								<button
									className="am-icon-btn"
									data-testid="restart-compact-button"
									onClick={handleRestartCompact}
									title="Restart compactly">
									<Layers size={12} />
								</button>
								<button
									className="am-icon-btn"
									data-testid="toggle-auto-restart-button"
									onClick={handleToggleAutoRestart}
									title={
										selectedSession.autoRestartEnabled === false
											? "Enable auto-restart"
											: "Disable auto-restart"
									}>
									<X size={12} />
								</button>
								{canBroadcastToGroup && (
									<button
										className="am-icon-btn"
										data-testid="broadcast-group-handoff-button"
										onClick={handleBroadcastToGroup}
										title={
											relayWillCompactUnderPressure
												? "Share handoff with sibling branches (auto-compact under pressure)"
												: "Share handoff with sibling branches"
										}>
										<Share2 size={12} />
									</button>
								)}
								{canBroadcastToGroup && (
									<button
										className="am-icon-btn"
										data-testid="broadcast-group-compact-button"
										onClick={handleBroadcastCompactToGroup}
										title="Share compact handoff with sibling branches">
										<Layers size={12} />
									</button>
								)}
								{canBroadcastToRootTask && (
									<button
										className="am-icon-btn"
										data-testid="broadcast-root-handoff-button"
										onClick={handleBroadcastToRootTask}
										title={
											relayWillCompactUnderPressure
												? "Share handoff with root branches (auto-compact under pressure)"
												: "Share handoff with root branches"
										}>
										<Share2 size={12} />
									</button>
								)}
								{canBroadcastToRootTask && (
									<button
										className="am-icon-btn"
										data-testid="broadcast-root-compact-button"
										onClick={handleBroadcastCompactToRootTask}
										title="Share compact handoff with root branches">
										<Layers size={12} />
									</button>
								)}
							</div>
						</div>
					</div>
				)}

			{isActive && (
				<div className="am-full-auto-banner">
					<Zap size={14} />
					<span>{t("sessionDetail.autoModeWarning")}</span>
				</div>
			)}

			<MessageList sessionId={selectedSession.sessionId} />
			<ChatInput
				sessionId={selectedSession.sessionId}
				sessionLabel={selectedSession.label}
				isActive={isActive}
				showCancel={isActive}
				showFinishToBranch={canFinishWorktree}
				showCreatePR={canCreatePR}
				worktreeBranchName={branchName}
				parentBranch={parentBranch}
				sessionStatus={selectedSession.status}
				modelId={selectedSession.model}
			/>
		</div>
	)
}

function PendingSessionView({
	pendingSession,
}: {
	pendingSession: { label: string; prompt: string; startTime: number }
}) {
	const { t } = useTranslation("agentManager")
	const handleCancel = () => vscode.postMessage({ type: "agentManager.cancelPendingSession" })
	return (
		<div className="am-session-detail">
			<div className="am-detail-header">
				<div className="am-header-info">
					<div className="am-header-title" title={pendingSession.prompt}>
						{pendingSession.label}
					</div>
					<div className="am-header-meta">
						<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<Loader2 size={12} className="am-spinning" />
							<span>{t("status.creating")}</span>
						</div>
					</div>
				</div>
				<div className="am-header-actions">
					<button
						className="am-icon-btn"
						onClick={handleCancel}
						aria-label={t("sessionDetail.cancelCreating")}
						title={t("sessionDetail.cancelCreating")}>
						<X size={14} />
					</button>
				</div>
			</div>
			<div className="am-center-form">
				<Loader2 size={48} className="am-spinning" style={{ opacity: 0.5 }} />
				<h2 style={{ marginTop: 16 }}>{t("sessionDetail.creatingSession")}</h2>
				<p>{t("sessionDetail.waitingForCli")}</p>
				<button className="am-cancel-btn" onClick={handleCancel} style={{ marginTop: 16 }}>
					{t("sessionDetail.cancelButton")}
				</button>
			</div>
		</div>
	)
}

function NewAgentForm() {
	return <div />
}
