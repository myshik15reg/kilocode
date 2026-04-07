"use server"

import { revalidatePath } from "next/cache"

import { getTasks as loadTasks } from "@roo-code/evals"

import { parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"

export async function getTasks(runId: number) {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)
	const tasks = await loadTasks(parsedRunId)
	revalidatePath(`/runs/${parsedRunId}`)
	return tasks
}
