// kilocode_change - new file
import { IEmbedder, EmbeddingResponse, EmbedderInfo } from "../interfaces"

/**
 * Wrapper around {@link IEmbedder} that throttles requests to a maximum number per minute.
 *
 * Key properties:
 * - Shared across consumers: if the same instance is used by `DirectoryScanner` and `FileWatcher`,
 *   they will automatically share the same limiter.
 * - Dynamic config: `getRpm()` is evaluated per request, so updated settings are applied without
 *   recreating the embedder.
 */
export class ThrottledEmbedder implements IEmbedder {
	private queue: Promise<void> = Promise.resolve()
	private lastRequestTimeMs = 0

	/**
	 * @param inner underlying embedder implementation
	 * @param getRpm provides current RPM setting (optional)
	 */
	constructor(
		private readonly inner: IEmbedder,
		private readonly getRpm: () => number | undefined,
	) {}

	public async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
		return this.runThrottled(() => this.inner.createEmbeddings(texts, model))
	}

	public async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
		return this.inner.validateConfiguration()
	}

	public get embedderInfo(): EmbedderInfo {
		return this.inner.embedderInfo
	}

	private runThrottled<T>(fn: () => Promise<T>): Promise<T> {
		const task = this.queue.then(async () => {
			const rpmCandidate = this.getRpm()
			const rpm =
				typeof rpmCandidate === "number" && Number.isFinite(rpmCandidate) && rpmCandidate > 0
					? rpmCandidate
					: 60
			const minIntervalMs = Math.ceil(60000 / rpm)

			const now = Date.now()
			const nextAllowedTime = this.lastRequestTimeMs + minIntervalMs
			const waitMs = Math.max(0, nextAllowedTime - now)

			if (waitMs > 0) {
				await ThrottledEmbedder.sleep(waitMs)
			}

			this.lastRequestTimeMs = Date.now()
			return fn()
		})

		// Ensure the queue always continues, even if the task fails.
		this.queue = task.then(
			() => undefined,
			() => undefined,
		)

		return task
	}

	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
