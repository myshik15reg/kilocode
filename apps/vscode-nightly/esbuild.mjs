import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import crypto from "node:crypto" // kilocode_change

import { getGitSha, copyPaths, copyLocales, copyWasms, generatePackageJson } from "@roo-code/build"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
	const name = "extension-nightly"
	const production = process.argv.includes("--production")
	const minify = production
	const sourcemap = !production

	const overrideJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.nightly.json"), "utf8"))
	console.log(`[${name}] name: ${overrideJson.name}`)
	console.log(`[${name}] version: ${overrideJson.version}`)

	const gitSha = getGitSha()
	console.log(`[${name}] gitSha: ${gitSha}`)

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const buildOptions = {
		bundle: true,
		minify,
		sourcemap,
		logLevel: "silent",
		format: "cjs",
		sourcesContent: false,
		platform: "node",
		define: {
			"process.env.PKG_NAME": '"kilo-code-nightly"',
			"process.env.PKG_VERSION": `"${overrideJson.version}"`,
			"process.env.PKG_OUTPUT_CHANNEL": '"Kilo-Code-Nightly"',
			...(gitSha ? { "process.env.PKG_SHA": `"${gitSha}"` } : {}),
		},
	}

	const srcDir = path.join(__dirname, "..", "..", "src")
	const buildDir = path.join(__dirname, "build")
	const distDir = path.join(buildDir, "dist")

	console.log(`[${name}] srcDir: ${srcDir}`)
	console.log(`[${name}] buildDir: ${buildDir}`)
	console.log(`[${name}] distDir: ${distDir}`)

	if (fs.existsSync(distDir)) {
		console.log(`[${name}] Cleaning dist directory: ${distDir}`)
		fs.rmSync(distDir, { recursive: true, force: true })
	}

	/**
	 * @type {import('esbuild').Plugin[]}
	 */
	const plugins = [
		{
			name: "copyPaths",
			setup(build) {
				build.onEnd(() => {
					copyPaths(
						[
							["../README.md", "README.md"],
							["../CHANGELOG.md", "CHANGELOG.md"],
							["../LICENSE", "LICENSE"],
							["../.env", ".env", { optional: true }],
							// kilocode_change start: bundle WorkFlowAI pack
							["../WorkFlowAI", "WorkFlowAI"],
							// kilocode_change end
							[".vscodeignore", ".vscodeignore"],
							["assets", "assets"],
							["integrations", "integrations"],
							["node_modules/vscode-material-icons/generated", "assets/vscode-material-icons"],
							["../webview-ui/audio", "webview-ui/audio"],
						],
						srcDir,
						buildDir,
					)

					// kilocode_change start: generate embedded WorkFlowAI pack manifest (fingerprint)
					try {
						const workflowAiPackDir = path.join(buildDir, "WorkFlowAI")
						generateEmbeddedPackManifest(workflowAiPackDir)
						console.log(`[${name}] Generated WorkFlowAI embedded pack manifest`)
					} catch (error) {
						console.error(
							`[${name}] Failed to generate WorkFlowAI embedded pack manifest:`,
							error?.message ?? String(error),
						)
					}
					// kilocode_change end
				})
			},
		},
		{
			name: "generatePackageJson",
			setup(build) {
				build.onEnd(() => {
					const packageJson = JSON.parse(fs.readFileSync(path.join(srcDir, "package.json"), "utf8"))

					const generatedPackageJson = generatePackageJson({
						packageJson,
						overrideJson,
						substitution: ["kilo-code", "kilo-code-nightly"],
					})

					fs.writeFileSync(path.join(buildDir, "package.json"), JSON.stringify(generatedPackageJson, null, 2))
					console.log(`[generatePackageJson] Generated package.json`)

					let count = 0

					fs.readdirSync(path.join(srcDir)).forEach((file) => {
						if (file.startsWith("package.nls")) {
							fs.copyFileSync(path.join(srcDir, file), path.join(buildDir, file))
							count++
						}
					})

					console.log(`[generatePackageJson] Copied ${count} package.nls*.json files to ${buildDir}`)

					const nlsPkg = JSON.parse(fs.readFileSync(path.join(srcDir, "package.nls.json"), "utf8"))

					const nlsNightlyPkg = JSON.parse(
						fs.readFileSync(path.join(__dirname, "package.nls.nightly.json"), "utf8"),
					)

					fs.writeFileSync(
						path.join(buildDir, "package.nls.json"),
						JSON.stringify({ ...nlsPkg, ...nlsNightlyPkg }, null, 2),
					)

					console.log(`[generatePackageJson] Generated package.nls.json`)
				})
			},
		},
		{
			name: "copyWasms",
			setup(build) {
				build.onEnd(() => copyWasms(srcDir, distDir))
			},
		},
		{
			name: "copyLocales",
			setup(build) {
				build.onEnd(() => copyLocales(srcDir, distDir))
			},
		},
	]

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const extensionBuildOptions = {
		...buildOptions,
		plugins,
		entryPoints: [path.join(srcDir, "extension.ts")],
		outfile: path.join(distDir, "extension.js"),
		// Align externals with the release build to avoid bundling native modules and optional deps.
		// This nightly VSIX is packaged with `--no-dependencies`.
		external: ["vscode", "esbuild", "global-agent", "@lancedb/lancedb"], // kilocode_change
	}

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const workerBuildOptions = {
		...buildOptions,
		entryPoints: [path.join(srcDir, "workers", "countTokens.ts")],
		outdir: path.join(distDir, "workers"),
	}

	const [extensionBuildContext, workerBuildContext] = await Promise.all([
		esbuild.context(extensionBuildOptions),
		esbuild.context(workerBuildOptions),
	])

	await Promise.all([
		extensionBuildContext.rebuild(),
		extensionBuildContext.dispose(),

		workerBuildContext.rebuild(),
		workerBuildContext.dispose(),
	])
}

// kilocode_change start: embedded WorkFlowAI pack fingerprint/manifest
function listFilesRecursive(rootDir) {
	/** @type {string[]} */
	const files = []
	/** @type {string[]} */
	const stack = [rootDir]

	while (stack.length > 0) {
		const current = stack.pop()
		if (!current) {
			continue
		}

		const entries = fs.readdirSync(current, { withFileTypes: true })
		for (const entry of entries) {
			const absolutePath = path.join(current, entry.name)
			if (entry.isDirectory()) {
				stack.push(absolutePath)
			} else if (entry.isFile()) {
				files.push(absolutePath)
			}
		}
	}

	return files
}

function normalizeRelativePath(rootDir, absoluteFilePath) {
	return path.relative(rootDir, absoluteFilePath).split(path.sep).join("/")
}

function computeDirectoryFingerprintSha256(rootDir, excludedAbsolutePaths = []) {
	const excluded = new Set(excludedAbsolutePaths.map((p) => path.resolve(p)))
	const files = listFilesRecursive(rootDir)
		.filter((filePath) => !excluded.has(path.resolve(filePath)))
		.filter((filePath) => {
			const rel = normalizeRelativePath(rootDir, filePath)
			return rel !== ".DS_Store" && !rel.endsWith("/.DS_Store") && rel !== "Thumbs.db" && !rel.endsWith("/Thumbs.db")
		})
		.sort((a, b) => normalizeRelativePath(rootDir, a).localeCompare(normalizeRelativePath(rootDir, b)))

	const hash = crypto.createHash("sha256")

	for (const filePath of files) {
		const rel = normalizeRelativePath(rootDir, filePath)
		const buffer = fs.readFileSync(filePath)
		const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")
		hash.update(rel)
		hash.update("\0")
		hash.update(String(buffer.length))
		hash.update("\0")
		hash.update(fileHash)
		hash.update("\n")
	}

	return { fingerprint: hash.digest("hex"), fileCount: files.length }
}

function generateEmbeddedPackManifest(workflowAiPackDir) {
	const manifestPath = path.join(workflowAiPackDir, ".kilocode", "embedded-pack.manifest.json")
	const { fingerprint, fileCount } = computeDirectoryFingerprintSha256(workflowAiPackDir, [manifestPath])

	const manifest = {
		fingerprint,
		algorithm: "sha256",
		fileCount,
		generatedAt: new Date().toISOString(),
	}

	fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}
// kilocode_change end

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
