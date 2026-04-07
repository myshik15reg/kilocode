import * as assert from "assert"
import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"

import { setDefaultSuiteTimeout } from "./test-utils"

type ExtensionManifest = {
	contributes?: {
		commands?: Array<{
			command: string
		}>
	}
}

suite("AlfaCode assistant Extension", function () {
	setDefaultSuiteTimeout(this)

	test("Commands should be registered", async () => {
		const extensionRoot = path.resolve(__dirname, "../../../../src")
		const manifestPath = path.join(extensionRoot, "package.json")
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ExtensionManifest
		const expectedCommands = (manifest.contributes?.commands ?? []).map((entry) => entry.command)

		const commands = new Set(
			(await vscode.commands.getCommands(true)).filter((cmd) => cmd.startsWith("alfa-code-assistant")),
		)

		assert.ok(expectedCommands.length > 0, "Expected the extension manifest to contribute commands")

		for (const command of expectedCommands) {
			assert.ok(commands.has(command), `Command ${command} should be registered`)
		}
	})
})
