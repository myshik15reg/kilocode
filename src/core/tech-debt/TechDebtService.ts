// kilocode_change - new file
import crypto from "crypto"

import type { ProviderSettings, TechDebtItem, TechDebtStatus } from "@roo-code/types"

import { singleCompletionHandler } from "../../utils/single-completion-handler"
import type { HelperRouteSelection } from "../helper-routing/HelperModelRouter"

export interface ExtractTechDebtParams {
	sourceTaskId: string
	rootTaskId: string
	task: string
	completionSummary: string
	existingItems?: TechDebtItem[]
	recentContext?: string
	config: ProviderSettings
}

export class TechDebtService {
	static async extractItems(params: ExtractTechDebtParams): Promise<TechDebtItem[]> {
		const prompt = this.buildExtractionPrompt(params)
		const raw = await singleCompletionHandler(params.config, prompt)
		const parsed = this.parseExtractionResponse(raw, params)
		return this.dedupeItems(params.existingItems ?? [], parsed)
	}

	static buildExtractionPrompt(params: Omit<ExtractTechDebtParams, "config">): string {
		return [
			"Extract only out-of-scope technical debt findings from the finished task.",
			"Do not include bugs or tasks that were already fixed or clearly in scope.",
			'Return strict JSON only with shape: { "items": [{ "title": string, "summary": string, "category": "hardcode"|"performance"|"architecture"|"cleanup"|"test_gap"|"docs_gap"|"other", "severity": "low"|"medium"|"high", "evidence": string[] }] }',
			"Use concise summaries and 1-3 evidence strings per item.",
			'If there is no clear out-of-scope technical debt, return { "items": [] }.',
			`Task: ${params.task}`,
			`Completion summary: ${params.completionSummary}`,
			params.recentContext ? `Recent context: ${params.recentContext}` : undefined,
		]
			.filter(Boolean)
			.join("\n\n")
	}

	static parseExtractionResponse(raw: string, params: Omit<ExtractTechDebtParams, "config">): TechDebtItem[] {
		const parsed = this.parseJsonSafely(raw)
		const items: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []
		const createdAt = Date.now()

		const mappedItems = items
			.filter((item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
			.map((item: Record<string, unknown>): TechDebtItem | undefined => {
				const title = this.toCleanString(item.title)
				const summary = this.toCleanString(item.summary)
				const evidence = Array.isArray(item.evidence)
					? item.evidence
							.map((entry: unknown) => this.toCleanString(entry))
							.filter(Boolean)
							.slice(0, 3)
					: []

				if (!title || !summary) {
					return undefined
				}

				return {
					id: crypto.randomUUID(),
					sourceTaskId: params.sourceTaskId,
					rootTaskId: params.rootTaskId,
					title,
					summary,
					category: this.normalizeCategory(this.toCleanString(item.category)),
					severity: this.normalizeSeverity(this.toCleanString(item.severity)),
					status: "suggested" satisfies TechDebtStatus,
					evidence,
					createdAt,
				} satisfies TechDebtItem
			})

		return mappedItems.filter((item: TechDebtItem | undefined): item is TechDebtItem => Boolean(item))
	}

	static dedupeItems(existingItems: TechDebtItem[], incomingItems: TechDebtItem[]): TechDebtItem[] {
		const seen = new Set(existingItems.map((item) => this.getDedupeKey(item)))
		const next: TechDebtItem[] = []

		for (const item of incomingItems) {
			const key = this.getDedupeKey(item)
			if (seen.has(key)) {
				continue
			}
			seen.add(key)
			next.push(item)
		}

		return next
	}

	static updateStatus(items: TechDebtItem[], itemId: string, status: TechDebtStatus): TechDebtItem[] {
		return items.map((item) => (item.id === itemId ? { ...item, status } : item))
	}

	static getConvertToTaskPrompt(item: TechDebtItem): string {
		const evidence = item.evidence?.length ? `\nEvidence:\n- ${item.evidence.join("\n- ")}` : ""
		return `Tech debt follow-up: ${item.title}\n\n${item.summary}${evidence}`
	}

	static describeRoute(route: HelperRouteSelection): string {
		return `${route.job}:${route.source}:${route.provider}:${route.modelId ?? "unknown"}`
	}

	private static parseJsonSafely(raw: string): any {
		const trimmed = raw.trim()
		try {
			return JSON.parse(trimmed)
		} catch {
			const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
			if (fenced?.[1]) {
				return JSON.parse(fenced[1].trim())
			}
			return { items: [] }
		}
	}

	private static getDedupeKey(item: Pick<TechDebtItem, "title" | "summary" | "evidence" | "rootTaskId">): string {
		return [
			item.rootTaskId,
			this.normalizeText(item.title),
			this.normalizeText(item.summary),
			this.normalizeText((item.evidence ?? []).join(" ")),
		].join("::")
	}

	private static normalizeText(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9а-яё]+/gi, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 200)
	}

	private static toCleanString(value: unknown): string {
		return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
	}

	private static normalizeCategory(value: string): TechDebtItem["category"] {
		return ["hardcode", "performance", "architecture", "cleanup", "test_gap", "docs_gap", "other"].includes(value)
			? (value as TechDebtItem["category"])
			: "other"
	}

	private static normalizeSeverity(value: string): TechDebtItem["severity"] {
		return ["low", "medium", "high"].includes(value) ? (value as TechDebtItem["severity"]) : "medium"
	}
}
