import type { ActivityItem } from "@roo-code/types"

import { mergeActivityItems } from "./projections"
import { orchestrationEventStore } from "./store"

// kilocode_change - explicit persistence seam for activity publishing
export type LoadPersistedActivity = (taskId: string) => Promise<ActivityItem[] | undefined>
export type PersistActivity = (taskId: string, items: ActivityItem[]) => Promise<void>

export interface OrchestrationActivityPersistence {
	loadPersistedActivity: LoadPersistedActivity
	persistActivity: PersistActivity
}

export interface PublishOrchestrationActivityOptions {
	taskId: string
	activity: ActivityItem
	persistence?: OrchestrationActivityPersistence
	loadPersistedActivity?: LoadPersistedActivity
	persistActivity?: PersistActivity
}

export interface PublishOrchestrationActivityResult {
	liveActivity: ActivityItem[]
	persistedActivity: ActivityItem[] | undefined
	persisted: boolean
}

function resolveActivityPersistence({
	persistence,
	loadPersistedActivity,
	persistActivity,
}: Pick<PublishOrchestrationActivityOptions, "persistence" | "loadPersistedActivity" | "persistActivity">):
	| OrchestrationActivityPersistence
	| undefined {
	if (persistence) {
		return persistence
	}

	if (!loadPersistedActivity || !persistActivity) {
		return undefined
	}

	return {
		loadPersistedActivity,
		persistActivity,
	}
}

export async function publishOrchestrationActivity({
	taskId,
	activity,
	persistence,
	loadPersistedActivity,
	persistActivity,
}: PublishOrchestrationActivityOptions): Promise<PublishOrchestrationActivityResult> {
	const liveActivity = orchestrationEventStore.append(taskId, activity)
	const resolvedPersistence = resolveActivityPersistence({
		persistence,
		loadPersistedActivity,
		persistActivity,
	})

	if (!resolvedPersistence) {
		return {
			liveActivity,
			persistedActivity: undefined,
			persisted: false,
		}
	}

	const persistedActivity = (await resolvedPersistence.loadPersistedActivity(taskId)) ?? []
	if (persistedActivity.some((item) => item.id === activity.id)) {
		return {
			liveActivity,
			persistedActivity,
			persisted: false,
		}
	}

	const nextPersistedActivity = mergeActivityItems(persistedActivity, [activity])
	await resolvedPersistence.persistActivity(taskId, nextPersistedActivity)

	return {
		liveActivity,
		persistedActivity: nextPersistedActivity,
		persisted: true,
	}
}
