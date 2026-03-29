// kilocode_change - new file
import type { HistoryItem } from "@roo-code/types"

import {
	buildTaskTreeRows,
	getAutoExpandedTaskIds,
	getHistoryRootTaskStatus,
	getRootTaskDescendantSummaryMap,
} from "../taskTree"

describe("buildTaskTreeRows", () => {
	it("keeps parent first and hides collapsed children", () => {
		const items: HistoryItem[] = [
			{
				id: "parent",
				number: 1,
				task: "Parent",
				ts: 3,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["child"],
			},
			{
				id: "child",
				number: 2,
				task: "Child",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "parent",
				rootTaskId: "parent",
			},
		]

		const rows = buildTaskTreeRows(items, new Set())

		expect(rows).toEqual([
			expect.objectContaining({
				item: expect.objectContaining({ id: "parent" }),
				depth: 0,
				hasChildren: true,
				isExpanded: false,
				ancestorHasNextSiblings: [],
				isLastSibling: true,
			}),
		])
	})

	it("supports nested expansion with arbitrary depth", () => {
		const items: HistoryItem[] = [
			{
				id: "root",
				number: 1,
				task: "Root",
				ts: 3,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["child"],
			},
			{
				id: "child",
				number: 2,
				task: "Child",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
				childIds: ["grandchild"],
			},
			{
				id: "grandchild",
				number: 3,
				task: "Grandchild",
				ts: 1,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "child",
				rootTaskId: "root",
			},
		]

		const rows = buildTaskTreeRows(items, new Set(["root", "child"]))

		expect(rows.map((row) => ({ id: row.item.id, depth: row.depth }))).toEqual([
			{ id: "root", depth: 0 },
			{ id: "child", depth: 1 },
			{ id: "grandchild", depth: 2 },
		])
		expect(rows[1]).toEqual(expect.objectContaining({ ancestorHasNextSiblings: [false], isLastSibling: true }))
		expect(rows[2]).toEqual(
			expect.objectContaining({ ancestorHasNextSiblings: [false, false], isLastSibling: true }),
		)
	})

	it("auto-expands lineage for focused nested tasks and active roots", () => {
		const items: HistoryItem[] = [
			{
				id: "root",
				number: 1,
				task: "Root",
				ts: 3,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["child"],
			},
			{
				id: "child",
				number: 2,
				task: "Child",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
				childIds: ["grandchild"],
			},
			{
				id: "grandchild",
				number: 3,
				task: "Grandchild",
				ts: 1,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "child",
				rootTaskId: "root",
			},
		]

		const expanded = getAutoExpandedTaskIds(items, { focusedTaskId: "grandchild", activeRootTaskIds: ["root"] })

		expect(Array.from(expanded)).toEqual(expect.arrayContaining(["root", "child"]))
	})

	it("auto-expands active roots even when descendants are inferred without childIds", () => {
		const items: HistoryItem[] = [
			{ id: "root", number: 1, task: "Root", ts: 3, tokensIn: 1, tokensOut: 1, totalCost: 0 },
			{
				id: "child",
				number: 2,
				task: "Child",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
			},
		]

		const expanded = getAutoExpandedTaskIds(items, { activeRootTaskIds: ["root"] })

		expect(Array.from(expanded)).toContain("root")
	})

	it("auto-expands visible root lineage for focused descendants when direct parent is absent", () => {
		const items: HistoryItem[] = [
			{
				id: "root",
				number: 1,
				task: "Root",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["missing-parent"],
			},
			{
				id: "descendant",
				number: 2,
				task: "Descendant",
				ts: 1,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "missing-parent",
				rootTaskId: "root",
			},
		]

		const expanded = getAutoExpandedTaskIds(items, { focusedTaskId: "descendant" })

		expect(Array.from(expanded)).toContain("root")
	})
	it("attaches orphan descendants to visible root when direct parent is absent", () => {
		const items: HistoryItem[] = [
			{
				id: "root",
				number: 1,
				task: "Root",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["missing-parent"],
			},
			{
				id: "descendant",
				number: 2,
				task: "Descendant",
				ts: 1,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "missing-parent",
				rootTaskId: "root",
			},
		]

		const rows = buildTaskTreeRows(items, new Set(["root"]))

		expect(rows.map((row) => ({ id: row.item.id, depth: row.depth }))).toEqual([
			{ id: "root", depth: 0 },
			{ id: "descendant", depth: 1 },
		])
	})
})

describe("getRootTaskDescendantSummaryMap", () => {
	it("aggregates descendant counts by root task and status", () => {
		const items: HistoryItem[] = [
			{
				id: "root",
				number: 1,
				task: "Root",
				ts: 5,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				childIds: ["child-a", "child-b"],
			},
			{
				id: "child-a",
				number: 2,
				task: "Child A",
				ts: 4,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
				status: "active",
				childIds: ["grandchild"],
			},
			{
				id: "child-b",
				number: 3,
				task: "Child B",
				ts: 3,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
				status: "completed",
			},
			{
				id: "grandchild",
				number: 4,
				task: "Grandchild",
				ts: 2,
				tokensIn: 1,
				tokensOut: 1,
				totalCost: 0,
				parentTaskId: "child-a",
				rootTaskId: "root",
				status: "aborted",
			},
			{ id: "other-root", number: 5, task: "Other root", ts: 1, tokensIn: 1, tokensOut: 1, totalCost: 0 },
		]

		const summaryMap = getRootTaskDescendantSummaryMap(items)

		expect(summaryMap.get("root")).toEqual({
			totalDescendants: 3,
			active: 1,
			completed: 1,
			delegated: 0,
			aborted: 1,
		})
		expect(summaryMap.get("other-root")).toEqual({
			totalDescendants: 0,
			active: 0,
			completed: 0,
			delegated: 0,
			aborted: 0,
		})
	})
})

describe("getHistoryRootTaskStatus", () => {
	it("keeps active-but-not-running roots stopped", () => {
		const item: HistoryItem = {
			id: "root",
			number: 1,
			task: "Root",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "active",
			lastStopReason: "user_cancelled",
		}

		expect(getHistoryRootTaskStatus(item, { runningRootTaskIds: [] })).toBe("stopped")
		expect(getHistoryRootTaskStatus(item, { runningRootTaskIds: ["root"] })).toBe("running")
	})
})
