import { DEFAULT_CONFIG } from "../config.js"

/**
 * SyncQueueItem - Represents a single item in the sync queue.
 *
 * Each item tracks a file update that needs to be synced to the cloud.
 */
export interface SyncQueueItem {
	/** The task ID this item belongs to */
	taskId: string
	/** The blob name (e.g., 'api_conversation_history', 'ui_messages', 'task_metadata') */
	blobName: string
	/** The local file path containing the blob data */
	blobPath: string
	/** Timestamp when this item was added to the queue */
	timestamp: number
}

export interface SyncQueueOverflowEvent {
	previousLength: number
	newLength: number
	droppedCount: number
	deduplicatedCount: number
	maxItems: number
}

/**
 * SyncQueue - Manages the queue of pending sync operations.
 *
 * This class encapsulates all queue operations for session synchronization,
 * providing a clean interface for:
 * - Adding items to the queue
 * - Querying items by task or blob name
 * - Removing processed items
 * - Queue state inspection
 *
 * Extracted from SessionManager as part of the refactoring effort to improve
 * maintainability and testability through separation of concerns.
 */
export class SyncQueue {
	private readonly queueFlushThreshold: number
	private readonly queueMaxItems: number

	private items: SyncQueueItem[] = []
	private taskIndex: Map<string, SyncQueueItem[]> = new Map()
	private blobIndex: Map<string, SyncQueueItem> = new Map() // key: `${taskId}:${blobName}`
	private flushHandler: (() => Promise<void>) | null = null
	private overflowHandler: ((event: SyncQueueOverflowEvent) => void) | null = null

	/**
	 * Creates a new SyncQueue instance.
	 *
	 * @param queueFlushThreshold - Optional threshold for triggering automatic flush.
	 *                              Defaults to the value from DEFAULT_CONFIG.
	 * @param queueMaxItems - Hard cap for queued items before stale entries are trimmed.
	 */
	constructor(
		queueFlushThreshold: number = DEFAULT_CONFIG.sync.queueFlushThreshold,
		queueMaxItems: number = DEFAULT_CONFIG.sync.queueMaxItems,
	) {
		this.queueFlushThreshold = queueFlushThreshold
		this.queueMaxItems = queueMaxItems
	}

	/**
	 * Sets the flush handler that will be called when the queue needs to be flushed.
	 * This uses setter injection to avoid circular dependencies in the constructor.
	 */
	setFlushHandler(handler: () => Promise<void>): void {
		this.flushHandler = handler
	}

	setOverflowHandler(handler: (event: SyncQueueOverflowEvent) => void): void {
		this.overflowHandler = handler
	}

	/**
	 * Adds an item to the queue.
	 */
	enqueue(item: SyncQueueItem): void {
		this.items.push(item)

		const taskItems = this.taskIndex.get(item.taskId) || []
		taskItems.push(item)
		this.taskIndex.set(item.taskId, taskItems)

		this.blobIndex.set(this.getBlobKey(item.taskId, item.blobName), item)
		this.enforceCapacity()

		if (this.length > this.queueFlushThreshold) {
			void this.flushHandler?.()
		}
	}

	/**
	 * Gets all items currently in the queue.
	 * Returns a copy to prevent external mutation.
	 */
	getAll(): SyncQueueItem[] {
		return [...this.items]
	}

	/**
	 * Gets all items for a specific task.
	 */
	getItemsForTask(taskId: string): SyncQueueItem[] {
		return this.taskIndex.get(taskId) || []
	}

	/**
	 * Gets all unique task IDs in the queue.
	 */
	getUniqueTaskIds(): Set<string> {
		return new Set(this.items.map((item) => item.taskId))
	}

	/**
	 * Gets all unique blob names for items belonging to a specific task.
	 */
	getUniqueBlobNamesForTask(taskId: string): Set<string> {
		const taskItems = this.getItemsForTask(taskId)
		return new Set(taskItems.map((item) => item.blobName))
	}

	/**
	 * Gets the last item for a specific blob name within a task's items.
	 * Uses the blob index for O(1) lookup.
	 */
	getLastItemForBlob(taskId: string, blobName: string): SyncQueueItem | undefined {
		return this.blobIndex.get(this.getBlobKey(taskId, blobName))
	}

	/**
	 * Gets the last item in the queue.
	 */
	getLastItem(): SyncQueueItem | undefined {
		return this.items[this.items.length - 1]
	}

	/**
	 * Removes all items matching the specified criteria that were added
	 * at or before the given timestamp.
	 *
	 * This is used after a successful blob upload to remove all queued
	 * items that were included in that upload.
	 */
	removeProcessedItems(taskId: string, blobName: string, beforeTimestamp: number): void {
		this.items = this.items.filter(
			(item) => !(item.taskId === taskId && item.blobName === blobName && item.timestamp <= beforeTimestamp),
		)
		this.rebuildIndexes()
	}

	/**
	 * Clears all items from the queue.
	 */
	clear(): void {
		this.items = []
		this.taskIndex.clear()
		this.blobIndex.clear()
	}

	/**
	 * Gets the number of items in the queue.
	 */
	get length(): number {
		return this.items.length
	}

	/**
	 * Checks if the queue is empty.
	 */
	get isEmpty(): boolean {
		return this.items.length === 0
	}

	private getBlobKey(taskId: string, blobName: string): string {
		return `${taskId}:${blobName}`
	}

	private enforceCapacity(): void {
		if (this.queueMaxItems <= 0 || this.items.length <= this.queueMaxItems) {
			return
		}

		const previousLength = this.items.length
		const latestIndexByBlobKey = new Map<string, number>()

		this.items.forEach((item, index) => {
			latestIndexByBlobKey.set(this.getBlobKey(item.taskId, item.blobName), index)
		})

		let trimmedItems = this.items.filter(
			(item, index) => latestIndexByBlobKey.get(this.getBlobKey(item.taskId, item.blobName)) === index,
		)
		const deduplicatedCount = previousLength - trimmedItems.length

		if (trimmedItems.length > this.queueMaxItems) {
			trimmedItems = trimmedItems.slice(trimmedItems.length - this.queueMaxItems)
		}

		const droppedCount = previousLength - trimmedItems.length
		if (droppedCount <= 0) {
			return
		}

		this.items = trimmedItems
		this.rebuildIndexes()

		if (this.overflowHandler) {
			try {
				this.overflowHandler({
					previousLength,
					newLength: this.items.length,
					droppedCount,
					deduplicatedCount,
					maxItems: this.queueMaxItems,
				})
			} catch (error) {
				console.error("[SyncQueue] Overflow handler failed", error)
			}
		}
	}

	private rebuildIndexes(): void {
		this.taskIndex.clear()
		this.blobIndex.clear()

		for (const item of this.items) {
			const taskItems = this.taskIndex.get(item.taskId) || []
			taskItems.push(item)
			this.taskIndex.set(item.taskId, taskItems)
			this.blobIndex.set(this.getBlobKey(item.taskId, item.blobName), item)
		}
	}
}
