import { defineConfig } from "vitest/config"
import path from "path"
import { resolveVerbosity } from "../src/utils/vitest-verbosity"

const { silent, reporters, onConsoleLog } = resolveVerbosity()

const coverageConfig = {
	provider: "v8" as const,
	reporter: ["text", "json-summary", "html"],
	exclude: [
		"build/**",
		"coverage/**",
		"dist/**",
		"scripts/**",
		"**/*.d.ts",
		"**/*.test.*",
		"**/*.spec.*",
		"**/__tests__/**",
		"**/__mocks__/**",
		"vitest.config.ts",
		"vitest.setup.ts",
	],
}

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		watch: false,
		reporters,
		silent,
		environment: "jsdom",
		include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
		onConsoleLog,
		retry: process.env.CI ? 2 : 0,
		coverage: coverageConfig,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@src": path.resolve(__dirname, "./src"),
			"@roo": path.resolve(__dirname, "../src/shared"),
			vscode: path.resolve(__dirname, "./src/__mocks__/vscode.ts"),
		},
	},
})
