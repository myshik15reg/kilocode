import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..")
const bundledExtensionEntry = path.join(workspaceRoot, "src", "dist", "extension.js")

if (existsSync(bundledExtensionEntry)) {
	console.log(`Using existing extension bundle at ${bundledExtensionEntry}`)
	process.exit(0)
}

const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const result = spawnSync(pnpmExecutable, ["turbo", "run", "alfa-code-assistant#bundle", "--cwd", ".."], {
	stdio: "inherit",
	cwd: path.resolve(import.meta.dirname, ".."),
})

if (result.status !== 0) {
	process.exit(result.status ?? 1)
}
