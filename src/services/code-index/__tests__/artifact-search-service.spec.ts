import fs from "fs/promises"
import os from "os"
import path from "path"

import { ArtifactSearchService } from "../ArtifactSearchService"

describe("ArtifactSearchService", () => {
	let tempRoot: string

	beforeEach(async () => {
		tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-search-"))
	})

	afterEach(async () => {
		await fs.rm(tempRoot, { recursive: true, force: true })
	})

	it("finds memory-bank and protocol artifacts with line-level citations", async () => {
		await fs.mkdir(path.join(tempRoot, ".kilocode", "memory-bank"), { recursive: true })
		await fs.mkdir(path.join(tempRoot, ".protocols", "2026-04-09-demo"), { recursive: true })
		await fs.writeFile(
			path.join(tempRoot, ".kilocode", "memory-bank", "context.md"),
			"# Context\nAgent memory promotion stays curated.\nCompact handoff packets reduce prompt bloat.\n",
			"utf8",
		)
		await fs.writeFile(
			path.join(tempRoot, ".protocols", "2026-04-09-demo", "plan.md"),
			"# Plan\n1. Add artifact retrieval first for protocol queries.\n",
			"utf8",
		)

		const service = new ArtifactSearchService(tempRoot)
		const result = await service.searchDetailed({ query: "memory promotion protocol" })

		expect(result.queryClass).toBe("workflow_docs")
		expect(result.results.length).toBeGreaterThan(0)
		expect(result.results[0].citationLabel).toBeDefined()
		expect(
			result.results.some((entry) =>
				entry.filePath.endsWith(path.join(".kilocode", "memory-bank", "context.md")),
			),
		).toBe(true)
		expect(result.results.some((entry) => entry.sourceKind === "protocol")).toBe(true)
		expect(result.retrievalConfidence).toBeGreaterThan(0)
	})

	it("detects artifact-intent queries and explicit artifact paths", () => {
		expect(ArtifactSearchService.shouldSearchArtifacts("workflow protocol guide")).toBe(true)
		expect(ArtifactSearchService.shouldSearchArtifacts("load config from src service", "src")).toBe(false)
		expect(ArtifactSearchService.shouldSearchArtifacts("anything", ".kilocode/workflows")).toBe(true)
	})
})
