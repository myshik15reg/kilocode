import path from "path"
import { describe, it, expect } from "vitest"

import { TreeSitterParserManager } from "../parser-manager"

describe("TreeSitterParserManager WASM resolution", () => {
	it("should resolve typescript wasm from src/dist when available", () => {
		const manager = TreeSitterParserManager.getInstance() as unknown as {
			resolveWasmPath: (languageId: string, wasmPath?: string) => { wasmPath: string; triedPaths: string[] }
		}

		// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
		// Root cause: when tests run from `cd src`, cwd-relative wasm paths fail.
		const resolved = manager.resolveWasmPath("typescript")

		// We don't require the file to exist on disk for this unit test;
		// it only verifies deterministic candidate ordering for resolution.
		expect(resolved.triedPaths[0]).toBe(
			path.join(__dirname, "..", "..", "..", "dist", "tree-sitter-typescript.wasm"),
		)
		expect(resolved.wasmPath).toBeDefined()
		expect(resolved.triedPaths.length).toBeGreaterThan(3)
	})

	it("should prefer explicit wasmPath when provided", () => {
		const manager = TreeSitterParserManager.getInstance() as unknown as {
			resolveWasmPath: (languageId: string, wasmPath?: string) => { wasmPath: string; triedPaths: string[] }
		}

		const explicitPath = "/explicit/tree-sitter-typescript.wasm"
		const resolved = manager.resolveWasmPath("typescript", explicitPath)
		expect(resolved.wasmPath).toBe(explicitPath)
		expect(resolved.triedPaths).toEqual([explicitPath])
	})
})
