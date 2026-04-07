import fs from "fs"

import { spawn } from "child_process"
import { PassThrough } from "stream"
import { revalidatePath } from "next/cache"

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
	parseRunId: vi.fn((value: unknown) => Number(value) + 1000),
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
	exerciseLanguages: ["typescript", "python"],
	getExercisesForLanguage: vi.fn(async (_repoPath: string, language: string) => {
		if (language === "typescript") {
			return ["intro", "advanced"]
		}

		return ["basics"]
	}),
	getRuns: vi.fn().mockResolvedValue([]),
}))

import { nullableDescriptionSchema, parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"
import {
	createRun as persistRun,
	createTask,
	deleteRun as removeRun,
	deleteRunsByIds,
	getExercisesForLanguage,
	getIncompleteRuns,
	getRuns,
	updateRun as updatePersistedRun,
} from "@roo-code/evals"

import {
	createRun,
	deleteIncompleteRuns,
	deleteOldRuns,
	deleteRun,
	getIncompleteRunsCount,
	updateRunDescription,
} from "../runs"

const mockSpawn = vi.mocked(spawn)
const mockPersistRun = vi.mocked(persistRun)
const mockCreateTask = vi.mocked(createTask)
const mockDeleteRunsByIds = vi.mocked(deleteRunsByIds)
const mockGetExercisesForLanguage = vi.mocked(getExercisesForLanguage)
const mockGetIncompleteRuns = vi.mocked(getIncompleteRuns)
const mockGetRuns = vi.mocked(getRuns)
const mockNullableDescriptionSchema = vi.mocked(nullableDescriptionSchema)
const mockParseRunId = vi.mocked(parseRunId)
const mockRedisClient = vi.mocked(redisClient)
const mockRemoveRun = vi.mocked(removeRun)
const mockRequireWebEvalsAuthorization = vi.mocked(requireWebEvalsAuthorization)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockUpdatePersistedRun = vi.mocked(updatePersistedRun)

describe("runs lifecycle actions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPersistRun.mockResolvedValue({ id: 42 } as never)
		mockRequireWebEvalsAuthorization.mockResolvedValue(undefined)
		mockParseRunId.mockImplementation((value: unknown) => Number(value) + 1000)
		mockNullableDescriptionSchema.parse.mockImplementation((value) => value as string | null)
		mockRedisClient.mockResolvedValue({ del: vi.fn().mockResolvedValue(1) } as never)
		mockGetIncompleteRuns.mockResolvedValue([] as never)
		mockGetRuns.mockResolvedValue([] as never)
		mockGetExercisesForLanguage.mockImplementation(async (_repoPath: string, language: string) => {
			if (language === "typescript") {
				return ["intro", "advanced"]
			}

			return ["basics"]
		})
		mockSpawn.mockReturnValue({
			stdout: { pipe: vi.fn() },
			stderr: { pipe: vi.fn() },
			unref: vi.fn(),
		} as never)
		vi.spyOn(fs, "existsSync").mockReturnValue(false)
		vi.spyOn(fs, "createWriteStream").mockReturnValue(new PassThrough() as never)
		vi.spyOn(fs, "rmSync").mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("creates tasks for every selected partial exercise and iteration", async () => {
		await expect(
			createRun({
				model: "gpt-5",
				suite: "partial",
				exercises: ["typescript/intro", "python/basics"],
				concurrency: 1,
				timeout: 5,
				iterations: 2,
				executionMethod: "cli",
			}),
		).resolves.toEqual({ id: 42 })

		expect(mockPersistRun).toHaveBeenCalledWith({
			model: "gpt-5",
			concurrency: 1,
			timeout: 5,
			executionMethod: "cli",
			socketPath: "",
		})
		expect(mockCreateTask).toHaveBeenCalledTimes(4)
		expect(mockCreateTask).toHaveBeenCalledWith({
			model: "gpt-5",
			concurrency: 1,
			runId: 42,
			language: "typescript",
			exercise: "intro",
			iteration: 1,
		})
		expect(mockCreateTask).toHaveBeenCalledWith({
			model: "gpt-5",
			concurrency: 1,
			runId: 42,
			language: "python",
			exercise: "basics",
			iteration: 2,
		})
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs")
		expect(mockSpawn).toHaveBeenCalledWith(
			"sh",
			["-c", expect.stringContaining("pnpm --filter @roo-code/evals cli --runId 42")],
			expect.objectContaining({ detached: true }),
		)
	})

	it("creates tasks for the full suite across all exercise languages", async () => {
		await expect(
			createRun({
				model: "gpt-5",
				suite: "full",
				concurrency: 2,
				timeout: 6,
				iterations: 2,
				executionMethod: "vscode",
			}),
		).resolves.toEqual({ id: 42 })

		expect(mockGetExercisesForLanguage).toHaveBeenCalledTimes(2)
		expect(mockCreateTask).toHaveBeenCalledTimes(6)
		expect(mockCreateTask).toHaveBeenCalledWith({
			runId: 42,
			language: "typescript",
			exercise: "intro",
			iteration: 1,
		})
		expect(mockCreateTask).toHaveBeenCalledWith({
			runId: 42,
			language: "python",
			exercise: "basics",
			iteration: 2,
		})
	})

	it("rejects malformed exercise paths before spawning the runner", async () => {
		await expect(
			createRun({
				model: "gpt-5",
				suite: "partial",
				exercises: ["broken-path"],
				concurrency: 1,
				timeout: 5,
				iterations: 1,
				executionMethod: "vscode",
			}),
		).rejects.toThrow("Invalid exercise path: broken-path")

		expect(mockPersistRun).toHaveBeenCalledTimes(1)
		expect(mockSpawn).not.toHaveBeenCalled()
	})

	it("wraps the CLI command in docker when already running inside a container", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((target) => String(target) === "/.dockerenv")

		await expect(
			createRun({
				model: "gpt-5",
				suite: "full",
				concurrency: 1,
				timeout: 5,
				iterations: 1,
				executionMethod: "cli",
			}),
		).resolves.toEqual({ id: 42 })

		expect(mockSpawn).toHaveBeenCalledWith(
			"sh",
			["-c", expect.stringContaining("docker run --name evals-controller-42")],
			expect.objectContaining({ detached: true }),
		)
	})

	it("returns the run even when background process startup fails", async () => {
		mockSpawn.mockImplementationOnce(() => {
			throw new Error("spawn failed")
		})

		await expect(
			createRun({
				model: "gpt-5",
				suite: "full",
				concurrency: 1,
				timeout: 5,
				iterations: 1,
				executionMethod: "vscode",
			}),
		).resolves.toEqual({ id: 42 })
	})

	it("deletes a run using the parsed run id", async () => {
		await expect(deleteRun(12)).resolves.toBeUndefined()
		expect(mockParseRunId).toHaveBeenCalledWith(12)
		expect(mockRemoveRun).toHaveBeenCalledWith(1012)
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs")
	})

	it("returns early when there are no incomplete runs to delete", async () => {
		await expect(deleteIncompleteRuns()).resolves.toEqual({
			success: true,
			deletedCount: 0,
			deletedRunIds: [],
			storageErrors: [],
		})

		expect(mockDeleteRunsByIds).not.toHaveBeenCalled()
	})

	it("deletes incomplete runs, accumulates storage errors, and tolerates redis cleanup failures", async () => {
		const redisDel = vi.fn().mockResolvedValue(1)
		mockGetIncompleteRuns.mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as never)
		mockRedisClient
			.mockRejectedValueOnce(new Error("redis unavailable"))
			.mockResolvedValueOnce({ del: redisDel } as never)

		vi.spyOn(fs, "existsSync").mockImplementation(
			(target) => String(target).endsWith("1") || String(target).endsWith("2"),
		)
		vi.spyOn(fs, "rmSync").mockImplementation((target) => {
			if (String(target).endsWith("1")) {
				throw new Error("permission denied")
			}
		})

		await expect(deleteIncompleteRuns()).resolves.toEqual({
			success: true,
			deletedCount: 2,
			deletedRunIds: [1, 2],
			storageErrors: ["Failed to delete storage for run 1"],
		})

		expect(mockDeleteRunsByIds).toHaveBeenCalledWith([1, 2])
		expect(redisDel).toHaveBeenCalledWith("heartbeat:2")
		expect(redisDel).toHaveBeenCalledWith("runners:2")
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs")
	})

	it("counts incomplete runs after authorization", async () => {
		mockGetIncompleteRuns.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }] as never)

		await expect(getIncompleteRunsCount()).resolves.toBe(3)
		expect(mockRequireWebEvalsAuthorization).toHaveBeenCalledTimes(1)
	})

	it("returns early when there are no old runs to delete", async () => {
		mockGetRuns.mockResolvedValueOnce([{ id: 10, createdAt: new Date() }] as never)

		await expect(deleteOldRuns()).resolves.toEqual({
			success: true,
			deletedCount: 0,
			deletedRunIds: [],
			storageErrors: [],
		})
	})

	it("collects old-run cleanup errors without failing the delete operation", async () => {
		const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
		mockGetRuns.mockResolvedValueOnce([{ id: 7, createdAt: oldDate }] as never)
		mockRedisClient.mockRejectedValueOnce(new Error("redis unavailable"))
		vi.spyOn(fs, "existsSync").mockImplementation((target) => String(target).endsWith("7"))
		vi.spyOn(fs, "rmSync").mockImplementation(() => {
			throw new Error("permission denied")
		})

		await expect(deleteOldRuns()).resolves.toEqual({
			success: true,
			deletedCount: 1,
			deletedRunIds: [7],
			storageErrors: ["Failed to delete storage for run 7"],
		})

		expect(mockDeleteRunsByIds).toHaveBeenCalledWith([7])
	})

	it("deletes only runs older than thirty days", async () => {
		const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
		const newDate = new Date()
		const redisDel = vi.fn().mockResolvedValue(1)
		mockGetRuns.mockResolvedValueOnce([
			{ id: 5, createdAt: oldDate },
			{ id: 6, createdAt: newDate },
		] as never)
		mockRedisClient.mockResolvedValueOnce({ del: redisDel } as never)
		vi.spyOn(fs, "existsSync").mockImplementation((target) => String(target).endsWith("5"))

		await expect(deleteOldRuns()).resolves.toEqual({
			success: true,
			deletedCount: 1,
			deletedRunIds: [5],
			storageErrors: [],
		})

		expect(mockDeleteRunsByIds).toHaveBeenCalledWith([5])
		expect(redisDel).toHaveBeenCalledWith("heartbeat:5")
		expect(redisDel).toHaveBeenCalledWith("runners:5")
	})

	it("updates a run description and revalidates affected pages", async () => {
		await expect(updateRunDescription(11, "Updated")).resolves.toEqual({ success: true })
		expect(mockParseRunId).toHaveBeenCalledWith(11)
		expect(mockNullableDescriptionSchema.parse).toHaveBeenCalledWith("Updated")
		expect(mockUpdatePersistedRun).toHaveBeenCalledWith(1011, { description: "Updated" })
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs")
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs/1011")
	})

	it("returns a failure flag when updating a description throws", async () => {
		mockUpdatePersistedRun.mockRejectedValueOnce(new Error("write failed"))

		await expect(updateRunDescription(11, null)).resolves.toEqual({ success: false })
		expect(mockNullableDescriptionSchema.parse).toHaveBeenCalledWith(null)
	})
})
