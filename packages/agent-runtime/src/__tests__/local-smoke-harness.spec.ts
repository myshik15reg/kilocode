// kilocode_change - new file
import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const scriptPath = path.resolve(import.meta.dirname, "../../scripts/local-smoke-harness.mjs")

describe("local-smoke-harness", () => {
	it("fails fast when provider settings are missing", async () => {
		await expect(execFileAsync(process.execPath, [scriptPath], { env: { ...process.env } })).rejects.toMatchObject({
			stderr: expect.stringContaining("AGENT_RUNTIME_PROVIDER_JSON is required"),
		})
	})

	it("fails fast when provider settings are invalid JSON", async () => {
		await expect(
			execFileAsync(process.execPath, [scriptPath], {
				env: { ...process.env, AGENT_RUNTIME_PROVIDER_JSON: "{not-json}" },
			}),
		).rejects.toMatchObject({
			stderr: expect.stringContaining("Failed to parse AGENT_RUNTIME_PROVIDER_JSON"),
		})
	})
})
