// kilocode_change - new file
import type { ActivityItem, HistoryItem } from "@roo-code/types"

export type OrchestrationStatus = "queued" | "running" | "paused" | "recoverable" | "completed" | "cancelled" | "failed"

export interface OrchestrationExplainabilityEntry {
	title: string
	detail: string
}

export interface OrchestrationChildTask {
	id: string
	label: string
	status: OrchestrationStatus
	isBackground: boolean
	sessionId?: string
	explanation?: OrchestrationExplainabilityEntry[]
}

export interface OrchestrationStatusSummary {
	status: OrchestrationStatus
	counts: Record<OrchestrationStatus, number>
	hasActivity: boolean
	hasSignals: boolean
	hasStatusSignals: boolean
}

export interface ActivityGroup {
	id: string
	label: "backgroundActions" | "subagents" | "timeline"
	items: ActivityItem[]
}

// kilocode_change start
function buildActivityByTaskId(activity: ActivityItem[] | undefined): Map<string, ActivityItem[]> {
	const activityByTaskId = new Map<string, ActivityItem[]>()

	for (const item of activity ?? []) {
		const existing = activityByTaskId.get(item.taskId) ?? []
		existing.push(item)
		activityByTaskId.set(item.taskId, existing)
	}

	return activityByTaskId
}
// kilocode_change end

// kilocode_change start
export const orchestrationStatusLabelKeys: Record<OrchestrationStatus, string> = {
	queued: "chat:orchestration.status.queued",
	running: "chat:orchestration.status.running",
	paused: "chat:orchestration.status.paused",
	recoverable: "chat:orchestration.status.recoverable",
	completed: "chat:orchestration.status.completed",
	cancelled: "chat:orchestration.status.cancelled",
	failed: "chat:orchestration.status.failed",
}

export const orchestrationStatusDefaultLabels: Record<OrchestrationStatus, string> = {
	queued: "Queued",
	running: "Running",
	paused: "Paused",
	recoverable: "Recoverable",
	completed: "Completed",
	cancelled: "Cancelled",
	failed: "Failed",
}

export const orchestrationStatusCountLabelKeys: Record<OrchestrationStatus, string> = {
	queued: "chat:orchestration.queuedCount",
	running: "chat:orchestration.runningCount",
	paused: "chat:orchestration.pausedCount",
	recoverable: "chat:orchestration.recoverableCount",
	completed: "chat:orchestration.completedCount",
	cancelled: "chat:orchestration.cancelledCount",
	failed: "chat:orchestration.failedCount",
}

const orchestrationStatusCountDisplayOrder: readonly OrchestrationStatus[] = [
	"failed",
	"running",
	"recoverable",
	"paused",
	"queued",
	"cancelled",
	"completed",
]

export const orchestrationGroupDefaultLabels: Record<ActivityGroup["label"], string> = {
	backgroundActions: "Background Actions",
	subagents: "Subagents",
	timeline: "Timeline",
}

export function getOrchestrationCountDefaultLabel(status: OrchestrationStatus, count: number) {
	return `${count} ${status}`
}
// kilocode_change end

const DEFAULT_COUNTS: Record<OrchestrationStatus, number> = {
	queued: 0,
	running: 0,
	paused: 0,
	recoverable: 0,
	completed: 0,
	cancelled: 0,
	failed: 0,
}

// kilocode_change start
export function getVisibleOrchestrationCounts(counts: Record<OrchestrationStatus, number>) {
	const visibleStatuses = orchestrationStatusCountDisplayOrder.filter((status) => {
		if (status === "completed") {
			return (
				counts.completed > 0 &&
				counts.running === 0 &&
				counts.queued === 0 &&
				counts.paused === 0 &&
				counts.recoverable === 0 &&
				counts.cancelled === 0 &&
				counts.failed === 0
			)
		}

		return counts[status] > 0
	})

	if (visibleStatuses.length === 1 && counts[visibleStatuses[0]] === 1) {
		return []
	}

	return visibleStatuses.map((status) => ({
		status,
		count: counts[status],
	}))
}

export function getChildTasksWithoutDetailedActivity(params: {
	childTasks: OrchestrationChildTask[]
	activity?: ActivityItem[]
}) {
	const { childTasks, activity } = params
	const representedChildTaskIds = new Set(
		getLatestStatusActivityItems(activity)
			.filter((item) => item.kind === "subagent" || item.kind === "taskControl")
			.map((item) => item.taskId),
	)

	return childTasks.filter((child) => !representedChildTaskIds.has(child.id))
}
// kilocode_change end

function getActivityIdentity(item: ActivityItem): string {
	switch (item.kind) {
		case "toolBatch":
			return `toolBatch:${item.taskId}:${item.requestId}`
		case "subagent":
			return `subagent:${item.taskId}:${item.sessionId ?? item.taskId}`
		case "taskControl":
			return `taskControl:${item.taskId}`
		case "relay":
			return `relay:${item.taskId}:${item.id}`
		case "techDebt":
			return `techDebt:${item.taskId}:${item.itemId}`
	}
}

function getLatestActivityItems(
	activity: ActivityItem[] | undefined,
	predicate: (item: ActivityItem) => boolean = () => true,
): ActivityItem[] {
	const latestByIdentity = new Map<string, ActivityItem>()

	for (const item of activity ?? []) {
		if (!predicate(item)) {
			continue
		}

		const identity = getActivityIdentity(item)
		const existing = latestByIdentity.get(identity)
		if (!existing || existing.timestamp <= item.timestamp) {
			latestByIdentity.set(identity, item)
		}
	}

	return [...latestByIdentity.values()].sort((left, right) => left.timestamp - right.timestamp)
}

function isStatusBearingActivityItem(item: ActivityItem): boolean {
	if (item.kind === "techDebt") {
		return false
	}

	if (item.kind === "relay") {
		return item.status === "blocked"
	}

	return true
}

function getLatestStatusActivityItems(activity: ActivityItem[] | undefined): ActivityItem[] {
	return getLatestActivityItems(activity, isStatusBearingActivityItem)
}

export function getExplainabilityEntries(item: ActivityItem | undefined): OrchestrationExplainabilityEntry[] {
	const explainability = item?.kind === "subagent" ? item.explainability : undefined
	if (!explainability) {
		return []
	}

	const entries: OrchestrationExplainabilityEntry[] = []

	if (explainability.stage === "delegation") {
		const routeParts = [
			explainability.execution === "background" ? "background" : "foreground",
			explainability.mode,
		]
			.filter(Boolean)
			.join(" · ")
		entries.push({
			title: "Route",
			detail: routeParts || explainability.reasonCode,
		})
		if (explainability.profileClass || explainability.helperProfile) {
			entries.push({
				title: "Helper",
				detail: [explainability.profileClass, explainability.helperProfile].filter(Boolean).join(" · "),
			})
		}
		entries.push({
			title: "Why",
			detail: explainability.recommendationReasonCode ?? explainability.reasonCode,
		})
		return entries
	}

	if (explainability.stage === "status") {
		entries.push({
			title: "Status",
			detail: explainability.outcomeSummary ?? explainability.reasonCode,
		})
		return entries
	}

	entries.push({
		title: "Outcome",
		detail: explainability.outcomeSummary ?? explainability.reasonCode,
	})
	if (explainability.recommendationReasonCode) {
		entries.push({
			title: "Reason",
			detail: explainability.recommendationReasonCode,
		})
	}
	return entries
}

export function normalizeActivityStatus(item: ActivityItem): OrchestrationStatus {
	if (item.kind === "subagent") {
		switch (item.status) {
			case "queued":
				return "queued"
			case "running":
				return "running"
			case "paused":
				return "paused"
			case "completed":
				return "completed"
			case "cancelled":
				return "cancelled"
			case "failed":
				return "failed"
		}
	}

	if (item.kind === "toolBatch") {
		switch (item.status) {
			case "started":
			case "progress":
				return "running"
			case "completed":
				return "completed"
			case "failed":
				return "failed"
		}
	}

	if (item.kind === "taskControl") {
		switch (item.control) {
			case "pause":
				return "paused"
			case "resume":
			case "continue":
				return "running"
			case "branch":
				return "completed"
		}
	}

	if (item.kind === "relay") {
		switch (item.status) {
			case "blocked":
				return "failed"
			case "delivered":
			default:
				return "completed"
		}
	}

	if (item.kind === "techDebt") {
		switch (item.status) {
			case "dismissed":
				return "failed"
			case "accepted":
				return "running"
			default:
				return "completed"
		}
	}

	return "completed"
}

export function getActivityGroups(activity: ActivityItem[] | undefined): ActivityGroup[] {
	if (!activity?.length) {
		return []
	}

	const sorted = [...activity].sort((left, right) => left.timestamp - right.timestamp)
	const backgroundActions = getLatestActivityItems(sorted, (item) => item.kind === "toolBatch")
	const subagents = getLatestActivityItems(sorted, (item) => item.kind === "subagent")
	const timeline = sorted.filter(
		(item) => item.kind === "taskControl" || item.kind === "techDebt" || item.kind === "relay",
	)
	const groups: ActivityGroup[] = []

	if (backgroundActions.length > 0) {
		groups.push({ id: "background-actions", label: "backgroundActions", items: backgroundActions })
	}
	if (subagents.length > 0) {
		groups.push({ id: "subagents", label: "subagents", items: subagents })
	}
	if (timeline.length > 0) {
		groups.push({ id: "timeline", label: "timeline", items: timeline })
	}

	return groups
}

function resolveSummaryStatus(counts: Record<OrchestrationStatus, number>): OrchestrationStatus {
	return counts.failed
		? "failed"
		: counts.running
			? "running"
			: counts.recoverable
				? "recoverable"
				: counts.paused
					? "paused"
					: counts.queued
						? "queued"
						: counts.cancelled
							? "cancelled"
							: counts.completed
								? "completed"
								: "completed"
}

export function getActivityStatusSummary(activity: ActivityItem[] | undefined): OrchestrationStatusSummary {
	const latestStatusItems = getLatestStatusActivityItems(activity)
	const counts = { ...DEFAULT_COUNTS }

	for (const item of latestStatusItems) {
		counts[normalizeActivityStatus(item)] += 1
	}

	const hasActivity = (activity?.length ?? 0) > 0
	const hasStatusSignals = latestStatusItems.length > 0

	return {
		status: resolveSummaryStatus(counts),
		counts,
		hasActivity,
		hasSignals: hasActivity,
		hasStatusSignals,
	}
}

// kilocode_change start
export function getHistoryItemOrchestrationStatus(
	item: HistoryItem,
	activityByTaskId?: Map<string, ActivityItem[]>,
): OrchestrationStatus {
	const itemActivity = activityByTaskId?.get(item.id) ?? item.activity ?? []
	const summary = getActivityStatusSummary(itemActivity)
	if (summary.hasStatusSignals) {
		return summary.status
	}

	if (item.lifecycleState === "paused" && item.lastStopReason === "streaming_failed") {
		return "recoverable"
	}

	switch (item.lifecycleState) {
		case "paused":
			return "paused"
		case "completed":
			return "completed"
		case "cancelled":
			return "cancelled"
		case "running":
			return "running"
	}

	switch (item.status) {
		case "completed":
			return "completed"
		case "aborted":
			return "cancelled"
		case "delegated":
		case "active":
			return "running"
		default:
			return "queued"
	}
}

export function isBackgroundOrchestrationChild(
	item: HistoryItem,
	activityByTaskId?: Map<string, ActivityItem[]>,
): boolean {
	const itemActivity = activityByTaskId?.get(item.id) ?? item.activity ?? []
	return item.execution === "background" || itemActivity.some((activityItem) => activityItem.kind === "subagent")
}
// kilocode_change end

export function getBackgroundChildTasks(params: {
	currentTaskItem?: HistoryItem
	taskHistory?: HistoryItem[]
	currentTaskActivity?: ActivityItem[]
}): OrchestrationChildTask[] {
	const { currentTaskItem, taskHistory = [], currentTaskActivity = [] } = params
	if (!currentTaskItem?.id) {
		return []
	}

	const historyById = new Map(taskHistory.map((item) => [item.id, item]))
	const activityByTaskId = buildActivityByTaskId(currentTaskActivity)

	return (currentTaskItem.childIds ?? [])
		.map((childId) => historyById.get(childId))
		.filter((child): child is HistoryItem => Boolean(child))
		.map((child) => {
			const childActivity = activityByTaskId.get(child.id) ?? []
			const subagentActivity = childActivity.find((item) => item.kind === "subagent")
			return {
				id: child.id,
				label: child.task?.trim() || child.id,
				status: getHistoryItemOrchestrationStatus(child, activityByTaskId),
				isBackground: isBackgroundOrchestrationChild(child, activityByTaskId) || Boolean(subagentActivity),
				sessionId: subagentActivity?.kind === "subagent" ? subagentActivity.sessionId : undefined,
				explanation: getExplainabilityEntries(subagentActivity),
			}
		})
		.filter((child) => child.isBackground)
}

export function getTaskOrchestrationSummary(params: {
	activity?: ActivityItem[]
	currentTaskItem?: HistoryItem
	taskHistory?: HistoryItem[]
}): OrchestrationStatusSummary {
	const { activity, currentTaskItem, taskHistory } = params
	const latestStatusItems = getLatestStatusActivityItems(activity)
	const childTasks = getBackgroundChildTasks({
		currentTaskItem,
		taskHistory,
		currentTaskActivity: activity,
	})
	const counts = { ...DEFAULT_COUNTS }
	const representedChildTaskIds = new Set(latestStatusItems.map((item) => item.taskId))

	for (const item of latestStatusItems) {
		counts[normalizeActivityStatus(item)] += 1
	}

	for (const child of childTasks) {
		if (!representedChildTaskIds.has(child.id)) {
			counts[child.status] += 1
		}
	}

	const hasActivity = (activity?.length ?? 0) > 0
	const hasStatusSignals = latestStatusItems.length > 0 || childTasks.length > 0
	const hasSignals = hasActivity || childTasks.length > 0

	return {
		status: resolveSummaryStatus(counts),
		counts,
		hasActivity,
		hasSignals,
		hasStatusSignals,
	}
}

// kilocode_change start
export function getHistoryOrchestrationSummary(taskHistory?: HistoryItem[]): OrchestrationStatusSummary {
	const historyItems = taskHistory ?? []
	const activity = historyItems.flatMap((item) => item.activity ?? [])
	const activityByTaskId = buildActivityByTaskId(activity)
	const latestStatusItems = getLatestStatusActivityItems(activity)
	const counts = { ...DEFAULT_COUNTS }
	const representedTaskIds = new Set(latestStatusItems.map((item) => item.taskId))

	for (const item of latestStatusItems) {
		counts[normalizeActivityStatus(item)] += 1
	}

	for (const item of historyItems) {
		if (!isBackgroundOrchestrationChild(item, activityByTaskId) || representedTaskIds.has(item.id)) {
			continue
		}

		counts[getHistoryItemOrchestrationStatus(item, activityByTaskId)] += 1
	}

	const hasActivity = activity.length > 0
	const hasHistorySignals = historyItems.some((item) => isBackgroundOrchestrationChild(item, activityByTaskId))
	const hasStatusSignals = latestStatusItems.length > 0 || hasHistorySignals
	const hasSignals = hasActivity || hasHistorySignals

	return {
		status: resolveSummaryStatus(counts),
		counts,
		hasActivity,
		hasSignals,
		hasStatusSignals,
	}
}
// kilocode_change end
