// kilocode_change - new file
import { HTMLAttributes, useMemo } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Monitor } from "lucide-react"
import { telemetryClient } from "@/utils/TelemetryClient"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { SearchableSetting } from "./SearchableSetting"
import { Slider } from "../ui"
import { TaskTimeline } from "../chat/TaskTimeline"
import { generateSampleTimelineData } from "../../utils/timeline/mockData"

type DisplaySettingsProps = HTMLAttributes<HTMLDivElement> & {
	showTaskTimeline?: boolean
	sendMessageOnEnter?: boolean // kilocode_change
	showTimestamps?: boolean
	showDiffStats?: boolean // kilocode_change
	reasoningBlockCollapsed: boolean
	setCachedStateField: SetCachedStateField<
		| "showTaskTimeline"
		| "sendMessageOnEnter"
		| "ghostServiceSettings"
		| "reasoningBlockCollapsed"
		| "hideCostBelowThreshold"
		| "showTimestamps"
		| "showDiffStats"
	>
	hideCostBelowThreshold?: number
}

export const DisplaySettings = ({
	showTaskTimeline,
	sendMessageOnEnter,
	showTimestamps,
	showDiffStats,
	hideCostBelowThreshold,
	setCachedStateField,
	reasoningBlockCollapsed,
	...props
}: DisplaySettingsProps) => {
	const { t } = useAppTranslation()

	const sampleTimelineData = useMemo(() => generateSampleTimelineData(), [])

	const handleReasoningBlockCollapsedChange = (value: boolean) => {
		setCachedStateField("reasoningBlockCollapsed", value)

		telemetryClient.capture("ui_settings_collapse_thinking_changed", {
			enabled: value,
		})
	}

	return (
		<div {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<Monitor className="w-4" />
					<div>{t("settings:sections.display")}</div>
				</div>
			</SectionHeader>

			<Section>
				<div className="flex flex-col gap-1">
					<VSCodeCheckbox
						checked={reasoningBlockCollapsed}
						onChange={(e: any) => handleReasoningBlockCollapsedChange(e.target.checked)}
						data-testid="collapse-thinking-checkbox">
						<span className="font-medium">{t("settings:ui.collapseThinking.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
						{t("settings:ui.collapseThinking.description")}
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<VSCodeCheckbox
						checked={sendMessageOnEnter}
						onChange={(e) => {
							setCachedStateField("sendMessageOnEnter", (e as any).target?.checked || false)
						}}>
						<span className="font-medium">{t("settings:display.sendMessageOnEnter.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:display.sendMessageOnEnter.description")}
					</div>
				</div>
			</Section>

			<Section>
				<SearchableSetting
					settingId="display-task-timeline"
					section="display"
					label={t("kilocode:settings.alfaCode.timeline.label")}>
					<VSCodeCheckbox
						checked={showTaskTimeline}
						onChange={(e: any) => setCachedStateField("showTaskTimeline", e.target.checked)}
						data-testid="display-show-task-timeline-checkbox">
						<span className="font-medium">{t("kilocode:settings.alfaCode.timeline.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("kilocode:settings.alfaCode.timeline.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="display-timestamps"
					section="display"
					label={t("settings:display.showTimestamps.label")}>
					<VSCodeCheckbox
						checked={showTimestamps}
						onChange={(e: any) => setCachedStateField("showTimestamps", e.target.checked)}
						data-testid="display-show-timestamps-checkbox">
						<span className="font-medium">{t("settings:display.showTimestamps.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:display.showTimestamps.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="display-diff-stats"
					section="display"
					label={t("settings:display.showDiffStats.label")}>
					<VSCodeCheckbox
						checked={showDiffStats}
						onChange={(e: any) => setCachedStateField("showDiffStats", e.target.checked)}
						data-testid="display-show-diff-stats-checkbox">
						<span className="font-medium">{t("settings:display.showDiffStats.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:display.showDiffStats.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="display-cost-threshold"
					section="display"
					label={t("settings:display.costThreshold.label")}>
					<div className="font-medium mb-1">{t("settings:display.costThreshold.label")}</div>
					<div className="flex items-center gap-2">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[hideCostBelowThreshold ?? 0]}
							onValueChange={([value]) => setCachedStateField("hideCostBelowThreshold", value)}
							data-testid="display-cost-threshold-slider"
						/>
						<span className="min-w-[60px] text-sm">${(hideCostBelowThreshold ?? 0).toFixed(2)}</span>
					</div>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:display.costThreshold.description")}
					</div>
				</SearchableSetting>

				<div>
					<div className="font-medium">{t("settings:common.preview")}</div>
					<div className="mt-3 opacity-60">
						<TaskTimeline groupedMessages={sampleTimelineData} isTaskActive={false} />
					</div>
				</div>
			</Section>
		</div>
	)
}
