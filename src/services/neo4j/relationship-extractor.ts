import path from 'path'
import { TreeSitterGraphExtractor } from './extractors/tree-sitter-graph-extractor'
import type { ExtractionResult } from './interfaces'
import { getGraphQueryForLanguage, normalizeLanguageId, resolveLanguageConfig } from '../tree-sitter/languageParser'

export class RelationshipExtractor {
	// kilocode_change: 2026-01-24 - cache graph extractors per language
	private readonly extractors = new Map<string, TreeSitterGraphExtractor>()

	/**
	 * Определяет язык по расширению файла
	 */
	detectLanguage(filePath: string): string | null {
		const ext = path.extname(filePath).toLowerCase().slice(1)
		const resolved = resolveLanguageConfig(ext)
		if (!resolved || 'skip' in resolved) {
			return null
		}
		return resolved.languageId
	}

	/**
	 * Извлекает entities и relationships из кода
	 */
	async extract(
		code: string,
		filePath: string,
		language?: string
	): Promise<ExtractionResult> {
		const lang = language ? normalizeLanguageId(language) : this.detectLanguage(filePath)

		if (!lang) {
			throw new Error(`Unable to detect language for file: ${filePath}`)
		}

		const extractor = await this.getExtractor(lang)
		return extractor.extract(code, filePath)
	}

	/**
	 * Получает экстрактор для языка
	 */
	private async getExtractor(languageId: string): Promise<TreeSitterGraphExtractor> {
		const cached = this.extractors.get(languageId)
		if (cached) {
			return cached
		}

		const query = getGraphQueryForLanguage(languageId)
		if (!query) {
			throw new Error(`No extractor available for language: ${languageId}`)
		}

		const extractor = new TreeSitterGraphExtractor(languageId, query)
		await extractor.initialize()
		this.extractors.set(languageId, extractor)
		return extractor
	}
}
