// kilocode_change - new file
import type { ActivityItem, HistoryItem } from "@roo-code/types"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { vscode } from "@/utils/vscode"

import OrchestrationStatusBadge from "./OrchestrationStatusBadge"
import OrchestrationStatusSummary from "./OrchestrationStatusSummary" // kilocode_change
import {
	formatOrchestrationSecondaryLine,
	getActivityGroups,
	getBackgroundChildTasks,
	getChildTasksWithoutDetailedActivity,
	getExplainabilityEntries,
	getTaskOrchestrationSummary,
	normalizeActivityStatus,
	orchestrationGroupDefaultLabels,
	orchestrationStatusDefaultLabels,
	orchestrationStatusLabelKeys,
} from "./orchestration"

interface TaskActivityPanelProps {
	activity?: ActivityItem[]
	currentTaskItem?: HistoryItem
	taskHistory?: HistoryItem[]
	compact?: boolean
	showSummary?: boolean // kilocode_change
	showChildTasks?: boolean
}

const COMPACT_CHILD_TASK_LIMIT = 3
const COMPACT_GROUP_ITEM_LIMIT = 3

const TaskActivityPanel = ({
	activity,
	currentTaskItem,
	taskHistory,
	compact = false,
	showSummary = true,
	showChildTasks = true,
}: TaskActivityPanelProps) => {
	const { t } = useTranslation()
	const groups = getActivityGroups(activity)
	const summary = getTaskOrchestrationSummary({ activity, currentTaskItem, taskHistory })
	const childTasks = getChildTasksWithoutDetailedActivity({
		childTasks: getBackgroundChildTasks({ currentTaskItem, taskHistory, currentTaskActivity: activity }),
		activity,
	})
	const [showAllChildTasks, setShowAllChildTasks] = useState(false)

	useEffect(() => {
		setShowAllChildTasks(false)
	}, [currentTaskItem?.id, compact])

	const visibleChildTasks = useMemo(
		() => (compact && !showAllChildTasks ? childTasks.slice(0, COMPACT_CHILD_TASK_LIMIT) : childTasks),
		[childTasks, compact, showAllChildTasks],
	)
	const hiddenChildTaskCount = Math.max(childTasks.length - visibleChildTasks.length, 0)

	if (!summary.hasSignals) {
		return null
	}

	return (
		<div className={cn("flex flex-col gap-2", compact ? "mt-1" : "mt-3")} data-testid="task-activity-panel">
			{showSummary && (
				<OrchestrationStatusSummary
					summary={summary}
					dataTestId="orchestration-summary"
					className="gap-1"
					countsClassName="text-[10px]"
				/>
			)}

			{groups.length === 0 && childTasks.length > 0 && (
				<div
					className="rounded-md border border-dashed border-vscode-panel-border/70 bg-vscode-editor-background/40 px-2 py-1.5 text-[10px] leading-relaxed text-vscode-descriptionForeground"
					data-testid="orchestration-summary-only">
					{t("chat:orchestration.summaryOnly", {
						defaultValue: "Showing subagent status while detailed activity is still loading.",
					})}
				</div>
			)}

			{showChildTasks && childTasks.length > 0 && (
				<div
					className="rounded-md border border-vscode-panel-border/70 bg-vscode-editor-background/30 px-2 py-1.5"
					data-testid="orchestration-child-tasks">
					<div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-vscode-descriptionForeground/80">
						{t("chat:orchestration.subagents", { defaultValue: "Subagents" })}
					</div>
					<div className="flex flex-col divide-y divide-vscode-panel-border/50">
						{visibleChildTasks.map((child) => {
							const secondaryLine = formatOrchestrationSecondaryLine({
								explainability: child.explanation,
								maxLength: 88,
							})
							return (
								<button
									key={child.id}
									type="button"
									onClick={() => vscode.postMessage({ type: "showTaskWithId", text: child.id })}
									className="flex items-start justify-between gap-2 px-0 py-1.5 text-left first:pt-0 last:pb-0 hover:text-vscode-foreground"
									data-testid={`child-task-link-${child.id}`}>
									<div className="min-w-0 flex-1">
										<div className="truncate text-xs text-vscode-foreground">{child.label}</div>
										{secondaryLine && (
											<div
												className="mt-0.5 truncate text-[10px] leading-relaxed text-vscode-descriptionForeground"
												data-testid={`child-task-explanation-${child.id}`}>
												{secondaryLine}
											</div>
										)}
									</div>
									<OrchestrationStatusBadge
										status={child.status}
										label={t(orchestrationStatusLabelKeys[child.status], {
											defaultValue: orchestrationStatusDefaultLabels[child.status],
										})}
									/>
								</button>
							)
						})}
					</div>
					{hiddenChildTaskCount > 0 && (
						<button
							type="button"
							onClick={() => setShowAllChildTasks(true)}
							className="mt-1.5 w-fit text-[10px] text-vscode-descriptionForeground transition-colors hover:text-vscode-foreground"
							data-testid="child-task-more-indicator">
							+{hiddenChildTaskCount} more
						</button>
					)}
				</div>
			)}

			{groups.map((group) => {
				const visibleItems = compact ? group.items.slice(0, COMPACT_GROUP_ITEM_LIMIT) : group.items
				const hiddenItemCount = group.items.length - visibleItems.length

				return (
					<div
						key={group.id}
						className="rounded-md border border-vscode-panel-border/70 bg-vscode-editor-background/30 px-2 py-1.5"
						data-testid={`activity-group-${group.label}`}>
						<div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-vscode-descriptionForeground/80">
							{t(`chat:orchestration.${group.label}`, {
								defaultValue: orchestrationGroupDefaultLabels[group.label],
							})}
						</div>
						<div className="flex flex-col divide-y divide-vscode-panel-border/50">
							{visibleItems.map((item) => {
								const status = normalizeActivityStatus(item)
								const itemSummary =
									item.summary?.trim() ||
									t("chat:orchestration.itemFallback", { defaultValue: "Activity update" })
								const showStatusBadge = item.kind !== "relay" || item.status === "blocked"
								const explainabilityEntries = getExplainabilityEntries(item)
								const secondaryLine = formatOrchestrationSecondaryLine({
									explainability: explainabilityEntries,
									timestamp: compact ? undefined : String(item.timestamp),
									maxLength: compact ? 88 : 112,
								})

								return (
									<div
										key={item.id}
										className="flex items-start justify-between gap-2 px-0 py-1.5 first:pt-0 last:pb-0"
										data-testid={`activity-item-${item.id}`}>
										<div className="min-w-0 flex-1">
											<div className="truncate text-xs text-vscode-foreground">{itemSummary}</div>
											{secondaryLine && (
												<div
													className="mt-0.5 truncate text-[10px] leading-relaxed text-vscode-descriptionForeground"
													data-testid={`activity-item-explanation-${item.id}`}>
													{secondaryLine}
												</div>
											)}
										</div>
										{showStatusBadge && (
											<OrchestrationStatusBadge
												status={status}
												label={t(orchestrationStatusLabelKeys[status], {
													defaultValue: orchestrationStatusDefaultLabels[status],
												})}
											/>
										)}
									</div>
								)
							})}
						</div>
						{hiddenItemCount > 0 && (
							<div className="mt-1.5 text-[10px] text-vscode-descriptionForeground">
								+{hiddenItemCount} more
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}

export default TaskActivityPanel
