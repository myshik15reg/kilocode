/**
 * Neo4j Performance Benchmarks
 * 
 * Comprehensive performance testing suite for Neo4j integration in Kilocode.
 * Measures indexing, search, graph operations, and scalability.
 * 
 * Run: pnpm test services/neo4j/__tests__/benchmarks/performance.benchmark.ts
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { Neo4jConnectionManager } from '../../connection-manager'
import { Neo4jGraphService } from '../../graph-service'
import { RelationshipIndexer } from '../../relationship-indexer'
import { HybridSearchService } from '../../hybrid-search-service'
import type { CodeEntity, CodeRelationship } from '../../interfaces'
import type Parser from 'web-tree-sitter'

type SyntaxNode = ReturnType<ReturnType<Parser['parse']>['rootNode']['descendantForIndex']>
import * as fs from 'fs/promises'
import * as path from 'path'

// Цвета для вывода
const colors = {
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	reset: '\x1b[0m',
	bold: '\x1b[1m',
}

// Результаты benchmarks
interface BenchmarkResult {
	name: string
	duration: number
	throughput?: number
	memoryUsed?: number
	passed: boolean
	threshold?: number
}

const benchmarkResults: BenchmarkResult[] = []
const benchmarkHistory: { timestamp: string; results: BenchmarkResult[] }[] = []

// Helper функции
function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms.toFixed(2)}ms`
	return `${(ms / 1000).toFixed(2)}s`
}

function formatMemory(bytes: number): string {
	const mb = bytes / (1024 * 1024)
	return `${mb.toFixed(2)}MB`
}

function printBenchmarkHeader() {
	console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}`)
	console.log(`${colors.bold}${colors.cyan}   Neo4j Performance Benchmarks${colors.reset}`)
	console.log(`${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`)
}

function printBenchmarkResult(result: BenchmarkResult) {
	const status = result.passed 
		? `${colors.green}✅ PASS${colors.reset}` 
		: `${colors.red}❌ FAIL${colors.reset}`
	
	const threshold = result.threshold ? ` (threshold: ${formatDuration(result.threshold)})` : ''
	const throughput = result.throughput ? ` - ${result.throughput.toFixed(2)}/s` : ''
	const memory = result.memoryUsed ? ` - ${formatMemory(result.memoryUsed)}` : ''
	
	console.log(`${status} ${result.name}: ${formatDuration(result.duration)}${throughput}${memory}${threshold}`)
}

function printSummary() {
	console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}`)
	console.log(`${colors.bold}Summary${colors.reset}\n`)
	
	const passed = benchmarkResults.filter(r => r.passed).length
	const total = benchmarkResults.length
	const passRate = ((passed / total) * 100).toFixed(1)
	
	console.table(benchmarkResults.map(r => ({
		'Benchmark': r.name,
		'Duration': formatDuration(r.duration),
		'Throughput': r.throughput ? `${r.throughput.toFixed(2)}/s` : '-',
		'Memory': r.memoryUsed ? formatMemory(r.memoryUsed) : '-',
		'Status': r.passed ? '✅ PASS' : '❌ FAIL',
	})))
	
	console.log(`\n${colors.bold}Overall: ${colors.reset}${passed}/${total} benchmarks passed (${passRate}%)`)
	
	if (passed === total) {
		console.log(`${colors.green}${colors.bold}✅ All benchmarks PASSED${colors.reset}`)
	} else {
		console.log(`${colors.red}${colors.bold}❌ Some benchmarks FAILED${colors.reset}`)
	}
	
	console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`)
}

// Генераторы тестовых данных
function generateMockEntity(index: number, filePath: string, language: string): CodeEntity {
	return {
		id: `${filePath}:function_${index}`,
		type: 'function',
		name: `testFunction${index}`,
		filePath,
		line: index * 10,
		column: 0,
		language,
		properties: {
			async: index % 2 === 0,
			exported: index % 3 === 0,
		},
	}
}

function generateMockRelationship(fromIndex: number, toIndex: number, filePath: string): CodeRelationship {
	return {
		fromId: `${filePath}:function_${fromIndex}`,
		toId: `${filePath}:function_${toIndex}`,
		type: 'calls',
		properties: {
			line: fromIndex * 10,
		},
	}
}

function generateMockFiles(count: number, language: string = 'typescript'): Array<{
	filePath: string
	entities: CodeEntity[]
	relationships: CodeRelationship[]
}> {
	const files = []
	
	for (let i = 0; i < count; i++) {
		const filePath = `test/benchmark/file_${i}.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'java'}`
		const entitiesPerFile = 10
		const entities: CodeEntity[] = []
		const relationships: CodeRelationship[] = []
		
		// Создаем entities
		for (let j = 0; j < entitiesPerFile; j++) {
			entities.push(generateMockEntity(j, filePath, language))
		}
		
		// Создаем relationships (каждая функция вызывает следующую)
		for (let j = 0; j < entitiesPerFile - 1; j++) {
			relationships.push(generateMockRelationship(j, j + 1, filePath))
		}
		
		files.push({ filePath, entities, relationships })
	}
	
	return files
}

// Benchmark suite
describe('Neo4j Performance Benchmarks', () => {
	let connectionManager: Neo4jConnectionManager
	let graphService: Neo4jGraphService
	let indexer: RelationshipIndexer
	
	beforeAll(async () => {
		printBenchmarkHeader()
		
		// Подключаемся к Neo4j
		connectionManager = Neo4jConnectionManager.getInstance()
		
		// Используем test database
		await connectionManager.connect({
			uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
			username: process.env.NEO4J_USERNAME || 'neo4j',
			password: process.env.NEO4J_PASSWORD || 'password',
			database: 'kilocode_benchmark_test',
		})
		
		graphService = new Neo4jGraphService(connectionManager)
		await graphService.initialize()
		
		// Очищаем перед тестами
		await graphService.clearAll()
		
		indexer = new RelationshipIndexer(graphService)
	})
	
	afterAll(async () => {
		// Очищаем после тестов
		await graphService.clearAll()
		await connectionManager.disconnect()
		
		// Сохраняем результаты
		await saveBenchmarkResults()
		
		printSummary()
	})
	
	describe('Indexing Performance', () => {
		it('should index 10 TypeScript files within 5 seconds', async () => {
			const fileCount = 10
			const threshold = 5000 // 5s
			const files = generateMockFiles(fileCount, 'typescript')
			
			const startMemory = process.memoryUsage().heapUsed
			const start = performance.now()
			
			// Bulk indexing
			const allEntities = files.flatMap(f => f.entities)
			const allRelationships = files.flatMap(f => f.relationships)
			
			await graphService.bulkCreateEntities(allEntities)
			await graphService.bulkCreateRelationships(allRelationships)
			
			const duration = performance.now() - start
			const endMemory = process.memoryUsage().heapUsed
			const memoryUsed = endMemory - startMemory
			
			const result: BenchmarkResult = {
				name: `Index ${fileCount} TypeScript files`,
				duration,
				throughput: fileCount / (duration / 1000),
				memoryUsed,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		}, 30000)
		
		it('should index 100 TypeScript files within 30 seconds', async () => {
			await graphService.clearAll()
			
			const fileCount = 100
			const threshold = 30000 // 30s
			const files = generateMockFiles(fileCount, 'typescript')
			
			const startMemory = process.memoryUsage().heapUsed
			const start = performance.now()
			
			const allEntities = files.flatMap(f => f.entities)
			const allRelationships = files.flatMap(f => f.relationships)
			
			await graphService.bulkCreateEntities(allEntities)
			await graphService.bulkCreateRelationships(allRelationships)
			
			const duration = performance.now() - start
			const endMemory = process.memoryUsage().heapUsed
			const memoryUsed = endMemory - startMemory
			
			const result: BenchmarkResult = {
				name: `Index ${fileCount} TypeScript files`,
				duration,
				throughput: fileCount / (duration / 1000),
				memoryUsed,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		}, 60000)
		
		it('should index 1000 files within 5 minutes', async () => {
			await graphService.clearAll()
			
			const fileCount = 1000
			const threshold = 300000 // 5 minutes
			const files = generateMockFiles(fileCount, 'typescript')
			
			const startMemory = process.memoryUsage().heapUsed
			const start = performance.now()
			
			// Batch processing
			const batchSize = 100
			for (let i = 0; i < files.length; i += batchSize) {
				const batch = files.slice(i, i + batchSize)
				const entities = batch.flatMap(f => f.entities)
				const relationships = batch.flatMap(f => f.relationships)
				
				await graphService.bulkCreateEntities(entities)
				await graphService.bulkCreateRelationships(relationships)
			}
			
			const duration = performance.now() - start
			const endMemory = process.memoryUsage().heapUsed
			const memoryUsed = endMemory - startMemory
			
			const result: BenchmarkResult = {
				name: `Index ${fileCount} files (batched)`,
				duration,
				throughput: fileCount / (duration / 1000),
				memoryUsed,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		}, 360000)
		
		it('should show performance difference by language', async () => {
			await graphService.clearAll()
			
			const languages = ['typescript', 'python', 'java']
			const fileCount = 50
			
			for (const lang of languages) {
				const files = generateMockFiles(fileCount, lang)
				
				const start = performance.now()
				
				const allEntities = files.flatMap(f => f.entities)
				const allRelationships = files.flatMap(f => f.relationships)
				
				await graphService.bulkCreateEntities(allEntities)
				await graphService.bulkCreateRelationships(allRelationships)
				
				const duration = performance.now() - start
				
				const result: BenchmarkResult = {
					name: `Index ${fileCount} ${lang} files`,
					duration,
					throughput: fileCount / (duration / 1000),
					passed: true, // No threshold, just measurement
				}
				
				benchmarkResults.push(result)
				printBenchmarkResult(result)
				
				await graphService.clearAll()
			}
		}, 60000)
		
		it('should compare batch vs sequential indexing', async () => {
			const fileCount = 50
			const files = generateMockFiles(fileCount, 'typescript')
			
			// Sequential indexing
			await graphService.clearAll()
			const seqStart = performance.now()
			
			for (const file of files) {
				await graphService.bulkCreateEntities(file.entities)
				await graphService.bulkCreateRelationships(file.relationships)
			}
			
			const seqDuration = performance.now() - seqStart
			
			// Batch indexing
			await graphService.clearAll()
			const batchStart = performance.now()
			
			const allEntities = files.flatMap(f => f.entities)
			const allRelationships = files.flatMap(f => f.relationships)
			await graphService.bulkCreateEntities(allEntities)
			await graphService.bulkCreateRelationships(allRelationships)
			
			const batchDuration = performance.now() - batchStart
			
			benchmarkResults.push({
				name: `Sequential indexing (${fileCount} files)`,
				duration: seqDuration,
				throughput: fileCount / (seqDuration / 1000),
				passed: true,
			})
			
			benchmarkResults.push({
				name: `Batch indexing (${fileCount} files)`,
				duration: batchDuration,
				throughput: fileCount / (batchDuration / 1000),
				passed: true,
			})
			
			printBenchmarkResult(benchmarkResults[benchmarkResults.length - 2])
			printBenchmarkResult(benchmarkResults[benchmarkResults.length - 1])
			
			console.log(`${colors.cyan}Batch is ${(seqDuration / batchDuration).toFixed(2)}x faster${colors.reset}`)
		}, 120000)
	})
	
	describe('Graph Operations Performance', () => {
		beforeAll(async () => {
			// Подготовка данных для graph операций
			await graphService.clearAll()
			const files = generateMockFiles(100, 'typescript')
			const allEntities = files.flatMap(f => f.entities)
			const allRelationships = files.flatMap(f => f.relationships)
			
			await graphService.bulkCreateEntities(allEntities)
			await graphService.bulkCreateRelationships(allRelationships)
		})
		
		it('should create single entity within 10ms', async () => {
			const threshold = 10
			const entity = generateMockEntity(999, 'test/single.ts', 'typescript')
			
			const start = performance.now()
			await graphService.createEntity(entity)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Create single entity',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should bulk create 100 entities within 100ms', async () => {
			const threshold = 100
			const entities = Array.from({ length: 100 }, (_, i) => 
				generateMockEntity(i, 'test/bulk.ts', 'typescript')
			)
			
			const start = performance.now()
			await graphService.bulkCreateEntities(entities)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Bulk create 100 entities',
				duration,
				throughput: 100 / (duration / 1000),
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should perform impact analysis within 300ms', async () => {
			const threshold = 300
			const entityId = 'test/benchmark/file_0.ts:function_0'
			
			const start = performance.now()
			const impact = await graphService.getImpactGraph(entityId, 3)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Impact analysis (depth=3)',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			console.log(`${colors.blue}  Found ${impact.directImpact.length} direct + ${impact.indirectImpact.length} indirect impacts${colors.reset}`)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should get dependencies within 50ms', async () => {
			const threshold = 50
			const entityId = 'test/benchmark/file_0.ts:function_0'
			
			const start = performance.now()
			const deps = await graphService.getDependencies(entityId, 2)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Get dependencies (depth=2)',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should get dependents within 50ms', async () => {
			const threshold = 50
			const entityId = 'test/benchmark/file_0.ts:function_5'
			
			const start = performance.now()
			const dependents = await graphService.getDependents(entityId, 2)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Get dependents (depth=2)',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should find path between entities within 100ms', async () => {
			const threshold = 100
			const fromId = 'test/benchmark/file_0.ts:function_0'
			const toId = 'test/benchmark/file_0.ts:function_5'
			
			const start = performance.now()
			const paths = await graphService.findPath(fromId, toId, 5)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Find path (maxDepth=5)',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should search entities within 100ms', async () => {
			const threshold = 100
			
			const start = performance.now()
			const results = await graphService.searchEntities(
				{ type: 'function', language: 'typescript' },
				{ limit: 50 }
			)
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Search entities',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(duration).toBeLessThan(threshold)
		})
		
		it('should get statistics within 50ms', async () => {
			const threshold = 50
			
			const start = performance.now()
			const stats = await graphService.getStatistics()
			const duration = performance.now() - start
			
			const result: BenchmarkResult = {
				name: 'Get statistics',
				duration,
				passed: duration < threshold,
				threshold,
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			console.log(`${colors.blue}  Stats: ${stats.totalEntities} entities, ${stats.totalRelationships} relationships${colors.reset}`)
			
			expect(duration).toBeLessThan(threshold)
		})
	})
	
	describe('Memory Usage', () => {
		it('should track memory usage for 100 files', async () => {
			await graphService.clearAll()
			
			const fileCount = 100
			const files = generateMockFiles(fileCount, 'typescript')
			
			const startMemory = process.memoryUsage().heapUsed
			
			const allEntities = files.flatMap(f => f.entities)
			const allRelationships = files.flatMap(f => f.relationships)
			
			await graphService.bulkCreateEntities(allEntities)
			await graphService.bulkCreateRelationships(allRelationships)
			
			const endMemory = process.memoryUsage().heapUsed
			const memoryUsed = endMemory - startMemory
			
			const result: BenchmarkResult = {
				name: `Memory usage (${fileCount} files)`,
				duration: 0,
				memoryUsed,
				passed: memoryUsed < 50 * 1024 * 1024, // < 50MB
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(memoryUsed).toBeLessThan(50 * 1024 * 1024)
		})
		
		it('should track memory usage for 1000 files', async () => {
			await graphService.clearAll()
			
			const fileCount = 1000
			const files = generateMockFiles(fileCount, 'typescript')
			
			const startMemory = process.memoryUsage().heapUsed
			
			// Batch processing
			const batchSize = 100
			for (let i = 0; i < files.length; i += batchSize) {
				const batch = files.slice(i, i + batchSize)
				const entities = batch.flatMap(f => f.entities)
				const relationships = batch.flatMap(f => f.relationships)
				
				await graphService.bulkCreateEntities(entities)
				await graphService.bulkCreateRelationships(relationships)
			}
			
			const endMemory = process.memoryUsage().heapUsed
			const memoryUsed = endMemory - startMemory
			
			const result: BenchmarkResult = {
				name: `Memory usage (${fileCount} files, batched)`,
				duration: 0,
				memoryUsed,
				passed: memoryUsed < 250 * 1024 * 1024, // < 250MB
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
			
			expect(memoryUsed).toBeLessThan(250 * 1024 * 1024)
		}, 360000)
	})
	
	describe('Scalability Projections', () => {
		it('should project performance for 10,000 files', async () => {
			// Based on 1000 files benchmark, project to 10,000
			const filesSmall = 100
			const filesLarge = 1000
			
			await graphService.clearAll()
			
			// Measure small set
			const smallFiles = generateMockFiles(filesSmall, 'typescript')
			const smallStart = performance.now()
			
			const smallEntities = smallFiles.flatMap(f => f.entities)
			const smallRelationships = smallFiles.flatMap(f => f.relationships)
			await graphService.bulkCreateEntities(smallEntities)
			await graphService.bulkCreateRelationships(smallRelationships)
			
			const smallDuration = performance.now() - smallStart
			
			await graphService.clearAll()
			
			// Measure large set
			const largeFiles = generateMockFiles(filesLarge, 'typescript')
			const largeStart = performance.now()
			
			const batchSize = 100
			for (let i = 0; i < largeFiles.length; i += batchSize) {
				const batch = largeFiles.slice(i, i + batchSize)
				const entities = batch.flatMap(f => f.entities)
				const relationships = batch.flatMap(f => f.relationships)
				
				await graphService.bulkCreateEntities(entities)
				await graphService.bulkCreateRelationships(relationships)
			}
			
			const largeDuration = performance.now() - largeStart
			
			// Calculate scaling factor (should be sub-linear due to batching)
			const scalingFactor = (largeDuration / smallDuration) / (filesLarge / filesSmall)
			
			// Project to 10,000 files
			const projected10k = (largeDuration / filesLarge) * 10000 * scalingFactor
			
			console.log(`\n${colors.cyan}Scalability Analysis:${colors.reset}`)
			console.log(`  ${filesSmall} files: ${formatDuration(smallDuration)}`)
			console.log(`  ${filesLarge} files: ${formatDuration(largeDuration)}`)
			console.log(`  Scaling factor: ${scalingFactor.toFixed(3)}`)
			console.log(`  Projected 10,000 files: ${formatDuration(projected10k)}`)
			console.log(`  Projected throughput: ${(10000 / (projected10k / 1000)).toFixed(2)} files/s\n`)
			
			const result: BenchmarkResult = {
				name: 'Projected 10,000 files indexing',
				duration: projected10k,
				throughput: 10000 / (projected10k / 1000),
				passed: projected10k < 600000, // < 10 minutes
			}
			
			benchmarkResults.push(result)
			printBenchmarkResult(result)
		}, 360000)
	})
})

// Helper function to save benchmark results
async function saveBenchmarkResults() {
	const timestamp = new Date().toISOString()
	const resultsDir = path.join(__dirname, 'results')
	
	try {
		await fs.mkdir(resultsDir, { recursive: true })
		
		const resultsFile = path.join(resultsDir, `benchmark-${timestamp.replace(/:/g, '-')}.json`)
		const historyFile = path.join(resultsDir, 'history.json')
		
		// Save current results
		await fs.writeFile(
			resultsFile,
			JSON.stringify({
				timestamp,
				results: benchmarkResults,
				summary: {
					total: benchmarkResults.length,
					passed: benchmarkResults.filter(r => r.passed).length,
					failed: benchmarkResults.filter(r => !r.passed).length,
				},
			}, null, 2)
		)
		
		// Update history
		let history = []
		try {
			const existingHistory = await fs.readFile(historyFile, 'utf-8')
			history = JSON.parse(existingHistory)
		} catch {
			// No existing history
		}
		
		history.push({
			timestamp,
			results: benchmarkResults,
		})
		
		// Keep only last 20 runs
		if (history.length > 20) {
			history = history.slice(-20)
		}
		
		await fs.writeFile(historyFile, JSON.stringify(history, null, 2))
		
		console.log(`\n${colors.green}Benchmark results saved to: ${resultsFile}${colors.reset}`)
	} catch (error) {
		console.error(`${colors.red}Failed to save benchmark results:${colors.reset}`, error)
	}
}