import type { Plugin, ResolvedConfig } from "vite" // kilocode_change
import fs from "fs"
import path from "path"

/**
 * Custom Vite plugin to ensure source maps are properly included in the build
 * This plugin copies source maps to the build directory and ensures they're accessible
 */
export function sourcemapPlugin(): Plugin {
	// kilocode_change start - use resolved Vite config for outDir to avoid env mismatches
	let resolvedOutDir: string | undefined
	// kilocode_change end

	return {
		name: "vite-plugin-sourcemap",
		apply: "build",

		// kilocode_change start - prefer build.outDir from resolved config
		configResolved(config: ResolvedConfig) {
			resolvedOutDir = path.isAbsolute(config.build.outDir)
				? config.build.outDir
				: path.resolve(config.root, config.build.outDir)
		},
		// kilocode_change end

		// After the build is complete, ensure source maps are included in the build
		closeBundle: {
			order: "post",
			handler: async () => {
				console.log("Ensuring source maps are included in build...")

				// Determine the correct output directory based on the resolved Vite config
				const mode = process.env.NODE_ENV
				const outDir =
					resolvedOutDir ??
					(mode === "nightly"
						? path.resolve("../apps/vscode-nightly/build/webview-ui/build")
						: path.resolve("../src/webview-ui/build"))

				const assetsDir = path.join(outDir, "assets")

				console.log(`Source map processing for ${mode} build in ${outDir}`)

				// Check if build directory exists
				if (!fs.existsSync(outDir)) {
					console.warn("Build directory not found:", outDir)
					return
				}

				// Check if assets directory exists
				if (!fs.existsSync(assetsDir)) {
					console.warn("Assets directory not found:", assetsDir)
					return
				}

				// Find JS files in the assets directory
				const jsFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith(".js"))

				console.log(`Found ${jsFiles.length} JS files in assets directory`)

				// Check for source maps
				for (const jsFile of jsFiles) {
					const jsPath = path.join(assetsDir, jsFile)
					const mapPath = jsPath + ".map"

					// If source map exists, ensure it's properly referenced in the JS file
					if (fs.existsSync(mapPath)) {
						console.log(`Source map found for ${jsFile}`)

						// kilocode_change start - tolerate races / missing assets in parallel builds
						if (!fs.existsSync(jsPath)) {
							console.warn(`JS file not found while processing source maps: ${jsPath}`)
							continue
						}
						// kilocode_change end

						// Read the JS file
						let jsContent: string
						try {
							jsContent = fs.readFileSync(jsPath, "utf8")
						} catch (error) {
							console.warn(`Failed to read JS file while processing source maps: ${jsPath}`, error)
							continue
						}

						// Check if the source map is already referenced
						if (!jsContent.includes("//# sourceMappingURL=")) {
							console.log(`Adding source map reference to ${jsFile}`)

							// Add source map reference
							jsContent += `\n//# sourceMappingURL=${jsFile}.map\n`

							// Write the updated JS file
							fs.writeFileSync(jsPath, jsContent)
						}

						// Make sure map file is in the correct format and has proper sourceRoot
						try {
							const mapContent = JSON.parse(fs.readFileSync(mapPath, "utf8"))

							// Ensure the sourceRoot is set correctly for VSCode webview
							if (!mapContent.sourceRoot) {
								mapContent.sourceRoot = ""
							}

							// Make sure "sources" paths are relative
							if (mapContent.sources) {
								mapContent.sources = mapContent.sources.map((source: string) => {
									// Remove absolute paths to ensure they work in VSCode webview context
									return source.replace(/^\//, "")
								})
							}

							// Write back the updated source map with proper formatting
							fs.writeFileSync(mapPath, JSON.stringify(mapContent, null, 2))
							console.log(`Updated source map for ${jsFile}`)
						} catch (error) {
							console.error(`Error processing source map for ${jsFile}:`, error)
						}
					} else {
						console.log(`No source map found for ${jsFile}`)
					}
				}

				// Create a special file to enable source map loading in production
				fs.writeFileSync(
					path.join(outDir, "sourcemap-manifest.json"),
					JSON.stringify({
						enabled: true,
						version: process.env.PKG_VERSION || "unknown",
						buildTime: new Date().toISOString(),
					}),
				)

				console.log("Source map processing complete")
			},
		},
	}
}
