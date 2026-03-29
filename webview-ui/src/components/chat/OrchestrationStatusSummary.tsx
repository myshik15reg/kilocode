// kilocode_change - new file
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { OrchestrationStatusSummary as OrchestrationStatusSummaryValue } from "./orchestration"
import {
	getOrchestrationCountDefaultLabel,
	getVisibleOrchestrationCounts,
	orchestrationStatusDefaultLabels,
	orchestrationStatusCountLabelKeys,
	orchestrationStatusLabelKeys,
} from "./orchestration"
import OrchestrationStatusBadge from "./OrchestrationStatusBadge"

interface OrchestrationStatusSummaryProps {
	summary: OrchestrationStatusSummaryValue
	showTitle?: boolean
	className?: string
	titleClassName?: string
	badgeClassName?: string
	countsClassName?: string
	dataTestId?: string
}

const OrchestrationStatusSummary = ({
	summary,
	showTitle = true,
	className,
	titleClassName,
	badgeClassName,
	countsClassName,
	dataTestId,
}: OrchestrationStatusSummaryProps) => {
	const { t } = useTranslation()
	const visibleCounts = useMemo(() => getVisibleOrchestrationCounts(summary.counts), [summary.counts])
	const badgeLabel = t(orchestrationStatusLabelKeys[summary.status], {
		defaultValue: orchestrationStatusDefaultLabels[summary.status],
	})
	const badgeTitle = [
		showTitle ? t("chat:orchestration.title", { defaultValue: "Orchestration" }) : undefined,
		badgeLabel,
		...visibleCounts.map(({ status, count }) =>
			t(orchestrationStatusCountLabelKeys[status], {
				count,
				defaultValue: getOrchestrationCountDefaultLabel(status, count),
			}),
		),
	]
		.filter(Boolean)
		.join(" · ")

	if (!summary.hasStatusSignals) {
		return null
	}

	return (
		<span className={cn("inline-flex flex-wrap items-center gap-2", className)} data-testid={dataTestId}>
			{showTitle && (
				<span className={cn("text-xs font-medium text-vscode-descriptionForeground", titleClassName)}>
					{t("chat:orchestration.title", { defaultValue: "Orchestration" })}
				</span>
			)}
			<OrchestrationStatusBadge
				status={summary.status}
				label={badgeLabel}
				title={badgeTitle}
				className={badgeClassName}
			/>
			{visibleCounts.map(({ status, count }) => (
				<span
					key={status}
					className={cn("text-[10px] text-vscode-descriptionForeground whitespace-nowrap", countsClassName)}>
					{t(orchestrationStatusCountLabelKeys[status], {
						count,
						defaultValue: getOrchestrationCountDefaultLabel(status, count),
					})}
				</span>
			))}
		</span>
	)
}

export default OrchestrationStatusSummary
