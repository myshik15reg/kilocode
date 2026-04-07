import { ZodError } from "zod"

import {
	CONCURRENCY_MAX,
	CONCURRENCY_MIN,
	ITERATIONS_MAX,
	ITERATIONS_MIN,
	TIMEOUT_MAX,
	TIMEOUT_MIN,
	createRunSchema,
	executionMethodSchema,
} from "@/lib/schemas"
import { cn } from "@/lib/utils"

describe("web-evals support utilities", () => {
	it("merges class names with tailwind precedence", () => {
		expect(cn("px-2", ["text-sm"], "px-4")).toBe("text-sm px-4")
	})

	it("parses a valid full-suite payload", () => {
		const parsed = createRunSchema.parse({
			model: "gpt-5",
			suite: "full",
			concurrency: CONCURRENCY_MIN,
			timeout: TIMEOUT_MIN,
			iterations: ITERATIONS_MIN,
			executionMethod: executionMethodSchema.parse("cli"),
		})

		expect(parsed).toMatchObject({
			model: "gpt-5",
			suite: "full",
			concurrency: CONCURRENCY_MIN,
			timeout: TIMEOUT_MIN,
			iterations: ITERATIONS_MIN,
			executionMethod: "cli",
		})
	})

	it("parses a valid partial-suite payload with exercises", () => {
		const parsed = createRunSchema.parse({
			model: "gpt-5",
			description: "demo",
			suite: "partial",
			exercises: ["typescript/intro"],
			concurrency: CONCURRENCY_MAX,
			timeout: TIMEOUT_MAX,
			iterations: ITERATIONS_MAX,
			jobToken: "job-1",
			executionMethod: "vscode",
		})

		expect(parsed).toMatchObject({
			suite: "partial",
			exercises: ["typescript/intro"],
			description: "demo",
			jobToken: "job-1",
		})
	})

	it("requires exercises for partial suites", () => {
		expect(() =>
			createRunSchema.parse({
				model: "gpt-5",
				suite: "partial",
				exercises: [],
				concurrency: CONCURRENCY_MAX,
				timeout: TIMEOUT_MAX,
				iterations: ITERATIONS_MAX,
				executionMethod: "vscode",
			}),
		).toThrow(/Exercises are required when running a partial suite/)
	})

	it("requires exercises when the partial-suite payload omits the field", () => {
		expect(() =>
			createRunSchema.parse({
				model: "gpt-5",
				suite: "partial",
				concurrency: CONCURRENCY_MIN,
				timeout: TIMEOUT_MIN,
				iterations: ITERATIONS_MIN,
				executionMethod: "cli",
			}),
		).toThrow(/Exercises are required when running a partial suite/)
	})

	it("rejects unsupported execution methods", () => {
		expect(() => executionMethodSchema.parse("docker")).toThrow(ZodError)
	})
})
