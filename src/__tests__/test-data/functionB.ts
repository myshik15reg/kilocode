import { functionC } from "./functionC";
/**
 * Тестовая функция B - выполняет умножение
 */
export function functionB(x: number, y: number): number {
	return x * y
}

/**
 * Функция для вызова функции C
 */
export function callFunctionC() {
	const message = functionC("Hello from B")
	console.log(message)
	return message.length
}