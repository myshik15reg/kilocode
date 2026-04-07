import { memo, useEffect, useMemo, useState } from "react"

import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { useExtensionState } from "@/context/ExtensionStateContext"

import TaskItem from "./TaskItem"
import HistoryTreeGutter from "./HistoryTreeGutter"
import { buildTaskTreeRows, getAutoExpandedTaskIds, getRootTaskDescendantSummaryMap } from "./taskTree"
import { useTaskHistory } from "@/kilocode/hooks/useTaskHistory"

const pruneTaskIdSet = (taskIds: Set<string>, visibleTaskIds: Set<string>): Set<string> => {
	const next = new Set<string>()

	for (const taskId of taskIds) {
		if (visibleTaskIds.has(taskId)) {
			next.add(taskId)
		}
	}

	return next
}

const HistoryPreview = ({ taskHistoryVersion }: { taskHistoryVersion: number } /*kilocode_change*/) => {
	const { data } = useTaskHistory(
		{
			workspace: "current",
			sort: "newest",
			favoritesOnly: false,
			pageIndex: 0,
		},
		taskHistoryVersion,
	)
	const tasks = useMemo(() => data?.historyItems ?? [], [data?.historyItems])
	const { t } = useAppTranslation()
	const { activeRootTaskIds = [], runningRootTaskIds = [], focusedRootTaskId, taskHistory = [] } = useExtensionState()
	const historyRootItems = useMemo(() => (taskHistory.length > 0 ? taskHistory : tasks), [taskHistory, tasks])
	const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set())
	const [manuallyCollapsedTaskIds, setManuallyCollapsedTaskIds] = useState<Set<string>>(() => new Set())

	useEffect(() => {
		const visibleTaskIds = new Set(historyRootItems.map((item) => item.id))
		setExpandedTaskIds((prev) => pruneTaskIdSet(prev, visibleTaskIds))
		setManuallyCollapsedTaskIds((prev) => pruneTaskIdSet(prev, visibleTaskIds))
	}, [historyRootItems])

	useEffect(() => {
		const nextExpandedIds = getAutoExpandedTaskIds(historyRootItems, {
			focusedTaskId: focusedRootTaskId,
			activeRootTaskIds,
		})

		if (nextExpandedIds.size === 0) {
			return
		}

		setExpandedTaskIds((prev) => {
			let changed = false
			const next = new Set(prev)

			for (const taskId of nextExpandedIds) {
				if (manuallyCollapsedTaskIds.has(taskId) || next.has(taskId)) {
					continue
				}

				next.add(taskId)
				changed = true
			}

			return changed ? next : prev
		})
	}, [historyRootItems, activeRootTaskIds, focusedRootTaskId, manuallyCollapsedTaskIds])

	const rootTaskSummaryMap = useMemo(() => getRootTaskDescendantSummaryMap(historyRootItems), [historyRootItems])
	const visibleTaskItems = tasks.length > 0 ? tasks : historyRootItems
	const previewRows = useMemo(
		() => buildTaskTreeRows(visibleTaskItems, expandedTaskIds, historyRootItems),
		[visibleTaskItems, expandedTaskIds, historyRootItems],
	)

	const toggleTaskExpansion = (taskId: string) => {
		const isExpanded = expandedTaskIds.has(taskId)

		setExpandedTaskIds((prev) => {
			const next = new Set(prev)
			if (isExpanded) {
				next.delete(taskId)
			} else {
				next.add(taskId)
			}
			return next
		})

		setManuallyCollapsedTaskIds((prev) => {
			const next = new Set(prev)
			if (isExpanded) {
				next.add(taskId)
			} else {
				next.delete(taskId)
			}
			return next
		})
	}

	const handleViewAllHistory = () => {
		vscode.postMessage({ type: "switchTab", tab: "history" })
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="m-0 grow text-lg font-semibold">{t("history:recentTasks")}</h2>
				<button
					onClick={handleViewAllHistory}
					className="cursor-pointer text-base text-vscode-descriptionForeground transition-colors hover:text-vscode-textLink-foreground"
					aria-label={t("history:viewAllHistory")}>
					{t("history:viewAllHistory")}
				</button>
			</div>
			{previewRows.length !== 0 && (
				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
					{previewRows.map((row) => (
						<div key={row.item.id} className="flex items-stretch gap-2">
							<HistoryTreeGutter
								depth={row.depth}
								hasChildren={row.hasChildren}
								isExpanded={row.isExpanded}
								ancestorHasNextSiblings={row.ancestorHasNextSiblings}
								isLastSibling={row.isLastSibling}
								toggleTestId={`history-preview-toggle-${row.item.id}`}
								toggleLabel={row.isExpanded ? t("chat:collapse") : t("chat:expand")}
								onToggle={() => toggleTaskExpansion(row.item.id)}
								className="pt-0.5"
							/>
							<TaskItem
								item={
									row.depth === 0
										? (historyRootItems.find((item) => item.id === row.item.id) ?? row.item)
										: row.item
								}
								taskHistory={historyRootItems}
								variant="compact"
								isActiveRootTask={activeRootTaskIds.includes(row.item.id)}
								isFocusedRootTask={focusedRootTaskId === row.item.id}
								runningRootTaskIds={runningRootTaskIds}
								descendantSummary={row.depth === 0 ? rootTaskSummaryMap.get(row.item.id) : undefined}
								className={row.depth > 0 ? "ml-1 flex-1 min-w-0" : "flex-1 min-w-0"}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default memo(HistoryPreview)
