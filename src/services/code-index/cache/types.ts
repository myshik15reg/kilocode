/**
 * Типы и интерфейсы для системы кеширования Neo4j и векторного поиска
 */

/**
 * Базовое состояние кеша
 */
export interface BaseCacheState {
	/** Временная метка последнего обновления (timestamp) */
	lastUpdated: number
	/** Флаг валидности кеша */
	isValid: boolean
	/** Версия формата кеша */
	version: string
	/** Список последних проиндексированных файлов */
	lastIndexedFiles: string[]
}

/**
 * Состояние кеша векторного хранилища
 */
export interface VectorCacheState extends BaseCacheState {
	/** Количество чанков в векторном хранилище */
	chunkCount: number
	/** Идентификатор модели векторизации */
	modelId: string
	/** Имя коллекции в векторном хранилище */
	collectionName: string
}

/**
 * Состояние кеша графовой базы данных
 */
export interface GraphCacheState extends BaseCacheState {
	/** Количество сущностей в графе */
	entityCount: number
	/** Количество связей в графе */
	relationshipCount: number
	/** Файлы, ожидающие индексации */
	pendingFiles: string[]
}

/**
 * Результат сравнения состояний кешей
 */
export interface CacheSyncStatus {
	/** Состояние векторного кеша */
	vectorState: VectorCacheState | null
	/** Состояние графового кеша */
	graphState: GraphCacheState | null
	/** Флаг включения графовой базы данных */
	isGraphEnabled: boolean
	/** Флаг синхронизации кешей */
	isSynced: boolean
	/** Флаг необходимости синхронизации */
	needsSync: boolean
	/** Количество файлов ожидающих синхронизации */
	pendingSyncCount: number
	/** Список проблем синхронизации */
	syncIssues: string[]
}

/**
 * Интерфейс менеджера кеша
 */
export interface ICacheManager<T extends BaseCacheState> {
	/**
	 * Инициализировать кеш
	 */
	initialize(): Promise<void>

	/**
	 * Получить текущее состояние кеша
	 * @returns Состояние кеша или null если не инициализирован
	 */
	getState(): Promise<T | null>

	/**
	 * Обновить состояние кеша
	 * @param state Частичное обновление состояния
	 */
	updateState(state: Partial<T>): Promise<void>

	/**
	 * Сбросить кеш
	 */
	reset(): Promise<void>

	/**
	 * Проверить валидность кеша
	 * @returns true если кеш валиден
	 */
	isValid(): Promise<boolean>

	/**
	 * Пометить файл как проиндексированный
	 * @param filePath Путь к файлу
	 */
	markFileIndexed(filePath: string): Promise<void>

	/**
	 * Получить список проиндексированных файлов
	 * @returns Массив путей к файлам
	 */
	getIndexedFiles(): Promise<string[]>
}

/**
 * Опции для синхронизации
 */
export interface SyncOptions {
	/** Принудительная полная синхронизация */
	forceFullSync?: boolean
	/** Размер batch для синхронизации */
	batchSize?: number
	/** Пропустить валидацию */
	skipValidation?: boolean
}

/**
 * Результат синхронизации
 */
export interface SyncResult {
	/** Флаг успешности операции */
	success: boolean
	/** Количество синхронизированных файлов */
	syncedCount: number
	/** Количество файлов с ошибками */
	failedCount: number
	/** Количество пропущенных файлов */
	skippedCount: number
	/** Список ошибок */
	errors: Array<{ file: string; error: string }>
	/** Длительность операции в миллисекундах */
	duration: number
}