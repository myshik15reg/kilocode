// kilocode_change: new file
import { memo, useMemo, useRef, useState } from "react"
import { useWindowSize } from "react-use"
import { useTranslation } from "react-i18next"
import { CloudUpload, CloudDownload, FoldVertical } from "lucide-react"
import { validateSlashCommand } from "@/utils/slash-commands"

import type { ClineMessage, Command } from "@roo-code/types"

import { getModelMaxOutputTokens } from "@roo/api"
import { findLastIndex } from "@roo/array"

import { formatLargeNumber } from "@src/utils/format"
import { cn } from "@src/lib/utils"
import { StandardTooltip } from "@src/components/ui"
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

	return `${candidate.slice(0, TASK_HIERARCHY_LABEL_LIMIT - 1).trimEnd()}...`
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
		customModes,
		commands,
		taskHistory = [],
	} = useExtensionState()
	const { id: modelId, info: model } = useSelectedModel(apiConfiguration)
	const [isTaskExpanded, setIsTaskExpanded] = useState(false)

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
		const seenTaskIds = new Set<string>()
		const currentHistoryItem = taskHistoryById.get(currentTaskItem.id)
		const parentTaskId =
			currentTaskItem.parentTaskId ||
			(currentTaskItem.rootTaskId && currentTaskItem.rootTaskId !== currentTaskItem.id
				? currentTaskItem.rootTaskId
				: undefined)
		const derivedChildTaskIds = taskHistory
			.filter((historyItem) => historyItem.parentTaskId === currentTaskItem.id)
			.map((historyItem) => historyItem.id)
		const childTaskIds = [...(currentTaskItem.childIds ?? []), ...derivedChildTaskIds]

		const appendHierarchyItem = (taskId: string | undefined, role: TaskHierarchyRole) => {
			if (!taskId || seenTaskIds.has(taskId)) {
				return
			}

			const historyItem = taskHistoryById.get(taskId)
			const fullLabel =
				role === "current" ? currentHistoryItem?.task || task.text || taskId : historyItem?.task || taskId

			items.push({
				id: taskId,
				label: shortenTaskLabel(fullLabel, taskId),
				fullLabel,
				role,
				isCurrent: taskId === currentTaskItem.id,
			})
			seenTaskIds.add(taskId)
		}

		appendHierarchyItem(parentTaskId, "parent")
		appendHierarchyItem(currentTaskItem.id, "current")
		childTaskIds.forEach((childTaskId) => appendHierarchyItem(childTaskId, "child"))

		return items
	}, [currentTaskItem, task.text, taskHistory, taskHistoryById])
	const isTaskComplete = useMemo(() => {
		if (!clineMessages?.length) {
			return false
		}

		const lastRelevantIndex = findLastIndex(
			clineMessages,
			(message) => !(message.ask === "resume_task" || message.ask === "resume_completed_task"),
		)

		return lastRelevantIndex !== -1 ? clineMessages[lastRelevantIndex]?.ask === "completion_result" : false
	}, [clineMessages])

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
						</div>
					</div>
					<StandardTooltip content={t("chat:task.closeAndStart")}>
						{/* kilocode_change start - use a native button for the task close control */}
						<button
							type="button"
							aria-label={t("chat:task.closeAndStart")}
							onClick={(event) => {
								event.stopPropagation()
								onClose()
							}}
							className="shrink-0 h-5 w-5 cursor-pointer rounded-md border-0 bg-transparent p-0 text-vscode-descriptionForeground hover:bg-vscode-list-hoverBackground hover:text-vscode-foreground">
							<span aria-hidden="true" className="codicon codicon-close text-[12px] leading-none" />
						</button>
						{/* kilocode_change end */}
					</StandardTooltip>
				</div>
				{taskHierarchyItems.length > 1 && (
					<div className="mt-2 w-full flex flex-wrap items-start gap-1" data-testid="task-hierarchy-nav">
						{taskHierarchyItems.map((hierarchyItem, index) => (
							<div key={hierarchyItem.id} className="flex max-w-full min-w-0 items-center gap-1">
								{index > 0 && <span className="text-xs text-vscode-descriptionForeground">{">"}</span>}
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
					</div>
				)}
				{!isTaskExpanded && contextWindow > 0 && (
					<div className={`w-full flex flex-col gap-1 h-auto`}>
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
								{!totalCost && (
									<TaskActions
										item={currentTaskItem}
										buttonsDisabled={buttonsDisabled}
										isTaskComplete={isTaskComplete}
										showTaskControls={false}
									/>
								)}
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
									<TaskActions
										item={currentTaskItem}
										buttonsDisabled={buttonsDisabled}
										isTaskComplete={isTaskComplete}
										showTaskControls={false}
									/>
								</div>
							)}

							{showDiffStats !== false && hasDiffStats && (
								<div className="flex items-center gap-1 h-[20px]">
									<span className="font-bold">{t("chat:task.changes")}</span>
									<DiffStatsDisplay added={diffStats.added} removed={diffStats.removed} />
								</div>
							)}

							{delegationDepth > 0 && (
								<div className="flex items-center gap-1 h-[20px]">
									<span className="font-bold">{t("chat:task.depth")}</span>
									<span>{delegationDepth}</span>
								</div>
							)}

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
