import * as path from "path"
import * as os from "os"
import * as fs from "fs/promises"

import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron"

async function main() {
	let aliasRoot: string | undefined
	let testWorkspace: string | undefined
	let profileRoot: string | undefined
	const previousElectronRunAsNode = process.env.ELECTRON_RUN_AS_NODE
	const previousVscodeDev = process.env.VSCODE_DEV

	try {
		const repoRoot = path.resolve(__dirname, "../../..")

		if (process.platform === "win32" && repoRoot.includes(" ")) {
			const aliasParent = await fs.mkdtemp(path.join(os.tmpdir(), "roo-test-repo-"))
			aliasRoot = path.join(aliasParent, "repo")
			await fs.symlink(repoRoot, aliasRoot, "junction")
		}

		const resolvedRepoRoot = aliasRoot ?? repoRoot
		const vscodeCachePath = path.join(os.tmpdir(), "roo-vscode-test")
		await fs.mkdir(vscodeCachePath, { recursive: true })

		profileRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roo-test-profile-"))
		const extensionsDir = path.join(profileRoot, "extensions")
		const userDataDir = path.join(profileRoot, "user-data")
		await fs.mkdir(extensionsDir, { recursive: true })
		await fs.mkdir(userDataDir, { recursive: true })

		const extensionDevelopmentPath = path.join(resolvedRepoRoot, "src")
		const extensionTestsPath = path.join(resolvedRepoRoot, "apps", "vscode-e2e", "out", "suite", "index")

		const version = process.env.VSCODE_VERSION || "1.101.2"
		const downloadedExecutable = await downloadAndUnzipVSCode({ version, cachePath: vscodeCachePath })

		testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), "roo-test-workspace-"))

		const testGrep = process.argv.find((arg, i) => process.argv[i - 1] === "--grep") || process.env.TEST_GREP
		const testFile = process.argv.find((arg, i) => process.argv[i - 1] === "--file") || process.env.TEST_FILE

		const extensionTestsEnv = {
			...process.env,
			TEST_WORKSPACE: testWorkspace,
			...(testGrep && { TEST_GREP: testGrep }),
			...(testFile && { TEST_FILE: testFile }),
		}

		delete process.env.ELECTRON_RUN_AS_NODE
		delete process.env.VSCODE_DEV

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			extensionTestsEnv,
			launchArgs: [`--extensions-dir=${extensionsDir}`, `--user-data-dir=${userDataDir}`],
			reuseMachineInstall: true,
			vscodeExecutablePath: downloadedExecutable,
		})
	} catch (error) {
		console.error("Failed to run tests", error)
		process.exitCode = 1
	} finally {
		if (previousElectronRunAsNode === undefined) {
			delete process.env.ELECTRON_RUN_AS_NODE
		} else {
			process.env.ELECTRON_RUN_AS_NODE = previousElectronRunAsNode
		}

		if (previousVscodeDev === undefined) {
			delete process.env.VSCODE_DEV
		} else {
			process.env.VSCODE_DEV = previousVscodeDev
		}

		if (testWorkspace) {
			await fs.rm(testWorkspace, { recursive: true, force: true }).catch(() => undefined)
		}

		if (profileRoot) {
			await fs.rm(profileRoot, { recursive: true, force: true }).catch(() => undefined)
		}

		if (aliasRoot) {
			await fs.rm(path.dirname(aliasRoot), { recursive: true, force: true }).catch(() => undefined)
		}
	}
}

main()
