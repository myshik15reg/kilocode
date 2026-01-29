// kilocode_change - new file
import * as fs from "fs/promises"
import * as path from "path"

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

			return `## Project Context (Memory Bank)
[MB: NEW PROJECT] - ${reason}

Initialize with: /init-memory-bank
`
		}

		const truncated = context.length > maxLength
		const content = truncated ? context.slice(0, maxLength) : context

		return `## Project Context (from .kilocode/memory-bank/context.md)
${content}${truncated ? "\n...[truncated - read full file for details]" : ""}

[MB: OK] - Memory Bank loaded
`
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
