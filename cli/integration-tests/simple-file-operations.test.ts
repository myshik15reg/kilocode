import { beforeEach, afterEach, it, expect, onTestFailed } from "vitest"
import { describe } from "vitest"
import { poll, TestRig } from "./test-helper"

describe("Simple File Operations", () => {
	let rig: TestRig

	beforeEach(({ task }) => {
		rig = new TestRig(task.name)
	})

	afterEach(async () => {
		await rig.cleanup()
	})

	it("should increase a file number in an existing file", async () => {
		rig.createFile("text.json", JSON.stringify({ version: 1 }))

		const run = await rig.runInteractive(["--mode", "code"], {
			env: {
				KILO_CLI_INTEGRATION_TEST_MODE: "true",
			},
		})

		onTestFailed(() => {
			console.log(run.getStrippedOutput())
		})
		await run.type("Increase the version number in text.json with 1")
		await run.pressEnter()

		const updated = await poll(() => rig.readFile("text.json") === JSON.stringify({ version: 2 }), 60_000, 500)

		expect(updated).toBe(true)
		expect(run.getStrippedOutput()).toContain("Task Completed")
		expect(rig.readFile("text.json")).toEqual(JSON.stringify({ version: 2 }))
	}, 180_000)
})
