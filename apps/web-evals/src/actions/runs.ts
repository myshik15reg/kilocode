"use server"

import * as path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { spawn, execFileSync } from "child_process"

import { revalidatePath } from "next/cache"
import pMap from "p-map"
import { z } from "zod"

import {
	type ExerciseLanguage,
	exerciseLanguages,
	createRun as persistRun,
	deleteRun as removeRun,
	updateRun as updatePersistedRun,
	getIncompleteRuns as listIncompleteRuns,
	deleteRunsByIds,
	createTask,
	findRun,
	getExercisesForLanguage,
} from "@roo-code/evals"

import { createRunSchema, type CreateRun } from "@/lib/schemas"
import { nullableDescriptionSchema, parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"

const EVALS_STORAGE_PATH = "/tmp/evals/runs"
const EVALS_REPO_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../evals")

const createRunInputSchema = createRunSchema
const deleteOldRunsCutoffSchema = z.date()

export async function createRun(input: CreateRun) {
	await requireWebEvalsAuthorization()
	const parsedInput = createRunInputSchema.parse(input)
	const { suite, exercises = [], timeout, iterations = 1, executionMethod = "vscode", ...values } = parsedInput

	const run = await persistRun({
		...values,
		timeout,
		executionMethod,
		socketPath: "",
	})

	if (suite === "partial") {
		for (const exercisePath of exercises) {
			const [language, exercise] = exercisePath.split("/")

			if (!language || !exercise) {
				throw new Error(`Invalid exercise path: ${exercisePath}`)
			}

			for (let iteration = 1; iteration <= iterations; iteration++) {
				await createTask({
					...values,
					runId: run.id,
					language: language as ExerciseLanguage,
					exercise,
					iteration,
				})
			}
		}
	} else {
		for (const language of exerciseLanguages) {
			const languageExercises = await getExercisesForLanguage(EVALS_REPO_PATH, language)
			const tasksToCreate: Array<{ language: ExerciseLanguage; exercise: string; iteration: number }> = []
			for (const exercise of languageExercises) {
				for (let iteration = 1; iteration <= iterations; iteration++) {
					tasksToCreate.push({ language, exercise, iteration })
				}
			}

			await pMap(
				tasksToCreate,
				({ language, exercise, iteration }) => createTask({ runId: run.id, language, exercise, iteration }),
				{ concurrency: 10 },
			)
		}
	}

	revalidatePath("/runs")

	try {
		const isRunningInDocker = fs.existsSync("/.dockerenv")
		const dockerArgs = [
			`--name evals-controller-${run.id}`,
			"--rm",
			"--network evals_default",
			"-v /var/run/docker.sock:/var/run/docker.sock",
			"-v /tmp/evals:/var/log/evals",
			"-e HOST_EXECUTION_METHOD=docker",
		]

		const cliCommand = `pnpm --filter @roo-code/evals cli --runId ${run.id}`
		const command = isRunningInDocker
			? `docker run ${dockerArgs.join(" ")} evals-runner sh -c "${cliCommand}"`
			: cliCommand

		console.log("spawn ->", command)

		const childProcess = spawn("sh", ["-c", command], {
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
		})

		const logStream = fs.createWriteStream("/tmp/roo-code-evals.log", { flags: "a" })
		childProcess.stdout?.pipe(logStream)
		childProcess.stderr?.pipe(logStream)
		childProcess.unref()
	} catch (error) {
		console.error(error)
	}

	return run
}

export async function deleteRun(runId: number) {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)
	await removeRun(parsedRunId)
	revalidatePath("/runs")
}

export type KillRunResult = {
	success: boolean
	killedContainers: string[]
	errors: string[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function killRun(runId: number): Promise<KillRunResult> {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)

	try {
		const run = await findRun(parsedRunId)
		if (run.taskMetricsId !== null) {
			return {
				success: false,
				killedContainers: [],
				errors: ["Run is already completed"],
			}
		}
	} catch (error) {
		return {
			success: false,
			killedContainers: [],
			errors: [
				error instanceof Error && error.name === "RecordNotFoundError"
					? "Run not found"
					: "Failed to load run state",
			],
		}
	}

	const killedContainers: string[] = []
	const errors: string[] = []
	const controllerPattern = `evals-controller-${parsedRunId}`
	const taskPattern = `evals-task-${parsedRunId}-`

	try {
		console.log(`Killing controller: ${controllerPattern}`)
		try {
			execFileSync("docker", ["kill", controllerPattern], { encoding: "utf-8", timeout: 10000 })
			killedContainers.push(controllerPattern)
			console.log(`Killed controller container: ${controllerPattern}`)
		} catch {
			console.log(`Controller ${controllerPattern} not running or already stopped`)
		}

		console.log("Waiting 10 seconds before killing runners...")
		await sleep(10000)

		let taskContainerNames: string[] = []
		try {
			const output = execFileSync("docker", ["ps", "--format", "{{.Names}}", "--filter", `name=${taskPattern}`], {
				encoding: "utf-8",
				timeout: 10000,
			})
			taskContainerNames = output
				.split("\n")
				.map((name) => name.trim())
				.filter((name) => name.length > 0 && name.startsWith(taskPattern))
		} catch (error) {
			console.error("Failed to list task containers:", error)
			errors.push("Failed to list Docker task containers")
		}

		for (const containerName of taskContainerNames) {
			try {
				execFileSync("docker", ["kill", containerName], { encoding: "utf-8", timeout: 10000 })
				killedContainers.push(containerName)
				console.log(`Killed task container: ${containerName}`)
			} catch (error) {
				console.error(`Failed to kill container ${containerName}:`, error)
				errors.push(`Failed to kill container: ${containerName}`)
			}
		}

		try {
			const redis = await redisClient()
			await redis.del(`heartbeat:${parsedRunId}`)
			await redis.del(`runners:${parsedRunId}`)
			console.log(`Cleared Redis keys: heartbeat:${parsedRunId}, runners:${parsedRunId}`)
		} catch (error) {
			console.error("Failed to clear Redis state:", error)
			errors.push("Failed to clear Redis state")
		}
	} catch (error) {
		console.error("Error in killRun:", error)
		errors.push("Unexpected error while killing containers")
	}

	revalidatePath(`/runs/${parsedRunId}`)
	revalidatePath("/runs")

	return {
		success: killedContainers.length > 0 || errors.length === 0,
		killedContainers,
		errors,
	}
}

export type DeleteIncompleteRunsResult = {
	success: boolean
	deletedCount: number
	deletedRunIds: number[]
	storageErrors: string[]
}

export async function deleteIncompleteRuns(): Promise<DeleteIncompleteRunsResult> {
	await requireWebEvalsAuthorization()
	const storageErrors: string[] = []
	const incompleteRuns = await listIncompleteRuns()
	const runIds = incompleteRuns.map((run) => run.id)

	if (runIds.length === 0) {
		return {
			success: true,
			deletedCount: 0,
			deletedRunIds: [],
			storageErrors: [],
		}
	}

	for (const runId of runIds) {
		const storagePath = path.join(EVALS_STORAGE_PATH, String(runId))
		try {
			if (fs.existsSync(storagePath)) {
				fs.rmSync(storagePath, { recursive: true, force: true })
				console.log(`Deleted storage folder: ${storagePath}`)
			}
		} catch (error) {
			console.error(`Failed to delete storage folder ${storagePath}:`, error)
			storageErrors.push(`Failed to delete storage for run ${runId}`)
		}

		try {
			const redis = await redisClient()
			await redis.del(`heartbeat:${runId}`)
			await redis.del(`runners:${runId}`)
		} catch (error) {
			console.error(`Failed to clear Redis state for run ${runId}:`, error)
		}
	}

	await deleteRunsByIds(runIds)
	revalidatePath("/runs")

	return {
		success: true,
		deletedCount: runIds.length,
		deletedRunIds: runIds,
		storageErrors,
	}
}

export async function getIncompleteRunsCount(): Promise<number> {
	await requireWebEvalsAuthorization()
	const incompleteRuns = await listIncompleteRuns()
	return incompleteRuns.length
}

export async function deleteOldRuns(): Promise<DeleteIncompleteRunsResult> {
	await requireWebEvalsAuthorization()
	const storageErrors: string[] = []
	const thirtyDaysAgo = deleteOldRunsCutoffSchema.parse(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
	const { getRuns } = await import("@roo-code/evals")
	const allRuns = await getRuns()
	const oldRuns = allRuns.filter((run) => run.createdAt < thirtyDaysAgo)
	const runIds = oldRuns.map((run) => run.id)

	if (runIds.length === 0) {
		return {
			success: true,
			deletedCount: 0,
			deletedRunIds: [],
			storageErrors: [],
		}
	}

	for (const runId of runIds) {
		const storagePath = path.join(EVALS_STORAGE_PATH, String(runId))
		try {
			if (fs.existsSync(storagePath)) {
				fs.rmSync(storagePath, { recursive: true, force: true })
				console.log(`Deleted storage folder: ${storagePath}`)
			}
		} catch (error) {
			console.error(`Failed to delete storage folder ${storagePath}:`, error)
			storageErrors.push(`Failed to delete storage for run ${runId}`)
		}

		try {
			const redis = await redisClient()
			await redis.del(`heartbeat:${runId}`)
			await redis.del(`runners:${runId}`)
		} catch (error) {
			console.error(`Failed to clear Redis state for run ${runId}:`, error)
		}
	}

	await deleteRunsByIds(runIds)
	revalidatePath("/runs")

	return {
		success: true,
		deletedCount: runIds.length,
		deletedRunIds: runIds,
		storageErrors,
	}
}

export async function updateRunDescription(runId: number, description: string | null): Promise<{ success: boolean }> {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)
	const parsedDescription = nullableDescriptionSchema.parse(description)

	try {
		await updatePersistedRun(parsedRunId, { description: parsedDescription })
		revalidatePath("/runs")
		revalidatePath(`/runs/${parsedRunId}`)
		return { success: true }
	} catch (error) {
		console.error("Failed to update run description:", error)
		return { success: false }
	}
}
