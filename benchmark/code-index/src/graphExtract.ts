import * as path from "node:path"

import type { CodeEntity, CodeRel } from "./neo4j.js"

function createFileEntity(filePath: string, languageLabel: string): CodeEntity {
	return {
		id: `file:${filePath}`,
		type: "file",
		name: path.basename(filePath),
		filePath,
		line: 1,
		language: languageLabel,
	}
}

function lineFromIndex(code: string, idx: number): number {
	if (idx <= 0) return 1
	let line = 1
	for (let i = 0; i < Math.min(idx, code.length); i++) {
		if (code.charCodeAt(i) === 10) line++
	}
	return line
}

type Lang = "ts" | "js" | "py" | "other"

function detectLang(filePath: string, languageId?: string): Lang {
	const ext = path.extname(filePath).toLowerCase()
	if (languageId?.startsWith("python") || ext === ".py") return "py"
	if (languageId?.startsWith("typescript") || ext === ".ts" || ext === ".tsx") return "ts"
	if (languageId?.startsWith("javascript") || ext === ".js" || ext === ".jsx") return "js"
	return "other"
}

function extractImports(code: string, lang: Lang): Array<{ name: string; line: number }> {
	const out: Array<{ name: string; line: number }> = []

	if (lang === "ts" || lang === "js") {
		const re1 = /\bimport\s+(?:[^;\n]*?)\s+from\s+['"]([^'"]+)['"]/g
		const re2 = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g
		for (const re of [re1, re2]) {
			for (let m = re.exec(code); m; m = re.exec(code)) {
				out.push({ name: m[1]!, line: lineFromIndex(code, m.index) })
			}
		}
	} else if (lang === "py") {
		const re1 = /^\s*import\s+([a-zA-Z0-9_\.]+)\s*$/gm
		const re2 = /^\s*from\s+([a-zA-Z0-9_\.]+)\s+import\s+.+$/gm
		for (const re of [re1, re2]) {
			for (let m = re.exec(code); m; m = re.exec(code)) {
				out.push({ name: m[1]!, line: lineFromIndex(code, m.index) })
			}
		}
	}

	return out
}

type Def = {
	type: "function" | "class"
	name: string
	line: number
	startIdx: number
	bodyEndIdx?: number
}

function extractDefinitions(code: string, lang: Lang): Def[] {
	const out: Def[] = []

	if (lang === "py") {
		const re = /^\s*(def|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b.*:/gm
		for (let m = re.exec(code); m; m = re.exec(code)) {
			out.push({
				type: m[1] === "class" ? "class" : "function",
				name: m[2]!,
				line: lineFromIndex(code, m.index),
				startIdx: m.index,
			})
		}

		const lines = code.split(/\r?\n/)
		const offsets: number[] = []
		let off = 0
		for (const l of lines) {
			offsets.push(off)
			off += l.length + 1
		}

		for (const d of out) {
			const startLineIdx = d.line - 1
			const indent = (lines[startLineIdx] ?? "").match(/^\s*/)?.[0]?.length ?? 0
			let endLineIdx = lines.length - 1
			for (let j = startLineIdx + 1; j < lines.length; j++) {
				const line = lines[j] ?? ""
				if (line.trim() === "") continue
				const ind = line.match(/^\s*/)?.[0]?.length ?? 0
				if (ind <= indent && (line.trim().startsWith("def ") || line.trim().startsWith("class "))) {
					endLineIdx = j - 1
					break
				}
			}
			const endIdx =
				offsets[Math.min(endLineIdx, offsets.length - 1)]! +
				(lines[Math.min(endLineIdx, lines.length - 1)] ?? "").length
			d.bodyEndIdx = endIdx
		}
	} else if (lang === "ts" || lang === "js") {
		const reFn = /\bfunction\s+([a-zA-Z_\$][a-zA-Z0-9_\$]*)\s*\(/g
		const reClass = /\bclass\s+([a-zA-Z_\$][a-zA-Z0-9_\$]*)\b/g
		const reArrow = /\b(?:const|let|var)\s+([a-zA-Z_\$][a-zA-Z0-9_\$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g

		for (const [type, re] of [
			["function", reFn],
			["class", reClass],
			["function", reArrow],
		] as const) {
			for (let m = re.exec(code); m; m = re.exec(code)) {
				out.push({ type, name: m[1]!, line: lineFromIndex(code, m.index), startIdx: m.index })
			}
		}

		for (const d of out) {
			const openIdx = code.indexOf("{", d.startIdx)
			if (openIdx < 0) continue
			let depth = 0
			for (let i = openIdx; i < code.length; i++) {
				const ch = code[i]
				if (ch === "{") depth++
				else if (ch === "}") depth--
				if (depth === 0) {
					d.bodyEndIdx = i
					break
				}
			}
		}
	}

	out.sort((a, b) => a.startIdx - b.startIdx)
	return out
}

function extractCalls(
	code: string,
	lang: Lang,
	defs: Def[],
): Array<{ callerName: string; calleeName: string; line: number; idx: number }> {
	const out: Array<{ callerName: string; calleeName: string; line: number; idx: number }> = []
	if (!(lang === "ts" || lang === "js" || lang === "py")) return out

	const re = /\b([a-zA-Z_\$][a-zA-Z0-9_\$]*)\s*\(/g

	const findCaller = (idx: number): string => {
		const containing = defs
			.filter((d) => (d.bodyEndIdx ?? d.startIdx) >= idx)
			.filter((d) => d.startIdx <= idx)
			.sort((a, b) => (a.bodyEndIdx ?? a.startIdx) - (b.bodyEndIdx ?? b.startIdx))
		return containing[containing.length - 1]?.name ?? "<file>"
	}

	for (let m = re.exec(code); m; m = re.exec(code)) {
		const name = m[1]!
		if (name === "if" || name === "for" || name === "while" || name === "switch" || name === "return") continue
		const callerName = findCaller(m.index)
		out.push({ callerName, calleeName: name, line: lineFromIndex(code, m.index), idx: m.index })
	}

	return out
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractReferences(code: string, defs: Def[]): Array<{ targetName: string; line: number }> {
	const out: Array<{ targetName: string; line: number }> = []
	for (const d of defs) {
		const re = new RegExp(`\\b${escapeRegExp(d.name)}\\b`, "g")
		for (let m = re.exec(code); m; m = re.exec(code)) {
			const line = lineFromIndex(code, m.index)
			if (line === d.line) continue
			out.push({ targetName: d.name, line })
		}
	}
	return out
}

export async function extractGraphForFile(params: {
	filePath: string
	content: string
	languageId: string
	languageLabel?: string
}): Promise<{ entities: CodeEntity[]; rels: CodeRel[] }> {
	const label = params.languageLabel ?? params.languageId
	const lang = detectLang(params.filePath, params.languageId)

	const entities: CodeEntity[] = []
	const rels: CodeRel[] = []

	const fileEntity = createFileEntity(params.filePath, label)
	entities.push(fileEntity)

	const defs = extractDefinitions(params.content, lang)
	const defByName = new Map<string, CodeEntity>()

	for (const d of defs) {
		const id = `${d.type}:${params.filePath}:${d.name}`
		const e: CodeEntity = {
			id,
			type: d.type,
			name: d.name,
			filePath: params.filePath,
			line: d.line,
			language: label,
			properties: { heuristic: true },
		}
		entities.push(e)
		if (!defByName.has(d.name)) defByName.set(d.name, e)
		rels.push({
			id: `rel:${fileEntity.id}:defines:${id}`,
			type: "defines",
			fromId: fileEntity.id,
			toId: id,
			properties: { line: d.line, heuristic: true },
		})
	}

	for (const imp of extractImports(params.content, lang)) {
		const importId = `import:${params.filePath}:${imp.name}`
		entities.push({
			id: importId,
			type: "import",
			name: imp.name,
			filePath: params.filePath,
			line: imp.line,
			language: label,
			properties: { heuristic: true },
		})
		rels.push({
			id: `rel:${fileEntity.id}:imports:${importId}:${imp.line}`,
			type: "imports",
			fromId: fileEntity.id,
			toId: importId,
			properties: { line: imp.line, heuristic: true },
		})
	}

	for (const c of extractCalls(params.content, lang, defs)) {
		const caller = defByName.get(c.callerName)
		if (!caller) continue
		const target = defByName.get(c.calleeName)
		const targetId = target?.id ?? `function:${c.calleeName}`
		rels.push({
			id: `rel:${params.filePath}:calls:${caller.id}:${targetId}:${c.line}`,
			type: "calls",
			fromId: caller.id,
			toId: targetId,
			properties: { line: c.line, heuristic: true },
		})
	}

	for (const r of extractReferences(params.content, defs)) {
		const target = defByName.get(r.targetName)
		if (!target) continue
		rels.push({
			id: `rel:${fileEntity.id}:references:${target.id}:${r.line}`,
			type: "references",
			fromId: fileEntity.id,
			toId: target.id,
			properties: { line: r.line, heuristic: true },
		})
	}

	return { entities, rels }
}
