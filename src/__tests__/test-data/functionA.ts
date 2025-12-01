import { functionB } from './functionB';

/**
 * Тестовая функция A - выполняет простую операцию сложения
 */
export function functionA(a: number, b: number): number {
	return a + b
}

/**
 * Вспомогательная функция для вызова функции B
 */
export function callFunctionB() {
	const result = functionB(5, 3)
	console.log(`Function B returned: ${result}`)
	return result
}