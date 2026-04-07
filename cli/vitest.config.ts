import { defineConfig } from "vitest/config"
import path from "path"

const coverageConfig = {
	provider: "v8" as const,
	reporter: ["text", "json-summary", "html"],
	exclude: ["node_modules/**", "dist/**", "integration-tests/**", "**/*.test.ts", "**/*.config.*"],
}

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx", "integration-tests/**/*.test.ts"],
		testTimeout: 30000,
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		globals: true,
		coverage: coverageConfig,
		environment: "node",
		reporters: ["verbose"],
		deps: {
			optimizer: {
				web: {
					exclude: ["@kilocode/agent-runtime", "@kilocode/core-schemas"],
				},
			},
		},
	},
	resolve: {
		conditions: ["import", "module", "default"],
		alias: {
			"@kilocode/agent-runtime": path.resolve(__dirname, "../packages/agent-runtime/src"),
		},
	},
})
