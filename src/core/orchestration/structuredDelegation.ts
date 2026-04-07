import type { SubagentHandoff, TaskIntent } from "@roo-code/types"

export type StructuredDelegationInput = {
	message: string
	deliverable?: string | null
	constraints?: string | string[] | null
	acceptanceCriteria?: string | string[] | null
	inputs?: string | Array<{ kind?: string; ref?: string } | string> | null
	evidenceNeeded?: boolean | string | null
	expectedArtifact?: string | null
	role?: string | null
	retryBudget?: number | string | null
	retrievalPackId?: string | null
	taskIntent?: TaskIntent | string | null
	permissions?: string[] | string | null
}

export type NormalizedStructuredDelegation = {
	message: string
	deliverable?: string
	constraints?: string[]
	acceptanceCriteria?: string[]
	inputs?: NonNullable<SubagentHandoff["inputs"]>
	evidenceNeeded?: boolean
	expectedArtifact?: string
	role?: string
	retryBudget?: number
	retrievalPackId?: string
	taskIntent: TaskIntent
	permissions?: string[]
}

function normalizeOptionalString(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined
	}

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function normalizeStringList(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const normalized = value
			.map((item) => normalizeOptionalString(item))
			.filter((item): item is string => Boolean(item))
		return normalized.length > 0 ? normalized : undefined
	}

	if (typeof value !== "string") {
		return undefined
	}

	const normalized = value
		.split(/\r?\n/u)
		.map((line) => line.replace(/^[-*\[\]xX\d.\s]+/u, "").trim())
		.filter(Boolean)

	return normalized.length > 0 ? normalized : undefined
}

function normalizeInputReferences(value: unknown): NonNullable<SubagentHandoff["inputs"]> | undefined {
	const rawItems = Array.isArray(value)
		? value
		: typeof value === "string"
			? value
					.split(/\r?\n/u)
					.map((line) => line.trim())
					.filter(Boolean)
			: []

	const normalized = rawItems
		.map((item) => {
			if (typeof item === "string") {
				const match = item.match(/^([a-z_]+)\s*:\s*(.+)$/u)
				if (match) {
					return {
						kind: match[1] as NonNullable<SubagentHandoff["inputs"]>[number]["kind"],
						ref: match[2].trim(),
					}
				}

				return { kind: "other" as const, ref: item.trim() }
			}

			if (!item || typeof item !== "object") {
				return undefined
			}

			const kind = normalizeOptionalString((item as { kind?: unknown }).kind) ?? "other"
			const ref = normalizeOptionalString((item as { ref?: unknown }).ref)
			if (!ref) {
				return undefined
			}

			return {
				kind: kind as NonNullable<SubagentHandoff["inputs"]>[number]["kind"],
				ref,
			}
		})
		.filter((item): item is NonNullable<SubagentHandoff["inputs"]>[number] => Boolean(item))

	return normalized.length > 0 ? normalized : undefined
}

function normalizeBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value
	}

	if (typeof value !== "string") {
		return undefined
	}

	const lowered = value.trim().toLowerCase()
	if (["true", "yes", "1", "required"].includes(lowered)) {
		return true
	}
	if (["false", "no", "0", "optional"].includes(lowered)) {
		return false
	}
	return undefined
}

function normalizeRetryBudget(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
		return Math.floor(value)
	}

	if (typeof value !== "string") {
		return undefined
	}

	const parsed = Number(value.trim())
	if (!Number.isFinite(parsed) || parsed < 0) {
		return undefined
	}
	return Math.floor(parsed)
}

export function inferTaskIntent(message: string, explicitIntent?: string | null): TaskIntent {
	const normalizedExplicit = normalizeOptionalString(explicitIntent)
	if (normalizedExplicit) {
		switch (normalizedExplicit) {
			case "research":
			case "debug":
			case "implementation":
			case "review":
			case "general":
				return normalizedExplicit
		}
	}

	const text = message.toLowerCase()
	if (/(review|audit|inspect|validate|check)/u.test(text)) {
		return "review"
	}
	if (/(debug|trace|error|bug|fix)/u.test(text)) {
		return "debug"
	}
	if (/(research|investigate|analy[sz]e|explore|study)/u.test(text)) {
		return "research"
	}
	if (/(implement|build|refactor|add|create|change)/u.test(text)) {
		return "implementation"
	}
	return "general"
}

export function defaultRoleForTaskIntent(taskIntent: TaskIntent): string {
	switch (taskIntent) {
		case "research":
			return "researcher"
		case "review":
			return "validator"
		case "debug":
		case "implementation":
			return "executor"
		case "general":
		default:
			return "executor"
	}
}

export function normalizeStructuredDelegation(input: StructuredDelegationInput): NormalizedStructuredDelegation {
	const taskIntent = inferTaskIntent(input.message, input.taskIntent)
	const deliverable = normalizeOptionalString(input.deliverable)
	const constraints = normalizeStringList(input.constraints)
	const acceptanceCriteria = normalizeStringList(input.acceptanceCriteria)
	const inputs = normalizeInputReferences(input.inputs)
	const evidenceNeeded = normalizeBoolean(input.evidenceNeeded)
	const expectedArtifact = normalizeOptionalString(input.expectedArtifact)
	const role = normalizeOptionalString(input.role)
	const retryBudget = normalizeRetryBudget(input.retryBudget)
	const retrievalPackId = normalizeOptionalString(input.retrievalPackId)
	const permissions = normalizeStringList(input.permissions)

	return {
		message: input.message.trim(),
		...(deliverable ? { deliverable } : {}),
		...(constraints ? { constraints } : {}),
		...(acceptanceCriteria ? { acceptanceCriteria } : {}),
		...(inputs ? { inputs } : {}),
		...(evidenceNeeded !== undefined ? { evidenceNeeded } : {}),
		...(expectedArtifact ? { expectedArtifact } : {}),
		...(role ? { role } : {}),
		...(retryBudget !== undefined ? { retryBudget } : {}),
		...(retrievalPackId ? { retrievalPackId } : {}),
		...(permissions ? { permissions } : {}),
		taskIntent,
	}
}

export function hasStructuredDelegationContent(input: NormalizedStructuredDelegation): boolean {
	return Boolean(
		input.deliverable ||
			input.constraints?.length ||
			input.acceptanceCriteria?.length ||
			input.inputs?.length ||
			input.evidenceNeeded !== undefined ||
			input.expectedArtifact ||
			input.role ||
			input.retryBudget !== undefined ||
			input.retrievalPackId ||
			input.permissions?.length,
	)
}

export function getStructuredDelegationBackgroundRequirements(input: NormalizedStructuredDelegation): string[] {
	const missing: string[] = []
	if (!input.message.trim()) {
		missing.push("goal")
	}
	if (!input.acceptanceCriteria?.length) {
		missing.push("acceptanceCriteria")
	}
	return missing
}

export function buildStructuredDelegationMessage(input: NormalizedStructuredDelegation): string {
	if (!hasStructuredDelegationContent(input)) {
		return input.message
	}

	const sections = [input.message.trim(), "", "<delegation_contract>", `task_intent: ${input.taskIntent}`]
	if (input.role) {
		sections.push(`role: ${input.role}`)
	}
	if (input.deliverable) {
		sections.push(`deliverable: ${input.deliverable}`)
	}
	if (input.expectedArtifact) {
		sections.push(`expected_artifact: ${input.expectedArtifact}`)
	}
	if (input.retryBudget !== undefined) {
		sections.push(`retry_budget: ${input.retryBudget}`)
	}
	if (input.retrievalPackId) {
		sections.push(`retrieval_pack: ${input.retrievalPackId}`)
	}
	if (input.evidenceNeeded !== undefined) {
		sections.push(`evidence_needed: ${input.evidenceNeeded ? "yes" : "no"}`)
	}
	if (input.permissions?.length) {
		sections.push(`permissions: ${input.permissions.join(", ")}`)
	}
	if (input.constraints?.length) {
		sections.push("constraints:")
		sections.push(...input.constraints.map((item) => `- ${item}`))
	}
	if (input.acceptanceCriteria?.length) {
		sections.push("acceptance_criteria:")
		sections.push(...input.acceptanceCriteria.map((item) => `- ${item}`))
	}
	if (input.inputs?.length) {
		sections.push("inputs:")
		sections.push(...input.inputs.map((item) => `- ${item.kind}: ${item.ref}`))
	}
	sections.push("</delegation_contract>")
	return sections.join("\n")
}
