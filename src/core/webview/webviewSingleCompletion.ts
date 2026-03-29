// kilocode_change - new file
import { HelperModelRouter } from "../helper-routing/HelperModelRouter"
import { singleCompletionHandler } from "../../utils/single-completion-handler"

import type { ClineProvider } from "./ClineProvider"

export async function handleSingleCompletionRequest(
	provider: Pick<ClineProvider, "getState" | "postMessageToWebview" | "providerSettingsManager" | "log">,
	message: { text?: string; completionRequestId?: string },
) {
	const { text, completionRequestId } = message

	if (!completionRequestId) {
		throw new Error("Missing completionRequestId")
	}

	if (!text) {
		throw new Error("Missing prompt text")
	}

	const state = await provider.getState()
	if (!state.apiConfiguration?.apiProvider) {
		throw new Error("No valid API configuration provided")
	}

	let config = state.apiConfiguration
	try {
		const route = await HelperModelRouter.selectConfig({
			job: "search_assist",
			state: {
				apiConfiguration: state.apiConfiguration,
				enhancementApiConfigId: state.enhancementApiConfigId,
				condensingApiConfigId: state.condensingApiConfigId,
				listApiConfigMeta: state.listApiConfigMeta,
			},
			providerSettingsManager: provider.providerSettingsManager,
		})
		config = route.config
	} catch (error) {
		provider.log(
			`Helper routing failed for search_assist; using primary model: ${error instanceof Error ? error.message : String(error)}`,
		)
	}

	const completionText = await singleCompletionHandler(config, text)

	await provider.postMessageToWebview({
		type: "singleCompletionResult",
		completionRequestId,
		completionText,
		success: true,
	})
}
