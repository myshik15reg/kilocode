"use server"

import { parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"
import { redisClient } from "@/lib/server/redis"

export const getRunners = async (runId: number) => {
	await requireWebEvalsAuthorization()
	const parsedRunId = parseRunId(runId)
	const redis = await redisClient()
	return redis.sMembers(`runners:${parsedRunId}`)
}
