// kilocode_change - new file
import path from "path"
import type { CodeEntity, ExtractionResult, ILanguageExtractor } from "../interfaces"
import { parseXml } from "../../../utils/xml"

/**
 * Minimal graph extractor for XML-like files.
 *
 * MVP behavior:
 * - Validate XML parseability (best-effort)
 * - Emit a file entity, but no relationships yet (schema-specific extractors are staged later)
 */
export class XmlGraphExtractor implements ILanguageExtractor {
	async extract(code: string, _filePath: string): Promise<ExtractionResult> {
		const filePath = _filePath
		try {
			// Best-effort parse to ensure invalid XML doesn't crash the pipeline.
			parseXml(code)
		} catch {
			// Swallow parse errors in MVP; we still keep the graph consistent by deleting old entities.
		}

		const fileEntity: CodeEntity = {
			id: `file:${filePath}`,
			type: "file",
			name: path.basename(filePath),
			filePath,
			line: 1,
			language: "xml",
		}
		return { entities: [fileEntity], relationships: [] }
	}
}
