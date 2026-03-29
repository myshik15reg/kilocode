import pino from "pino"

export type Logger = pino.Logger

export function createLogger(level: string, pretty = true): Logger {
	if (pretty) {
		return pino({
			level,
			transport: {
				target: "pino-pretty",
				options: {
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
			},
		})
	}

	return pino({ level })
}
