import * as vscode from "vscode"

import { RetrievalMode, TodoItem } from "@roo-code/types"

import { Task } from "../task/Task"
import { getModeBySlug } from "../../shared/modes"
import { formatResponse } from "../prompts/responses"
import { parseMarkdownChecklist } from "./UpdateTodoListTool"
import { Package } from "../../shared/package"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import type { NativeToolArgs, ToolUse } from "../../shared/tools"
import {
	adaptiveRoutingAdvisor,
	buildAdaptiveRoutingProfilePalette,
} from "../orchestration/routing/AdaptiveRoutingAdvisor"
import {
	OrchestrationPatternMemoryService,
	sanitizeTaskArchetype,
} from "../orchestration/pattern-memory/OrchestrationPatternMemoryService"
import { ProviderPatternMemoryRuntime } from "../orchestration/pattern-memory/ProviderPatternMemoryRuntime"
import {
	buildStructuredDelegationMessage,
	defaultRoleForTaskIntent,
	getStructuredDelegationBackgroundRequirements,
	hasStructuredDelegationContent,
	normalizeStructuredDelegation,
} from "../orchestration/structuredDelegation"

type NewTaskParams = NativeToolArgs["new_task"]

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
			deliverable: params.deliverable,
			constraints: params.constraints,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			expectedArtifact: params.expectedArtifact,
			role: params.role,
			permissions: params.permissions,
			retryBudget: params.retryBudget,
			retrievalPackId: params.retrievalPackId,
		}
	}

	async execute(params: NewTaskParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const {
			mode,
			message,
			todos,
			execution,
			isolation,
			branchFromTaskId,
			branchStrategy,
			deliverable,
			constraints,
			acceptanceCriteria,
			inputs,
			evidenceNeeded,
			expectedArtifact,
			role,
			permissions,
			retryBudget,
			retrievalPackId,
		} = params
		const { askApproval, handleError, pushToolResult } = callbacks
		const normalizedTodos = todos ?? undefined

		try {
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

			const provider = task.providerRef.deref()
			if (!provider) {
				pushToolResult(formatResponse.toolError("Provider reference lost"))
				return
			}

			const state = await provider.getState()
			const normalizedExplicitExecution =
				execution === "foreground" || execution === "background" ? execution : undefined

			const requireTodos = vscode.workspace
				.getConfiguration(Package.name)
				.get<boolean>("newTaskRequireTodos", false)

			if (requireTodos && todos === undefined) {
				task.consecutiveMistakeCount++
				task.recordToolError("new_task")
				task.didToolFailInCurrentTurn = true
				pushToolResult(await task.sayAndCreateMissingParamError("new_task", "todos"))
				return
			}

			let todoItems: TodoItem[] = []
			if (todos) {
				try {
					todoItems = parseMarkdownChecklist(todos)
				} catch {
					task.consecutiveMistakeCount++
					task.recordToolError("new_task")
					task.didToolFailInCurrentTurn = true
					pushToolResult(formatResponse.toolError("Invalid todos format: must be a markdown checklist"))
					return
				}
			}

			task.consecutiveMistakeCount = 0
			const unescapedMessage = message.replace(/\\\\@/g, "\\@")
			const targetMode = getModeBySlug(mode, state?.customModes)
			if (!targetMode) {
				pushToolResult(formatResponse.toolError(`Invalid mode: ${mode}`))
				return
			}

			const structuredDelegation = normalizeStructuredDelegation({
				message: unescapedMessage,
				deliverable,
				constraints,
				acceptanceCriteria,
				inputs,
				evidenceNeeded,
				expectedArtifact,
				role,
				permissions,
				retryBudget,
				retrievalPackId,
			})
			const structuredDelegationEnabled = state?.structuredDelegationEnabled === true
			const structuredContentProvided = hasStructuredDelegationContent(structuredDelegation)
			const shouldUseStructuredDelegation = structuredDelegationEnabled || structuredContentProvided
			const effectiveRole = shouldUseStructuredDelegation
				? (structuredDelegation.role ?? defaultRoleForTaskIntent(structuredDelegation.taskIntent))
				: structuredDelegation.role
			const structuredPayload = shouldUseStructuredDelegation
				? { ...structuredDelegation, ...(effectiveRole ? { role: effectiveRole } : {}) }
				: structuredDelegation
			const renderedMessage = shouldUseStructuredDelegation
				? buildStructuredDelegationMessage(structuredPayload)
				: unescapedMessage
			const backgroundRequirements = structuredDelegationEnabled
				? getStructuredDelegationBackgroundRequirements(structuredDelegation)
				: []
			const retrievalMode = ((state?.retrievalPolicy as RetrievalMode | undefined) ??
				"adaptive") satisfies RetrievalMode

			const patternMemoryService = new OrchestrationPatternMemoryService(
				new ProviderPatternMemoryRuntime(provider as any),
			)
			const patternTaskArchetype = sanitizeTaskArchetype({
				mode,
				message: unescapedMessage,
				branchFromTaskId,
				branchStrategy,
				todos: normalizedTodos,
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
				todos: normalizedTodos,
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
			const recommendedBackgroundExecution =
				routingRecommendation.execution.source === "recommended" &&
				routingRecommendation.execution.value === "background"
					? "background"
					: undefined
			const requestedExecution = normalizedExplicitExecution ?? recommendedBackgroundExecution
			const backgroundBlockedByStructuredDelegation =
				structuredDelegationEnabled && requestedExecution === "background" && backgroundRequirements.length > 0
			const effectiveExecution = backgroundBlockedByStructuredDelegation ? undefined : requestedExecution
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
				renderedContent: renderedMessage,
				todos: todoItems,
				execution: effectiveExecution,
				isolation,
				helperProfile: effectiveHelperProfile,
				routingRecommendation,
				patternRecommendation,
				structuredDelegation: shouldUseStructuredDelegation
					? {
							goal: structuredDelegation.message,
							role: effectiveRole,
							deliverable: structuredDelegation.deliverable,
							constraints: structuredDelegation.constraints,
							acceptanceCriteria: structuredDelegation.acceptanceCriteria,
							inputs: structuredDelegation.inputs,
							evidenceNeeded: structuredDelegation.evidenceNeeded,
							expectedArtifact: structuredDelegation.expectedArtifact,
							permissions: structuredDelegation.permissions,
							retryBudget: structuredDelegation.retryBudget,
							retrievalPackId: structuredDelegation.retrievalPackId,
							backgroundRequirements,
						}
					: undefined,
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
						reasonCode: backgroundBlockedByStructuredDelegation
							? "structured_delegation_required"
							: normalizedExplicitExecution === "background"
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
					taskIntent: structuredDelegation.taskIntent,
					retrievalMode,
					structuredDelegation: shouldUseStructuredDelegation,
					validatorPolicy: structuredDelegationEnabled
						? backgroundBlockedByStructuredDelegation
							? `background_requires:${backgroundRequirements.join(",")}`
							: "structured_background_enabled"
						: undefined,
				},
				branchFromTaskId,
				branchStrategy,
			})

			const didApprove = await askApproval("tool", toolMessage)
			if (!didApprove) {
				return
			}

			if (task.enableCheckpoints) {
				task.checkpointSave(true)
			}

			const child = await (provider as any).delegateParentAndOpenChild({
				parentTaskId: task.taskId,
				parentTask: task,
				message: renderedMessage,
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
				goal: structuredDelegation.message,
				doneWhen: structuredDelegation.acceptanceCriteria?.length
					? `Meet all acceptance criteria:\n- ${structuredDelegation.acceptanceCriteria.join("\n- ")}`
					: undefined,
				constraints: structuredDelegation.constraints,
				deliverable: structuredDelegation.deliverable,
				acceptanceCriteria: structuredDelegation.acceptanceCriteria,
				inputs: structuredDelegation.inputs,
				evidenceNeeded: structuredDelegation.evidenceNeeded,
				expectedArtifact: structuredDelegation.expectedArtifact,
				role: effectiveRole,
				permissions: structuredDelegation.permissions,
				retryBudget: structuredDelegation.retryBudget,
				retrievalPackId: structuredDelegation.retrievalPackId,
				taskIntent: structuredDelegation.taskIntent,
				retrievalMode,
				structuredDelegation: shouldUseStructuredDelegation,
			})

			pushToolResult(`Delegated to child task ${child.taskId}`)
			return
		} catch (error) {
			await handleError("creating new task", error as Error)
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
