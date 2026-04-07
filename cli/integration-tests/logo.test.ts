import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { TestRig } from "./test-helper.js"

const LOGO_MARKER = "\u28ff\u287f\u283f\u283f"
const WELCOME_MARKER = "Type a message to start chatting"

describe("CLI Logo Display", () => {
	let rig: TestRig

	beforeEach(({ task }) => {
		rig = new TestRig(task.name)
	})

	afterEach(async () => {
		await rig.cleanup()
	})

	it("should display the logo on startup with valid config", async () => {
		const run = await rig.runInteractive([])
		expect(run.getStrippedOutput()).toContain(LOGO_MARKER)
		await run.sendCtrlC()
	}, 120_000)

	it("should not display the logo with --nosplash", async () => {
		const run = await rig.runInteractive(["--nosplash"])
		const output = run.getStrippedOutput()
		expect(output).not.toContain(LOGO_MARKER)
		expect(output).not.toContain(WELCOME_MARKER)
		await run.sendCtrlC()
	}, 120_000)
})
