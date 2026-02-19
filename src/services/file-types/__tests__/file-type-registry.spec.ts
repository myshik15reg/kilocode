import {
	getAllRegisteredExtensions,
	getDefinitionSupportedExtensions,
	getGraphIndexExtensions,
	getVectorIndexExtensions,
	isGraphIndexEligiblePath,
	isVectorIndexEligiblePath,
	resolveFileTypeByExtension,
	resolveFileTypeByPath,
	shouldUseVectorFallbackChunking,
} from "../file-type-registry"
import { resolveLanguageConfig } from "../../tree-sitter/languageParser"

describe("file-type-registry", () => {
	it("resolves by extension (case-insensitive, with or without dot)", () => {
		expect(resolveFileTypeByExtension(".TS")?.extension).toBe(".ts")
		expect(resolveFileTypeByExtension("ts")?.extension).toBe(".ts")
		expect(resolveFileTypeByExtension("  .bsl  ")?.extension).toBe(".bsl")
		expect(resolveFileTypeByExtension(".")).toBeNull()
		expect(resolveFileTypeByExtension("")).toBeNull()
	})

	it("resolves by path", () => {
		expect(resolveFileTypeByPath("/root/app.ts")?.extension).toBe(".ts")
		expect(resolveFileTypeByPath("Configuration.mdo")?.extension).toBe(".mdo")
		expect(resolveFileTypeByPath("noext")).toBeNull()
	})

	it("provides consistent extension surfaces", () => {
		const all = new Set(getAllRegisteredExtensions())
		const vector = new Set(getVectorIndexExtensions())
		const graph = new Set(getGraphIndexExtensions())
		const defs = new Set(getDefinitionSupportedExtensions())

		// Base sanity: vector and graph extensions must be subsets of all.
		for (const ext of vector) expect(all.has(ext)).toBe(true)
		for (const ext of graph) expect(all.has(ext)).toBe(true)
		for (const ext of defs) expect(all.has(ext)).toBe(true)

		// 1C priority types
		expect(vector.has(".bsl")).toBe(true)
		expect(graph.has(".bsl")).toBe(true)
		expect(vector.has(".mdo")).toBe(true)
		expect(graph.has(".mdo")).toBe(true)

		// Known graph exclusions
		expect(graph.has(".mxlx")).toBe(false)
		expect(graph.has(".md")).toBe(false)

		// Explicit skips
		expect(all.has(".png")).toBe(true)
		expect(vector.has(".png")).toBe(false)
		expect(graph.has(".png")).toBe(false)
		expect(defs.has(".png")).toBe(false)
	})

	it("computes eligibility by path", () => {
		expect(isVectorIndexEligiblePath("/x/module.bsl")).toBe(true)
		expect(isGraphIndexEligiblePath("/x/module.bsl")).toBe(true)
		expect(isGraphIndexEligiblePath("/x/template.mxlx")).toBe(false)
		expect(isVectorIndexEligiblePath("/x/readme.md")).toBe(true)
		expect(isGraphIndexEligiblePath("/x/readme.md")).toBe(false)
	})

	it("computes vector fallback chunking policy", () => {
		// Real tree-sitter languages should not require fallback.
		expect(shouldUseVectorFallbackChunking(".ts")).toBe(false)

		// Known fallbacks
		expect(shouldUseVectorFallbackChunking(".vb")).toBe(true)
		expect(shouldUseVectorFallbackChunking(".bsl")).toBe(true)

		// XML-like types always fallback for vector extraction.
		expect(shouldUseVectorFallbackChunking(".mdo")).toBe(true)

		// Unknown types should be false (not eligible).
		expect(shouldUseVectorFallbackChunking(".unknown")).toBe(false)
		expect(shouldUseVectorFallbackChunking(".png")).toBe(false)
	})

	it("keeps tree-sitter language resolution in sync with file-type registry", () => {
		for (const extWithDot of getAllRegisteredExtensions()) {
			const entry = resolveFileTypeByExtension(extWithDot)
			if (!entry) {
				throw new Error(`Expected registry entry for extension: ${extWithDot}`)
			}

			if (entry.contentKind !== "treeSitter") continue

			const isGraphIndexed = entry.indexing.graph
			const isVectorIndexedWithoutFallback = entry.indexing.vector && !shouldUseVectorFallbackChunking(extWithDot)

			if (!isGraphIndexed && !isVectorIndexedWithoutFallback) continue

			const extWithoutDot = extWithDot.slice(1)
			const resolution = resolveLanguageConfig(extWithoutDot)
			expect(resolution).not.toBeNull()
			expect(resolution && "skip" in resolution).toBe(false)
		}
	})
})
