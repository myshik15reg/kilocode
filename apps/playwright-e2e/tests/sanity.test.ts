// kilocode_change - new file
import { setupTestEnvironment, verifyExtensionInstalled } from "../helpers"
import { test, expect, type TestFixtures } from "./playwright-base-test"

test.describe("Sanity Tests", () => {
	test("should launch VS Code with extension installed", async ({ workbox: page }: TestFixtures) => {
		await expect(page.locator(".monaco-workbench")).toBeVisible()
		console.log("✅ VS Code launched successfully")

		await expect(page.locator(".activitybar")).toBeVisible()
		console.log("✅ Activity bar visible")

		await verifyExtensionInstalled(page)

		if (process.env.OPENROUTER_API_KEY) {
			await setupTestEnvironment(page)
		} else {
			console.log("Skipping API-backed Playwright setup because OPENROUTER_API_KEY is not set")
		}
	})
})
