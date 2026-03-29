import { CodeIndexSearchService } from "../search-service"

vi.mock("../..//neo4j/hybrid-search-service", async () => {
	const actual = await vi.importActual("../../neo4j/hybrid-search-service")
	return actual
})

describe("CodeIndexSearchService", () => {
	beforeEach(() => {
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
					codeChunk: "Функция Сумма(А, Б) Экспорт",
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

		const results = await service.searchIndex("1C функция сумма")

		expect(results[0].filePath).toBe("src/module.bsl")
		expect(results[1].filePath).toBe("src/calc.py")
	})
})
