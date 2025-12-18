/**
 * Relationship Indexer
 * 
 * Coordinates the indexing of code relationships into Neo4j.
 * Works with Tree-sitter parser to extract entities and relationships,
 * then stores them in Neo4j graph database.
 */

import { RelationshipExtractor } from "./relationship-extractor"
import { Neo4jGraphService } from "./graph-service"
import type { CodeEntity, CodeRelationship } from "./interfaces"
import Parser from "web-tree-sitter"

type SyntaxNode = ReturnType<ReturnType<Parser['parse']>['rootNode']['descendantForIndex']>

export interface IndexingProgress {
	filesProcessed: number
	entitiesCreated: number
	relationshipsCreated: number
	errors: Array<{ filePath: string; error: string }>
}

export class RelationshipIndexer {
	private extractor: RelationshipExtractor
	private graphService: Neo4jGraphService

	constructor(graphService?: Neo4jGraphService) {
		this.extractor = new RelationshipExtractor()
		this.graphService = graphService || new Neo4jGraphService()
	}

	/**
	 * Index a single file
	 * @param filePath File path (relative to workspace)
	 * @param content File content
	 * @param ast Tree-sitter AST
	 * @param language Programming language
	 */
	public async indexFile(
		filePath: string,
		content: string,
		ast: SyntaxNode,
		language: string
	): Promise<{ entities: number; relationships: number }> {
		try {
			// Delete existing entities for this file
			await this.graphService.deleteEntitiesByFilePath(filePath)

			// Extract entities and relationships
			const { entities, relationships } = await this.extractor.extract(
				content,
				filePath,
				language
			)

			// Index to Neo4j
			if (entities.length > 0) {
				await this.graphService.bulkCreateEntities(entities)
			}

			if (relationships.length > 0) {
				await this.graphService.bulkCreateRelationships(relationships)
			}

			return {
				entities: entities.length,
				relationships: relationships.length,
			}
		} catch (error) {
			throw new Error(
				`Failed to index file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Index multiple files in batch
	 *
	 * Efficiently indexes multiple files by extracting entities and relationships,
	 * then bulk-inserting them into Neo4j. Processes files in batches of 1000
	 * to avoid memory issues.
	 *
	 * @param files - Array of file data to index
	 * @param files[].filePath - Relative file path from workspace root
	 * @param files[].content - File content as string
	 * @param files[].ast - Tree-sitter AST root node
	 * @param files[].language - Programming language identifier
	 * @param onProgress - Optional callback for progress updates
	 *
	 * @returns Promise<IndexingProgress> - Indexing statistics including errors
	 *
	 * @example
	 * ```typescript
	 * const indexer = new RelationshipIndexer()
	 * const progress = await indexer.indexFiles(
	 *   files,
	 *   (p) => console.log(`Processed ${p.filesProcessed}/${files.length}`)
	 * )
	 * console.log(`Created ${progress.entitiesCreated} entities`)
	 * ```
	 */
	public async indexFiles(
		files: Array<{
			filePath: string
			content: string
			ast: SyntaxNode
			language: string
		}>,
		onProgress?: (progress: IndexingProgress) => void
	): Promise<IndexingProgress> {
		const progress: IndexingProgress = {
			filesProcessed: 0,
			entitiesCreated: 0,
			relationshipsCreated: 0,
			errors: [],
		}

		const allEntities: CodeEntity[] = []
		const allRelationships: CodeRelationship[] = []

		// Extract from all files first
		for (const file of files) {
			try {
				// Delete existing entities for this file
				await this.graphService.deleteEntitiesByFilePath(file.filePath)

				// Extract
				const { entities, relationships } = await this.extractor.extract(
					file.content,
					file.filePath,
					file.language
				)

				allEntities.push(...entities)
				allRelationships.push(...relationships)

				progress.filesProcessed++
				progress.entitiesCreated += entities.length
				progress.relationshipsCreated += relationships.length

				onProgress?.(progress)
			} catch (error) {
				progress.errors.push({
					filePath: file.filePath,
					error: error instanceof Error ? error.message : String(error),
				})
			}
		}

		// Bulk index to Neo4j
		try {
			if (allEntities.length > 0) {
				// Process in batches of 1000 to avoid memory issues
				const batchSize = 1000
				for (let i = 0; i < allEntities.length; i += batchSize) {
					const batch = allEntities.slice(i, i + batchSize)
					await this.graphService.bulkCreateEntities(batch)
				}
			}

			if (allRelationships.length > 0) {
				// Process in batches of 1000
				const batchSize = 1000
				for (let i = 0; i < allRelationships.length; i += batchSize) {
					const batch = allRelationships.slice(i, i + batchSize)
					await this.graphService.bulkCreateRelationships(batch)
				}
			}
		} catch (error) {
			progress.errors.push({
				filePath: "bulk_indexing",
				error: `Bulk indexing failed: ${error instanceof Error ? error.message : String(error)}`,
			})
		}

		return progress
	}

	/**
	 * Delete index for specific files
	 * @param filePaths Array of file paths to delete
	 */
	public async deleteFiles(filePaths: string[]): Promise<void> {
		if (filePaths.length === 0) return

		await this.graphService.deleteEntitiesByMultipleFilePaths(filePaths)
	}

	/**
	 * Clear entire index
	 */
	public async clearIndex(): Promise<void> {
		await this.graphService.clearAll()
	}

	/**
	 * Get indexing statistics
	 */
	public async getStatistics(): Promise<{
		totalEntities: number
		totalRelationships: number
		entitiesByType: Record<string, number>
		relationshipsByType: Record<string, number>
	}> {
		return await this.graphService.getStatistics()
	}

	/**
	 * Check if indexer is ready
	 */
	public async isReady(): Promise<boolean> {
		return await this.graphService.isInitialized()
	}
}