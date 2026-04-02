// kilocode_change - new file
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { OrchestrationStatusSummary as OrchestrationStatusSummaryValue } from "./orchestration"
import {
	formatCompactOrchestrationCounts,
	getVisibleOrchestrationCounts,
	orchestrationStatusDefaultLabels,
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
	const compactCountsLabel = useMemo(() => formatCompactOrchestrationCounts(summary.counts), [summary.counts])
	const badgeTitle = [
		showTitle ? t("chat:orchestration.title", { defaultValue: "Orchestration" }) : undefined,
		badgeLabel,
		compactCountsLabel || undefined,
	]
		.filter(Boolean)
		.join(" · ")

	if (!summary.hasStatusSignals) {
		return null
	}

	return (
		<span className={cn("inline-flex flex-wrap items-center gap-1.5", className)} data-testid={dataTestId}>
			{showTitle && (
				<span className={cn("text-[11px] font-medium text-vscode-descriptionForeground", titleClassName)}>
					{t("chat:orchestration.title", { defaultValue: "Orchestration" })}
				</span>
			)}
			<OrchestrationStatusBadge
				status={summary.status}
				label={badgeLabel}
				title={badgeTitle}
				className={badgeClassName}
			/>
			{visibleCounts.length > 0 && compactCountsLabel && (
				<span
					className={cn(
						"text-[10px] leading-tight whitespace-nowrap text-vscode-descriptionForeground/85",
						countsClassName,
					)}>
					{compactCountsLabel}
				</span>
			)}
		</span>
	)
}

export default OrchestrationStatusSummary
