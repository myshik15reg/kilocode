// src/services/code-index/processors/graph-processor.ts

import * as fs from "fs/promises"
import * as path from "path"
import { Neo4jGraphService } from "../graph-service"
// import { ICodeParser, CodeSymbol } from '../../../code-symbols/types';
export interface ICodeParser {
	parse(filePath: string, fileContent: string): Promise<CodeSymbol[]>
	isSupportedFile(filePath: string): boolean
}
export interface CodeSymbol {
	name: string
	kind: string
	filePath: string
	range: any
	calls?: any[]
}
import { ICacheManager } from "../interfaces/cache"
import { createHash } from "crypto"

export class GraphProcessor {
	constructor(
		private readonly graphService: Neo4jGraphService,
		private readonly parser: ICodeParser,
		private readonly cacheManager: ICacheManager,
	) {}

	public async processFile(filePath: string, fileContent: string): Promise<void> {
		const hash = createHash("sha256").update(fileContent).digest("hex")
		if (this.cacheManager.getNeo4jHash(filePath) === hash) {
			return
		}

		const symbols = await this.parser.parse(filePath, fileContent)

		for (const symbol of symbols) {
			const nodeId = `${filePath}#${symbol.name}`
			await this.graphService.addOrUpdateNode({
				id: nodeId,
				labels: ["Code", symbol.kind],
				properties: {
					name: symbol.name,
					filePath: symbol.filePath,
					kind: symbol.kind,
					range: symbol.range,
				},
			})

			// Пример добавления связей (например, вызовы функций)
			// Для этого потребуется дополнительная логика в парсере
			if (symbol.calls) {
				for (const call of symbol.calls) {
					const targetNodeId = `${call.filePath}#${call.name}`
					await this.graphService.addEdge({
						sourceId: nodeId,
						targetId: targetNodeId,
						type: "CALLS",
					})
				}
			}
		}
		this.cacheManager.updateNeo4jHash(filePath, hash)
	}

	public async scanDirectory(directory: string): Promise<void> {
		const entries = await fs.readdir(directory, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				await this.scanDirectory(fullPath)
			} else if (this.parser.isSupportedFile(fullPath)) {
				try {
					const content = await fs.readFile(fullPath, "utf-8")
					await this.processFile(fullPath, content)
				} catch (error) {
					console.error(`Failed to process file ${fullPath}:`, error)
				}
			}
		}
	}
}
