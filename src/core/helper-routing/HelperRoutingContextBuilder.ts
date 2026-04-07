import type { ProviderSettingsManager } from "../config/ProviderSettingsManager"
import type { HelperJob, HelperRouterStateLike, HelperRoutingDecisionContext } from "./HelperModelRouter"

export interface HelperRoutingContextBuilderInput {
	job: HelperJob
	state: HelperRouterStateLike
	providerSettingsManager: ProviderSettingsManager
	decisionContext?: HelperRoutingDecisionContext
}

export class HelperRoutingContextBuilder {
	public static build(params: HelperRoutingContextBuilderInput): {
		job: HelperJob
		state: HelperRouterStateLike
		providerSettingsManager: ProviderSettingsManager
		decisionContext?: HelperRoutingDecisionContext
	} {
		const state: HelperRouterStateLike = {
			apiConfiguration: params.state.apiConfiguration,
			...(params.state.enhancementApiConfigId
				? { enhancementApiConfigId: params.state.enhancementApiConfigId }
				: {}),
			...(params.state.condensingApiConfigId
				? { condensingApiConfigId: params.state.condensingApiConfigId }
				: {}),
			...(params.state.listApiConfigMeta ? { listApiConfigMeta: params.state.listApiConfigMeta } : {}),
			...(params.state.helperLocalityPreference
				? { helperLocalityPreference: params.state.helperLocalityPreference }
				: {}),
			...(params.state.orchestrationEscalationSensitivity
				? { orchestrationEscalationSensitivity: params.state.orchestrationEscalationSensitivity }
				: {}),
			...(params.state.orchestrationTelemetryEnabled !== undefined
				? { orchestrationTelemetryEnabled: params.state.orchestrationTelemetryEnabled }
				: {}),
		}

		const decisionContext = this.normalizeDecisionContext(params.decisionContext)

		return {
			job: params.job,
			state,
			providerSettingsManager: params.providerSettingsManager,
			...(decisionContext ? { decisionContext } : {}),
		}
	}

	private static normalizeDecisionContext(
		decisionContext?: HelperRoutingDecisionContext,
	): HelperRoutingDecisionContext | undefined {
		if (!decisionContext) {
			return undefined
		}

		const normalized: HelperRoutingDecisionContext = {
			...(decisionContext.taskId ? { taskId: decisionContext.taskId } : {}),
			...(typeof decisionContext.contextWindowSize === "number"
				? { contextWindowSize: decisionContext.contextWindowSize }
				: {}),
			...(typeof decisionContext.retrievalConfidence === "number"
				? { retrievalConfidence: decisionContext.retrievalConfidence }
				: {}),
			...(typeof decisionContext.retryCount === "number" ? { retryCount: decisionContext.retryCount } : {}),
			...(typeof decisionContext.toolDenialCount === "number"
				? { toolDenialCount: decisionContext.toolDenialCount }
				: {}),
		}

		return Object.keys(normalized).length > 0 ? normalized : undefined
	}
}
