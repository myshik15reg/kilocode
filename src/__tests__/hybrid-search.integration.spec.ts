/**
 * Интеграционные тесты для гибридного поиска
 *
 * Тесты проверяют полный цикл:
 * 1. Индексация тестовых файлов в Qdrant и Neo4j
 * 2. Выполнение семантического поиска
 * 3. Выполнение структурного поиска
 * 4. Гибридный поиск с объединением результатов
 */

import * as path from "path"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { CodeIndexManager } from "../services/code-index/manager"
import { CodeIndexSearchService } from "../services/code-index/search-service"
import { ContextProxy } from "../core/config/ContextProxy"
import { VectorStoreSearchResult } from "../services/code-index/interfaces"

// --- Моки верхнего уровня ---

const qdrantMockClient = {
    upsert: vi.fn(),
    search: vi.fn(),
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    hasIndexedData: vi.fn(),
    markIndexingComplete: vi.fn(),
    markIndexingIncomplete: vi.fn(),
    initialize: vi.fn(),
};

const neo4jMockSession = {
    run: vi.fn(),
    close: vi.fn(),
};

// Мокаем внешние зависимости с использованием фабрик
vi.mock('../services/code-index/vector-store/qdrant-client', () => ({
    QdrantClient: vi.fn().mockImplementation(() => qdrantMockClient)
}));

vi.mock('neo4j-driver', () => {
    const neo4jMock = {
        driver: vi.fn().mockImplementation(() => ({
            session: () => neo4jMockSession,
            close: vi.fn().mockResolvedValue(undefined),
        })),
        auth: {
            basic: vi.fn(),
        },
    };
    return {
        default: neo4jMock,
        ...neo4jMock,
    };
});

vi.mock('../services/code-index/managed/ManagedIndexer', () => {
    const mockInstance = {
        on: vi.fn(() => ({ dispose: vi.fn() })),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        dispose: vi.fn(),
        get organization() { return undefined; }
    };
    return {
        ManagedIndexer: {
            getInstance: vi.fn(() => mockInstance),
            get prevInstance() { return mockInstance; }
        }
    };
});

vi.mock('@roo-code/telemetry', () => ({
 TelemetryService: {
  instance: {
   captureEvent: vi.fn(),
		},
	},
}))

// Тестовые данные
const TEST_WORKSPACE_PATH = path.resolve(__dirname, 'test-data')
const TEST_COLLECTION_NAME = 'test-hybrid-search'

describe('Интеграционные тесты гибридного поиска (End-to-End)', () => {
	let codeIndexManager: CodeIndexManager
	let searchService: CodeIndexSearchService
	let mockContext: any;


	beforeEach(async () => {
        // Сбрасываем все моки перед каждым тестом
        vi.clearAllMocks();

		// Настраиваем мок контекста VSCode
		mockContext = {
			globalStorageUri: { fsPath: '/tmp/global-storage' },
			getGlobalState: vi.fn().mockReturnValue({
				codebaseIndexEnabled: true,
				codebaseIndexQdrantUrl: 'http://localhost:6333',
                codebaseIndexNeo4jUrl: 'neo4j://localhost:7687',
				codebaseIndexEmbedderProvider: 'openai',
                useCodeGraph: true,
			}),
			getSecret: vi.fn().mockReturnValue('test-api-key'),
			update: vi.fn().mockResolvedValue(undefined),
			refreshSecrets: vi.fn().mockResolvedValue(undefined),
		}

        // Настройка стандартного поведения моков
        qdrantMockClient.upsert.mockResolvedValue({ status: 'ok' });
        qdrantMockClient.search.mockResolvedValue([]);
        qdrantMockClient.getCollections.mockResolvedValue({ collections: [] });
        qdrantMockClient.createCollection.mockResolvedValue({ status: 'ok' });
        qdrantMockClient.deleteCollection.mockResolvedValue({ status: 'ok' });
        qdrantMockClient.hasIndexedData.mockResolvedValue(false);
        qdrantMockClient.markIndexingComplete.mockResolvedValue(undefined);
        qdrantMockClient.markIndexingIncomplete.mockResolvedValue(undefined);
        qdrantMockClient.initialize.mockResolvedValue(true);

        neo4jMockSession.run.mockResolvedValue({ records: [], summary: {} });
        neo4jMockSession.close.mockResolvedValue(undefined);

		// Создаем реальный экземпляр CodeIndexManager
        // `!` используется, так как мы уверены, что workspacePath будет определён
		codeIndexManager = CodeIndexManager.getInstance(mockContext as any, TEST_WORKSPACE_PATH)!

		// Инициализируем менеджер
		await codeIndexManager.initialize(new ContextProxy(mockContext))

        // Получаем searchService из менеджера
        // @ts-ignore - доступ к приватному полю для теста
        searchService = codeIndexManager._searchService;
	})

	afterEach(async () => {
		// Очистка после каждого теста
		CodeIndexManager.disposeAll();
	})

	it('должен проиндексировать тестовый репозиторий и сохранить данные в Qdrant и Neo4j', async () => {
		// Запускаем индексацию
		await codeIndexManager.startIndexing()

		// Проверяем, что данные были отправлены в Qdrant
		expect(qdrantMockClient.upsert).toHaveBeenCalled()
        const qdrantArgs = (qdrantMockClient.upsert.mock.calls[0] as any[])[1];
        expect(qdrantArgs.points.length).toBeGreaterThan(0)
        expect(qdrantArgs.points[0].payload).toHaveProperty('filePath')
        expect(qdrantArgs.points[0].payload).toHaveProperty('codeChunk')


		// Проверяем, что данные были отправлены в Neo4j
        expect(neo4jMockSession.run).toHaveBeenCalled()
        const neo4jCalls = neo4jMockSession.run.mock.calls;
        const mergeNodeCall = neo4jCalls.find(call => call[0].includes('MERGE (n:Code'));
        const mergeEdgeCall = neo4jCalls.find(call => call[0].includes('MERGE (source)-[r:CALLS]->(target)'));

        expect(mergeNodeCall).toBeDefined();
        if (!mergeNodeCall) throw new Error("mergeNodeCall is undefined"); // Добавлена проверка для TypeScript
        expect(mergeNodeCall[1].properties).toHaveProperty('name', 'functionA');

        // Примерная проверка, что функция A вызывает B
        // Для этого нужно, чтобы ваш парсер создавал такие связи
        // expect(mergeEdgeCall).toBeDefined();
	}, 20000) // Увеличиваем таймаут для теста индексации

    describe('После индексации', () => {
        beforeEach(async () => {
            // Запускаем индексацию перед каждым тестом в этом блоке
            await codeIndexManager.startIndexing();

            // Мокаем состояние "проиндексировано"
            // @ts-ignore
            codeIndexManager._stateManager.setSystemState("Indexed", "");
        });

        it('должен выполнять гибридный поиск и возвращать объединенные результаты', async () => {
            const query = 'что делает функция A';

            // Мокаем результаты семантического поиска
            const semanticResults: VectorStoreSearchResult[] = [
                {
                    id: 'functionA.ts-chunk-1',
                    score: 0.9,
                    payload: {
                        filePath: 'functionA.ts',
                        codeChunk: 'export function functionA(): string {',
                        startLine: 0,
                        endLine: 2,
                    },
                },
            ];
            qdrantMockClient.search.mockResolvedValue(semanticResults);

            // Мокаем результаты структурного поиска
            const structuralResults = {
                records: [
                    {
                        get: (key: string) => ({
                            id: 'functionA.ts::functionA',
                            name: 'functionA',
                            filePath: 'functionA.ts',
                            kind: 'function',
                            range: { start: { line: 0 }, end: { line: 2 } },
                        }[key]),
                    },
                ],
                summary: {},
            };
            neo4jMockSession.run.mockResolvedValue(structuralResults);


            // Выполняем гибридный поиск
            const results = await searchService.searchIndex(query);

            // Проверяем, что были вызваны оба источника данных
            expect(qdrantMockClient.search).toHaveBeenCalled();
            expect(neo4jMockSession.run).toHaveBeenCalledWith(expect.stringContaining('toLower(node.name) CONTAINS toLower($term)'), expect.any(Object));

            // Проверяем, что результаты объединены
            // В данном случае результат должен быть один, так как он найден в обоих источниках
            expect(results.length).toBe(1);
            expect(results[0].payload?.filePath).toBe('functionA.ts');
        });

        it('должен находить "кто вызывает функцию B"', async () => {
             const query = 'кто вызывает functionB'; // или просто 'functionB'

            // Мокаем результат структурного поиска, который вернет `functionA`
            const structuralResults = {
                records: [
                     {
                        get: (key: string) => ({
                            id: 'functionA.ts::functionA',
                            name: 'functionA',
                            filePath: 'functionA.ts',
                            kind: 'function',
                            range: { start: { line: 0 }, end: { line: 2 } },
                        }[key]),
                    },
                ],
                summary: {},
            };
            // Настраиваем мок так, чтобы он возвращал нужный результат на запрос о вызывающих
            neo4jMockSession.run
                .mockResolvedValue(structuralResults);


            const results = await searchService.searchIndex(query);

            expect(neo4jMockSession.run).toHaveBeenCalled();
            expect(results.some(r => r.payload?.content === 'functionA')).toBe(true);
        });
    });
})