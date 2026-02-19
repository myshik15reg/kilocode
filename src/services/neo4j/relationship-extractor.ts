import path from "path"
import { TreeSitterGraphExtractor } from "./extractors/tree-sitter-graph-extractor"
import { PlainTextGraphExtractor } from "./extractors/plain-text-graph-extractor"
import { XmlGraphExtractor } from "./extractors/xml-graph-extractor"
import type { ExtractionResult } from "./interfaces"
import { getGraphQueryForLanguage, normalizeLanguageId, resolveLanguageConfig } from "../tree-sitter/languageParser"
import { resolveFileTypeByPath } from "../file-types/file-type-registry"
import type { ILanguageExtractor } from "./interfaces"

export class RelationshipExtractor {
	// kilocode_change: 2026-01-24 - cache graph extractors per language
	private readonly extractors = new Map<string, ILanguageExtractor>()

	/**
	 * Определяет язык по расширению файла
	 */
	detectLanguage(filePath: string): string | null {
		const fileType = resolveFileTypeByPath(filePath)
		if (!fileType || !fileType.indexing.graph) {
			return null
		}

		if (fileType.contentKind === "xml") {
			return "xml"
		}

		if (fileType.contentKind === "plainText") {
			return "plainText"
		}

		const ext = path.extname(filePath).toLowerCase().slice(1)
		const resolved = resolveLanguageConfig(ext)
		if (!resolved || "skip" in resolved) {
			return fileType.languageId ?? null
		}
		return resolved.languageId
	}

	/**
	 * Извлекает entities и relationships из кода
	 */
	async extract(code: string, filePath: string, language?: string): Promise<ExtractionResult> {
		const lang = this.normalizeGraphLanguageId(language) ?? this.detectLanguage(filePath)

		if (!lang) {
			throw new Error(`Unable to detect language for file: ${filePath}`)
		}

		const extractor = await this.getExtractor(lang)
		return extractor.extract(code, filePath)
	}

	private normalizeGraphLanguageId(language?: string): string | null {
		if (!language) return null
		const normalized = language.trim().toLowerCase().replace(/^\./, "")
		if (!normalized) return null
		if (normalized === "1c") return "onec"
		if (normalized === "xml") return "xml"
		if (normalized === "plaintext" || normalized === "plain_text" || normalized === "plain-text") return "plainText"
		return normalizeLanguageId(normalized) ?? null
	}

	/**
	 * Получает экстрактор для языка
	 */
	private async getExtractor(languageId: string): Promise<ILanguageExtractor> {
		const cached = this.extractors.get(languageId)
		if (cached) {
			return cached
		}

		if (languageId === "xml") {
			const extractor = new XmlGraphExtractor()
			this.extractors.set(languageId, extractor)
			return extractor
		}

		if (languageId === "plainText") {
			const extractor = new PlainTextGraphExtractor("plainText")
			this.extractors.set(languageId, extractor)
			return extractor
		}

		const query = getGraphQueryForLanguage(languageId)
		if (!query) {
			throw new Error(`No extractor available for language: ${languageId}`)
		}

		const extractor = new TreeSitterGraphExtractor(languageId, query)
		try {
			await extractor.initialize()
			this.extractors.set(languageId, extractor)
			return extractor
		} catch (error) {
			// Graceful fallback (critical for 1C: tree-sitter-onec.wasm may be missing in runtime).
			const fallback = new PlainTextGraphExtractor(languageId)
			this.extractors.set(languageId, fallback)
			return fallback
		}
	}
}
