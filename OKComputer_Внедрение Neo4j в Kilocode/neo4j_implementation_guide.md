# Руководство по внедрению Neo4j в Kilocode

## Оглавление
1. [Обзор проекта](#обзор-проекта)
2. [Архитектура решения](#архитектура-решения)
3. [Техническая реализация](#техническая-реализация)
4. [Пошаговое руководство](#пошаговое-руководство)
5. [Тестирование](#тестирование)
6. [Мониторинг и поддержка](#мониторинг-и-поддержка)

---

## Обзор проекта

### Цель
Интегрировать графовую базу данных Neo4j в платформу Kilocode для улучшения анализа кода, управления контекстом и построения графа знаний.

### Почему Neo4j?
- **Графовая модель**: Идеально подходит для представления связей в коде
- **Cypher**: Мощный язык запросов для сложных аналитических задач
- **Производительность**: Высокая скорость обработки связанных данных
- **Масштабируемость**: Поддержка кластеров и больших объемов данных

---

## Архитектура решения

### Компоненты системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kilocode      │    │   Neo4j Service │    │   Neo4j DB      │
│   Extension     │    │   Layer         │    │   (Aura/Local)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼──────┐         ┌─────▼──────┐         ┌─────▼──────┐
    │  Core     │         │  API       │         │  Graph     │
    │  Modules  │ ──────→ │  Client    │ ──────→ │  Storage   │
    └───────────┘         └────────────┘         └────────────┘
```

### Основные модули

#### 1. Neo4j Service Layer (`/src/services/neo4j`)
```typescript
interface Neo4jService {
  connect(): Promise<void>
  disconnect(): Promise<void>
  query(cypher: string, params?: Record<string, any>): Promise<any>
  createFileNode(file: FileNode): Promise<void>
  createRelationship(from: string, to: string, type: string): Promise<void>
}
```

#### 2. Graph Models (`/src/core/graph`)
```typescript
// Узлы
interface FileNode {
  path: string
  name: string
  content: string
  language: string
  size: number
  lastModified: Date
}

interface FunctionNode {
  name: string
  file: string
  line: number
  parameters: string[]
  returnType: string
}

// Связи
interface DependsOn {
  from: string
  to: string
  type: 'import' | 'call' | 'inherit' | 'implement'
  strength: number
}
```

#### 3. Integration Points

**Code Index Service** (`/src/services/code-index`)
- Замена существующего индекса на графовую структуру
- Автоматическое обновление при изменении файлов
- Поддержка поиска с учетом зависимостей

**Context Management** (`/src/core/context-management`)
- Связывание контекстов задач через граф
- История изменений и взаимосвязей
- Умное предсказание контекста

**Task Persistence** (`/src/core/task-persistence`)
- Сохранение задач как граф состояний
- Отслеживание зависимостей между задачами
- Анализ паттернов выполнения

---

## Техническая реализация

### Установка зависимостей

```bash
# Установка Neo4j драйвера
pnpm add neo4j-driver
pnpm add -D @types/neo4j-driver

# Дополнительные зависимости для работы с графами
pnpm add graphlib
pnpm add -D @types/graphlib
```

### Конфигурация

#### 1. Environment Variables
```bash
# .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=kilocode
```

#### 2. TypeScript Configuration
```typescript
// src/types/neo4j.ts
export interface Neo4jConfig {
  uri: string
  username: string
  password: string
  database?: string
}

export interface GraphNode {
  id: string
  labels: string[]
  properties: Record<string, any>
}

export interface GraphRelationship {
  id: string
  type: string
  startNode: string
  endNode: string
  properties: Record<string, any>
}
```

### Базовые сервисы

#### Neo4j Connection Manager
```typescript
// src/services/neo4j/connection.ts
import neo4j, { Driver, Session } from 'neo4j-driver'

export class Neo4jConnectionManager {
  private driver: Driver | null = null
  private static instance: Neo4jConnectionManager

  public static getInstance(): Neo4jConnectionManager {
    if (!Neo4jConnectionManager.instance) {
      Neo4jConnectionManager.instance = new Neo4jConnectionManager()
    }
    return Neo4jConnectionManager.instance
  }

  async connect(config: Neo4jConfig): Promise<void> {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    )
    
    // Проверка соединения
    await this.driver.verifyConnectivity()
    console.log('Connected to Neo4j successfully')
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }

  getSession(database?: string): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized')
    }
    return this.driver.session({ database })
  }
}
```

#### Graph Service
```typescript
// src/services/neo4j/graph.service.ts
export class GraphService {
  constructor(private connectionManager: Neo4jConnectionManager) {}

  async createFileNode(fileData: FileNode): Promise<void> {
    const session = this.connectionManager.getSession()
    
    try {
      await session.executeWrite(async tx => {
        await tx.run(`
          MERGE (f:File {path: $path})
          SET f.name = $name,
              f.content = $content,
              f.language = $language,
              f.size = $size,
              f.lastModified = $lastModified
        `, {
          path: fileData.path,
          name: fileData.name,
          content: fileData.content,
          language: fileData.language,
          size: fileData.size,
          lastModified: fileData.lastModified.toISOString()
        })
      })
    } finally {
      await session.close()
    }
  }

  async createDependency(
    fromPath: string, 
    toPath: string, 
    type: string
  ): Promise<void> {
    const session = this.connectionManager.getSession()
    
    try {
      await session.executeWrite(async tx => {
        await tx.run(`
          MATCH (from:File {path: $fromPath})
          MATCH (to:File {path: $toPath})
          MERGE (from)-[r:DEPENDS_ON {type: $type}]->(to)
          SET r.createdAt = datetime()
        `, {
          fromPath,
          toPath,
          type
        })
      })
    } finally {
      await session.close()
    }
  }

  async findFileDependencies(path: string): Promise<string[]> {
    const session = this.connectionManager.getSession()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (f:File {path: $path})-[:DEPENDS_ON]->(dep:File)
          RETURN dep.path as dependencyPath
        `, { path })
        
        return res.records.map(record => record.get('dependencyPath'))
      })
      
      return result
    } finally {
      await session.close()
    }
  }

  async searchFiles(query: string): Promise<FileNode[]> {
    const session = this.connectionManager.getSession()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          CALL db.index.fulltext.queryNodes("fileIndex", $query) YIELD node
          RETURN node
          LIMIT 20
        `, { query })
        
        return res.records.map(record => {
          const node = record.get('node')
          return {
            path: node.properties.path,
            name: node.properties.name,
            content: node.properties.content,
            language: node.properties.language,
            size: node.properties.size,
            lastModified: new Date(node.properties.lastModified)
          }
        })
      })
      
      return result
    } finally {
      await session.close()
    }
  }
}
```

---

## Пошаговое руководство

### Шаг 1: Настройка окружения

1. **Установка Neo4j**
   ```bash
   # Docker
   docker run -d \
     --name neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/password \
     neo4j:latest
   
   # Или используйте Neo4j Aura (облачный)
   # https://neo4j.com/cloud/aura/
   ```

2. **Создание индексов**
   ```cypher
   // В Neo4j Browser или Cypher Shell
   CREATE INDEX file_path IF NOT EXISTS FOR (f:File) ON (f.path);
   CREATE INDEX file_name IF NOT EXISTS FOR (f:File) ON (f.name);
   CREATE INDEX file_language IF NOT EXISTS FOR (f:File) ON (f.language);
   
   // Full-text search index
   CREATE FULLTEXT INDEX fileIndex IF NOT EXISTS FOR (f:File) ON EACH [f.name, f.content];
   ```

### Шаг 2: Интеграция в Code Index Service

```typescript
// src/services/code-index/neo4j-code-index.ts
import { GraphService } from '../neo4j/graph.service'
import { EventEmitter } from 'events'

export class Neo4jCodeIndex extends EventEmitter {
  private graphService: GraphService
  private watchedFiles: Set<string> = new Set()

  constructor(graphService: GraphService) {
    super()
    this.graphService = graphService
  }

  async indexFile(filePath: string, content: string): Promise<void> {
    const fileNode: FileNode = {
      path: filePath,
      name: filePath.split('/').pop() || '',
      content,
      language: this.detectLanguage(filePath),
      size: content.length,
      lastModified: new Date()
    }

    await this.graphService.createFileNode(fileNode)
    this.watchedFiles.add(filePath)
    
    // Анализ зависимостей
    const dependencies = this.extractDependencies(content, filePath)
    for (const dep of dependencies) {
      await this.graphService.createDependency(filePath, dep.path, dep.type)
    }
  }

  async updateFile(filePath: string, newContent: string): Promise<void> {
    // Удалить старые зависимости
    await this.removeOldDependencies(filePath)
    
    // Переиндексировать файл
    await this.indexFile(filePath, newContent)
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby'
    }
    return languageMap[ext || ''] || 'unknown'
  }

  private extractDependencies(content: string, filePath: string): Dependency[] {
    const dependencies: Dependency[] = []
    const language = this.detectLanguage(filePath)

    switch (language) {
      case 'javascript':
      case 'typescript':
        // Парсинг import/require statements
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        
        let match
        while ((match = importRegex.exec(content)) !== null) {
          dependencies.push({
            path: this.resolvePath(match[1], filePath),
            type: 'import'
          })
        }
        
        while ((match = requireRegex.exec(content)) !== null) {
          dependencies.push({
            path: this.resolvePath(match[1], filePath),
            type: 'import'
          })
        }
        break
        
      // Добавить парсеры для других языков
    }

    return dependencies
  }

  private resolvePath(importPath: string, currentFile: string): string {
    // Простая логика резолва путей
    // Можно расширить для поддержки alias'ов и node_modules
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(path.dirname(currentFile), importPath)
    }
    return importPath
  }
}
```

### Шаг 3: Интеграция в Context Management

```typescript
// src/core/context-management/neo4j-context-manager.ts
export class Neo4jContextManager {
  private graphService: GraphService

  async saveContext(taskId: string, context: TaskContext): Promise<void> {
    const session = this.graphService.getSession()
    
    try {
      await session.executeWrite(async tx => {
        // Создать или обновить узел задачи
        await tx.run(`
          MERGE (t:Task {id: $taskId})
          SET t.name = $name,
              t.description = $description,
              t.status = $status,
              t.updatedAt = datetime()
        `, {
          taskId,
          name: context.name,
          description: context.description,
          status: context.status
        })

        // Связать с файлами контекста
        for (const filePath of context.relatedFiles) {
          await tx.run(`
            MATCH (t:Task {id: $taskId})
            MATCH (f:File {path: $filePath})
            MERGE (t)-[:HAS_CONTEXT]->(f)
          `, { taskId, filePath })
        }

        // Связать с предыдущими задачами
        if (context.previousTaskId) {
          await tx.run(`
            MATCH (current:Task {id: $taskId})
            MATCH (previous:Task {id: $previousTaskId})
            MERGE (previous)-[:PRECEDES]->(current)
          `, { taskId, previousTaskId: context.previousTaskId })
        }
      })
    } finally {
      await session.close()
    }
  }

  async getRelatedContexts(taskId: string): Promise<TaskContext[]> {
    const session = this.graphService.getSession()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (t:Task {id: $taskId})-[:HAS_CONTEXT]->(f:File)
          MATCH (t)-[:PRECEDES*0..]->(related:Task)
          RETURN DISTINCT related
        `, { taskId })
        
        return res.records.map(record => {
          const task = record.get('related')
          return {
            id: task.properties.id,
            name: task.properties.name,
            description: task.properties.description,
            status: task.properties.status
          }
        })
      })
      
      return result
    } finally {
      await session.close()
    }
  }
}
```

---

## Тестирование

### Unit тесты

```typescript
// src/services/neo4j/__tests__/graph.service.test.ts
import { GraphService } from '../graph.service'

describe('GraphService', () => {
  let graphService: GraphService
  let connectionManager: Neo4jConnectionManager

  beforeAll(async () => {
    connectionManager = Neo4jConnectionManager.getInstance()
    await connectionManager.connect({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password'
    })
    graphService = new GraphService(connectionManager)
  })

  afterAll(async () => {
    await connectionManager.disconnect()
  })

  beforeEach(async () => {
    // Очистить тестовую базу
    const session = connectionManager.getSession()
    await session.run('MATCH (n) DETACH DELETE n')
    await session.close()
  })

  describe('createFileNode', () => {
    it('should create a file node', async () => {
      const fileData = {
        path: '/test/file.js',
        name: 'file.js',
        content: 'console.log("hello")',
        language: 'javascript',
        size: 20,
        lastModified: new Date()
      }

      await graphService.createFileNode(fileData)

      // Проверить, что файл создан
      const session = connectionManager.getSession()
      const result = await session.run(
        'MATCH (f:File {path: $path}) RETURN f',
        { path: '/test/file.js' }
      )
      await session.close()

      expect(result.records).toHaveLength(1)
      expect(result.records[0].get('f').properties.name).toBe('file.js')
    })
  })

  describe('createDependency', () => {
    it('should create relationship between files', async () => {
      // Создать тестовые файлы
      await graphService.createFileNode({
        path: '/test/index.js',
        name: 'index.js',
        content: 'import { helper } from "./helper"',
        language: 'javascript',
        size: 30,
        lastModified: new Date()
      })

      await graphService.createFileNode({
        path: '/test/helper.js',
        name: 'helper.js',
        content: 'export function helper() {}',
        language: 'javascript',
        size: 25,
        lastModified: new Date()
      })

      // Создать зависимость
      await graphService.createDependency(
        '/test/index.js',
        '/test/helper.js',
        'import'
      )

      // Проверить зависимость
      const dependencies = await graphService.findFileDependencies('/test/index.js')
      expect(dependencies).toContain('/test/helper.js')
    })
  })
})
```

### Интеграционные тесты

```typescript
// src/services/code-index/__tests__/neo4j-code-index.test.ts
describe('Neo4jCodeIndex Integration', () => {
  let codeIndex: Neo4jCodeIndex
  let graphService: GraphService

  beforeAll(async () => {
    // Инициализация сервисов
    const connectionManager = Neo4jConnectionManager.getInstance()
    await connectionManager.connect({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password'
    })
    
    graphService = new GraphService(connectionManager)
    codeIndex = new Neo4jCodeIndex(graphService)
  })

  it('should index JavaScript file with dependencies', async () => {
    const content = `
      import { utils } from './utils.js';
      import { config } from '../config.js';
      
      export function processData(data) {
        return utils.format(data);
      }
    `

    await codeIndex.indexFile('/test/main.js', content)

    // Проверить, что файл проиндексирован
    const files = await graphService.searchFiles('main.js')
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('/test/main.js')

    // Проверить зависимости
    const dependencies = await graphService.findFileDependencies('/test/main.js')
    expect(dependencies).toHaveLength(2)
    expect(dependencies).toContain('/test/utils.js')
    expect(dependencies).toContain('/config.js')
  })

  it('should update file and its dependencies', async () => {
    const initialContent = `import { old } from './old.js';`
    const updatedContent = `import { newModule } from './new.js';`

    await codeIndex.indexFile('/test/update.js', initialContent)
    await codeIndex.updateFile('/test/update.js', updatedContent)

    // Проверить, что старая зависимость удалена
    const dependencies = await graphService.findFileDependencies('/test/update.js')
    expect(dependencies).not.toContain('/test/old.js')
    expect(dependencies).toContain('/test/new.js')
  })
})
```

---

## Мониторинг и поддержка

### Метрики производительности

```typescript
// src/services/neo4j/metrics.ts
export class Neo4jMetrics {
  private metrics: {
    queryTime: number[]
    connectionPool: number
    errors: number
  } = {
    queryTime: [],
    connectionPool: 0,
    errors: 0
  }

  recordQueryTime(duration: number): void {
    this.metrics.queryTime.push(duration)
    
    // Сохранять только последние 1000 измерений
    if (this.metrics.queryTime.length > 1000) {
      this.metrics.queryTime.shift()
    }
  }

  recordError(): void {
    this.metrics.errors++
  }

  updateConnectionPool(size: number): void {
    this.metrics.connectionPool = size
  }

  getAverageQueryTime(): number {
    if (this.metrics.queryTime.length === 0) return 0
    const sum = this.metrics.queryTime.reduce((a, b) => a + b, 0)
    return sum / this.metrics.queryTime.length
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageQueryTime: this.getAverageQueryTime(),
      timestamp: new Date().toISOString()
    }
  }
}
```

### Логирование

```typescript
// src/services/neo4j/logger.ts
import { Logger } from '../../utils/logger'

export class Neo4jLogger {
  private logger = new Logger('Neo4jService')

  logQuery(cypher: string, params?: Record<string, any>): void {
    this.logger.debug('Executing Cypher query', {
      query: cypher,
      parameters: params ? Object.keys(params) : [],
      timestamp: new Date().toISOString()
    })
  }

  logError(error: Error, context: string): void {
    this.logger.error('Neo4j error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })
  }

  logConnection(status: 'connected' | 'disconnected' | 'error'): void {
    this.logger.info('Neo4j connection status changed', {
      status,
      timestamp: new Date().toISOString()
    })
  }
}
```

### Health Check

```typescript
// src/services/neo4j/health.ts
export class Neo4jHealthCheck {
  constructor(
    private connectionManager: Neo4jConnectionManager,
    private metrics: Neo4jMetrics
  ) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: Record<string, any>
  }> {
    try {
      const session = this.connectionManager.getSession()
      
      // Проверить базовое соединение
      const startTime = Date.now()
      await session.run('RETURN 1')
      const queryTime = Date.now() - startTime
      
      await session.close()
      
      // Анализ метрик
      const avgQueryTime = this.metrics.getAverageQueryTime()
      const errorRate = this.metrics.getMetrics().errors / 1000 // Примерная оценка
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (avgQueryTime > 1000 || errorRate > 0.1) {
        status = 'degraded'
      }
      
      if (avgQueryTime > 5000 || errorRate > 0.3) {
        status = 'unhealthy'
      }
      
      return {
        status,
        details: {
          queryTime,
          averageQueryTime: avgQueryTime,
          errorRate,
          connectionPool: this.metrics.getMetrics().connectionPool
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      }
    }
  }
}
```

---

## Дополнительные материалы

### Документация Neo4j
- [Neo4j JavaScript Driver Manual](https://neo4j.com/docs/javascript-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)

### Примеры использования
- [Neo4j VSCode Extension](https://marketplace.visualstudio.com/items?itemName=neo4j.neo4j-vscode-extension)
- [Graph Database Use Cases](https://neo4j.com/use-cases/)

### Поддержка
- [Neo4j Community Forum](https://community.neo4j.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/neo4j)
- [GitHub Issues](https://github.com/neo4j/neo4j-javascript-driver/issues)