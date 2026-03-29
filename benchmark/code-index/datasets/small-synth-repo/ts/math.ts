export function add(a: number, b: number): number {
	return a + b
}

export function sub(a: number, b: number): number {
	return a - b
}

export function fib(n: number): number {
	if (n <= 1) return n
	return fib(n - 1) + fib(n - 2)
}

export function isEven(n: number): boolean {
	return n % 2 === 0
}
