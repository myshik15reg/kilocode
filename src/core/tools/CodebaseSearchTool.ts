import * as vscode from "vscode"
import path from "path"

import { ManagedIndexer } from "../../services/code-index/managed/ManagedIndexer"
import { CodeIndexManager } from "../../services/code-index/manager"
import { ArtifactSearchService } from "../../services/code-index/ArtifactSearchService"
import type { CodeIndexStructuredSearchResult, VectorStoreSearchResult } from "../../services/code-index/interfaces"
import type { PushToolResult, ToolUse } from "../../shared/tools"
import { getWorkspacePath } from "../../utils/path"
import { formatResponse } from "../prompts/responses"
import { Task } from "../task/Task"
import { BaseTool, ToolCallbacks } from "./BaseTool"

interface CodebaseSearchParams {
	query: string
	path?: string
}

export class CodebaseSearchTool extends BaseTool<"codebase_search"> {
	readonly name = "codebase_search" as const

	parseLegacy(params: Partial<Record<string, string>>): CodebaseSearchParams {
		let directoryPrefix = params.path
		if (directoryPrefix) {
			directoryPrefix = path.normalize(directoryPrefix)
		}

		return {
			query: params.query || "",
			path: directoryPrefix,
		}
	}

	async execute(params: CodebaseSearchParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { askApproval, handleError, pushToolResult, toolProtocol } = callbacks
		let { query, path: directoryPrefix } = params
		const normalizedQuery = typeof query === "string" ? query.trim() : ""
		const workspacePath = task.cwd && task.cwd.trim() !== "" ? task.cwd : getWorkspacePath()

		if (!workspacePath) {
			await handleError("codebase_search", new Error("Could not determine workspace path."))
			return
		}

		if (!normalizedQuery) {
			task.consecutiveMistakeCount++
			task.didToolFailInCurrentTurn = true
			pushToolResult(
				formatResponse.toolError(
					'Invalid arguments for codebase_search: missing or empty required parameter "query". Do NOT retry with {}. Retry with JSON arguments like: { "query": "<what you need to find>", "path": null }. If you don\'t know what to search for, ask the user a clarifying question instead of calling codebase_search with an empty query.',
					toolProtocol,
				),
			)
			return
		}

		query = normalizedQuery
		if (directoryPrefix && path.isAbsolute(directoryPrefix)) {
			directoryPrefix = path.relative(workspacePath, directoryPrefix)
		}

		const sharedMessageProps = {
			tool: "codebaseSearch",
			query,
			path: directoryPrefix,
			isOutsideWorkspace: false,
		}

		const didApprove = await askApproval("tool", JSON.stringify(sharedMessageProps))
		if (!didApprove) {
			pushToolResult(formatResponse.toolDenied())
			return
		}

		task.consecutiveMistakeCount = 0
		const artifactQuery = ArtifactSearchService.shouldSearchArtifacts(query, directoryPrefix)

		if (!artifactQuery && (await tryManagedSearch(task, pushToolResult, query, directoryPrefix))) {
			return
		}

		try {
			const context = task.providerRef.deref()?.context
			if (!context) {
				throw new Error("Extension context is not available.")
			}

			const manager = CodeIndexManager.getInstance(context)
			if (!manager) {
				throw new Error("CodeIndexManager is not available.")
			}
			if (!artifactQuery && !manager.isFeatureEnabled) {
				throw new Error("Code Indexing is disabled in the settings.")
			}
			if (!artifactQuery && !manager.isFeatureConfigured) {
				throw new Error("Code Indexing is not configured (Missing OpenAI Key or Qdrant URL).")
			}

			const status = manager.getCurrentStatus()
			if (!artifactQuery && status.systemStatus !== "Indexed") {
				const defaultStatusMessage = (() => {
					switch (status.systemStatus) {
						case "Indexing":
							return "Code indexing is still running"
						case "Standby":
							return "Code indexing has not started"
						case "Error":
							return "Code indexing is in an error state"
						default:
							return "Code indexing is not ready"
					}
				})()

				const normalizedMessage =
					status.message && status.message.trim() !== "" ? status.message.trim() : defaultStatusMessage
				const unit =
					status.currentItemUnit && status.currentItemUnit.trim() !== "" ? status.currentItemUnit : "items"
				const progress =
					status.totalItems > 0 ? `${status.processedItems}/${status.totalItems} ${unit}` : undefined
				const friendlyMessage = progress
					? `${normalizedMessage} (Progress: ${progress}).`
					: `${normalizedMessage}.`

				await task.say(
					"codebase_search_result",
					JSON.stringify({
						tool: "codebaseSearch",
						content: {
							query,
							results: [] as VectorStoreSearchResult[],
							status: {
								systemStatus: status.systemStatus,
								message: normalizedMessage,
								processedItems: status.processedItems,
								totalItems: status.totalItems,
								currentItemUnit: status.currentItemUnit,
							},
						},
					}),
				)
				pushToolResult(
					formatResponse.toolError(
						`${friendlyMessage} Semantic search is unavailable until indexing completes. Please try again later.`,
					),
				)
				return
			}

			const searchResult = await manager.searchIndexDetailed({
				query,
				directoryPrefix,
				retrievalMode: task.getTaskScopedRetrievalMode(),
				taskId: task.taskId,
			})
			const jsonResult = this.toJsonResult(searchResult)
			await task.say("codebase_search_result", JSON.stringify({ tool: "codebaseSearch", content: jsonResult }))

			if (jsonResult.results.length === 0) {
				const warningText = jsonResult.warnings.length > 0 ? ` (${jsonResult.warnings.join(" ")})` : ""
				pushToolResult(`No relevant code snippets found for the query: "${query}"${warningText}`)
				return
			}

			pushToolResult(this.formatOutput(jsonResult))
		} catch (error: any) {
			await handleError("codebase_search", error)
		}
	}

	override async handlePartial(task: Task, block: ToolUse<"codebase_search">): Promise<void> {
		const sharedMessageProps = {
			tool: "codebaseSearch",
			query: block.params.query,
			path: block.params.path,
			isOutsideWorkspace: false,
		}

		await task.ask("tool", JSON.stringify(sharedMessageProps), block.partial).catch(() => {})
	}

	private toJsonResult(searchResult: CodeIndexStructuredSearchResult) {
		const results = searchResult.results.flatMap((result) => {
			const payload = result.payload as
				| { filePath?: string; startLine?: number; endLine?: number; codeChunk?: string }
				| undefined
			const absolutePath = payload?.filePath ?? result.filePath
			if (!absolutePath) {
				return []
			}

			return [
				{
					filePath: vscode.workspace.asRelativePath(absolutePath, false),
					score: result.score,
					startLine: payload?.startLine ?? result.startLine,
					endLine: payload?.endLine ?? result.endLine,
					codeChunk: (payload?.codeChunk ?? result.codeChunk ?? "").trim(),
					confidence: result.confidence,
					retrievalStage: result.retrievalStage,
					sourceKind: result.sourceKind,
					citationLabel: result.citationLabel,
					retrievalPath: result.retrievalPath,
					sources: result.sources,
					scoreBreakdown: result.scoreBreakdown,
				},
			]
		})

		return {
			query: searchResult.query,
			queryClass: searchResult.queryClass,
			queryRewrite: searchResult.queryRewrite,
			results,
			keyPoints: searchResult.keyPoints,
			sources: searchResult.sources,
			warnings: searchResult.warnings,
			postprocessUsed: searchResult.postprocessUsed,
			retrievalMode: searchResult.retrievalMode,
			retrievalConfidence: searchResult.retrievalConfidence,
			compressionApplied: searchResult.compressionApplied,
			adaptiveCutoffApplied: searchResult.adaptiveCutoffApplied,
		}
	}

	private formatOutput(jsonResult: ReturnType<CodebaseSearchTool["toJsonResult"]>): string {
		const metaLines = [
			`Query: ${jsonResult.query}`,
			`Query class: ${jsonResult.queryClass}`,
			jsonResult.queryRewrite ? `Query rewrite: ${jsonResult.queryRewrite}` : undefined,
			`Retrieval mode: ${jsonResult.retrievalMode}`,
			typeof jsonResult.retrievalConfidence === "number"
				? `Retrieval confidence: ${jsonResult.retrievalConfidence.toFixed(2)}`
				: undefined,
			jsonResult.compressionApplied ? "Compression: applied" : undefined,
			jsonResult.adaptiveCutoffApplied ? "Adaptive cutoff: applied" : undefined,
			jsonResult.keyPoints.length > 0 ? `Key points: ${jsonResult.keyPoints.join(" | ")}` : undefined,
			jsonResult.warnings.length > 0 ? `Warnings: ${jsonResult.warnings.join(" | ")}` : undefined,
		].filter(Boolean)

		const resultLines = jsonResult.results
			.map((result) => {
				const sourceLabels = (result.sources ?? []).map((source) => source.label).join(" | ")
				const scoreBreakdown = result.scoreBreakdown
					? `Score breakdown: total=${result.scoreBreakdown.total.toFixed(2)}${typeof result.scoreBreakdown.semantic === "number" ? ` semantic=${result.scoreBreakdown.semantic.toFixed(2)}` : ""}${typeof result.scoreBreakdown.lexical === "number" ? ` lexical=${result.scoreBreakdown.lexical.toFixed(2)}` : ""}${typeof result.scoreBreakdown.rerank === "number" ? ` rerank=${result.scoreBreakdown.rerank.toFixed(2)}` : ""}${typeof result.scoreBreakdown.graph === "number" ? ` graph=${result.scoreBreakdown.graph.toFixed(2)}` : ""}`
					: undefined
				return [
					`File path: ${result.filePath}`,
					`Score: ${result.score}`,
					`Lines: ${result.startLine}-${result.endLine}`,
					typeof result.confidence === "number" ? `Confidence: ${result.confidence.toFixed(2)}` : undefined,
					result.retrievalStage ? `Retrieval stage: ${result.retrievalStage}` : undefined,
					result.sourceKind ? `Source kind: ${result.sourceKind}` : undefined,
					result.citationLabel ? `Citation: ${result.citationLabel}` : undefined,
					sourceLabels ? `Sources: ${sourceLabels}` : undefined,
					scoreBreakdown,
					result.codeChunk ? `Code Chunk: ${result.codeChunk}` : undefined,
				]
					.filter(Boolean)
					.join("\n")
			})
			.join("\n\n")

		return `${metaLines.join("\n")}\nResults:\n\n${resultLines}`
	}
}

export const codebaseSearchTool = new CodebaseSearchTool()

async function tryManagedSearch(
	cline: Task,
	pushToolResult: PushToolResult,
	query: string,
	directoryPrefix?: string,
): Promise<boolean> {
	try {
		const managed = ManagedIndexer.getInstance()
		if (!managed.isEnabled()) {
			return false
		}

		const searchResults = await managed.search(query, directoryPrefix)
		if (!searchResults || searchResults.length === 0) {
			pushToolResult(`No relevant code snippets found for the query: "${query}"`)
			return true
		}

		const jsonResult = {
			query,
			results: searchResults.flatMap((result) => {
				if (!result.payload || !("filePath" in result.payload)) {
					return []
				}

				return [
					{
						filePath: vscode.workspace.asRelativePath(result.payload.filePath, false),
						score: result.score,
						startLine: result.payload.startLine,
						endLine: result.payload.endLine,
						codeChunk: result.payload.codeChunk.trim(),
					},
				]
			}),
		}

		await cline.say("codebase_search_result", JSON.stringify({ tool: "codebaseSearch", content: jsonResult }))
		const output = `Query: ${query}\nResults:\n\n${jsonResult.results
			.map(
				(result) =>
					`File path: ${result.filePath}\nScore: ${result.score}\nLines: ${result.startLine}-${result.endLine}\n${result.codeChunk ? `Code Chunk: ${result.codeChunk}\n` : ""}`,
			)
			.join("\n")}`
		pushToolResult(output)
		return true
	} catch (e) {
		const errorName = e instanceof Error && typeof e.name === "string" && e.name.trim() !== "" ? e.name : "Error"
		console.log(`[codebaseSearchTool]: Managed search failed (${errorName})`)
		return false
	}
}
