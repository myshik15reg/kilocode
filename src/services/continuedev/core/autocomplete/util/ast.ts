import { Node as SyntaxNode, Tree } from "web-tree-sitter"

import { getParserForFile } from "../../util/treeSitter"

export type AstPath = SyntaxNode[]

const waitForParserRetry = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAst(filepath: string, fileContents: string): Promise<Tree | undefined> {
	for (let attempt = 0; attempt < 2; attempt++) {
		const parser = await getParserForFile(filepath)

		if (parser) {
			try {
				const ast = parser.parse(fileContents)
				if (ast) {
					return ast
				}
			} catch {
				// Retry once below to tolerate transient parser/WASM initialization races in tests.
			}
		}

		if (attempt === 0) {
			await waitForParserRetry(50)
		}
	}

	return undefined
}

export async function getTreePathAtCursor(ast: Tree, cursorIndex: number): Promise<AstPath> {
	const path = [ast.rootNode]
	while (path[path.length - 1].childCount > 0) {
		let foundChild = false
		for (const child of path[path.length - 1].children) {
			if (child && child.startIndex <= cursorIndex && child.endIndex >= cursorIndex) {
				path.push(child)
				foundChild = true
				break
			}
		}

		if (!foundChild) {
			break
		}
	}

	return path
}
