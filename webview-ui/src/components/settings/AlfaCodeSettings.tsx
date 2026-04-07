import { HTMLAttributes, useEffect, useMemo, useState } from "react"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Gauge, Sparkles, Stethoscope } from "lucide-react"
import type { ExtensionMessage, LocalAiDiagnosticsResultPayload, ProviderSettingsEntry } from "@roo-code/types"

import { useAppTranslation } from "@/i18n/TranslationContext"
import { cn } from "@/lib/utils"
import { vscode } from "@/utils/vscode"
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider } from "@/components/ui"

import { Section } from "./Section"
import { SectionHeader } from "./SectionHeader"
import { SearchableSetting } from "./SearchableSetting"
import { SetCachedStateField } from "./types"

type AlfaCodeSettingsProps = HTMLAttributes<HTMLDivElement> & {
	listApiConfigMeta: ProviderSettingsEntry[]
	currentApiConfigName?: string
	enhancementApiConfigId?: string
	condensingApiConfigId?: string
	autoRestartProblematicProcesses?: boolean
	problematicProcessRestartLimit?: number
	parallelAgentsEnabled?: boolean
	parallelAgentCount?: number
	contextRoutingEnabled?: boolean
	contextRoutingFastThresholdPercent?: number
	contextRoutingDeepThresholdPercent?: number
	orchestrationTelemetryEnabled?: boolean
	helperLocalityPreference?: "prefer" | "require" | "off"
	orchestrationEscalationSensitivity?: "conservative" | "balanced" | "aggressive"
	structuredDelegationEnabled?: boolean
	evaluatorPassEnabled?: boolean
	memoryPromotionEnabled?: boolean
	retrievalPolicy?: "adaptive" | "semantic_only" | "hybrid" | "rerank_heavy"
	queryClassifierDebug?: boolean
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
		| "orchestrationTelemetryEnabled"
		| "helperLocalityPreference"
		| "orchestrationEscalationSensitivity"
		| "structuredDelegationEnabled"
		| "evaluatorPassEnabled"
		| "memoryPromotionEnabled"
		| "retrievalPolicy"
		| "queryClassifierDebug"
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
	contextRoutingEnabled,
	contextRoutingFastThresholdPercent,
	contextRoutingDeepThresholdPercent,
	orchestrationTelemetryEnabled,
	helperLocalityPreference,
	orchestrationEscalationSensitivity,
	structuredDelegationEnabled,
	evaluatorPassEnabled,
	memoryPromotionEnabled,
	retrievalPolicy,
	queryClassifierDebug,
	terminalCommandApiConfigId,
	setCachedStateField,
	className,
	...props
}: AlfaCodeSettingsProps) => {
	const { t } = useAppTranslation()
	const [diagnosticsResult, setDiagnosticsResult] = useState<LocalAiDiagnosticsResultPayload | undefined>()
	const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false)

	const firstProfileId = listApiConfigMeta?.[0]?.id || ""
	const firstLocalProfileId = useMemo(
		() =>
			listApiConfigMeta?.find((config) => config.apiProvider === "ollama" || config.apiProvider === "lmstudio")
				?.id || "",
		[listApiConfigMeta],
	)

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data as ExtensionMessage
			if (message.type !== "localAiDiagnosticsResult") {
				return
			}

			setDiagnosticsResult(message.localAiDiagnostics)
			setIsDiagnosticsRunning(false)
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

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

	const applyRoutingPreset = (
		preset: "strongMainCheapHelpers" | "balanced" | "maximumSaving" | "cloudMainLocalHelpers",
	) => {
		if (preset === "cloudMainLocalHelpers") {
			if (!firstLocalProfileId) {
				return
			}

			setCachedStateField("enhancementApiConfigId", firstLocalProfileId)
			setCachedStateField("condensingApiConfigId", firstLocalProfileId)
			setCachedStateField("terminalCommandApiConfigId", firstLocalProfileId)
			setCachedStateField("helperLocalityPreference", "require")
			setCachedStateField("orchestrationEscalationSensitivity", "aggressive")
			setCachedStateField("orchestrationTelemetryEnabled", true)
			return
		}

		const presets = {
			strongMainCheapHelpers: {
				enhancementApiConfigId: firstProfileId,
				condensingApiConfigId: firstProfileId,
				terminalCommandApiConfigId: firstProfileId,
				helperLocalityPreference: "prefer",
				orchestrationEscalationSensitivity: "balanced",
			},
			balanced: {
				enhancementApiConfigId: enhancementApiConfigId || firstProfileId,
				condensingApiConfigId: condensingApiConfigId || firstProfileId,
				terminalCommandApiConfigId: terminalCommandApiConfigId || firstProfileId,
				helperLocalityPreference: "prefer",
				orchestrationEscalationSensitivity: "conservative",
			},
			maximumSaving: {
				enhancementApiConfigId: firstProfileId,
				condensingApiConfigId: firstProfileId,
				terminalCommandApiConfigId: firstProfileId,
				helperLocalityPreference: "require",
				orchestrationEscalationSensitivity: "aggressive",
			},
		} as const

		const next = presets[preset]
		setCachedStateField("enhancementApiConfigId", next.enhancementApiConfigId)
		setCachedStateField("condensingApiConfigId", next.condensingApiConfigId)
		setCachedStateField("terminalCommandApiConfigId", next.terminalCommandApiConfigId)
		setCachedStateField("helperLocalityPreference", next.helperLocalityPreference)
		setCachedStateField("orchestrationEscalationSensitivity", next.orchestrationEscalationSensitivity)
		setCachedStateField("orchestrationTelemetryEnabled", true)
	}

	const runDiagnostics = () => {
		setIsDiagnosticsRunning(true)
		vscode.postMessage({ type: "runLocalAiDiagnostics" })
	}

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<SectionHeader description={t("kilocode:settings.alfaCode.description")}>
				<div className="flex items-center gap-2">
					<Sparkles className="h-4 w-4" />
					<div>{t("settings:sections.alfaCode")}</div>
				</div>
			</SectionHeader>

			<Section>
				<SearchableSetting
					settingId="alfa-code-presets"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.presets.title")}>
					<div className="mb-2 font-medium">{t("kilocode:settings.alfaCode.presets.title")}</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
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
					<div className="mb-2 font-medium">{t("kilocode:settings.alfaCode.taskStrategy.title")}</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.taskStrategy.description")}
					</div>
					<div className="grid gap-3 lg:grid-cols-3">
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-local-card">
							<div className="mb-1 flex items-center gap-2">
								<div className="text-sm font-medium">
									{t("kilocode:settings.alfaCode.taskStrategy.local.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.cheapest")}
								</Badge>
							</div>
							<div className="text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.taskStrategy.local.description")}
							</div>
						</div>
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-compact-card">
							<div className="mb-1 flex items-center gap-2">
								<div className="text-sm font-medium">
									{t("kilocode:settings.alfaCode.taskStrategy.compact.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.recommendedLongContext")}
								</Badge>
							</div>
							<div className="text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.taskStrategy.compact.description")}
							</div>
						</div>
						<div
							className="rounded border border-vscode-input-border p-3"
							data-testid="alfacode-strategy-new-task-card">
							<div className="mb-1 flex items-center gap-2">
								<div className="text-sm font-medium">
									{t("kilocode:settings.alfaCode.taskStrategy.newTask.title")}
								</div>
								<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
									{t("kilocode:settings.alfaCode.taskStrategy.badges.bestIsolation")}
								</Badge>
							</div>
							<div className="text-sm text-vscode-descriptionForeground">
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
						onChange={(event: any) => setCachedStateField("parallelAgentsEnabled", event.target.checked)}
						data-testid="alfacode-parallel-agents-enabled-checkbox">
						<span className="font-medium">
							{t("kilocode:settings.alfaCode.parallelAgents.enabled.label")}
						</span>
					</VSCodeCheckbox>
					<div className="mt-1 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.parallelAgents.enabled.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-parallel-agent-count"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.parallelAgents.count.label")}>
					{parallelAgentsEnabled && (
						<>
							<div className="mb-1 font-medium">
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
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
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
						onChange={(event: any) =>
							setCachedStateField("autoRestartProblematicProcesses", event.target.checked)
						}
						data-testid="alfacode-auto-restart-problematic-processes-checkbox">
						<span className="font-medium">
							{t("kilocode:settings.alfaCode.recovery.autoRestartProblematicProcesses.label")}
						</span>
					</VSCodeCheckbox>
					<div className="mt-1 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.recovery.autoRestartProblematicProcesses.description")}
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-problematic-process-restart-limit"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.recovery.problematicProcessRestartLimit.label")}>
					{autoRestartProblematicProcesses && (
						<>
							<div className="mb-1 font-medium">
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
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.recovery.problematicProcessRestartLimit.description")}
							</div>
						</>
					)}
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-platform-controls"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.platformControls.title")}>
					<div className="grid gap-3 lg:grid-cols-3">
						<div className="rounded border border-vscode-input-border p-3">
							<div className="mb-2 text-sm font-medium">
								{t("kilocode:settings.alfaCode.platformControls.orchestrationTelemetry.title")}
							</div>
							<VSCodeCheckbox
								checked={orchestrationTelemetryEnabled ?? true}
								onChange={(event: any) =>
									setCachedStateField("orchestrationTelemetryEnabled", event.target.checked)
								}
								data-testid="alfacode-orchestration-telemetry-checkbox">
								<span className="font-medium">
									{t("kilocode:settings.alfaCode.platformControls.orchestrationTelemetry.label")}
								</span>
							</VSCodeCheckbox>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.platformControls.orchestrationTelemetry.description")}
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<div className="mb-2 text-sm font-medium">
								{t("kilocode:settings.alfaCode.platformControls.helperLocality.title")}
							</div>
							<Select
								value={helperLocalityPreference ?? "prefer"}
								onValueChange={(value) =>
									setCachedStateField(
										"helperLocalityPreference",
										value as "prefer" | "require" | "off",
									)
								}
								data-testid="alfacode-helper-locality-select">
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="prefer">
										{t("kilocode:settings.alfaCode.platformControls.helperLocality.options.prefer")}
									</SelectItem>
									<SelectItem value="require">
										{t(
											"kilocode:settings.alfaCode.platformControls.helperLocality.options.require",
										)}
									</SelectItem>
									<SelectItem value="off">
										{t("kilocode:settings.alfaCode.platformControls.helperLocality.options.off")}
									</SelectItem>
								</SelectContent>
							</Select>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.platformControls.helperLocality.description")}
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<div className="mb-2 text-sm font-medium">
								{t("kilocode:settings.alfaCode.platformControls.escalationSensitivity.title")}
							</div>
							<Select
								value={orchestrationEscalationSensitivity ?? "balanced"}
								onValueChange={(value) =>
									setCachedStateField(
										"orchestrationEscalationSensitivity",
										value as "conservative" | "balanced" | "aggressive",
									)
								}
								data-testid="alfacode-escalation-sensitivity-select">
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="conservative">
										{t(
											"kilocode:settings.alfaCode.platformControls.escalationSensitivity.options.conservative",
										)}
									</SelectItem>
									<SelectItem value="balanced">
										{t(
											"kilocode:settings.alfaCode.platformControls.escalationSensitivity.options.balanced",
										)}
									</SelectItem>
									<SelectItem value="aggressive">
										{t(
											"kilocode:settings.alfaCode.platformControls.escalationSensitivity.options.aggressive",
										)}
									</SelectItem>
								</SelectContent>
							</Select>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.platformControls.escalationSensitivity.description")}
							</div>
						</div>
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-expert-controls"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.expert.title")}>
					<div className="mb-2 font-medium">{t("kilocode:settings.alfaCode.expert.title")}</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.expert.description")}
					</div>
					<div className="grid gap-3 lg:grid-cols-2">
						<div className="rounded border border-vscode-input-border p-3">
							<VSCodeCheckbox
								checked={structuredDelegationEnabled ?? false}
								onChange={(event: any) =>
									setCachedStateField("structuredDelegationEnabled", event.target.checked)
								}
								data-testid="alfacode-structured-delegation-checkbox">
								<span className="font-medium">
									{t("kilocode:settings.alfaCode.expert.structuredDelegation.label")}
								</span>
							</VSCodeCheckbox>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.expert.structuredDelegation.description")}
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<VSCodeCheckbox
								checked={evaluatorPassEnabled ?? false}
								onChange={(event: any) =>
									setCachedStateField("evaluatorPassEnabled", event.target.checked)
								}
								data-testid="alfacode-evaluator-pass-checkbox">
								<span className="font-medium">
									{t("kilocode:settings.alfaCode.expert.evaluatorPass.label")}
								</span>
							</VSCodeCheckbox>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.expert.evaluatorPass.description")}
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<VSCodeCheckbox
								checked={memoryPromotionEnabled ?? false}
								onChange={(event: any) =>
									setCachedStateField("memoryPromotionEnabled", event.target.checked)
								}
								data-testid="alfacode-memory-promotion-checkbox">
								<span className="font-medium">Curated memory promotion</span>
							</VSCodeCheckbox>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								Write a compact evidence-backed update into{" "}
								<code>.kilocode/memory-bank/context.md</code> after successful background structured
								delegation.
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<div className="mb-2 text-sm font-medium">
								{t("kilocode:settings.alfaCode.expert.retrievalPolicy.label")}
							</div>
							<Select
								value={retrievalPolicy ?? "adaptive"}
								onValueChange={(value) =>
									setCachedStateField(
										"retrievalPolicy",
										value as "adaptive" | "semantic_only" | "hybrid" | "rerank_heavy",
									)
								}
								data-testid="alfacode-retrieval-policy-select">
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="adaptive">
										{t("kilocode:settings.alfaCode.expert.retrievalPolicy.options.adaptive")}
									</SelectItem>
									<SelectItem value="semantic_only">
										{t("kilocode:settings.alfaCode.expert.retrievalPolicy.options.semanticOnly")}
									</SelectItem>
									<SelectItem value="hybrid">
										{t("kilocode:settings.alfaCode.expert.retrievalPolicy.options.hybrid")}
									</SelectItem>
									<SelectItem value="rerank_heavy">
										{t("kilocode:settings.alfaCode.expert.retrievalPolicy.options.rerankHeavy")}
									</SelectItem>
								</SelectContent>
							</Select>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.expert.retrievalPolicy.description")}
							</div>
						</div>
						<div className="rounded border border-vscode-input-border p-3">
							<VSCodeCheckbox
								checked={queryClassifierDebug ?? false}
								onChange={(event: any) =>
									setCachedStateField("queryClassifierDebug", event.target.checked)
								}
								data-testid="alfacode-query-classifier-debug-checkbox">
								<span className="font-medium">
									{t("kilocode:settings.alfaCode.expert.queryClassifierDebug.label")}
								</span>
							</VSCodeCheckbox>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.expert.queryClassifierDebug.description")}
							</div>
						</div>
					</div>
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-routing-presets"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.routing.presets.title")}>
					<div className="mb-2 font-medium">{t("kilocode:settings.alfaCode.routing.presets.title")}</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.routing.presets.description")}
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							data-testid="alfacode-routing-preset-cloud-main-local-helpers"
							onClick={() => applyRoutingPreset("cloudMainLocalHelpers")}
							disabled={!firstLocalProfileId}>
							{t("kilocode:settings.alfaCode.routing.presets.cloudMainLocalHelpers")}
						</Button>
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
					{!firstLocalProfileId && (
						<div className="mt-3 text-sm text-vscode-descriptionForeground">
							{t("kilocode:settings.alfaCode.routing.presets.localProfileUnavailable")}
						</div>
					)}
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-local-ai-diagnostics"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.diagnostics.title")}>
					<div className="mb-2 flex items-center gap-2 font-medium">
						<Stethoscope className="h-4 w-4" />
						<div>{t("kilocode:settings.alfaCode.diagnostics.title")}</div>
					</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.diagnostics.description")}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							data-testid="alfacode-run-local-ai-diagnostics"
							onClick={runDiagnostics}
							disabled={isDiagnosticsRunning}>
							{isDiagnosticsRunning
								? t("kilocode:settings.alfaCode.diagnostics.running")
								: t("kilocode:settings.alfaCode.diagnostics.run")}
						</Button>
						{diagnosticsResult?.ranAt && (
							<span
								className="text-xs text-vscode-descriptionForeground"
								data-testid="alfacode-diagnostics-ran-at">
								{diagnosticsResult.ranAt}
							</span>
						)}
					</div>
					{diagnosticsResult && (
						<div className="mt-3 grid gap-2">
							{diagnosticsResult.checks.map((check) => (
								<div
									key={check.checkId}
									className="rounded border border-vscode-input-border p-3"
									data-testid={`alfacode-diagnostics-check-${check.checkId}`}>
									<div className="flex items-center justify-between gap-2">
										<div className="text-sm font-medium">{check.title}</div>
										<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
											{check.status}
										</Badge>
									</div>
									<div className="mt-1 text-sm">{check.message}</div>
									{check.details?.length ? (
										<div className="mt-2 space-y-1 text-xs text-vscode-descriptionForeground">
											{check.details.map((detail) => (
												<div key={`${check.checkId}-${detail}`}>{detail}</div>
											))}
										</div>
									) : null}
								</div>
							))}
						</div>
					)}
				</SearchableSetting>

				<SearchableSetting
					settingId="alfa-code-model-routing"
					section="alfaCode"
					label={t("kilocode:settings.alfaCode.routing.title")}>
					<div className="mb-2 font-medium">{t("kilocode:settings.alfaCode.routing.title")}</div>
					<div className="mb-3 text-sm text-vscode-descriptionForeground">
						{t("kilocode:settings.alfaCode.routing.description")}
					</div>
					<VSCodeCheckbox
						checked={contextRoutingEnabled ?? false}
						onChange={(event: any) => setCachedStateField("contextRoutingEnabled", event.target.checked)}
						data-testid="context-routing-enabled-checkbox">
						<span className="font-medium">{t("settings:contextManagement.contextRouting.name")}</span>
					</VSCodeCheckbox>
					<div className="mb-3 mt-1 text-sm text-vscode-descriptionForeground">
						{t("settings:contextManagement.contextRouting.description")}
					</div>
					{contextRoutingEnabled && (
						<div className="mb-3 flex flex-col gap-3 border-l-2 border-vscode-button-background pl-3">
							<div className="flex items-center gap-4 font-bold">
								<Gauge size={16} />
								<div>{t("settings:contextManagement.contextRouting.thresholdsLabel")}</div>
							</div>
							<div>
								<span className="mb-1 block font-medium">
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
								<div className="mt-1 text-sm text-vscode-descriptionForeground">
									{t("settings:contextManagement.contextRouting.fastDescription")}
								</div>
							</div>
							<div>
								<span className="mb-1 block font-medium">
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
								<div className="mt-1 text-sm text-vscode-descriptionForeground">
									{t("settings:contextManagement.contextRouting.deepDescription")}
								</div>
							</div>
						</div>
					)}

					<div className="grid items-start gap-3 lg:grid-cols-2">
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="mb-1 flex items-center gap-2">
								<div className="text-sm font-medium">
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
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.routing.primary.description")}
							</div>
						</div>
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="mb-1 flex items-center gap-2">
								<div className="text-sm font-medium">
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
									{listApiConfigMeta.map((config) => (
										<SelectItem key={config.id} value={config.id}>
											{config.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="mt-1 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.routing.enhance.description")}
							</div>
						</div>
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="mb-1 text-sm font-medium">
								{t("kilocode:settings.alfaCode.routing.condense.label")}
							</div>
							<div className="mb-2 text-sm text-vscode-descriptionForeground">
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
									{listApiConfigMeta.map((config) => (
										<SelectItem key={config.id} value={config.id}>
											{config.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex h-full flex-col rounded border border-vscode-input-border p-3">
							<div className="mb-1 text-sm font-medium">
								{t("kilocode:settings.alfaCode.routing.terminal.label")}
							</div>
							<div className="mb-2 text-sm text-vscode-descriptionForeground">
								{t("kilocode:settings.alfaCode.routing.terminal.description")}
							</div>
							<Select
								value={terminalCommandApiConfigId || "-"}
								onValueChange={(value) =>
									setCachedStateField("terminalCommandApiConfigId", value === "-" ? "" : value)
								}
								data-testid="alfacode-terminal-command-api-config-select">
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("kilocode:settings.alfaCode.routing.useCurrent")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="-">
										{t("kilocode:settings.alfaCode.routing.useCurrent")}
									</SelectItem>
									{listApiConfigMeta.map((config) => (
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
