# Tree-sitter Migration Guide

Руководство по миграции на унифицированную архитектуру Tree-sitter в Kilocode.

## Обзор изменений

Унифицированная архитектура обеспечивает:

- Централизованное управление парсерами через [`TreeSitterParserManager`](../src/services/tree-sitter/parser-manager.ts)
- Единообразное извлечение данных через базовые классы
- Согласованность между семантическим поиском и Neo4j графом
- Оптимизированное кэширование

## Для разработчиков экстракторов

### До миграции

```typescript
import Parser from 'web-tree-sitter'

class MyExtractor {
	private parser: Parser | null = null

	async initialize(wasmPath: string) {
		await Parser.init()
		this.parser = new Parser()
		const Language = await Parser.Language.load(wasmPath)
		this.parser.setLanguage(Language)
	}

	extract(code: string) {
		const tree = this.parser!.parse(code)
		// Императивный обход AST
		this.traverseNode(tree.rootNode)
	}
}
```

### После миграции

```typescript
import { BaseExtractor } from '../tree-sitter/base-extractor'
import { getGraphQueryForLanguage } from '../tree-sitter/languageParser'

class MyExtractor extends BaseExtractor {
	constructor() {
		super('mylanguage')
	}

	async initialize(wasmPath?: string) {
		await super.initialize(wasmPath)
	}

	async extract(code: string, filePath: string) {
		this.checkInitialized()
		const tree = await this.parseCode(code)
		const query = getGraphQueryForLanguage('mylanguage') ?? ''
		const captures = this.executeQuery(tree, query)
		return this.processCaptures(captures)
	}
}
```

### Преимущества

✅ Меньше boilerplate кода  
✅ Автоматическое кэширование  
✅ Согласованность с другими компонентами  
✅ Query-based extraction вместо императивного обхода

## Для разработчиков queries

### Структура queries

Создайте два уровня queries:

1. **Base Query** - для семантического поиска:

```typescript
export const mylanguageBaseQuery = `
; Базовые определения для навигации и поиска
(function_definition
  name: (identifier) @name.definition.function) @definition.function
`
```

2. **Graph Query** - для Neo4j графа:

```typescript
export const mylanguageGraphQuery = `
; Расширенные конструкции для relationships
(function_definition
  name: (identifier) @function.name
  parameters: (parameter_list
    (parameter) @parameter)*) @function.declaration

(call_expression
  function: (identifier) @call.function) @call
`
```

3. **Экспорт**:

```typescript
export const mylanguageQueries = {
	base: mylanguageBaseQuery,
	graph: mylanguageGraphQuery,
	full: mylanguageBaseQuery + '\n' + mylanguageGraphQuery,
}

export default mylanguageBaseQuery
```

## Добавление нового языка

### Шаг 1: Добавить WASM файл

Поместите `tree-sitter-mylanguage.wasm` в соответствующую директорию.

### Шаг 2: Создать queries

Создайте [`src/services/tree-sitter/queries/mylanguage.ts`](../src/services/tree-sitter/queries/mylanguage.ts) с двухуровневыми queries.

### Шаг 3: Обновить languageParser

В [`languageParser.ts`](../src/services/tree-sitter/languageParser.ts) добавьте маппинг расширений:

```typescript
const EXTENSION_LANGUAGE_MAP = {
	myext: { languageId: 'mylanguage', parserKey: 'myext', query: mylanguageQuery },
	// ...
}
```

### Шаг 4: Использовать TreeSitterGraphExtractor (опционально)

Если нужен Neo4j граф, используйте общий экстрактор:

```typescript
import { TreeSitterGraphExtractor } from '../neo4j/extractors/tree-sitter-graph-extractor'
import { getGraphQueryForLanguage } from '../tree-sitter/languageParser'

const extractor = new TreeSitterGraphExtractor(
	'mylanguage',
	getGraphQueryForLanguage('mylanguage') ?? '',
)
await extractor.initialize()
```

### Шаг 5: Обновить экспорты

В [`src/services/tree-sitter/index.ts`](../src/services/tree-sitter/index.ts):

```typescript
export { mylanguageQueries } from './queries/mylanguage'
```

## Тестирование

### Unit-тесты для queries

```typescript
describe('mylanguage queries', () => {
	it('should extract functions', async () => {
		const manager = getParserManager()
		const parser = await manager.getParser('mylanguage')
		const tree = parser.parse(code)
		const captures = executeQuery(tree, mylanguageQueries.base)

		expect(captures).toContainEqual(expect.objectContaining({ name: 'definition.function' }))
	})
})
```

### Интеграционные тесты

```typescript
describe('mylanguage integration', () => {
	it('should share parsers between components', async () => {
		// Imports omitted for brevity:
		// TreeSitterGraphExtractor, getGraphQueryForLanguage
		const searchParser = await loadRequiredLanguageParsers(['test.myext'])
		const extractor = new TreeSitterGraphExtractor(
			'mylanguage',
			getGraphQueryForLanguage('mylanguage') ?? '',
		)
		await extractor.initialize()

		const manager = getParserManager()
		const directParser = await manager.getParser('mylanguage')

		expect(searchParser.myext.parser).toBe(directParser)
	})
})
```

## Best Practices

1. **Всегда используйте TreeSitterParserManager**

   - Не создавайте Parser напрямую
   - Доверьтесь централизованному кэшированию

2. **Предпочитайте queries императивному обходу**

   - Queries более декларативны
   - Легче поддерживать
   - Можно переиспользовать

3. **Наследуйтесь от BaseExtractor**

   - Получаете инициализацию бесплатно
   - Унифицированный API
   - Автоматическая валидация

4. **Создавайте двухуровневые queries**
   - Base для поиска
   - Graph для relationships
   - Избегайте дублирования

## Troubleshooting

### Проблема: Parser не кэшируется

**Решение:** Убедитесь, что используете один и тот же `languageId` и `wasmPath`:

```typescript
// ❌ Плохо - разные пути
await manager.getParser('onec', '/path1/tree-sitter-onec.wasm')
await manager.getParser('onec', '/path2/tree-sitter-onec.wasm')

// ✅ Хорошо - один путь
const wasmPath = path.join(__dirname, 'tree-sitter-onec.wasm')
await manager.getParser('onec', wasmPath)
await manager.getParser('onec', wasmPath) // Вернёт кэшированный
```

### Проблема: Разные результаты в поиске и графе

**Решение:** Убедитесь, что используете общие base queries:

```typescript
// queries/mylanguage.ts
export const mylanguageBaseQuery = `...` // Общая база
export const mylanguageGraphQuery = mylanguageBaseQuery + '\n' + `...` // Расширение для графа
```

### Проблема: Extractor not initialized

**Решение:** Вызовите `initialize()` перед использованием:

```typescript
const extractor = new MyExtractor()
await extractor.initialize(wasmPath) // ← Не забудьте!
const result = await extractor.extract(code, filePath)
```

## Примеры

### Пример 1: Простой экстрактор

```typescript
import { BaseExtractor } from '../tree-sitter/base-extractor'

export class SimpleExtractor extends BaseExtractor {
	constructor() {
		super('javascript')
	}

	async extract(code: string, filePath: string) {
		this.checkInitialized()
		const tree = await this.parseCode(code)

		// Простое извлечение без queries
		const functions = tree.rootNode.descendantsOfType('function_declaration')
		return functions.map((f) => ({
			name: f.childForFieldName('name')?.text,
			line: f.startPosition.row + 1,
		}))
	}
}
```

### Пример 2: Query-based экстрактор

```typescript
import { BaseExtractor } from '../tree-sitter/base-extractor'
import { getGraphQueryForLanguage } from '../tree-sitter/languageParser'

export class JavaScriptExtractor extends BaseExtractor {
	constructor() {
		super('javascript')
	}

	async extract(code: string, filePath: string) {
		this.checkInitialized()
		const tree = await this.parseCode(code)
		const query = getGraphQueryForLanguage('javascript') ?? ''
		const captures = this.executeQuery(tree, query)

		const entities = []
		const relationships = []

		for (const capture of captures) {
			if (capture.name === 'function.declaration') {
				entities.push({
					type: 'function',
					name: capture.node.text,
					line: capture.node.startPosition.row + 1,
				})
			}
		}

		return { entities, relationships }
	}
}
```

### Пример 3: Интеграция с существующим кодом

```typescript
// До миграции
async function oldParse(code: string) {
	await Parser.init()
	const parser = new Parser()
	const language = await Parser.Language.load('tree-sitter-python.wasm')
	parser.setLanguage(language)
	return parser.parse(code)
}

// После миграции
async function newParse(code: string) {
	const manager = getParserManager()
	return await manager.parse('python', code, 'tree-sitter-python.wasm')
}
```

## См. также

- [Tree-sitter Unification Documentation](./tree-sitter-unification.md)
- [ParserManager API](../src/services/tree-sitter/parser-manager.ts)
- [BaseExtractor API](../src/services/tree-sitter/base-extractor.ts)
- [Integration Tests](../src/services/tree-sitter/__tests__/integration.spec.ts)
