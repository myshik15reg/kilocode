// @ts-nocheck
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
		exclude: ["dist/**", "node_modules/**"],
		testTimeout: 15000,
		hookTimeout: 15000,
	},
})
