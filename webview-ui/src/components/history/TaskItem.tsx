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
	const showTopMeta = Boolean(rootTaskStatus) || orchestrationSummary.hasStatusSignals || descendantCount > 0
	const showDescendantSummary = !item.parentTaskId && descendantCount > 0
	const compactMetaParts = [
		showDescendantSummary ? `${t("history:children")} ${descendantCount}` : undefined,
		descendantSummary?.active ? `${t("history:active")} ${descendantSummary.active}` : undefined,
		descendantSummary?.delegated ? `${t("history:delegated")} ${descendantSummary.delegated}` : undefined,
		descendantSummary?.completed ? `${t("history:done")} ${descendantSummary.completed}` : undefined,
		descendantSummary?.aborted ? `${t("history:error")} ${descendantSummary.aborted}` : undefined,
	].filter((value): value is string => Boolean(value))
	const compactMetaLabel = compactMetaParts.slice(0, 3).join(" · ")
	// kilocode_change end

	return (
		<div
			key={item.id}
			data-testid={`task-item-${item.id}`}
			className={cn(
				"group relative overflow-hidden rounded border bg-vscode-editor-background transition-colors hover:bg-vscode-list-hoverBackground cursor-pointer",
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

				<div className="min-w-0 flex-1">
					{showTopMeta && (
						<div
							className="mb-1.5 flex flex-wrap items-center gap-1.5"
							data-testid={`task-item-badges-${item.id}`}>
							{rootTaskStatus && !orchestrationSummary.hasStatusSignals && (
								<span
									className={cn(
										"inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] leading-none",
										rootTaskStatus.tone === "running" &&
											"border-yellow-500/35 bg-yellow-500/8 text-yellow-200/85",
										rootTaskStatus.tone === "done" &&
											"border-green-500/35 bg-green-500/8 text-green-200/85",
										rootTaskStatus.tone === "stopped" &&
											"border-vscode-panel-border/70 bg-vscode-editor-background/40 text-vscode-descriptionForeground",
										rootTaskStatus.tone === "error" &&
											(rootTaskStatus.viewed
												? "border-red-500/25 bg-red-500/6 text-red-300/70"
												: "border-red-500/35 bg-red-500/8 text-red-200/90"),
									)}>
									{t(rootTaskStatus.labelKey)}
								</span>
							)}
							{orchestrationSummary.hasStatusSignals && (
								<OrchestrationStatusSummary
									summary={orchestrationSummary}
									showTitle={false}
									className="gap-1"
									badgeClassName="text-[10px]"
									countsClassName="text-[10px]"
									dataTestId={`task-item-orchestration-${item.id}`}
								/>
							)}
							{!orchestrationSummary.hasStatusSignals && compactMetaLabel && (
								<span
									className="truncate text-[10px] text-vscode-descriptionForeground"
									data-testid={`task-item-descendants-${item.id}`}>
									{compactMetaLabel}
								</span>
							)}
						</div>
					)}
					{showDescendantSummary &&
						descendantSummary &&
						orchestrationSummary.hasStatusSignals &&
						compactMetaLabel && (
							<div
								className="mb-1.5 truncate text-[10px] text-vscode-descriptionForeground"
								data-testid={`task-item-summary-${item.id}`}>
								{compactMetaLabel}
							</div>
						)}
					<div
						className={cn(
							"overflow-hidden whitespace-pre-wrap text-ellipsis font-light text-vscode-foreground line-clamp-3",
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
						runningRootTaskIds={runningRootTaskIds}
						isSelectionMode={isSelectionMode}
						onDelete={onDelete}
					/>

					{showWorkspace && item.workspace && (
						<div className="mt-1 flex flex-row gap-1 text-xs text-vscode-descriptionForeground">
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
