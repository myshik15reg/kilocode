import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url" // kilocode_change

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		watch: false,
	},
	resolve: {
		alias: {
			// On Windows `new URL(...).pathname` may contain percent-encoding (e.g. spaces -> %20)
			// which breaks module resolution.
			vscode: fileURLToPath(new URL("./src/__mocks__/vscode.ts", import.meta.url)), // kilocode_change
		},
	},
})
