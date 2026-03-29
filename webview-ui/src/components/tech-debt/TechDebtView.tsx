// kilocode_change - new file
import { memo, useMemo } from "react"
import { Wrench, ArrowLeft, Check, X, ListTodo, ExternalLink } from "lucide-react"

import type { TechDebtItem } from "@roo-code/types"

import { useExtensionState } from "@/context/ExtensionStateContext"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { vscode } from "@/utils/vscode"
import { Button } from "@/components/ui"

import { Tab, TabContent, TabHeader } from "../common/Tab"
import BottomControls from "../kilocode/BottomControls"

type TechDebtViewProps = {
	onDone: () => void
}

const severityClasses: Record<TechDebtItem["severity"], string> = {
	low: "border-blue-500/50 text-blue-300",
	medium: "border-yellow-500/60 text-yellow-300",
	high: "border-red-500/70 text-red-300",
}

const categoryLabel = (category: TechDebtItem["category"]) => category.replace(/_/g, " ")

const TechDebtView = ({ onDone }: TechDebtViewProps) => {
	const { t } = useAppTranslation()
	const { techDebtBacklog = [], currentTaskItem } = useExtensionState()

	const suggestedItems = useMemo(
		() => techDebtBacklog.filter((item) => item.status === "suggested").sort((a, b) => b.createdAt - a.createdAt),
		[techDebtBacklog],
	)

	const currentRootTaskId = currentTaskItem?.rootTaskId ?? currentTaskItem?.id
	const scopedItems = useMemo(() => {
		if (!currentRootTaskId) {
			return suggestedItems
		}

		const currentItems = suggestedItems.filter((item) => item.rootTaskId === currentRootTaskId)
		return currentItems.length > 0 ? currentItems : suggestedItems
	}, [currentRootTaskId, suggestedItems])

	const acceptItem = (item: TechDebtItem) => {
		vscode.postMessage({ type: "acceptTechDebt", text: item.sourceTaskId, itemId: item.id })
	}

	const dismissItem = (item: TechDebtItem) => {
		vscode.postMessage({ type: "dismissTechDebt", text: item.sourceTaskId, itemId: item.id })
	}

	const convertItem = (item: TechDebtItem) => {
		vscode.postMessage({ type: "convertTechDebtToTask", text: item.sourceTaskId, itemId: item.id })
	}

	const openSourceTask = (item: TechDebtItem) => {
		vscode.postMessage({ type: "showTaskWithId", text: item.sourceTaskId })
	}

	return (
		<Tab>
			<TabHeader>
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Wrench size={16} className="text-vscode-descriptionForeground" />
						<div>
							<div className="text-sm font-medium text-vscode-foreground">
								{t("kilocode:techDebt.title")}
							</div>
							<div className="text-xs text-vscode-descriptionForeground">
								{t("kilocode:techDebt.subtitle", { count: scopedItems.length })}
							</div>
						</div>
					</div>
					<Button variant="ghost" size="sm" onClick={onDone} className="gap-1">
						<ArrowLeft size={14} />
						{t("history:done")}
					</Button>
				</div>
			</TabHeader>

			<TabContent className="px-4 py-4">
				{scopedItems.length === 0 ? (
					<div
						className="rounded border border-vscode-panel-border bg-vscode-editor-background p-4 text-sm text-vscode-descriptionForeground"
						data-testid="tech-debt-empty">
						{t("kilocode:techDebt.empty")}
					</div>
				) : (
					<div className="flex flex-col gap-3" data-testid="tech-debt-list">
						{scopedItems.map((item) => (
							<div
								key={item.id}
								className="rounded border border-vscode-panel-border bg-vscode-editor-background p-4"
								data-testid={`tech-debt-item-${item.id}`}>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="mb-2 flex flex-wrap items-center gap-2">
											<span className="text-sm font-medium text-vscode-foreground">
												{item.title}
											</span>
											<span
												className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide ${severityClasses[item.severity]}`}>
												{item.severity}
											</span>
											<span className="rounded border border-vscode-panel-border px-2 py-0.5 text-[10px] text-vscode-descriptionForeground">
												{categoryLabel(item.category)}
											</span>
										</div>
										<p className="text-sm text-vscode-foreground">{item.summary}</p>
										{item.evidence && item.evidence.length > 0 && (
											<div className="mt-3">
												<div className="mb-1 text-xs font-medium text-vscode-descriptionForeground">
													{t("kilocode:techDebt.evidence")}
												</div>
												<ul className="list-disc space-y-1 pl-5 text-xs text-vscode-descriptionForeground">
													{item.evidence.map((evidence, index) => (
														<li key={`${item.id}-evidence-${index}`}>{evidence}</li>
													))}
												</ul>
											</div>
										)}
									</div>

									<div className="flex flex-wrap justify-end gap-2">
										<Button
											size="sm"
											variant="secondary"
											onClick={() => acceptItem(item)}
											data-testid={`tech-debt-accept-${item.id}`}>
											<Check size={14} className="mr-1" />
											{t("kilocode:techDebt.actions.accept")}
										</Button>
										<Button
											size="sm"
											variant="secondary"
											onClick={() => dismissItem(item)}
											data-testid={`tech-debt-dismiss-${item.id}`}>
											<X size={14} className="mr-1" />
											{t("kilocode:techDebt.actions.dismiss")}
										</Button>
										<Button
											size="sm"
											onClick={() => convertItem(item)}
											data-testid={`tech-debt-convert-${item.id}`}>
											<ListTodo size={14} className="mr-1" />
											{t("kilocode:techDebt.actions.convert")}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => openSourceTask(item)}
											data-testid={`tech-debt-open-source-${item.id}`}>
											<ExternalLink size={14} className="mr-1" />
											{t("kilocode:techDebt.actions.openSource")}
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</TabContent>

			<div className="fixed bottom-0 right-0">
				<BottomControls />
			</div>
		</Tab>
	)
}

export default memo(TechDebtView)
