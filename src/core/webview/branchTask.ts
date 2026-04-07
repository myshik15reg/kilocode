// kilocode_change - new file
import type { BranchTaskOptions, ProviderSettings } from "@roo-code/types"

import { HelperRoutingContextBuilder } from "../helper-routing/HelperRoutingContextBuilder"
import { HelperModelRouter } from "../helper-routing/HelperModelRouter"
import type { ProviderSettingsManager } from "../config/ProviderSettingsManager"
import { singleCompletionHandler } from "../../utils/single-completion-handler"

const COMPACT_BRANCH_PROMPT =
	"Create a compact branch handoff summary under 500 characters. Preserve only the active goal, current status, and safest next step. Plain text only."

export async function summarizeBranchMessage(params: {
	rawBranchMessage: string
	branchStrategy?: BranchTaskOptions["branchStrategy"]
	providerSettingsManager: ProviderSettingsManager
	state: {
		apiConfiguration: ProviderSettings
		condensingApiConfigId?: string
		listApiConfigMeta?: Array<{ id: string; name?: string }>
		helperLocalityPreference?: "off" | "prefer" | "require"
		orchestrationEscalationSensitivity?: "conservative" | "balanced" | "aggressive"
		orchestrationTelemetryEnabled?: boolean
	}
}) {
	const { rawBranchMessage, branchStrategy, providerSettingsManager, state } = params
	if ((branchStrategy ?? "summary") !== "summary") {
		return rawBranchMessage
	}

	try {
		const route = await HelperModelRouter.selectConfig(
			HelperRoutingContextBuilder.build({
				job: "summarize_branch",
				state: {
					apiConfiguration: state.apiConfiguration,
					condensingApiConfigId: state.condensingApiConfigId,
					listApiConfigMeta: state.listApiConfigMeta,
					helperLocalityPreference: state.helperLocalityPreference,
					orchestrationEscalationSensitivity: state.orchestrationEscalationSensitivity,
					orchestrationTelemetryEnabled: state.orchestrationTelemetryEnabled,
				},
				providerSettingsManager,
			}),
		)

		const summarized = await singleCompletionHandler(
			route.config,
			`${COMPACT_BRANCH_PROMPT}\n\nOriginal:\n${rawBranchMessage}`,
		)

		return summarized.replace(/\s+/g, " ").trim().slice(0, 500) || rawBranchMessage
	} catch {
		return rawBranchMessage
	}
}
