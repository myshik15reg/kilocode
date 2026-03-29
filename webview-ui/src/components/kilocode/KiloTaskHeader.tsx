// kilocode_change: new file
import { memo, useEffect, useMemo, useRef, useState } from "react"
import { useWindowSize } from "react-use"
import { useTranslation } from "react-i18next"
import { CloudUpload, CloudDownload, FoldVertical, MoreHorizontal } from "lucide-react"
import { validateSlashCommand } from "@/utils/slash-commands"

import type { ClineMessage, Command } from "@roo-code/types"

import { getModelMaxOutputTokens } from "@roo/api"

import { formatLargeNumber } from "@src/utils/format"
import { cn } from "@src/lib/utils"
import { Button, StandardTooltip } from "@src/components/ui"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { useSelectedModel } from "@/components/ui/hooks/useSelectedModel"
import { useTaskDiffStats } from "@/components/ui/hooks/kilocode/useTaskDiffStats"

import Thumbnails from "../common/Thumbnails"

import { TaskActions } from "../chat/TaskActions"
import { ShareButton } from "../chat/ShareButton"
import { ContextWindowProgress } from "../chat/ContextWindowProgress"
import { TaskTimeline } from "../chat/TaskTimeline"
import { mentionRegexGlobal } from "@roo/context-mentions"

import { vscode } from "@/utils/vscode"
import { TodoListDisplay } from "../chat/TodoListDisplay"
import { formatRootTaskSummaryLabel, getRootTaskDescendantSummaryMap } from "../history/taskTree" // kilocode_change
import OrchestrationStatusSummary from "../chat/OrchestrationStatusSummary" // kilocode_change
import TaskActivityPanel from "../chat/TaskActivityPanel"
import { getTaskOrchestrationSummary } from "../chat/orchestration" // kilocode_change
import DiffStatsDisplay from "./DiffStatsDisplay"

const TASK_HIERARCHY_LABEL_LIMIT = 28

type TaskHierarchyRole = "parent" | "current" | "child"

interface TaskHierarchyItem {
	id: string
	label: string
	fullLabel: string
	role: TaskHierarchyRole
	isCurrent: boolean
}

function shortenTaskLabel(label: string | undefined, fallbackId: string): string {
	const normalizedLabel = (label ?? "").replace(/\s+/g, " ").trim()
	const candidate = normalizedLabel || fallbackId

	if (candidate.length <= TASK_HIERARCHY_LABEL_LIMIT) {
		return candidate
	}

	return `${candidate.slice(0, TASK_HIERARCHY_LABEL_LIMIT - 1).trimEnd()}…`
}

function getMaxVisibleHierarchyItems(windowWidth: number): number {
	if (windowWidth < 480) {
		return 2
	}
	if (windowWidth < 720) {
		return 3
	}
	if (windowWidth < 1040) {
		return 4
	}

	return 5
}

export interface TaskHeaderProps {
	task: ClineMessage
	tokensIn: number
	tokensOut: number
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	contextTokens: number
	buttonsDisabled: boolean
	handleCondenseContext: (taskId: string) => void
	onClose: () => void
	groupedMessages: (ClineMessage | ClineMessage[])[]
	onMessageClick?: (index: number) => void
	isTaskActive?: boolean
	todos?: any[]
}

const KiloTaskHeader = ({
	task,
	tokensIn,
	tokensOut,
	cacheWrites,
	cacheReads,
	totalCost,
	contextTokens,
	buttonsDisabled,
	handleCondenseContext,
	onClose,
	groupedMessages,
	onMessageClick,
	isTaskActive = false,
	todos,
}: TaskHeaderProps) => {
	const { t } = useTranslation()
	const {
		showTaskTimeline,
		showDiffStats,
		clineMessages,
		apiConfiguration,
		currentTaskItem,
		currentTaskActivity,
		customModes,
		commands,
		taskHistory = [],
	} = useExtensionState()
	const { id: modelId, info: model } = useSelectedModel(apiConfiguration)
	const [isTaskExpanded, setIsTaskExpanded] = useState(false)
	const [showOverflowHierarchyItems, setShowOverflowHierarchyItems] = useState(false)

	const diffStats = useTaskDiffStats(clineMessages)
	const hasDiffStats = diffStats.added > 0 || diffStats.removed > 0

	const textContainerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLDivElement>(null)
	const contextWindow = model?.contextWindow || 1

	const { width: windowWidth } = useWindowSize()
	const taskHistoryById = useMemo(() => new Map(taskHistory.map((item) => [item.id, item])), [taskHistory])

	const condenseButton = (
		<StandardTooltip content={t("chat:task.condenseContext")}>
			<button
				disabled={buttonsDisabled}
				onClick={() => currentTaskItem && handleCondenseContext(currentTaskItem.id)}
				className="shrink-0 min-h-[20px] min-w-[20px] p-[2px] cursor-pointer disabled:cursor-not-allowed opacity-85 hover:opacity-100 bg-transparent border-none rounded-md">
				<FoldVertical size={16} />
			</button>
		</StandardTooltip>
	)

	const hasTodos = todos && Array.isArray(todos) && todos.length > 0
	const subtaskCount = currentTaskItem?.childIds?.length ?? 0
	const delegationDepth = currentTaskItem?.delegationDepth ?? 0
	const taskHierarchyItems = useMemo<TaskHierarchyItem[]>(() => {
		if (!currentTaskItem?.id) {
			return []
		}

		const items: TaskHierarchyItem[] = []
		const currentHistoryItem = taskHistoryById.get(currentTaskItem.id)
		const currentFullLabel = currentHistoryItem?.task || task.text || currentTaskItem.id

		if (currentTaskItem.parentTaskId) {
			const parentHistoryItem = taskHistoryById.get(currentTaskItem.parentTaskId)
			const parentFullLabel = parentHistoryItem?.task || currentTaskItem.parentTaskId
			items.push({
				id: currentTaskItem.parentTaskId,
				label: shortenTaskLabel(parentFullLabel, currentTaskItem.parentTaskId),
				fullLabel: parentFullLabel,
				role: "parent",
				isCurrent: false,
			})
		}

		items.push({
			id: currentTaskItem.id,
			label: shortenTaskLabel(currentFullLabel, currentTaskItem.id),
			fullLabel: currentFullLabel,
			role: "current",
			isCurrent: true,
		})

		for (const childTaskId of currentTaskItem.childIds ?? []) {
			if (childTaskId === currentTaskItem.id) {
				continue
			}

			const childHistoryItem = taskHistoryById.get(childTaskId)
			const childFullLabel = childHistoryItem?.task || childTaskId
			items.push({
				id: childTaskId,
				label: shortenTaskLabel(childFullLabel, childTaskId),
				fullLabel: childFullLabel,
				role: "child",
				isCurrent: false,
			})
		}

		return items
	}, [currentTaskItem, task.text, taskHistoryById])
	const rootTaskSummaryMap = getRootTaskDescendantSummaryMap(taskHistory) // kilocode_change
	const orchestrationSummary = useMemo(
		() => getTaskOrchestrationSummary({ activity: currentTaskActivity, currentTaskItem, taskHistory }),
		[currentTaskActivity, currentTaskItem, taskHistory],
	)
	const currentRootSummaryLabel = formatRootTaskSummaryLabel(
		currentTaskItem?.rootTaskId
			? rootTaskSummaryMap.get(currentTaskItem.rootTaskId)
			: currentTaskItem?.id
				? rootTaskSummaryMap.get(currentTaskItem.id)
				: undefined,
	) // kilocode_change
	const maxVisibleHierarchyItems = getMaxVisibleHierarchyItems(windowWidth)
	const hasTaskHierarchyOverflow = taskHierarchyItems.length > maxVisibleHierarchyItems
	const visibleTaskHierarchyItems =
		hasTaskHierarchyOverflow && !showOverflowHierarchyItems
			? taskHierarchyItems.slice(0, maxVisibleHierarchyItems)
			: taskHierarchyItems
	const hiddenTaskHierarchyCount = Math.max(taskHierarchyItems.length - visibleTaskHierarchyItems.length, 0)

	useEffect(() => {
		setShowOverflowHierarchyItems(false)
	}, [currentTaskItem?.id, windowWidth])

	const handleTaskSwitch = (taskId: string) => {
		if (taskId === currentTaskItem?.id) {
			return
		}

		vscode.postMessage({ type: "showTaskWithId", text: taskId })
	}

	return (
		<div className="py-2 px-3">
			<div
				className={cn(
					"p-2.5 flex flex-col relative z-1 border",
					hasTodos ? "rounded-t-xs" : "rounded-xs",
					isTaskExpanded
						? "border-vscode-panel-border text-vscode-foreground"
						: "border-vscode-panel-border/80 text-vscode-foreground/80",
				)}>
				<div className="flex justify-between items-center gap-2">
					<div
						className="flex items-center cursor-pointer -ml-0.5 select-none grow min-w-0"
						onClick={() => setIsTaskExpanded(!isTaskExpanded)}>
						<div className="flex items-center shrink-0">
							<span className={`codicon codicon-chevron-${isTaskExpanded ? "down" : "right"}`}></span>
						</div>
						<div className="ml-1.5 whitespace-nowrap overflow-hidden text-ellipsis grow min-w-0">
							<span className="font-bold">
								{t("chat:task.title")}
								{!isTaskExpanded && ":"}
							</span>
							{!isTaskExpanded && (
								<span style={{ marginLeft: 4 }}>
									{highlightText(task.text ?? "", false, customModes, commands)}
								</span>
							)}
							{currentRootSummaryLabel && (
								<span
									className="ml-2 text-[10px] text-vscode-descriptionForeground"
									data-testid="current-root-summary">
									{currentRootSummaryLabel}
								</span>
							)}
							{/* kilocode_change start */}
							{!isTaskExpanded && orchestrationSummary.hasStatusSignals && (
								<span className="ml-2" data-testid="task-orchestration-badge">
									<OrchestrationStatusSummary
										summary={orchestrationSummary}
										showTitle={false}
										className="gap-1.5"
										badgeClassName="text-[10px]"
										countsClassName="text-[10px]"
										dataTestId="task-orchestration-summary"
									/>
								</span>
							)}
							{/* kilocode_change end */}
						</div>
					</div>
					<StandardTooltip content={t("chat:task.closeAndStart")}>
						<Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 w-5 h-5">
							<span className="codicon codicon-close" />
						</Button>
					</StandardTooltip>
				</div>
				{taskHierarchyItems.length > 1 && (
					<div className="mt-2 flex flex-wrap items-center gap-1" data-testid="task-hierarchy-nav">
						{visibleTaskHierarchyItems.map((hierarchyItem, index) => (
							<div key={hierarchyItem.id} className="flex min-w-0 items-center gap-1">
								{index > 0 && <span className="text-xs text-vscode-descriptionForeground">›</span>}
								<button
									type="button"
									onClick={() => handleTaskSwitch(hierarchyItem.id)}
									title={hierarchyItem.fullLabel}
									aria-label={`${hierarchyItem.role}: ${hierarchyItem.fullLabel}`}
									disabled={hierarchyItem.isCurrent}
									className={cn(
										"max-w-[220px] truncate rounded-md border px-2 py-1 text-xs leading-tight transition-colors",
										hierarchyItem.isCurrent
											? "cursor-default border-vscode-focusBorder bg-vscode-list-activeSelectionBackground text-vscode-list-activeSelectionForeground"
											: "border-vscode-panel-border bg-vscode-editor-background text-vscode-descriptionForeground hover:bg-vscode-list-hoverBackground hover:text-vscode-foreground",
									)}
									data-testid={`task-hierarchy-item-${hierarchyItem.id}`}>
									{hierarchyItem.label}
								</button>
							</div>
						))}
						{hasTaskHierarchyOverflow && (
							<button
								type="button"
								onClick={() => setShowOverflowHierarchyItems((current) => !current)}
								className="inline-flex items-center gap-1 rounded-md border border-vscode-panel-border bg-vscode-editor-background px-2 py-1 text-xs text-vscode-descriptionForeground hover:bg-vscode-list-hoverBackground hover:text-vscode-foreground"
								aria-expanded={showOverflowHierarchyItems}
								data-testid="task-hierarchy-overflow-toggle"
								title={showOverflowHierarchyItems ? "Hide extra tasks" : "Show extra tasks"}>
								<MoreHorizontal size={14} />
								{!showOverflowHierarchyItems && hiddenTaskHierarchyCount > 0 && (
									<span>{hiddenTaskHierarchyCount}</span>
								)}
							</button>
						)}
					</div>
				)}
				{!isTaskExpanded && contextWindow > 0 && (
					<div className={`w-full flex flex-col gap-1 h-auto`}>
						<TaskActivityPanel
							activity={currentTaskActivity}
							currentTaskItem={currentTaskItem}
							taskHistory={taskHistory}
							compact
							showSummary={false}
						/>
						{showTaskTimeline && (
							<TaskTimeline
								groupedMessages={groupedMessages}
								onMessageClick={onMessageClick}
								isTaskActive={isTaskActive}
							/>
						)}

						<div className="flex flex-row items-center gap-1">
							<ContextWindowProgress
								contextWindow={contextWindow}
								contextTokens={contextTokens || 0}
								maxTokens={
									model
										? getModelMaxOutputTokens({ modelId, model, settings: apiConfiguration })
										: undefined
								}
							/>
							{condenseButton}
							<ShareButton item={currentTaskItem} disabled={buttonsDisabled} />
							{showDiffStats !== false && hasDiffStats && (
								<DiffStatsDisplay added={diffStats.added} removed={diffStats.removed} />
							)}
							{!!totalCost && <span>${totalCost.toFixed(2)}</span>}
						</div>
					</div>
				)}
				{isTaskExpanded && (
					<>
						<div
							ref={textContainerRef}
							className="-mt-0.5 text-vscode-font-size overflow-y-auto break-words break-anywhere relative">
							<div
								ref={textRef}
								className="overflow-auto max-h-80 whitespace-pre-wrap break-words break-anywhere"
								style={{
									display: "-webkit-box",
									WebkitLineClamp: "unset",
									WebkitBoxOrient: "vertical",
								}}>
								{highlightText(task.text ?? "", false, customModes, commands)}
							</div>
						</div>
						{task.images && task.images.length > 0 && <Thumbnails images={task.images} />}

						{showTaskTimeline && (
							<TaskTimeline
								groupedMessages={groupedMessages}
								onMessageClick={onMessageClick}
								isTaskActive={isTaskActive}
							/>
						)}

						<TaskActivityPanel
							activity={currentTaskActivity}
							currentTaskItem={currentTaskItem}
							taskHistory={taskHistory}
						/>

						<div className="flex flex-col gap-1">
							{isTaskExpanded && contextWindow > 0 && (
								<div
									className={`w-full flex ${windowWidth < 400 ? "flex-col" : "flex-row"} gap-1 h-auto`}>
									<div className="flex items-center gap-1 flex-shrink-0">
										<span className="font-bold" data-testid="context-window-label">
											{t("chat:task.contextWindow")}
										</span>
									</div>
									<ContextWindowProgress
										contextWindow={contextWindow}
										contextTokens={contextTokens || 0}
										maxTokens={
											model
												? getModelMaxOutputTokens({
														modelId,
														model,
														settings: apiConfiguration,
													})
												: undefined
										}
									/>
									{condenseButton}
								</div>
							)}
							<div className="flex justify-between items-center h-[20px]">
								<div className="flex items-center gap-1 flex-wrap">
									<span className="font-bold">{t("chat:task.tokens")}</span>
									{typeof tokensIn === "number" && tokensIn > 0 && (
										<span className="flex items-center gap-0.5">
											<i className="codicon codicon-arrow-up text-xs font-bold" />
											{formatLargeNumber(tokensIn)}
										</span>
									)}
									{typeof tokensOut === "number" && tokensOut > 0 && (
										<span className="flex items-center gap-0.5">
											<i className="codicon codicon-arrow-down text-xs font-bold" />
											{formatLargeNumber(tokensOut)}
										</span>
									)}
								</div>
								{!totalCost && <TaskActions item={currentTaskItem} buttonsDisabled={buttonsDisabled} />}
							</div>

							{((typeof cacheReads === "number" && cacheReads > 0) ||
								(typeof cacheWrites === "number" && cacheWrites > 0)) && (
								<div className="flex items-center gap-1 flex-wrap h-[20px]">
									<span className="font-bold">{t("chat:task.cache")}</span>
									{typeof cacheWrites === "number" && cacheWrites > 0 && (
										<span className="flex items-center gap-0.5">
											<CloudUpload size={16} />
											{formatLargeNumber(cacheWrites)}
										</span>
									)}
									{typeof cacheReads === "number" && cacheReads > 0 && (
										<span className="flex items-center gap-0.5">
											<CloudDownload size={16} />
											{formatLargeNumber(cacheReads)}
										</span>
									)}
								</div>
							)}

							{!!totalCost && (
								<div className="flex justify-between items-center h-[20px]">
									<div className="flex items-center gap-1">
										<span className="font-bold">{t("chat:task.apiCost")}</span>
										<span>${totalCost?.toFixed(2)}</span>
									</div>
									<TaskActions item={currentTaskItem} buttonsDisabled={buttonsDisabled} />
								</div>
							)}

							{showDiffStats !== false && hasDiffStats && (
								<div className="flex items-center gap-1 h-[20px]">
									<span className="font-bold">{t("chat:task.changes")}</span>
									<DiffStatsDisplay added={diffStats.added} removed={diffStats.removed} />
								</div>
							)}

							<div className="flex items-center gap-1 h-[20px]">
								<span className="font-bold">{t("chat:task.depth")}</span>
								<span>{delegationDepth}</span>
							</div>

							{subtaskCount > 0 && (
								<div className="flex items-center gap-1 h-[20px]">
									<span className="font-bold">{t("chat:task.subtasks")}</span>
									<span>{subtaskCount}</span>
								</div>
							)}
						</div>
					</>
				)}
			</div>
			<TodoListDisplay todos={todos ?? (task as any)?.tool?.todos ?? []} />
		</div>
	)
}

export function highlightText(
	text: string,
	isExpanded: boolean,
	customModes: any[] = [],
	commands: Command[] = [],
): React.ReactNode {
	const parseMentions = (inputText: string) => {
		const parts: React.ReactNode[] = []
		let lastIndex = 0
		let match: RegExpExecArray | null
		const regex = new RegExp(mentionRegexGlobal.source, mentionRegexGlobal.flags)

		while ((match = regex.exec(inputText)) !== null) {
			if (match.index > lastIndex) {
				parts.push(inputText.slice(lastIndex, match.index))
			}

			const mention = match[0]
			const mentionType = mention.startsWith("/") ? "slash" : "mention"

			let isValid = false
			if (mentionType === "slash") {
				isValid = validateSlashCommand(mention, customModes, {}, {}, commands) !== null
			} else {
				isValid = true
			}

			parts.push(
				<span
					key={`${mention}-${match.index}`}
					className={cn(
						"px-1 py-0.5 rounded text-xs font-mono",
						isValid
							? "bg-vscode-textBlockQuote-background text-vscode-textLink-foreground"
							: "bg-vscode-inputValidation-errorBackground text-vscode-errorForeground",
					)}>
					{mention}
				</span>,
			)

			lastIndex = regex.lastIndex
		}

		if (lastIndex < inputText.length) {
			parts.push(inputText.slice(lastIndex))
		}

		return parts.length > 0 ? parts : inputText
	}

	if (isExpanded) {
		return parseMentions(text)
	}

	return parseMentions(text)
}

export default memo(KiloTaskHeader)
