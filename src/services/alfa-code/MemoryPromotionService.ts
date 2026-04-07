import * as fs from "fs/promises"
import * as path from "path"

import type { EvaluatorVerdict, RetrievalMode, SubagentInputReference, TaskIntent } from "@roo-code/types"

const AUTO_PROMOTED_SECTION_TITLE = "## Автопромоутированные runtime-наблюдения"
const AUTO_PROMOTED_SECTION_START = "<!-- AUTO_PROMOTED_MEMORY_START -->"
const AUTO_PROMOTED_SECTION_END = "<!-- AUTO_PROMOTED_MEMORY_END -->"
const AUTO_PROMOTED_ENTRY_PREFIX = "<!-- AUTO_PROMOTED_MEMORY:"
const AUTO_PROMOTED_ENTRY_SUFFIX = "<!-- /AUTO_PROMOTED_MEMORY -->"
const DEFAULT_MAX_PROMOTED_ENTRIES = 5
const MAX_SOURCE_SUMMARY_CHARS = 1200
const MAX_CANDIDATE_BULLETS = 3
const MIN_BULLET_LENGTH = 18
const EVIDENCE_REF_RE =
	/(?:^|[\s`(])((?:[A-Za-z]:[\\/][^`\s)]+|(?:\.{1,2}[\\/])?[^`\s()]+?\.[A-Za-z0-9]+(?::\d+)?))(?=$|[\s`),])/g

export interface MemoryPromotionRequest {
	taskId: string
	parentTaskId?: string
	workspacePath: string
	summary: string
	evaluatorVerdict?: EvaluatorVerdict
	acceptanceCriteria?: string[]
	inputs?: readonly SubagentInputReference[]
	evidenceNeeded?: boolean
	taskIntent?: TaskIntent
	retrievalMode?: RetrievalMode
}

export interface MemoryPromotionResult {
	status: "promoted" | "skipped" | "rejected"
	reason:
		| "empty_summary"
		| "acceptance_unverified"
		| "truth_boundary_failed"
		| "insufficient_evidence"
		| "candidate_empty"
		| "memory_bank_missing"
		| "duplicate"
		| "promoted"
	artifactPath?: string
	targetPath?: string
	recordId?: string
}

interface MemoryPromotionEvidencePacket {
	recordId: string
	taskId: string
	parentTaskId?: string
	workspacePath: string
	summary: string
	evaluatorVerdict?: EvaluatorVerdict
	acceptanceCriteria: string[]
	evidenceRefs: string[]
	evidenceNeeded: boolean
	taskIntent?: TaskIntent
	retrievalMode?: RetrievalMode
	dateStamp: string
}

interface MemoryPromotionCandidateRecord {
	recordId: string
	title: string
	bullets: string[]
	evidenceArtifactRelativePath: string
}

interface EvidenceArtifactInfo {
	absolutePath: string
	relativePath: string
}

export interface MemoryPromotionServiceOptions {
	now?: () => Date
	maxPromotedEntries?: number
}

export class MemoryPromotionService {
	private readonly now: () => Date
	private readonly maxPromotedEntries: number

	constructor(options: MemoryPromotionServiceOptions = {}) {
		this.now = options.now ?? (() => new Date())
		this.maxPromotedEntries = options.maxPromotedEntries ?? DEFAULT_MAX_PROMOTED_ENTRIES
	}

	public async promoteFromStructuredDelegation(request: MemoryPromotionRequest): Promise<MemoryPromotionResult> {
		const evidencePacket = this.buildEvidencePacket(request)
		if (!evidencePacket) {
			return this.rejectForRequest(request)
		}

		const artifactInfo = await this.writeEvidenceArtifact(evidencePacket)
		const candidate = this.buildCandidateRecord(evidencePacket, artifactInfo)
		if (!candidate) {
			return {
				status: "rejected",
				reason: "candidate_empty",
				artifactPath: artifactInfo.absolutePath,
				recordId: evidencePacket.recordId,
			}
		}

		const contextPath = path.join(request.workspacePath, ".kilocode", "memory-bank", "context.md")
		const promotionOutcome = await this.promoteIntoContext(candidate, contextPath)
		if (promotionOutcome === "missing") {
			return {
				status: "skipped",
				reason: "memory_bank_missing",
				artifactPath: artifactInfo.absolutePath,
				targetPath: contextPath,
				recordId: candidate.recordId,
			}
		}
		if (promotionOutcome === "duplicate") {
			return {
				status: "skipped",
				reason: "duplicate",
				artifactPath: artifactInfo.absolutePath,
				targetPath: contextPath,
				recordId: candidate.recordId,
			}
		}

		return {
			status: "promoted",
			reason: "promoted",
			artifactPath: artifactInfo.absolutePath,
			targetPath: contextPath,
			recordId: candidate.recordId,
		}
	}

	private rejectForRequest(request: MemoryPromotionRequest): MemoryPromotionResult {
		const summary = this.cleanSummaryForStorage(request.summary)
		if (!summary) {
			return { status: "rejected", reason: "empty_summary" }
		}

		const acceptanceCriteria = this.normalizeList(request.acceptanceCriteria)
		if (request.evaluatorVerdict && request.evaluatorVerdict !== "pass") {
			return { status: "rejected", reason: "acceptance_unverified" }
		}
		if (acceptanceCriteria.length > 0 && request.evaluatorVerdict !== "pass") {
			return { status: "rejected", reason: "acceptance_unverified" }
		}
		if (this.crossesTruthBoundary(summary)) {
			return { status: "rejected", reason: "truth_boundary_failed" }
		}
		if (this.extractEvidenceRefs(summary, request.inputs).length === 0) {
			return { status: "rejected", reason: "insufficient_evidence" }
		}

		return { status: "rejected", reason: "candidate_empty" }
	}

	private buildEvidencePacket(request: MemoryPromotionRequest): MemoryPromotionEvidencePacket | undefined {
		const summary = this.cleanSummaryForStorage(request.summary)
		if (!summary) {
			return undefined
		}

		const acceptanceCriteria = this.normalizeList(request.acceptanceCriteria)
		if (request.evaluatorVerdict && request.evaluatorVerdict !== "pass") {
			return undefined
		}
		if (acceptanceCriteria.length > 0 && request.evaluatorVerdict !== "pass") {
			return undefined
		}
		if (this.crossesTruthBoundary(summary)) {
			return undefined
		}

		const evidenceRefs = this.extractEvidenceRefs(summary, request.inputs)
		if (evidenceRefs.length === 0) {
			return undefined
		}

		const dateStamp = this.now().toISOString().slice(0, 10)
		return {
			recordId: this.sanitizeTaskId(request.taskId),
			taskId: request.taskId,
			parentTaskId: request.parentTaskId,
			workspacePath: request.workspacePath,
			summary,
			evaluatorVerdict: request.evaluatorVerdict,
			acceptanceCriteria,
			evidenceRefs,
			evidenceNeeded: request.evidenceNeeded === true,
			taskIntent: request.taskIntent,
			retrievalMode: request.retrievalMode,
			dateStamp,
		}
	}

	private async writeEvidenceArtifact(packet: MemoryPromotionEvidencePacket): Promise<EvidenceArtifactInfo> {
		const artifactDir = path.join(
			packet.workspacePath,
			".kilocode",
			"evidence",
			`${packet.dateStamp}-memory-promotion`,
		)
		const artifactPath = path.join(artifactDir, `task-${this.sanitizeTaskId(packet.taskId)}.md`)
		await fs.mkdir(artifactDir, { recursive: true })
		await fs.writeFile(artifactPath, this.renderEvidenceArtifact(packet), "utf8")
		return {
			absolutePath: artifactPath,
			relativePath: this.toRelative(packet.workspacePath, artifactPath),
		}
	}

	private buildCandidateRecord(
		packet: MemoryPromotionEvidencePacket,
		artifactInfo: EvidenceArtifactInfo,
	): MemoryPromotionCandidateRecord | undefined {
		const bullets = this.extractCandidateBullets(packet.summary)
		if (bullets.length === 0) {
			return undefined
		}

		return {
			recordId: packet.recordId,
			title: `Runtime-обновление для task \`${packet.taskId}\` (${packet.dateStamp})`,
			bullets,
			evidenceArtifactRelativePath: artifactInfo.relativePath,
		}
	}

	private async promoteIntoContext(
		candidate: MemoryPromotionCandidateRecord,
		contextPath: string,
	): Promise<"promoted" | "duplicate" | "missing"> {
		const existing = await this.readIfExists(contextPath)
		if (existing === undefined) {
			return "missing"
		}

		const normalizedExisting = this.normalizeDocument(existing)
		const entryMarker = `${AUTO_PROMOTED_ENTRY_PREFIX}${candidate.recordId} -->`
		if (normalizedExisting.includes(entryMarker)) {
			return "duplicate"
		}

		const section = this.extractManagedSection(normalizedExisting)
		const nextEntries = [...section.entries, this.renderContextEntry(candidate)].slice(-this.maxPromotedEntries)
		const updatedSection = this.renderManagedSection(nextEntries)
		const updatedDocument = section.exists
			? `${normalizedExisting.slice(0, section.startIndex)}${updatedSection}${normalizedExisting.slice(section.endIndex)}`
			: this.appendManagedSection(normalizedExisting, updatedSection)

		await fs.writeFile(contextPath, this.ensureTrailingNewline(updatedDocument), "utf8")
		return "promoted"
	}

	private renderEvidenceArtifact(packet: MemoryPromotionEvidencePacket): string {
		const summaryExcerpt = this.cleanSummaryForStorage(packet.summary).slice(0, MAX_SOURCE_SUMMARY_CHARS)
		const evidenceRefs = packet.evidenceRefs.map((ref) => `- \`${ref}\``).join("\n")
		const acceptanceCriteria =
			packet.acceptanceCriteria.length > 0
				? packet.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")
				: "- none"
		const metadata = [
			`- record_id: \`${packet.recordId}\``,
			`- source_task_id: \`${packet.taskId}\``,
			packet.parentTaskId ? `- parent_task_id: \`${packet.parentTaskId}\`` : undefined,
			packet.evaluatorVerdict ? `- evaluator_verdict: \`${packet.evaluatorVerdict}\`` : undefined,
			packet.taskIntent ? `- task_intent: \`${packet.taskIntent}\`` : undefined,
			packet.retrievalMode ? `- retrieval_mode: \`${packet.retrievalMode}\`` : undefined,
			packet.evidenceNeeded ? `- evidence_required: \`true\`` : undefined,
		]
			.filter((value): value is string => Boolean(value))
			.join("\n")

		return this.ensureTrailingNewline(
			[
				"# Evidence packet for memory promotion",
				"",
				"## Metadata",
				metadata || "- none",
				"",
				"## Evidence refs",
				evidenceRefs || "- none",
				"",
				"## Acceptance criteria",
				acceptanceCriteria,
				"",
				"## Source summary excerpt",
				summaryExcerpt || "No summary excerpt available.",
			].join("\n"),
		)
	}

	private renderContextEntry(candidate: MemoryPromotionCandidateRecord): string {
		const bulletLines = candidate.bullets.map((bullet) => `- ${bullet}`).join("\n")
		return [
			`${AUTO_PROMOTED_ENTRY_PREFIX}${candidate.recordId} -->`,
			`### ${candidate.title}`,
			bulletLines,
			`Источник: \`${candidate.evidenceArtifactRelativePath}\``,
			AUTO_PROMOTED_ENTRY_SUFFIX,
		].join("\n")
	}

	private renderManagedSection(entries: string[]): string {
		const content = [AUTO_PROMOTED_SECTION_START, AUTO_PROMOTED_SECTION_TITLE]
		if (entries.length > 0) {
			content.push("", entries.join("\n\n"))
		}
		content.push("", AUTO_PROMOTED_SECTION_END)
		return content.join("\n")
	}

	private appendManagedSection(existing: string, managedSection: string): string {
		const trimmed = existing.trimEnd()
		if (!trimmed) {
			return managedSection
		}
		return `${trimmed}\n\n${managedSection}`
	}

	private extractManagedSection(existing: string): {
		exists: boolean
		startIndex: number
		endIndex: number
		entries: string[]
	} {
		const startIndex = existing.indexOf(AUTO_PROMOTED_SECTION_START)
		const endMarkerIndex = existing.indexOf(AUTO_PROMOTED_SECTION_END)
		if (startIndex === -1 || endMarkerIndex === -1 || endMarkerIndex < startIndex) {
			return { exists: false, startIndex: -1, endIndex: -1, entries: [] }
		}

		const endIndex = endMarkerIndex + AUTO_PROMOTED_SECTION_END.length
		const sectionBody = existing.slice(startIndex + AUTO_PROMOTED_SECTION_START.length, endMarkerIndex).trim()
		const bodyWithoutTitle = sectionBody.startsWith(AUTO_PROMOTED_SECTION_TITLE)
			? sectionBody.slice(AUTO_PROMOTED_SECTION_TITLE.length).trim()
			: sectionBody
		const entryMatches = bodyWithoutTitle.match(
			new RegExp(
				`${this.escapeRegex(AUTO_PROMOTED_ENTRY_PREFIX)}[\\s\\S]*?${this.escapeRegex(AUTO_PROMOTED_ENTRY_SUFFIX)}`,
				"g",
			),
		)

		return {
			exists: true,
			startIndex,
			endIndex,
			entries: (entryMatches ?? []).map((entry) => entry.trim()).filter((entry) => entry.length > 0),
		}
	}

	private extractEvidenceRefs(summary: string, inputs?: readonly SubagentInputReference[]): string[] {
		const refs = new Set<string>()
		for (const match of summary.matchAll(EVIDENCE_REF_RE)) {
			const rawRef = match[1]?.trim()
			if (rawRef) {
				refs.add(rawRef.replace(/\\/g, "/"))
			}
		}

		for (const input of inputs ?? []) {
			if (!["file", "doc", "workflow", "artifact", "search"].includes(input.kind)) {
				continue
			}
			const normalized = input.ref.trim()
			if (normalized) {
				refs.add(normalized.replace(/\\/g, "/"))
			}
		}

		return [...refs]
	}

	private extractCandidateBullets(summary: string): string[] {
		const normalizedSummary = this.cleanSummaryForStorage(summary)
		const bulletLikeLines = normalizedSummary
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.filter((line) => !/^evaluator\s+/i.test(line))
			.filter((line) => !/^summary:/i.test(line))
			.filter((line) => !/^result:/i.test(line))
			.filter((line) => !/^source:/i.test(line))
			.map((line) =>
				line
					.replace(/^[-*]\s+/, "")
					.replace(/^\d+[.)]\s+/, "")
					.trim(),
			)
			.filter((line) => line.length >= MIN_BULLET_LENGTH)
			.filter((line) => !this.crossesTruthBoundary(line))

		const sentenceCandidates = normalizedSummary
			.split(/(?<=[.!?])\s+/)
			.map((sentence) => sentence.trim())
			.filter((sentence) => sentence.length >= MIN_BULLET_LENGTH)
			.filter((sentence) => !this.crossesTruthBoundary(sentence))

		const candidates = bulletLikeLines.length > 0 ? bulletLikeLines : sentenceCandidates
		return Array.from(new Set(candidates)).slice(0, MAX_CANDIDATE_BULLETS)
	}

	private crossesTruthBoundary(summary: string): boolean {
		const lower = summary.toLowerCase()
		return [
			"need clarification",
			"missing context",
			"insufficient context",
			"unclear",
			"ambiguous",
			"unknown",
			"not sure",
			"maybe",
			"probably",
			"hypothesis",
			"conflict",
			"contradict",
			"incompatible",
			"retry",
			"follow-up",
			"follow up",
			"нужно уточнение",
			"требуется уточнение",
			"нужна верификация",
			"не хватает контекста",
			"недостаточно контекста",
			"неясно",
			"не ясно",
			"неоднознач",
			"неизвестно",
			"не уверен",
			"возможно",
			"вероятно",
			"гипотеза",
			"конфликт",
			"противореч",
		].some((marker) => lower.includes(marker))
	}

	private cleanSummaryForStorage(summary: string): string {
		return summary.replace(/\r/g, "").trim()
	}

	private normalizeList(values?: string[]): string[] {
		return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
	}

	private sanitizeTaskId(taskId: string): string {
		return taskId.replace(/[^a-zA-Z0-9_-]+/g, "_")
	}

	private async readIfExists(filePath: string): Promise<string | undefined> {
		try {
			return await fs.readFile(filePath, "utf8")
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code
			if (code === "ENOENT" || code === "ENOTDIR") {
				return undefined
			}
			throw error
		}
	}

	private toRelative(workspacePath: string, filePath: string): string {
		return path.relative(workspacePath, filePath).replace(/\\/g, "/")
	}

	private normalizeDocument(content: string): string {
		return content.replace(/\r\n/g, "\n")
	}

	private ensureTrailingNewline(content: string): string {
		return content.endsWith("\n") ? content : `${content}\n`
	}

	private escapeRegex(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	}
}
