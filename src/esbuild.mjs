import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"
import process from "node:process"
import * as console from "node:console"
import crypto from "node:crypto" // kilocode_change

import { copyPaths, copyWasms, copyLocales, setupLocaleWatcher } from "@roo-code/build"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function sleepSync(delayMs) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
}

function removeDirectoryWithRetries(targetDir, retries = 5, retryDelayMs = 100) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
			return
		} catch (error) {
			const isRetryable = error?.code === "ENOTEMPTY" || error?.code === "EPERM" || error?.code === "EBUSY"
			if (!isRetryable || attempt === retries) {
				throw error
			}

			sleepSync(retryDelayMs * (attempt + 1))
		}
	}
}

async function main() {
	const name = "extension"
	const production = process.argv.includes("--production")
	const watch = process.argv.includes("--watch")
	const minify = production
	const sourcemap = true // Always generate source maps for error handling.

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
		// kilocode_change start: for ps-list
		banner: {
			js: "const __importMetaUrl = typeof __filename !== 'undefined' ? require('url').pathToFileURL(__filename).href : undefined;",
		},
		// kilocode_change end
	}

	const srcDir = __dirname
	const buildDir = __dirname
	const distDir = path.join(buildDir, "dist")

	if (fs.existsSync(distDir)) {
		console.log(`[${name}] Cleaning dist directory: ${distDir}`)
		removeDirectoryWithRetries(distDir)
	}

	/**
	 * @type {import('esbuild').Plugin[]}
	 */
	const plugins = [
		// kilocode_change start
		{
			name: "import-meta-url-plugin",
			setup(build) {
				build.onLoad({ filter: /\.js$/ }, async (args) => {
					const fs = await import("fs")
					let contents = await fs.promises.readFile(args.path, "utf8")

					// Replace import.meta.url with our polyfill
					if (contents.includes("import.meta.url")) {
						contents = contents.replace(/import\.meta\.url/g, "__importMetaUrl")
					}

					return { contents, loader: "js" }
				})
			},
		},
		// kilocode_change end
		{
			name: "copyFiles",
			setup(build) {
				build.onEnd(() => {
				copyPaths(
					[
						["../README.md", "README.md"],
						["../CHANGELOG.md", "CHANGELOG.md"],
						["../LICENSE", "LICENSE"],
						["../.env", ".env", { optional: true }],
						// kilocode_change start: bundle runtime-focused WorkFlowAI pack
						["../WorkFlowAI/AGENTS.md", "WorkFlowAI/AGENTS.md", { optional: true }],
						["../WorkFlowAI/README.md", "WorkFlowAI/README.md", { optional: true }],
						["../WorkFlowAI/THIRD_PARTY_NOTICES.md", "WorkFlowAI/THIRD_PARTY_NOTICES.md", { optional: true }],
						["../WorkFlowAI/.clinerules", "WorkFlowAI/.clinerules", { optional: true }],
						["../WorkFlowAI/.gitattributes", "WorkFlowAI/.gitattributes", { optional: true }],
						["../WorkFlowAI/.kilocodemodes", "WorkFlowAI/.kilocodemodes", { optional: true }],
						["../WorkFlowAI/.protocols/README.md", "WorkFlowAI/.protocols/README.md", { optional: true }],
						["../WorkFlowAI/.protocols/index.md", "WorkFlowAI/.protocols/index.md", { optional: true }],
						["../WorkFlowAI/.kilocode/QUICK.md", "WorkFlowAI/.kilocode/QUICK.md", { optional: true }],
						["../WorkFlowAI/.kilocode/system-map.md", "WorkFlowAI/.kilocode/system-map.md", { optional: true }],
						["../WorkFlowAI/.kilocode/cli", "WorkFlowAI/.kilocode/cli", { optional: true }],
						["../WorkFlowAI/.kilocode/commands", "WorkFlowAI/.kilocode/commands", { optional: true }],
						["../WorkFlowAI/.kilocode/memory-bank", "WorkFlowAI/.kilocode/memory-bank", { optional: true }],
						["../WorkFlowAI/.kilocode/modes", "WorkFlowAI/.kilocode/modes", { optional: true }],
						["../WorkFlowAI/.kilocode/patterns", "WorkFlowAI/.kilocode/patterns", { optional: true }],
						["../WorkFlowAI/.kilocode/rules", "WorkFlowAI/.kilocode/rules", { optional: true }],
						["../WorkFlowAI/.kilocode/rules-architect", "WorkFlowAI/.kilocode/rules-architect", { optional: true }],
						["../WorkFlowAI/.kilocode/rules-code", "WorkFlowAI/.kilocode/rules-code", { optional: true }],
						["../WorkFlowAI/.kilocode/rules-orchestrator", "WorkFlowAI/.kilocode/rules-orchestrator", { optional: true }],
						["../WorkFlowAI/.kilocode/skills", "WorkFlowAI/.kilocode/skills", { optional: true }],
						["../WorkFlowAI/.kilocode/sources", "WorkFlowAI/.kilocode/sources", { optional: true }],
						["../WorkFlowAI/.kilocode/templates", "WorkFlowAI/.kilocode/templates", { optional: true }],
						["../WorkFlowAI/.kilocode/workflows", "WorkFlowAI/.kilocode/workflows", { optional: true }],
						["../WorkFlowAI/third_party", "WorkFlowAI/third_party", { optional: true }],
						// kilocode_change end
						["node_modules/vscode-material-icons/generated", "assets/vscode-material-icons"],
						["../webview-ui/audio", "webview-ui/audio"],
					],
					srcDir,
					buildDir,
				)

					// kilocode_change start: generate embedded WorkFlowAI pack manifest (fingerprint)
					try {
						const workflowAiPackDir = path.join(buildDir, "WorkFlowAI")
						if (fs.existsSync(workflowAiPackDir)) {
							generateEmbeddedPackManifest(workflowAiPackDir)
							console.log(`[${name}] Generated WorkFlowAI embedded pack manifest`)
						} else {
							console.log(`[${name}] WorkFlowAI pack not found, skipping embedded pack manifest`)
						}
					} catch (error) {
						console.error(
							`[${name}] Failed to generate WorkFlowAI embedded pack manifest:`,
							error?.message ?? String(error),
						)
					}
					// kilocode_change end

					// Copy walkthrough files to dist directory
					copyPaths([["walkthrough", "walkthrough"]], srcDir, distDir)

					// Copy tree-sitter files to dist directory
					copyPaths([["services/continuedev/tree-sitter", "tree-sitter"]], srcDir, distDir)

					// Copy JSDOM xhr-sync-worker.js to fix runtime resolution
					const jsdomWorkerDest = path.join(distDir, "xhr-sync-worker.js")

					try {
						const require = createRequire(import.meta.url)
						const jsdomModulePath = require.resolve("jsdom/package.json")
						const jsdomDir = path.dirname(jsdomModulePath)
						const jsdomWorkerSource = path.join(jsdomDir, "lib/jsdom/living/xhr/xhr-sync-worker.js")

						if (fs.existsSync(jsdomWorkerSource)) {
							fs.copyFileSync(jsdomWorkerSource, jsdomWorkerDest)
							console.log(`[${name}] Copied JSDOM xhr-sync-worker.js to dist from: ${jsdomWorkerSource}`)
						}
					} catch (error) {
						console.error(`[${name}] Failed to copy JSDOM xhr-sync-worker.js:`, error.message)
					}
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
		{
			name: "esbuild-problem-matcher",
			setup(build) {
				build.onStart(() => console.log("[esbuild-problem-matcher#onStart]"))
				build.onEnd((result) => {
					result.errors.forEach(({ text, location }) => {
						console.error(`✘ [ERROR] ${text}`)
						if (location && location.file) {
							console.error(`    ${location.file}:${location.line}:${location.column}:`)
						}
					})

					console.log("[esbuild-problem-matcher#onEnd]")
				})
			},
		},
	]

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const extensionConfig = {
		...buildOptions,
		plugins,
		entryPoints: ["extension.ts"],
		outfile: "dist/extension.js",
		// global-agent must be external because it dynamically patches Node.js http/https modules
		// which breaks when bundled. It needs access to the actual Node.js module instances.
		// undici must be bundled because our VSIX is packaged with `--no-dependencies`.
		external: ["vscode", "esbuild", "global-agent", "@lancedb/lancedb"], // kilocode_change: add @lancedb/lancedb
	}

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const workerConfig = {
		...buildOptions,
		entryPoints: ["workers/countTokens.ts"],
		outdir: "dist/workers",
	}

	// kilocode_change start - agent-runtime process bundle
	/**
	 * Agent Runtime Process Bundle
	 *
	 * This bundles the agent-runtime process.ts into a standalone file that can be
	 * forked by the Agent Manager. fork() requires a physical .js file on disk,
	 * so we bundle it separately from the main extension.
	 *
	 * @type {import('esbuild').BuildOptions}
	 */
	const agentRuntimeDir = path.join(srcDir, "..", "packages/agent-runtime")
	const agentRuntimeProcessConfig = {
		...buildOptions,
		entryPoints: [path.join(agentRuntimeDir, "src/process.ts")],
		outfile: "dist/agent-runtime-process.js",
		// The agent-runtime process loads the main extension bundle dynamically,
		// so vscode APIs come from the extension, not from direct imports
		external: ["vscode"],
		// Use CJS format - works reliably with fork() and dynamic require() in dependencies
		format: "cjs",
		// Ensure we can resolve workspace packages
		plugins: [
			{
				name: "resolve-workspace-packages",
				setup(build) {
					// Resolve @roo-code/types and other workspace packages
					build.onResolve({ filter: /^@roo-code\// }, (args) => {
						const packageName = args.path
						const packagePath = path.join(srcDir, "..", "packages", packageName.replace("@roo-code/", ""))
						return { path: path.join(packagePath, "src/index.ts") }
					})
					build.onResolve({ filter: /^@kilocode\// }, (args) => {
						const packageName = args.path
						const packagePath = path.join(srcDir, "..", "packages", packageName.replace("@kilocode/", ""))
						return { path: path.join(packagePath, "src/index.ts") }
					})
				},
			},
		],
	}
	// kilocode_change end

	const [extensionCtx, workerCtx, agentRuntimeCtx] = await Promise.all([ // kilocode_change
		esbuild.context(extensionConfig),
		esbuild.context(workerConfig),
		esbuild.context(agentRuntimeProcessConfig), // kilocode_change
	])

	if (watch) {
		await Promise.all([extensionCtx.watch(), workerCtx.watch(), agentRuntimeCtx.watch()]) // kilocode_change
		copyLocales(srcDir, distDir)
		setupLocaleWatcher(srcDir, distDir)
	} else {
		await Promise.all([extensionCtx.rebuild(), workerCtx.rebuild(), agentRuntimeCtx.rebuild()]) // kilocode_change
		await Promise.all([extensionCtx.dispose(), workerCtx.dispose(), agentRuntimeCtx.dispose()]) // kilocode_change
	}
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
