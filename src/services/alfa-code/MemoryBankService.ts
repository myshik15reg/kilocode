// kilocode_change - new file
import * as fs from "fs/promises"
import * as path from "path"

import { getGlobalRooDirectory } from "../roo-config" // kilocode_change

export interface EnsureMemoryBankInitializedOptions {
	projectRoot: string
	/**
	 * Absolute path to global Kilo directory (usually `getGlobalRooDirectory()`).
	 * Exposed mainly for unit tests.
	 */
	globalKiloDir?: string
	/** Optional logger for a single warning in case of write failures (e.g. read-only workspace). */
	log?: (message: string) => void
}

export interface EnsureMemoryBankInitializedResult {
	didInitialize: boolean
	copiedFiles: number
	skippedFiles: number
	/** True when the template directory is missing; initialization is skipped. */
	templateMissing: boolean
}

const MEMORY_BANK_TEMPLATE_FILES = [
	"index.md",
	"brief.md",
	"product.md",
	"architecture.md",
	"tech.md",
	"context.md",
	"examples/example.md",
] as const

async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(filePath)
		return stat.isFile()
	} catch (error: any) {
		if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
			return false
		}
		throw error
	}
}

async function directoryExists(dirPath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(dirPath)
		return stat.isDirectory()
	} catch (error: any) {
		if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
			return false
		}
		throw error
	}
}

function isLikelyReadOnlyOrPermissionError(error: unknown): boolean {
	const code = (error as any)?.code
	return code === "EACCES" || code === "EPERM" || code === "EROFS"
}

/**
 * Ensures `.kilocode/memory-bank/` exists for the project.
 *
 * Behavior:
 * - If `.kilocode/memory-bank/index.md` exists: no-op.
 * - Else, attempts to copy missing memory bank template files from:
 *   `<globalKiloDir>/workflowai/templates/memory-bank/`
 * - Never overwrites existing files.
 * - Never throws (best-effort); logs at most one warning on write failures.
 */
export async function ensureMemoryBankInitialized(
	options: EnsureMemoryBankInitializedOptions,
): Promise<EnsureMemoryBankInitializedResult> {
	const projectRoot = options.projectRoot
	const globalKiloDir = options.globalKiloDir ?? getGlobalRooDirectory()
	const log = options.log

	const memoryBankDir = path.join(projectRoot, ".kilocode", "memory-bank")
	const indexPath = path.join(memoryBankDir, "index.md")

	try {
		if (await fileExists(indexPath)) {
			return { didInitialize: false, copiedFiles: 0, skippedFiles: 0, templateMissing: false }
		}
	} catch (error) {
		// If we can't even stat the index due to permissions, avoid attempting writes.
		if (log && isLikelyReadOnlyOrPermissionError(error)) {
			log(
				`[WorkFlowAI][MemoryBank] Workspace is not writable; skipping Memory Bank initialization: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}
		return { didInitialize: false, copiedFiles: 0, skippedFiles: 0, templateMissing: false }
	}

	const templateDir = path.join(globalKiloDir, "workflowai", "templates", "memory-bank")
	try {
		if (!(await directoryExists(templateDir))) {
			// Template missing => silently skip (DoD)
			return { didInitialize: false, copiedFiles: 0, skippedFiles: 0, templateMissing: true }
		}
	} catch {
		// Treat as template missing; stay silent.
		return { didInitialize: false, copiedFiles: 0, skippedFiles: 0, templateMissing: true }
	}

	let warned = false
	const warnOnce = (message: string) => {
		if (warned) return
		warned = true
		log?.(message)
	}

	try {
		await fs.mkdir(memoryBankDir, { recursive: true })
	} catch (error) {
		if (isLikelyReadOnlyOrPermissionError(error)) {
			warnOnce(
				`[WorkFlowAI][MemoryBank] Failed to create ${memoryBankDir} (read-only or no permissions). Continuing without Memory Bank.`,
			)
		}
		return { didInitialize: false, copiedFiles: 0, skippedFiles: 0, templateMissing: false }
	}

	let copiedFiles = 0
	let skippedFiles = 0

	for (const filename of MEMORY_BANK_TEMPLATE_FILES) {
		const src = path.join(templateDir, filename)
		const dest = path.join(memoryBankDir, filename)

		try {
			if (await fileExists(dest)) {
				skippedFiles += 1
				continue
			}

			// If a template file is missing, skip it quietly.
			if (!(await fileExists(src))) {
				continue
			}

			await fs.copyFile(src, dest)
			copiedFiles += 1
		} catch (error) {
			if (isLikelyReadOnlyOrPermissionError(error)) {
				warnOnce(
					`[WorkFlowAI][MemoryBank] Failed to write Memory Bank files into the workspace (read-only or no permissions). Continuing without Memory Bank.`,
				)
			}
			return { didInitialize: false, copiedFiles, skippedFiles, templateMissing: false }
		}
	}

	return { didInitialize: copiedFiles > 0, copiedFiles, skippedFiles, templateMissing: false }
}

/**
 * Memory Bank Service for AlfaCode WorkFlowAI integration.
 * Provides access to project context stored in .kilocode/memory-bank/
 *
 * Memory Bank is the "Single Source of Truth" for project context.
 * Files:
 * - index.md - Navigation and metadata
 * - brief.md - Project goals, constraints, Definition of Done
 * - product.md - User personas, UX flows
 * - architecture.md - System design, decisions
 * - tech.md - Technology stack, tools
 * - context.md - Current focus, risks, next steps (most frequently updated)
 */
export class MemoryBankService {
	private cwd: string

	constructor(cwd: string) {
		this.cwd = cwd
	}

	/**
	 * Get the path to the memory-bank directory
	 */
	private get memoryBankPath(): string {
		return path.join(this.cwd, ".kilocode", "memory-bank")
	}

	/**
	 * Check if Memory Bank exists for this project
	 */
	async exists(): Promise<boolean> {
		try {
			await fs.access(this.memoryBankPath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Read a specific Memory Bank file
	 */
	async readFile(filename: string): Promise<string | null> {
		try {
			const filePath = path.join(this.memoryBankPath, filename)
			return await fs.readFile(filePath, "utf-8")
		} catch {
			return null
		}
	}

	/**
	 * Get context.md content (current focus, risks, next steps)
	 * This is the primary file for quick context loading
	 */
	async getContext(): Promise<string | null> {
		return this.readFile("context.md")
	}

	/**
	 * Get brief.md content (goals, constraints, DoD)
	 */
	async getBrief(): Promise<string | null> {
		return this.readFile("brief.md")
	}

	/**
	 * Get index.md content (navigation and metadata)
	 */
	async getIndex(): Promise<string | null> {
		return this.readFile("index.md")
	}

	/**
	 * Get Quick Context for system prompt (Level 1).
	 * Only loads context.md with truncation for efficiency.
	 *
	 * @param maxLength Maximum length of context to include (default 2000 chars)
	 */
	async getQuickContext(maxLength: number = 2000): Promise<string | null> {
		const context = await this.getContext()
		if (!context) {
			const exists = await this.exists()
			const reason = exists
				? "Memory Bank directory exists, but context.md is missing."
				: "No Memory Bank found for this workspace."

			// FIX: slash-commands-sync (TestAnalyzer)
			// Root cause: system prompt snapshots no longer included an init hint; runtime still printed a stale "Initialize with" line.

			// FIX: slash-commands-sync (TestAnalyzer)
			// Root cause: trailing newline caused an extra blank line before the next prompt section (system prompt snapshots are pinned).
			return `## Project Context (Memory Bank)
[MB: NEW PROJECT] - ${reason}`
		}

		const truncated = context.length > maxLength
		const content = truncated ? context.slice(0, maxLength) : context

		// FIX: third-party-skills (TestAnalyzer)
		// Root cause: trailing newline caused an extra blank line before the next prompt section (snapshots are pinned).
		return `## Project Context (from .kilocode/memory-bank/context.md)
${content}${truncated ? "\n...[truncated - read full file for details]" : ""}

[MB: OK] - Memory Bank loaded`
	}

	/**
	 * Get Standard Context for system prompt (Level 2).
	 * Loads context.md + brief.md for more complete picture.
	 *
	 * @param maxLength Maximum length per file (default 1500 chars each)
	 */
	async getStandardContext(maxLength: number = 1500): Promise<string | null> {
		const [context, brief] = await Promise.all([this.getContext(), this.getBrief()])

		if (!context && !brief) {
			return null
		}

		const parts: string[] = []

		if (brief) {
			const truncated = brief.length > maxLength
			parts.push(`### Project Brief (brief.md)
${truncated ? brief.slice(0, maxLength) + "\n...[truncated]" : brief}`)
		}

		if (context) {
			const truncated = context.length > maxLength
			parts.push(`### Current Context (context.md)
${truncated ? context.slice(0, maxLength) + "\n...[truncated]" : context}`)
		}

		return `## Project Memory Bank

${parts.join("\n\n")}

[MB: OK] - Memory Bank loaded
`
	}

	/**
	 * List all files in Memory Bank
	 */
	async listFiles(): Promise<string[]> {
		try {
			const entries = await fs.readdir(this.memoryBankPath)
			return entries.filter((f) => f.endsWith(".md"))
		} catch {
			return []
		}
	}
}
