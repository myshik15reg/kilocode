// kilocode_change - new file
import path from "path"
import type { CodeEntity, ExtractionResult, ILanguageExtractor } from "../interfaces"

/**
 * Minimal graph extractor for plain text files.
 *
 * MVP behavior: create a file entity and no relationships (Neo4j is intentionally opt-in).
 * The caller should still have deleted prior entities for the file path.
 */
export class PlainTextGraphExtractor implements ILanguageExtractor {
	constructor(private readonly languageLabel: string = "plainText") {}

	async extract(_code: string, _filePath: string): Promise<ExtractionResult> {
		const filePath = _filePath
		const fileEntity: CodeEntity = {
			id: `file:${filePath}`,
			type: "file",
			name: path.basename(filePath),
			filePath,
			line: 1,
			language: this.languageLabel,
		}
		return { entities: [fileEntity], relationships: [] }
	}
}
