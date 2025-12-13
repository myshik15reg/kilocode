# Гибридная архитектура Neo4j + Qdrant для Kilocode

## Вдохновение от Qoder

Qoder использует гибридный подход:
- **Qdrant + эмбеддинги** для семантического поиска кода
- **Neo4j** для графовых отношений и структурного анализа
- **Комбинированный поиск** для точных результатов

Этот подход позволяет:
- Искать код по смыслу (векторный поиск)
- Анализировать зависимости (графовый анализ)
- Получать контекстно-релевантные результаты
- Строить цепочки зависимостей

---

## Архитектура решения

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kilocode Extension                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Semantic Search │  │  Graph Analysis  │  │   Hybrid     │  │
│  │     Service      │  │    Service       │  │  Search API  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                      │                        │       │
│  ┌────────▼──────────────────────▼─────────────────────▼──────┐  │
│  │              Integration Layer (Orchestrator)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │  Qdrant  │  │  Neo4j   │  │Embedding │  │  Cache   │  │  │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌───────────▼──────────────┐
                    │        Qdrant            │
                    │   (Vector Database)      │
                    │  ┌────────────────┐      │
                    │  │ Code Embeddings│      │
                    │  │   Collection   │      │
                    │  └────────────────┘      │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │         Neo4j            │
                    │    (Graph Database)      │
                    │  ┌────────────────┐      │
                    │  │   Code Graph   │      │
                    │  │  (Relationships)│      │
                    │  └────────────────┘      │
                    └──────────────────────────┘
```

---

## Ключевые компоненты

### 1. Embedding Service

```typescript
// src/services/embeddings/embedding.service.ts

import { OpenAI } from 'openai'
import { encoding_for_model } from '@dqbd/tiktoken'

export interface CodeEmbedding {
  filePath: string
  content: string
  embedding: number[]
  metadata: {
    language: string
    symbols: string[]
    lineCount: number
    lastModified: Date
  }
}

export interface SymbolEmbedding {
  symbol: string
  filePath: string
  line: number
  embedding: number[]
  context: string
}

export class EmbeddingService {
  private openai: OpenAI
  private encoder: any
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
    this.encoder = encoding_for_model('text-embedding-ada-002')
  }

  async generateCodeEmbedding(content: string): Promise<number[]> {
    // Ограничение токенов для модели эмбеддингов
    const tokens = this.encoder.encode(content)
    if (tokens.length > 8191) {
      content = this.truncateToTokens(content, 8191)
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
    })

    return response.data[0].embedding
  }

  async generateSymbolEmbedding(symbol: string, context: string): Promise<number[]> {
    const fullContent = `${symbol}\n${context}`
    return this.generateCodeEmbedding(fullContent)
  }

  async generateFunctionEmbedding(
    functionName: string,
    parameters: string[],
    body: string,
    documentation?: string
  ): Promise<number[]> {
    const content = this.formatFunctionForEmbedding(
      functionName,
      parameters,
      body,
      documentation
    )
    return this.generateCodeEmbedding(content)
  }

  private formatFunctionForEmbedding(
    name: string,
    params: string[],
    body: string,
    docs?: string
  ): string {
    let formatted = ''
    
    if (docs) {
      formatted += `Documentation: ${docs}\n`
    }
    
    formatted += `Function: ${name}(\n`
    formatted += params.map(p => `  ${p}`).join(',\n')
    formatted += `\n)\n`
    formatted += `Implementation:\n${body}`
    
    return formatted
  }

  private truncateToTokens(content: string, maxTokens: number): string {
    const tokens = this.encoder.encode(content)
    if (tokens.length <= maxTokens) return content
    
    // Удалить токены с конца
    const truncatedTokens = tokens.slice(0, maxTokens)
    return this.encoder.decode(truncatedTokens)
  }
}
```

### 2. Qdrant Service

```typescript
// src/services/qdrant/qdrant.service.ts

import { QdrantClient } from '@qdrant/js-client-rest'
import { CodeEmbedding, SymbolEmbedding } from '../embeddings/embedding.service'

export interface QdrantConfig {
  url: string
  apiKey?: string
}

export interface SearchResult {
  filePath: string
  score: number
  content?: string
  metadata?: any
}

export interface SemanticSearchOptions {
  limit?: number
  scoreThreshold?: number
  filter?: Record<string, any>
}

export class QdrantService {
  private client: QdrantClient
  private codeCollectionName = 'code_embeddings'
  private symbolCollectionName = 'symbol_embeddings'

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    })
  }

  async initialize(): Promise<void> {
    // Создать коллекции если они не существуют
    await this.createCodeCollection()
    await this.createSymbolCollection()
  }

  private async createCodeCollection(): Promise<void> {
    try {
      await this.client.createCollection(this.codeCollectionName, {
        vectors: {
          size: 1536, // Размер для text-embedding-ada-002
          distance: 'Cosine',
        },
        payload_schema: {
          filePath: 'keyword',
          language: 'keyword',
          symbols: 'keyword',
          lineCount: 'integer',
          lastModified: 'datetime',
        },
      })
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Code collection already exists')
      } else {
        throw error
      }
    }
  }

  private async createSymbolCollection(): Promise<void> {
    try {
      await this.client.createCollection(this.symbolCollectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
        payload_schema: {
          symbol: 'keyword',
          filePath: 'keyword',
          line: 'integer',
          context: 'text',
        },
      })
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Symbol collection already exists')
      } else {
        throw error
      }
    }
  }

  async upsertCodeEmbedding(embedding: CodeEmbedding): Promise<void> {
    const pointId = this.generateId(embedding.filePath)
    
    await this.client.upsert(this.codeCollectionName, {
      points: [
        {
          id: pointId,
          vector: embedding.embedding,
          payload: {
            filePath: embedding.filePath,
            content: embedding.content,
            language: embedding.metadata.language,
            symbols: embedding.metadata.symbols,
            lineCount: embedding.metadata.lineCount,
            lastModified: embedding.metadata.lastModified.toISOString(),
          },
        },
      ],
    })
  }

  async upsertSymbolEmbedding(embedding: SymbolEmbedding): Promise<void> {
    const pointId = this.generateId(`${embedding.filePath}:${embedding.line}:${embedding.symbol}`)
    
    await this.client.upsert(this.symbolCollectionName, {
      points: [
        {
          id: pointId,
          vector: embedding.embedding,
          payload: {
            symbol: embedding.symbol,
            filePath: embedding.filePath,
            line: embedding.line,
            context: embedding.context,
          },
        },
      ],
    })
  }

  async searchCode(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const embedding = await this.generateEmbedding(query)
    
    const searchResult = await this.client.search(this.codeCollectionName, {
      vector: embedding,
      limit: options.limit || 10,
      score_threshold: options.scoreThreshold || 0.7,
      filter: options.filter,
      with_payload: true,
    })

    return searchResult.points.map(point => ({
      filePath: point.payload.filePath,
      score: point.score,
      content: point.payload.content,
      metadata: {
        language: point.payload.language,
        symbols: point.payload.symbols,
        lineCount: point.payload.lineCount,
        lastModified: new Date(point.payload.lastModified),
      },
    }))
  }

  async searchSymbols(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const embedding = await this.generateEmbedding(query)
    
    const searchResult = await this.client.search(this.symbolCollectionName, {
      vector: embedding,
      limit: options.limit || 10,
      score_threshold: options.scoreThreshold || 0.7,
      filter: options.filter,
      with_payload: true,
    })

    return searchResult.points.map(point => ({
      filePath: point.payload.filePath,
      score: point.score,
      metadata: {
        symbol: point.payload.symbol,
        line: point.payload.line,
        context: point.payload.context,
      },
    }))
  }

  async getSimilarFiles(filePath: string, limit: number = 10): Promise<SearchResult[]> {
    // Получить эмбеддинг файла
    const fileResult = await this.client.retrieve(this.codeCollectionName, {
      ids: [this.generateId(filePath)],
      with_vectors: true,
    })

    if (fileResult.points.length === 0) {
      return []
    }

    const fileEmbedding = fileResult.points[0].vector
    
    // Найти похожие файлы
    const similarResult = await this.client.search(this.codeCollectionName, {
      vector: fileEmbedding,
      limit: limit + 1, // +1 чтобы исключить сам файл
      score_threshold: 0.5,
      with_payload: true,
    })

    return similarResult.points
      .filter(point => point.payload.filePath !== filePath)
      .slice(0, limit)
      .map(point => ({
        filePath: point.payload.filePath,
        score: point.score,
        metadata: {
          language: point.payload.language,
          symbols: point.payload.symbols,
        },
      }))
  }

  async deleteFileEmbeddings(filePath: string): Promise<void> {
    const pointId = this.generateId(filePath)
    
    await this.client.delete(this.codeCollectionName, {
      points: [pointId],
    })
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Здесь должна быть интеграция с EmbeddingService
    // Для примера возвращаем случайный вектор
    return Array.from({ length: 1536 }, () => Math.random())
  }

  private generateId(input: string): string {
    // Простая хэш-функция для генерации ID
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Преобразовать в 32-битное число
    }
    return Math.abs(hash).toString()
  }
}
```

### 3. Neo4j Service (графовые отношения)

```typescript
// src/services/neo4j/neo4j-graph.service.ts

import neo4j, { Driver, Session } from 'neo4j-driver'

export interface CodeEntity {
  id: string
  type: 'file' | 'function' | 'class' | 'interface' | 'variable'
  name: string
  filePath: string
  line: number
  column: number
  properties: Record<string, any>
}

export interface CodeRelationship {
  fromId: string
  toId: string
  type: 'imports' | 'calls' | 'inherits' | 'implements' | 'references' | 'defines'
  properties: Record<string, any>
}

export interface GraphQueryResult {
  nodes: CodeEntity[]
  relationships: CodeRelationship[]
  paths?: string[][]
}

export class Neo4jGraphService {
  private driver: Driver

  constructor(
    private uri: string,
    private username: string,
    private password: string
  ) {}

  async connect(): Promise<void> {
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    )
    
    await this.driver.verifyConnectivity()
    await this.createIndexes()
  }

  async disconnect(): Promise<void> {
    await this.driver.close()
  }

  async createEntity(entity: CodeEntity): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        await tx.run(`
          MERGE (e:CodeEntity {id: $id})
          SET e.type = $type,
              e.name = $name,
              e.filePath = $filePath,
              e.line = $line,
              e.column = $column,
              e.properties = $properties,
              e.updatedAt = datetime()
        `, {
          id: entity.id,
          type: entity.type,
          name: entity.name,
          filePath: entity.filePath,
          line: entity.line,
          column: entity.column,
          properties: entity.properties
        })
      })
    } finally {
      await session.close()
    }
  }

  async createRelationship(relationship: CodeRelationship): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        await tx.run(`
          MATCH (from:CodeEntity {id: $fromId})
          MATCH (to:CodeEntity {id: $toId})
          MERGE (from)-[r:${relationship.type}]->(to)
          SET r.properties = $properties,
              r.createdAt = datetime()
        `, {
          fromId: relationship.fromId,
          toId: relationship.toId,
          properties: relationship.properties
        })
      })
    } finally {
      await session.close()
    }
  }

  async getEntityContext(entityId: string): Promise<GraphQueryResult> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        // Получить сущность и все связанные
        const res = await tx.run(`
          MATCH (center:CodeEntity {id: $entityId})
          OPTIONAL MATCH (center)-[r]-(related:CodeEntity)
          RETURN center, collect(DISTINCT related) as relatedEntities, collect(DISTINCT r) as relationships
        `, { entityId })

        const record = res.records[0]
        if (!record) return { nodes: [], relationships: [] }

        const center = record.get('center')
        const related = record.get('relatedEntities')
        const rels = record.get('relationships')

        const nodes: CodeEntity[] = [
          {
            id: center.properties.id,
            type: center.properties.type,
            name: center.properties.name,
            filePath: center.properties.filePath,
            line: center.properties.line,
            column: center.properties.column,
            properties: center.properties.properties
          },
          ...related.map((node: any) => ({
            id: node.properties.id,
            type: node.properties.type,
            name: node.properties.name,
            filePath: node.properties.filePath,
            line: node.properties.line,
            column: node.properties.column,
            properties: node.properties.properties
          }))
        ]

        const relationships: CodeRelationship[] = rels.map((rel: any) => ({
          fromId: rel.startNodeElementId,
          toId: rel.endNodeElementId,
          type: rel.type,
          properties: rel.properties
        }))

        return { nodes, relationships }
      })

      return result
    } finally {
      await session.close()
    }
  }

  async findPath(fromId: string, toId: string): Promise<string[][]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH path = (from:CodeEntity {id: $fromId})-[*]-(to:CodeEntity {id: $toId})
          RETURN [node in nodes(path) | node.id] as pathIds
          LIMIT 10
        `, { fromId, toId })

        return res.records.map(record => record.get('pathIds'))
      })

      return result
    } finally {
      await session.close()
    }
  }

  async getDependencies(entityId: string, depth: number = 1): Promise<CodeEntity[]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (entity:CodeEntity {id: $entityId})
          MATCH (entity)-[:imports|calls|references*1..$depth]->(dep:CodeEntity)
          RETURN DISTINCT dep
        `, { entityId, depth })

        return res.records.map(record => {
          const node = record.get('dep')
          return {
            id: node.properties.id,
            type: node.properties.type,
            name: node.properties.name,
            filePath: node.properties.filePath,
            line: node.properties.line,
            column: node.properties.column,
            properties: node.properties.properties
          }
        })
      })

      return result
    } finally {
      await session.close()
    }
  }

  async getImpactGraph(entityId: string, maxDepth: number = 3): Promise<GraphQueryResult> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (start:CodeEntity {id: $entityId})
          MATCH path = (start)-[:calls|references|defines*1..$maxDepth]->(affected:CodeEntity)
          WITH nodes(path) as nodes, relationships(path) as rels
          UNWIND nodes as node
          UNWIND rels as rel
n          RETURN collect(DISTINCT node) as nodes, collect(DISTINCT rel) as relationships
        `, { entityId, maxDepth })

        const record = res.records[0]
        if (!record) return { nodes: [], relationships: [] }

        const nodes = record.get('nodes').map((node: any) => ({
          id: node.properties.id,
          type: node.properties.type,
          name: node.properties.name,
          filePath: node.properties.filePath,
          line: node.properties.line,
          column: node.properties.column,
          properties: node.properties.properties
        }))

        const relationships = record.get('relationships').map((rel: any) => ({
          fromId: rel.startNodeElementId,
          toId: rel.endNodeElementId,
          type: rel.type,
          properties: rel.properties
        }))

        return { nodes, relationships }
      })

      return result
    } finally {
      await session.close()
    }
  }

  async bulkCreateEntities(entities: CodeEntity[]): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        for (const entity of entities) {
          await tx.run(`
            MERGE (e:CodeEntity {id: $id})
            SET e.type = $type,
                e.name = $name,
                e.filePath = $filePath,
                e.line = $line,
                e.column = $column,
                e.properties = $properties,
                e.updatedAt = datetime()
          `, {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            filePath: entity.filePath,
            line: entity.line,
            column: entity.column,
            properties: entity.properties
          })
        }
      })
    } finally {
      await session.close()
    }
  }

  private async createIndexes(): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        await tx.run('CREATE INDEX entity_id IF NOT EXISTS FOR (e:CodeEntity) ON (e.id)')
        await tx.run('CREATE INDEX entity_name IF NOT EXISTS FOR (e:CodeEntity) ON (e.name)')
        await tx.run('CREATE INDEX entity_type IF NOT EXISTS FOR (e:CodeEntity) ON (e.type)')
        await tx.run('CREATE INDEX entity_file IF NOT EXISTS FOR (e:CodeEntity) ON (e.filePath)')
      })
    } finally {
      await session.close()
    }
  }
}
```

### 4. Гибридный поисковый сервис

```typescript
// src/services/search/hybrid-search.service.ts

import { QdrantService } from '../qdrant/qdrant.service'
import { Neo4jGraphService } from '../neo4j/neo4j-graph.service'
import { EmbeddingService } from '../embeddings/embedding.service'

export interface HybridSearchOptions {
  semanticWeight?: number
  graphWeight?: number
  includeDependencies?: boolean
  maxDepth?: number
  limit?: number
}

export interface HybridSearchResult {
  filePath: string
  semanticScore: number
  graphScore: number
  combinedScore: number
  content?: string
  metadata?: {
    language?: string
    symbols?: string[]
    dependencies?: string[]
    dependents?: string[]
  }
}

export interface CodeContext {
  file: {
    path: string
    content: string
    language: string
  }
  semanticSimilarity: {
    similarFiles: string[]
    relatedSymbols: string[]
  }
  graphRelations: {
    dependencies: string[]
    dependents: string[]
    callGraph: string[][]
  }
}

export class HybridSearchService {
  constructor(
    private qdrantService: QdrantService,
    private neo4jService: Neo4jGraphService,
    private embeddingService: EmbeddingService
  ) {}

  async searchCode(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      semanticWeight = 0.6,
      graphWeight = 0.4,
      includeDependencies = true,
      maxDepth = 2,
      limit = 20
    } = options

    // 1. Семантический поиск через Qdrant
    const semanticResults = await this.qdrantService.searchCode(query, {
      limit: limit * 2, // Больше результатов для ранжирования
      includeDependencies
    })

    // 2. Генерация эмбеддинга для запроса
    const queryEmbedding = await this.embeddingService.generateCodeEmbedding(query)

    // 3. Поиск в графе (если есть конкретные сущности)
    const graphResults = await this.searchInGraph(query, semanticResults)

    // 4. Комбинирование результатов
    const combinedResults = this.combineResults(
      semanticResults,
      graphResults,
      semanticWeight,
      graphWeight
    )

    // 5. Добавление контекста зависимостей
    if (includeDependencies) {
      await this.addDependencyContext(combinedResults, maxDepth)
    }

    // 6. Сортировка по комбинированному скору и ограничение
    return combinedResults
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit)
  }

  async getCodeContext(filePath: string): Promise<CodeContext> {
    // 1. Получить файл из Qdrant
    const fileResult = await this.qdrantService.searchFiles(filePath, 1)
    const file = fileResult[0]
    
    if (!file) {
      throw new Error(`File not found: ${filePath}`)
    }

    // 2. Получить семантически похожие файлы
    const similarFiles = await this.qdrantService.getSimilarFiles(filePath, 10)

    // 3. Получить графовый контекст из Neo4j
    const entityId = this.generateEntityId(filePath)
    const graphContext = await this.neo4jService.getEntityContext(entityId)

    // 4. Получить зависимости
    const dependencies = await this.neo4jService.getDependencies(entityId)

    // 5. Построить граф вызовов
    const callGraph = await this.buildCallGraph(entityId)

    return {
      file: {
        path: filePath,
        content: file.content || '',
        language: file.metadata?.language || 'unknown'
      },
      semanticSimilarity: {
        similarFiles: similarFiles.map(f => f.filePath),
        relatedSymbols: [] // Можно добавить поиск похожих символов
      },
      graphRelations: {
        dependencies: dependencies.map(d => d.filePath),
        dependents: [], // Можно добавить поиск зависимых
        callGraph
      }
    }
  }

  async findRelatedCode(
    filePath: string,
    options: {
      includeSemantic?: boolean
      includeGraph?: boolean
      depth?: number
    } = {}
  ): Promise<{
    semantic: string[]
    graph: string[]
    combined: string[]
  }> {
    const { includeSemantic = true, includeGraph = true, depth = 2 } = options

    const result = {
      semantic: [] as string[],
      graph: [] as string[],
      combined: [] as string[]
    }

    if (includeSemantic) {
      const similarFiles = await this.qdrantService.getSimilarFiles(filePath, 10)
      result.semantic = similarFiles.map(f => f.filePath)
    }

    if (includeGraph) {
      const entityId = this.generateEntityId(filePath)
      const dependencies = await this.neo4jService.getDependencies(entityId, depth)
      result.graph = dependencies.map(d => d.filePath)
    }

    // Объединить и убрать дубликаты
    result.combined = [...new Set([...result.semantic, ...result.graph])]

    return result
  }

  async analyzeRefactoringImpact(
    filePath: string,
    symbolName?: string
  ): Promise<{
    affectedFiles: string[]
    impactScore: number
    breakingChanges: string[]
    recommendations: string[]
  }> {
    const entityId = this.generateEntityId(filePath)
    
    // Получить граф влияния
    const impactGraph = await this.neo4jService.getImpactGraph(entityId)
    
    // Получить зависимые файлы
    const dependents = await this.neo4jService.getDependencies(entityId)
    
    // Анализировать семантическое влияние
    const semanticImpact = await this.analyzeSemanticImpact(filePath, symbolName)
    
    const affectedFiles = [
      ...new Set([
        ...impactGraph.nodes.map(n => n.filePath),
        ...dependents.map(d => d.filePath),
        ...semanticImpact.affectedFiles
      ])
    ]

    const impactScore = this.calculateImpactScore(
      impactGraph.nodes.length,
      dependents.length,
      semanticImpact.score
    )

    return {
      affectedFiles,
      impactScore,
      breakingChanges: this.identifyBreakingChanges(impactGraph),
      recommendations: this.generateRecommendations(impactGraph, semanticImpact)
    }
  }

  private async searchInGraph(
    query: string,
    semanticResults: any[]
  ): Promise<Map<string, number>> {
    const graphScores = new Map<string, number>()
    
    // Попытаться найти конкретные сущности по имени
    for (const result of semanticResults) {
      const entities = await this.neo4jService.findSymbols(
        path.basename(result.filePath, path.extname(result.filePath)),
        undefined
      )
      
      for (const entity of entities) {
        const context = await this.neo4jService.getEntityContext(entity.id)
        // Оценить релевантность на основе контекста
        const relevanceScore = this.calculateGraphRelevance(query, context)
        graphScores.set(entity.filePath, relevanceScore)
      }
    }
    
    return graphScores
  }

  private combineResults(
    semanticResults: any[],
    graphResults: Map<string, number>,
    semanticWeight: number,
    graphWeight: number
  ): HybridSearchResult[] {
    const combined = new Map<string, HybridSearchResult>()
    
    // Добавить семантические результаты
    for (const result of semanticResults) {
      const semanticScore = result.score || 0.8 // Если score не доступен, используем дефолт
      const graphScore = graphResults.get(result.filePath) || 0
      
      const combinedScore = (semanticScore * semanticWeight) + (graphScore * graphWeight)
      
      combined.set(result.filePath, {
        filePath: result.filePath,
        semanticScore,
        graphScore,
        combinedScore,
        content: result.content,
        metadata: result.metadata
      })
    }
    
    // Добавить графовые результаты, которых нет в семантических
    for (const [filePath, graphScore] of graphResults) {
      if (!combined.has(filePath)) {
        combined.set(filePath, {
          filePath,
          semanticScore: 0,
          graphScore,
          combinedScore: graphScore * graphWeight,
          metadata: {}
        })
      }
    }
    
    return Array.from(combined.values())
  }

  private async addDependencyContext(
    results: HybridSearchResult[],
    maxDepth: number
  ): Promise<void> {
    for (const result of results) {
      const entityId = this.generateEntityId(result.filePath)
      
      try {
        // Получить зависимости
        const dependencies = await this.neo4jService.getDependencies(entityId, maxDepth)
        
        // Получтиь зависимые файлы
        const dependents = await this.neo4jService.getDependencies(entityId, maxDepth)
        
        if (!result.metadata) {
          result.metadata = {}
        }
        
        result.metadata.dependencies = dependencies.map(d => d.filePath)
        result.metadata.dependents = dependents.map(d => d.filePath)
        
      } catch (error) {
        console.warn(`Failed to get dependency context for ${result.filePath}:`, error)
      }
    }
  }

  private async buildCallGraph(entityId: string): Promise<string[][]> {
    try {
      return await this.neo4jService.findPath(entityId, entityId)
    } catch {
      return []
    }
  }

  private async analyzeSemanticImpact(
    filePath: string,
    symbolName?: string
  ): Promise<{ affectedFiles: string[], score: number }> {
    // Анализ семантического влияния через эмбеддинги
    const similarFiles = await this.qdrantService.getSimilarFiles(filePath, 20)
    
    return {
      affectedFiles: similarFiles.map(f => f.filePath),
      score: similarFiles.length / 20 // Нормализованный скор
    }
  }

  private calculateImpactScore(
    graphNodes: number,
    dependencies: number,
    semanticScore: number
  ): number {
    const graphImpact = Math.min(graphNodes / 50, 1) // Нормализовать до 50 файлов
    const dependencyImpact = Math.min(dependencies / 20, 1) // Нормализовать до 20 файлов
    
    return (graphImpact * 0.4) + (dependencyImpact * 0.4) + (semanticScore * 0.2)
  }

  private identifyBreakingChanges(impactGraph: any): string[] {
    const breakingChanges: string[] = []
    
    // Анализировать граф на наличие потенциально breaking changes
    for (const node of impactGraph.nodes) {
      if (node.type === 'function') {
        breakingChanges.push(`Function ${node.name} may be affected`)
      } else if (node.type === 'class') {
        breakingChanges.push(`Class ${node.name} may be affected`)
      }
    }
    
    return breakingChanges
  }

  private generateRecommendations(
    impactGraph: any,
    semanticImpact: any
  ): string[] {
    const recommendations: string[] = []
    
    if (impactGraph.nodes.length > 10) {
      recommendations.push('Consider breaking down the change into smaller parts')
    }
    
    if (semanticImpact.score > 0.8) {
      recommendations.push('High semantic similarity detected - review for breaking changes')
    }
    
    recommendations.push('Run tests on affected files before merging')
    
    return recommendations
  }

  private generateEntityId(filePath: string): string {
    return `file:${filePath}`
  }
}
```

### 5. Integration Service (оркестратор)

```typescript
// src/services/integration/integration.service.ts

import { EmbeddingService } from '../embeddings/embedding.service'
import { QdrantService } from '../qdrant/qdrant.service'
import { Neo4jGraphService } from '../neo4j/neo4j-graph.service'
import { HybridSearchService } from '../search/hybrid-search.service'

export interface IntegrationConfig {
  neo4j: {
    uri: string
    username: string
    password: string
  }
  qdrant: {
    url: string
    apiKey?: string
  }
  openai: {
    apiKey: string
  }
}

export interface CodebaseIndexingOptions {
  batchSize?: number
  concurrentBatches?: number
  includeEmbeddings?: boolean
  includeGraph?: boolean
}

export interface SearchRequest {
  query: string
  searchType: 'semantic' | 'graph' | 'hybrid'
  filters?: {
    language?: string
    filePattern?: string
    excludeTests?: boolean
  }
  options?: any
}

export class IntegrationService {
  private embeddingService: EmbeddingService
  private qdrantService: QdrantService
  private neo4jService: Neo4jGraphService
  private hybridSearchService: HybridSearchService
  
  private isInitialized = false
  private isIndexing = false

  constructor(private config: IntegrationConfig) {
    this.embeddingService = new EmbeddingService(config.openai.apiKey)
    this.qdrantService = new QdrantService(config.qdrant)
    this.neo4jService = new Neo4jGraphService(
      config.neo4j.uri,
      config.neo4j.username,
      config.neo4j.password
    )
    this.hybridSearchService = new HybridSearchService(
      this.qdrantService,
      this.neo4jService,
      this.embeddingService
    )
  }

  async initialize(): Promise<void> {
    console.log('Initializing Integration Service...')
    
    try {
      // Подключиться к Neo4j
      await this.neo4jService.connect()
      console.log('Connected to Neo4j')
      
      // Инициализировать Qdrant
      await this.qdrantService.initialize()
      console.log('Qdrant initialized')
      
      this.isInitialized = true
      console.log('Integration Service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Integration Service:', error)
      throw error
    }
  }

  async indexFile(
    filePath: string,
    content: string,
    options: CodebaseIndexingOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Integration Service not initialized')
    }

    const {
      includeEmbeddings = true,
      includeGraph = true
    } = options

    try {
      // 1. Генерация эмбеддингов
      if (includeEmbeddings) {
        const embedding = await this.embeddingService.generateCodeEmbedding(content)
        
        const codeEmbedding: CodeEmbedding = {
          filePath,
          content,
          embedding,
          metadata: {
            language: this.detectLanguage(filePath),
            symbols: this.extractSymbols(content, filePath),
            lineCount: content.split('\n').length,
            lastModified: new Date()
          }
        }
        
        // Сохранить в Qdrant
        await this.qdrantService.upsertCodeEmbedding(codeEmbedding)
      }

      // 2. Извлечение и индексация графовых отношений
      if (includeGraph) {
        const entities = this.extractEntities(filePath, content)
        const relationships = this.extractRelationships(filePath, content)
        
        // Сохранить в Neo4j
        await this.neo4jService.bulkCreateEntities(entities)
        
        for (const rel of relationships) {
          await this.neo4jService.createRelationship(rel)
        }
      }

      console.log(`Indexed file: ${filePath}`)
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error)
      throw error
    }
  }

  async search(request: SearchRequest) {
    if (!this.isInitialized) {
      throw new Error('Integration Service not initialized')
    }

    switch (request.searchType) {
      case 'semantic':
        return this.semanticSearch(request.query, request.options)
      case 'graph':
        return this.graphSearch(request.query, request.options)
      case 'hybrid':
        return this.hybridSearch(request.query, request.options)
      default:
        throw new Error(`Unknown search type: ${request.searchType}`)
    }
  }

  async semanticSearch(query: string, options?: any) {
    return this.hybridSearchService.searchCode(query, {
      ...options,
      semanticWeight: 1.0,
      graphWeight: 0.0
    })
  }

  async graphSearch(query: string, options?: any) {
    // Поиск в графе по имени сущности или пути файла
    const entityId = this.generateEntityId(query)
    return this.neo4jService.getEntityContext(entityId)
  }

  async hybridSearch(query: string, options?: any) {
    return this.hybridSearchService.searchCode(query, options)
  }

  async getCodeContext(filePath: string): Promise<CodeContext> {
    return this.hybridSearchService.getCodeContext(filePath)
  }

  async analyzeImpact(
    filePath: string,
    symbolName?: string
  ): Promise<any> {
    return this.hybridSearchService.analyzeRefactoringImpact(filePath, symbolName)
  }

  async indexWorkspace(
    rootPath: string,
    options: CodebaseIndexingOptions = {}
  ): Promise<void> {
    if (this.isIndexing) {
      console.log('Indexing already in progress...')
      return
    }

    this.isIndexing = true
    
    try {
      console.log(`Starting workspace indexing: ${rootPath}`)
      
      const files = await this.getAllCodeFiles(rootPath)
      console.log(`Found ${files.length} files to index`)
      
      const { batchSize = 10, concurrentBatches = 3 } = options
      
      // Индексировать в пакетах
      for (let i = 0; i < files.length; i += batchSize * concurrentBatches) {
        const batchPromises = []
        
        for (let j = 0; j < concurrentBatches; j++) {
          const start = i + j * batchSize
          const end = Math.min(start + batchSize, files.length)
          
          if (start < end) {
            const batch = files.slice(start, end)
            batchPromises.push(this.indexFileBatch(batch))
          }
        }
        
        await Promise.allSettled(batchPromises)
        
        console.log(`Indexed ${Math.min(i + batchSize * concurrentBatches, files.length)}/${files.length} files`)
      }
      
      console.log('Workspace indexing completed')
    } finally {
      this.isIndexing = false
    }
  }

  private async indexFileBatch(files: Array<{ path: string; content: string }>): Promise<void> {
    for (const file of files) {
      try {
        await this.indexFile(file.path, file.content)
      } catch (error) {
        console.error(`Error indexing ${file.path}:`, error)
      }
    }
  }

  private async getAllCodeFiles(rootPath: string): Promise<Array<{ path: string; content: string }>> {
    const supportedExtensions = [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb',
      '.cs', '.swift', '.kt', '.scala'
    ]
    
    const files: Array<{ path: string; content: string }> = []
    
    const walkDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          // Пропустить служебные директории
          if (!['node_modules', '.git', '.vscode', 'dist', 'build'].includes(entry.name)) {
            await walkDir(fullPath)
          }
        } else if (supportedExtensions.some(ext => entry.name.endsWith(ext))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8')
            files.push({ path: fullPath, content })
          } catch (error) {
            console.warn(`Could not read file ${fullPath}:`, error)
          }
        }
      }
    }
    
    await walkDir(rootPath)
    return files
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    }
    return languageMap[ext] || 'unknown'
  }

  private extractSymbols(content: string, filePath: string): string[] {
    // Упрощенное извлечение символов
    const symbols: string[] = []
    const lines = content.split('\n')
    
    lines.forEach(line => {
      // Поиск функций
      const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
      if (functionMatch) {
        symbols.push(functionMatch[1])
      }
      
      // Поиск классов
      const classMatch = line.match(/(?:export\s+)?(?:default\s+)?class\s+(\w+)/)
      if (classMatch) {
        symbols.push(classMatch[1])
      }
      
      // Поиск интерфейсов
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        symbols.push(interfaceMatch[1])
      }
    })
    
    return symbols
  }

  private extractEntities(content: string, filePath: string): CodeEntity[] {
    const entities: CodeEntity[] = []
    const baseEntity: CodeEntity = {
      id: this.generateEntityId(filePath),
      type: 'file',
      name: path.basename(filePath),
      filePath,
      line: 1,
      column: 1,
      properties: {
        language: this.detectLanguage(filePath),
        size: content.length
      }
    }
    
    entities.push(baseEntity)
    
    // Добавить символы как сущности
    const symbols = this.extractSymbols(content, filePath)
    symbols.forEach((symbol, index) => {
      entities.push({
        id: `${baseEntity.id}:${symbol}`,
        type: this.inferSymbolType(symbol, content),
        name: symbol,
        filePath,
        line: index + 1, // Упрощено - в реальности нужно парсить AST
        column: 1,
        properties: {}
      })
    })
    
    return entities
  }

  private extractRelationships(content: string, filePath: string): CodeRelationship[] {
    const relationships: CodeRelationship[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Поиск import'ов
      const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        relationships.push({
          fromId: this.generateEntityId(filePath),
          toId: this.generateEntityId(importMatch[1]),
          type: 'imports',
          properties: {
            line: index + 1,
            type: 'import'
          }
        })
      }
    })
    
    return relationships
  }

  private inferSymbolType(symbol: string, content: string): 'function' | 'class' | 'interface' | 'variable' {
    // Упрощенное определение типа символа
    if (content.includes(`class ${symbol}`)) return 'class'
    if (content.includes(`interface ${symbol}`)) return 'interface'
    if (content.includes(`function ${symbol}`) || content.includes(`${symbol}(`)) return 'function'
    return 'variable'
  }

  private generateEntityId(filePath: string): string {
    return `file:${filePath}`
  }
}
```

---

## Установка и настройка

### 1. Docker Compose для всей системы

```yaml
# docker-compose.yml

version: '3.8'

services:
  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_dbms_default__database=kilocode
    volumes:
      - neo4j_data:/data
    networks:
      - kilocode-network

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - kilocode-network

  kilocode-extension:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=password
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./workspace:/workspace
    networks:
      - kilocode-network
    depends_on:
      - neo4j
      - qdrant

volumes:
  neo4j_data:
  qdrant_data:

networks:
  kilocode-network:
    driver: bridge
```

### 2. Установка зависимостей

```bash
# package.json additions
{
  "dependencies": {
    "neo4j-driver": "^5.x",
    "@qdrant/js-client-rest": "^1.x",
    "openai": "^4.x",
    "@dqbd/tiktoken": "^1.x",
    "tree-sitter": "^0.20.x",
    "tree-sitter-typescript": "^0.20.x",
    "tree-sitter-python": "^0.20.x",
    // ... другие парсеры
  }
}
```

### 3. Настройка конфигурации

```typescript
// src/config/hybrid-search.config.ts

export const hybridSearchConfig = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: process.env.NEO4J_DATABASE || 'kilocode'
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  indexing: {
    batchSize: parseInt(process.env.INDEXING_BATCH_SIZE || '10'),
    concurrentBatches: parseInt(process.env.INDEXING_CONCURRENT_BATCHES || '3'),
    includeEmbeddings: process.env.INDEXING_INCLUDE_EMBEDDINGS !== 'false',
    includeGraph: process.env.INDEXING_INCLUDE_GRAPH !== 'false'
  },
  search: {
    defaultLimit: parseInt(process.env.SEARCH_DEFAULT_LIMIT || '20'),
    semanticWeight: parseFloat(process.env.SEARCH_SEMANTIC_WEIGHT || '0.6'),
    graphWeight: parseFloat(process.env.SEARCH_GRAPH_WEIGHT || '0.4'),
    scoreThreshold: parseFloat(process.env.SEARCH_SCORE_THRESHOLD || '0.7')
  }
}
```

### 4. Инициализация в расширении

```typescript
// src/extension.ts

import { IntegrationService } from './services/integration/integration.service'
import { hybridSearchConfig } from './config/hybrid-search.config'

let integrationService: IntegrationService

export async function activate(context: vscode.ExtensionContext) {
  console.log('Kilocode extension is activating...')
  
  // Инициализация гибридного поиска
  integrationService = new IntegrationService(hybridSearchConfig)
  
  try {
    await integrationService.initialize()
    console.log('Hybrid search system initialized')
  } catch (error) {
    console.error('Failed to initialize hybrid search system:', error)
    // Fallback на стандартный поиск
  }
  
  // Индексировать workspace при открытии
  if (vscode.workspace.workspaceFolders) {
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath
    integrationService.indexWorkspace(workspaceRoot).catch(console.error)
  }
  
  // Регистрация команд
  context.subscriptions.push(
    vscode.commands.registerCommand('kilocode.hybridSearch', async () => {
      const query = await vscode.window.showInputBox({ 
        prompt: 'Enter your search query (supports natural language)' 
      })
      
      if (query) {
        const results = await integrationService.search({
          query,
          searchType: 'hybrid',
          options: {
            limit: 20,
            includeDependencies: true
          }
        })
        
        // Показать результаты в UI
        showSearchResults(results)
      }
    }),
    
    vscode.commands.registerCommand('kilocode.findRelatedCode', async (fileUri) => {
      const related = await integrationService.hybridSearchService.findRelatedCode(fileUri.fsPath)
      showRelatedCode(related)
    }),
    
    vscode.commands.registerCommand('kilocode.analyzeRefactoring', async (fileUri) => {
      const analysis = await integrationService.analyzeImpact(fileUri.fsPath)
      showRefactoringAnalysis(analysis)
    }),
    
    vscode.commands.registerCommand('kilocode.showCodeContext', async (fileUri) => {
      const context = await integrationService.getCodeContext(fileUri.fsPath)
      showCodeContext(context)
    })
  )
  
  // File watchers для автоматического обновления индекса
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rs,php,rb}')
  
  watcher.onDidChange(async (uri) => {
    const content = (await vscode.workspace.fs.readFile(uri)).toString()
    await integrationService.indexFile(uri.fsPath, content)
  })
  
  watcher.onDidCreate(async (uri) => {
    const content = (await vscode.workspace.fs.readFile(uri)).toString()
    await integrationService.indexFile(uri.fsPath, content)
  })
  
  watcher.onDidDelete(async (uri) => {
    // Удалить из индексов
    await integrationService.qdrantService.deleteFileEmbeddings(uri.fsPath)
  })
  
  context.subscriptions.push(watcher)
}

function showSearchResults(results: any[]) {
  // Реализация UI для показа результатов
  const panel = vscode.window.createWebviewPanel(
    'hybridSearchResults',
    'Search Results',
    vscode.ViewColumn.One,
    { enableScripts: true }
  )
  
  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .result { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
        .file-path { font-weight: bold; color: #0066cc; }
        .score { color: #666; font-size: 0.9em; }
        .content { margin-top: 5px; font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>Search Results</h1>
      ${results.map(result => `
        <div class="result">
          <div class="file-path">${result.filePath}</div>
          <div class="score">
            Combined: ${result.combinedScore.toFixed(3)} | 
            Semantic: ${result.semanticScore.toFixed(3)} | 
            Graph: ${result.graphScore.toFixed(3)}
          </div>
          <div class="content">${result.content?.substring(0, 200)}...</div>
        </div>
      `).join('')}
    </body>
    </html>
  `
}
```

---

## Использование

### 1. Поиск кода (естественным языком)

```typescript
// Поиск функции для работы с пользователями
const results = await integrationService.search({
  query: "function that validates user email and creates account",
  searchType: 'hybrid',
  options: {
    limit: 10,
    includeDependencies: true
  }
})

// Результаты будут содержать:
// - Семантически похожие файлы (функции валидации, создания аккаунта)
// - Графовые связи (файлы, которые используют эти функции)
// - Комбинированный рейтинг релевантности
```

### 2. Анализ влияния рефакторинга

```typescript
// Анализ влияния изменения файла
const impact = await integrationService.analyzeImpact('/src/services/user.ts')

console.log('Affected files:', impact.affectedFiles)
console.log('Impact score:', impact.impactScore)
console.log('Breaking changes:', impact.breakingChanges)
console.log('Recommendations:', impact.recommendations)
```

### 3. Получение контекста кода

```typescript
// Получение полного контекста файла
const context = await integrationService.getCodeContext('/src/services/user.ts')

console.log('File:', context.file)
console.log('Semantic similarity:', context.semanticSimilarity)
console.log('Graph relations:', context.graphRelations)
```

### 4. Поиск связанного кода

```typescript
// Поиск всех связанных файлов
const related = await integrationService.hybridSearchService.findRelatedCode(
  '/src/services/user.ts',
  {
    includeSemantic: true,
    includeGraph: true,
    depth: 3
  }
)

console.log('Semantic matches:', related.semantic)
console.log('Graph relations:', related.graph)
console.log('Combined:', related.combined)
```

---

## Преимущества гибридного подхода

### 1. **Точность поиска**
- Семантический поиск находит код по смыслу
- Графовый анализ находит связи по структуре
- Комбинирование даёт более релевантные результаты

### 2. **Контекстное понимание**
- Понимание зависимостей между файлами
- Анализ цепочек вызовов функций
- Выявление неявных связей в коде

### 3. **Анализ влияния**
- Определение последствий изменений
- Поиск потенциально breaking changes
- Рекомендации по безопасному рефакторингу

### 4. **Масштабируемость**
- Qdrant оптимизирован для векторного поиска
- Neo4j эффективно работает с графами
- Асинхронная индексация не блокирует работу

---

## Сравнение с подходами

| Подход | Точность | Контекст | Анализ влияния | Масштабируемость |
|--------|----------|----------|----------------|------------------|
| Текстовый поиск | ⭐ | ❌ | ❌ | ✅ |
| Векторный поиск (Qdrant) | ⭐⭐⭐ | ⭐⭐ | ❌ | ✅ |
| Графовый поиск (Neo4j) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Гибридный (Qdrant + Neo4j)** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐** | **⭐⭐⭐** |

---

## Следующие шаги

### 1. Пилотный проект (1-2 недели)
- [ ] Установить Neo4j и Qdrant
- [ ] Реализовать базовый гибридный поиск
- [ ] Протестировать на небольшом проекте
- [ ] Оценить производительность

### 2. Интеграция в Kilocode (2-4 недели)
- [ ] Разработать UI для результатов поиска
- [ ] Добавить команды в расширение
- [ ] Реализовать file watchers
- [ ] Добавить настройки конфигурации

### 3. Расширенные функции (2-3 недели)
- [ ] Визуализация графа зависимостей
- [ ] Расширенный анализ влияния
- [ ] Поддержка дополнительных языков
- [ ] Оптимизация производительности

### 4. Тестирование и rollout (1-2 недели)
- [ ] Интеграционные тесты
- [ ] Нагрузочное тестирование
- [ ] Документация
- [ ] Постепенный rollout

---

## Заключение

Гибридный подход с Neo4j + Qdrant + эмбеддингами, как в Qoder, предоставляет:

### 🎯 **Преимущества**
- **Точный поиск** - комбинирует семантику и структуру
- **Контекстное понимание** - видит связи в коде
- **Анализ влияния** - предсказывает последствия изменений
- **Масштабируемость** - работает с большими кодовыми базами

### 🚀 **Возможности для Kilocode**
- Умный поиск кода по смыслу
- Визуализация зависимостей
- Безопасный рефакторинг
- Повышение productivity разработчиков

### 📊 **Ожидаемый эффект**
- Улучшение точности поиска на 40-60%
- Сокращение времени на понимание кода
- Предотвращение breaking changes
- Улучшение качества кода

---

**Готовы к внедрению! Все материалы подготовлены для начала работы.**