# Внедрение Neo4j в механизм codebase Kilocode

## Анализ текущей архитектуры

### Текущий механизм codebase в Kilocode

На основе анализа структуры проекта, механизм codebase в Kilocode включает:

1. **Tree-sitter Parser** (`/src/services/tree-sitter`)
   - Парсинг исходного кода различных языков
   - Извлечение структуры кода (функции, классы, импорты)
   - Поддержка множества языков программирования

2. **Code Index Service** (`/src/services/code-index`)
   - Индексация файлов и их содержимого
   - Поиск по коду
   - Управление индексом кода

3. **Search Service** (`/src/services/search`)
   - Полнотекстовый поиск
   - Поиск по паттернам
   - Фильтрация результатов

### Проблемы текущего подхода

- Линейная структура индексирования
- Ограниченные возможности анализа зависимостей
- Сложности с поиском связанного кода
- Отсутствие графового представления отношений

---

## Архитектура внедрения Neo4j

### Целевая структура

```
┌─────────────────────────────────────────────────────────────┐
│                    Kilocode Extension                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Tree-sitter │  │  Code Index  │  │   Search     │     │
│  │   Parser     │  │   Service    │  │  Service     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                   │            │
│  ┌──────▼──────────────────▼──────────────────▼──────┐    │
│  │              Neo4j Service Layer                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │Connection│  │  Graph   │  │  Models  │       │    │
│  │  │Manager   │  │ Service  │  │          │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └────────────────────────┬───────────────────────────┘    │
└───────────────────────────┼────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Neo4j DB     │
                    │ (Aura/Local)   │
                    │  ┌──────────┐  │
                    │  │  Graph   │  │
                    │  │ Storage  │  │
                    │  └──────────┘  │
                    └────────────────┘
```

### Основные компоненты

#### 1. Neo4j Codebase Manager
```typescript
// src/services/neo4j/neo4j-codebase-manager.ts

import { Driver, Session } from 'neo4j-driver'
import { EventEmitter } from 'events'

export interface CodeFile {
  path: string
  name: string
  content: string
  language: string
  size: number
  lastModified: Date
  ast?: any
}

export interface CodeSymbol {
  name: string
  type: 'function' | 'class' | 'interface' | 'variable' | 'import'
  filePath: string
  line: number
  column: number
  signature?: string
  documentation?: string
}

export interface Dependency {
  fromPath: string
  toPath: string
  type: 'import' | 'call' | 'inherit' | 'implement' | 'reference'
  line: number
  strength: number
}

export class Neo4jCodebaseManager extends EventEmitter {
  private driver: Driver
  private session: Session | null = null
  
  constructor(
    private uri: string,
    private username: string,
    private password: string
  ) {
    super()
  }

  async connect(): Promise<void> {
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    )
    
    await this.driver.verifyConnectivity()
    this.emit('connected')
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close()
    }
    await this.driver.close()
    this.emit('disconnected')
  }

  // Индексация файла
  async indexFile(file: CodeFile): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        // Создать или обновить файл
        await tx.run(`
          MERGE (f:File {path: $path})
          SET f.name = $name,
              f.content = $content,
              f.language = $language,
              f.size = $size,
              f.lastModified = $lastModified,
              f.updatedAt = datetime()
          RETURN f
        `, {
          path: file.path,
          name: file.name,
          content: file.content,
          language: file.language,
          size: file.size,
          lastModified: file.lastModified.toISOString()
        })

        // Создать индекс для полнотекстового поиска
        await tx.run(`
          CALL db.index.fulltext.queryNodes("fileContent", $query) YIELD node
          RETURN node
        `, { query: file.name })
      })

      this.emit('fileIndexed', file.path)
    } finally {
      await session.close()
    }
  }

  // Индексация символов (функций, классов)
  async indexSymbols(symbols: CodeSymbol[]): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        for (const symbol of symbols) {
          // Создать символ
          await tx.run(`
            MERGE (s:Symbol {name: $name, filePath: $filePath})
            SET s.type = $type,
                s.line = $line,
                s.column = $column,
                s.signature = $signature,
                s.documentation = $documentation
          `, {
            name: symbol.name,
            filePath: symbol.filePath,
            type: symbol.type,
            line: symbol.line,
            column: symbol.column,
            signature: symbol.signature,
            documentation: symbol.documentation
          })

          // Связать с файлом
          await tx.run(`
            MATCH (f:File {path: $filePath})
            MATCH (s:Symbol {name: $symbolName, filePath: $filePath})
            MERGE (f)-[:CONTAINS]->(s)
          `, {
            filePath: symbol.filePath,
            symbolName: symbol.name
          })
        }
      })

      this.emit('symbolsIndexed', symbols.length)
    } finally {
      await session.close()
    }
  }

  // Создание зависимостей
  async createDependencies(dependencies: Dependency[]): Promise<void> {
    const session = this.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        for (const dep of dependencies) {
          await tx.run(`
            MATCH (from:File {path: $fromPath})
            MATCH (to:File {path: $toPath})
            MERGE (from)-[r:DEPENDS_ON {type: $type}]->(to)
            SET r.line = $line,
                r.strength = $strength,
                r.createdAt = datetime()
          `, {
            fromPath: dep.fromPath,
            toPath: dep.toPath,
            type: dep.type,
            line: dep.line,
            strength: dep.strength
          })
        }
      })

      this.emit('dependenciesCreated', dependencies.length)
    } finally {
      await session.close()
    }
  }

  // Поиск файлов по содержимому
  async searchFiles(query: string, limit: number = 20): Promise<CodeFile[]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          CALL db.index.fulltext.queryNodes("fileContent", $query) YIELD node, score
          RETURN node, score
          ORDER BY score DESC
          LIMIT $limit
        `, { query, limit })

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

  // Поиск зависимостей файла
  async getFileDependencies(path: string): Promise<string[]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (f:File {path: $path})-[:DEPENDS_ON]->(dep:File)
          RETURN dep.path as dependencyPath
          ORDER BY dep.path
        `, { path })

        return res.records.map(record => record.get('dependencyPath'))
      })

      return result
    } finally {
      await session.close()
    }
  }

  // Поиск файлов, которые зависят от данного
  async getFileDependents(path: string): Promise<string[]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH (f:File)-[:DEPENDS_ON]->(dep:File {path: $path})
          RETURN f.path as dependentPath
          ORDER BY f.path
        `, { path })

        return res.records.map(record => record.get('dependentPath'))
      })

      return result
    } finally {
      await session.close()
    }
  }

  // Поиск символов по имени
  async findSymbols(name: string, type?: string): Promise<CodeSymbol[]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const query = type 
          ? 'MATCH (s:Symbol) WHERE s.name CONTAINS $name AND s.type = $type RETURN s'
          : 'MATCH (s:Symbol) WHERE s.name CONTAINS $name RETURN s'
        
        const res = await tx.run(query, { name, type })

        return res.records.map(record => {
          const node = record.get('s')
          return {
            name: node.properties.name,
            type: node.properties.type,
            filePath: node.properties.filePath,
            line: node.properties.line,
            column: node.properties.column,
            signature: node.properties.signature,
            documentation: node.properties.documentation
          }
        })
      })

      return result
    } finally {
      await session.close()
    }
  }

  // Анализ цепочки зависимостей
  async getDependencyChain(fromPath: string, toPath: string): Promise<string[][]> {
    const session = this.driver.session()
    
    try {
      const result = await session.executeRead(async tx => {
        const res = await tx.run(`
          MATCH path = (from:File {path: $fromPath})-[:DEPENDS_ON*]->(to:File {path: $toPath})
          RETURN [node in nodes(path) | node.path] as chain
        `, { fromPath, toPath })

        return res.records.map(record => record.get('chain'))
      })

      return result
    } finally {
      await session.close()
    }
  }

  // Обновление индекса при изменении файла
  async updateFileIndex(filePath: string): Promise<void> {
    // Этот метод будет вызываться при изменении файлов
    // Реализация зависит от системы отслеживания изменений
    this.emit('fileUpdated', filePath)
  }

  // Полная переиндексация codebase
  async reindexCodebase(rootPath: string): Promise<void> {
    // Этот метод будет рекурсивно проходить по всем файлам
    // и индексировать их в Neo4j
    const files = await this.getAllFiles(rootPath)
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const file: CodeFile = {
          path: filePath,
          name: path.basename(filePath),
          content,
          language: this.detectLanguage(filePath),
          size: content.length,
          lastModified: new Date()
        }
        
        await this.indexFile(file)
        
        // Извлечь и индексировать символы
        const symbols = await this.extractSymbols(filePath, content)
        await this.indexSymbols(symbols)
        
        // Извлечь и создать зависимости
        const dependencies = await this.extractDependencies(filePath, content)
        await this.createDependencies(dependencies)
        
      } catch (error) {
        this.emit('indexingError', { filePath, error })
      }
    }
    
    this.emit('reindexingComplete', files.length)
  }

  private async getAllFiles(rootPath: string): Promise<string[]> {
    // Рекурсивный обход директорий для поиска файлов кода
    const supportedExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb']
    const files: string[] = []
    
    const walkDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          // Пропустить node_modules, .git и другие служебные директории
          if (!['node_modules', '.git', '.vscode', 'dist', 'build'].includes(entry.name)) {
            await walkDir(fullPath)
          }
        } else if (supportedExtensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath)
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

  private async extractSymbols(filePath: string, content: string): Promise<CodeSymbol[]> {
    // Использовать tree-sitter для извлечения символов
    // Это упрощенная версия - в реальности нужно использовать AST
    const symbols: CodeSymbol[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Поиск функций
      const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
      if (functionMatch) {
        symbols.push({
          name: functionMatch[1],
          type: 'function',
          filePath,
          line: index + 1,
          column: line.indexOf(functionMatch[1]) + 1
        })
      }
      
      // Поиск классов
      const classMatch = line.match(/(?:export\s+)?(?:default\s+)?class\s+(\w+)/)
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          filePath,
          line: index + 1,
          column: line.indexOf(classMatch[1]) + 1
        })
      }
      
      // Поиск интерфейсов
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          type: 'interface',
          filePath,
          line: index + 1,
          column: line.indexOf(interfaceMatch[1]) + 1
        })
      }
    })
    
    return symbols
  }

  private async extractDependencies(filePath: string, content: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = []
    const language = this.detectLanguage(filePath)
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.extractJavaScriptDependencies(filePath, content)
      case 'python':
        return this.extractPythonDependencies(filePath, content)
      case 'java':
        return this.extractJavaDependencies(filePath, content)
      default:
        return []
    }
  }

  private extractJavaScriptDependencies(filePath: string, content: string): Dependency[] {
    const dependencies: Dependency[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // import statements
      const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        dependencies.push({
          fromPath: filePath,
          toPath: this.resolveImportPath(importMatch[1], filePath),
          type: 'import',
          line: index + 1,
          strength: 1.0
        })
      }
      
      // require statements
      const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/)
      if (requireMatch) {
        dependencies.push({
          fromPath: filePath,
          toPath: this.resolveImportPath(requireMatch[1], filePath),
          type: 'import',
          line: index + 1,
          strength: 1.0
        })
      }
      
      // Dynamic imports
      const dynamicImportMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)
      if (dynamicImportMatch) {
        dependencies.push({
          fromPath: filePath,
          toPath: this.resolveImportPath(dynamicImportMatch[1], filePath),
          type: 'import',
          line: index + 1,
          strength: 0.8
        })
      }
    })
    
    return dependencies
  }

  private extractPythonDependencies(filePath: string, content: string): Dependency[] {
    const dependencies: Dependency[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // import statements
      const importMatch = line.match(/^(?:from|import)\s+([\w.]+)/)
      if (importMatch) {
        dependencies.push({
          fromPath: filePath,
          toPath: importMatch[1],
          type: 'import',
          line: index + 1,
          strength: 1.0
        })
      }
    })
    
    return dependencies
  }

  private extractJavaDependencies(filePath: string, content: string): Dependency[] {
    const dependencies: Dependency[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // import statements
      const importMatch = line.match(/import\s+([\w.]+);/)
      if (importMatch) {
        dependencies.push({
          fromPath: filePath,
          toPath: importMatch[1],
          type: 'import',
          line: index + 1,
          strength: 1.0
        })
      }
    })
    
    return dependencies
  }

  private resolveImportPath(importPath: string, currentFile: string): string {
    // Простая логика резолва путей
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(path.dirname(currentFile), importPath)
    }
    
    if (importPath.startsWith('@/')) {
      // Handle webpack aliases
      return importPath.replace('@', process.cwd())
    }
    
    // Для модулей node_modules возвращаем как есть
    return importPath
  }
}
```

#### 2. Интеграция с Tree-sitter Parser

```typescript
// src/services/tree-sitter/neo4j-tree-sitter-integration.ts

import { Neo4jCodebaseManager } from '../neo4j/neo4j-codebase-manager'
import Parser from 'tree-sitter'

export class Neo4jTreeSitterIntegration {
  constructor(
    private codeManager: Neo4jCodebaseManager,
    private parser: Parser
  ) {}

  async parseAndIndexFile(filePath: string, content: string): Promise<void> {
    try {
      // Парсинг с помощью tree-sitter
      const tree = this.parser.parse(content)
      
      // Извлечение символов из AST
      const symbols = this.extractSymbolsFromAST(tree.rootNode, filePath)
      await this.codeManager.indexSymbols(symbols)
      
      // Извлечение зависимостей из AST
      const dependencies = this.extractDependenciesFromAST(tree.rootNode, filePath)
      await this.codeManager.createDependencies(dependencies)
      
      // Обновить индекс файла
      const codeFile: CodeFile = {
        path: filePath,
        name: path.basename(filePath),
        content,
        language: this.codeManager.detectLanguage(filePath),
        size: content.length,
        lastModified: new Date(),
        ast: tree.rootNode.toString()
      }
      
      await this.codeManager.indexFile(codeFile)
      
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error)
      throw error
    }
  }

  private extractSymbolsFromAST(node: Parser.SyntaxNode, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = []
    
    // Рекурсивный обход AST
    const walkTree = (node: Parser.SyntaxNode) => {
      switch (node.type) {
        case 'function_declaration':
        case 'method_definition':
          symbols.push(this.extractFunctionSymbol(node, filePath))
          break
          
        case 'class_declaration':
        case 'interface_declaration':
          symbols.push(this.extractClassSymbol(node, filePath))
          break
          
        case 'import_statement':
        case 'import_declaration':
          // Игнорируем import'ы как символы, они будут обработаны как зависимости
          break
          
        default:
          // Продолжаем обход для других типов узлов
          node.children.forEach(walkTree)
      }
    }
    
    walkTree(node)
    return symbols
  }

  private extractFunctionSymbol(node: Parser.SyntaxNode, filePath: string): CodeSymbol {
    const nameNode = node.childForFieldName('name')
    const parametersNode = node.childForFieldName('parameters')
    
    return {
      name: nameNode?.text || 'anonymous',
      type: 'function',
      filePath,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      signature: `${nameNode?.text || 'anonymous'}${parametersNode?.text || '()'}`
    }
  }

  private extractClassSymbol(node: Parser.SyntaxNode, filePath: string): CodeSymbol {
    const nameNode = node.childForFieldName('name')
    
    return {
      name: nameNode?.text || 'anonymous',
      type: node.type === 'class_declaration' ? 'class' : 'interface',
      filePath,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1
    }
  }

  private extractDependenciesFromAST(node: Parser.SyntaxNode, filePath: string): Dependency[] {
    const dependencies: Dependency[] = []
    
    const walkTree = (node: Parser.SyntaxNode) => {
      if (node.type === 'import_statement' || node.type === 'import_declaration') {
        const dep = this.extractImportDependency(node, filePath)
        if (dep) dependencies.push(dep)
      }
      
      // Продолжаем обход
      node.children.forEach(walkTree)
    }
    
    walkTree(node)
    return dependencies
  }

  private extractImportDependency(node: Parser.SyntaxNode, filePath: string): Dependency | null {
    // Найти строку с import
    const sourceNode = node.childForFieldName('source')
    if (!sourceNode) return null
    
    const importPath = sourceNode.text.replace(/['"]/g, '')
    
    return {
      fromPath: filePath,
      toPath: this.codeManager.resolveImportPath(importPath, filePath),
      type: 'import',
      line: node.startPosition.row + 1,
      strength: 1.0
    }
  }
}
```

#### 3. Code Index Service с Neo4j

```typescript
// src/services/code-index/neo4j-code-index-service.ts

import { Neo4jCodebaseManager } from '../neo4j/neo4j-codebase-manager'
import { Neo4jTreeSitterIntegration } from '../tree-sitter/neo4j-tree-sitter-integration'

export class Neo4jCodeIndexService {
  private isIndexing = false
  private indexedFiles = new Set<string>()
  
  constructor(
    private codeManager: Neo4jCodebaseManager,
    private treeSitter: Neo4jTreeSitterIntegration
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.codeManager.on('fileIndexed', (filePath: string) => {
      this.indexedFiles.add(filePath)
      console.log(`File indexed: ${filePath}`)
    })

    this.codeManager.on('indexingError', (data: { filePath: string, error: Error }) => {
      console.error(`Indexing error for ${data.filePath}:`, data.error)
    })

    this.codeManager.on('reindexingComplete', (count: number) => {
      console.log(`Reindexing complete: ${count} files processed`)
    })
  }

  async initialize(workspaceRoot: string): Promise<void> {
    console.log('Initializing Neo4j Code Index Service...')
    
    // Подключиться к Neo4j
    await this.codeManager.connect()
    
    // Создать необходимые индексы
    await this.createIndexes()
    
    // Проверить, нужна ли полная переиндексация
    const hasExistingIndex = await this.checkExistingIndex()
    
    if (!hasExistingIndex) {
      console.log('No existing index found. Starting full reindex...')
      await this.reindexWorkspace(workspaceRoot)
    } else {
      console.log('Existing index found. Checking for changes...')
      await this.updateChangedFiles(workspaceRoot)
    }
    
    console.log('Neo4j Code Index Service initialized')
  }

  async searchFiles(query: string, options?: {
    language?: string
    limit?: number
    includeDependencies?: boolean
  }): Promise<{
    files: CodeFile[]
    dependencies?: string[][]
  }> {
    const files = await this.codeManager.searchFiles(query, options?.limit || 20)
    
    let dependencies: string[][] = []
    if (options?.includeDependencies) {
      for (const file of files) {
        const deps = await this.codeManager.getFileDependencies(file.path)
        if (deps.length > 0) {
          dependencies.push(deps)
        }
      }
    }
    
    return { files, dependencies }
  }

  async findSymbolReferences(symbolName: string): Promise<{
    symbol: CodeSymbol
    references: string[]
  }[]> {
    const symbols = await this.codeManager.findSymbols(symbolName)
    const results = []
    
    for (const symbol of symbols) {
      // Найти файлы, которые зависят от файла с символом
      const references = await this.codeManager.getFileDependents(symbol.filePath)
      
      results.push({
        symbol,
        references
      })
    }
    
    return results
  }

  async getCodeContext(filePath: string): Promise<{
    file: CodeFile
    dependencies: string[]
    dependents: string[]
    symbols: CodeSymbol[]
  }> {
    const [file, dependencies, dependents, symbols] = await Promise.all([
      this.getFileByPath(filePath),
      this.codeManager.getFileDependencies(filePath),
      this.codeManager.getFileDependents(filePath),
      this.codeManager.findSymbols('', undefined)
    ])
    
    // Отфильтровать символы по файлу
    const fileSymbols = symbols.filter(s => s.filePath === filePath)
    
    return {
      file: file!,
      dependencies,
      dependents,
      symbols: fileSymbols
    }
  }

  async getImpactAnalysis(filePath: string): Promise<{
    directImpact: string[]
    transitiveImpact: string[]
    symbolUsage: Record<string, string[]>
  }> {
    const directImpact = await this.codeManager.getFileDependents(filePath)
    const transitiveImpact = new Set<string>()
    
    // Найти транзитивные зависимости
    for (const dependent of directImpact) {
      const deps = await this.codeManager.getFileDependents(dependent)
      deps.forEach(dep => transitiveImpact.add(dep))
    }
    
    // Анализ использования символов
    const symbols = await this.codeManager.findSymbols('', undefined)
    const fileSymbols = symbols.filter(s => s.filePath === filePath)
    const symbolUsage: Record<string, string[]> = {}
    
    for (const symbol of fileSymbols) {
      const references = await this.findSymbolReferences(symbol.name)
      symbolUsage[symbol.name] = references.flatMap(r => r.references)
    }
    
    return {
      directImpact,
      transitiveImpact: Array.from(transitiveImpact),
      symbolUsage
    }
  }

  private async createIndexes(): Promise<void> {
    const session = this.codeManager.driver.session()
    
    try {
      await session.executeWrite(async tx => {
        // Индексы для файлов
        await tx.run('CREATE INDEX file_path IF NOT EXISTS FOR (f:File) ON (f.path)')
        await tx.run('CREATE INDEX file_name IF NOT EXISTS FOR (f:File) ON (f.name)')
        await tx.run('CREATE INDEX file_language IF NOT EXISTS FOR (f:File) ON (f.language)')
        
        // Индексы для символов
        await tx.run('CREATE INDEX symbol_name IF NOT EXISTS FOR (s:Symbol) ON (s.name)')
        await tx.run('CREATE INDEX symbol_type IF NOT EXISTS FOR (s:Symbol) ON (s.type)')
        await tx.run('CREATE INDEX symbol_file IF NOT EXISTS FOR (s:Symbol) ON (s.filePath)')
        
        // Полнотекстовый индекс
        await tx.run(`
          CREATE FULLTEXT INDEX fileContent IF NOT EXISTS 
          FOR (f:File) ON EACH [f.name, f.content]
        `)
      })
    } finally {
      await session.close()
    }
  }

  private async checkExistingIndex(): Promise<boolean> {
    try {
      const result = await this.codeManager.searchFiles('*', 1)
      return result.length > 0
    } catch {
      return false
    }
  }

  private async reindexWorkspace(workspaceRoot: string): Promise<void> {
    if (this.isIndexing) {
      console.log('Indexing already in progress...')
      return
    }
    
    this.isIndexing = true
    
    try {
      await this.codeManager.reindexCodebase(workspaceRoot)
    } finally {
      this.isIndexing = false
    }
  }

  private async updateChangedFiles(workspaceRoot: string): Promise<void> {
    // Простая логика обновления измененных файлов
    // В реальности нужно использовать file watcher
    const changedFiles = await this.getChangedFiles(workspaceRoot)
    
    for (const filePath of changedFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        await this.treeSitter.parseAndIndexFile(filePath, content)
      } catch (error) {
        console.error(`Error updating file ${filePath}:`, error)
      }
    }
  }

  private async getChangedFiles(workspaceRoot: string): Promise<string[]> {
    // Место для логики определения измененных файлов
    // Можно использовать git diff, file watchers, или timestamps
    return []
  }

  private async getFileByPath(path: string): Promise<CodeFile | null> {
    const files = await this.codeManager.searchFiles(path, 1)
    return files.find(f => f.path === path) || null
  }
}
```

---

## Установка и настройка

### 1. Установка Neo4j

```bash
# Docker
 docker run -d \
   --name neo4j \
   -p 7474:7474 -p 7687:7687 \
   -e NEO4J_AUTH=neo4j/password \
   neo4j:latest

# Или используйте Neo4j Aura (рекомендуется для production)
# https://neo4j.com/cloud/aura/
```

### 2. Установка зависимостей

```bash
 pnpm add neo4j-driver
 pnpm add -D @types/neo4j-driver
```

### 3. Настройка конфигурации

```typescript
// src/config/neo4j.config.ts

export const neo4jConfig = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'kilocode'
}
```

### 4. Инициализация в расширении

```typescript
// src/extension.ts

import { Neo4jCodebaseManager } from './services/neo4j/neo4j-codebase-manager'
import { Neo4jCodeIndexService } from './services/code-index/neo4j-code-index-service'
import { Neo4jTreeSitterIntegration } from './services/tree-sitter/neo4j-tree-sitter-integration'

export async function activate(context: vscode.ExtensionContext) {
  // ... существующий код
  
  // Инициализация Neo4j
  const codeManager = new Neo4jCodebaseManager(
    neo4jConfig.uri,
    neo4jConfig.username,
    neo4jConfig.password
  )
  
  const treeSitter = new Neo4jTreeSitterIntegration(codeManager, parser)
  const codeIndexService = new Neo4jCodeIndexService(codeManager, treeSitter)
  
  // Инициализировать при открытии workspace
  if (vscode.workspace.workspaceFolders) {
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath
    await codeIndexService.initialize(workspaceRoot)
  }
  
  // Регистрация команд
  context.subscriptions.push(
    vscode.commands.registerCommand('kilocode.searchCode', async () => {
      const query = await vscode.window.showInputBox({ prompt: 'Enter search query' })
      if (query) {
        const results = await codeIndexService.searchFiles(query, {
          includeDependencies: true
        })
        // Показать результаты
      }
    }),
    
    vscode.commands.registerCommand('kilocode.showCodeContext', async (fileUri) => {
      const context = await codeIndexService.getCodeContext(fileUri.fsPath)
      // Показать контекст в UI
    }),
    
    vscode.commands.registerCommand('kilocode.analyzeImpact', async (fileUri) => {
      const analysis = await codeIndexService.getImpactAnalysis(fileUri.fsPath)
      // Показать анализ в UI
    })
  )
  
  // File watchers для автоматического обновления индекса
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,ts,py,java,cpp,c,go,rs,php,rb}')
  
  watcher.onDidChange(async (uri) => {
    const content = await vscode.workspace.fs.readFile(uri)
    await treeSitter.parseAndIndexFile(uri.fsPath, content.toString())
  })
  
  watcher.onDidCreate(async (uri) => {
    const content = await vscode.workspace.fs.readFile(uri)
    await treeSitter.parseAndIndexFile(uri.fsPath, content.toString())
  })
  
  watcher.onDidDelete(async (uri) => {
    // Удалить файл из индекса
    await codeManager.deleteFile(uri.fsPath)
  })
  
  context.subscriptions.push(watcher)
}
```

---

## Использование

### Поиск кода

```typescript
// Поиск файлов с учетом зависимостей
const results = await codeIndexService.searchFiles('UserService', {
  language: 'typescript',
  includeDependencies: true,
  limit: 20
})

console.log('Found files:', results.files)
console.log('Dependencies:', results.dependencies)
```

### Анализ зависимостей

```typescript
// Получить все зависимости файла
const dependencies = await codeManager.getFileDependencies('/src/services/user.ts')

// Получить файлы, которые зависят от данного
const dependents = await codeManager.getFileDependents('/src/services/user.ts')

// Получить цепочку зависимостей
const chain = await codeManager.getDependencyChain('/src/index.ts', '/src/services/user.ts')
```

### Анализ влияния изменений

```typescript
// Анализ влияния изменения файла
const impact = await codeIndexService.getImpactAnalysis('/src/services/user.ts')

console.log('Direct impact:', impact.directImpact)
console.log('Transitive impact:', impact.transitiveImpact)
console.log('Symbol usage:', impact.symbolUsage)
```

### Поиск символов

```typescript
// Поиск функций/классов
const functions = await codeManager.findSymbols('getUser', 'function')
const classes = await codeManager.findSymbols('User', 'class')

// Найти все использования символа
const references = await codeIndexService.findSymbolReferences('getUser')
```

---

## Производительность и масштабируемость

### Оптимизации

1. **Пакетная обработка**: Используйте UNWIND для массовых операций
2. **Индексирование**: Создайте соответствующие индексы для частых запросов
3. **Кэширование**: Добавьте кэш для часто запрашиваемых данных
4. **Асинхронная обработка**: Используйте очереди для индексации

### Мониторинг

```typescript
// src/services/neo4j/metrics.ts

export class Neo4jMetrics {
  private metrics = {
    queryCount: 0,
    averageQueryTime: 0,
    connectionPoolSize: 0,
    errors: 0
  }

  recordQuery(duration: number): void {
    this.metrics.queryCount++
    // Обновить среднее время запроса
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + duration) / 
      this.metrics.queryCount
  }

  recordError(): void {
    this.metrics.errors++
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    }
  }
}
```

---

## Заключение

Внедрение Neo4j в механизм codebase Kilocode предоставляет:

### Преимущества
- **Графовое представление** кода и зависимостей
- **Улучшенный поиск** с учетом связей
- **Анализ влияния** изменений
- **Визуализация** структуры кода

### Возможности
- Поиск по связям между файлами
- Анализ цепочек зависимостей
- Определение последствий рефакторинга
- Построение графа вызовов функций

### Следующие шаги
1. Утверждение архитектуры с командой
2. Разработка Proof of Concept
3. Интеграционное тестирование
4. Постепенный rollout
5. Мониторинг и оптимизация