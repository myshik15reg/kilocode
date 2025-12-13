/**
 * Класс для тестирования индексации классов
 */
export class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  subtract(a: number, b: number): number {
    const result = a - b;
    this.history.push(result);
    return result;
  }

  getHistory(): number[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

export interface MathOperation {
  type: 'add' | 'subtract' | 'multiply' | 'divide';
  operands: [number, number];
}