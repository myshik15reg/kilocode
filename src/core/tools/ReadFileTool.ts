import path from "path"
import * as fs from "fs/promises"
import { isBinaryFile } from "isbinaryfile"

import type { FileEntry, LineRange } from "@roo-code/types"
import { type ClineSayTool, isNativeProtocol, ANTHROPIC_DEFAULT_MAX_TOKENS } from "@roo-code/types"

import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { getModelMaxOutputTokens } from "../../shared/api"
import { t } from "../../i18n"
import { RecordSource } from "../context-tracking/FileContextTrackerTypes"
import { isPathOutsideWorkspace } from "../../utils/pathUtils"
import { getReadablePath } from "../../utils/path"
import { fileExistsAtPath } from "../../utils/fs"
import { countFileLines } from "../../integrations/misc/line-counter"
import { readLines } from "../../integrations/misc/read-lines"
import { extractTextFromFile, addLineNumbers, getSupportedBinaryFormats } from "../../integrations/misc/extract-text"
import { parseSourceCodeDefinitionsForFile } from "../../services/tree-sitter"
import { getGlobalRooDirectory } from "../../services/roo-config"
import { parseXml } from "../../utils/xml"
import { resolveToolProtocol } from "../../utils/resolveToolProtocol"
import type { ToolUse } from "../../shared/tools"

import {
	DEFAULT_MAX_IMAGE_FILE_SIZE_MB,
	DEFAULT_MAX_TOTAL_IMAGE_SIZE_MB,
	isSupportedImageFormat,
	validateImageForProcessing,
	processImageFile,
	ImageMemoryTracker,
} from "./helpers/imageHelpers"
import { FILE_READ_BUDGET_PERCENT, readFileWithTokenBudget } from "./helpers/fileTokenBudget"
import { truncateDefinitionsToLineLimit } from "./helpers/truncateDefinitions"
import { BaseTool, ToolCallbacks } from "./BaseTool"

interface FileResult {
	path: string
	status: "approved" | "denied" | "blocked" | "error" | "pending"
	content?: string
	error?: string
	notice?: string
	resolvedPath?: string
	resolvedFromGlobal?: boolean
	lineRanges?: LineRange[]
	xmlContent?: string
	nativeContent?: string
	imageDataUrl?: string
	feedbackText?: string
	feedbackImages?: any[]
}

const VERY_LARGE_FILE_SIZE_BYTES = 2 * 1024 * 1024 // kilocode_change
const VERY_LONG_SINGLE_LINE_BYTES = 64 * 1024 // kilocode_change

type LargeFileRisk = "very_large_file" | "very_long_single_line" // kilocode_change

interface LargeFilePreview {
	xmlContent: string
	nativeContent: string
}

type GlobalRooPrefix = ".kilocode" | ".roo"

function escapeXml(value: string): string {
	return value.replace(/[<>&\"]/g, (ch) => {
		switch (ch) {
			case "<":
				return "&lt;"
			case ">":
				return "&gt;"
			case "&":
				return "&amp;"
			case '"':
				return "&quot;"
			default:
				return ch
		}
	})
}

function parseRequestedGlobalRooRelPath(rawRelPath: string): { prefix: GlobalRooPrefix; subPath: string } | null {
	// SECURITY: Never accept null bytes
	if (rawRelPath.includes("\0")) return null

	// Normalize separators for prefix detection and traversal checks
	const forward = rawRelPath.replace(/\\/g, "/")
	const segments = forward.split("/")
	// SECURITY: Do not allow traversal attempts in the requested path
	if (segments.some((seg) => seg === "..")) return null

	const normalized = path.posix.normalize(forward)

	const prefix: GlobalRooPrefix | null =
		normalized === ".kilocode" || normalized.startsWith(".kilocode/")
			? ".kilocode"
			: normalized === ".roo" || normalized.startsWith(".roo/")
				? ".roo"
				: null
	if (!prefix) return null

	const subPath = normalized === prefix ? "" : normalized.slice(prefix.length + 1)
	// SECURITY: Prevent absolute / drive-rooted subpaths (Windows + POSIX)
	if (path.posix.isAbsolute(subPath) || path.win32.isAbsolute(subPath)) return null

	// kilocode_change: `.kilocode/memory-bank/*` (and legacy `.roo/memory-bank/*`) MUST NOT fallback to global.
	// This directory is project context and may contain sensitive, project-specific information.
	const firstSubPathSegment = subPath.split("/")[0]
	if (firstSubPathSegment === "memory-bank") return null

	return { prefix, subPath }
}

function resolveGlobalRooFilePath(rawRelPath: string): string | null {
	const parsed = parseRequestedGlobalRooRelPath(rawRelPath)
	if (!parsed) return null

	const globalDir = getGlobalRooDirectory()
	const globalDirResolved = path.resolve(globalDir)

	// `.kilocode/<subpath>` and `.roo/<subpath>` both map to `<globalKiloDir>/<subpath>`
	const candidate = path.resolve(globalDirResolved, parsed.subPath)

	// SECURITY: Ensure the resolved path is still inside globalDir
	if (candidate !== globalDirResolved && !candidate.startsWith(globalDirResolved + path.sep)) {
		return null
	}

	return candidate
}

// kilocode_change: Allow global fallback for protocol *templates only*.
// Workspace `.protocols/*` MUST NOT be resolved from global, except:
// - `.protocols/README.md`
// - `.protocols/index.md`
function resolveGlobalProtocolTemplatePath(rawRelPath: string): string | null {
	// SECURITY: Never accept null bytes
	if (rawRelPath.includes("\0")) return null

	// Normalize separators and prevent traversal.
	const forward = rawRelPath.replace(/\\/g, "/")
	const segments = forward.split("/")
	if (segments.some((seg) => seg === "..")) return null

	const normalized = path.posix.normalize(forward)
	if (normalized !== ".protocols/README.md" && normalized !== ".protocols/index.md") return null

	const filename = path.posix.basename(normalized)
	const globalDir = getGlobalRooDirectory()
	const globalDirResolved = path.resolve(globalDir)
	const candidate = path.resolve(globalDirResolved, "workflowai", "templates", "protocols", filename)

	// SECURITY: Ensure the resolved path is still inside globalDir
	if (candidate !== globalDirResolved && !candidate.startsWith(globalDirResolved + path.sep)) {
		return null
	}

	return candidate
}

function appendXmlNotice(xmlContent: string, notice: string): string {
	const idx = xmlContent.lastIndexOf("</file>")
	if (idx === -1) return xmlContent
	return `${xmlContent.slice(0, idx)}<notice>${escapeXml(notice)}</notice>${xmlContent.slice(idx)}`
}

function isMemoryBankRelPath(relPath: string): boolean {
	const forward = relPath.replace(/\\/g, "/")
	return (
		forward === ".kilocode/memory-bank" ||
		forward.startsWith(".kilocode/memory-bank/") ||
		forward === ".roo/memory-bank" ||
		forward.startsWith(".roo/memory-bank/")
	)
}

function isEnoentLikeError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false

	const maybeCode = (error as { code?: unknown }).code
	if (maybeCode === "ENOENT") return true

	const maybeMessage = (error as { message?: unknown }).message
	if (typeof maybeMessage !== "string") return false

	const msg = maybeMessage.toLowerCase()
	return msg.includes("enoent") || msg.includes("no such file") || msg.includes("not found")
}

async function inspectLargeFileRisk(fullPath: string, fileSizeBytes: number): Promise<LargeFileRisk | null> {
	// kilocode_change start
	if (fileSizeBytes > VERY_LARGE_FILE_SIZE_BYTES) {
		return "very_large_file"
	}

	if (fileSizeBytes <= VERY_LONG_SINGLE_LINE_BYTES) {
		return null
	}

	let fileHandle: Awaited<ReturnType<typeof fs.open>> | undefined
	try {
		fileHandle = await fs.open(fullPath, "r")
		const probeSize = Math.min(fileSizeBytes, VERY_LONG_SINGLE_LINE_BYTES)
		const probeBuffer = Buffer.alloc(probeSize)
		const { bytesRead } = await fileHandle.read(probeBuffer, 0, probeSize, 0)
		const probeText = probeBuffer.subarray(0, bytesRead).toString("utf8")
		if (bytesRead >= VERY_LONG_SINGLE_LINE_BYTES && !probeText.includes("\n") && !probeText.includes("\r")) {
			return "very_long_single_line"
		}

		return null
	} finally {
		await fileHandle?.close().catch(() => undefined)
	}
	// kilocode_change end
}

function buildLargeFileNotice(relPath: string, risk: LargeFileRisk, fileSizeBytes: number): string {
	// kilocode_change start
	const fileSizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(fileSizeBytes >= 1024 * 1024 ? 1 : 2)
	if (risk === "very_long_single_line") {
		return `Skipped reading ${relPath} because it appears to be a very large single-line or minified file (${fileSizeMb} MB). Sending the whole line would likely overflow context. Use search tools or external inspection, or enable very large reads if you must continue.`
	}

	return `Skipped reading ${relPath} because it is very large (${fileSizeMb} MB). Read a narrower line_range or enable very large reads to bypass this safety guard.`
	// kilocode_change end
}

// kilocode_change start
function buildLargeFilePreviewNotice(relPath: string, risk: LargeFileRisk, fileSizeBytes: number): string {
	const fileSizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(fileSizeBytes >= 1024 * 1024 ? 1 : 2)
	if (risk === "very_long_single_line") {
		return `Showing a bounded preview for ${relPath} because it appears to be a very large single-line or minified file (${fileSizeMb} MB). Full ingestion is skipped to avoid context overflow. Use search tools, a targeted byte/line window, or enable very large reads if you must inspect more.`
	}

	return `Showing a bounded preview for ${relPath} because it is very large (${fileSizeMb} MB). Full ingestion is skipped to protect context budget. Use line_range for a narrower section or enable very large reads to bypass this safety guard.`
}

async function buildLargeFilePreview(
	fullPath: string,
	relPath: string,
	risk: LargeFileRisk,
	fileSizeBytes: number,
): Promise<LargeFilePreview> {
	if (risk === "very_long_single_line") {
		let fileHandle: Awaited<ReturnType<typeof fs.open>> | undefined
		try {
			fileHandle = await fs.open(fullPath, "r")
			const previewBytes = Math.min(fileSizeBytes, 4096)
			const previewBuffer = Buffer.alloc(previewBytes)
			const { bytesRead } = await fileHandle.read(previewBuffer, 0, previewBytes, 0)
			const previewText = previewBuffer.subarray(0, bytesRead).toString("utf8")
			const numberedPreview = addLineNumbers(previewText || "", 1)
			const notice = buildLargeFilePreviewNotice(relPath, risk, fileSizeBytes)

			return {
				xmlContent: `<file><path>${relPath}</path>\n<content lines="1-1">\n${numberedPreview}</content>\n<notice>${notice}</notice>\n</file>`,
				nativeContent: `File: ${relPath}\nLine 1 (truncated preview):\n${numberedPreview}\n\nNote: ${notice}`,
			}
		} finally {
			await fileHandle?.close().catch(() => undefined)
		}
	}

	const previewLineCount = 200
	const previewContent = addLineNumbers(await readLines(fullPath, previewLineCount - 1, 0))
	const notice = buildLargeFilePreviewNotice(relPath, risk, fileSizeBytes)
	return {
		xmlContent: `<file><path>${relPath}</path>\n<content lines="1-${previewLineCount}">\n${previewContent}</content>\n<notice>${notice}</notice>\n</file>`,
		nativeContent: `File: ${relPath}\nLines 1-${previewLineCount}:\n${previewContent}\n\nNote: ${notice}`,
	}
}
// kilocode_change end

const MEMORY_BANK_TEMPLATE_FILES = [
	"index.md",
	"brief.md",
	"product.md",
	"architecture.md",
	"tech.md",
	"context.md",
] as const

const PROTOCOLS_TEMPLATE_FILES = ["README.md", "index.md"] as const

function isLegacyRooMemoryBankRelPath(relPath: string): boolean {
	const forward = relPath.replace(/\\/g, "/")
	return forward === ".roo/memory-bank" || forward.startsWith(".roo/memory-bank/")
}

async function copyMissingTemplateFiles(options: {
	templateDir: string
	destDir: string
	filenames: readonly string[]
}): Promise<void> {
	for (const filename of options.filenames) {
		const src = path.join(options.templateDir, filename)
		const dest = path.join(options.destDir, filename)

		try {
			if (await fileExistsAtPath(dest)) continue
			if (!(await fileExistsAtPath(src))) continue
			await fs.copyFile(src, dest)
		} catch {
			// Best-effort: never throw.
			return
		}
	}
}

async function bestEffortScaffoldMemoryBankAndProtocols(projectRoot: string, relPath: string): Promise<void> {
	// Best-effort scaffold for consuming project: create missing workspace files
	// from global templates, without overwriting.
	const globalKiloDir = getGlobalRooDirectory()
	const templatesRoot = path.resolve(globalKiloDir, "workflowai", "templates")
	const memoryBankTemplateDir = path.join(templatesRoot, "memory-bank")
	const protocolsTemplateDir = path.join(templatesRoot, "protocols")

	try {
		// Memory Bank
		if (await fileExistsAtPath(memoryBankTemplateDir)) {
			const destMemoryBankDirs = [path.join(projectRoot, ".kilocode", "memory-bank")]
			if (isLegacyRooMemoryBankRelPath(relPath)) {
				// Support legacy `.roo/memory-bank/*` reads by scaffolding the same templates there.
				destMemoryBankDirs.push(path.join(projectRoot, ".roo", "memory-bank"))
			}

			for (const destDir of destMemoryBankDirs) {
				try {
					await fs.mkdir(destDir, { recursive: true })
				} catch {
					// No permissions / read-only workspace.
					// Best-effort: keep going (still try protocols scaffold).
					continue
				}

				await copyMissingTemplateFiles({
					templateDir: memoryBankTemplateDir,
					destDir,
					filenames: MEMORY_BANK_TEMPLATE_FILES,
				})
			}
		}

		// .protocols
		if (await fileExistsAtPath(protocolsTemplateDir)) {
			const destProtocolsDir = path.join(projectRoot, ".protocols")
			try {
				await fs.mkdir(destProtocolsDir, { recursive: true })
			} catch {
				return
			}

			await copyMissingTemplateFiles({
				templateDir: protocolsTemplateDir,
				destDir: destProtocolsDir,
				filenames: PROTOCOLS_TEMPLATE_FILES,
			})
		}
	} catch {
		// Best-effort: never throw.
	}
}

function getMissingMemoryBankGuidance(relPath: string, error: unknown): string | null {
	if (!isMemoryBankRelPath(relPath)) return null
	if (!isEnoentLikeError(error)) return null

	const globalKiloDir = getGlobalRooDirectory()
	const templateDir = path.resolve(globalKiloDir, "workflowai", "templates", "memory-bank")

	return [
		"Похоже, в этом проекте отсутствует Memory Bank.",
		"Создайте Memory Bank в проекте: .kilocode/memory-bank/",
		`Шаблоны можно скопировать из: ${templateDir}`,
		"Затем перезагрузите VS Code (Reload Window), чтобы автоинициализация попробовала создать файлы снова.",
	].join("\n")
}

export class ReadFileTool extends BaseTool<"read_file"> {
	readonly name = "read_file" as const

	parseLegacy(params: Partial<Record<string, string>>): { files: FileEntry[] } {
		const argsXmlTag = params.args
		const legacyPath = params.path
		const legacyStartLineStr = params.start_line
		const legacyEndLineStr = params.end_line

		const fileEntries: FileEntry[] = []

		// XML args format
		if (argsXmlTag) {
			const parsed = parseXml(argsXmlTag) as any
			const files = Array.isArray(parsed.file) ? parsed.file : [parsed.file].filter(Boolean)

			for (const file of files) {
				if (!file.path) continue

				const fileEntry: FileEntry = {
					path: file.path,
					lineRanges: [],
				}

				if (file.line_range) {
					const ranges = Array.isArray(file.line_range) ? file.line_range : [file.line_range]
					for (const range of ranges) {
						const match = String(range).match(/(\d+)-(\d+)/)
						if (match) {
							const [, start, end] = match.map(Number)
							if (!isNaN(start) && !isNaN(end)) {
								fileEntry.lineRanges?.push({ start, end })
							}
						}
					}
				}
				fileEntries.push(fileEntry)
			}

			return { files: fileEntries }
		}

		// Legacy single file path
		if (legacyPath) {
			const fileEntry: FileEntry = {
				path: legacyPath,
				lineRanges: [],
			}

			if (legacyStartLineStr && legacyEndLineStr) {
				const start = parseInt(legacyStartLineStr, 10)
				const end = parseInt(legacyEndLineStr, 10)
				if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
					fileEntry.lineRanges?.push({ start, end })
				}
			}
			fileEntries.push(fileEntry)
		}

		return { files: fileEntries }
	}

	async execute(params: { files: FileEntry[] }, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { handleError, pushToolResult, toolProtocol } = callbacks
		const fileEntries = params.files
		const modelInfo = task.api.getModel().info
		// Use the task's locked protocol for consistent output formatting throughout the task
		const protocol = resolveToolProtocol(task.apiConfiguration, modelInfo, task.taskToolProtocol)
		const useNative = isNativeProtocol(protocol)

		if (!fileEntries || fileEntries.length === 0) {
			task.consecutiveMistakeCount++
			task.recordToolError("read_file")
			const errorMsg = await task.sayAndCreateMissingParamError("read_file", "args (containing valid file paths)")
			const errorResult = useNative ? `Error: ${errorMsg}` : `<files><error>${errorMsg}</error></files>`
			pushToolResult(errorResult)
			return
		}

		// Enforce maxConcurrentFileReads limit
		const { maxConcurrentFileReads = 5 } = (await task.providerRef.deref()?.getState()) ?? {}
		if (fileEntries.length > maxConcurrentFileReads) {
			task.consecutiveMistakeCount++
			task.recordToolError("read_file")
			const errorMsg = `Too many files requested. You attempted to read ${fileEntries.length} files, but the concurrent file reads limit is ${maxConcurrentFileReads}. Please read files in batches of ${maxConcurrentFileReads} or fewer.`
			await task.say("error", errorMsg)
			const errorResult = useNative ? `Error: ${errorMsg}` : `<files><error>${errorMsg}</error></files>`
			pushToolResult(errorResult)
			return
		}

		const supportsImages = modelInfo.supportsImages ?? false

		const fileResults: FileResult[] = fileEntries.map((entry) => ({
			path: entry.path,
			status: "pending",
			lineRanges: entry.lineRanges,
		}))

		const updateFileResult = (filePath: string, updates: Partial<FileResult>) => {
			const index = fileResults.findIndex((result) => result.path === filePath)
			if (index !== -1) {
				fileResults[index] = { ...fileResults[index], ...updates }
			}
		}

		try {
			const filesToApprove: FileResult[] = []

			for (const fileResult of fileResults) {
				const relPath = fileResult.path
				const workspacePath = path.resolve(task.cwd, relPath)

				if (fileResult.lineRanges) {
					let hasRangeError = false
					for (const range of fileResult.lineRanges) {
						if (range.start > range.end) {
							const errorMsg = "Invalid line range: end line cannot be less than start line"
							updateFileResult(relPath, {
								status: "blocked",
								error: errorMsg,
								xmlContent: `<file><path>${relPath}</path><error>Error reading file: ${errorMsg}</error></file>`,
								nativeContent: `File: ${relPath}\nError: Error reading file: ${errorMsg}`,
							})
							await task.say("error", `Error reading file ${relPath}: ${errorMsg}`)
							hasRangeError = true
							break
						}
						if (isNaN(range.start) || isNaN(range.end)) {
							const errorMsg = "Invalid line range values"
							updateFileResult(relPath, {
								status: "blocked",
								error: errorMsg,
								xmlContent: `<file><path>${relPath}</path><error>Error reading file: ${errorMsg}</error></file>`,
								nativeContent: `File: ${relPath}\nError: Error reading file: ${errorMsg}`,
							})
							await task.say("error", `Error reading file ${relPath}: ${errorMsg}`)
							hasRangeError = true
							break
						}
					}
					if (hasRangeError) continue
				}

				if (fileResult.status === "pending") {
					const accessAllowed = task.rooIgnoreController?.validateAccess(relPath)
					if (!accessAllowed) {
						await task.say("rooignore_error", relPath)
						const errorMsg = formatResponse.rooIgnoreError(relPath)
						updateFileResult(relPath, {
							status: "blocked",
							error: errorMsg,
							xmlContent: `<file><path>${relPath}</path><error>${errorMsg}</error></file>`,
							nativeContent: `File: ${relPath}\nError: ${errorMsg}`,
						})
						continue
					}

					// kilocode_change: Global fallback resolution.
					// Rules:
					// 1) Workspace file always takes precedence.
					// 2) Allow `.kilocode/*` and legacy `.roo/*` fallback to global *except* `memory-bank/*`.
					// 3) Allow `.protocols/{README.md,index.md}` fallback to global protocol templates.
					let resolvedPath = workspacePath
					let resolvedFromGlobal = false

					const protocolTemplateCandidatePath = resolveGlobalProtocolTemplatePath(relPath)
					const globalCandidatePath = protocolTemplateCandidatePath ?? resolveGlobalRooFilePath(relPath)
					if (globalCandidatePath) {
						const workspaceExists = await fileExistsAtPath(workspacePath)
						if (!workspaceExists) {
							const globalExists = await fileExistsAtPath(globalCandidatePath)
							if (globalExists) {
								resolvedPath = globalCandidatePath
								resolvedFromGlobal = true
							}
						}
					}
					fileResult.resolvedPath = resolvedPath
					fileResult.resolvedFromGlobal = resolvedFromGlobal

					filesToApprove.push(fileResult)
				}
			}

			if (filesToApprove.length > 1) {
				const { maxReadFileLine = 500 /*kilocode_change*/ } = (await task.providerRef.deref()?.getState()) ?? {}

				const batchFiles = filesToApprove.map((fileResult) => {
					const relPath = fileResult.path
					const fullPath = fileResult.resolvedPath ?? path.resolve(task.cwd, relPath)
					const isOutsideWorkspace = isPathOutsideWorkspace(fullPath)

					let lineSnippet = ""
					if (fileResult.lineRanges && fileResult.lineRanges.length > 0) {
						const ranges = fileResult.lineRanges.map((range) =>
							t("tools:readFile.linesRange", { start: range.start, end: range.end }),
						)
						lineSnippet = ranges.join(", ")
					} else if (maxReadFileLine === 0) {
						lineSnippet = t("tools:readFile.definitionsOnly")
					} else if (maxReadFileLine > 0) {
						lineSnippet = t("tools:readFile.maxLines", { max: maxReadFileLine })
					}

					const readablePath = getReadablePath(task.cwd, relPath)
					const key = `${readablePath}${lineSnippet ? ` (${lineSnippet})` : ""}`

					return { path: readablePath, lineSnippet, isOutsideWorkspace, key, content: fullPath }
				})

				const completeMessage = JSON.stringify({ tool: "readFile", batchFiles } satisfies ClineSayTool)
				const { response, text, images } = await task.ask("tool", completeMessage, false)

				if (response === "yesButtonClicked") {
					if (text) await task.say("user_feedback", text, images)
					filesToApprove.forEach((fileResult) => {
						updateFileResult(fileResult.path, {
							status: "approved",
							feedbackText: text,
							feedbackImages: images,
						})
					})
				} else if (response === "noButtonClicked") {
					if (text) await task.say("user_feedback", text, images)
					task.didRejectTool = true
					filesToApprove.forEach((fileResult) => {
						updateFileResult(fileResult.path, {
							status: "denied",
							xmlContent: `<file><path>${fileResult.path}</path><status>Denied by user</status></file>`,
							nativeContent: `File: ${fileResult.path}\nStatus: Denied by user`,
							feedbackText: text,
							feedbackImages: images,
						})
					})
				} else {
					try {
						const individualPermissions = JSON.parse(text || "{}")
						let hasAnyDenial = false

						batchFiles.forEach((batchFile, index) => {
							const fileResult = filesToApprove[index]
							const approved = individualPermissions[batchFile.key] === true

							if (approved) {
								updateFileResult(fileResult.path, { status: "approved" })
							} else {
								hasAnyDenial = true
								updateFileResult(fileResult.path, {
									status: "denied",
									xmlContent: `<file><path>${fileResult.path}</path><status>Denied by user</status></file>`,
									nativeContent: `File: ${fileResult.path}\nStatus: Denied by user`,
								})
							}
						})

						if (hasAnyDenial) task.didRejectTool = true
					} catch (error) {
						console.error("Failed to parse individual permissions:", error)
						task.didRejectTool = true
						filesToApprove.forEach((fileResult) => {
							updateFileResult(fileResult.path, {
								status: "denied",
								xmlContent: `<file><path>${fileResult.path}</path><status>Denied by user</status></file>`,
								nativeContent: `File: ${fileResult.path}\nStatus: Denied by user`,
							})
						})
					}
				}
			} else if (filesToApprove.length === 1) {
				const fileResult = filesToApprove[0]
				const relPath = fileResult.path
				const fullPath = fileResult.resolvedPath ?? path.resolve(task.cwd, relPath)
				const isOutsideWorkspace = isPathOutsideWorkspace(fullPath)
				const { maxReadFileLine = 500 /*kilocode_change*/ } = (await task.providerRef.deref()?.getState()) ?? {}

				let lineSnippet = ""
				if (fileResult.lineRanges && fileResult.lineRanges.length > 0) {
					const ranges = fileResult.lineRanges.map((range) =>
						t("tools:readFile.linesRange", { start: range.start, end: range.end }),
					)
					lineSnippet = ranges.join(", ")
				} else if (maxReadFileLine === 0) {
					lineSnippet = t("tools:readFile.definitionsOnly")
				} else if (maxReadFileLine > 0) {
					lineSnippet = t("tools:readFile.maxLines", { max: maxReadFileLine })
				}

				const completeMessage = JSON.stringify({
					tool: "readFile",
					path: getReadablePath(task.cwd, relPath),
					isOutsideWorkspace,
					content: fullPath,
					reason: lineSnippet,
				} satisfies ClineSayTool)

				const { response, text, images } = await task.ask("tool", completeMessage, false)

				if (response !== "yesButtonClicked") {
					if (text) await task.say("user_feedback", text, images)
					task.didRejectTool = true
					updateFileResult(relPath, {
						status: "denied",
						xmlContent: `<file><path>${relPath}</path><status>Denied by user</status></file>`,
						nativeContent: `File: ${relPath}\nStatus: Denied by user`,
						feedbackText: text,
						feedbackImages: images,
					})
				} else {
					if (text) await task.say("user_feedback", text, images)
					updateFileResult(relPath, { status: "approved", feedbackText: text, feedbackImages: images })
				}
			}

			const imageMemoryTracker = new ImageMemoryTracker()
			const state = await task.providerRef.deref()?.getState()
			const {
				maxReadFileLine = 500 /*kilocode_change*/,
				maxImageFileSize = DEFAULT_MAX_IMAGE_FILE_SIZE_MB,
				maxTotalImageSize = DEFAULT_MAX_TOTAL_IMAGE_SIZE_MB,
				allowVeryLargeReads = false,
			} = state ?? {}

			let didAttemptMemoryBankScaffold = false

			for (const fileResult of fileResults) {
				if (fileResult.status !== "approved") continue

				const relPath = fileResult.path
				const fullPath = fileResult.resolvedPath ?? path.resolve(task.cwd, relPath)
				const fileContextPath = fileResult.resolvedFromGlobal ? fullPath : relPath

				try {
					// Check if the path is a directory before attempting to read it
					let stats: Awaited<ReturnType<typeof fs.stat>>
					try {
						stats = await fs.stat(fullPath)
					} catch (error) {
						if (isMemoryBankRelPath(relPath) && isEnoentLikeError(error) && !didAttemptMemoryBankScaffold) {
							didAttemptMemoryBankScaffold = true
							// FIX: init-memory-bank-autoscaffold (TestAnalyzer)
							// Root cause: read_file returns ENOENT for missing Memory Bank instead of bootstrapping from templates.
							await bestEffortScaffoldMemoryBankAndProtocols(task.cwd, relPath)
							stats = await fs.stat(fullPath) // Retry once
						} else {
							throw error
						}
					}
					if (stats.isDirectory()) {
						const errorMsg = `Cannot read '${relPath}' because it is a directory. To view the contents of a directory, use the list_files tool instead.`
						updateFileResult(relPath, {
							status: "error",
							error: errorMsg,
							xmlContent: `<file><path>${relPath}</path><error>Error reading file: ${errorMsg}</error></file>`,
							nativeContent: `File: ${relPath}\nError: Error reading file: ${errorMsg}`,
						})
						await task.say("error", `Error reading file ${relPath}: ${errorMsg}`)
						continue
					}

					const isBinary = await isBinaryFile(fullPath)

					// kilocode_change start
					const hasLineRanges = Boolean(fileResult.lineRanges && fileResult.lineRanges.length > 0)
					const fileSizeBytes =
						typeof stats.size === "number" && Number.isFinite(stats.size) ? stats.size : null
					if (!isBinary && !allowVeryLargeReads && fileSizeBytes !== null) {
						const largeFileRisk = await inspectLargeFileRisk(fullPath, fileSizeBytes)
						if (
							largeFileRisk === "very_long_single_line" ||
							(largeFileRisk === "very_large_file" && !hasLineRanges)
						) {
							const preview = await buildLargeFilePreview(fullPath, relPath, largeFileRisk, fileSizeBytes)
							updateFileResult(relPath, {
								xmlContent: preview.xmlContent,
								nativeContent: preview.nativeContent,
							})
							continue
						}
					}
					// kilocode_change end

					const totalLines = isBinary ? 0 : await countFileLines(fullPath)

					if (isBinary) {
						const fileExtension = path.extname(relPath).toLowerCase()
						const supportedBinaryFormats = getSupportedBinaryFormats()

						if (isSupportedImageFormat(fileExtension)) {
							try {
								const validationResult = await validateImageForProcessing(
									fullPath,
									supportsImages,
									maxImageFileSize,
									maxTotalImageSize,
									imageMemoryTracker.getTotalMemoryUsed(),
								)

								if (!validationResult.isValid) {
									await task.fileContextTracker.trackFileContext(
										fileContextPath,
										"read_tool" as RecordSource,
									)
									updateFileResult(relPath, {
										xmlContent: `<file><path>${relPath}</path>\n<notice>${validationResult.notice}</notice>\n</file>`,
										nativeContent: `File: ${relPath}\nNote: ${validationResult.notice}`,
									})
									continue
								}

								const imageResult = await processImageFile(fullPath)
								imageMemoryTracker.addMemoryUsage(imageResult.sizeInMB)
								await task.fileContextTracker.trackFileContext(
									fileContextPath,
									"read_tool" as RecordSource,
								)

								updateFileResult(relPath, {
									xmlContent: `<file><path>${relPath}</path>\n<notice>${imageResult.notice}</notice>\n</file>`,
									nativeContent: `File: ${relPath}\nNote: ${imageResult.notice}`,
									imageDataUrl: imageResult.dataUrl,
								})
								continue
							} catch (error) {
								const errorMsg = error instanceof Error ? error.message : String(error)
								updateFileResult(relPath, {
									status: "error",
									error: `Error reading image file: ${errorMsg}`,
									xmlContent: `<file><path>${relPath}</path><error>Error reading image file: ${errorMsg}</error></file>`,
									nativeContent: `File: ${relPath}\nError: Error reading image file: ${errorMsg}`,
								})
								await task.say("error", `Error reading image file ${relPath}: ${errorMsg}`)
								continue
							}
						}

						if (supportedBinaryFormats && supportedBinaryFormats.includes(fileExtension)) {
							// Use extractTextFromFile for supported binary formats (PDF, DOCX, etc.)
							try {
								const content = await extractTextFromFile(fullPath)
								const numberedContent = addLineNumbers(content)
								const lines = content.split("\n")
								const lineCount = lines.length
								const lineRangeAttr = lineCount > 0 ? ` lines="1-${lineCount}"` : ""

								await task.fileContextTracker.trackFileContext(
									fileContextPath,
									"read_tool" as RecordSource,
								)

								updateFileResult(relPath, {
									xmlContent:
										lineCount > 0
											? `<file><path>${relPath}</path>\n<content${lineRangeAttr}>\n${numberedContent}</content>\n</file>`
											: `<file><path>${relPath}</path>\n<content/><notice>File is empty</notice>\n</file>`,
									nativeContent:
										lineCount > 0
											? `File: ${relPath}\nLines 1-${lineCount}:\n${numberedContent}`
											: `File: ${relPath}\nNote: File is empty`,
								})
								continue
							} catch (error) {
								const errorMsg = error instanceof Error ? error.message : String(error)
								updateFileResult(relPath, {
									status: "error",
									error: `Error extracting text: ${errorMsg}`,
									xmlContent: `<file><path>${relPath}</path><error>Error extracting text: ${errorMsg}</error></file>`,
									nativeContent: `File: ${relPath}\nError: Error extracting text: ${errorMsg}`,
								})
								await task.say("error", `Error extracting text from ${relPath}: ${errorMsg}`)
								continue
							}
						} else {
							const fileFormat = fileExtension.slice(1) || "bin"
							updateFileResult(relPath, {
								notice: `Binary file format: ${fileFormat}`,
								xmlContent: `<file><path>${relPath}</path>\n<binary_file format="${fileFormat}">Binary file - content not displayed</binary_file>\n</file>`,
								nativeContent: `File: ${relPath}\nBinary file (${fileFormat}) - content not displayed`,
							})
							continue
						}
					}

					if (fileResult.lineRanges && fileResult.lineRanges.length > 0) {
						const rangeResults: string[] = []
						const nativeRangeResults: string[] = []

						for (const range of fileResult.lineRanges) {
							const content = addLineNumbers(
								await readLines(fullPath, range.end - 1, range.start - 1),
								range.start,
							)
							const lineRangeAttr = ` lines="${range.start}-${range.end}"`
							rangeResults.push(`<content${lineRangeAttr}>\n${content}</content>`)
							nativeRangeResults.push(`Lines ${range.start}-${range.end}:\n${content}`)
						}

						updateFileResult(relPath, {
							xmlContent: `<file><path>${relPath}</path>\n${rangeResults.join("\n")}\n</file>`,
							nativeContent: `File: ${relPath}\n${nativeRangeResults.join("\n\n")}`,
						})
						continue
					}

					if (maxReadFileLine === 0) {
						try {
							const defResult = await parseSourceCodeDefinitionsForFile(
								fullPath,
								task.rooIgnoreController,
							)
							if (defResult) {
								const notice = `Showing only ${maxReadFileLine} of ${totalLines} total lines. Use line_range if you need to read more lines`
								updateFileResult(relPath, {
									xmlContent: `<file><path>${relPath}</path>\n<list_code_definition_names>${defResult}</list_code_definition_names>\n<notice>${notice}</notice>\n</file>`,
									nativeContent: `File: ${relPath}\nCode Definitions:\n${defResult}\n\nNote: ${notice}`,
								})
							}
						} catch (error) {
							if (error instanceof Error && error.message.startsWith("Unsupported language:")) {
								console.warn(`[read_file] Warning: ${error.message}`)
							} else {
								console.error(
									`[read_file] Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
								)
							}
						}
						continue
					}

					if (maxReadFileLine > 0 && totalLines > maxReadFileLine) {
						const content = addLineNumbers(await readLines(fullPath, maxReadFileLine - 1, 0))
						const lineRangeAttr = ` lines="1-${maxReadFileLine}"`
						let xmlInfo = `<content${lineRangeAttr}>\n${content}</content>\n`
						let nativeInfo = `Lines 1-${maxReadFileLine}:\n${content}\n`

						try {
							const defResult = await parseSourceCodeDefinitionsForFile(
								fullPath,
								task.rooIgnoreController,
							)
							if (defResult) {
								const truncatedDefs = truncateDefinitionsToLineLimit(defResult, maxReadFileLine)
								xmlInfo += `<list_code_definition_names>${truncatedDefs}</list_code_definition_names>\n`
								nativeInfo += `\nCode Definitions:\n${truncatedDefs}\n`
							}

							const notice = `Showing only ${maxReadFileLine} of ${totalLines} total lines. Use line_range if you need to read more lines`
							xmlInfo += `<notice>${notice}</notice>\n`
							nativeInfo += `\nNote: ${notice}`

							updateFileResult(relPath, {
								xmlContent: `<file><path>${relPath}</path>\n${xmlInfo}</file>`,
								nativeContent: `File: ${relPath}\n${nativeInfo}`,
							})
						} catch (error) {
							if (error instanceof Error && error.message.startsWith("Unsupported language:")) {
								console.warn(`[read_file] Warning: ${error.message}`)
							} else {
								console.error(
									`[read_file] Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
								)
							}
						}
						continue
					}

					const { id: modelId, info: modelInfo } = task.api.getModel()
					const { contextTokens } = task.getTokenUsage()
					const contextWindow = modelInfo.contextWindow

					const maxOutputTokens =
						getModelMaxOutputTokens({
							modelId,
							model: modelInfo,
							settings: task.apiConfiguration,
						}) ?? ANTHROPIC_DEFAULT_MAX_TOKENS

					// Calculate available token budget (60% of remaining context)
					const remainingTokens = contextWindow - maxOutputTokens - (contextTokens || 0)
					const safeReadBudget = Math.floor(remainingTokens * FILE_READ_BUDGET_PERCENT)

					let content: string
					let xmlInfo = ""
					let nativeInfo = ""

					if (safeReadBudget <= 0) {
						// No budget available
						content = ""
						const notice = "No available context budget for file reading"
						xmlInfo = `<content/>\n<notice>${notice}</notice>\n`
						nativeInfo = `Note: ${notice}`
					} else {
						// Read file with incremental token counting
						const result = await readFileWithTokenBudget(fullPath, {
							budgetTokens: safeReadBudget,
						})

						content = addLineNumbers(result.content)

						if (!result.complete) {
							// File was truncated
							const notice = `File truncated: showing ${result.lineCount} lines (${result.tokenCount} tokens) due to context budget. Use line_range to read specific sections.`
							const lineRangeAttr = result.lineCount > 0 ? ` lines="1-${result.lineCount}"` : ""
							xmlInfo =
								result.lineCount > 0
									? `<content${lineRangeAttr}>\n${content}</content>\n<notice>${notice}</notice>\n`
									: `<content/>\n<notice>${notice}</notice>\n`
							nativeInfo =
								result.lineCount > 0
									? `Lines 1-${result.lineCount}:\n${content}\n\nNote: ${notice}`
									: `Note: ${notice}`
						} else {
							// Full file read
							const lineRangeAttr = ` lines="1-${result.lineCount}"`
							xmlInfo =
								result.lineCount > 0
									? `<content${lineRangeAttr}>\n${content}</content>\n`
									: `<content/>`

							if (result.lineCount === 0) {
								xmlInfo += `<notice>File is empty</notice>\n`
								nativeInfo = "Note: File is empty"
							} else {
								nativeInfo = `Lines 1-${result.lineCount}:\n${content}`
							}
						}
					}

					await task.fileContextTracker.trackFileContext(fileContextPath, "read_tool" as RecordSource)

					updateFileResult(relPath, {
						xmlContent: `<file><path>${relPath}</path>\n${xmlInfo}</file>`,
						nativeContent: `File: ${relPath}\n${nativeInfo}`,
					})
				} catch (error) {
					const baseErrorMsg = error instanceof Error ? error.message : String(error)
					const guidance = getMissingMemoryBankGuidance(relPath, error)
					const errorMsg = guidance ? `${baseErrorMsg}\n\n${guidance}` : baseErrorMsg
					updateFileResult(relPath, {
						status: "error",
						error: `Error reading file: ${errorMsg}`,
						xmlContent: `<file><path>${relPath}</path><error>Error reading file: ${errorMsg}</error></file>`,
						nativeContent: `File: ${relPath}\nError: Error reading file: ${errorMsg}`,
					})
					await task.say("error", `Error reading file ${relPath}: ${errorMsg}`)
				}
			}

			// kilocode_change start
			// Add a notice for any files resolved from the global AlfaCode assistant directory.
			for (const fileResult of fileResults) {
				if (!fileResult.resolvedFromGlobal || !fileResult.resolvedPath) continue
				if (fileResult.status === "denied" || fileResult.status === "blocked") continue

				const globalNotice = `Resolved from global AlfaCode assistant directory: ${fileResult.resolvedPath}`
				if (fileResult.nativeContent && !fileResult.nativeContent.includes(globalNotice)) {
					fileResult.nativeContent = `${fileResult.nativeContent}\nNote: ${globalNotice}`
				}
				if (fileResult.xmlContent && !fileResult.xmlContent.includes(globalNotice)) {
					fileResult.xmlContent = appendXmlNotice(fileResult.xmlContent, globalNotice)
				}
			}
			// kilocode_change end

			// Check if any files had errors or were blocked and mark the turn as failed
			const hasErrors = fileResults.some((result) => result.status === "error" || result.status === "blocked")
			if (hasErrors) {
				task.didToolFailInCurrentTurn = true
			}

			// Build final result based on protocol
			let finalResult: string
			if (useNative) {
				const nativeResults = fileResults
					.filter((result) => result.nativeContent)
					.map((result) => result.nativeContent)
				finalResult = nativeResults.join("\n\n---\n\n")
			} else {
				const xmlResults = fileResults.filter((result) => result.xmlContent).map((result) => result.xmlContent)
				finalResult = `<files>\n${xmlResults.join("\n")}\n</files>`
			}

			const fileImageUrls = fileResults
				.filter((result) => result.imageDataUrl)
				.map((result) => result.imageDataUrl as string)

			let statusMessage = ""
			let feedbackImages: any[] = []

			const deniedWithFeedback = fileResults.find((result) => result.status === "denied" && result.feedbackText)

			if (deniedWithFeedback && deniedWithFeedback.feedbackText) {
				statusMessage = formatResponse.toolDeniedWithFeedback(deniedWithFeedback.feedbackText)
				feedbackImages = deniedWithFeedback.feedbackImages || []
			} else if (task.didRejectTool) {
				statusMessage = formatResponse.toolDenied()
			} else {
				const approvedWithFeedback = fileResults.find(
					(result) => result.status === "approved" && result.feedbackText,
				)

				if (approvedWithFeedback && approvedWithFeedback.feedbackText) {
					statusMessage = formatResponse.toolApprovedWithFeedback(approvedWithFeedback.feedbackText)
					feedbackImages = approvedWithFeedback.feedbackImages || []
				}
			}

			const allImages = [...feedbackImages, ...fileImageUrls]

			const finalModelSupportsImages = task.api.getModel().info.supportsImages ?? false
			const imagesToInclude = finalModelSupportsImages ? allImages : []

			if (statusMessage || imagesToInclude.length > 0) {
				const result = formatResponse.toolResult(
					statusMessage || finalResult,
					imagesToInclude.length > 0 ? imagesToInclude : undefined,
				)

				if (typeof result === "string") {
					if (statusMessage) {
						pushToolResult(`${result}\n${finalResult}`)
					} else {
						pushToolResult(result)
					}
				} else {
					if (statusMessage) {
						const textBlock = { type: "text" as const, text: finalResult }
						pushToolResult([...result, textBlock])
					} else {
						pushToolResult(result)
					}
				}
			} else {
				pushToolResult(finalResult)
			}
		} catch (error) {
			const relPath = fileEntries[0]?.path || "unknown"
			const errorMsg = error instanceof Error ? error.message : String(error)

			if (fileResults.length > 0) {
				updateFileResult(relPath, {
					status: "error",
					error: `Error reading file: ${errorMsg}`,
					xmlContent: `<file><path>${relPath}</path><error>Error reading file: ${errorMsg}</error></file>`,
					nativeContent: `File: ${relPath}\nError: Error reading file: ${errorMsg}`,
				})
			}

			await task.say("error", `Error reading file ${relPath}: ${errorMsg}`)

			// Mark that a tool failed in this turn
			task.didToolFailInCurrentTurn = true

			// Build final error result based on protocol
			let errorResult: string
			if (useNative) {
				const nativeResults = fileResults
					.filter((result) => result.nativeContent)
					.map((result) => result.nativeContent)
				errorResult = nativeResults.join("\n\n---\n\n")
			} else {
				const xmlResults = fileResults.filter((result) => result.xmlContent).map((result) => result.xmlContent)
				errorResult = `<files>\n${xmlResults.join("\n")}\n</files>`
			}

			pushToolResult(errorResult)
		}
	}

	getReadFileToolDescription(blockName: string, blockParams: any): string
	getReadFileToolDescription(blockName: string, nativeArgs: { files: FileEntry[] }): string
	getReadFileToolDescription(blockName: string, second: any): string {
		// If native typed args ({ files: FileEntry[] }) were provided
		if (second && typeof second === "object" && "files" in second && Array.isArray(second.files)) {
			const paths = (second.files as FileEntry[]).map((f) => f?.path).filter(Boolean) as string[]
			if (paths.length === 0) {
				return `[${blockName} with no valid paths]`
			} else if (paths.length === 1) {
				return `[${blockName} for '${paths[0]}'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.]`
			} else if (paths.length <= 3) {
				const pathList = paths.map((p) => `'${p}'`).join(", ")
				return `[${blockName} for ${pathList}]`
			} else {
				return `[${blockName} for ${paths.length} files]`
			}
		}

		// Fallback to legacy/XML or synthesized params
		const blockParams = second as any

		if (blockParams?.args) {
			try {
				const parsed = parseXml(blockParams.args) as any
				const files = Array.isArray(parsed.file) ? parsed.file : [parsed.file].filter(Boolean)
				const paths = files.map((f: any) => f?.path).filter(Boolean) as string[]

				if (paths.length === 0) {
					return `[${blockName} with no valid paths]`
				} else if (paths.length === 1) {
					return `[${blockName} for '${paths[0]}'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.]`
				} else if (paths.length <= 3) {
					const pathList = paths.map((p) => `'${p}'`).join(", ")
					return `[${blockName} for ${pathList}]`
				} else {
					return `[${blockName} for ${paths.length} files]`
				}
			} catch (error) {
				console.error("Failed to parse read_file args XML for description:", error)
				return `[${blockName} with unparsable args]`
			}
		} else if (blockParams?.path) {
			return `[${blockName} for '${blockParams.path}'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.]`
		} else if (blockParams?.files) {
			// Back-compat: some paths may still synthesize params.files; try to parse if present
			try {
				const files = JSON.parse(blockParams.files)
				if (Array.isArray(files) && files.length > 0) {
					const paths = files.map((f: any) => f?.path).filter(Boolean) as string[]
					if (paths.length === 1) {
						return `[${blockName} for '${paths[0]}'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.]`
					} else if (paths.length <= 3) {
						const pathList = paths.map((p) => `'${p}'`).join(", ")
						return `[${blockName} for ${pathList}]`
					} else {
						return `[${blockName} for ${paths.length} files]`
					}
				}
			} catch (error) {
				console.error("Failed to parse native files JSON for description:", error)
				return `[${blockName} with unparsable files]`
			}
		}

		return `[${blockName} with missing path/args/files]`
	}

	override async handlePartial(task: Task, block: ToolUse<"read_file">): Promise<void> {
		const argsXmlTag = block.params.args
		const legacyPath = block.params.path

		let filePath = ""
		if (argsXmlTag) {
			const match = argsXmlTag.match(/<file>.*?<path>([^<]+)<\/path>/s)
			if (match) filePath = match[1]
		}
		if (!filePath && legacyPath) {
			filePath = legacyPath
		}

		if (!filePath && block.nativeArgs && "files" in block.nativeArgs && Array.isArray(block.nativeArgs.files)) {
			const files = block.nativeArgs.files
			if (files.length > 0 && files[0]?.path) {
				filePath = files[0].path
			}
		}

		const fullPath = filePath ? path.resolve(task.cwd, filePath) : ""
		const sharedMessageProps: ClineSayTool = {
			tool: "readFile",
			path: getReadablePath(task.cwd, filePath),
			isOutsideWorkspace: filePath ? isPathOutsideWorkspace(fullPath) : false,
		}
		const partialMessage = JSON.stringify({
			...sharedMessageProps,
			content: undefined,
		} satisfies ClineSayTool)
		await task.ask("tool", partialMessage, block.partial).catch(() => {})
	}
}

export const readFileTool = new ReadFileTool()
