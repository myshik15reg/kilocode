import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../../../src/utils/storage", () => ({
	getTaskDirectoryPath: vi.fn().mockResolvedValue("/tmp/task-dir"),
}))

vi.mock("get-folder-size", () => ({
	default: {
		loose: vi.fn().mockResolvedValue(0),
	},
}))

import { taskMetadata } from "../taskMetadata"

describe("taskMetadata", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("persists delegationDepth into history metadata", async () => {
		const { historyItem } = await taskMetadata({
			taskId: "task-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			delegationDepth: 3,
			taskNumber: 1,
			messages: [],
			globalStoragePath: "/tmp",
			workspace: "/workspace",
			mode: "code",
		})

		expect(historyItem).toEqual(
			expect.objectContaining({
				id: "task-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				delegationDepth: 3,
				mode: "code",
			}),
		)
	})

	it("sets statusUpdatedAt when initial status is provided", async () => {
		const before = Date.now()
		const { historyItem } = await taskMetadata({
			taskId: "task-2",
			taskNumber: 2,
			messages: [],
			globalStoragePath: "/tmp",
			workspace: "/workspace",
			initialStatus: "active",
		})

		expect(historyItem.status).toBe("active")
		expect(historyItem.statusUpdatedAt).toBeGreaterThanOrEqual(before)
	})
})
