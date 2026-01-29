// kilocode_change - new file
import fs from "fs/promises"
import path from "path"
import os from "os"
import yaml from "yaml"

import { fileExistsAtPath, isDirectory } from "../../utils/fs"

export const WORKFLOW_AI_ASSETS_VERSION = "2026-01-28"

const WORKFLOW_AI_STATE_KEY = "workflowAiAssetsVersion"
const WORKFLOW_AI_PACK_RELATIVE_PATH = path.join("assets", "workflow-ai", "pack")

export interface WorkflowAiSyncResult {
	copiedFiles: number
	skippedFiles: number
	mergedModes: number
	errors: string[]
}

export interface WorkflowAiSyncOptions {
	assetsRoot: string
	globalKiloDir?: string
	log?: (message: string) => void
}

function logMessage(log: WorkflowAiSyncOptions["log"], message: string) {
	if (log) {
		log(`[WorkFlowAI] ${message}`)
	}
}

async function copyFileIfMissing(
	sourcePath: string,
	destPath: string,
	result: WorkflowAiSyncResult,
	log?: WorkflowAiSyncOptions["log"],
): Promise<void> {
	if (!(await fileExistsAtPath(sourcePath))) {
		return
	}

	if (await fileExistsAtPath(destPath)) {
		result.skippedFiles += 1
		return
	}

	try {
		await fs.mkdir(path.dirname(destPath), { recursive: true })
		await fs.copyFile(sourcePath, destPath)
		result.copiedFiles += 1
	} catch (error) {
		const message = `Failed to copy ${sourcePath} -> ${destPath}: ${
			error instanceof Error ? error.message : String(error)
		}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

async function copyDirectoryContents(
	sourceDir: string,
	destDir: string,
	result: WorkflowAiSyncResult,
	log?: WorkflowAiSyncOptions["log"],
): Promise<void> {
	if (!(await isDirectory(sourceDir))) {
		return
	}

	await fs.mkdir(destDir, { recursive: true })

	const entries = await fs.readdir(sourceDir, { withFileTypes: true })
	for (const entry of entries) {
		const sourcePath = path.join(sourceDir, entry.name)
		const destPath = path.join(destDir, entry.name)

		if (entry.isDirectory()) {
			await copyDirectoryContents(sourcePath, destPath, result, log)
		} else if (entry.isFile()) {
			await copyFileIfMissing(sourcePath, destPath, result, log)
		}
	}
}

async function readYamlFile(filePath: string, log?: WorkflowAiSyncOptions["log"]): Promise<any | null> {
	if (!(await fileExistsAtPath(filePath))) {
		return null
	}

	try {
		const raw = await fs.readFile(filePath, "utf8")
		const sanitized = raw.replace(/^\uFEFF/, "")
		return yaml.parse(sanitized) ?? null
	} catch (error) {
		logMessage(
			log,
			`Failed to parse YAML at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		)
		return null
	}
}

async function mergeCustomModes(
	globalModesPath: string,
	packModesPath: string,
	result: WorkflowAiSyncResult,
	log?: WorkflowAiSyncOptions["log"],
): Promise<void> {
	const packModesData = await readYamlFile(packModesPath, log)
	const packModes = Array.isArray(packModesData?.customModes) ? packModesData.customModes : []

	if (packModes.length === 0) {
		return
	}

	const existingData = (await readYamlFile(globalModesPath, log)) ?? { customModes: [] }
	const existingModes = Array.isArray(existingData.customModes) ? existingData.customModes : []

	const existingSlugs = new Set<string>(existingModes.map((mode: { slug?: string }) => mode.slug).filter(Boolean))

	const newModes = packModes.filter((mode: { slug?: string }) => mode?.slug && !existingSlugs.has(mode.slug))
	if (newModes.length === 0) {
		return
	}

	const mergedModes = [...existingModes, ...newModes]

	try {
		await fs.mkdir(path.dirname(globalModesPath), { recursive: true })
		const yamlContent = yaml.stringify({ customModes: mergedModes }, { lineWidth: 0 })
		await fs.writeFile(globalModesPath, yamlContent, "utf8")
		result.mergedModes += newModes.length
	} catch (error) {
		const message = `Failed to merge custom modes into ${globalModesPath}: ${
			error instanceof Error ? error.message : String(error)
		}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

export async function syncWorkflowAiAssets(options: WorkflowAiSyncOptions): Promise<WorkflowAiSyncResult> {
	const result: WorkflowAiSyncResult = {
		copiedFiles: 0,
		skippedFiles: 0,
		mergedModes: 0,
		errors: [],
	}

	const globalKiloDir = options.globalKiloDir ?? path.join(os.homedir(), ".kilocode")
	const packKiloDir = path.join(options.assetsRoot, ".kilocode")

	if (!(await isDirectory(packKiloDir))) {
		logMessage(options.log, `Pack directory missing: ${packKiloDir}`)
		return result
	}

	await fs.mkdir(globalKiloDir, { recursive: true })

	const coreDirs: Array<{ src: string; dest: string }> = [
		{ src: path.join(packKiloDir, "rules"), dest: path.join(globalKiloDir, "rules") },
		{ src: path.join(packKiloDir, "rules-architect"), dest: path.join(globalKiloDir, "rules-architect") },
		{ src: path.join(packKiloDir, "rules-code"), dest: path.join(globalKiloDir, "rules-code") },
		{ src: path.join(packKiloDir, "rules-orchestrator"), dest: path.join(globalKiloDir, "rules-orchestrator") },
		{ src: path.join(packKiloDir, "workflows"), dest: path.join(globalKiloDir, "workflows") },
		{ src: path.join(packKiloDir, "skills"), dest: path.join(globalKiloDir, "skills") },
		{ src: path.join(packKiloDir, "modes"), dest: path.join(globalKiloDir, "modes") },
		{ src: path.join(packKiloDir, "patterns"), dest: path.join(globalKiloDir, "patterns") },
	]

	for (const { src, dest } of coreDirs) {
		await copyDirectoryContents(src, dest, result, options.log)
	}

	await copyFileIfMissing(path.join(packKiloDir, "QUICK.md"), path.join(globalKiloDir, "QUICK.md"), result, options.log)

	const templateRoot = path.join(globalKiloDir, "workflowai", "templates")

	const templateDirs: Array<{ src: string; dest: string }> = [
		{ src: path.join(packKiloDir, "memory-bank"), dest: path.join(templateRoot, "memory-bank") },
		{ src: path.join(packKiloDir, "patterns"), dest: path.join(templateRoot, "patterns") },
		{ src: path.join(packKiloDir, "skills"), dest: path.join(templateRoot, "skills") },
		{ src: path.join(packKiloDir, "templates", "quality-gates"), dest: path.join(templateRoot, "quality-gates") },
	]

	for (const { src, dest } of templateDirs) {
		await copyDirectoryContents(src, dest, result, options.log)
	}

	const protocolsDir = path.join(options.assetsRoot, ".protocols")
	const protocolsDest = path.join(templateRoot, "protocols")
	await copyFileIfMissing(path.join(protocolsDir, "README.md"), path.join(protocolsDest, "README.md"), result, options.log)
	await copyFileIfMissing(path.join(protocolsDir, "index.md"), path.join(protocolsDest, "index.md"), result, options.log)

	const projectRootTemplates = path.join(templateRoot, "project-root")
	await copyFileIfMissing(
		path.join(options.assetsRoot, "AGENTS.md"),
		path.join(projectRootTemplates, "AGENTS.md"),
		result,
		options.log,
	)
	await copyFileIfMissing(
		path.join(options.assetsRoot, ".clinerules"),
		path.join(projectRootTemplates, ".clinerules"),
		result,
		options.log,
	)
	await copyFileIfMissing(
		path.join(options.assetsRoot, ".kilocodemodes"),
		path.join(projectRootTemplates, ".kilocodemodes"),
		result,
		options.log,
	)

	const globalModesPath = path.join(globalKiloDir, "custom_modes.yaml")
	const packModesPath = path.join(options.assetsRoot, ".kilocodemodes")
	await mergeCustomModes(globalModesPath, packModesPath, result, options.log)

	return result
}

export async function ensureWorkflowAiAssetsInstalled(options: {
	context: { globalState: { get: (key: string) => unknown; update: (key: string, value: unknown) => PromiseLike<void> } } // kilocode_change
	extensionPath: string
	log?: (message: string) => void
}): Promise<{ didInstall: boolean; result?: WorkflowAiSyncResult }> {
	const previousVersion = options.context.globalState.get(WORKFLOW_AI_STATE_KEY)

	if (previousVersion === WORKFLOW_AI_ASSETS_VERSION) {
		return { didInstall: false }
	}

	const assetsRoot = path.join(options.extensionPath, WORKFLOW_AI_PACK_RELATIVE_PATH)
	const result = await syncWorkflowAiAssets({ assetsRoot, log: options.log })

	if (result.errors.length === 0) {
		await options.context.globalState.update(WORKFLOW_AI_STATE_KEY, WORKFLOW_AI_ASSETS_VERSION)
	}

	return { didInstall: true, result }
}
