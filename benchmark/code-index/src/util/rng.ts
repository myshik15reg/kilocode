export function mulberry32(seed: number): () => number {
	let t = seed >>> 0
	return () => {
		t += 0x6d2b79f5
		let x = t
		x = Math.imul(x ^ (x >>> 15), x | 1)
		x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296
	}
}

export function sample<T>(arr: T[], n: number, rng: () => number): T[] {
	if (n <= 0) return []
	if (n >= arr.length) return [...arr]
	const a = [...arr]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[a[i], a[j]] = [a[j]!, a[i]!]
	}
	return a.slice(0, n)
}
