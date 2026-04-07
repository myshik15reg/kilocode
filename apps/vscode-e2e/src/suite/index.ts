import * as path from "path"
import Mocha from "mocha"
import { glob } from "glob"
import * as vscode from "vscode"

import type { RooCodeAPI } from "@roo-code/types"

import { waitFor } from "./utils"

const MODELS_TO_TEST = ["openai/gpt-5.2", "anthropic/claude-sonnet-4.5", "google/gemini-3-pro-preview"]

type TestRunTarget = {
	label: string
	model?: string
}

interface ModelTestResult {
	model: string
	failures: number
	passes: number
	duration: number
}

async function ensureTestWorkspace() {
	const testWorkspace = process.env.TEST_WORKSPACE
	if (!testWorkspace) {
		return
	}

	const workspaceUri = vscode.Uri.file(testWorkspace)
	const existingFolders = vscode.workspace.workspaceFolders ?? []
	const alreadyOpened = existingFolders.some((folder) => folder.uri.fsPath === testWorkspace)

	if (!alreadyOpened) {
		const updated = vscode.workspace.updateWorkspaceFolders(0, existingFolders.length, {
			uri: workspaceUri,
			name: path.basename(testWorkspace),
		})

		if (!updated) {
			throw new Error(`Failed to attach test workspace: ${testWorkspace}`)
		}
	}

	await waitFor(
		() => vscode.workspace.workspaceFolders?.some((folder) => folder.uri.fsPath === testWorkspace) ?? false,
		{
			timeout: 15_000,
		},
	)
}

export async function run() {
	console.log("Starting VS Code e2e suite")

	const extension = vscode.extensions.getExtension<RooCodeAPI>("alfacode.alfa-code-assistant")

	if (!extension) {
		throw new Error("Extension not found")
	}

	const api = extension.isActive ? extension.exports : await extension.activate()
	const hasOpenRouterApiKey = Boolean(process.env.OPENROUTER_API_KEY)

	await ensureTestWorkspace()

	if (hasOpenRouterApiKey) {
		await vscode.commands.executeCommand("alfa-code-assistant.SidebarProvider.focus")
		await api.setConfiguration({
			apiProvider: "openrouter" as const,
			openRouterApiKey: process.env.OPENROUTER_API_KEY,
			openRouterModelId: MODELS_TO_TEST[0],
		})

		await waitFor(() => api.isReady())
	} else {
		console.warn("OPENROUTER_API_KEY is not set; only smoke-style VS Code e2e tests can run in this environment")
	}

	globalThis.api = api

	const cwd = path.resolve(__dirname, "..")

	let testFiles: string[]

	if (process.env.TEST_FILE) {
		const specificFile = process.env.TEST_FILE.endsWith(".js")
			? process.env.TEST_FILE
			: `${process.env.TEST_FILE}.js`

		testFiles = await glob(`**/${specificFile}`, { cwd })
		console.log(`Running specific test file: ${specificFile}`)
	} else if (!hasOpenRouterApiKey) {
		testFiles = ["extension.test.js"]
		console.log("Running smoke-only VS Code e2e suite because OPENROUTER_API_KEY is not set")
	} else {
		testFiles = await glob("**/**.test.js", { cwd })
	}

	if (testFiles.length === 0) {
		throw new Error(`No test files found matching criteria: ${process.env.TEST_FILE || "all tests"}`)
	}

	const runTargets: TestRunTarget[] = hasOpenRouterApiKey
		? MODELS_TO_TEST.map((model) => ({ label: model, model }))
		: [{ label: "smoke-no-api-key" }]

	const results: ModelTestResult[] = []
	let totalFailures = 0

	for (const target of runTargets) {
		console.log(`\n${"=".repeat(60)}`)
		console.log(`  TESTING WITH TARGET: ${target.label}`)
		console.log(`${"=".repeat(60)}\n`)

		if (target.model) {
			await api.setConfiguration({
				apiProvider: "openrouter" as const,
				openRouterApiKey: process.env.OPENROUTER_API_KEY,
				openRouterModelId: target.model,
			})

			await waitFor(() => api.isReady())
		}

		const startTime = Date.now()

		const mochaOptions: Mocha.MochaOptions = {
			ui: "tdd",
			timeout: 20 * 60 * 1_000,
		}

		if (process.env.TEST_GREP) {
			mochaOptions.grep = process.env.TEST_GREP
			console.log(`Running tests matching pattern: ${process.env.TEST_GREP}`)
		}

		const mocha = new Mocha(mochaOptions)
		testFiles.forEach((testFile) => mocha.addFile(path.resolve(cwd, testFile)))

		const modelResult = await new Promise<{ failures: number; passes: number }>((resolve) => {
			const runner = mocha.run((failures) => {
				resolve({
					failures,
					passes: runner.stats?.passes ?? 0,
				})
			})
		})

		const duration = Date.now() - startTime

		results.push({
			model: target.label,
			failures: modelResult.failures,
			passes: modelResult.passes,
			duration,
		})

		totalFailures += modelResult.failures

		console.log(
			`\n[${target.label}] Completed: ${modelResult.passes} passed, ${modelResult.failures} failed (${(duration / 1000).toFixed(1)}s)\n`,
		)

		mocha.dispose()
		testFiles.forEach((testFile) => {
			const fullPath = path.resolve(cwd, testFile)
			delete require.cache[require.resolve(fullPath)]
		})
	}

	console.log(`\n${"=".repeat(60)}`)
	console.log(`  VS CODE E2E SUMMARY`)
	console.log(`${"=".repeat(60)}`)

	for (const result of results) {
		const status = result.failures === 0 ? "PASS" : "FAIL"
		console.log(`  ${status} ${result.model}`)
		console.log(
			`       ${result.passes} passed, ${result.failures} failed (${(result.duration / 1000).toFixed(1)}s)`,
		)
	}

	console.log(`${"=".repeat(60)}\n`)

	if (totalFailures > 0) {
		throw new Error(`${totalFailures} total test failures across all run targets.`)
	}
}
