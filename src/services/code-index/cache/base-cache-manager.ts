/**
 * Базовый класс для менеджеров кеша Neo4j и векторного поиска
 */

import type { BaseCacheState, ICacheManager } from "./types"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Абстрактный базовый класс для менеджеров кеша
 * @template T Тип состояния кеша, расширяющий BaseCacheState
 */
export abstract class BaseCacheManager<T extends BaseCacheState> implements ICacheManager<T> {
	/** Текущее состояние кеша */
	protected state: T | null = null
	/** Путь к файлу кеша */
	protected cacheFilePath: string
	/** Флаг инициализации */
	protected initialized = false

	/**
	 * Создать менеджер кеша
	 * @param workspaceRoot Корневая директория workspace
	 * @param cacheName Имя кеша (используется для имени файла)
	 * @param version Версия формата кеша
	 */
	constructor(
		protected workspaceRoot: string,
		protected cacheName: string,
		protected version: string = "1.0.0",
	) {
		this.cacheFilePath = path.join(workspaceRoot, ".kilo-code-cache", `${cacheName}.json`)
	}

	/**
	 * Инициализировать кеш
	 * Создает директорию и загружает или создает состояние
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		try {
			// Создать директорию для кеша если не существует
			const cacheDir = path.dirname(this.cacheFilePath)
			await fs.mkdir(cacheDir, { recursive: true })

			// Загрузить существующее состояние или создать новое
			await this.loadState()

			this.initialized = true
		} catch (error) {
			console.error(`Failed to initialize ${this.cacheName} cache:`, error)
			throw error
		}
	}

	/**
	 * Получить текущее состояние кеша
	 * @returns Состояние кеша или null если не инициализирован
	 */
	async getState(): Promise<T | null> {
		if (!this.initialized) {
			await this.initialize()
		}
		return this.state
	}

	/**
	 * Обновить состояние кеша
	 * @param updates Частичное обновление состояния
	 */
	async updateState(updates: Partial<T>): Promise<void> {
		if (!this.initialized) {
			await this.initialize()
		}

		if (!this.state) {
			this.state = this.createDefaultState()
		}

		this.state = {
			...this.state,
			...updates,
			lastUpdated: Date.now(),
		}

		await this.saveState()
	}

	/**
	 * Сбросить кеш
	 * Создает новое состояние по умолчанию и сохраняет его
	 */
	async reset(): Promise<void> {
		this.state = this.createDefaultState()
		await this.saveState()
	}

	/**
	 * Проверить валидность кеша
	 * @returns true если кеш валиден
	 */
	async isValid(): Promise<boolean> {
		const state = await this.getState()
		if (!state) {
			return false
		}

		// Проверить версию
		if (state.version !== this.version) {
			return false
		}

		return state.isValid
	}

	/**
	 * Пометить файл как проиндексированный
	 * @param filePath Путь к файлу
	 */
	async markFileIndexed(filePath: string): Promise<void> {
		if (!this.state) {
			await this.initialize()
		}

		if (!this.state) {
			throw new Error("Cache state is not initialized")
		}

		const files = this.state.lastIndexedFiles || []
		if (!files.includes(filePath)) {
			files.push(filePath)
			await this.updateState({ lastIndexedFiles: files } as Partial<T>)
		}
	}

	/**
	 * Получить список проиндексированных файлов
	 * @returns Массив путей к файлам
	 */
	async getIndexedFiles(): Promise<string[]> {
		const state = await this.getState()
		return state?.lastIndexedFiles || []
	}

	/**
	 * Создать состояние по умолчанию
	 * Должно быть реализовано в подклассах
	 * @returns Новое состояние кеша по умолчанию
	 */
	protected abstract createDefaultState(): T

	/**
	 * Загрузить состояние из файла
	 * Если файл не существует, создается новое состояние
	 */
	protected async loadState(): Promise<void> {
		try {
			const data = await fs.readFile(this.cacheFilePath, "utf-8")
			this.state = JSON.parse(data) as T
		} catch (error: any) {
			if (error.code === "ENOENT") {
				// Файл не существует - создать новое состояние
				this.state = this.createDefaultState()
				await this.saveState()
			} else {
				throw error
			}
		}
	}

	/**
	 * Сохранить состояние в файл
	 * Записывает JSON с форматированием для читаемости
	 */
	protected async saveState(): Promise<void> {
		if (!this.state) {
			return
		}

		await fs.writeFile(this.cacheFilePath, JSON.stringify(this.state, null, 2), "utf-8")
	}
}