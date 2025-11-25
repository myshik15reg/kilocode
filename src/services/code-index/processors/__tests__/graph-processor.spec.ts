import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"
import { GraphProcessor } from "../graph-processor"
import { Neo4jGraphService } from "../../graph-service"
// import { ICodeParser, CodeSymbol } from '../../../code-symbols/types';
interface ICodeParser {
	parse(filePath: string, fileContent: string): Promise<CodeSymbol[]>
	isSupportedFile(filePath: string): boolean
}
interface CodeSymbol {
	name: string
	kind: string
	filePath: string
	range: any
}
import { ICacheManager } from "../../interfaces/cache"
import { createHash } from "crypto"

vi.mock("../../graph-service")
vi.mock("../parser")
vi.mock("../../interfaces/cache")

describe("GraphProcessor", () => {
	let graphProcessor: GraphProcessor
	let mockGraphService: any
	let mockParser: any
	let mockCacheManager: any

	beforeEach(() => {
		mockGraphService = new (Neo4jGraphService as any)()
		mockParser = {
			parse: vi.fn(),
			isSupportedFile: vi.fn().mockReturnValue(true),
		} as ICodeParser
		mockCacheManager = {
			getNeo4jHash: vi.fn(),
			updateNeo4jHash: vi.fn(),
			getHash: vi.fn(),
			updateHash: vi.fn(),
			deleteHash: vi.fn(),
			getAllHashes: vi.fn(),
			deleteNeo4jHash: vi.fn(),
		} as ICacheManager

		graphProcessor = new GraphProcessor(mockGraphService, mockParser, mockCacheManager)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	test("should process a file and add symbols to the graph", async () => {
		const filePath = "/path/to/file.ts"
		const fileContent = "const x = 1;"
		const hash = createHash("sha256").update(fileContent).digest("hex")
		const symbols: CodeSymbol[] = [
			{
				name: "x",
				kind: "variable",
				filePath,
				range: { start: { line: 0, character: 6 }, end: { line: 0, character: 7 } },
			},
		]

		;(mockCacheManager.getNeo4jHash as any).mockReturnValue(null)
		;(mockParser.parse as any).mockResolvedValue(symbols)

		await graphProcessor.processFile(filePath, fileContent)

		expect(mockCacheManager.getNeo4jHash).toHaveBeenCalledWith(filePath)
		expect(mockParser.parse).toHaveBeenCalledWith(filePath, fileContent)
		expect(mockGraphService.addOrUpdateNode).toHaveBeenCalledTimes(1)
		expect(mockGraphService.addOrUpdateNode).toHaveBeenCalledWith({
			id: `${filePath}#x`,
			labels: ["variable"],
			properties: {
				name: "x",
				filePath,
				range: { start: { line: 0, character: 6 }, end: { line: 0, character: 7 } },
			},
		})
		expect(mockCacheManager.updateNeo4jHash).toHaveBeenCalledWith(filePath, hash)
	})

	test("should skip processing if file hash is unchanged", async () => {
		const filePath = "/path/to/file.ts"
		const fileContent = "const x = 1;"
		const hash = createHash("sha256").update(fileContent).digest("hex")

		;(mockCacheManager.getNeo4jHash as any).mockReturnValue(hash)

		await graphProcessor.processFile(filePath, fileContent)

		expect(mockParser.parse).not.toHaveBeenCalled()
		expect(mockGraphService.addOrUpdateNode).not.toHaveBeenCalled()
		expect(mockCacheManager.updateNeo4jHash).not.toHaveBeenCalled()
	})
})
