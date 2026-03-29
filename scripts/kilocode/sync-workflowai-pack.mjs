import { readFile, writeFile, mkdir, rm, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "glob"

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = path.dirname(SCRIPT_PATH)
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..")
const DEFAULT_MANIFEST_PATH = path.join(SCRIPT_DIR, "workflowai-pack.manifest.json")

const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db"])

function toPosixPath(value) {
	return value.split(path.sep).join("/")
}

function parseMode(args) {
	const hasCheck = args.includes("--check")
	const hasApply = args.includes("--apply")

	if (hasCheck && hasApply) {
		throw new Error("Use only one mode: --check or --apply")
	}

	if (hasCheck) {
		return "check"
	}

	if (hasApply) {
		return "apply"
	}

	throw new Error("Missing mode. Use --check or --apply")
}

function parseManifestPath(args) {
	const index = args.indexOf("--manifest")
	if (index === -1) {
		return DEFAULT_MANIFEST_PATH
	}

	const value = args[index + 1]
	if (!value) {
		throw new Error("Missing value for --manifest")
	}

	return path.resolve(process.cwd(), value)
}

async function fileExists(filePath) {
	try {
		const info = await stat(filePath)
		return info.isFile()
	} catch {
		return false
	}
}

async function dirExists(dirPath) {
	try {
		const info = await stat(dirPath)
		return info.isDirectory()
	} catch {
		return false
	}
}

async function readBuffer(filePath) {
	return readFile(filePath)
}

async function shouldCopyFile(sourcePath, targetPath) {
	if (!(await fileExists(targetPath))) {
		return true
	}

	const [sourceBuffer, targetBuffer] = await Promise.all([
		readBuffer(sourcePath),
		readBuffer(targetPath),
	])

	if (sourceBuffer.length !== targetBuffer.length) {
		return true
	}

	return !sourceBuffer.equals(targetBuffer)
}

async function collectFiles(rootDir, includePatterns, excludePatterns) {
	if (!(await dirExists(rootDir))) {
		return []
	}

	const matches = new Set()

	for (const pattern of includePatterns) {
		const found = await glob(pattern, {
			cwd: rootDir,
			dot: true,
			nodir: true,
			ignore: excludePatterns,
		})

		for (const relativePath of found) {
			const normalized = toPosixPath(relativePath)
			const baseName = path.posix.basename(normalized)
			if (IGNORED_NAMES.has(baseName)) {
				continue
			}
			matches.add(normalized)
		}
	}

	return Array.from(matches).sort()
}

async function ensureDirectory(filePath) {
	await mkdir(path.dirname(filePath), { recursive: true })
}

async function copyFileContents(sourcePath, targetPath) {
	await ensureDirectory(targetPath)
	const content = await readBuffer(sourcePath)
	await writeFile(targetPath, content)
}

async function resolveExistingDirectory(rawPath, baseDirs) {
	for (const baseDir of baseDirs) {
		const candidate = path.resolve(baseDir, rawPath)
		if (await dirExists(candidate)) {
			return candidate
		}
	}

	return path.resolve(baseDirs[0], rawPath)
}

async function run() {
	const args = process.argv.slice(2)
	const mode = parseMode(args)
	const manifestPath = parseManifestPath(args)
	const manifestRaw = await readFile(manifestPath, "utf-8")
	const manifest = JSON.parse(manifestRaw)
	const manifestDir = path.dirname(manifestPath)
	const resolutionBases = [process.cwd(), manifestDir, REPO_ROOT]

	const sourceRoot = await resolveExistingDirectory(manifest.sourceRoot, resolutionBases)
	const targetRoot = await resolveExistingDirectory(manifest.targetRoot, resolutionBases)
	const includePatterns = manifest.include ?? []
	const excludePatterns = manifest.exclude ?? []

	if (includePatterns.length === 0) {
		throw new Error("Manifest include patterns are empty")
	}

	if (!(await dirExists(sourceRoot))) {
		throw new Error(`Source root does not exist: ${sourceRoot}`)
	}

	if (mode === "apply") {
		await mkdir(targetRoot, { recursive: true })
	}

	const sourceFiles = await collectFiles(sourceRoot, includePatterns, excludePatterns)
	const targetFiles = await collectFiles(targetRoot, includePatterns, excludePatterns)

	const sourceSet = new Set(sourceFiles)
	const targetSet = new Set(targetFiles)

	const copyActions = []
	for (const relativePath of sourceFiles) {
		const sourcePath = path.join(sourceRoot, relativePath)
		const targetPath = path.join(targetRoot, relativePath)
		const needsCopy = await shouldCopyFile(sourcePath, targetPath)
		if (needsCopy) {
			copyActions.push(relativePath)
		}
	}

	const staleTargets = targetFiles.filter((relativePath) => !sourceSet.has(relativePath))

	if (mode === "check") {
		if (copyActions.length === 0 && staleTargets.length === 0) {
			console.log("workflowai-pack sync: OK (no changes)")
			return
		}

		console.error("workflowai-pack sync: drift detected")
		if (copyActions.length > 0) {
			console.error("Files to update:")
			for (const file of copyActions) {
				console.error(`- ${file}`)
			}
		}
		if (staleTargets.length > 0) {
			console.error("Stale files to remove:")
			for (const file of staleTargets) {
				console.error(`- ${file}`)
			}
		}
		process.exitCode = 1
		return
	}

	for (const relativePath of copyActions) {
		const sourcePath = path.join(sourceRoot, relativePath)
		const targetPath = path.join(targetRoot, relativePath)
		await copyFileContents(sourcePath, targetPath)
	}

	for (const relativePath of staleTargets) {
		const targetPath = path.join(targetRoot, relativePath)
		await rm(targetPath, { force: true })
	}

	const copiedCount = copyActions.length
	const staleCount = staleTargets.length
	console.log(
		`workflowai-pack sync: applied (updated ${copiedCount}, removed ${staleCount})`,
	)
}

run().catch((error) => {
	console.error(`workflowai-pack sync failed: ${error instanceof Error ? error.message : String(error)}`)
	process.exitCode = 1
})
