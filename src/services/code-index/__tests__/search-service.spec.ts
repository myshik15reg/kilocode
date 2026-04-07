import { TelemetryService } from "@roo-code/telemetry"
import { CodeIndexSearchService } from "../search-service"

vi.mock("../..//neo4j/hybrid-search-service", async () => {
	const actual = await vi.importActual("../../neo4j/hybrid-search-service")
	return actual
})

describe("CodeIndexSearchService", () => {
	beforeEach(() => {
		if (!TelemetryService.hasInstance()) {
			TelemetryService.createInstance([])
		}

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ data: [{ index: 0, relevance_score: 0.95 }] }),
			}),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("uses reranker path without Neo4j and preserves semantic baseline fallback", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn().mockResolvedValue([
				{
					id: "1",
					filePath: "src/app.ts",
					codeChunk: "function app() {}",
					startLine: 1,
					endLine: 1,
					score: 0.9,
					payload: {},
				},
			]),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: false,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: {
				enabled: true,
				baseUrl: "http://localhost:8000",
				modelId: "bge-reranker-v2-m3",
				timeoutMs: 1000,
				candidateLimit: 10,
				topK: 5,
				apiKey: undefined,
			},
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		)

		const results = await service.searchIndex("app")

		expect(results).toHaveLength(1)
		expect(results[0].filePath).toBe("src/app.ts")
		expect(results[0].retrievalPath).toContain("workspace")
		expect(results[0].sources?.map((source) => source.type)).toContain("semantic")
		expect(vectorStore.search).toHaveBeenCalled()
	})

	it("boosts semantic results when query contains a language hint", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn().mockResolvedValue([
				{
					id: "py",
					filePath: "src/calc.py",
					codeChunk: "def add(a, b): return a + b",
					startLine: 1,
					endLine: 1,
					score: 0.95,
					payload: {},
				},
				{
					id: "bsl",
					filePath: "src/module.bsl",
					codeChunk: "Function Sum(?, ?) Export",
					startLine: 1,
					endLine: 1,
					score: 0.82,
					payload: {},
				},
			]),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: false,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: {
				enabled: false,
				baseUrl: undefined,
				modelId: undefined,
				timeoutMs: 1000,
				candidateLimit: 10,
				topK: 5,
				apiKey: undefined,
			},
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		)

		const results = await service.searchIndex("1C function sum")

		expect(results[0].filePath).toBe("src/module.bsl")
		expect(results[0].lexicalScore).toBeGreaterThan(0)
		expect(results[1].filePath).toBe("src/calc.py")
	})

	it("returns a structured retrieval contract with key points and warnings", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn().mockResolvedValue([
				{
					id: "1",
					filePath: "src/config/env.ts",
					codeChunk: "export const API_BASE_URL = process.env.API_BASE_URL",
					startLine: 3,
					endLine: 3,
					score: 0.88,
					payload: {},
				},
			]),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: false,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		)

		const result = await service.searchIndexDetailed("API_BASE_URL env var")

		expect(result.keyPoints[0]).toContain("src/config/env.ts:3-3")
		expect(result.sources.some((source) => source.type === "semantic")).toBe(true)
		expect(result.postprocessUsed).toBe(true)
		expect(result.results[0].retrievalPath?.join(" > ")).toContain("src")
	})

	it("respects retrieval policy and query classifier debug warnings from context proxy", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn().mockResolvedValue([
				{
					id: "1",
					filePath: "docs/memory-bank.md",
					codeChunk: "Memory bank workflow notes",
					startLine: 1,
					endLine: 3,
					score: 0.77,
					payload: {},
				},
			]),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: false,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
			getContextProxy: () => ({
				getGlobalState: (key: string) => {
					if (key === "retrievalPolicy") return "semantic_only"
					if (key === "queryClassifierDebug") return true
					return undefined
				},
			}),
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		)

		const result = await service.searchIndexDetailed("configuration")

		expect(result.retrievalMode).toBe("semantic_only")
		expect(result.warnings).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Query classified as workflow_docs"),
				expect.stringContaining("Query rewritten for workflow_docs"),
			]),
		)
	})

	it("prefers a request-level retrieval mode override over the global policy", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = { search: vi.fn() }
		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: true,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
			getContextProxy: () => ({
				getGlobalState: (key: string) => {
					if (key === "retrievalPolicy") return "semantic_only"
					return undefined
				},
			}),
		}
		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		) as any
		service.hybridSearchService = {
			isAvailable: vi.fn().mockResolvedValue(true),
			search: vi.fn().mockResolvedValue([
				{
					id: "hy-1",
					filePath: "src/module.ts",
					codeChunk: "export function loadConfig() {}",
					startLine: 10,
					endLine: 12,
					score: 0.91,
					semanticScore: 0.82,
					graphScore: 0.61,
					combinedScore: 0.91,
					relatedEntities: [],
					payload: {},
				},
			]),
		}

		const result = await service.searchIndexDetailed({
			query: "load config",
			directoryPrefix: "src",
			retrievalMode: "hybrid",
			taskId: "child-1",
		})

		expect(result.retrievalMode).toBe("hybrid")
		expect(service.hybridSearchService.search).toHaveBeenCalledWith(
			"load config",
			expect.objectContaining({ directoryPrefix: "src" }),
		)
	})

	it("annotates hybrid search results with structured retrieval metadata", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = { search: vi.fn() }
		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: true,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
		}
		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		) as any
		service.hybridSearchService = {
			search: vi.fn().mockResolvedValue([
				{
					id: "hy-1",
					filePath: "src/module.ts",
					codeChunk: "export function loadConfig() {}",
					startLine: 10,
					endLine: 12,
					score: 0.91,
					semanticScore: 0.82,
					graphScore: 0.61,
					combinedScore: 0.91,
					relatedEntities: [],
					payload: {},
				},
			]),
		}

		const results = await service.hybridSearch("where used loadConfig")

		expect(results[0].id).toBe("hy-1")
		expect(results[0].retrievalPath).toContain("workspace")
		expect(results[0].vectorScore).toBe(0.82)
		expect(results[0].sources?.map((source: any) => source.type)).toEqual(
			expect.arrayContaining(["semantic", "graph"]),
		)
	})
	it("does not poison global state when structured search fails", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn().mockRejectedValue(new Error("vector store unavailable")),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: false,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		)

		await expect(service.searchIndexDetailed("find settings")).rejects.toThrow("vector store unavailable")
		expect(stateManager.setSystemState).not.toHaveBeenCalledWith("Error", expect.any(String))
	})

	it("does not poison global state when hybrid search fails", async () => {
		const embedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		const vectorStore = {
			search: vi.fn(),
		}

		const configManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isNeo4jEnabled: true,
			currentSearchMinScore: 0.1,
			currentSearchMaxResults: 5,
			currentRerankConfig: { enabled: false },
		}

		const stateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({ systemStatus: "Indexed" }),
			setSystemState: vi.fn(),
		}

		const service = new CodeIndexSearchService(
			configManager as any,
			stateManager as any,
			embedder as any,
			vectorStore as any,
		) as any
		service.hybridSearchService = {
			search: vi.fn().mockRejectedValue(new Error("hybrid unavailable")),
		}

		await expect(service.hybridSearch("find callers")).rejects.toThrow("hybrid unavailable")
		expect(stateManager.setSystemState).not.toHaveBeenCalledWith("Error", expect.any(String))
	})
})
