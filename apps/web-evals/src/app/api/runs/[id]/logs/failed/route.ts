import * as fs from "node:fs"
import * as path from "node:path"

import archiver from "archiver"
import { NextResponse, type NextRequest } from "next/server"
import { ZodError } from "zod"

import { findRun, getTasks } from "@roo-code/evals"

import { buildWebEvalsAuthFailureResponse, parseRunId } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

const LOG_BASE_PATH = "/tmp/evals/runs"

function sanitizePathComponent(component: string): string {
	return component.replace(/[/\\:\0*?"<>|]/g, "_")
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const authFailureResponse = buildWebEvalsAuthFailureResponse(request.headers.get("authorization"))
	if (authFailureResponse) {
		return authFailureResponse
	}

	const { id } = await params

	try {
		const runId = parseRunId(Number(id))

		await findRun(runId)
		const tasks = await getTasks(runId)
		const failedTasks = tasks.filter((task) => task.passed === false)

		if (failedTasks.length === 0) {
			return NextResponse.json({ error: "No failed tasks to export" }, { status: 400 })
		}

		const archive = archiver("zip", { zlib: { level: 9 } })
		const chunks: Buffer[] = []
		archive.on("data", (chunk: Buffer) => {
			chunks.push(chunk)
		})

		let archiveError: Error | null = null
		archive.on("error", (error: Error) => {
			archiveError = error
		})

		const archiveEndPromise = new Promise<void>((resolve, reject) => {
			archive.on("end", resolve)
			archive.on("error", reject)
		})

		const logDir = path.join(LOG_BASE_PATH, String(runId))
		const expectedBase = path.resolve(LOG_BASE_PATH)
		let filesAdded = 0

		for (const task of failedTasks) {
			const safeLanguage = sanitizePathComponent(task.language)
			const safeExercise = sanitizePathComponent(task.exercise)

			const logFileName = `${safeLanguage}-${safeExercise}.log`
			const logFilePath = path.join(logDir, logFileName)
			const resolvedLogPath = path.resolve(logFilePath)
			if (resolvedLogPath.startsWith(expectedBase) && fs.existsSync(logFilePath)) {
				archive.file(logFilePath, { name: logFileName })
				filesAdded++
			}

			const apiHistoryFileName = `${safeLanguage}-${safeExercise}.${task.iteration}_api_conversation_history.json`
			const apiHistoryFilePath = path.join(logDir, apiHistoryFileName)
			const resolvedApiHistoryPath = path.resolve(apiHistoryFilePath)
			if (resolvedApiHistoryPath.startsWith(expectedBase) && fs.existsSync(apiHistoryFilePath)) {
				archive.file(apiHistoryFilePath, { name: apiHistoryFileName })
				filesAdded++
			}

			const uiMessagesFileName = `${safeLanguage}-${safeExercise}.${task.iteration}_ui_messages.json`
			const uiMessagesFilePath = path.join(logDir, uiMessagesFileName)
			const resolvedUiMessagesPath = path.resolve(uiMessagesFilePath)
			if (resolvedUiMessagesPath.startsWith(expectedBase) && fs.existsSync(uiMessagesFilePath)) {
				archive.file(uiMessagesFilePath, { name: uiMessagesFileName })
				filesAdded++
			}
		}

		if (filesAdded === 0) {
			archive.abort()
			return NextResponse.json(
				{ error: "No log files found - they may have been cleared from disk" },
				{ status: 404 },
			)
		}

		await archive.finalize()
		await archiveEndPromise

		if (archiveError) {
			throw archiveError
		}

		const zipBuffer = Buffer.concat(chunks)
		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="run-${runId}-failed-logs.zip"`,
				"Content-Length": String(zipBuffer.length),
			},
		})
	} catch (error) {
		console.error("Error exporting failed logs:", error)

		if (error instanceof ZodError) {
			return NextResponse.json({ error: "Invalid run ID" }, { status: 400 })
		}

		if (error instanceof Error && error.name === "RecordNotFoundError") {
			return NextResponse.json({ error: "Run not found" }, { status: 404 })
		}

		return NextResponse.json({ error: "Failed to export logs" }, { status: 500 })
	}
}
