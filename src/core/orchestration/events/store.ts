import type { ActivityItem } from "@roo-code/types"

import { compareActivityItems } from "./projections"

// kilocode_change - new file
export class OrchestrationEventStore {
	private readonly items = new Map<string, ActivityItem[]>()

	append(taskId: string, item: ActivityItem): ActivityItem[] {
		const current = this.items.get(taskId) ?? []
		const next = [...current, item].sort(compareActivityItems)
		this.items.set(taskId, next)
		return next
	}

	get(taskId: string): ActivityItem[] {
		return this.items.get(taskId) ?? []
	}

	clear(taskId: string): void {
		this.items.delete(taskId)
	}
}

export const orchestrationEventStore = new OrchestrationEventStore()
