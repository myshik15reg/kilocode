import type { ExtensionChatMessage } from "../../../types/messages.js"

/**
 * Base props for all message components
 */
export interface MessageComponentProps {
	message: ExtensionChatMessage
}

/**
 * Props for tool-based message components
 */
export interface ToolMessageProps extends MessageComponentProps {
	toolData: ToolData
}

/**
 * Parsed tool data structure
 */
export interface ToolData {
	tool: string
	path?: string
	content?: string
	diff?: string
	reason?: string
	isProtected?: boolean
	isOutsideWorkspace?: boolean
	batchFiles?: Array<{ path: string }>
	batchDiffs?: Array<any>
	lineNumber?: number
	regex?: string
	filePattern?: string
	query?: string
	todos?: Array<TodoItem>
	mode?: string
	command?: string
	args?: string
	description?: string
	source?: string
	additionalFileCount?: number
	fastApplyResult?: any
}

/**
 * Todo item structure
 */
export interface TodoItem {
	id: string
	content: string
	status: "pending" | "in_progress" | "completed"
}

/**
 * MCP server data structure
 */
export interface McpServerData {
	type: "use_mcp_tool" | "access_mcp_resource"
	serverName: string
	toolName?: string
	arguments?: string
	uri?: string
	response?: any
}

/**
 * Follow-up data structure
 */
export interface FollowUpData {
	question: string
	suggest?: Array<{
		answer: string
		mode?: string
	}>
}

/**
 * API request info structure
 */
export interface ApiReqInfo {
	cost?: number
	usageMissing?: boolean
	cancelReason?: "user_cancelled" | string
	streamingFailedMessage?: string
	request?: string
}

/**
 * Image data structure
 */
export interface ImageData {
	imageUri: string
	imagePath: string
}

/**
 * Codebase search result structure
 */
export interface CodebaseSearchResult {
	file: string
	line: number
	content: string
	score: number
}
