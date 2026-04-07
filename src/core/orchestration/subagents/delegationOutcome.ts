export type DelegationOutcomeStatus = "completed" | "abstained"

const ABSTAIN_MARKERS: RegExp[] = [
	/\babstain(?:ed|ing)?\b/i,
	/\bneed(?:s)? parent clarification\b/i,
	/\bneed(?:s)? clarification from parent\b/i,
	/\binsufficient (?:context|evidence)\b/i,
	/\bmissing (?:context|evidence)\b/i,
]

function readNestedStatus(metadata: Record<string, unknown>, key: string): DelegationOutcomeStatus | undefined {
	const value = metadata[key]
	if (value === "completed" || value === "abstained") {
		return value
	}
	return undefined
}

export function readDelegationOutcomeStatus(metadata?: Record<string, unknown>): DelegationOutcomeStatus | undefined {
	if (!metadata) {
		return undefined
	}

	const direct = readNestedStatus(metadata, "delegationOutcomeStatus") ?? readNestedStatus(metadata, "outcomeStatus")
	if (direct) {
		return direct
	}

	const kiloCode = metadata.kiloCode
	if (kiloCode && typeof kiloCode === "object") {
		return readNestedStatus(kiloCode as Record<string, unknown>, "delegationOutcomeStatus")
	}

	return undefined
}

export function inferDelegationOutcomeStatus(
	summary?: string,
	metadata?: Record<string, unknown>,
): DelegationOutcomeStatus {
	const explicit = readDelegationOutcomeStatus(metadata)
	if (explicit) {
		return explicit
	}

	const normalizedSummary = summary?.trim()
	if (!normalizedSummary) {
		return "completed"
	}

	return ABSTAIN_MARKERS.some((pattern) => pattern.test(normalizedSummary)) ? "abstained" : "completed"
}

export function isSuccessfulDelegationOutcome(status: DelegationOutcomeStatus): boolean {
	return status === "completed" || status === "abstained"
}
