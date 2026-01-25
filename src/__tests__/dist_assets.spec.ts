// npx vitest __tests__/dist_assets.spec.ts

import * as fs from "fs"
import * as path from "path"

describe("dist assets", () => {
	const distPath = path.join(__dirname, "../dist")

	describe("tiktoken", () => {
		it("should have tiktoken wasm file", () => {
			expect(fs.existsSync(path.join(distPath, "tiktoken_bg.wasm"))).toBe(true)
		})
	})

	describe("tree-sitter", () => {
		const treeSitterSourceDir = path.join(__dirname, "../node_modules/tree-sitter-wasms/out")
		const treeSitterFiles = fs.existsSync(treeSitterSourceDir)
			? fs.readdirSync(treeSitterSourceDir).filter((file) => file.endsWith(".wasm"))
			: []

		expect(treeSitterFiles.length).toBeGreaterThan(0)

		test.each(treeSitterFiles)("should have %s file", (filename) => {
			expect(fs.existsSync(path.join(distPath, filename))).toBe(true)
		})
	})
})
