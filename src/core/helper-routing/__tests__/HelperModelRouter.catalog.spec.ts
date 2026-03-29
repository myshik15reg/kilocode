// kilocode_change - new file
import { HELPER_JOB_CATALOG, HELPER_JOBS, type HelperJobCatalogEntry } from "../HelperModelRouter"

describe("HelperModelRouter catalog", () => {
	it("covers every planned helper job exactly once", () => {
		expect(Object.keys(HELPER_JOB_CATALOG).sort()).toEqual([...HELPER_JOBS].sort())
	})

	it("requires every planned helper job to be active or explicitly deferred", () => {
		for (const job of HELPER_JOBS) {
			const entry = HELPER_JOB_CATALOG[job] as HelperJobCatalogEntry
			expect(["active", "deferred"]).toContain(entry.status)
			expect(entry.fallbackBehavior.length).toBeGreaterThan(0)

			if (entry.status === "active") {
				expect(entry.productionEntrypoints.length).toBeGreaterThan(0)
				expect(entry.deferredReason).toBeUndefined()
			} else {
				expect(entry.deferredReason?.length ?? 0).toBeGreaterThan(0)
			}
		}
	})

	it("currently keeps every planned helper job active in production", () => {
		for (const job of HELPER_JOBS) {
			expect(HELPER_JOB_CATALOG[job].status).toBe("active")
		}
	})

	it("keeps condense and search_assist explicitly mapped to production entrypoints", () => {
		expect(HELPER_JOB_CATALOG.condense.productionEntrypoints).toEqual(
			expect.arrayContaining([
				"src/core/task/Task.ts:1783",
				"src/core/task/Task.ts:1800",
				"src/core/task/Task.ts:4341",
			]),
		)
		expect(HELPER_JOB_CATALOG.search_assist.productionEntrypoints).toEqual(
			expect.arrayContaining([
				"src/core/webview/webviewMessageHandler.ts:4898",
				"src/core/webview/webviewSingleCompletion.ts:29",
			]),
		)
	})

	it("keeps summarize_branch, tech_debt_extract, and relay_compact mapped to production entrypoints", () => {
		expect(HELPER_JOB_CATALOG.summarize_branch.productionEntrypoints).toEqual(
			expect.arrayContaining(["src/core/webview/ClineProvider.ts:4344", "src/core/webview/branchTask.ts:28"]),
		)
		expect(HELPER_JOB_CATALOG.tech_debt_extract.productionEntrypoints).toEqual(
			expect.arrayContaining([
				"src/core/webview/ClineProvider.ts:3139",
				"src/core/webview/ClineProvider.ts:3147",
			]),
		)
		expect(HELPER_JOB_CATALOG.relay_compact.productionEntrypoints).toEqual(
			expect.arrayContaining([
				"src/core/webview/ClineProvider.ts:3772",
				"src/core/webview/ClineProvider.ts:3787",
			]),
		)
	})
})
