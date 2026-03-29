/**
 * Integration Tests for Neo4j + Qdrant Hybrid Search
 *
 * Эти тесты проверяют реальную интеграцию Neo4j + Qdrant + Kilocode.
 * НЕ используют моки - работают с реальными сервисами.
 *
 * Требования для запуска:
 * - Neo4j запущен на bolt://localhost:7687
 * - Qdrant запущен (опционально)
 * - Переменные окружения: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 *
 * Запуск: cd src && pnpm test services/neo4j/__tests__/integration/hybrid-search.integration.spec.ts
 */

import { Neo4jConnectionManager } from "../../connection-manager"
import { Neo4jGraphService } from "../../graph-service"
import { RelationshipIndexer } from "../../relationship-indexer"
import { HybridSearchService } from "../../hybrid-search-service"
import { RelationshipExtractor } from "../../relationship-extractor"
import type { CodeEntity, CodeRelationship, Neo4jConfig } from "../../interfaces"
import { Parser, Language } from "web-tree-sitter"
import { readFileSync } from "fs"
import { join } from "path"

// Конфигурация Neo4j из окружения или значения по умолчанию
const NEO4J_CONFIG: Neo4jConfig = {
	uri: process.env.NEO4J_URI || "bolt://localhost:7687",
	username: process.env.NEO4J_USER || "neo4j",
	password: process.env.NEO4J_PASSWORD || "password",
	database: process.env.NEO4J_DATABASE || "neo4j",
}

// Проверка доступности Neo4j
// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
// Root cause: `it.skipIf(!isNeo4jAvailable)` вычислялся до `beforeAll`, поэтому почти все кейсы всегда пропускались.
// Решение: вычислять доступность Neo4j на верхнем уровне до объявления тестов.
const isNeo4jAvailable = await checkNeo4jAvailability()

/**
 * Проверяет доступность Neo4j перед запуском тестов
 */
async function checkNeo4jAvailability(): Promise<boolean> {
	const connectionManager = Neo4jConnectionManager.getInstance()
	try {
		await connectionManager.connect(NEO4J_CONFIG)
		return await connectionManager.verifyConnectivity()
	} catch (error) {
		console.warn("[Integration Test] Neo4j недоступен:", error)
		return false
	} finally {
		// Best-effort cleanup: availability check не должен оставлять открытое соединение.
		try {
			await connectionManager.disconnect()
		} catch {
			// ignore
		}
	}
}

describe("Neo4j + Qdrant Integration Tests", () => {
	let connectionManager: Neo4jConnectionManager
	let graphService: Neo4jGraphService
	let indexer: RelationshipIndexer
	let extractor: RelationshipExtractor
	let parser: Parser | null = null

	// Performance метрики
	const performanceMetrics = {
		connectionTime: 0,
		initializationTime: 0,
		indexingTime: 0,
		searchTime: 0,
	}

	beforeAll(async () => {
		if (!isNeo4jAvailable) {
			console.warn("⚠️  Neo4j недоступен. Пропуск integration тестов.")
			console.warn(`   Убедитесь что Neo4j запущен на ${NEO4J_CONFIG.uri}`)
			return
		}

		// Засекаем время подключения
		const connectionStart = Date.now()

		connectionManager = Neo4jConnectionManager.getInstance()
		await connectionManager.connect(NEO4J_CONFIG)

		performanceMetrics.connectionTime = Date.now() - connectionStart
		console.log(`✓ Подключение к Neo4j: ${performanceMetrics.connectionTime}ms`)

		// Инициализация сервисов
		const initStart = Date.now()

		graphService = new Neo4jGraphService(connectionManager)
		await graphService.initialize()

		indexer = new RelationshipIndexer(graphService)
		extractor = new RelationshipExtractor()

		// Инициализация Tree-sitter парсера
		await Parser.init()
		const parserInstance = new Parser()
		const tsLanguage = await Language.load(
			join(__dirname, "../../../../node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm"),
		)
		parserInstance.setLanguage(tsLanguage)
		parser = parserInstance

		performanceMetrics.initializationTime = Date.now() - initStart
		console.log(`✓ Инициализация: ${performanceMetrics.initializationTime}ms`)
	}, 30000) // Увеличенный timeout для подключения

	afterAll(async () => {
		if (!isNeo4jAvailable) return

		// Очистка тестовых данных
		await graphService.clearAll()
		await connectionManager.disconnect()

		// Вывод метрик
		console.log("\n📊 Performance Metrics:")
		console.log(`   Connection: ${performanceMetrics.connectionTime}ms`)
		console.log(`   Initialization: ${performanceMetrics.initializationTime}ms`)
		console.log(`   Indexing: ${performanceMetrics.indexingTime}ms`)
		console.log(`   Search: ${performanceMetrics.searchTime}ms`)
	})

	describe("Graph Operations", () => {
		beforeEach(async () => {
			if (!isNeo4jAvailable) return
			// Очистка перед каждым тестом для изоляции
			await graphService.clearAll()
		})

		it.skipIf(!isNeo4jAvailable)("should create and retrieve entities", async () => {
			const entity: CodeEntity = {
				id: "function:test.ts:testFunc",
				type: "function",
				name: "testFunc",
				filePath: "test.ts",
				line: 1,
				column: 0,
				language: "typescript",
				// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
				// Root cause: Neo4j не принимает map/object как значение свойства.
				// Этот тест подтверждает, что round-trip `CodeEntity.properties` работает через JSON-строку в БД.
				properties: { kind: "integration-test", meta: { nested: true, count: 1 } },
			}

			await graphService.createEntity(entity)
			const results = await graphService.getEntitiesByFilePath("test.ts")

			expect(results).toHaveLength(1)
			expect(results[0].id).toBe(entity.id)
			expect(results[0].name).toBe("testFunc")
			expect(results[0].type).toBe("function")

			// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
			// Root cause: после смены storage-формата `properties` важно подтвердить обратное преобразование.
			expect(results[0].properties?.kind).toBe("integration-test")
			expect(results[0].properties?.meta?.nested).toBe(true)
			expect(results[0].properties?.meta?.count).toBe(1)
		})

		it.skipIf(!isNeo4jAvailable)("should create relationships between entities", async () => {
			const entity1: CodeEntity = {
				id: "function:test.ts:funcA",
				type: "function",
				name: "funcA",
				filePath: "test.ts",
				line: 1,
				language: "typescript",
			}

			const entity2: CodeEntity = {
				id: "function:test.ts:funcB",
				type: "function",
				name: "funcB",
				filePath: "test.ts",
				line: 5,
				language: "typescript",
			}

			await graphService.bulkCreateEntities([entity1, entity2])

			const relationship: CodeRelationship = {
				fromId: entity1.id,
				toId: entity2.id,
				type: "calls",
				// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
				// Подтверждаем, что свойства relationship также сохраняются/читаются через JSON.
				properties: { via: "integration-test", meta: { nested: true } },
			}

			await graphService.createRelationship(relationship)

			const context = await graphService.getEntityContext(entity1.id)
			expect(context.entities.length).toBeGreaterThan(1)
			expect(context.relationships).toHaveLength(1)
			expect(context.relationships[0].type).toBe("calls")

			expect(context.relationships[0].properties?.via).toBe("integration-test")
			expect(context.relationships[0].properties?.meta?.nested).toBe(true)
		})

		it.skipIf(!isNeo4jAvailable)("should bulk create relationships with properties", async () => {
			// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
			// Root cause: bulkCreateRelationships писал `properties` как object; нужно подтвердить запись/чтение через JSON.
			const entity1: CodeEntity = {
				id: "function:test.ts:bulkA",
				type: "function",
				name: "bulkA",
				filePath: "test.ts",
				line: 1,
				language: "typescript",
			}

			const entity2: CodeEntity = {
				id: "function:test.ts:bulkB",
				type: "function",
				name: "bulkB",
				filePath: "test.ts",
				line: 5,
				language: "typescript",
			}

			const entity3: CodeEntity = {
				id: "function:test.ts:bulkC",
				type: "function",
				name: "bulkC",
				filePath: "test.ts",
				line: 9,
				language: "typescript",
			}

			await graphService.bulkCreateEntities([entity1, entity2, entity3])

			const relationships: CodeRelationship[] = [
				{
					fromId: entity1.id,
					toId: entity2.id,
					type: "calls",
					properties: { idx: 1, meta: { nested: true } },
				},
				{
					fromId: entity1.id,
					toId: entity3.id,
					type: "calls",
					properties: { idx: 2, meta: { nested: true } },
				},
			]

			await graphService.bulkCreateRelationships(relationships)
			const context = await graphService.getEntityContext(entity1.id)

			expect(context.relationships).toHaveLength(2)
			const idxs = context.relationships.map((r) => r.properties?.idx).sort()
			expect(idxs).toEqual([1, 2])
			for (const rel of context.relationships) {
				expect(rel.properties?.meta?.nested).toBe(true)
			}
		})

		it.skipIf(!isNeo4jAvailable)("should delete entities by file path", async () => {
			const entity: CodeEntity = {
				id: "function:delete-test.ts:func",
				type: "function",
				name: "func",
				filePath: "delete-test.ts",
				line: 1,
				language: "typescript",
			}

			await graphService.createEntity(entity)
			let results = await graphService.getEntitiesByFilePath("delete-test.ts")
			expect(results).toHaveLength(1)

			await graphService.deleteEntitiesByFilePath("delete-test.ts")
			results = await graphService.getEntitiesByFilePath("delete-test.ts")
			expect(results).toHaveLength(0)
		})

		it.skipIf(!isNeo4jAvailable)("should search entities by criteria", async () => {
			const entities: CodeEntity[] = [
				{
					id: "function:search.ts:calculateSum",
					type: "function",
					name: "calculateSum",
					filePath: "search.ts",
					line: 1,
					language: "typescript",
				},
				{
					id: "function:search.ts:calculateProduct",
					type: "function",
					name: "calculateProduct",
					filePath: "search.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "class:search.ts:Calculator",
					type: "class",
					name: "Calculator",
					filePath: "search.ts",
					line: 10,
					language: "typescript",
				},
			]

			await graphService.bulkCreateEntities(entities)

			// Поиск по типу
			const functions = await graphService.searchEntities({ type: "function" })
			expect(functions.length).toBeGreaterThanOrEqual(2)

			// Поиск по имени
			const sumResults = await graphService.searchEntities({ name: "Sum" })
			expect(sumResults.length).toBeGreaterThanOrEqual(1)
			expect(sumResults[0].name).toContain("Sum")
		})
	})

	describe("File Indexing", () => {
		beforeEach(async () => {
			if (!isNeo4jAvailable) return
			await graphService.clearAll()
		})

		it.skipIf(!isNeo4jAvailable)("should index simple TypeScript file", async () => {
			const fixtureContent = readFileSync(join(__dirname, "../fixtures/simple-function.ts"), "utf-8")

			if (!parser) throw new Error("Parser not initialized")
			const tree = parser.parse(fixtureContent)
			if (!tree) throw new Error("Failed to parse file")
			const startTime = Date.now()

			const result = await indexer.indexFile(
				"fixtures/simple-function.ts",
				fixtureContent,
				tree.rootNode,
				"typescript",
			)

			performanceMetrics.indexingTime += Date.now() - startTime

			expect(result.entities).toBeGreaterThan(0)
			console.log(`   Indexed ${result.entities} entities, ${result.relationships} relationships`)

			// Проверяем что сущности созданы
			const entities = await graphService.getEntitiesByFilePath("fixtures/simple-function.ts")
			expect(entities.length).toBeGreaterThan(0)

			// Проверяем что есть функции
			const functions = entities.filter((e) => e.type === "function")
			expect(functions.length).toBeGreaterThanOrEqual(2) // calculateSum и calculateProduct
		})

		it.skipIf(!isNeo4jAvailable)("should index file with imports", async () => {
			// Сначала индексируем файл с функциями
			const simpleFunctionContent = readFileSync(join(__dirname, "../fixtures/simple-function.ts"), "utf-8")
			if (!parser) throw new Error("Parser not initialized")
			const simpleTree = parser.parse(simpleFunctionContent)
			if (!simpleTree) throw new Error("Failed to parse file")
			await indexer.indexFile(
				"fixtures/simple-function.ts",
				simpleFunctionContent,
				simpleTree.rootNode,
				"typescript",
			)

			// Затем файл с импортами
			const withImportsContent = readFileSync(join(__dirname, "../fixtures/with-imports.ts"), "utf-8")
			if (!parser) throw new Error("Parser not initialized")
			const importsTree = parser.parse(withImportsContent)
			if (!importsTree) throw new Error("Failed to parse file")

			const result = await indexer.indexFile(
				"fixtures/with-imports.ts",
				withImportsContent,
				importsTree.rootNode,
				"typescript",
			)

			expect(result.entities).toBeGreaterThan(0)

			const entities = await graphService.getEntitiesByFilePath("fixtures/with-imports.ts")

			// Проверяем наличие import сущностей
			const imports = entities.filter((e) => e.type === "import")
			expect(imports.length).toBeGreaterThan(0)

			console.log(`   Found ${imports.length} imports`)
		})

		it.skipIf(!isNeo4jAvailable)("should index file with classes", async () => {
			const withClassContent = readFileSync(join(__dirname, "../fixtures/with-class.ts"), "utf-8")
			if (!parser) throw new Error("Parser not initialized")
			const classTree = parser.parse(withClassContent)
			if (!classTree) throw new Error("Failed to parse file")

			const result = await indexer.indexFile(
				"fixtures/with-class.ts",
				withClassContent,
				classTree.rootNode,
				"typescript",
			)

			expect(result.entities).toBeGreaterThan(0)

			const entities = await graphService.getEntitiesByFilePath("fixtures/with-class.ts")

			// Проверяем наличие класса
			const classes = entities.filter((e) => e.type === "class")
			expect(classes.length).toBeGreaterThanOrEqual(1)
			expect(classes[0].name).toBe("Calculator")

			// Проверяем методы класса
			const methods = entities.filter((e) => e.type === "function")
			expect(methods.length).toBeGreaterThan(0)

			console.log(`   Found 1 class with ${methods.length} methods`)
		})

		it.skipIf(!isNeo4jAvailable)("should batch index multiple files", async () => {
			const files = [
				{
					filePath: "fixtures/simple-function.ts",
					content: readFileSync(join(__dirname, "../fixtures/simple-function.ts"), "utf-8"),
				},
				{
					filePath: "fixtures/with-imports.ts",
					content: readFileSync(join(__dirname, "../fixtures/with-imports.ts"), "utf-8"),
				},
				{
					filePath: "fixtures/with-class.ts",
					content: readFileSync(join(__dirname, "../fixtures/with-class.ts"), "utf-8"),
				},
			]

			const parsedFiles = files.map((f) => {
				if (!parser) throw new Error("Parser not initialized")
				const tree = parser.parse(f.content)
				if (!tree) throw new Error("Failed to parse file")
				return {
					...f,
					ast: tree.rootNode,
					language: "typescript",
				}
			})

			const startTime = Date.now()
			let totalEntities = 0
			let totalRels = 0

			const progress = await indexer.indexFiles(parsedFiles, (p) => {
				totalEntities = p.entitiesCreated
				totalRels = p.relationshipsCreated
			})

			performanceMetrics.indexingTime += Date.now() - startTime

			expect(progress.filesProcessed).toBe(3)
			expect(progress.entitiesCreated).toBeGreaterThan(0)
			expect(progress.errors).toHaveLength(0)

			console.log(`   Batch indexed 3 files: ${totalEntities} entities, ${totalRels} relationships`)

			// Проверяем статистику
			const stats = await graphService.getStatistics()
			expect(stats.totalEntities).toBe(progress.entitiesCreated)
			expect(stats.totalRelationships).toBe(progress.relationshipsCreated)
		})
	})

	describe("Impact Analysis", () => {
		beforeEach(async () => {
			if (!isNeo4jAvailable) return
			await graphService.clearAll()
		})

		it.skipIf(!isNeo4jAvailable)("should find dependencies of a function", async () => {
			// Создаём цепочку зависимостей: funcA -> funcB -> funcC
			const entities: CodeEntity[] = [
				{
					id: "function:impact.ts:funcA",
					type: "function",
					name: "funcA",
					filePath: "impact.ts",
					line: 1,
					language: "typescript",
				},
				{
					id: "function:impact.ts:funcB",
					type: "function",
					name: "funcB",
					filePath: "impact.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "function:impact.ts:funcC",
					type: "function",
					name: "funcC",
					filePath: "impact.ts",
					line: 10,
					language: "typescript",
				},
			]

			await graphService.bulkCreateEntities(entities)

			const relationships: CodeRelationship[] = [
				{ fromId: entities[0].id, toId: entities[1].id, type: "calls" },
				{ fromId: entities[1].id, toId: entities[2].id, type: "calls" },
			]

			await graphService.bulkCreateRelationships(relationships)

			// Получаем зависимости funcA
			const deps = await graphService.getDependencies(entities[0].id, 2)
			expect(deps.length).toBeGreaterThanOrEqual(2)

			const depNames = deps.map((d) => d.name)
			expect(depNames).toContain("funcB")
			expect(depNames).toContain("funcC")
		})

		it.skipIf(!isNeo4jAvailable)("should find usages of a class", async () => {
			const entities: CodeEntity[] = [
				{
					id: "class:usage.ts:MyClass",
					type: "class",
					name: "MyClass",
					filePath: "usage.ts",
					line: 1,
					language: "typescript",
				},
				{
					id: "function:usage.ts:useMyClass",
					type: "function",
					name: "useMyClass",
					filePath: "usage.ts",
					line: 10,
					language: "typescript",
				},
			]

			await graphService.bulkCreateEntities(entities)

			const relationship: CodeRelationship = {
				fromId: entities[1].id,
				toId: entities[0].id,
				type: "uses",
			}

			await graphService.createRelationship(relationship)

			// Находим кто использует класс
			const dependents = await graphService.getDependents(entities[0].id)
			expect(dependents.length).toBeGreaterThanOrEqual(1)
			expect(dependents[0].name).toBe("useMyClass")
		})

		it.skipIf(!isNeo4jAvailable)("should generate impact graph for entity changes", async () => {
			// Создаём граф: mainFunc использует helperFunc и utilFunc
			const entities: CodeEntity[] = [
				{
					id: "function:impact.ts:helperFunc",
					type: "function",
					name: "helperFunc",
					filePath: "impact.ts",
					line: 1,
					language: "typescript",
				},
				{
					id: "function:impact.ts:mainFunc",
					type: "function",
					name: "mainFunc",
					filePath: "impact.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "function:impact.ts:anotherFunc",
					type: "function",
					name: "anotherFunc",
					filePath: "impact.ts",
					line: 10,
					language: "typescript",
				},
			]

			await graphService.bulkCreateEntities(entities)

			const relationships: CodeRelationship[] = [
				{ fromId: entities[1].id, toId: entities[0].id, type: "calls" },
				{ fromId: entities[2].id, toId: entities[0].id, type: "calls" },
			]

			await graphService.bulkCreateRelationships(relationships)

			// Анализируем impact изменения helperFunc
			const impact = await graphService.getImpactGraph(entities[0].id)

			expect(impact.entity.name).toBe("helperFunc")
			expect(impact.directImpact.length).toBeGreaterThanOrEqual(2)
			expect(impact.impactScore).toBeGreaterThan(0)
			expect(impact.recommendations.length).toBeGreaterThan(0)

			console.log(`   Impact score: ${impact.impactScore.toFixed(2)}`)
			console.log(`   Direct impact: ${impact.directImpact.length} entities`)
		})

		it.skipIf(!isNeo4jAvailable)("should find paths between entities", async () => {
			// Создаём путь: A -> B -> C
			const entities: CodeEntity[] = [
				{
					id: "function:path.ts:funcA",
					type: "function",
					name: "funcA",
					filePath: "path.ts",
					line: 1,
					language: "typescript",
				},
				{
					id: "function:path.ts:funcB",
					type: "function",
					name: "funcB",
					filePath: "path.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "function:path.ts:funcC",
					type: "function",
					name: "funcC",
					filePath: "path.ts",
					line: 10,
					language: "typescript",
				},
			]

			await graphService.bulkCreateEntities(entities)

			const relationships: CodeRelationship[] = [
				{ fromId: entities[0].id, toId: entities[1].id, type: "calls" },
				{ fromId: entities[1].id, toId: entities[2].id, type: "calls" },
			]

			await graphService.bulkCreateRelationships(relationships)

			const paths = await graphService.findPath(entities[0].id, entities[2].id)

			expect(paths.length).toBeGreaterThan(0)
			expect(paths[0]).toContain(entities[0].id)
			expect(paths[0]).toContain(entities[2].id)
		})
	})

	describe("Error Handling", () => {
		it.skipIf(!isNeo4jAvailable)("should handle non-existent entity gracefully", async () => {
			const entities = await graphService.getEntitiesByFilePath("non-existent.ts")
			expect(entities).toHaveLength(0)
		})

		it.skipIf(!isNeo4jAvailable)("should handle invalid entity ID in impact analysis", async () => {
			await expect(graphService.getImpactGraph("invalid:entity:id")).rejects.toThrow()
		})

		it("should handle Neo4j unavailability", async () => {
			const tempConnectionManager = Neo4jConnectionManager.getInstance()
			const tempGraphService = new Neo4jGraphService(tempConnectionManager)

			// Проверяем что без подключения операции не работают
			const isInitialized = await tempGraphService.isInitialized()

			// Если Neo4j доступен и мы уже подключены, тест пропускаем
			if (isInitialized) {
				console.log("   Skipped: Neo4j is connected")
				return
			}

			expect(isInitialized).toBe(false)
		})
	})

	describe("Performance & Statistics", () => {
		beforeEach(async () => {
			if (!isNeo4jAvailable) return
			await graphService.clearAll()
		})

		it.skipIf(!isNeo4jAvailable)("should measure indexing performance", async () => {
			const content = readFileSync(join(__dirname, "../fixtures/with-class.ts"), "utf-8")
			if (!parser) throw new Error("Parser not initialized")
			const tree = parser.parse(content)
			if (!tree) throw new Error("Failed to parse file")

			const iterations = 5
			const times: number[] = []

			for (let i = 0; i < iterations; i++) {
				await graphService.clearAll()

				const start = Date.now()
				await indexer.indexFile(`fixtures/test-${i}.ts`, content, tree.rootNode, "typescript")
				times.push(Date.now() - start)
			}

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length
			const minTime = Math.min(...times)
			const maxTime = Math.max(...times)

			console.log(`   Indexing performance (${iterations} iterations):`)
			console.log(`   Avg: ${avgTime.toFixed(2)}ms`)
			console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`)

			expect(avgTime).toBeLessThan(5000) // Должно быть быстрее 5 секунд
		})

		it.skipIf(!isNeo4jAvailable)("should provide accurate statistics", async () => {
			// Индексируем несколько файлов
			const files = [
				{
					filePath: "stats/file1.ts",
					content: readFileSync(join(__dirname, "../fixtures/simple-function.ts"), "utf-8"),
				},
				{
					filePath: "stats/file2.ts",
					content: readFileSync(join(__dirname, "../fixtures/with-class.ts"), "utf-8"),
				},
			]

			const parsedFiles = files.map((f) => {
				if (!parser) throw new Error("Parser not initialized")
				const tree = parser.parse(f.content)
				if (!tree) throw new Error("Failed to parse file")
				return {
					...f,
					ast: tree.rootNode,
					language: "typescript",
				}
			})

			const progress = await indexer.indexFiles(parsedFiles)
			const stats = await graphService.getStatistics()

			expect(stats.totalEntities).toBe(progress.entitiesCreated)
			expect(stats.totalRelationships).toBe(progress.relationshipsCreated)
			expect(Object.keys(stats.entitiesByType).length).toBeGreaterThan(0)

			console.log("   Statistics:")
			console.log(`   Total entities: ${stats.totalEntities}`)
			console.log(`   Total relationships: ${stats.totalRelationships}`)
			console.log(`   Entity types:`, stats.entitiesByType)
		})
	})
})
