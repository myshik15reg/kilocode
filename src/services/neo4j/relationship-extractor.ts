import { OneCExtractor } from './extractors/onec-extractor'
import type { ExtractionResult, ILanguageExtractor } from './interfaces'
import * as path from 'path'

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
	'.bsl': '1c',
	'.os': '1c',
	// Добавить другие языки при необходимости
}

export class RelationshipExtractor {
	/**
	 * Определяет язык по расширению файла
	 */
	detectLanguage(filePath: string): string | null {
		const ext = path.extname(filePath).toLowerCase()
		return EXTENSION_TO_LANGUAGE[ext] || null
	}

	/**
	 * Извлекает entities и relationships из кода
	 */
	async extract(
		code: string,
		filePath: string,
		language?: string
	): Promise<ExtractionResult> {
		const lang = language || this.detectLanguage(filePath)

		if (!lang) {
			throw new Error(`Unable to detect language for file: ${filePath}`)
		}

		const extractor = this.getExtractor(lang)
		if (!extractor) {
			throw new Error(`No extractor available for language: ${lang}`)
		}

		return extractor.extract(code, filePath)
	}

	/**
	 * Получает экстрактор для языка
	 */
	private getExtractor(language: string): ILanguageExtractor | null {
		switch (language.toLowerCase()) {
			case '1c':
			case 'bsl':
				return new OneCExtractor()
			// Добавить другие языки здесь
			default:
				return null
		}
	}
}