import { Anthropic } from "@anthropic-ai/sdk"

import type { ModelInfo } from "@roo-code/types"

import type { ApiHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { ApiStream } from "../transform/stream"
import { countTokens } from "../../utils/countTokens"
import { isMcpTool } from "../../utils/mcp-name"

import { normalizeObjectAdditionalPropertiesFalse } from "./kilocode/openai-strict-schema" // kilocode_change

/**
 * Base class for API providers that implements common functionality.
 */
export abstract class BaseProvider implements ApiHandler {
	abstract createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream

	abstract getModel(): { id: string; info: ModelInfo }

	/**
	 * Converts an array of tools to be compatible with OpenAI's strict mode.
	 * Filters for function tools, applies schema conversion to their parameters,
	 * and ensures all tools have consistent strict: true values.
	 */
	protected convertToolsForOpenAI(tools: any[] | undefined): any[] | undefined {
		if (!tools) {
			return undefined
		}

		return tools.map((tool) => {
			if (tool.type !== "function") {
				return tool
			}

			// MCP tools use the 'mcp--' prefix - disable strict mode for them
			// to preserve optional parameters from the MCP server schema
			const isMcp = isMcpTool(tool.function.name)

			return {
				...tool,
				function: {
					...tool.function,
					strict: !isMcp,
					parameters: isMcp
						? tool.function.parameters
						: this.convertToolSchemaForOpenAI(tool.function.parameters),
				},
			}
		})
	}

	/**
	 * Converts tool schemas to be compatible with OpenAI's strict mode by:
	 * - Ensuring all object properties are listed in required arrays
	 * - Adding additionalProperties: false to all object schemas
	 * - Recursively processing nested properties, items, and composition keywords
	 */
	protected convertToolSchemaForOpenAI(schema: any): any {
		const convertSchemaNode = (node: any): any => {
			if (!node || typeof node !== "object") {
				return node
			}

			if (Array.isArray(node)) {
				return node.map((item) => convertSchemaNode(item))
			}

			const result = { ...node }

			for (const key of ["anyOf", "oneOf", "allOf"] as const) {
				if (Array.isArray(result[key])) {
					result[key] = result[key].map((item: any) => convertSchemaNode(item))
				}
			}

			if (result.items !== undefined) {
				result.items = convertSchemaNode(result.items)
			}

			if (result.properties && typeof result.properties === "object") {
				const nextProps = { ...result.properties }
				for (const [propKey, propSchema] of Object.entries(nextProps)) {
					nextProps[propKey] = convertSchemaNode(propSchema)
				}
				result.properties = nextProps

				// OpenAI strict mode requires all declared properties to be listed in required.
				result.required = Object.keys(nextProps)
			}

			const isObjectSchema =
				result.type === "object" ||
				(Array.isArray(result.type) && result.type.includes("object")) ||
				(result.properties && typeof result.properties === "object")

			if (isObjectSchema && result.additionalProperties !== false) {
				result.additionalProperties = false
			}

			return normalizeObjectAdditionalPropertiesFalse(result)
		}

		return convertSchemaNode(schema)
	}

	/**
	 * Default token counting implementation using tiktoken.
	 * Providers can override this to use their native token counting endpoints.
	 *
	 * @param content The content to count tokens for
	 * @returns A promise resolving to the token count
	 */
	async countTokens(content: Anthropic.Messages.ContentBlockParam[]): Promise<number> {
		if (content.length === 0) {
			return 0
		}

		return countTokens(content, { useWorker: true })
	}
}
