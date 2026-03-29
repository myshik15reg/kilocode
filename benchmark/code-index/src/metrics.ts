export type Histogram = {
	count: number
	sumMs: number
	minMs: number
	maxMs: number
	samplesMs: number[]
}

export type Counters = Record<string, number>

export type RunMetrics = {
	runId: string
	startedAt: string
	finishedAt?: string

	config: unknown

	counters: Counters
	histograms: Record<string, Histogram>
	notes: string[]
}

export function createHistogram(): Histogram {
	return { count: 0, sumMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0, samplesMs: [] }
}

export function observe(h: Histogram, ms: number): void {
	h.count += 1
	h.sumMs += ms
	h.minMs = Math.min(h.minMs, ms)
	h.maxMs = Math.max(h.maxMs, ms)
	h.samplesMs.push(ms)
}

export function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)))
	return sorted[idx] ?? sorted[sorted.length - 1]!
}

export function summarizeHistogram(h: Histogram): {
	count: number
	avgMs: number
	minMs: number
	p50Ms: number
	p95Ms: number
	maxMs: number
} {
	const avgMs = h.count > 0 ? h.sumMs / h.count : 0
	const p50Ms = percentile(h.samplesMs, 50)
	const p95Ms = percentile(h.samplesMs, 95)
	return {
		count: h.count,
		avgMs,
		minMs: Number.isFinite(h.minMs) ? h.minMs : 0,
		p50Ms,
		p95Ms,
		maxMs: h.maxMs,
	}
}

export class MetricsCollector {
	public readonly state: RunMetrics

	constructor(runId: string, config: unknown) {
		this.state = {
			runId,
			startedAt: new Date().toISOString(),
			config,
			counters: {},
			histograms: {},
			notes: [],
		}
	}

	inc(counter: string, by = 1): void {
		this.state.counters[counter] = (this.state.counters[counter] ?? 0) + by
	}

	note(text: string): void {
		this.state.notes.push(text)
	}

	observeMs(hist: string, ms: number): void {
		if (!this.state.histograms[hist]) {
			this.state.histograms[hist] = createHistogram()
		}
		observe(this.state.histograms[hist]!, ms)
	}

	finish(): void {
		this.state.finishedAt = new Date().toISOString()
	}
}
