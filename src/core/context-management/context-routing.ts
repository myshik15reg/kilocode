// kilocode_change: 2026-01-24 Context routing helpers for fast/deep thresholds

export type ContextRoutingMode = "disabled" | "standard" | "fast" | "deep"

export type ContextRoutingOptions = {
	enabled: boolean
	totalTokens: number
	contextWindow: number
	fastThresholdPercent: number
	deepThresholdPercent: number
}

/**
 * @description Clamp a percentage value into the [0, 100] range.
 * @param {number} value - Percentage value to clamp.
 * @returns {number} The clamped percentage.
 */
const clampPercent = (value: number): number => Math.min(100, Math.max(0, value))

/**
 * @description Resolve the context routing mode based on configured thresholds.
 * @param {ContextRoutingOptions} options - Routing inputs and thresholds.
 * @returns {ContextRoutingMode} The resolved routing mode.
 */
export const resolveContextRoutingMode = ({
	enabled,
	totalTokens,
	contextWindow,
	fastThresholdPercent,
	deepThresholdPercent,
}: ContextRoutingOptions): ContextRoutingMode => {
	if (!enabled) {
		return "disabled"
	}

	if (contextWindow <= 0) {
		return "standard"
	}

	const fastThreshold = clampPercent(fastThresholdPercent)
	const deepThreshold = Math.max(fastThreshold, clampPercent(deepThresholdPercent))
	const contextPercent = (100 * totalTokens) / contextWindow

	if (contextPercent >= deepThreshold) {
		return "deep"
	}

	if (contextPercent >= fastThreshold) {
		return "fast"
	}

	return "standard"
}
