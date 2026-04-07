import React, { HTMLAttributes } from "react"

import type { Experiments, ImageGenerationProvider } from "@roo-code/types"

import { EXPERIMENT_IDS, experimentConfigsMap } from "@roo/experiments"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { cn } from "@src/lib/utils"

import {
	SetCachedStateField, // kilocode_change
	SetExperimentEnabled,
} from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { SearchableSetting } from "./SearchableSetting"
import { ExperimentalFeature } from "./ExperimentalFeature"
import { FastApplySettings } from "./FastApplySettings" // kilocode_change: Use Fast Apply version
import { ImageGenerationSettings } from "./ImageGenerationSettings"
import { CustomToolsSettings } from "./CustomToolsSettings"
import { STTSettings } from "./STTSettings" // kilocode_change: STT microphone settings

type ExperimentalSettingsProps = HTMLAttributes<HTMLDivElement> & {
	experiments: Experiments
	setExperimentEnabled: SetExperimentEnabled
	// kilocode_change start
	morphApiKey?: string
	hasMorphApiKey?: boolean
	fastApplyModel?: string
	fastApplyApiProvider?: string
	setCachedStateField: SetCachedStateField<"morphApiKey" | "fastApplyModel" | "fastApplyApiProvider">
	kiloCodeImageApiKey?: string
	hasKiloCodeImageApiKey?: boolean
	setKiloCodeImageApiKey?: (apiKey: string) => void
	currentProfileKilocodeToken?: string
	litellmImageApiKey?: string
	hasLitellmImageApiKey?: boolean
	setLitellmImageApiKey?: (apiKey: string) => void
	litellmImageBaseUrl?: string
	setLitellmImageBaseUrl?: (baseUrl: string) => void
	// kilocode_change end
	apiConfiguration?: any
	setApiConfigurationField?: any
	imageGenerationProvider?: ImageGenerationProvider
	openRouterImageApiKey?: string
	hasOpenRouterImageApiKey?: boolean
	openRouterImageGenerationSelectedModel?: string
	setImageGenerationProvider?: (provider: ImageGenerationProvider) => void
	setOpenRouterImageApiKey?: (apiKey: string) => void
	setImageGenerationSelectedModel?: (model: string) => void
}

export const ExperimentalSettings = ({
	experiments,
	setExperimentEnabled,
	apiConfiguration,
	setApiConfigurationField,
	imageGenerationProvider,
	openRouterImageApiKey,
	hasOpenRouterImageApiKey,
	openRouterImageGenerationSelectedModel,
	setImageGenerationProvider,
	setOpenRouterImageApiKey,
	setImageGenerationSelectedModel,
	className,
	// kilocode_change start
	morphApiKey,
	hasMorphApiKey,
	fastApplyModel, // kilocode_change: Fast Apply model selection
	fastApplyApiProvider, // kilocode_change: Fast Apply model api base url
	setCachedStateField,
	setKiloCodeImageApiKey,
	kiloCodeImageApiKey,
	hasKiloCodeImageApiKey,
	currentProfileKilocodeToken,
	litellmImageApiKey,
	hasLitellmImageApiKey,
	setLitellmImageApiKey,
	litellmImageBaseUrl,
	setLitellmImageBaseUrl,
	// kilocode_change end
	...props
}: ExperimentalSettingsProps) => {
	const { t } = useAppTranslation()

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<SectionHeader>{t("settings:sections.experimental")}</SectionHeader>

			<Section>
				{Object.entries(experimentConfigsMap)
					.filter(([key]) => key in EXPERIMENT_IDS)
					.filter((config) => config[0] !== "MARKETPLACE") // kilocode_change: we have our own market place, filter this out for now
					// Hide MULTIPLE_NATIVE_TOOL_CALLS - feature is on hold
					.filter(([key]) => key !== "MULTIPLE_NATIVE_TOOL_CALLS")
					.map((config) => {
						// Use the same translation key pattern as ExperimentalFeature
						const experimentKey = config[0]
						const label = t(`settings:experimental.${experimentKey}.name`)

						if (config[0] === "MULTI_FILE_APPLY_DIFF") {
							return (
								<SearchableSetting
									key={config[0]}
									settingId={`experimental-${config[0].toLowerCase()}`}
									section="experimental"
									label={label}>
									<ExperimentalFeature
										experimentKey={config[0]}
										enabled={experiments[EXPERIMENT_IDS.MULTI_FILE_APPLY_DIFF] ?? false}
										onChange={(enabled) =>
											setExperimentEnabled(EXPERIMENT_IDS.MULTI_FILE_APPLY_DIFF, enabled)
										}
									/>
								</SearchableSetting>
							)
						}
						// kilocode_change start
						if (config[0] === "MORPH_FAST_APPLY") {
							const enabled =
								experiments[EXPERIMENT_IDS[config[0] as keyof typeof EXPERIMENT_IDS]] ?? false
							return (
								<React.Fragment key={config[0]}>
									<ExperimentalFeature
										key={config[0]}
										experimentKey={config[0]}
										enabled={enabled}
										onChange={(enabled) =>
											setExperimentEnabled(
												EXPERIMENT_IDS[config[0] as keyof typeof EXPERIMENT_IDS],
												enabled,
											)
										}
									/>
									{enabled && (
										<FastApplySettings
											setCachedStateField={setCachedStateField}
											morphApiKey={morphApiKey}
											hasMorphApiKey={hasMorphApiKey}
											fastApplyModel={fastApplyModel}
											fastApplyApiProvider={fastApplyApiProvider}
										/>
									)}
								</React.Fragment>
							)
						}
						// kilocode_change end
						if (config[0] === "SPEECH_TO_TEXT") {
							const enabled = experiments[EXPERIMENT_IDS.SPEECH_TO_TEXT] ?? false
							return (
								<React.Fragment key={config[0]}>
									<ExperimentalFeature
										key={config[0]}
										experimentKey={config[0]}
										enabled={enabled}
										onChange={(enabled) =>
											setExperimentEnabled(EXPERIMENT_IDS.SPEECH_TO_TEXT, enabled)
										}
									/>
									{enabled && <STTSettings />}
								</React.Fragment>
							)
						}
						if (
							config[0] === "IMAGE_GENERATION" &&
							setImageGenerationProvider &&
							setOpenRouterImageApiKey &&
							setKiloCodeImageApiKey &&
							setLitellmImageApiKey &&
							setLitellmImageBaseUrl &&
							setImageGenerationSelectedModel
						) {
							return (
								<SearchableSetting
									key={config[0]}
									settingId={`experimental-${config[0].toLowerCase()}`}
									section="experimental"
									label={label}>
									<ImageGenerationSettings
										enabled={experiments[EXPERIMENT_IDS.IMAGE_GENERATION] ?? false}
										onChange={(enabled) =>
											setExperimentEnabled(EXPERIMENT_IDS.IMAGE_GENERATION, enabled)
										}
										imageGenerationProvider={imageGenerationProvider}
										openRouterImageApiKey={openRouterImageApiKey}
										hasOpenRouterImageApiKey={hasOpenRouterImageApiKey}
										openRouterImageGenerationSelectedModel={openRouterImageGenerationSelectedModel}
										setImageGenerationProvider={setImageGenerationProvider}
										setOpenRouterImageApiKey={setOpenRouterImageApiKey}
										setImageGenerationSelectedModel={setImageGenerationSelectedModel}
										kiloCodeImageApiKey={kiloCodeImageApiKey}
										hasKiloCodeImageApiKey={hasKiloCodeImageApiKey}
										setKiloCodeImageApiKey={setKiloCodeImageApiKey}
										currentProfileKilocodeToken={currentProfileKilocodeToken}
										litellmImageApiKey={litellmImageApiKey}
										hasLitellmImageApiKey={hasLitellmImageApiKey}
										setLitellmImageApiKey={setLitellmImageApiKey}
										litellmImageBaseUrl={litellmImageBaseUrl}
										setLitellmImageBaseUrl={setLitellmImageBaseUrl}
									/>
								</SearchableSetting>
							)
						}
						if (config[0] === "CUSTOM_TOOLS") {
							return (
								<SearchableSetting
									key={config[0]}
									settingId={`experimental-${config[0].toLowerCase()}`}
									section="experimental"
									label={label}>
									<CustomToolsSettings
										enabled={experiments[EXPERIMENT_IDS.CUSTOM_TOOLS] ?? false}
										onChange={(enabled) =>
											setExperimentEnabled(EXPERIMENT_IDS.CUSTOM_TOOLS, enabled)
										}
									/>
								</SearchableSetting>
							)
						}
						return (
							<SearchableSetting
								key={config[0]}
								settingId={`experimental-${config[0].toLowerCase()}`}
								section="experimental"
								label={label}>
								<ExperimentalFeature
									experimentKey={config[0]}
									enabled={
										experiments[EXPERIMENT_IDS[config[0] as keyof typeof EXPERIMENT_IDS]] ?? false
									}
									onChange={(enabled) =>
										setExperimentEnabled(
											EXPERIMENT_IDS[config[0] as keyof typeof EXPERIMENT_IDS],
											enabled,
										)
									}
								/>
							</SearchableSetting>
						)
					})}
			</Section>
		</div>
	)
}
