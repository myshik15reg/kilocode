import React, { memo, useEffect, useMemo, useState } from "react"
import BottomControls from "../kilocode/BottomControls" // kilocode_change
import { ArrowLeft } from "lucide-react"
import { DeleteTaskDialog } from "./DeleteTaskDialog"
import { BatchDeleteTaskDialog } from "./BatchDeleteTaskDialog"
import { Virtuoso } from "react-virtuoso"

import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import {
	Button,
	Checkbox,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	StandardTooltip,
} from "@/components/ui"
import { useAppTranslation } from "@/i18n/TranslationContext"

import { Tab, TabContent, TabHeader } from "../common/Tab"
import OrchestrationStatusSummary from "../chat/OrchestrationStatusSummary" // kilocode_change
import { getHistoryOrchestrationSummary } from "../chat/orchestration" // kilocode_change
import { useTaskSearch } from "./useTaskSearch"
import TaskItem from "./TaskItem"
import HistoryTreeGutter from "./HistoryTreeGutter"
import {
	buildTaskTreeRows,
	formatRootTaskStatusSummaryWithI18n,
	formatRootTaskSummaryLabelWithI18n,
	getAutoExpandedTaskIds,
	getRootTaskDescendantSummaryMap,
	getRootTaskStatusSummary,
} from "./taskTree"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { vscode } from "@/utils/vscode"

type HistoryViewProps = {
	onDone: () => void
}

type SortOption = "newest" | "oldest" | "mostExpensive" | "mostTokens" | "mostRelevant"

const HistoryView = ({ onDone }: HistoryViewProps) => {
	const {
		data, // kilocode_change
		searchQuery,
		setSearchQuery,
		sortOption,
		setSortOption,
		setLastNonRelevantSort,
		showAllWorkspaces,
		setShowAllWorkspaces,
		// kilocode_change start
		taskHistoryFullLength,
		showFavoritesOnly,
		setShowFavoritesOnly,
		setRequestedPageIndex,
		// kilocode_change end
	} = useTaskSearch()
	// kilocode_change start
	const tasks = useMemo(() => data?.historyItems ?? [], [data?.historyItems])
	const pageIndex = data?.pageIndex ?? 0
	const pageCount = data?.pageCount ?? 1
	// kilocode_change end
	const { t } = useAppTranslation()
	const {
		taskHistory: extensionTaskHistory = [],
		activeRootTaskIds = [],
		runningRootTaskIds = [],
		focusedRootTaskId,
	} = useExtensionState()
	const activeRootTasks = useMemo(
		() =>
			activeRootTaskIds
				.map(
					(taskId) =>
						extensionTaskHistory.find((task) => task.id === taskId) ??
						tasks.find((task) => task.id === taskId),
				)
				.filter((task): task is NonNullable<typeof task> => Boolean(task)),
		[extensionTaskHistory, tasks, activeRootTaskIds],
	)

	const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
	const [isSelectionMode, setIsSelectionMode] = useState(false)
	const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
	const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState<boolean>(false)
	const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set()) // kilocode_change

	useEffect(() => {
		const nextExpandedIds = getAutoExpandedTaskIds(tasks, {
			focusedTaskId: focusedRootTaskId,
			activeRootTaskIds,
		})

		if (nextExpandedIds.size > 0) {
			setExpandedTaskIds((prev) => new Set([...prev, ...nextExpandedIds]))
		}
	}, [tasks, activeRootTaskIds, focusedRootTaskId])

	// kilocode_change start
	const historyRootItems = useMemo(
		() => (extensionTaskHistory.length > 0 ? extensionTaskHistory : tasks),
		[extensionTaskHistory, tasks],
	)
	const taskRows = useMemo(() => buildTaskTreeRows(tasks, expandedTaskIds), [tasks, expandedTaskIds])
	const rootTaskSummaryMap = useMemo(() => getRootTaskDescendantSummaryMap(historyRootItems), [historyRootItems]) // kilocode_change
	const rootTaskStatusSummary = useMemo(
		() =>
			formatRootTaskStatusSummaryWithI18n(
				getRootTaskStatusSummary(historyRootItems, { runningRootTaskIds }),
				(key) => t(key),
			),
		[historyRootItems, runningRootTaskIds, t],
	)
	const orchestrationSummary = useMemo(() => getHistoryOrchestrationSummary(historyRootItems), [historyRootItems])
	const toggleTaskExpansion = (taskId: string) => {
		setExpandedTaskIds((prev) => {
			const next = new Set(prev)
			if (next.has(taskId)) {
				next.delete(taskId)
			} else {
				next.add(taskId)
			}
			return next
		})
	}
	// kilocode_change end

	const toggleSelectionMode = () => {
		setIsSelectionMode(!isSelectionMode)
		if (isSelectionMode) {
			setSelectedTaskIds([])
		}
	}

	const toggleTaskSelection = (taskId: string, isSelected: boolean) => {
		if (isSelected) {
			setSelectedTaskIds((prev) => [...prev, taskId])
		} else {
			setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId))
		}
	}

	const toggleSelectAll = (selectAll: boolean) => {
		if (selectAll) {
			setSelectedTaskIds(tasks.map((task) => task.id))
		} else {
			setSelectedTaskIds([])
		}
	}

	const handleBatchDelete = () => {
		if (selectedTaskIds.length > 0) {
			setShowBatchDeleteDialog(true)
		}
	}

	return (
		<Tab>
			<TabHeader className="flex flex-col gap-2">
				{(rootTaskStatusSummary || orchestrationSummary.hasStatusSignals || activeRootTasks.length > 1) && (
					<div className="flex flex-wrap items-center gap-2 px-1" data-testid="history-active-root-switcher">
						{rootTaskStatusSummary && (
							<span className="text-xs text-vscode-descriptionForeground">{rootTaskStatusSummary}</span>
						)}
						{/* kilocode_change start */}
						{orchestrationSummary.hasStatusSignals && (
							<OrchestrationStatusSummary
								summary={orchestrationSummary}
								showTitle={false}
								className="gap-1.5"
								badgeClassName="text-[10px]"
								countsClassName="text-[10px]"
								dataTestId="history-orchestration-summary"
							/>
						)}
						{/* kilocode_change end */}
						{activeRootTasks.length > 1 &&
							activeRootTasks.map((task) => (
								<Button
									key={task.id}
									variant={focusedRootTaskId === task.id ? "primary" : "ghost"}
									className="h-7 px-2 text-xs"
									onClick={() => vscode.postMessage({ type: "showTaskWithId", text: task.id })}
									data-testid={`history-root-switch-${task.id}`}>
									<span className="flex flex-col items-start leading-tight max-w-[220px]">
										<span className="truncate max-w-[220px]">{task.task}</span>
										{formatRootTaskSummaryLabelWithI18n(rootTaskSummaryMap.get(task.id), (key) =>
											t(key),
										) && (
											<span className="text-[10px] opacity-80 truncate max-w-[220px]">
												{formatRootTaskSummaryLabelWithI18n(
													rootTaskSummaryMap.get(task.id),
													(key) => t(key),
												)}
											</span>
										)}
									</span>
								</Button>
							))}
					</div>
				)}
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							className="px-1.5 -ml-2"
							onClick={onDone}
							aria-label={t("history:done")}
							data-testid="history-done-button">
							<ArrowLeft />
							<span className="sr-only">{t("history:done")}</span>
						</Button>
						<h3 className="text-vscode-foreground m-0">{t("history:history")}</h3>
					</div>
					<StandardTooltip
						content={
							isSelectionMode ? `${t("history:exitSelectionMode")}` : `${t("history:enterSelectionMode")}`
						}>
						<Button
							variant={isSelectionMode ? "primary" : "secondary"}
							onClick={toggleSelectionMode}
							data-testid="toggle-selection-mode-button">
							<span
								className={`codicon ${isSelectionMode ? "codicon-check-all" : "codicon-checklist"} mr-1`}
							/>
							{isSelectionMode ? t("history:exitSelection") : t("history:selectionMode")}
						</Button>
					</StandardTooltip>
				</div>
				<div className="flex flex-col gap-2">
					<VSCodeTextField
						placeholder={t("history:searchPlaceholder")}
						value={searchQuery}
						onInput={(e: any) => {
							const newValue = (e.target as HTMLInputElement)?.value
							setSearchQuery(newValue)
							if (newValue && !searchQuery && sortOption !== "mostRelevant") {
								setLastNonRelevantSort(sortOption)
								setSortOption("mostRelevant")
							}
						}}>
						{searchQuery && (
							<button
								className="input-icon-button codicon codicon-close flex justify-center items-center h-full"
								aria-label="Clear search"
								onClick={() => setSearchQuery("")}
								slot="end"
							/>
						)}
					</VSCodeTextField>
					<div className="flex gap-2">
						<Select
							value={showAllWorkspaces ? "all" : "current"}
							onValueChange={(value) => setShowAllWorkspaces(value === "all")}>
							<SelectTrigger className="flex-1">
								<SelectValue>
									{t("history:workspace.prefix")}{" "}
									{t(`history:workspace.${showAllWorkspaces ? "all" : "current"}`)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="current">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-folder" />
										{t("history:workspace.current")}
									</div>
								</SelectItem>
								<SelectItem value="all">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-folder-opened" />
										{t("history:workspace.all")}
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
							<SelectTrigger className="flex-1">
								<SelectValue>
									{t("history:sort.prefix")} {t(`history:sort.${sortOption}`)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="newest" data-testid="select-newest">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-arrow-down" />
										{t("history:newest")}
									</div>
								</SelectItem>
								<SelectItem value="oldest" data-testid="select-oldest">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-arrow-up" />
										{t("history:oldest")}
									</div>
								</SelectItem>
								<SelectItem value="mostExpensive" data-testid="select-most-expensive">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-credit-card" />
										{t("history:mostExpensive")}
									</div>
								</SelectItem>
								<SelectItem value="mostTokens" data-testid="select-most-tokens">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-symbol-numeric" />
										{t("history:mostTokens")}
									</div>
								</SelectItem>
								<SelectItem
									value="mostRelevant"
									disabled={!searchQuery}
									data-testid="select-most-relevant">
									<div className="flex items-center gap-2">
										<span className="codicon codicon-search" />
										{t("history:mostRelevant")}
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="show-favorites-only"
							checked={showFavoritesOnly}
							onCheckedChange={(checked) => setShowFavoritesOnly(checked === true)}
							variant="description"
						/>
						<label htmlFor="show-favorites-only" className="text-vscode-foreground cursor-pointer">
							{t("history:showFavoritesOnly")}
						</label>
					</div>
					{isSelectionMode && tasks.length > 0 && (
						<div className="flex items-center py-1">
							<div className="flex items-center gap-2">
								<Checkbox
									checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
									onCheckedChange={(checked) => toggleSelectAll(checked === true)}
									variant="description"
								/>
								<span className="text-vscode-foreground">
									{selectedTaskIds.length === tasks.length
										? t("history:deselectAll")
										: t("history:selectAll")}
								</span>
								<span className="ml-auto text-vscode-descriptionForeground text-xs">
									{t("history:selectedItems", {
										selected: selectedTaskIds.length,
										total: taskHistoryFullLength,
									})}
								</span>
							</div>
						</div>
					)}
				</div>
			</TabHeader>

			<TabContent className="px-2 py-0">
				<Virtuoso
					className="flex-1 overflow-y-scroll"
					data={taskRows}
					data-testid="virtuoso-container"
					initialTopMostItemIndex={0}
					components={{
						List: React.forwardRef((props, ref) => (
							<div {...props} ref={ref} data-testid="virtuoso-item-list" />
						)),
					}}
					itemContent={(_index, row) => (
						<div className="flex items-stretch gap-2">
							<HistoryTreeGutter
								depth={row.depth}
								hasChildren={row.hasChildren}
								isExpanded={row.isExpanded}
								ancestorHasNextSiblings={row.ancestorHasNextSiblings}
								isLastSibling={row.isLastSibling}
								toggleTestId={`task-group-toggle-${row.item.id}`}
								toggleLabel={row.isExpanded ? t("chat:collapse") : t("chat:expand")}
								onToggle={() => toggleTaskExpansion(row.item.id)}
								className="pt-1"
							/>
							<TaskItem
								key={row.item.id}
								item={
									row.depth === 0
										? (historyRootItems.find((item) => item.id === row.item.id) ?? row.item)
										: row.item
								}
								taskHistory={historyRootItems}
								variant="full"
								isActiveRootTask={activeRootTaskIds.includes(row.item.id)}
								isFocusedRootTask={focusedRootTaskId === row.item.id}
								runningRootTaskIds={runningRootTaskIds}
								descendantSummary={row.depth === 0 ? rootTaskSummaryMap.get(row.item.id) : undefined} // kilocode_change
								showWorkspace={showAllWorkspaces}
								isSelectionMode={isSelectionMode}
								isSelected={selectedTaskIds.includes(row.item.id)}
								onToggleSelection={toggleTaskSelection}
								onDelete={setDeleteTaskId}
								className={row.depth > 0 ? "my-2 mr-2 ml-1 flex-1 min-w-0" : "my-2 mr-2 flex-1 min-w-0"}
							/>
						</div>
					)}
				/>
			</TabContent>

			<div className="bg-vscode-editor-background">
				{isSelectionMode && selectedTaskIds.length > 0 && (
					<div className="border-t border-vscode-panel-border p-2 flex justify-between items-center">
						<div className="text-vscode-foreground">
							{t("history:selectedItems", {
								selected: selectedTaskIds.length,
								total: taskHistoryFullLength,
							})}
						</div>
						<div className="flex gap-2">
							<Button variant="secondary" onClick={() => setSelectedTaskIds([])}>
								{t("history:clearSelection")}
							</Button>
							<Button variant="primary" onClick={handleBatchDelete}>
								{t("history:deleteSelected")}
							</Button>
						</div>
					</div>
				)}
				<div className="border-t border-b border-vscode-panel-border p-2 flex justify-between items-center">
					{t("kilocode:pagination.page", { page: pageIndex + 1, count: pageCount })}
					<div className="flex gap-2">
						<Button
							disabled={pageIndex <= 0}
							onClick={() => {
								if (pageIndex > 0) setRequestedPageIndex(pageIndex - 1)
							}}>
							{t("kilocode:pagination.previous")}
						</Button>
						<Button
							disabled={pageIndex >= pageCount - 1}
							onClick={() => {
								if (pageIndex < pageCount - 1) setRequestedPageIndex(pageIndex + 1)
							}}>
							{t("kilocode:pagination.next")}
						</Button>
					</div>
				</div>
			</div>

			{deleteTaskId && (
				<DeleteTaskDialog taskId={deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)} open />
			)}
			{showBatchDeleteDialog && (
				<BatchDeleteTaskDialog
					taskIds={selectedTaskIds}
					open={showBatchDeleteDialog}
					onOpenChange={(open) => {
						if (!open) {
							setShowBatchDeleteDialog(false)
							setSelectedTaskIds([])
							setIsSelectionMode(false)
						}
					}}
				/>
			)}
			<div className="fixed bottom-0 right-0">
				<BottomControls />
			</div>
		</Tab>
	)
}

export default memo(HistoryView)
