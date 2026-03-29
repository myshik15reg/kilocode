// kilocode_change - new file
import type { ActivityItem, HistoryItem } from "@roo-code/types"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { vscode } from "@/utils/vscode"

import OrchestrationStatusBadge from "./OrchestrationStatusBadge"
import OrchestrationStatusSummary from "./OrchestrationStatusSummary" // kilocode_change
import {
	getActivityGroups,
	getBackgroundChildTasks,
	getChildTasksWithoutDetailedActivity,
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
}

const TaskActivityPanel = ({
	activity,
	currentTaskItem,
	taskHistory,
	compact = false,
	showSummary = true,
}: TaskActivityPanelProps) => {
	const { t } = useTranslation()
	const groups = getActivityGroups(activity)
	const summary = getTaskOrchestrationSummary({ activity, currentTaskItem, taskHistory })
	const childTasks = getChildTasksWithoutDetailedActivity({
		childTasks: getBackgroundChildTasks({ currentTaskItem, taskHistory, currentTaskActivity: activity }),
		activity,
	})

	if (!summary.hasSignals) {
		return null
	}

	return (
		<div className={cn("flex flex-col gap-2", compact ? "mt-1" : "mt-3")} data-testid="task-activity-panel">
			{showSummary && <OrchestrationStatusSummary summary={summary} dataTestId="orchestration-summary" />}

			{groups.length === 0 && childTasks.length > 0 && (
				<div
					className="rounded border border-dashed border-vscode-panel-border px-2 py-2 text-[11px] text-vscode-descriptionForeground"
					data-testid="orchestration-summary-only">
					{t("chat:orchestration.summaryOnly", {
						defaultValue: "Showing subagent status while detailed activity is still loading.",
					})}
				</div>
			)}

			{childTasks.length > 0 && (
				<div
					className="rounded border border-vscode-panel-border px-2 py-2"
					data-testid="orchestration-child-tasks">
					<div className="mb-2 text-xs font-medium text-vscode-descriptionForeground">
						{t("chat:orchestration.subagents", { defaultValue: "Subagents" })}
					</div>
					<div className="flex flex-col gap-1">
						{childTasks.map((child) => (
							<button
								key={child.id}
								type="button"
								onClick={() => vscode.postMessage({ type: "showTaskWithId", text: child.id })}
								className="flex items-center justify-between gap-2 rounded bg-vscode-editor-background px-2 py-1 text-left hover:bg-vscode-list-hoverBackground"
								data-testid={`child-task-link-${child.id}`}>
								<span className="min-w-0 truncate text-xs text-vscode-foreground">{child.label}</span>
								<OrchestrationStatusBadge
									status={child.status}
									label={t(orchestrationStatusLabelKeys[child.status], {
										defaultValue: orchestrationStatusDefaultLabels[child.status],
									})}
								/>
							</button>
						))}
					</div>
				</div>
			)}

			{groups.map((group) => (
				<div
					key={group.id}
					className="rounded border border-vscode-panel-border px-2 py-2"
					data-testid={`activity-group-${group.label}`}>
					<div className="mb-2 text-xs font-medium text-vscode-descriptionForeground">
						{t(`chat:orchestration.${group.label}`, {
							defaultValue: orchestrationGroupDefaultLabels[group.label],
						})}
					</div>
					<div className="flex flex-col gap-1">
						{group.items.map((item) => {
							const status = normalizeActivityStatus(item)
							const itemSummary =
								item.summary?.trim() ||
								t("chat:orchestration.itemFallback", { defaultValue: "Activity update" })
							const showStatusBadge = item.kind !== "relay" || item.status === "blocked"
							return (
								<div
									key={item.id}
									className="flex items-center justify-between gap-2 rounded bg-vscode-editor-background px-2 py-1"
									data-testid={`activity-item-${item.id}`}>
									<div className="min-w-0">
										<div className="truncate text-xs text-vscode-foreground">{itemSummary}</div>
										<div className="text-[10px] text-vscode-descriptionForeground">
											{item.timestamp}
										</div>
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
				</div>
			))}
		</div>
	)
}

export default TaskActivityPanel
