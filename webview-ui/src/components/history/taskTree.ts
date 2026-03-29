// kilocode_change - new file
import type { HistoryItem } from "@roo-code/types"
import { getActivityStatusSummary, type OrchestrationStatus } from "../chat/orchestration"

export interface DisplayHistoryItem extends HistoryItem {
	highlight?: string
}

export interface TaskTreeRow {
	item: DisplayHistoryItem
	depth: number
	hasChildren: boolean
	isExpanded: boolean
	ancestorHasNextSiblings: boolean[]
	isLastSibling: boolean
}

export interface RootTaskDescendantSummary {
	totalDescendants: number
	active: number
	completed: number
	delegated: number
	aborted: number
}

export type HistoryRootTaskStatus = "running" | "done" | "stopped" | "error"

export interface RootTaskStatusSummary {
	running: number
	done: number
	stopped: number
	error: number
}

interface TaskRelationships {
	parentById: Map<string, string>
	childrenByParentId: Map<string, DisplayHistoryItem[]>
	originalIndex: Map<string, number>
}

const ERROR_STOP_REASONS = new Set<NonNullable<HistoryItem["lastStopReason"]>>([
	"streaming_failed",
	"loop_detected",
	"restart_limit_exceeded",
])

function buildTaskRelationships(items: DisplayHistoryItem[]): TaskRelationships {
	const itemById = new Map(items.map((item) => [item.id, item]))
	const originalIndex = new Map(items.map((item, index) => [item.id, index]))
	const parentById = new Map<string, string>()
	const childrenByParentId = new Map<string, DisplayHistoryItem[]>()

	for (const item of items) {
		const directParentId = item.parentTaskId
		const rootParentId = item.rootTaskId && item.rootTaskId !== item.id ? item.rootTaskId : undefined
		const parentId =
			(directParentId && itemById.has(directParentId) && directParentId) ||
			(rootParentId && itemById.has(rootParentId) && rootParentId) ||
			undefined

		if (!parentId) {
			continue
		}

		parentById.set(item.id, parentId)
		const existingChildren = childrenByParentId.get(parentId) ?? []
		existingChildren.push(item)
		childrenByParentId.set(parentId, existingChildren)
	}

	const sortByOriginalOrder = (left: DisplayHistoryItem, right: DisplayHistoryItem) =>
		(originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0)

	for (const children of childrenByParentId.values()) {
		children.sort(sortByOriginalOrder)
	}

	return {
		parentById,
		childrenByParentId,
		originalIndex,
	}
}

function isRootTask(item: DisplayHistoryItem): boolean {
	return !item.parentTaskId && (!item.rootTaskId || item.rootTaskId === item.id)
}

export function getHistoryRootTaskStatus(
	item: DisplayHistoryItem,
	params?: { runningRootTaskIds?: readonly string[] },
): HistoryRootTaskStatus {
	const isCurrentlyRunningRoot = params?.runningRootTaskIds?.includes(item.id) ?? false

	switch (item.status) {
		case "completed":
			return "done"
		case "aborted":
			return item.lastStopReason && ERROR_STOP_REASONS.has(item.lastStopReason) ? "error" : "stopped"
		case "delegated":
		case "active":
			return isCurrentlyRunningRoot ? "running" : "stopped"
		case undefined:
		default:
			return isCurrentlyRunningRoot ? "running" : "stopped"
	}
}

export function buildTaskTreeRows(items: DisplayHistoryItem[], expandedTaskIds: ReadonlySet<string>): TaskTreeRow[] {
	if (items.length === 0) {
		return []
	}

	const { parentById, childrenByParentId, originalIndex } = buildTaskRelationships(items)
	const sortByOriginalOrder = (left: DisplayHistoryItem, right: DisplayHistoryItem) =>
		(originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0)

	const roots = items.filter((item) => !parentById.has(item.id)).sort(sortByOriginalOrder)
	const rows: TaskTreeRow[] = []
	const appendedIds = new Set<string>()

	const appendItem = (
		item: DisplayHistoryItem,
		depth: number,
		lineage: Set<string>,
		ancestorHasNextSiblings: boolean[],
		isLastSibling: boolean,
	) => {
		if (lineage.has(item.id) || appendedIds.has(item.id)) {
			return
		}

		const children = childrenByParentId.get(item.id) ?? []
		const hasChildren = (item.childIds?.length ?? 0) > 0 || children.length > 0
		const isExpanded = hasChildren && expandedTaskIds.has(item.id)

		rows.push({ item, depth, hasChildren, isExpanded, ancestorHasNextSiblings, isLastSibling })
		appendedIds.add(item.id)

		if (!isExpanded) {
			return
		}

		const nextLineage = new Set(lineage)
		nextLineage.add(item.id)

		for (const [index, child] of children.entries()) {
			const childIsLastSibling = index === children.length - 1
			appendItem(child, depth + 1, nextLineage, [...ancestorHasNextSiblings, !isLastSibling], childIsLastSibling)
		}
	}

	for (const [index, root] of roots.entries()) {
		appendItem(root, 0, new Set(), [], index === roots.length - 1)
	}

	return rows
}

export function getRootTaskDescendantSummaryMap(items: DisplayHistoryItem[]): Map<string, RootTaskDescendantSummary> {
	if (items.length === 0) {
		return new Map()
	}

	const { parentById } = buildTaskRelationships(items)
	const roots = items.filter((item) => !parentById.has(item.id))
	const summaryByRootId = new Map<string, RootTaskDescendantSummary>()
	const topAncestorCache = new Map<string, string | undefined>()

	const ensureSummary = (taskId: string): RootTaskDescendantSummary => {
		const existing = summaryByRootId.get(taskId)
		if (existing) {
			return existing
		}

		const created: RootTaskDescendantSummary = {
			totalDescendants: 0,
			active: 0,
			completed: 0,
			delegated: 0,
			aborted: 0,
		}
		summaryByRootId.set(taskId, created)
		return created
	}

	const resolveTopAncestorId = (taskId: string, lineage = new Set<string>()): string | undefined => {
		if (topAncestorCache.has(taskId)) {
			return topAncestorCache.get(taskId)
		}

		if (lineage.has(taskId)) {
			topAncestorCache.set(taskId, taskId)
			return taskId
		}

		const parentId = parentById.get(taskId)
		if (!parentId) {
			topAncestorCache.set(taskId, taskId)
			return taskId
		}

		const nextLineage = new Set(lineage)
		nextLineage.add(taskId)
		const topAncestorId = resolveTopAncestorId(parentId, nextLineage)
		topAncestorCache.set(taskId, topAncestorId)
		return topAncestorId
	}

	for (const root of roots) {
		ensureSummary(root.id)
	}

	for (const item of items) {
		const topAncestorId = resolveTopAncestorId(item.id)
		if (!topAncestorId || topAncestorId === item.id) {
			continue
		}

		const summary = ensureSummary(topAncestorId)
		summary.totalDescendants += 1

		switch (item.status) {
			case "active":
				summary.active += 1
				break
			case "completed":
				summary.completed += 1
				break
			case "delegated":
				summary.delegated += 1
				break
			case "aborted":
				summary.aborted += 1
				break
		}
	}

	return summaryByRootId
}

export function getRootTaskStatusMap(
	items: DisplayHistoryItem[],
	params?: { runningRootTaskIds?: readonly string[] },
): Map<string, HistoryRootTaskStatus> {
	const statusMap = new Map<string, HistoryRootTaskStatus>()

	for (const item of items) {
		if (!isRootTask(item)) {
			continue
		}

		statusMap.set(item.id, getHistoryRootTaskStatus(item, params))
	}

	return statusMap
}

export function getRootTaskStatusSummary(
	items: DisplayHistoryItem[],
	params?: { runningRootTaskIds?: readonly string[] },
): RootTaskStatusSummary {
	const summary: RootTaskStatusSummary = {
		running: 0,
		done: 0,
		stopped: 0,
		error: 0,
	}

	for (const status of getRootTaskStatusMap(items, params).values()) {
		summary[status] += 1
	}

	return summary
}

export function getHistoryItemOrchestrationStatus(item: DisplayHistoryItem): OrchestrationStatus | undefined {
	const summary = getActivityStatusSummary(item.activity)
	return summary.hasStatusSignals ? summary.status : undefined
}

export function formatRootTaskStatusSummaryWithI18n(
	summary: RootTaskStatusSummary,
	t: (key: string) => string,
): string | undefined {
	const parts: string[] = []

	if (summary.running > 0) {
		parts.push(`${t("history:statusRunning")} ${summary.running}`)
	}
	if (summary.done > 0) {
		parts.push(`${t("history:statusDone")} ${summary.done}`)
	}
	if (summary.stopped > 0) {
		parts.push(`${t("history:statusStopped")} ${summary.stopped}`)
	}
	if (summary.error > 0) {
		parts.push(`${t("history:statusError")} ${summary.error}`)
	}

	return parts.length > 0 ? parts.join(" · ") : undefined
}

export function formatRootTaskSummaryLabel(summary?: RootTaskDescendantSummary): string | undefined {
	if (!summary || summary.totalDescendants <= 0) {
		return undefined
	}

	const parts = [`Children ${summary.totalDescendants}`]
	if (summary.active > 0) {
		parts.push(`A${summary.active}`)
	}
	if (summary.delegated > 0) {
		parts.push(`D${summary.delegated}`)
	}
	if (summary.completed > 0) {
		parts.push(`Done ${summary.completed}`)
	}
	if (summary.aborted > 0) {
		parts.push(`Err ${summary.aborted}`)
	}

	return parts.join(" · ")
}

// kilocode_change start
export function formatRootTaskSummaryLabelWithI18n(
	summary: RootTaskDescendantSummary | undefined,
	t: (key: string) => string,
): string | undefined {
	if (!summary || summary.totalDescendants <= 0) {
		return undefined
	}

	const parts = [`${t("history:children")} ${summary.totalDescendants}`]
	if (summary.active > 0) {
		parts.push(`A${summary.active}`)
	}
	if (summary.delegated > 0) {
		parts.push(`D${summary.delegated}`)
	}
	if (summary.completed > 0) {
		parts.push(`${t("history:done")} ${summary.completed}`)
	}
	if (summary.aborted > 0) {
		parts.push(`Err ${summary.aborted}`)
	}

	return parts.join(" · ")
}
// kilocode_change end

export function getAutoExpandedTaskIds(
	items: DisplayHistoryItem[],
	params: { focusedTaskId?: string; activeRootTaskIds?: readonly string[] },
): Set<string> {
	const { focusedTaskId, activeRootTaskIds = [] } = params
	if (items.length === 0) {
		return new Set()
	}

	const { parentById, childrenByParentId } = buildTaskRelationships(items)
	const itemById = new Map(items.map((item) => [item.id, item]))
	const expandedIds = new Set<string>()

	const expandLineage = (taskId?: string) => {
		let currentTask = taskId ? itemById.get(taskId) : undefined
		while (currentTask) {
			const hasVisibleChildren =
				(currentTask.childIds?.length ?? 0) > 0 || (childrenByParentId.get(currentTask.id)?.length ?? 0) > 0
			if (hasVisibleChildren) {
				expandedIds.add(currentTask.id)
			}
			const nextParentId = parentById.get(currentTask.id) ?? currentTask.parentTaskId
			currentTask = nextParentId ? itemById.get(nextParentId) : undefined
		}
	}

	expandLineage(focusedTaskId)
	for (const rootTaskId of activeRootTaskIds) {
		expandLineage(rootTaskId)
	}

	return expandedIds
}
