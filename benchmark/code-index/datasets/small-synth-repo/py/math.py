def add(a: int, b: int) -> int:
	return a + b


def fib(n: int) -> int:
	if n <= 1:
		return n
	return fib(n - 1) + fib(n - 2)


class Calculator:
	def sum10(self, n: int) -> int:
		return add(n, 10)

