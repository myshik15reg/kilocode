import { memo, useMemo } from "react"

import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { useExtensionState } from "@/context/ExtensionStateContext"

// import { useTaskSearch } from "./useTaskSearch" // kilocode_change
import TaskItem from "./TaskItem"
import HistoryTreeGutter from "./HistoryTreeGutter"
import { buildTaskTreeRows, getAutoExpandedTaskIds, getRootTaskDescendantSummaryMap } from "./taskTree"
import { useTaskHistory } from "@/kilocode/hooks/useTaskHistory"

const HistoryPreview = ({ taskHistoryVersion }: { taskHistoryVersion: number } /*kilocode_change*/) => {
	// kilocode_change start
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
	// kilocode_change end
	const { t } = useAppTranslation()
	const { activeRootTaskIds = [], focusedRootTaskId, taskHistory = [] } = useExtensionState()
	const historyRootItems = useMemo(() => (taskHistory.length > 0 ? taskHistory : tasks), [taskHistory, tasks])
	const autoExpandedTaskIds = useMemo(
		() => getAutoExpandedTaskIds(historyRootItems, { focusedTaskId: focusedRootTaskId, activeRootTaskIds }),
		[historyRootItems, focusedRootTaskId, activeRootTaskIds],
	)
	const rootTaskSummaryMap = useMemo(() => getRootTaskDescendantSummaryMap(historyRootItems), [historyRootItems]) // kilocode_change
	const previewRows = useMemo(
		() => buildTaskTreeRows(tasks, autoExpandedTaskIds).slice(0, 4),
		[tasks, autoExpandedTaskIds],
	)

	const handleViewAllHistory = () => {
		vscode.postMessage({ type: "switchTab", tab: "history" })
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center justify-between mt-4 mb-2">
				<h2 className="font-semibold text-lg grow m-0">{t("history:recentTasks")}</h2>
				<button
					onClick={handleViewAllHistory}
					className="text-base text-vscode-descriptionForeground hover:text-vscode-textLink-foreground transition-colors cursor-pointer"
					aria-label={t("history:viewAllHistory")}>
					{t("history:viewAllHistory")}
				</button>
			</div>
			{previewRows.length !== 0 && (
				<>
					{previewRows.map((row) => (
						<div key={row.item.id} className="flex items-stretch gap-2">
							<HistoryTreeGutter
								depth={row.depth}
								hasChildren={row.hasChildren}
								isExpanded={row.isExpanded}
								ancestorHasNextSiblings={row.ancestorHasNextSiblings}
								isLastSibling={row.isLastSibling}
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
								runningRootTaskIds={[]}
								descendantSummary={row.depth === 0 ? rootTaskSummaryMap.get(row.item.id) : undefined}
								className={row.depth > 0 ? "ml-1 flex-1 min-w-0" : "flex-1 min-w-0"}
							/>
						</div>
					))}
				</>
			)}
		</div>
	)
}

export default memo(HistoryPreview)
