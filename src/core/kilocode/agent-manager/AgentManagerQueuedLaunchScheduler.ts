// kilocode_change - new file
import type { CreateSessionOptions } from "./AgentRegistry"

export interface QueuedSessionLaunchOptions extends CreateSessionOptions {
	labelOverride?: string
	sessionId?: string
	existingBranch?: string
	helperProfile?: string
	images?: string[]
}

export interface QueuedSessionLaunch {
	prompt: string
	queueKey: string
	rootScopeKey: string
	options?: QueuedSessionLaunchOptions
}

interface AgentManagerQueuedLaunchSchedulerDeps {
	hasSessionLaunchCapacity: () => boolean
	hasQueueKeyCapacity: (queueKey: string) => boolean
	getActiveSessionLoad: () => number
	getMaxConcurrentSessionStarts: () => number
	startLaunch: (prompt: string, options?: QueuedSessionLaunchOptions) => Promise<void>
	log: (message: string) => void
}

export function getQueuedSessionLaunchQueueKey(
	options?: Pick<QueuedSessionLaunchOptions, "sessionGroup" | "sessionId">,
): string {
	return options?.sessionGroup?.groupId || options?.sessionId || "root:default"
}

export function getQueuedSessionLaunchRootScopeKey(
	options?: Pick<QueuedSessionLaunchOptions, "sessionGroup" | "sessionId">,
): string {
	return options?.sessionGroup?.rootSessionId || options?.sessionId || "root:default"
}

export class AgentManagerQueuedLaunchScheduler {
	private queuedSessionLaunches: QueuedSessionLaunch[] = []
	private drainingQueuedSessionLaunches = false
	private lastDequeuedQueueKey: string | undefined
	private lastDequeuedRootScopeKey: string | undefined

	constructor(private readonly deps: AgentManagerQueuedLaunchSchedulerDeps) {}

	public get queuedLaunches(): readonly QueuedSessionLaunch[] {
		return this.queuedSessionLaunches
	}

	public hasQueuedLaunches(): boolean {
		return this.queuedSessionLaunches.length > 0
	}

	public replaceQueuedLaunches(launches: QueuedSessionLaunch[]): void {
		this.queuedSessionLaunches = [...launches]
	}

	public clearQueuedLaunches(): void {
		this.queuedSessionLaunches = []
	}

	public async startOrEnqueue(prompt: string, options?: QueuedSessionLaunchOptions): Promise<void> {
		if (this.hasQueuedLaunches() || !this.deps.hasSessionLaunchCapacity()) {
			this.queuedSessionLaunches.push({
				prompt,
				options,
				queueKey: getQueuedSessionLaunchQueueKey(options),
				rootScopeKey: getQueuedSessionLaunchRootScopeKey(options),
			})
			this.deps.log(
				`[AgentManager] Queued session launch (${this.queuedSessionLaunches.length} waiting, active=${this.deps.getActiveSessionLoad()}, limit=${this.deps.getMaxConcurrentSessionStarts()})`,
			)
			return
		}

		await this.deps.startLaunch(prompt, options)
	}

	public dequeueNextLaunch(): QueuedSessionLaunch | undefined {
		if (this.queuedSessionLaunches.length === 0) {
			return undefined
		}

		const candidateIndexes = this.queuedSessionLaunches
			.map((launch, index) => ({ launch, index }))
			.filter(({ launch }) => this.deps.hasQueueKeyCapacity(launch.queueKey))

		if (candidateIndexes.length === 0) {
			return undefined
		}

		const rootPreferredCandidates = candidateIndexes.filter(
			({ launch }) => launch.rootScopeKey !== this.lastDequeuedRootScopeKey,
		)
		const rootScopedPool = rootPreferredCandidates.length > 0 ? rootPreferredCandidates : candidateIndexes
		const preferredCandidate =
			rootScopedPool.find(({ launch }) => launch.queueKey !== this.lastDequeuedQueueKey) || rootScopedPool[0]
		const [nextLaunch] = this.queuedSessionLaunches.splice(preferredCandidate.index, 1)
		this.lastDequeuedQueueKey = nextLaunch.queueKey
		this.lastDequeuedRootScopeKey = nextLaunch.rootScopeKey
		return nextLaunch
	}

	public async drainQueuedLaunches(): Promise<void> {
		if (this.drainingQueuedSessionLaunches) {
			return
		}

		this.drainingQueuedSessionLaunches = true
		try {
			while (this.queuedSessionLaunches.length > 0 && this.deps.hasSessionLaunchCapacity()) {
				const nextLaunch = this.dequeueNextLaunch()
				if (!nextLaunch) {
					break
				}

				this.deps.log(
					`[AgentManager] Dequeued session launch${nextLaunch.options?.labelOverride ? `: ${nextLaunch.options.labelOverride}` : ""}`,
				)
				await this.deps.startLaunch(nextLaunch.prompt, nextLaunch.options)
			}
		} finally {
			this.drainingQueuedSessionLaunches = false
		}
	}

	public removeQueuedLaunches(predicate: (launch: QueuedSessionLaunch) => boolean): QueuedSessionLaunch[] {
		const kept: QueuedSessionLaunch[] = []
		const removed: QueuedSessionLaunch[] = []

		for (const launch of this.queuedSessionLaunches) {
			if (predicate(launch)) {
				removed.push(launch)
				continue
			}

			kept.push(launch)
		}

		this.queuedSessionLaunches = kept
		return removed
	}
}
