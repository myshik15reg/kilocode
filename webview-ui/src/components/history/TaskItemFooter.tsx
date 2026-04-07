import React from "react"
import type { HistoryItem } from "@roo-code/types"
import { formatTimeAgo } from "@/utils/format"
import { CopyButton } from "./CopyButton"
import { ExportButton } from "./ExportButton"
import { DeleteButton } from "./DeleteButton"
import { FavoriteButton } from "../kilocode/history/FavoriteButton" // kilocode_change
import { KiloShareSessionButton } from "./KiloShareSessionButton" // kilocode_change
import { StandardTooltip } from "../ui/standard-tooltip"
import { vscode } from "@/utils/vscode"
import { LucideIconButton } from "../chat/LucideIconButton"
import { PauseIcon, PlayIcon } from "lucide-react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { getHistoryRootTaskStatus } from "./taskTree"

export interface TaskItemFooterProps {
	item: HistoryItem
	variant: "compact" | "full"
	runningRootTaskIds?: readonly string[]
	isSelectionMode?: boolean
	onDelete?: (taskId: string) => void
}

const TaskItemFooter: React.FC<TaskItemFooterProps> = ({
	item,
	variant,
	runningRootTaskIds = [],
	isSelectionMode = false,
	onDelete,
}) => {
	const { t } = useAppTranslation()
	// kilocode_change start
	const isCompletedItem = item.status === "completed" || item.lifecycleState === "completed"
	const isRootTask = !item.parentTaskId && (!item.rootTaskId || item.rootTaskId === item.id)
	const rootTaskStatus = isRootTask ? getHistoryRootTaskStatus(item, { runningRootTaskIds }) : undefined
	const isStoppedRootTask = isRootTask && rootTaskStatus === "stopped"
	const showResumeTask =
		!isCompletedItem &&
		(item.lifecycleState === "paused" ||
			(isStoppedRootTask && !(item.status === undefined && item.lifecycleState === "running")))
	const showPauseTask =
		!isCompletedItem &&
		!showResumeTask &&
		(item.lifecycleState === "running" ||
			(!item.lifecycleState && (item.status === undefined || rootTaskStatus === "running")))
	// kilocode_change end

	return (
		<div className="flex items-center justify-between gap-2 text-[11px] text-vscode-descriptionForeground">
			<div className="flex min-w-0 flex-wrap items-center gap-1 text-vscode-descriptionForeground/70">
				{/* Datetime with time-ago format */}
				<StandardTooltip content={new Date(item.ts).toLocaleString()}>
					<span className="first-letter:uppercase">{formatTimeAgo(item.ts)}</span>
				</StandardTooltip>
				<span>·</span>
				{/* Cost */}
				{!!item.totalCost && (
					<span
						className="flex items-center text-vscode-descriptionForeground/60"
						data-testid="cost-footer-compact">
						{"$" + item.totalCost.toFixed(2)}
					</span>
				)}
			</div>

			{/* Action Buttons for non-compact view */}
			{!isSelectionMode && (
				<div className="flex flex-row items-center gap-0.5 text-vscode-descriptionForeground/55 hover:text-vscode-descriptionForeground/85">
					{/* kilocode_change start */}
					{showPauseTask && (
						<LucideIconButton
							icon={PauseIcon}
							title={t("chat:task.pause")}
							onClick={() =>
								vscode.postMessage({
									type: "pauseTask",
									text: item.id,
								})
							}
						/>
					)}
					{showResumeTask && (
						<LucideIconButton
							icon={PlayIcon}
							title={t("chat:resumeTask.title")}
							onClick={() => vscode.postMessage({ type: "resumeTask", text: item.id })}
						/>
					)}
					{/* kilocode_change end */}
					<CopyButton itemTask={item.task} />
					<FavoriteButton isFavorited={item.isFavorited ?? false} id={item.id} />
					<KiloShareSessionButton id={item.id} />
					{variant === "full" && <ExportButton itemId={item.id} />}
					{onDelete && <DeleteButton itemId={item.id} onDelete={onDelete} />}
				</div>
			)}
		</div>
	)
}

export default TaskItemFooter
