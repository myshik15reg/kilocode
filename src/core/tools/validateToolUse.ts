import type { ToolName, ModeConfig, ExperimentId, GroupOptions, GroupEntry } from "@roo-code/types"
import { toolNames as validToolNames } from "@roo-code/types"
import { customToolRegistry } from "@roo-code/core"

import { type Mode, FileRestrictionError, getModeBySlug, getGroupName } from "../../shared/modes"
import { EXPERIMENT_IDS } from "../../shared/experiments"
import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from "../../shared/tools"

/**
 * Checks if a tool name is a valid, known tool.
 * Note: This does NOT check if the tool is allowed for a specific mode,
 * only that the tool actually exists.
 */
export function isValidToolName(toolName: string, experiments?: Record<string, boolean>): toolName is ToolName {
	// Check if it's a valid static tool
	if ((validToolNames as readonly string[]).includes(toolName)) {
		return true
	}

	if (experiments?.customTools && customToolRegistry.has(toolName)) {
		return true
	}

	// Check if it's a dynamic MCP tool (mcp_serverName_toolName format).
	if (toolName.startsWith("mcp_")) {
		return true
	}

	return false
}

export function validateToolUse(
	toolName: ToolName,
	mode: Mode,
	customModes?: ModeConfig[],
	toolRequirements?: Record<string, boolean>,
	toolParams?: Record<string, unknown>,
	experiments?: Record<string, boolean>,
	includedTools?: string[],
): void {
	// First, check if the tool name is actually a valid/known tool
	// This catches completely invalid tool names like "edit_file" that don't exist
	if (!isValidToolName(toolName, experiments)) {
		throw new Error(
			`Unknown tool "${toolName}". This tool does not exist. Please use one of the available tools: ${validToolNames.join(", ")}.`,
		)
	}

	// Then check if the tool is allowed for the current mode
	if (
		!isToolAllowedForMode(
			toolName,
			mode,
			customModes ?? [],
			toolRequirements,
			toolParams,
			experiments,
			includedTools,
		)
	) {
		throw new Error(`Tool "${toolName}" is not allowed in ${mode} mode.`)
	}

	// FIX: codebase_search-missing-query (TestAnalyzer)
	// Root cause: codebase_search required params were not validated at tool-call validation layer, allowing `{}` through and triggering retry loops
	if (toolName === "codebase_search") {
		const query = toolParams?.query
		if (typeof query !== "string" || query.trim() === "") {
			throw new Error(
				'Invalid arguments for codebase_search: missing or empty required parameter "query". Do NOT retry with {}. Retry with JSON arguments like: { "query": "<what you need to find>", "path": null }. If you do not know what to search for, ask the user a clarifying question instead of calling codebase_search with an empty query.',
			)
		}
	}

	if (toolName === "web_search") {
		const query = toolParams?.query
		if (typeof query !== "string" || query.trim() === "") {
			throw new Error(
				'Invalid arguments for web_search: missing or empty required parameter "query". Do NOT retry with {}. Retry with JSON arguments like: { "query": "latest MCP HTTP/2 guidance" }. If you do not know what to search for, ask the user a clarifying question instead of calling web_search with an empty query.',
			)
		}
	}

	if (toolName === "read_file") {
		const legacyPath = toolParams?.path
		const nativeFiles = toolParams?.files
		const hasLegacyPath = typeof legacyPath === "string" && legacyPath.trim() !== ""
		// kilocode_change start
		const hasValidNativeFiles =
			Array.isArray(nativeFiles) &&
			nativeFiles.length > 0 &&
			nativeFiles.every((file) => {
				if (!file || typeof file !== "object") {
					return false
				}

				const filePath = (file as Record<string, unknown>).path
				return typeof filePath === "string" && filePath.trim() !== ""
			})
		// kilocode_change end

		if (!hasLegacyPath && !hasValidNativeFiles) {
			throw new Error(
				'Invalid arguments for read_file: provide either a non-empty legacy "path" or a non-empty "files" array with string "path" entries. Do NOT retry with {}.',
			)
		}
	}

	if (toolName === "search_files") {
		const filePath = toolParams?.path
		const regex = toolParams?.regex
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for search_files: missing or empty required parameter "path". Do NOT retry with {}. Retry with JSON arguments like: { "path": ".", "regex": "TODO", "file_pattern": "*.ts" }.',
			)
		}
		if (typeof regex !== "string" || regex.trim() === "") {
			throw new Error(
				'Invalid arguments for search_files: missing or empty required parameter "regex". Do NOT retry with malformed arguments.',
			)
		}
	}

	if (toolName === "list_files") {
		const filePath = toolParams?.path
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for list_files: missing or empty required parameter "path". Do NOT retry with {}. Retry with JSON arguments like: { "path": ".", "recursive": false }.',
			)
		}
	}

	if (toolName === "search_and_replace") {
		const filePath = toolParams?.path
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for search_and_replace: missing or empty required parameter "path". Do NOT retry with {}. Retry with JSON arguments like: { "path": "src/file.ts", "operations": [{ "search": "old", "replace": "new" }] }.',
			)
		}

		const operations = toolParams?.operations
		if (!Array.isArray(operations) || operations.length === 0) {
			throw new Error(
				'Invalid arguments for search_and_replace: missing or empty required parameter "operations". Do NOT retry with {}. Retry with JSON arguments like: { "path": "src/file.ts", "operations": [{ "search": "old", "replace": "new" }] }.',
			)
		}

		const hasInvalidOperation = operations.some((operation) => {
			if (!operation || typeof operation !== "object") {
				return true
			}

			const search = (operation as Record<string, unknown>).search
			const replace = (operation as Record<string, unknown>).replace
			return typeof search !== "string" || search.trim() === "" || typeof replace !== "string"
		})

		if (hasInvalidOperation) {
			throw new Error(
				'Invalid arguments for search_and_replace: every operation must include a non-empty string "search" and a string "replace". Do NOT retry with malformed operations.',
			)
		}
	}

	if (toolName === "search_replace") {
		const filePath = toolParams?.file_path
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for search_replace: missing or empty required parameter "file_path". Do NOT retry with {}. Retry with JSON arguments like: { "file_path": "src/file.ts", "old_string": "old", "new_string": "new" }.',
			)
		}

		const oldString = toolParams?.old_string
		const newString = toolParams?.new_string
		if (typeof oldString !== "string" || oldString.trim() === "") {
			throw new Error(
				'Invalid arguments for search_replace: missing or empty required parameter "old_string". Do NOT retry with malformed arguments.',
			)
		}
		if (typeof newString !== "string") {
			throw new Error(
				'Invalid arguments for search_replace: missing required parameter "new_string". Do NOT retry with malformed arguments.',
			)
		}
	}

	if (toolName === "edit_file") {
		const filePath = toolParams?.file_path
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for edit_file: missing or empty required parameter "file_path". Do NOT retry with {}. Retry with JSON arguments like: { "file_path": "src/file.ts", "old_string": "old", "new_string": "new" }.',
			)
		}

		const oldString = toolParams?.old_string
		const newString = toolParams?.new_string
		if (typeof oldString !== "string") {
			throw new Error(
				'Invalid arguments for edit_file: missing required parameter "old_string". Use an empty string only when intentionally creating a new file.',
			)
		}
		if (typeof newString !== "string") {
			throw new Error(
				'Invalid arguments for edit_file: missing required parameter "new_string". Use an empty string only when intentionally deleting matched content.',
			)
		}
	}

	if (toolName === "fetch_instructions") {
		const taskParam = toolParams?.task
		if (typeof taskParam !== "string" || taskParam.trim() === "") {
			throw new Error(
				'Invalid arguments for fetch_instructions: missing or empty required parameter "task". Do NOT retry with {}.',
			)
		}
	}

	if (toolName === "run_slash_command") {
		const command = toolParams?.command
		if (typeof command !== "string" || command.trim() === "") {
			throw new Error(
				'Invalid arguments for run_slash_command: missing or empty required parameter "command". Do NOT retry with {}.',
			)
		}
	}

	if (toolName === "generate_image") {
		const prompt = toolParams?.prompt
		const filePath = toolParams?.path
		if (typeof prompt !== "string" || prompt.trim() === "") {
			throw new Error(
				'Invalid arguments for generate_image: missing or empty required parameter "prompt". Do NOT retry with {}.',
			)
		}
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for generate_image: missing or empty required parameter "path". Do NOT retry with malformed output path arguments.',
			)
		}
	}

	if (toolName === "access_mcp_resource") {
		const serverName = toolParams?.server_name
		const uri = toolParams?.uri
		if (typeof serverName !== "string" || serverName.trim() === "") {
			throw new Error(
				'Invalid arguments for access_mcp_resource: missing or empty required parameter "server_name". Do NOT retry with {}.',
			)
		}
		if (typeof uri !== "string" || uri.trim() === "") {
			throw new Error(
				'Invalid arguments for access_mcp_resource: missing or empty required parameter "uri". Do NOT retry with malformed MCP resource requests.',
			)
		}
	}

	if (toolName === "use_mcp_tool") {
		const serverName = toolParams?.server_name
		const toolNameParam = toolParams?.tool_name
		const args = toolParams?.arguments
		if (typeof serverName !== "string" || serverName.trim() === "") {
			throw new Error(
				'Invalid arguments for use_mcp_tool: missing or empty required parameter "server_name". Do NOT retry with {}.',
			)
		}
		if (typeof toolNameParam !== "string" || toolNameParam.trim() === "") {
			throw new Error(
				'Invalid arguments for use_mcp_tool: missing or empty required parameter "tool_name". Do NOT retry with malformed MCP tool requests.',
			)
		}
		if (
			args !== undefined &&
			typeof args !== "string" &&
			(typeof args !== "object" || args === null || Array.isArray(args))
		) {
			throw new Error(
				'Invalid arguments for use_mcp_tool: optional parameter "arguments" must be a JSON object or JSON string payload.',
			)
		}
	}

	if (toolName === "new_task") {
		const mode = toolParams?.mode
		const message = toolParams?.message
		if (typeof mode !== "string" || mode.trim() === "") {
			throw new Error(
				'Invalid arguments for new_task: missing or empty required parameter "mode". Do NOT retry with {}.',
			)
		}
		if (typeof message !== "string" || message.trim() === "") {
			throw new Error(
				'Invalid arguments for new_task: missing or empty required parameter "message". Do NOT retry with malformed handoff content.',
			)
		}
	}

	if (toolName === "switch_mode") {
		const modeSlug = toolParams?.mode_slug
		const reason = toolParams?.reason
		if (typeof modeSlug !== "string" || modeSlug.trim() === "") {
			throw new Error(
				'Invalid arguments for switch_mode: missing or empty required parameter "mode_slug". Do NOT retry with {}.',
			)
		}
		if (typeof reason !== "string" || reason.trim() === "") {
			throw new Error(
				'Invalid arguments for switch_mode: missing or empty required parameter "reason". Do NOT retry with an empty mode-switch justification.',
			)
		}
	}

	if (toolName === "attempt_completion") {
		const result = toolParams?.result
		if (typeof result !== "string" || result.trim() === "") {
			throw new Error(
				'Invalid arguments for attempt_completion: missing or empty required parameter "result". Do NOT retry with {} or an empty completion message.',
			)
		}
	}

	if (toolName === "ask_followup_question") {
		const question = toolParams?.question
		const followUp = toolParams?.follow_up
		if (typeof question !== "string" || question.trim() === "") {
			throw new Error(
				'Invalid arguments for ask_followup_question: missing or empty required parameter "question". Do NOT retry with {}.',
			)
		}
		if (!Array.isArray(followUp) || followUp.length === 0) {
			throw new Error(
				'Invalid arguments for ask_followup_question: missing or empty required parameter "follow_up". Provide 1-4 suggested answers.',
			)
		}
		const hasInvalidSuggestion = followUp.some((item) => {
			if (!item || typeof item !== "object") {
				return true
			}
			const text = (item as Record<string, unknown>).text
			const mode = (item as Record<string, unknown>).mode
			return (
				typeof text !== "string" ||
				text.trim() === "" ||
				(mode !== undefined && mode !== null && typeof mode !== "string")
			)
		})
		if (hasInvalidSuggestion) {
			throw new Error(
				'Invalid arguments for ask_followup_question: each follow_up item must include a non-empty string "text" and optional string/null "mode".',
			)
		}
	}

	if (toolName === "execute_command") {
		const command = toolParams?.command
		if (typeof command !== "string" || command.trim() === "") {
			throw new Error(
				'Invalid arguments for execute_command: missing or empty required parameter "command". Do NOT retry with {}. Retry with JSON arguments like: { "command": "pnpm test", "cwd": "src" }.',
			)
		}
	}

	if (toolName === "apply_patch") {
		const patch = toolParams?.patch
		if (typeof patch !== "string" || patch.trim() === "") {
			throw new Error(
				'Invalid arguments for apply_patch: missing or empty required parameter "patch". Do NOT retry with {}. Retry with a non-empty Codex-style patch payload.',
			)
		}
	}

	// kilocode_change start
	if (toolName === "apply_diff") {
		const filePath = toolParams?.path
		const diff = toolParams?.diff
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for apply_diff: missing or empty required parameter "path". Do NOT retry with {}. Retry with JSON arguments like: { "path": "src/file.ts", "diff": "..." }.',
			)
		}
		if (typeof diff !== "string" || diff.trim() === "") {
			throw new Error(
				'Invalid arguments for apply_diff: missing or empty required parameter "diff". Do NOT retry with malformed arguments.',
			)
		}
	}

	if (toolName === "write_to_file") {
		const filePath = toolParams?.path
		const content = toolParams?.content
		if (typeof filePath !== "string" || filePath.trim() === "") {
			throw new Error(
				'Invalid arguments for write_to_file: missing or empty required parameter "path". Do NOT retry with {}. Retry with JSON arguments like: { "path": "src/file.ts", "content": "..." }.',
			)
		}
		if (typeof content !== "string") {
			throw new Error(
				'Invalid arguments for write_to_file: missing required parameter "content". Do NOT retry with malformed arguments.',
			)
		}
	}
	// kilocode_change end
}

const EDIT_OPERATION_PARAMS = ["diff", "content", "operations", "search", "replace", "args", "line"] as const

function getGroupOptions(group: GroupEntry): GroupOptions | undefined {
	return Array.isArray(group) ? group[1] : undefined
}

function doesFileMatchRegex(filePath: string, pattern: string): boolean {
	try {
		const regex = new RegExp(pattern)
		return regex.test(filePath)
	} catch (error) {
		console.error(`Invalid regex pattern: ${pattern}`, error)
		return false
	}
}

export function isToolAllowedForMode(
	tool: string,
	modeSlug: string,
	customModes: ModeConfig[],
	toolRequirements?: Record<string, boolean>,
	toolParams?: Record<string, any>, // All tool parameters
	experiments?: Record<string, boolean>,
	includedTools?: string[], // Opt-in tools explicitly included (e.g., from modelInfo)
): boolean {
	// Always allow these tools
	if (ALWAYS_AVAILABLE_TOOLS.includes(tool as any)) {
		return true
	}

	// For now, allow all custom tools in any mode.
	// As a follow-up we should expand the custom tool definition to include mode restrictions.
	if (experiments?.customTools && customToolRegistry.has(tool)) {
		return true
	}

	// Check if this is a dynamic MCP tool (mcp_serverName_toolName)
	// These should be allowed if the mcp group is allowed for the mode
	const isDynamicMcpTool = tool.startsWith("mcp_")

	if (experiments && Object.values(EXPERIMENT_IDS).includes(tool as ExperimentId)) {
		if (!experiments[tool]) {
			return false
		}
	}

	// Check tool requirements if any exist
	if (toolRequirements && typeof toolRequirements === "object") {
		if (tool in toolRequirements && !toolRequirements[tool]) {
			return false
		}
	} else if (toolRequirements === false) {
		// If toolRequirements is a boolean false, all tools are disabled
		return false
	}

	const mode = getModeBySlug(modeSlug, customModes)

	if (!mode) {
		return false
	}

	// Check if tool is in any of the mode's groups and respects any group options
	for (const group of mode.groups) {
		const groupName = getGroupName(group)
		const options = getGroupOptions(group)

		const groupConfig = TOOL_GROUPS[groupName]

		// Check if this is a dynamic MCP tool and the mcp group is allowed
		if (isDynamicMcpTool && groupName === "mcp") {
			// Dynamic MCP tools are allowed if the mcp group is in the mode's groups
			return true
		}

		// Check if the tool is in the group's regular tools
		const isRegularTool = groupConfig.tools.includes(tool)

		// Check if the tool is a custom tool that has been explicitly included
		const isCustomTool = groupConfig.customTools?.includes(tool) && includedTools?.includes(tool)

		// If the tool isn't in regular tools and isn't an included custom tool, continue to next group
		if (!isRegularTool && !isCustomTool) {
			continue
		}

		// If there are no options, allow the tool
		if (!options) {
			return true
		}

		// For the edit group, check file regex if specified
		if (groupName === "edit" && options.fileRegex) {
			// kilocode_change: support multiple edit tool param names
			const filePath = toolParams?.path ?? toolParams?.target_file ?? toolParams?.file_path
			// Check if this is an actual edit operation (not just path-only for streaming)
			const isEditOperation = EDIT_OPERATION_PARAMS.some((param) => toolParams?.[param])

			// Handle single file path validation
			if (filePath && isEditOperation && !doesFileMatchRegex(filePath, options.fileRegex)) {
				throw new FileRestrictionError(mode.name, options.fileRegex, options.description, filePath, tool)
			}

			// Handle XML args parameter (used by MULTI_FILE_APPLY_DIFF experiment)
			if (toolParams?.args && typeof toolParams.args === "string") {
				// Extract file paths from XML args with improved validation
				try {
					const filePathMatches = toolParams.args.match(/<path>([^<]+)<\/path>/g)
					if (filePathMatches) {
						for (const match of filePathMatches) {
							// More robust path extraction with validation
							const pathMatch = match.match(/<path>([^<]+)<\/path>/)
							if (pathMatch && pathMatch[1]) {
								const extractedPath = pathMatch[1].trim()
								// Validate that the path is not empty and doesn't contain invalid characters
								if (extractedPath && !extractedPath.includes("<") && !extractedPath.includes(">")) {
									if (!doesFileMatchRegex(extractedPath, options.fileRegex)) {
										throw new FileRestrictionError(
											mode.name,
											options.fileRegex,
											options.description,
											extractedPath,
											tool,
										)
									}
								}
							}
						}
					}
				} catch (error) {
					// Re-throw FileRestrictionError as it's an expected validation error
					if (error instanceof FileRestrictionError) {
						throw error
					}
					// If XML parsing fails, log the error but don't block the operation
					console.warn(`Failed to parse XML args for file restriction validation: ${error}`)
				}
			}
		}

		return true
	}

	return false
}
