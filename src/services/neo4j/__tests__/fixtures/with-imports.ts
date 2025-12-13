import { calculateSum } from './simple-function';
import * as path from 'path';

/**
 * Функция с импортами для тестирования связей между файлами
 */
export function processNumbers(nums: number[]): number {
  return nums.reduce((acc, curr) => calculateSum(acc, curr), 0);
}

export function getFilePath(filename: string): string {
  return path.join(__dirname, filename);
}