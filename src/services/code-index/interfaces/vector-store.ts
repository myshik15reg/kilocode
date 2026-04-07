/**
 * Interface for vector database clients
 */
import type { RetrievalMode } from "@roo-code/types"

export type PointStruct = {
	id: string
	vector: number[]
	payload: Record<string, any>
}

export interface IVectorStore {
	initialize(): Promise<boolean>
	upsertPoints(points: PointStruct[]): Promise<void>
	getPointsByFilePaths(filePaths: string[]): Promise<PointStruct[]>
	search(
		queryVector: number[],
		directoryPrefix?: string,
		minScore?: number,
		maxResults?: number,
	): Promise<VectorStoreSearchResult[]>
	deletePointsByFilePath(filePath: string): Promise<void>
	deletePointsByMultipleFilePaths(filePaths: string[]): Promise<void>
	clearCollection(): Promise<void>
	deleteCollection(): Promise<void>
	collectionExists(): Promise<boolean>
	hasIndexedData(): Promise<boolean>
	markIndexingComplete(): Promise<void>
	markIndexingIncomplete(): Promise<void>
	dispose?(): Promise<void>
}

export type RetrievalQueryClass =
	| "symbol_lookup"
	| "implementation_search"
	| "impact_analysis"
	| "workflow_docs"
	| "broad_repo_research"

export type RetrievalStage = "semantic" | "semantic_rerank" | "semantic_graph" | "semantic_graph_rerank"

export type RetrievalSourceKind = "code" | "test" | "markdown" | "config" | "workflow" | "protocol"

export interface RetrievalScoreBreakdown {
	total: number
	semantic?: number
	lexical?: number
	rerank?: number
	graph?: number
}

export interface RetrievalSource {
	type: "semantic" | "lexical" | "graph" | "rerank"
	label: string
	score?: number
	details?: string
}

export interface VectorStoreSearchResult {
	id: string | number
	score: number
	payload?: Payload | null
	filePath: string
	codeChunk: string
	startLine: number
	endLine: number
	retrievalPath?: string[]
	vectorScore?: number
	lexicalScore?: number
	rerankScore?: number
	sources?: RetrievalSource[]
	warnings?: string[]
	postprocessUsed?: boolean
	retrievalStage?: RetrievalStage
	sourceKind?: RetrievalSourceKind
	queryRewrite?: string
	compressionApplied?: boolean
	citationLabel?: string
	scoreBreakdown?: RetrievalScoreBreakdown
	retrievalConfidence?: number
	confidence?: number
}

export interface CodeIndexStructuredSearchResult {
	query: string
	queryClass: RetrievalQueryClass
	queryRewrite?: string
	results: VectorStoreSearchResult[]
	keyPoints: string[]
	sources: RetrievalSource[]
	warnings: string[]
	postprocessUsed: boolean
	retrievalMode: RetrievalMode
	retrievalConfidence: number
	compressionApplied: boolean
	adaptiveExpansionUsed?: boolean
	adaptiveCutoffApplied?: boolean
}

export interface Payload {
	filePath: string
	codeChunk: string
	startLine: number
	endLine: number
	[key: string]: any
}
