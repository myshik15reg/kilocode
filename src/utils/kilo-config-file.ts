// kilocode_change - new file
import * as vscode from "vscode"
import * as path from "path"
import { promises as fs } from "fs"
import z from "zod"

export type KilocodeConfigProject = z.infer<typeof KilocodeConfigProject>
export const KilocodeConfigProject = z.object({
	id: z.string(),
})
export type KilocodeConfig = z.infer<typeof KilocodeConfig>
export const KilocodeConfig = z.object({
	project: KilocodeConfigProject.optional(),
})

/**
 * Normalizes a project identifier for consistent tracking.
 * If the project is a git repository URL, extracts the repository name.
 * Otherwise, returns the project ID as-is.
 *
 * @param projectId - The project identifier (could be a URL or plain string)
 * @returns The normalized project ID
 *
 * @example
 * normalizeProjectId('https://github.com/Kilo-Org/handbook.git') // returns 'handbook'
 * normalizeProjectId('git@github.com:Kilo-Org/handbook.git') // returns 'handbook'
 * normalizeProjectId('my-project') // returns 'my-project'
 * normalizeProjectId(undefined) // returns undefined
 */
export function normalizeProjectId(projectId?: KilocodeConfigProject["id"]): string | undefined {
	if (!projectId) {
		return undefined
	}

	// Check if it looks like a git URL (https or ssh)
	const httpsGitPattern = /^https?:\/\/.+\.git$/i
	const sshGitPattern = /^git@.+\.git$/i

	if (httpsGitPattern.test(projectId) || sshGitPattern.test(projectId)) {
		// Extract the last path component and remove .git extension
		const parts = projectId.split("/")
		const lastPart = parts[parts.length - 1]
		return lastPart.replace(/\.git$/i, "")
	}

	// If it's not a git URL, return as-is
	return projectId
}

export async function getKilocodeConfig(
	workspaceRoot: string,
	gitRepositoryUrl?: string,
): Promise<KilocodeConfig | null> {
	console.log("getKilocodeConfig", workspaceRoot, gitRepositoryUrl)

	const config = await getKilocodeConfigFile(workspaceRoot)

	if (!config?.project?.id) {
		const id = normalizeProjectId(gitRepositoryUrl)
		return id ? { project: { id } } : null
	}

	const id = normalizeProjectId(config.project.id)
	return id ? { project: { id } } : null
}

/**
 * Reads the project configuration from .kilocode/config.json
 * Note: .kilocode/config.jsonc is not supported to avoid bundling issues
 *
 * @param workspaceRoot The root path of the workspace
 * @returns The project configuration or undefined if not found or invalid
 */
export async function getKilocodeConfigFile(workspaceRoot: string): Promise<KilocodeConfig | null> {
	const configPath = path.join(workspaceRoot, ".kilocode", "config.json")
	try {
		const content = await fs.readFile(configPath, "utf8")
		const config = KilocodeConfig.parse(JSON.parse(content))
		// Return null if project.id is missing or empty
		if (!config.project?.id || config.project.id.trim() === "") {
			return null
		}
		return config
	} catch (error) {
		// File doesn't exist or can't be read
		return null
	}
}

/**
 * Gets the project ID from configuration file or git repository
 * Priority:
 * 1. .kilocode/config.json (project.id) - normalized
 * 2. Git repository URL (origin remote) - normalized to repo name
 * 3. undefined if neither exists
 *
 * @param workspaceRoot The root path of the workspace
 * @param gitRepositoryUrl Optional git repository URL to use as fallback
 * @returns The normalized project ID or undefined
 */
export async function getProjectId(workspaceRoot: string, gitRepositoryUrl?: string): Promise<string | undefined> {
	// First, try to get project ID from config file
	const config = await getKilocodeConfigFile(workspaceRoot)
	if (config?.project?.id) {
		return normalizeProjectId(config.project.id)
	}

	// Fall back to normalized git repository URL
	return normalizeProjectId(gitRepositoryUrl)
}

/**
 * Gets the project ID for the current VSCode workspace
 * Priority:
 * 1. .kilocode/config.json (project.id) - normalized
 * 2. Git repository URL (origin remote) - normalized to repo name
 * 3. undefined if neither exists
 * @returns The normalized project ID or undefined
 */
export async function getWorkspaceProjectId(gitRepositoryUrl?: string): Promise<string | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return undefined
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath
	return await getProjectId(workspaceRoot, gitRepositoryUrl)
}
