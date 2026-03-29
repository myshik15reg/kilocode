import type { ActivityItem } from "@roo-code/types"

// kilocode_change - new file
export function compareActivityItems(left: ActivityItem, right: ActivityItem): number {
	const timestampOrder = left.timestamp - right.timestamp
	if (timestampOrder !== 0) {
		return timestampOrder
	}

	return left.id.localeCompare(right.id)
}

export function mergeActivityItems(
	persistedActivity: ActivityItem[] | undefined,
	liveActivity: ActivityItem[] | undefined,
): ActivityItem[] {
	const byId = new Map<string, ActivityItem>()

	for (const item of persistedActivity ?? []) {
		byId.set(item.id, item)
	}

	for (const item of liveActivity ?? []) {
		byId.set(item.id, item)
	}

	return [...byId.values()].sort(compareActivityItems)
}

export function getActivityProjection(
	persistedActivity: ActivityItem[] | undefined,
	liveActivity: ActivityItem[] | undefined,
): {
	items: ActivityItem[]
	activeItems: ActivityItem[]
	latestSummary: string | undefined
} {
	const items = mergeActivityItems(persistedActivity, liveActivity)

	return {
		items,
		activeItems: getActiveActivityItems(items),
		latestSummary: getLatestActivitySummary(items),
	}
}

export function getLatestActivitySummary(items: ActivityItem[]): string | undefined {
	return items.length > 0 ? items[items.length - 1]?.summary : undefined
}

export function getActiveActivityItems(items: ActivityItem[]): ActivityItem[] {
	return items.filter((item) => {
		if (item.kind === "toolBatch") {
			return item.status === "started" || item.status === "progress"
		}

		if (item.kind === "subagent") {
			return item.status === "queued" || item.status === "running" || item.status === "paused"
		}

		if (item.kind === "relay") {
			return false
		}

		if (item.kind === "taskControl") {
			return item.control === "pause" || item.control === "resume" || item.control === "continue"
		}

		return item.status === "suggested"
	})
}
