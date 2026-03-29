import { add, fib } from "./math"
import { formatNumber } from "./format"

export function runExample(n: number): string {
	const x = add(n, 10)
	const y = fib(7)
	return `${formatNumber(x)}:${y}`
}
