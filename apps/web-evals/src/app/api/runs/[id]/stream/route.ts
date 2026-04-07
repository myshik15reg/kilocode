import { NextResponse, type NextRequest } from "next/server"
import { ZodError } from "zod"

import { findRun } from "@roo-code/evals"
import { taskEventSchema } from "@roo-code/types"

import { buildWebEvalsAuthFailureResponse, parseRunId } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"
import { SSEStream } from "@/lib/server/sse-stream"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const authFailureResponse = buildWebEvalsAuthFailureResponse(request.headers.get("authorization"))
	if (authFailureResponse) {
		return authFailureResponse
	}

	const { id } = await params
	const requestId = crypto.randomUUID()
	const stream = new SSEStream()

	let runId: number
	try {
		runId = parseRunId(Number(id))
	} catch (error) {
		if (error instanceof ZodError) {
			return NextResponse.json({ error: "Invalid run ID" }, { status: 400 })
		}

		throw error
	}

	let run
	try {
		run = await findRun(runId)
	} catch (error) {
		if (error instanceof Error && error.name === "RecordNotFoundError") {
			return NextResponse.json({ error: "Run not found" }, { status: 404 })
		}

		throw error
	}

	const redis = await redisClient()
	let isStreamClosed = false
	const channelName = `evals:${run.id}`

	const disconnect = async () => {
		if (isStreamClosed) {
			return
		}

		isStreamClosed = true

		try {
			await redis.unsubscribe(channelName)
			console.log(`[stream#${requestId}] unsubscribed from ${channelName}`)
		} catch (error) {
			console.error(`[stream#${requestId}] error unsubscribing:`, error)
		}

		try {
			await stream.close()
		} catch (error) {
			console.error(`[stream#${requestId}] error closing stream:`, error)
		}
	}

	const onMessage = async (data: string) => {
		if (isStreamClosed || stream.isClosed) {
			return
		}

		try {
			const taskEvent = taskEventSchema.parse(JSON.parse(data))
			const writeSuccess = await stream.write(JSON.stringify(taskEvent))

			if (!writeSuccess) {
				await disconnect()
			}
		} catch {
			console.error(`[stream#${requestId}] invalid task event:`, data)
		}
	}

	await redis.subscribe(channelName, onMessage)

	request.signal.addEventListener("abort", () => {
		console.log(`[stream#${requestId}] abort`)

		disconnect().catch((error) => {
			console.error(`[stream#${requestId}] cleanup error:`, error)
		})
	})

	return stream.getResponse()
}
