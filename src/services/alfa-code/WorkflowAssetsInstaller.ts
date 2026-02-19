// kilocode_change - new file
import fs from "fs/promises"
import path from "path"
import os from "os"
// yaml import removed (modes are now handled via managed modes file)
import crypto from "node:crypto" // kilocode_change

import { fileExistsAtPath, isDirectory } from "../../utils/fs"

export const WORKFLOW_AI_ASSETS_VERSION = "2026-02-09"

const WORKFLOW_AI_STATE_KEY = "workflowAiAssetsVersion"
// kilocode_change start: bundle WorkFlowAI pack from VSIX root
const WORKFLOW_AI_PACK_RELATIVE_PATH = "WorkFlowAI"
// kilocode_change end

const WORKFLOW_AI_EMBEDDED_MANIFEST_RELATIVE_PATH = ".kilocode/embedded-pack.manifest.json" // kilocode_change
const WORKFLOW_AI_MANAGED_MODES_RELATIVE_PATH = "workflowai/managed_custom_modes.yaml" // kilocode_change
const WORKFLOW_AI_BACKUPS_RELATIVE_DIR = "workflowai/backups" // kilocode_change
const WORKFLOW_AI_BACKUP_RETENTION_COUNT = 5 // kilocode_change

type WorkflowAiAssetsInstallStateV1 = {
	version: string
	source: "embedded" | "override"
	overridePath?: string
}

type WorkflowAiAssetsInstallStateV2 = {
	fingerprint: string
	algorithm: "sha256"
	source: "embedded" | "override"
	overridePath?: string
}

export interface WorkflowAiSyncResult {
	copiedFiles: number
	skippedFiles: number
	overwrittenFiles: number
	deletedPaths: number
	backedUpPaths: number
	mergedModes: number
	errors: string[]
}

export interface WorkflowAiSyncOptions {
	assetsRoot: string
	globalKiloDir?: string
	customModesFilePaths?: string[] // deprecated (kept for API compatibility)
	backupRoot?: string
	log?: (message: string) => void
}

function logMessage(log: WorkflowAiSyncOptions["log"], message: string) {
	if (log) {
		log(`[WorkFlowAI] ${message}`)
	}
}

function toPosixPath(filePath: string): string {
	return filePath.replace(/\\/g, "/")
}

// kilocode_change start: overwrite/reconcile helpers
async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath)
		return true
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && (error as any).code === "ENOENT") {
			return false
		}
		if (error && typeof error === "object" && "code" in error && (error as any).code === "ENOTDIR") {
			return false
		}
		return false
	}
}

type TreeEntry = { relativePath: string; kind: "file" | "dir" }

async function listTree(rootDir: string): Promise<TreeEntry[]> {
	const result: TreeEntry[] = []
	if (!(await pathExists(rootDir))) {
		return result
	}

	const stack: Array<{ absolutePath: string; relativePath: string }> = [{ absolutePath: rootDir, relativePath: "" }]
	while (stack.length > 0) {
		const current = stack.pop()
		if (!current) {
			continue
		}

		const entries = await fs.readdir(current.absolutePath, { withFileTypes: true })
		for (const entry of entries) {
			const absolutePath = path.join(current.absolutePath, entry.name)
			const relativePath = current.relativePath ? path.posix.join(current.relativePath, entry.name) : entry.name
			if (entry.isDirectory()) {
				result.push({ relativePath, kind: "dir" })
				stack.push({ absolutePath, relativePath })
			} else if (entry.isFile()) {
				result.push({ relativePath, kind: "file" })
			}
		}
	}

	return result
}

function isIgnorablePackFile(relativePath: string): boolean {
	const normalized = relativePath.replace(/\\/g, "/")
	return (
		normalized === ".DS_Store" ||
		normalized.endsWith("/.DS_Store") ||
		normalized === "Thumbs.db" ||
		normalized.endsWith("/Thumbs.db")
	)
}

async function computePackFingerprintSha256(
	assetsRoot: string,
	excludeRelativePaths: string[] = [],
): Promise<{
	fingerprint: string
	fileCount: number
}> {
	const exclude = new Set(excludeRelativePaths.map((p) => toPosixPath(p)))
	const entries = await listTree(assetsRoot)
	const files = entries
		.filter((entry) => entry.kind === "file")
		.map((entry) => toPosixPath(entry.relativePath))
		.filter((relativePath) => !exclude.has(relativePath))
		.filter((relativePath) => !isIgnorablePackFile(relativePath))
		.sort((a, b) => a.localeCompare(b))

	const hash = crypto.createHash("sha256")
	for (const relativePath of files) {
		const absolutePath = path.join(assetsRoot, relativePath)
		const buffer = await fs.readFile(absolutePath)
		const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")
		hash.update(relativePath)
		hash.update("\0")
		hash.update(String(buffer.length))
		hash.update("\0")
		hash.update(fileHash)
		hash.update("\n")
	}

	return { fingerprint: hash.digest("hex"), fileCount: files.length }
}

type EmbeddedPackManifest = {
	fingerprint: string
	algorithm?: string
	fileCount?: number
	generatedAt?: string
}

async function readEmbeddedPackManifest(
	assetsRoot: string,
	log?: WorkflowAiSyncOptions["log"],
): Promise<EmbeddedPackManifest | null> {
	const manifestPath = path.join(assetsRoot, WORKFLOW_AI_EMBEDDED_MANIFEST_RELATIVE_PATH)
	if (!(await fileExistsAtPath(manifestPath))) {
		return null
	}

	try {
		const raw = await fs.readFile(manifestPath, "utf8")
		const parsed = JSON.parse(raw) as Partial<EmbeddedPackManifest>
		if (typeof parsed.fingerprint !== "string" || parsed.fingerprint.trim() === "") {
			return null
		}
		return {
			fingerprint: parsed.fingerprint,
			algorithm: parsed.algorithm,
			fileCount: parsed.fileCount,
			generatedAt: parsed.generatedAt,
		}
	} catch (error) {
		logMessage(
			log,
			`Failed to read embedded pack manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
		)
		return null
	}
}

async function getPackFingerprint(
	assetsRoot: string,
	log?: WorkflowAiSyncOptions["log"],
): Promise<{ fingerprint: string; algorithm: "sha256"; fileCount: number; fromManifest: boolean }> {
	const manifest = await readEmbeddedPackManifest(assetsRoot, log)
	if (manifest) {
		return {
			fingerprint: manifest.fingerprint,
			algorithm: "sha256",
			fileCount: typeof manifest.fileCount === "number" ? manifest.fileCount : -1,
			fromManifest: true,
		}
	}

	const computed = await computePackFingerprintSha256(assetsRoot, [WORKFLOW_AI_EMBEDDED_MANIFEST_RELATIVE_PATH])
	return {
		fingerprint: computed.fingerprint,
		algorithm: "sha256",
		fileCount: computed.fileCount,
		fromManifest: false,
	}
}

async function backupExistingPath(params: {
	globalKiloDir: string
	destPath: string
	backupRoot: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { globalKiloDir, destPath, backupRoot, result, log } = params

	if (!(await pathExists(destPath))) {
		return
	}

	const relativeToGlobal = path.relative(globalKiloDir, destPath)
	if (!relativeToGlobal || relativeToGlobal.startsWith("..") || path.isAbsolute(relativeToGlobal)) {
		const message = `Refusing to backup path outside globalKiloDir: ${destPath}`
		result.errors.push(message)
		logMessage(log, message)
		return
	}

	const backupPath = path.join(backupRoot, relativeToGlobal)
	try {
		await fs.mkdir(path.dirname(backupPath), { recursive: true })
		// fs.cp preserves directory structure and is available in Node.js 20+.
		await fs.cp(destPath, backupPath, { recursive: true, force: true })
		result.backedUpPaths += 1
	} catch (error) {
		const message = `Failed to backup ${destPath} -> ${backupPath}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

async function reconcileFile(params: {
	sourcePath: string
	destPath: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { sourcePath, destPath, result, log } = params

	const sourceExists = await fileExistsAtPath(sourcePath)
	if (!sourceExists) {
		if (await pathExists(destPath)) {
			try {
				await fs.rm(destPath, { force: true })
				result.deletedPaths += 1
			} catch (error) {
				const message = `Failed to delete stale file ${destPath}: ${error instanceof Error ? error.message : String(error)}`
				result.errors.push(message)
				logMessage(log, message)
			}
		}
		return
	}

	try {
		const existed = await pathExists(destPath)
		await fs.mkdir(path.dirname(destPath), { recursive: true })
		await fs.copyFile(sourcePath, destPath)
		if (existed) {
			result.overwrittenFiles += 1
		} else {
			result.copiedFiles += 1
		}
	} catch (error) {
		const message = `Failed to copy ${sourcePath} -> ${destPath}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

async function reconcileDirectory(params: {
	sourceDir: string
	destDir: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { sourceDir, destDir, result, log } = params

	const sourceIsDir = await isDirectory(sourceDir)
	if (!sourceIsDir) {
		// Source removed → delete destination to avoid stale.
		if (await pathExists(destDir)) {
			try {
				await fs.rm(destDir, { recursive: true, force: true })
				result.deletedPaths += 1
			} catch (error) {
				const message = `Failed to delete stale directory ${destDir}: ${error instanceof Error ? error.message : String(error)}`
				result.errors.push(message)
				logMessage(log, message)
			}
		}
		return
	}

	await fs.mkdir(destDir, { recursive: true })

	const sourceEntries = (await listTree(sourceDir)).filter((entry) => !isIgnorablePackFile(entry.relativePath))
	const destEntries = (await listTree(destDir)).filter((entry) => !isIgnorablePackFile(entry.relativePath))
	const sourceSet = new Set(sourceEntries.map((entry) => entry.relativePath))

	// Ensure directories exist first (shallow-to-deep)
	const sourceDirs = sourceEntries
		.filter((entry) => entry.kind === "dir")
		.map((entry) => entry.relativePath)
		.sort((a, b) => a.split("/").length - b.split("/").length)

	for (const relativePath of sourceDirs) {
		try {
			await fs.mkdir(path.join(destDir, relativePath), { recursive: true })
		} catch (error) {
			const message = `Failed to create directory ${path.join(destDir, relativePath)}: ${
				error instanceof Error ? error.message : String(error)
			}`
			result.errors.push(message)
			logMessage(log, message)
		}
	}

	// Copy/overwrite files
	const sourceFiles = sourceEntries
		.filter((entry) => entry.kind === "file")
		.map((entry) => entry.relativePath)
		.sort((a, b) => a.localeCompare(b))

	for (const relativePath of sourceFiles) {
		const sourcePath = path.join(sourceDir, relativePath)
		const destPath = path.join(destDir, relativePath)
		await reconcileFile({ sourcePath, destPath, result, log })
	}

	// Delete stale entries (deep-to-shallow)
	const stale = destEntries
		.filter((entry) => !sourceSet.has(entry.relativePath))
		.map((entry) => entry.relativePath)
		.sort((a, b) => b.split("/").length - a.split("/").length)

	for (const relativePath of stale) {
		try {
			await fs.rm(path.join(destDir, relativePath), { recursive: true, force: true })
			result.deletedPaths += 1
		} catch (error) {
			const message = `Failed to delete stale path ${path.join(destDir, relativePath)}: ${
				error instanceof Error ? error.message : String(error)
			}`
			result.errors.push(message)
			logMessage(log, message)
		}
	}
}

// kilocode_change start: safe commands installation (non-destructive)
const LEGACY_MEMORY_BANK_COMMAND_V1 = `---
description: "Memory Bank entrypoints: index + usage rules"
---

Start here:
1. Memory Bank index: [\`.kilocode/memory-bank/index.md\`](.kilocode/memory-bank/index.md:1)
2. Usage rules: [\`.kilocode/rules/memory-bank-instructions.md\`](.kilocode/rules/memory-bank-instructions.md:1)

Rule of thumb: read index first and confirm \`[MB: OK]\` before starting any non-trivial task.
`

function normalizeTextForExactMatch(raw: string): string {
	return raw.replace(/\r\n/g, "\n").trimEnd()
}

async function readTextFileIfExists(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8")
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && (error as any).code === "ENOENT") {
			return null
		}
		if (error && typeof error === "object" && "code" in error && (error as any).code === "ENOTDIR") {
			return null
		}
		throw error
	}
}

async function copyFileIfMissing(params: {
	sourcePath: string
	destPath: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { sourcePath, destPath, result, log } = params

	if (await pathExists(destPath)) {
		result.skippedFiles += 1
		return
	}

	try {
		await fs.mkdir(path.dirname(destPath), { recursive: true })
		await fs.copyFile(sourcePath, destPath)
		result.copiedFiles += 1
	} catch (error) {
		const message = `Failed to copy ${sourcePath} -> ${destPath}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

async function migrateLegacyMemoryBankCommand(params: {
	commandsDir: string
	backupRoot?: string
	globalKiloDir: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { commandsDir, backupRoot, globalKiloDir, result, log } = params

	const legacyPath = path.join(commandsDir, "memory-bank.md")
	const nextPath = path.join(commandsDir, "init-memory-bank.md")

	if (!(await pathExists(legacyPath))) {
		return
	}
	if (await pathExists(nextPath)) {
		return
	}

	let legacyRaw: string | null
	try {
		legacyRaw = await readTextFileIfExists(legacyPath)
	} catch (error) {
		const message = `Failed to read legacy command ${legacyPath}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
		return
	}

	if (!legacyRaw) {
		return
	}

	const legacyNormalized = normalizeTextForExactMatch(legacyRaw)
	const expectedNormalized = normalizeTextForExactMatch(LEGACY_MEMORY_BANK_COMMAND_V1)
	if (legacyNormalized !== expectedNormalized) {
		return
	}

	// Safe migration: only rename if the legacy content matches the known default template.
	try {
		if (backupRoot) {
			await backupExistingPath({
				globalKiloDir,
				destPath: legacyPath,
				backupRoot,
				result,
				log,
			})
		}

		await fs.mkdir(path.dirname(nextPath), { recursive: true })
		await fs.rename(legacyPath, nextPath)
		result.copiedFiles += 1
		result.deletedPaths += 1
		logMessage(log, `Migrated legacy /memory-bank command to /init-memory-bank at ${nextPath}`)
	} catch (error) {
		const message = `Failed to migrate legacy command ${legacyPath} -> ${nextPath}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
	}
}

async function syncWorkflowAiCommands(params: {
	sourceDir: string
	destDir: string
	globalKiloDir: string
	backupRoot?: string
	result: WorkflowAiSyncResult
	log?: WorkflowAiSyncOptions["log"]
}): Promise<void> {
	const { sourceDir, destDir, globalKiloDir, backupRoot, result, log } = params

	try {
		// Ensure destination exists even if the pack doesn't ship commands yet.
		await fs.mkdir(destDir, { recursive: true })
	} catch (error) {
		const message = `Failed to create commands directory ${destDir}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
		return
	}

	try {
		// Migration(s) for legacy command names in the global directory.
		await migrateLegacyMemoryBankCommand({ commandsDir: destDir, backupRoot, globalKiloDir, result, log })
	} catch (error) {
		const message = `Failed to migrate legacy commands in ${destDir}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
	}

	let sourceIsDir = false
	try {
		sourceIsDir = await isDirectory(sourceDir)
	} catch (error) {
		const message = `Failed to stat commands source directory ${sourceDir}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
		return
	}

	if (!sourceIsDir) {
		return
	}

	let sourceEntries: TreeEntry[] = []
	try {
		sourceEntries = (await listTree(sourceDir)).filter((entry) => !isIgnorablePackFile(entry.relativePath))
	} catch (error) {
		const message = `Failed to list commands source directory ${sourceDir}: ${error instanceof Error ? error.message : String(error)}`
		result.errors.push(message)
		logMessage(log, message)
		return
	}

	const sourceDirs = sourceEntries
		.filter((entry) => entry.kind === "dir")
		.map((entry) => entry.relativePath)
		.sort((a, b) => a.split("/").length - b.split("/").length)

	for (const relativePath of sourceDirs) {
		try {
			await fs.mkdir(path.join(destDir, relativePath), { recursive: true })
		} catch (error) {
			const message = `Failed to create directory ${path.join(destDir, relativePath)}: ${
				error instanceof Error ? error.message : String(error)
			}`
			result.errors.push(message)
			logMessage(log, message)
		}
	}

	const sourceFiles = sourceEntries
		.filter((entry) => entry.kind === "file")
		.map((entry) => entry.relativePath)
		.sort((a, b) => a.localeCompare(b))

	for (const relativePath of sourceFiles) {
		const sourcePath = path.join(sourceDir, relativePath)
		const destPath = path.join(destDir, relativePath)
		await copyFileIfMissing({ sourcePath, destPath, result, log })
	}
}
// kilocode_change end

async function pruneBackupRetention(backupsRoot: string, log?: WorkflowAiSyncOptions["log"]): Promise<void> {
	if (!(await pathExists(backupsRoot))) {
		return
	}

	try {
		const entries = await fs.readdir(backupsRoot, { withFileTypes: true })
		const timestamps = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((a, b) => b.localeCompare(a))

		const toDelete = timestamps.slice(WORKFLOW_AI_BACKUP_RETENTION_COUNT)
		for (const name of toDelete) {
			await fs.rm(path.join(backupsRoot, name), { recursive: true, force: true })
		}
	} catch (error) {
		logMessage(
			log,
			`Failed to prune WorkFlowAI backups at ${backupsRoot}: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}
// kilocode_change end

export async function syncWorkflowAiAssets(options: WorkflowAiSyncOptions): Promise<WorkflowAiSyncResult> {
	const result: WorkflowAiSyncResult = {
		copiedFiles: 0,
		skippedFiles: 0,
		overwrittenFiles: 0,
		deletedPaths: 0,
		backedUpPaths: 0,
		mergedModes: 0,
		errors: [],
	}

	const globalKiloDir = options.globalKiloDir ?? path.join(os.homedir(), ".kilocode")
	const packKiloDir = path.join(options.assetsRoot, ".kilocode")

	if (!(await isDirectory(packKiloDir))) {
		const message = `Pack directory missing: ${packKiloDir}`
		result.errors.push(message)
		logMessage(options.log, message)
		return result
	}

	await fs.mkdir(globalKiloDir, { recursive: true })

	if (options.backupRoot) {
		await fs.mkdir(options.backupRoot, { recursive: true })
	}

	const managedMappings: Array<{ kind: "dir" | "file"; src: string; dest: string }> = [
		{ kind: "dir", src: path.join(packKiloDir, "rules"), dest: path.join(globalKiloDir, "rules") },
		{
			kind: "dir",
			src: path.join(packKiloDir, "rules-architect"),
			dest: path.join(globalKiloDir, "rules-architect"),
		},
		{ kind: "dir", src: path.join(packKiloDir, "rules-code"), dest: path.join(globalKiloDir, "rules-code") },
		{
			kind: "dir",
			src: path.join(packKiloDir, "rules-orchestrator"),
			dest: path.join(globalKiloDir, "rules-orchestrator"),
		},
		{ kind: "dir", src: path.join(packKiloDir, "workflows"), dest: path.join(globalKiloDir, "workflows") },
		{ kind: "dir", src: path.join(packKiloDir, "skills"), dest: path.join(globalKiloDir, "skills") },
		{ kind: "dir", src: path.join(packKiloDir, "modes"), dest: path.join(globalKiloDir, "modes") },
		{ kind: "dir", src: path.join(packKiloDir, "patterns"), dest: path.join(globalKiloDir, "patterns") },
		{ kind: "file", src: path.join(packKiloDir, "QUICK.md"), dest: path.join(globalKiloDir, "QUICK.md") },

		// Managed modes file (lowest precedence in CustomModesManager)
		{
			kind: "file",
			src: path.join(options.assetsRoot, ".kilocodemodes"),
			dest: path.join(globalKiloDir, WORKFLOW_AI_MANAGED_MODES_RELATIVE_PATH),
		},
	]

	const templateRoot = path.join(globalKiloDir, "workflowai", "templates")

	const templateMappings: Array<{ kind: "dir" | "file"; src: string; dest: string }> = [
		{ kind: "dir", src: path.join(packKiloDir, "memory-bank"), dest: path.join(templateRoot, "memory-bank") },
		{ kind: "dir", src: path.join(packKiloDir, "patterns"), dest: path.join(templateRoot, "patterns") },
		{ kind: "dir", src: path.join(packKiloDir, "skills"), dest: path.join(templateRoot, "skills") },
		{
			kind: "dir",
			src: path.join(packKiloDir, "templates", "quality-gates"),
			dest: path.join(templateRoot, "quality-gates"),
		},
	]

	const protocolsDir = path.join(options.assetsRoot, ".protocols")
	const protocolsDest = path.join(templateRoot, "protocols")
	const protocolMappings: Array<{ kind: "file"; src: string; dest: string }> = [
		{ kind: "file", src: path.join(protocolsDir, "README.md"), dest: path.join(protocolsDest, "README.md") },
		{ kind: "file", src: path.join(protocolsDir, "index.md"), dest: path.join(protocolsDest, "index.md") },
	]

	const projectRootTemplates = path.join(templateRoot, "project-root")
	const projectRootMappings: Array<{ kind: "file"; src: string; dest: string }> = [
		{
			kind: "file",
			src: path.join(options.assetsRoot, "AGENTS.md"),
			dest: path.join(projectRootTemplates, "AGENTS.md"),
		},
		{
			kind: "file",
			src: path.join(options.assetsRoot, ".clinerules"),
			dest: path.join(projectRootTemplates, ".clinerules"),
		},
		{
			kind: "file",
			src: path.join(options.assetsRoot, ".kilocodemodes"),
			dest: path.join(projectRootTemplates, ".kilocodemodes"),
		},
	]

	const allMappings = [...managedMappings, ...templateMappings, ...protocolMappings, ...projectRootMappings]

	// Backup managed destinations (if requested) before mutating.
	if (options.backupRoot) {
		for (const mapping of allMappings) {
			await backupExistingPath({
				globalKiloDir,
				destPath: mapping.dest,
				backupRoot: options.backupRoot,
				result,
				log: options.log,
			})
		}
	}

	for (const mapping of allMappings) {
		if (mapping.kind === "dir") {
			await reconcileDirectory({ sourceDir: mapping.src, destDir: mapping.dest, result, log: options.log })
		} else {
			await reconcileFile({ sourcePath: mapping.src, destPath: mapping.dest, result, log: options.log })
		}
	}

	// Install slash commands in a non-destructive way.
	// `~/.kilocode/commands` is user-managed (UI can create/delete commands), so we MUST NOT reconcile/delete.
	await syncWorkflowAiCommands({
		sourceDir: path.join(packKiloDir, "commands"),
		destDir: path.join(globalKiloDir, "commands"),
		globalKiloDir,
		backupRoot: options.backupRoot,
		result,
		log: options.log,
	})

	// Apply retention only after successful run to avoid deleting evidence during a failing update.
	if (result.errors.length === 0) {
		const backupsRoot = path.join(globalKiloDir, WORKFLOW_AI_BACKUPS_RELATIVE_DIR)
		await pruneBackupRetention(backupsRoot, options.log)
	}

	return result
}

function normalizeOverridePath(rawPath: string): string {
	const trimmed = rawPath.trim()

	if (trimmed === "~") {
		return os.homedir()
	}

	if (trimmed.startsWith(`~${path.sep}`) || trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
		const suffix = trimmed.slice(2)
		return path.resolve(os.homedir(), suffix)
	}

	return path.resolve(trimmed)
}

async function isValidWorkflowAiAssetsRoot(assetsRoot: string): Promise<{ ok: true } | { ok: false; reason: string }> {
	if (!assetsRoot.trim()) {
		return { ok: false, reason: "empty path" }
	}

	if (!path.isAbsolute(assetsRoot)) {
		return { ok: false, reason: "path must be absolute" }
	}

	if (!(await isDirectory(assetsRoot))) {
		return { ok: false, reason: "path is not a directory" }
	}

	const kiloDir = path.join(assetsRoot, ".kilocode")
	if (!(await isDirectory(kiloDir))) {
		return { ok: false, reason: "missing .kilocode directory" }
	}

	return { ok: true }
}

function parsePreviousInstallState(raw: unknown): WorkflowAiAssetsInstallStateV1 | null {
	if (!raw) {
		return null
	}

	// Backward compatibility: previously we stored only the version string.
	if (typeof raw === "string") {
		return { version: raw, source: "embedded" }
	}

	if (typeof raw !== "object") {
		return null
	}

	const candidate = raw as Partial<WorkflowAiAssetsInstallStateV1>
	if (
		typeof candidate.version === "string" &&
		(candidate.source === "embedded" || candidate.source === "override") &&
		(candidate.overridePath === undefined || typeof candidate.overridePath === "string")
	) {
		return {
			version: candidate.version,
			source: candidate.source,
			overridePath: candidate.overridePath,
		}
	}

	return null
}

// Exposed for unit tests to hit otherwise-unreachable branches (e.g. string/undefined handling).
// This is not part of the public API surface.
export const __testOnly = {
	parsePreviousInstallState,
}

// kilocode_change start: state parsing V2 + legacy
type ParsedWorkflowAiAssetsInstallState =
	| { kind: "none" }
	| { kind: "legacy-version"; version: string }
	| { kind: "v1"; state: WorkflowAiAssetsInstallStateV1 }
	| { kind: "v2"; state: WorkflowAiAssetsInstallStateV2 }

function parsePreviousInstallStateAny(raw: unknown): ParsedWorkflowAiAssetsInstallState {
	if (!raw) {
		return { kind: "none" }
	}

	if (typeof raw === "string") {
		return { kind: "legacy-version", version: raw }
	}

	if (typeof raw !== "object") {
		return { kind: "none" }
	}

	const candidate = raw as any
	if (
		typeof candidate.fingerprint === "string" &&
		(candidate.source === "embedded" || candidate.source === "override")
	) {
		const overridePath = candidate.overridePath
		if (overridePath !== undefined && typeof overridePath !== "string") {
			return { kind: "none" }
		}
		const algorithm = candidate.algorithm
		if (algorithm !== "sha256") {
			return { kind: "none" }
		}
		return {
			kind: "v2",
			state: {
				fingerprint: candidate.fingerprint,
				algorithm: "sha256",
				source: candidate.source,
				overridePath,
			},
		}
	}

	const legacy = parsePreviousInstallState(raw)
	if (legacy) {
		return { kind: "v1", state: legacy }
	}

	return { kind: "none" }
}
// kilocode_change end

export async function ensureWorkflowAiAssetsInstalled(options: {
	context: {
		globalState: { get: (key: string) => unknown; update: (key: string, value: unknown) => PromiseLike<void> }
	} // kilocode_change
	embeddedAssetsRoot?: string
	overrideAssetsRoot?: string
	globalKiloDir?: string
	customModesFilePaths?: string[]
	log?: (message: string) => void
}): Promise<{
	didInstall: boolean
	selectedSource: "embedded" | "override"
	selectedAssetsRoot: string
	result?: WorkflowAiSyncResult
}> {
	const embeddedAssetsRoot = options.embeddedAssetsRoot ?? WORKFLOW_AI_PACK_RELATIVE_PATH
	const rawOverride = options.overrideAssetsRoot?.trim() ?? ""

	let selectedSource: "embedded" | "override" = "embedded"
	let selectedAssetsRoot = embeddedAssetsRoot

	if (rawOverride) {
		const overrideLooksAbsolute = rawOverride.startsWith("~") || path.isAbsolute(rawOverride)
		if (!overrideLooksAbsolute) {
			logMessage(
				options.log,
				`Override assets root rejected (path must be absolute): ${rawOverride}. Falling back to embedded.`,
			)
		} else {
			const normalizedOverride = normalizeOverridePath(rawOverride)
			const validation = await isValidWorkflowAiAssetsRoot(normalizedOverride)
			if (validation.ok) {
				selectedSource = "override"
				selectedAssetsRoot = normalizedOverride
				logMessage(options.log, `Using override assets root: ${selectedAssetsRoot}`)
			} else {
				logMessage(
					options.log,
					`Override assets root rejected (${validation.reason}): ${rawOverride}. Falling back to embedded.`,
				)
			}
		}
	}

	if (selectedSource === "embedded") {
		logMessage(options.log, `Using embedded assets root: ${selectedAssetsRoot}`)
	}

	const previousState = parsePreviousInstallStateAny(options.context.globalState.get(WORKFLOW_AI_STATE_KEY))
	const normalizedOverridePath = selectedSource === "override" ? selectedAssetsRoot : undefined
	const globalKiloDir = options.globalKiloDir ?? path.join(os.homedir(), ".kilocode")

	const packFingerprint = await getPackFingerprint(selectedAssetsRoot, options.log)
	logMessage(
		options.log,
		`Pack fingerprint: ${packFingerprint.fingerprint} (${packFingerprint.fromManifest ? "manifest" : "computed"})`,
	)

	let previousSource: "embedded" | "override" | undefined
	let previousOverridePath: string | undefined
	if (previousState.kind === "v2") {
		previousSource = previousState.state.source
		previousOverridePath = previousState.state.overridePath
	}

	const selectionChanged =
		previousSource !== selectedSource ||
		(selectedSource === "override" && previousOverridePath !== normalizedOverridePath)

	const shouldSkip =
		previousState.kind === "v2" &&
		!selectionChanged &&
		previousState.state.fingerprint === packFingerprint.fingerprint

	if (shouldSkip) {
		return { didInstall: false, selectedSource, selectedAssetsRoot }
	}

	const previousId =
		previousState.kind === "v2"
			? previousState.state.fingerprint
			: previousState.kind === "v1"
				? `version-${previousState.state.version}`
				: previousState.kind === "legacy-version"
					? `version-${previousState.version}`
					: "untracked"

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const backupRoot = path.join(globalKiloDir, WORKFLOW_AI_BACKUPS_RELATIVE_DIR, timestamp, previousId)

	const result = await syncWorkflowAiAssets({
		assetsRoot: selectedAssetsRoot,
		globalKiloDir,
		customModesFilePaths: options.customModesFilePaths,
		backupRoot,
		log: options.log,
	})

	if (result.errors.length === 0) {
		const nextState: WorkflowAiAssetsInstallStateV2 = {
			fingerprint: packFingerprint.fingerprint,
			algorithm: "sha256",
			source: selectedSource,
			...(selectedSource === "override" ? { overridePath: selectedAssetsRoot } : {}),
		}

		await options.context.globalState.update(WORKFLOW_AI_STATE_KEY, nextState)
	}

	return { didInstall: true, selectedSource, selectedAssetsRoot, result }
}
