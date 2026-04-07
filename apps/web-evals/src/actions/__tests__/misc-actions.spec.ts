import { revalidatePath } from "next/cache"

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}))

vi.mock("@/lib/server/auth", () => ({
	parseRunId: vi.fn((value: unknown) => Number(value) + 100),
	requireWebEvalsAuthorization: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/server/redis", () => ({
	redisClient: vi.fn(),
}))

vi.mock("@roo-code/evals", () => ({
	client: { kind: "source" },
	copyRun: vi.fn(),
	exerciseLanguages: ["typescript", "python"],
	getProductionClient: vi.fn(() => ({ kind: "target" })),
	getTasks: vi.fn(),
	listDirectories: vi.fn(async (_cwd: string, languagePath: string) => {
		if (languagePath.includes("typescript")) {
			return ["intro", "advanced"]
		}

		return ["basics"]
	}),
}))

import { parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"
import { copyRun, getProductionClient, getTasks as loadTasks, listDirectories } from "@roo-code/evals"

import { copyRunToProduction } from "@/lib/actions"
import { getExercises } from "../exercises"
import { getHeartbeat } from "../heartbeat"
import { getRunners } from "../runners"
import { getTasks } from "../tasks"

const mockParseRunId = vi.mocked(parseRunId)
const mockRedisClient = vi.mocked(redisClient)
const mockRequireWebEvalsAuthorization = vi.mocked(requireWebEvalsAuthorization)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockLoadTasks = vi.mocked(loadTasks)
const mockCopyRun = vi.mocked(copyRun)
const mockGetProductionClient = vi.mocked(getProductionClient)
const mockListDirectories = vi.mocked(listDirectories)

describe("web-evals misc actions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockParseRunId.mockImplementation((value: unknown) => Number(value) + 100)
		mockRequireWebEvalsAuthorization.mockResolvedValue(undefined)
		mockRedisClient.mockResolvedValue({
			get: vi.fn().mockResolvedValue("alive"),
			sMembers: vi.fn().mockResolvedValue(["runner-a", "runner-b"]),
		} as never)
		mockLoadTasks.mockResolvedValue([{ id: 1, title: "Task" }] as never)
		mockCopyRun.mockResolvedValue(undefined as never)
		mockGetProductionClient.mockReturnValue({ kind: "target" } as never)
	})

	it("lists exercises for every configured language after authorization", async () => {
		await expect(getExercises()).resolves.toEqual(["typescript/intro", "typescript/advanced", "python/basics"])

		expect(mockRequireWebEvalsAuthorization).toHaveBeenCalledTimes(1)
		expect(mockListDirectories).toHaveBeenCalledTimes(2)
		expect(mockListDirectories.mock.calls[0]?.[1]).toContain("evals")
		expect(mockListDirectories.mock.calls[0]?.[1]).toContain("typescript")
		expect(mockListDirectories.mock.calls[1]?.[1]).toContain("python")
	})

	it("loads heartbeat data from redis using the parsed run id", async () => {
		const redis = { get: vi.fn().mockResolvedValue("healthy") }
		mockRedisClient.mockResolvedValueOnce(redis as never)

		await expect(getHeartbeat(5)).resolves.toBe("healthy")
		expect(mockRequireWebEvalsAuthorization).toHaveBeenCalledTimes(1)
		expect(mockParseRunId).toHaveBeenCalledWith(5)
		expect(redis.get).toHaveBeenCalledWith("heartbeat:105")
	})

	it("loads runner ids from redis using the parsed run id", async () => {
		const redis = { sMembers: vi.fn().mockResolvedValue(["runner-1"]) }
		mockRedisClient.mockResolvedValueOnce(redis as never)

		await expect(getRunners(7)).resolves.toEqual(["runner-1"])
		expect(mockParseRunId).toHaveBeenCalledWith(7)
		expect(redis.sMembers).toHaveBeenCalledWith("runners:107")
	})

	it("revalidates the run page after loading tasks", async () => {
		const tasks = [{ id: 10 }, { id: 11 }]
		mockLoadTasks.mockResolvedValueOnce(tasks as never)

		await expect(getTasks(3)).resolves.toEqual(tasks)
		expect(mockLoadTasks).toHaveBeenCalledWith(103)
		expect(mockRevalidatePath).toHaveBeenCalledWith("/runs/103")
	})

	it("copies a run to production and returns a success message", async () => {
		await expect(copyRunToProduction(42)).resolves.toEqual({
			success: true,
			message: "Run 42 successfully copied to production.",
		})

		expect(mockCopyRun).toHaveBeenCalledWith({
			sourceDb: { kind: "source" },
			targetDb: { kind: "target" },
			runId: 42,
		})
	})

	it("returns a descriptive error when copying a run fails", async () => {
		mockCopyRun.mockRejectedValueOnce(new Error("database unavailable"))

		await expect(copyRunToProduction(99)).resolves.toEqual({
			success: false,
			error: "Failed to copy run 99 to production: database unavailable.",
		})
	})

	it("handles non-Error copy failures", async () => {
		mockCopyRun.mockRejectedValueOnce("boom")

		await expect(copyRunToProduction(100)).resolves.toEqual({
			success: false,
			error: "Failed to copy run 100 to production: Unknown error.",
		})
	})
})
