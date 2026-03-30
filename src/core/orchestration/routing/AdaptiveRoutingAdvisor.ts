// kilocode_change - new file
export type RoutingDecisionSource = "explicit" | "recommended" | "default"
export type RoutingExecution = "foreground" | "background"
export type RoutingProfileClass = "strong" | "balanced" | "cheap"

export interface AdaptiveRoutingProfilePalette {
	strong?: string
	balanced?: string
	cheap?: string
}

export interface AdaptiveRoutingProfilePaletteInput {
	currentProfileName?: string
	listApiConfigMeta?: Array<{ id: string; name?: string }>
	cheapProfileId?: string
	balancedProfileId?: string
	strongProfileName?: string
}

export interface AdaptiveRoutingHistoricalSignals {
	backgroundSuccessRate?: number
	foregroundSuccessRate?: number
}

export interface AdaptiveRoutingRankingEntry<TValue extends string> {
	value: TValue
	score: number
	reason: string
}

export interface AdaptiveRoutingRecommendation {
	mode: {
		value: string
		source: RoutingDecisionSource
	}
	execution: {
		value: RoutingExecution
		source: RoutingDecisionSource
		ranking: AdaptiveRoutingRankingEntry<RoutingExecution>[]
	}
	profile: {
		value: RoutingProfileClass
		source: RoutingDecisionSource
		helperProfile?: string
		ranking: Array<AdaptiveRoutingRankingEntry<RoutingProfileClass> & { helperProfile?: string }>
	}
	rationale: string[]
}

export interface AdaptiveRoutingAdvisorInput {
	explicitMode?: string
	explicitExecution?: "auto" | "foreground" | "background"
	message: string
	todos?: string
	branchFromTaskId?: string
	currentMode?: string
	currentProfileName?: string
	availableBackgroundCapacity: boolean
	profilePalette?: AdaptiveRoutingProfilePalette
	historicalSignals?: AdaptiveRoutingHistoricalSignals
}

export function buildAdaptiveRoutingProfilePalette(
	input: AdaptiveRoutingProfilePaletteInput,
): AdaptiveRoutingProfilePalette {
	const metaById = new Map<string, string>()
	for (const entry of input.listApiConfigMeta ?? []) {
		if (typeof entry.name === "string" && entry.name.trim()) {
			metaById.set(entry.id, entry.name.trim())
		}
	}

	const balancedProfileName = input.balancedProfileId ? metaById.get(input.balancedProfileId) : undefined
	const cheapProfileName = input.cheapProfileId ? metaById.get(input.cheapProfileId) : undefined

	return {
		strong: input.strongProfileName?.trim() || input.currentProfileName?.trim() || undefined,
		balanced: balancedProfileName || input.currentProfileName?.trim() || undefined,
		cheap: cheapProfileName || balancedProfileName || undefined,
	}
}

const BACKGROUND_HINT_RE =
	/(background|independent|independently|parallel|delegate|research|investigate|analy[sz]e|explore)/i

function normalizeChecklistCount(rawTodos?: string): number {
	if (!rawTodos?.trim()) {
		return 0
	}

	return rawTodos
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean).length
}

function clampScore(score: number): number {
	if (score < 0) {
		return 0
	}
	if (score > 100) {
		return 100
	}
	return score
}

function sortRanking<TValue extends string>(
	ranking: AdaptiveRoutingRankingEntry<TValue>[],
): AdaptiveRoutingRankingEntry<TValue>[] {
	return ranking.slice().sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
}

function buildModeRecommendation(input: AdaptiveRoutingAdvisorInput) {
	if (input.explicitMode?.trim()) {
		return {
			value: input.explicitMode.trim(),
			source: "explicit" as const,
			rationale: "Explicit target mode was provided by the caller.",
		}
	}

	if (input.currentMode?.trim()) {
		return {
			value: input.currentMode.trim(),
			source: "recommended" as const,
			rationale: "Current task mode is the safest adaptive continuation.",
		}
	}

	return {
		value: "code",
		source: "default" as const,
		rationale: "Falling back to the repository-safe default target mode.",
	}
}

function buildExecutionRecommendation(input: AdaptiveRoutingAdvisorInput): {
	value: RoutingExecution
	source: RoutingDecisionSource
	ranking: AdaptiveRoutingRankingEntry<RoutingExecution>[]
	rationale: string
} {
	if (input.explicitExecution === "foreground" || input.explicitExecution === "background") {
		return {
			value: input.explicitExecution,
			source: "explicit",
			ranking: sortRanking([
				{
					value: input.explicitExecution,
					score: 100,
					reason: "Explicit execution preference was provided by the caller.",
				},
				{
					value: input.explicitExecution === "background" ? "foreground" : "background",
					score: 0,
					reason: "Lower-ranked because an explicit execution choice already exists.",
				},
			]),
			rationale: "Explicit execution preference wins over adaptive routing.",
		}
	}

	const todoCount = normalizeChecklistCount(input.todos)
	const backgroundHint = BACKGROUND_HINT_RE.test(input.message) || todoCount >= 2
	const backgroundSignalDelta =
		typeof input.historicalSignals?.backgroundSuccessRate === "number" &&
		typeof input.historicalSignals?.foregroundSuccessRate === "number"
			? input.historicalSignals.backgroundSuccessRate - input.historicalSignals.foregroundSuccessRate
			: 0

	let foregroundScore = 55
	let backgroundScore = input.availableBackgroundCapacity ? 45 : 0
	let rationale = "No strong adaptive signal found; foreground remains the safe default."
	let source: RoutingDecisionSource = "default"

	if (!input.availableBackgroundCapacity) {
		foregroundScore = 100
		backgroundScore = 0
		rationale = "Background routing is unavailable, so foreground is the only safe option."
		source = "default"
	} else if (input.branchFromTaskId) {
		foregroundScore = 88
		backgroundScore = 30
		rationale = "Branch follow-ups should stay foreground to preserve parent continuity."
		source = "recommended"
	} else if (backgroundHint) {
		foregroundScore = 35
		backgroundScore = 90
		rationale = "Task wording indicates an independent subgoal that can run in the background."
		source = "recommended"
	} else if (backgroundSignalDelta >= 0.15) {
		foregroundScore = 40
		backgroundScore = 78
		rationale = "Historical signals favor background execution for similar routing decisions."
		source = "recommended"
	} else if (backgroundSignalDelta <= -0.15) {
		foregroundScore = 82
		backgroundScore = 28
		rationale = "Historical signals favor keeping similar work in the foreground."
		source = "recommended"
	}

	const ranking = sortRanking([
		{
			value: "foreground",
			score: clampScore(foregroundScore),
			reason:
				source === "default"
					? "Foreground is the safe default when no stronger routing signal exists."
					: rationale,
		},
		{
			value: "background",
			score: clampScore(backgroundScore),
			reason: !input.availableBackgroundCapacity
				? "Background execution is unavailable without launch capacity."
				: rationale,
		},
	])

	return {
		value: ranking[0]?.value ?? "foreground",
		source,
		ranking,
		rationale,
	}
}

function buildProfileRecommendation(
	input: AdaptiveRoutingAdvisorInput,
	execution: RoutingExecution,
): {
	value: RoutingProfileClass
	source: RoutingDecisionSource
	helperProfile?: string
	ranking: Array<AdaptiveRoutingRankingEntry<RoutingProfileClass> & { helperProfile?: string }>
	rationale: string
} {
	const profilePalette = input.profilePalette ?? {}
	const ranking: Array<AdaptiveRoutingRankingEntry<RoutingProfileClass> & { helperProfile?: string }> = []

	if (execution === "background") {
		if (profilePalette.cheap) {
			ranking.push({
				value: "cheap",
				score: 92,
				reason: "Background subagents should prefer the cheapest existing helper profile when available.",
				helperProfile: profilePalette.cheap,
			})
		}
		if (profilePalette.balanced) {
			ranking.push({
				value: "balanced",
				score: 70,
				reason: "Mode-aligned balanced profile is the next safest background fallback.",
				helperProfile: profilePalette.balanced,
			})
		}
		if (profilePalette.strong || input.currentProfileName) {
			ranking.push({
				value: "strong",
				score: 45,
				reason: "The active strong profile remains available when no cheaper helper is usable.",
				helperProfile: profilePalette.strong ?? input.currentProfileName,
			})
		}
	} else {
		if (profilePalette.strong || input.currentProfileName) {
			ranking.push({
				value: "strong",
				score: 88,
				reason: "Foreground delegation should preserve the active primary profile by default.",
				helperProfile: profilePalette.strong ?? input.currentProfileName,
			})
		}
		if (profilePalette.balanced) {
			ranking.push({
				value: "balanced",
				score: 72,
				reason: "Mode-specific balanced profile is an acceptable foreground fallback.",
				helperProfile: profilePalette.balanced,
			})
		}
		if (profilePalette.cheap) {
			ranking.push({
				value: "cheap",
				score: 20,
				reason: "Cheap helper profiles are deprioritized for foreground delegation.",
				helperProfile: profilePalette.cheap,
			})
		}
	}

	const dedupedRanking = Array.from(new Map(ranking.map((entry) => [entry.value, entry])).values()).sort(
		(left, right) => right.score - left.score,
	)

	if (dedupedRanking.length === 0) {
		return {
			value: execution === "background" ? "balanced" : "strong",
			source: "default",
			helperProfile: undefined,
			ranking: [
				{
					value: execution === "background" ? "balanced" : "strong",
					score: 100,
					reason: "No named helper profile is available, so routing falls back to the active runtime defaults.",
				},
			],
			rationale: "No helper profile palette is available; keep runtime profile selection unchanged.",
		}
	}

	const topEntry = dedupedRanking[0]
	return {
		value: topEntry.value,
		source: topEntry.helperProfile ? "recommended" : "default",
		helperProfile: topEntry.helperProfile,
		ranking: dedupedRanking,
		rationale: topEntry.reason,
	}
}

export class AdaptiveRoutingAdvisor {
	public recommend(input: AdaptiveRoutingAdvisorInput): AdaptiveRoutingRecommendation {
		const mode = buildModeRecommendation(input)
		const execution = buildExecutionRecommendation(input)
		const profile = buildProfileRecommendation(input, execution.value)

		return {
			mode: {
				value: mode.value,
				source: mode.source,
			},
			execution: {
				value: execution.value,
				source: execution.source,
				ranking: execution.ranking,
			},
			profile: {
				value: profile.value,
				source: profile.source,
				helperProfile: profile.helperProfile,
				ranking: profile.ranking,
			},
			rationale: [mode.rationale, execution.rationale, profile.rationale],
		}
	}
}

export const adaptiveRoutingAdvisor = new AdaptiveRoutingAdvisor()
