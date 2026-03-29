import { HTMLAttributes } from "react"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Gauge, Sparkles } from "lucide-react"

import { useAppTranslation } from "@/i18n/TranslationContext"
import { cn } from "@/lib/utils"
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider } from "@/components/ui"

import { Section } from "./Section"
import { SectionHeader } from "./SectionHeader"
import { SearchableSetting } from "./SearchableSetting"
import { SetCachedStateField } from "./types"

type AlfaCodeSettingsProps = HTMLAttributes<HTMLDivElement> & {
	listApiConfigMeta: any[]
	currentApiConfigName?: string
	enhancementApiConfigId?: string
	condensingApiConfigId?: string
	autoRestartProblematicProcesses?: boolean
	problematicProcessRestartLimit?: number
	parallelAgentsEnabled?: boolean
	parallelAgentCount?: number
	autoCondenseContext?: boolean
	autoCondenseContextPercent?: number
	contextRoutingEnabled?: boolean
	contextRoutingFastThresholdPercent?: number
	contextRoutingDeepThresholdPercent?: number
	terminalCommandApiConfigId?: string
	setCachedStateField: SetCachedStateField<
		| "enhancementApiConfigId"
		| "condensingApiConfigId"
		| "autoRestartProblematicProcesses"
		| "problematicProcessRestartLimit"
		| "parallelAgentsEnabled"
		| "parallelAgentCount"
		| "autoCondenseContext"
		| "autoCondenseContextPercent"
		| "contextRoutingEnabled"
		| "contextRoutingFastThresholdPercent"
		| "contextRoutingDeepThresholdPercent"
		| "terminalCommandApiConfigId"
	>
}

export const AlfaCodeSettings = ({
	listApiConfigMeta,
	currentApiConfigName,
	enhancementApiConfigId,
	condensingApiConfigId,
	autoRestartProblematicProcesses,
	problematicProcessRestartLimit,
	parallelAgentsEnabled,
	parallelAgentCount,
	autoCondenseContext,
	autoCondenseContextPercent,
	contextRoutingEnabled,
	contextRoutingFastThresholdPercent,
	contextRoutingDeepThresholdPercent,
	setCachedStateField,
	className,
	...props
}: AlfaCodeSettingsProps) => {
	const { t } = useAppTranslation()
	const firstProfileId = listApiConfigMeta?.[0]?.id || ""

	const applyPreset = (preset: "quality" | "balanced" | "tokenSaver") => {
		const presets = {
			quality: {
				autoCondenseContext: true,
				autoCondenseContextPercent: 92,
				contextRoutingEnabled: false,
				contextRoutingFastThresholdPercent: 55,
				contextRoutingDeepThresholdPercent: 85,
			},
			balanced: {
				autoCondenseContext: true,
				autoCondenseContextPercent: 85,
				contextRoutingEnabled: true,
				contextRoutingFastThresholdPercent: 35,
				contextRoutingDeepThresholdPercent: 65,
			},
			tokenSaver: {
				autoCondenseContext: true,
				autoCondenseContextPercent: 70,
				contextRoutingEnabled: true,
				contextRoutingFastThresholdPercent: 25,
				contextRoutingDeepThresholdPercent: 50,
			},
		} as const

		const next = presets[preset]
		setCachedStateField("autoCondenseContext", next.autoCondenseContext)
		setCachedStateField("autoCondenseContextPercent", next.autoCondenseContextPercent)
		setCachedStateField("contextRoutingEnabled", next.contextRoutingEnabled)
		setCachedStateField("contextRoutingFastThresholdPercent", next.contextRoutingFastThresholdPercent)
		setCachedStateField("contextRoutingDeepThresholdPercent", next.contextRoutingDeepThresholdPercent)
	}

	const applyRoutingPreset = (preset: "strongMainCheapHelpers" | "balanced" | "maximumSaving") => {
		const presets = {
			strongMainCheapHelpers: {
				enhancementApiConfigId: firstProfileId,
				condensingApiConfigId: firstProfileId,
				terminalCommandApiConfigId: firstProfileId,
			},
			balanced: {
				enhancementApiConfigId: enhancementApiConfigId || firstProfileId,
				condensingApiConfigId: condensingApiConfigId || firstProfileId,
				terminalCommandApiConfigId: firstProfileId,
			},
			maximumSaving: {
				enhancementApiConfigId: firstProfileId,
				condensingApiConfigId: firstProfileId,
				terminalCommandApiConfigId: firstProfileId,
			},
		} as const

		const next = presets[preset]
		setCachedStateField("enhancementApiConfigId", next.enhancementApiConfigId)
		setCachedStateField("condensingApiConfigId", next.condensingApiConfigId)
		setCachedStateField("terminalCommandApiConfigId", next.terminalCommandApiConfigId)
	}

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<SectionHeader description={t("kilocode:settings.alfaCode.description")}>
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4" />
					<div>{t("settings:sections.alfaCode")}</div>
				</div>
			</SectionHeader>

			<Section>
				<SearchableSetting
					settingId="alfa-code-presets"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.presets.title")}>
					<div className="font-medium mb-2">{t("kilocode:settings.alfaCode.presets.title")}</div>
					<div className="text-vscode-descriptionForeground text-sm mb-3">
						{t("kilocode:settings.alfaCode.presets.description")}
					</div>
					<div className="flex flex-wrap gap-2">
						<Button data-testid="alfacode-preset-quality" onClick={() => applyPreset("quality")}>
							{t("kilocode:settings.alfaCode.presets.quality")}
						</Button>
						<Button data-testid="alfacode-preset-balanced" onClick={() => applyPreset("balanced")}>
							{t("kilocode:settings.alfaCode.presets.balanced")}
						</Button>
						<Button data-testid="alfacode-preset-token-saver" onClick={() => applyPreset("tokenSaver")}>
							{t("kilocode:settings.alfaCode.presets.tokenSaver")}
						</Button>
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-task-strategy"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.taskStrategy.title")}>
					<div className="font-medium mb-2">{t("kilocode:settings.alfaCode.taskStrategy.title")}</div>
					<div className="text-vscode-descriptionForeground text-sm mb-3">
						{t("kilocode:settings.alfaCode.taskStrategy.description")}
					</div>
					<div className="grid gap-3 lg:grid-cols-3">
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-local-card">
							<div className="flex items-center gap-2 mb-1">
								<div className="font-medium text-sm">
									{t("kilocode:settings.alfaCode.taskStrategy.local.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.cheapest")}
								</Badge>
							</div>
							<div className="text-vscode-descriptionForeground text-sm">
								{t("kilocode:settings.alfaCode.taskStrategy.local.description")}
							</div>
						</div>
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-compact-card">
							<div className="flex items-center gap-2 mb-1">
								<div className="font-medium text-sm">
									{t("kilocode:settings.alfaCode.taskStrategy.compact.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.recommendedLongContext")}
								</Badge>
							</div>
							<div className="text-vscode-descriptionForeground text-sm">
								{t("kilocode:settings.alfaCode.taskStrategy.compact.description")}
							</div>
						</div>
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-new-task-card">
							<div className="flex items-center gap-2 mb-1">
								<div className="font-medium text-sm">
									{t("kilocode:settings.alfaCode.taskStrategy.newTask.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.bestIsolation")}
								</Badge>
							</div>
							<div className="text-vscode-descriptionForeground text-sm">
								{t("kilocode:settings.alfaCode.taskStrategy.newTask.description")}
							</div>
						</div>
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-parallel-agents-enabled"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.parallelAgents.enabled.label")}>
					<VSCodeCheckbox
						checked={parallelAgentsEnabled ?? false}
						onChange={(e: any) => setCachedStateField("parallelAgentsEnabled", e.target.checked)}
						data-testid="alfacode-parallel-agents-enabled-checkbox">
						<span className="font-medium">
							{t("kilocode:settings.alfaCode.parallelAgents.enabled.label")}
						</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("kilocode:settings.alfaCode.parallelAgents.enabled.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-parallel-agent-count"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.parallelAgents.count.label")}>
					{parallelAgentsEnabled && (
						<>
							<div className="font-medium mb-1">
								{t("kilocode:settings.alfaCode.parallelAgents.count.label")}
							</div>
							<div className="flex items-center gap-2">
								<Slider
									min={1}
									max={500}
									step={1}
									value={[parallelAgentCount ?? 2]}
									onValueChange={([value]) => setCachedStateField("parallelAgentCount", value)}
									data-testid="alfacode-parallel-agent-count-slider"
								/>
								<span className="min-w-[40px] text-sm">{parallelAgentCount ?? 2}</span>
							</div>
							<div className="text-vscode-descriptionForeground text-sm mt-1">
								{t("kilocode:settings.alfaCode.parallelAgents.count.description")}
							</div>
						</>
					)}
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-problematic-process-restart"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.recovery.autoRestartProblematicProcesses.label")}>
					<VSCodeCheckbox
						checked={autoRestartProblematicProcesses ?? false}
						onChange={(e: any) => setCachedStateField("autoRestartProblematicProcesses", e.target.checked)}
						data-testid="alfacode-auto-restart-problematic-processes-checkbox">
						<span className="font-medium">
							{t("kilocode:settings.alfaCode.recovery.autoRestartProblematicProcesses.label")}
						</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("kilocode:settings.alfaCode.recovery.autoRestartProblematicProcesses.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-problematic-process-restart-limit"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.recovery.problematicProcessRestartLimit.label")}>
					{autoRestartProblematicProcesses && (
						<>
							<div className="font-medium mb-1">
								{t("kilocode:settings.alfaCode.recovery.problematicProcessRestartLimit.label")}
							</div>
							<div className="flex items-center gap-2">
								<Slider
									min={1}
									max={10}
									step={1}
									value={[problematicProcessRestartLimit ?? 1]}
									onValueChange={([value]) =>
										setCachedStateField("problematicProcessRestartLimit", value)
									}
									data-testid="alfacode-problematic-process-restart-limit-slider"
								/>
								<span className="min-w-[40px] text-sm">{problematicProcessRestartLimit ?? 1}</span>
							</div>
							<div className="text-vscode-descriptionForeground text-sm mt-1">
								{t("kilocode:settings.alfaCode.recovery.problematicProcessRestartLimit.description")}
							</div>
						</>
					)}
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-routing-presets"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.routing.presets.title")}>
					<div className="font-medium mb-2">{t("kilocode:settings.alfaCode.routing.presets.title")}</div>
					<div className="text-vscode-descriptionForeground text-sm mb-3">
						{t("kilocode:settings.alfaCode.routing.presets.description")}
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							data-testid="alfacode-routing-preset-strong-main-cheap-helpers"
							onClick={() => applyRoutingPreset("strongMainCheapHelpers")}>
							{t("kilocode:settings.alfaCode.routing.presets.strongMainCheapHelpers")}
						</Button>
						<Button
							data-testid="alfacode-routing-preset-balanced"
							onClick={() => applyRoutingPreset("balanced")}>
							{t("kilocode:settings.alfaCode.routing.presets.balanced")}
						</Button>
						<Button
							data-testid="alfacode-routing-preset-maximum-saving"
							onClick={() => applyRoutingPreset("maximumSaving")}>
							{t("kilocode:settings.alfaCode.routing.presets.maximumSaving")}
						</Button>
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-model-routing"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.routing.title")}>
					<div className="font-medium mb-2">{t("kilocode:settings.alfaCode.routing.title")}</div>
					<div className="text-vscode-descriptionForeground text-sm mb-3">
						{t("kilocode:settings.alfaCode.routing.description")}
					</div>
					<VSCodeCheckbox
						checked={contextRoutingEnabled ?? false}
						onChange={(e: any) => setCachedStateField("contextRoutingEnabled", e.target.checked)}
						data-testid="context-routing-enabled-checkbox">
						<span className="font-medium">{t("settings:contextManagement.contextRouting.name")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1 mb-3">
						{t("settings:contextManagement.contextRouting.description")}
					</div>
					{contextRoutingEnabled && (
						<div className="mb-3 flex flex-col gap-3 pl-3 border-l-2 border-vscode-button-background">
							<div className="flex items-center gap-4 font-bold">
								<Gauge size={16} />
								<div>{t("settings:contextManagement.contextRouting.thresholdsLabel")}</div>
							</div>
							<div>
								<span className="block font-medium mb-1">
									{t("settings:contextManagement.contextRouting.fastLabel")}
								</span>
								<div className="flex items-center gap-2">
									<Slider
										min={10}
										max={100}
										step={1}
										value={[contextRoutingFastThresholdPercent ?? 35]}
										onValueChange={([value]) =>
											setCachedStateField("contextRoutingFastThresholdPercent", value)
										}
										data-testid="context-routing-fast-threshold-slider"
									/>
									<span className="w-20">{contextRoutingFastThresholdPercent ?? 35}%</span>
								</div>
								<div className="text-vscode-descriptionForeground text-sm mt-1">
									{t("settings:contextManagement.contextRouting.fastDescription")}
								</div>
							</div>
							<div>
								<span className="block font-medium mb-1">
									{t("settings:contextManagement.contextRouting.deepLabel")}
								</span>
								<div className="flex items-center gap-2">
									<Slider
										min={10}
										max={100}
										step={1}
										value={[contextRoutingDeepThresholdPercent ?? 65]}
										onValueChange={([value]) =>
											setCachedStateField("contextRoutingDeepThresholdPercent", value)
										}
										data-testid="context-routing-deep-threshold-slider"
									/>
									<span className="w-20">{contextRoutingDeepThresholdPercent ?? 65}%</span>
								</div>
								<div className="text-vscode-descriptionForeground text-sm mt-1">
									{t("settings:contextManagement.contextRouting.deepDescription")}
								</div>
							</div>
						</div>
					)}
					<div className="grid items-start gap-3 lg:grid-cols-2">
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="flex items-center gap-2 mb-1">
								<div className="font-medium text-sm">
									{t("kilocode:settings.alfaCode.routing.primary.label")}
								</div>
								<Badge
									variant="outline"
									className="text-[10px] uppercase tracking-wide"
									data-testid="alfacode-routing-primary-badge">
									{t("kilocode:settings.alfaCode.routing.badges.recommendedMain")}
								</Badge>
							</div>
							<div className="rounded border border-vscode-input-border px-3 py-2 text-sm">
								{currentApiConfigName || t("kilocode:settings.alfaCode.routing.useCurrent")}
							</div>
							<div className="text-vscode-descriptionForeground text-sm mt-1">
								{t("kilocode:settings.alfaCode.routing.primary.description")}
							</div>
						</div>
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="flex items-center gap-2 mb-1">
								<div className="font-medium text-sm">
									{t("kilocode:settings.alfaCode.routing.enhance.label")}
								</div>
								<Badge
									variant="outline"
									className="text-[10px] uppercase tracking-wide"
									data-testid="alfacode-routing-helper-badge">
									{t("kilocode:settings.alfaCode.routing.badges.recommendedCheap")}
								</Badge>
							</div>
							<Select
								value={enhancementApiConfigId || "-"}
								onValueChange={(value) =>
									setCachedStateField("enhancementApiConfigId", value === "-" ? "" : value)
								}
								data-testid="alfacode-enhancement-api-config-select">
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("kilocode:settings.alfaCode.routing.useCurrent")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="-">
										{t("kilocode:settings.alfaCode.routing.useCurrent")}
									</SelectItem>
									{(listApiConfigMeta || []).map((config) => (
										<SelectItem key={config.id} value={config.id}>
											{config.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="text-vscode-descriptionForeground text-sm mt-1">
								{t("kilocode:settings.alfaCode.routing.enhance.description")}
							</div>
						</div>
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3 lg:col-span-2">
							<div className="font-medium text-sm mb-1">
								{t("kilocode:settings.alfaCode.routing.condense.label")}
							</div>
							<div className="text-vscode-descriptionForeground text-sm mb-2">
								{t("kilocode:settings.alfaCode.routing.condense.description")}
							</div>
							<Select
								value={condensingApiConfigId || "-"}
								onValueChange={(value) =>
									setCachedStateField("condensingApiConfigId", value === "-" ? "" : value)
								}
								data-testid="alfacode-condensing-api-config-select">
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("kilocode:settings.alfaCode.routing.useCurrent")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="-">
										{t("kilocode:settings.alfaCode.routing.useCurrent")}
									</SelectItem>
									{(listApiConfigMeta || []).map((config) => (
										<SelectItem key={config.id} value={config.id}>
											{config.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</SearchableSetting>
			</Section>
		</div>
	)
}
