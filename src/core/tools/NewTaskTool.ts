import * as vscode from "vscode"

import { TodoItem } from "@roo-code/types"

import { Task } from "../task/Task"
import { getModeBySlug } from "../../shared/modes"
import { formatResponse } from "../prompts/responses"
import { t } from "../../i18n"
import { parseMarkdownChecklist } from "./UpdateTodoListTool"
import { Package } from "../../shared/package"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import type { ToolUse } from "../../shared/tools"
import {
	adaptiveRoutingAdvisor,
	buildAdaptiveRoutingProfilePalette,
} from "../orchestration/routing/AdaptiveRoutingAdvisor"
import {
	OrchestrationPatternMemoryService,
	sanitizeTaskArchetype,
} from "../orchestration/pattern-memory/OrchestrationPatternMemoryService"
import { ProviderPatternMemoryRuntime } from "../orchestration/pattern-memory/ProviderPatternMemoryRuntime"

interface NewTaskParams {
	mode: string
	message: string
	todos?: string
	execution?: "auto" | "foreground" | "background"
	isolation?: "auto" | "shared" | "worktree"
	branchFromTaskId?: string
	branchStrategy?: "full" | "summary"
}

export class NewTaskTool extends BaseTool<"new_task"> {
	readonly name = "new_task" as const

	parseLegacy(params: Partial<Record<string, string>>): NewTaskParams {
		return {
			mode: params.mode || "",
			message: params.message || "",
			todos: params.todos,
			execution: (params.execution as NewTaskParams["execution"]) || undefined,
			isolation: (params.isolation as NewTaskParams["isolation"]) || undefined,
			branchFromTaskId: params.branchFromTaskId,
			branchStrategy: (params.branchStrategy as NewTaskParams["branchStrategy"]) || undefined,
		}
	}

	async execute(params: NewTaskParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { mode, message, todos, execution, isolation, branchFromTaskId, branchStrategy } = params
		const { askApproval, handleError, pushToolResult, toolProtocol, toolCallId } = callbacks

		try {
			// Validate required parameters.
			if (!mode) {
				task.consecutiveMistakeCount++
				task.recordToolError("new_task")
				task.didToolFailInCurrentTurn = true
				pushToolResult(await task.sayAndCreateMissingParamError("new_task", "mode"))
				return
			}

			if (!message) {
				task.consecutiveMistakeCount++
				task.recordToolError("new_task")
				task.didToolFailInCurrentTurn = true
				pushToolResult(await task.sayAndCreateMissingParamError("new_task", "message"))
				return
			}

			// Get the VSCode setting for requiring todos.
			const provider = task.providerRef.deref()

			if (!provider) {
				pushToolResult(formatResponse.toolError("Provider reference lost"))
				return
			}

			const state = await provider.getState()
			const normalizedExplicitExecution =
				execution === "foreground" || execution === "background" ? execution : undefined

			// Use Package.name (dynamic at build time) as the VSCode configuration namespace.
			// Supports multiple extension variants (e.g., stable/nightly) without hardcoded strings.
			const requireTodos = vscode.workspace
				.getConfiguration(Package.name)
				.get<boolean>("newTaskRequireTodos", false)

			// Check if todos are required based on VSCode setting.
			// Note: `undefined` means not provided, empty string is valid.
			if (requireTodos && todos === undefined) {
				task.consecutiveMistakeCount++
				task.recordToolError("new_task")
				task.didToolFailInCurrentTurn = true
				pushToolResult(await task.sayAndCreateMissingParamError("new_task", "todos"))
				return
			}

			// Parse todos if provided, otherwise use empty array
			let todoItems: TodoItem[] = []
			if (todos) {
				try {
					todoItems = parseMarkdownChecklist(todos)
				} catch (error) {
					task.consecutiveMistakeCount++
					task.recordToolError("new_task")
					task.didToolFailInCurrentTurn = true
					pushToolResult(formatResponse.toolError("Invalid todos format: must be a markdown checklist"))
					return
				}
			}

			task.consecutiveMistakeCount = 0

			// Un-escape one level of backslashes before '@' for hierarchical subtasks
			// Un-escape one level: \\@ -> \@ (removes one backslash for hierarchical subtasks)
			const unescapedMessage = message.replace(/\\\\@/g, "\\@")

			// Verify the mode exists
			const targetMode = getModeBySlug(mode, state?.customModes)

			if (!targetMode) {
				pushToolResult(formatResponse.toolError(`Invalid mode: ${mode}`))
				return
			}

			const patternMemoryService = new OrchestrationPatternMemoryService(
				new ProviderPatternMemoryRuntime(provider as any),
			)
			const patternTaskArchetype = sanitizeTaskArchetype({
				mode,
				message: unescapedMessage,
				branchFromTaskId,
				branchStrategy,
				todos,
			})
			const patternRecommendation = patternMemoryService.getRecommendation({
				taskArchetype: patternTaskArchetype,
				mode,
			})
			const recommendedExecution =
				!normalizedExplicitExecution && patternRecommendation?.suggestion.executionType === "background"
					? "background"
					: undefined
			const routingRecommendation = adaptiveRoutingAdvisor.recommend({
				explicitMode: mode,
				explicitExecution: normalizedExplicitExecution ?? recommendedExecution,
				message: unescapedMessage,
				todos,
				branchFromTaskId,
				currentMode: state?.mode,
				currentProfileName: state?.currentApiConfigName,
				availableBackgroundCapacity: Boolean(
					state?.parallelAgentsEnabled && (state?.parallelAgentCount ?? 1) > 0,
				),
				profilePalette: buildAdaptiveRoutingProfilePalette({
					currentProfileName: state?.currentApiConfigName,
					listApiConfigMeta: state?.listApiConfigMeta,
					cheapProfileId: state?.condensingApiConfigId,
					balancedProfileId: state?.enhancementApiConfigId ?? state?.terminalCommandApiConfigId,
				}),
			})
			const effectiveExecution =
				normalizedExplicitExecution ??
				(routingRecommendation.execution.source === "recommended" &&
				routingRecommendation.execution.value === "background"
					? "background"
					: undefined)
			const recommendedProfileClass =
				patternRecommendation?.suggestion.executionType === "background"
					? patternRecommendation.suggestion.profileClass
					: undefined
			const effectiveHelperProfile =
				effectiveExecution === "background" &&
				routingRecommendation.profile.helperProfile &&
				routingRecommendation.profile.helperProfile !== state?.currentApiConfigName
					? routingRecommendation.profile.helperProfile
					: undefined

			const toolMessage = JSON.stringify({
				tool: "newTask",
				mode: targetMode.name,
				content: message,
				todos: todoItems,
				execution: effectiveExecution,
				isolation,
				helperProfile: effectiveHelperProfile,
				routingRecommendation,
				patternRecommendation,
				explainability: {
					mode: {
						value: routingRecommendation.mode.value,
						source: routingRecommendation.mode.source,
						reasonCode:
							routingRecommendation.mode.source === "explicit"
								? "mode_explicit"
								: routingRecommendation.mode.source === "recommended"
									? "mode_continue_current"
									: "mode_default_code",
					},
					execution: {
						value: effectiveExecution ?? "foreground",
						source: normalizedExplicitExecution ? "explicit" : routingRecommendation.execution.source,
						reasonCode:
							normalizedExplicitExecution === "background"
								? "execution_explicit_background"
								: normalizedExplicitExecution === "foreground"
									? "execution_explicit_foreground"
									: effectiveExecution === "background"
										? (patternRecommendation?.reasonCode ?? "execution_background_recommended")
										: "execution_foreground_default",
					},
					profile: {
						value: recommendedProfileClass ?? routingRecommendation.profile.value,
						source: effectiveHelperProfile ? routingRecommendation.profile.source : "default",
						helperProfile: effectiveHelperProfile,
						reasonCode:
							effectiveHelperProfile && patternRecommendation?.reasonCode
								? patternRecommendation.reasonCode
								: effectiveHelperProfile
									? "helper_profile_selected"
									: "helper_profile_runtime_default",
					},
				},
				branchFromTaskId,
				branchStrategy,
			})

			const didApprove = await askApproval("tool", toolMessage)

			if (!didApprove) {
				return
			}

			// Provider is guaranteed to be defined here due to earlier check.

			if (task.enableCheckpoints) {
				task.checkpointSave(true)
			}

			// Delegate parent and open child as sole active task
			const child = await (provider as any).delegateParentAndOpenChild({
				parentTaskId: task.taskId,
				message: unescapedMessage,
				initialTodos: todoItems,
				mode,
				execution: effectiveExecution,
				isolation,
				helperProfile: effectiveHelperProfile,
				profileClass: recommendedProfileClass ?? routingRecommendation.profile.value,
				routingSource: normalizedExplicitExecution ? "explicit" : routingRecommendation.execution.source,
				recommendationReasonCode: patternRecommendation?.reasonCode,
				branchFromTaskId,
				branchStrategy,
			})

			// Reflect delegation in tool result (no pause/unpause, no wait)
			pushToolResult(`Delegated to child task ${child.taskId}`)
			return
		} catch (error) {
			await handleError("creating new task", error)
			return
		}
	}

	override async handlePartial(task: Task, block: ToolUse<"new_task">): Promise<void> {
		const mode: string | undefined = block.params.mode
		const message: string | undefined = block.params.message
		const todos: string | undefined = block.params.todos

		const partialMessage = JSON.stringify({
			tool: "newTask",
			mode: this.removeClosingTag("mode", mode, block.partial),
			content: this.removeClosingTag("message", message, block.partial),
			todos: this.removeClosingTag("todos", todos, block.partial),
		})

		await task.ask("tool", partialMessage, block.partial).catch(() => {})
	}
}

export const newTaskTool = new NewTaskTool()
