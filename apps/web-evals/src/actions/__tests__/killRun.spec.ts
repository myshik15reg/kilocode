import { execFileSync } from "child_process"

vi.mock("child_process", () => ({
	execFileSync: vi.fn(),
	spawn: vi.fn(),
}))

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}))

vi.mock("@/lib/server/redis", () => ({
	redisClient: vi.fn().mockResolvedValue({
		del: vi.fn().mockResolvedValue(1),
	}),
}))

vi.mock("@/lib/server/auth", () => ({
	nullableDescriptionSchema: { parse: vi.fn((value) => value) },
	parseRunId: vi.fn((value) => value),
	requireWebEvalsAuthorization: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@roo-code/evals", () => ({
	createRun: vi.fn(),
	deleteRun: vi.fn(),
	updateRun: vi.fn(),
	getIncompleteRuns: vi.fn().mockResolvedValue([]),
	deleteRunsByIds: vi.fn(),
	createTask: vi.fn(),
	findRun: vi.fn().mockResolvedValue({ id: 123, taskMetricsId: null }),
	exerciseLanguages: [],
	getExercisesForLanguage: vi.fn().mockResolvedValue([]),
}))

vi.useFakeTimers()

import { requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"
import { findRun } from "@roo-code/evals"

import { killRun } from "../runs"

const mockExecFileSync = vi.mocked(execFileSync)
const mockRequireWebEvalsAuthorization = vi.mocked(requireWebEvalsAuthorization)
const mockRedisClient = vi.mocked(redisClient)
const mockFindRun = vi.mocked(findRun)

describe("killRun", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockRequireWebEvalsAuthorization.mockResolvedValue(undefined)
		mockFindRun.mockResolvedValue({ id: 123, taskMetricsId: null } as never)
		mockRedisClient.mockResolvedValue({ del: vi.fn().mockResolvedValue(1) } as never)
	})

	afterEach(() => {
		vi.clearAllTimers()
	})

	it("rejects unauthenticated requests before touching Docker", async () => {
		mockRequireWebEvalsAuthorization.mockRejectedValueOnce(new Error("Unauthorized"))

		await expect(killRun(123)).rejects.toThrow("Unauthorized")
		expect(mockFindRun).not.toHaveBeenCalled()
		expect(mockExecFileSync).not.toHaveBeenCalled()
	})

	it("returns an error when the run is already completed", async () => {
		mockFindRun.mockResolvedValueOnce({ id: 123, taskMetricsId: 999 } as never)

		await expect(killRun(123)).resolves.toEqual({
			success: false,
			killedContainers: [],
			errors: ["Run is already completed"],
		})

		expect(mockExecFileSync).not.toHaveBeenCalled()
	})

	it("returns an error when the run does not exist", async () => {
		const error = new Error("missing")
		error.name = "RecordNotFoundError"
		mockFindRun.mockRejectedValueOnce(error)

		await expect(killRun(123)).resolves.toEqual({
			success: false,
			killedContainers: [],
			errors: ["Run not found"],
		})

		expect(mockExecFileSync).not.toHaveBeenCalled()
	})

	it("returns a generic load error when run lookup fails unexpectedly", async () => {
		mockFindRun.mockRejectedValueOnce(new Error("db offline"))

		await expect(killRun(123)).resolves.toEqual({
			success: false,
			killedContainers: [],
			errors: ["Failed to load run state"],
		})
	})

	it("kills the controller first, waits, then kills matching task containers", async () => {
		mockFindRun.mockResolvedValueOnce({ id: 123, taskMetricsId: null } as never)
		mockExecFileSync
			.mockReturnValueOnce("")
			.mockReturnValueOnce("evals-task-123-456.0\nevals-task-123-789.1\n")
			.mockReturnValueOnce("")
			.mockReturnValueOnce("")

		const resultPromise = killRun(123)
		await vi.advanceTimersByTimeAsync(10000)
		const result = await resultPromise

		expect(result).toEqual({
			success: true,
			killedContainers: ["evals-controller-123", "evals-task-123-456.0", "evals-task-123-789.1"],
			errors: [],
		})
	})

	it("treats an already stopped controller as non-fatal", async () => {
		mockExecFileSync
			.mockImplementationOnce(() => {
				throw new Error("not running")
			})
			.mockReturnValueOnce("")

		const resultPromise = killRun(123)
		await vi.advanceTimersByTimeAsync(10000)
		await expect(resultPromise).resolves.toEqual({
			success: true,
			killedContainers: [],
			errors: [],
		})
	})

	it("reports failures when listing task containers fails", async () => {
		mockExecFileSync.mockReturnValueOnce("").mockImplementationOnce(() => {
			throw new Error("docker ps failed")
		})

		const resultPromise = killRun(123)
		await vi.advanceTimersByTimeAsync(10000)
		await expect(resultPromise).resolves.toEqual({
			success: true,
			killedContainers: ["evals-controller-123"],
			errors: ["Failed to list Docker task containers"],
		})
	})

	it("reports failures when killing task containers fails", async () => {
		mockExecFileSync
			.mockReturnValueOnce("")
			.mockReturnValueOnce("evals-task-123-456.0\n")
			.mockImplementationOnce(() => {
				throw new Error("kill failed")
			})

		const resultPromise = killRun(123)
		await vi.advanceTimersByTimeAsync(10000)
		await expect(resultPromise).resolves.toEqual({
			success: true,
			killedContainers: ["evals-controller-123"],
			errors: ["Failed to kill container: evals-task-123-456.0"],
		})
	})

	it("reports failures when redis cleanup fails", async () => {
		mockExecFileSync.mockReturnValueOnce("").mockReturnValueOnce("")
		mockRedisClient.mockRejectedValueOnce(new Error("redis down"))

		const resultPromise = killRun(123)
		await vi.advanceTimersByTimeAsync(10000)
		await expect(resultPromise).resolves.toEqual({
			success: true,
			killedContainers: ["evals-controller-123"],
			errors: ["Failed to clear Redis state"],
		})
	})

	it("returns an unexpected-error result when the kill sequence throws outside nested handlers", async () => {
		const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
			throw new Error("logging failed")
		})

		await expect(killRun(123)).resolves.toEqual({
			success: false,
			killedContainers: [],
			errors: ["Unexpected error while killing containers"],
		})

		consoleLogSpy.mockRestore()
	})

	it("clears Redis state after stopping the run", async () => {
		const mockDel = vi.fn().mockResolvedValue(1)
		mockRedisClient.mockResolvedValueOnce({ del: mockDel } as never)
		mockExecFileSync.mockReturnValueOnce("").mockReturnValueOnce("")

		const resultPromise = killRun(789)
		await vi.advanceTimersByTimeAsync(10000)
		await resultPromise

		expect(mockDel).toHaveBeenCalledWith("heartbeat:789")
		expect(mockDel).toHaveBeenCalledWith("runners:789")
	})
})
