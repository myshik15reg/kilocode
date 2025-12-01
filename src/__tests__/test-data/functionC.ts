/**
 * Тестовая функция C - работает со строками
 */
export function functionC(message: string): string {
	return `Processed: ${message.toUpperCase()}`
}

/**
 * Класс D для демонстрации наследования
 */
export class ClassD {
	protected name: string
	
	constructor(name: string) {
		this.name = name
	}
	
	getName(): string {
		return this.name
	}
}

/**
 * Класс C наследуется от класса D
 */
export class ClassC extends ClassD {
	constructor(name: string, private value: number) {
		super(name)
	}
	
	getValue(): number {
		return this.value
	}
	
	override toString(): string {
		return `${this.getName()}: ${this.value}`
	}
}