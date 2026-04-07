import { defineConfig } from "vitest/config"
import path from "path"
import { resolveVerbosity } from "./utils/vitest-verbosity"

const { silent, reporters, onConsoleLog } = resolveVerbosity()

const coverageConfig = {
	provider: "v8" as const,
	reporter: ["text", "json-summary", "html"],
	exclude: [
		"coverage/**",
		"dist/**",
		"**/*.d.ts",
		"**/*.test.*",
		"**/*.spec.*",
		"**/__tests__/**",
		"**/__mocks__/**",
		"vitest.config.ts",
		"vitest.setup.ts",
		"services/continuedev/core/test/**",
	],
}

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./vitest.setup.ts", "./services/continuedev/core/test/vitest.setup.ts"],
		globalSetup: "./services/continuedev/core/test/vitest.global-setup.ts",
		watch: false,
		reporters,
		silent,
		testTimeout: 60_000,
		hookTimeout: 60_000,
		onConsoleLog,
		coverage: coverageConfig,
	},
	resolve: {
		alias: {
			vscode: path.resolve(__dirname, "./__mocks__/vscode.js"),
		},
	},
})
