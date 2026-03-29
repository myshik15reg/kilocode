import { memo, useMemo } from "react"
import type { HistoryItem } from "@roo-code/types"

import { vscode } from "@/utils/vscode"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppTranslation } from "@/i18n/TranslationContext"
import OrchestrationStatusSummary from "../chat/OrchestrationStatusSummary" // kilocode_change

import { getTaskOrchestrationSummary } from "../chat/orchestration" // kilocode_change
import { getHistoryRootTaskStatus, type RootTaskDescendantSummary } from "./taskTree" // kilocode_change
import TaskItemFooter from "./TaskItemFooter"

interface DisplayHistoryItem extends HistoryItem {
	highlight?: string
}

interface TaskItemProps {
	item: DisplayHistoryItem
	variant: "compact" | "full"
	isActiveRootTask?: boolean
	isFocusedRootTask?: boolean
	runningRootTaskIds?: readonly string[]
	showWorkspace?: boolean
	isSelectionMode?: boolean
	isSelected?: boolean
	onToggleSelection?: (taskId: string, isSelected: boolean) => void
	onDelete?: (taskId: string) => void
	className?: string
	descendantSummary?: RootTaskDescendantSummary // kilocode_change
	taskHistory?: HistoryItem[] // kilocode_change
}

const TaskItem = ({
	item,
	variant,
	isFocusedRootTask = false,
	runningRootTaskIds = [],
	showWorkspace = false,
	isSelectionMode = false,
	isSelected = false,
	onToggleSelection,
	onDelete,
	className,
	descendantSummary,
	taskHistory,
}: TaskItemProps) => {
	const { t } = useAppTranslation()

	// kilocode_change start
	const rootTaskStatus = useMemo(() => {
		const isRootTask = !item.parentTaskId && (!item.rootTaskId || item.rootTaskId === item.id)
		if (!isRootTask) {
			return undefined
		}

		const isStatusViewed = !item.statusUpdatedAt || (item.lastStatusViewedAt ?? 0) >= item.statusUpdatedAt

		switch (getHistoryRootTaskStatus(item, { runningRootTaskIds })) {
			case "running":
				return { labelKey: "history:statusRunning", tone: "running" as const, viewed: true }
			case "done":
				return { labelKey: "history:statusDone", tone: "done" as const, viewed: isStatusViewed }
			case "error":
				return { labelKey: "history:statusError", tone: "error" as const, viewed: isStatusViewed }
			case "stopped":
				return { labelKey: "history:statusStopped", tone: "stopped" as const, viewed: true }
			default:
				return { labelKey: "history:statusRunning", tone: "running" as const, viewed: true }
		}
	}, [item, runningRootTaskIds])
	const orchestrationSummary = useMemo(
		() => getTaskOrchestrationSummary({ activity: item.activity, currentTaskItem: item, taskHistory }),
		[item, taskHistory],
	)
	// kilocode_change end

	const handleClick = () => {
		if (!isCompact && isSelectionMode && onToggleSelection) {
			onToggleSelection(item.id, !isSelected)
		} else {
			vscode.postMessage({ type: "showTaskWithId", text: item.id })
		}
	}

	const isCompact = variant === "compact"
	// kilocode_change start
	const descendantCount = descendantSummary?.totalDescendants ?? 0
	const showBadges =
		Boolean(rootTaskStatus) ||
		orchestrationSummary.hasStatusSignals ||
		descendantCount > 0 ||
		Boolean(descendantSummary)
	const showDescendantSummary = !item.parentTaskId && descendantCount > 0
	// kilocode_change end

	return (
		<div
			key={item.id}
			data-testid={`task-item-${item.id}`}
			className={cn(
				"cursor-pointer group bg-vscode-editor-background rounded relative overflow-hidden border hover:bg-vscode-list-hoverBackground transition-colors",
				isFocusedRootTask ? "border-vscode-focusBorder" : "border-transparent",
				className,
			)}
			onClick={handleClick}>
			<div className={(!isCompact && isSelectionMode ? "pl-3 pb-3" : "pl-4") + " flex gap-3 px-3 pt-3 pb-2"}>
				{!isCompact && isSelectionMode && (
					<div
						className="task-checkbox mt-1"
						onClick={(e) => {
							e.stopPropagation()
						}}>
						<Checkbox
							checked={isSelected}
							onCheckedChange={(checked: boolean) => onToggleSelection?.(item.id, checked === true)}
							variant="description"
						/>
					</div>
				)}

				<div className="flex-1 min-w-0">
					{showBadges && (
						<div className="mb-1 flex flex-wrap gap-1" data-testid={`task-item-badges-${item.id}`}>
							{rootTaskStatus && !orchestrationSummary.hasStatusSignals && (
								<span
									className={cn(
										"px-1.5 py-0.5 text-[10px] rounded border bg-vscode-editor-background",
										rootTaskStatus.tone === "running" && "border-yellow-500/70 text-yellow-300",
										rootTaskStatus.tone === "done" &&
											(rootTaskStatus.viewed
												? "border-green-500/40 text-green-400/70"
												: "border-green-500/80 text-green-300"),
										rootTaskStatus.tone === "stopped" &&
											"border-vscode-panel-border text-vscode-descriptionForeground",
										rootTaskStatus.tone === "error" &&
											(rootTaskStatus.viewed
												? "border-red-500/40 text-red-400/70"
												: "border-red-500/80 text-red-300"),
									)}>
									{t(rootTaskStatus.labelKey)}
								</span>
							)}
							{showDescendantSummary && (
								<span
									className="px-1.5 py-0.5 text-[10px] rounded border border-vscode-panel-border text-vscode-descriptionForeground bg-vscode-editor-background"
									data-testid={`task-item-descendants-${item.id}`}>
									{t("history:children")} {descendantCount}
								</span>
							)}
							{/* kilocode_change start */}
							{orchestrationSummary.hasStatusSignals && (
								<OrchestrationStatusSummary
									summary={orchestrationSummary}
									showTitle={false}
									className="gap-1.5"
									badgeClassName="text-[10px]"
									countsClassName="text-[10px]"
									dataTestId={`task-item-orchestration-${item.id}`}
								/>
							)}
							{/* kilocode_change end */}
						</div>
					)}
					{showDescendantSummary && descendantSummary && (
						<div
							className="mb-2 flex flex-wrap gap-1 text-[10px] text-vscode-descriptionForeground"
							data-testid={`task-item-summary-${item.id}`}>
							{descendantSummary.active > 0 && (
								<span>
									{t("history:active")} {descendantSummary.active}
								</span>
							)}
							{descendantSummary.delegated > 0 && (
								<span>
									{t("history:delegated")} {descendantSummary.delegated}
								</span>
							)}
							{descendantSummary.completed > 0 && (
								<span>
									{t("history:done")} {descendantSummary.completed}
								</span>
							)}
							{descendantSummary.aborted > 0 && (
								<span>
									{t("history:error")} {descendantSummary.aborted}
								</span>
							)}
						</div>
					)}
					<div
						className={cn(
							"overflow-hidden whitespace-pre-wrap font-light text-vscode-foreground text-ellipsis line-clamp-3",
							{
								"text-base": !isCompact,
							},
							!isCompact && isSelectionMode ? "mb-1" : "",
						)}
						data-testid="task-content"
						{...(item.highlight ? { dangerouslySetInnerHTML: { __html: item.highlight } } : {})}>
						{item.highlight ? undefined : item.task}
					</div>

					<TaskItemFooter
						item={item}
						variant={variant}
						isSelectionMode={isSelectionMode}
						onDelete={onDelete}
					/>

					{showWorkspace && item.workspace && (
						<div className="flex flex-row gap-1 text-vscode-descriptionForeground text-xs mt-1">
							<span className="codicon codicon-folder scale-80" />
							<span>{item.workspace}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default memo(TaskItem)
