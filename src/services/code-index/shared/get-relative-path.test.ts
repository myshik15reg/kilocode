import { describe, test, expect } from "vitest"
import { generateRelativeFilePath } from "./get-relative-path"

describe("generateRelativeFilePath", () => {
	test("should handle paths with non-ASCII characters (e.g., Cyrillic)", () => {
		const workspaceRoot = "c:/Users/Евгений/Documents/kilocode"
		const absolutePath = "c:/Users/Евгений/Documents/kilocode/src/shared/kilocode/wrapper.ts"

		const relativePath = generateRelativeFilePath(absolutePath, workspaceRoot)

		// The expected path should be normalized to POSIX format
		expect(relativePath).toBe("src/shared/kilocode/wrapper.ts")
	})

	test("should handle paths with spaces and special characters", () => {
		const workspaceRoot = "c:/Users/Евгений/Documents/My Project"
		const absolutePath = "c:/Users/Евгений/Documents/My Project/src/components/some file.ts"

		const relativePath = generateRelativeFilePath(absolutePath, workspaceRoot)

		expect(relativePath).toBe("src/components/some file.ts")
	})

	test("should handle simple ASCII paths correctly", () => {
		const workspaceRoot = "/home/user/project"
		const absolutePath = "/home/user/project/src/index.ts"

		const relativePath = generateRelativeFilePath(absolutePath, workspaceRoot)

		expect(relativePath).toBe("src/index.ts")
	})

	test("should handle paths that are the same as the root", () => {
		const workspaceRoot = "c:/Users/Евгений/Documents/kilocode"
		const absolutePath = "c:/Users/Евгений/Documents/kilocode"

		const relativePath = generateRelativeFilePath(absolutePath, workspaceRoot)

		expect(relativePath).toBe("")
	})
})