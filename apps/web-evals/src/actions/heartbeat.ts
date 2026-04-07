"use server"

import { parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"

export const getHeartbeat = async (runId: number) => {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)
	const redis = await redisClient()
	return redis.get(`heartbeat:${parsedRunId}`)
}
