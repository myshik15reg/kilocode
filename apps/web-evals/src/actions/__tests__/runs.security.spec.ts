import { spawn } from "child_process"

vi.mock("child_process", () => ({
	execFileSync: vi.fn(),
	spawn: vi.fn(),
}))

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}))

vi.mock("@/lib/server/redis", () => ({
	redisClient: vi.fn(),
}))

vi.mock("@/lib/server/auth", () => ({
	nullableDescriptionSchema: { parse: vi.fn((value) => value) },
	parseRunId: vi.fn((value) => value),
	requireWebEvalsAuthorization: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@roo-code/evals", () => ({
	createRun: vi.fn().mockResolvedValue({ id: 42 }),
	deleteRun: vi.fn(),
	updateRun: vi.fn(),
	getIncompleteRuns: vi.fn().mockResolvedValue([]),
	deleteRunsByIds: vi.fn(),
	createTask: vi.fn(),
	findRun: vi.fn(),
	exerciseLanguages: [],
	getExercisesForLanguage: vi.fn().mockResolvedValue([]),
}))

import { requireWebEvalsAuthorization } from "@/lib/server/auth"
import { createRun as persistRun } from "@roo-code/evals"

import { createRun } from "../runs"

const mockSpawn = vi.mocked(spawn)
const mockRequireWebEvalsAuthorization = vi.mocked(requireWebEvalsAuthorization)
const mockPersistRun = vi.mocked(persistRun)

describe("runs security", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockRequireWebEvalsAuthorization.mockResolvedValue(undefined)
		mockPersistRun.mockResolvedValue({ id: 42 } as never)
		mockSpawn.mockReturnValue({
			stdout: { pipe: vi.fn() },
			stderr: { pipe: vi.fn() },
			unref: vi.fn(),
		} as never)
	})

	it("rejects unauthenticated createRun requests before creating a run", async () => {
		mockRequireWebEvalsAuthorization.mockRejectedValueOnce(new Error("Unauthorized"))

		await expect(
			createRun({
				model: "gpt-5",
				suite: "full",
				concurrency: 1,
				timeout: 5,
				iterations: 1,
				executionMethod: "vscode",
			}),
		).rejects.toThrow("Unauthorized")

		expect(mockPersistRun).not.toHaveBeenCalled()
	})

	it("validates createRun payload on the server before persisting", async () => {
		await expect(
			createRun({
				model: "gpt-5",
				suite: "partial",
				exercises: [],
				concurrency: 1,
				timeout: 5,
				iterations: 1,
				executionMethod: "vscode",
			} as never),
		).rejects.toThrow()

		expect(mockPersistRun).not.toHaveBeenCalled()
		expect(mockSpawn).not.toHaveBeenCalled()
	})
})
