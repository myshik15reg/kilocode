import path from "path"

import { defineConfig } from "vitest/config"

const coverageConfig = {
	provider: "v8" as const,
	reporter: ["text", "json-summary", "html"],
	include: ["src/actions/**/*.ts", "src/lib/**/*.ts", "src/middleware.ts", "src/app/api/health/route.ts"],
	exclude: ["**/*.spec.ts", "**/*.test.ts", "**/__tests__/**"],
	thresholds: {
		lines: 100,
		branches: 100,
		functions: 100,
		statements: 100,
	},
}

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		watch: false,
		coverage: coverageConfig,
	},
})
