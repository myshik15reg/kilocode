import { defineConfig } from "vitest/config"

const coverageConfig = {
	provider: "v8" as const,
	reporter: ["text", "json-summary", "html"],
	exclude: ["dist/**", "node_modules/**", "src/**/*.spec.ts", "src/**/*.test.ts"],
}

export default defineConfig({
	test: {
		include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
		exclude: ["dist/**", "node_modules/**"],
		testTimeout: 60000,
		hookTimeout: 60000,
		coverage: coverageConfig,
	},
})
