# Tree-sitter унификация

## Обзор

Документ описывает единую архитектуру Tree-sitter для семантического поиска и Neo4j-графа. Графовый экстрактор теперь общий для всех языков и использует те же query, что и семантический поиск.

## Компоненты

### TreeSitterParserManager

Централизованный менеджер для загрузки и кэширования парсеров.

```typescript
import { getParserManager } from "./services/tree-sitter"

const manager = getParserManager()
const tree = await manager.parse("typescript", code)
```

### BaseExtractor

Базовый класс для Tree-sitter экстракторов с общей инициализацией и утилитами.

```typescript
import { BaseExtractor } from "./services/tree-sitter"

class CustomExtractor extends BaseExtractor {
	constructor() {
		super("typescript")
	}
}
```

### TreeSitterGraphExtractor

Унифицированный экстрактор графа, который:

- парсит код через TreeSitterParserManager
- применяет query на AST
- формирует entities + relationships для Neo4j

```typescript
import { TreeSitterGraphExtractor } from "./services/neo4j/extractors/tree-sitter-graph-extractor"
import { getGraphQueryForLanguage } from "./services/tree-sitter/languageParser"

const languageId = "typescript"
const query = getGraphQueryForLanguage(languageId)
const extractor = new TreeSitterGraphExtractor(languageId, query ?? "")
await extractor.initialize()
const result = await extractor.extract(code, "file.ts")
```

## Queries

Для всех языков используется единый набор query в `src/services/tree-sitter/queries`.

- **Definition queries** используются семантическим поиском.
- **Graph queries** используют тот же набор captures и дополняются, если нужно.

Для `onec` графовый запрос берется из `onecQueries.full` (base + graph), для остальных языков — базовый query.

## Грамматика 1С и WASM

- Исходники грамматики: [`tree-sitter-grammars/`](../tree-sitter-grammars/README.md)
- Бинарь для `web-tree-sitter`: `tree-sitter-onec.wasm`
- По умолчанию [`TreeSitterParserManager`](../src/services/tree-sitter/parser-manager.ts) загружает WASM по имени `tree-sitter-<languageId>.wasm` (например, `tree-sitter-onec.wasm`). При необходимости путь можно передать в `initialize(wasmPath)`.
- Ожидаемое размещение в пакете расширения (`src/`): `src/dist/tree-sitter-onec.wasm` (рядом с другими `tree-sitter-*.wasm`).

## Извлекаемые сущности и связи

### Entities

Экстрактор создает:

- `file`
- `function` (включая method/constructor/async)
- `class`
- `interface`
- `module` / `namespace`
- `type` / `enum` / `struct`
- `variable` / `const` / `property`

### Relationships

- `defines` — файл определяет сущность
- `calls` — вызовы функций (если query содержит call captures)

## Нормализация языков

Примеры нормализации:

- `bsl`, `os`, `1c` → `onec`
- `js`, `jsx`, `json` → `javascript`
- `ejs`, `erb` → `embedded_template`

## Ключевые файлы

```
src/services/tree-sitter/
├── parser-manager.ts
├── base-extractor.ts
├── languageParser.ts
└── queries/
    └── onec.ts

src/services/neo4j/
├── relationship-extractor.ts
└── extractors/
    └── tree-sitter-graph-extractor.ts

tree-sitter-grammars/
```

## Тесты

- `src/services/neo4j/extractors/__tests__/tree-sitter-graph-extractor.spec.ts`
- `src/services/neo4j/__tests__/relationship-extractor.spec.ts`
- `src/services/tree-sitter/__tests__/languageParser.spec.ts`
- `src/services/tree-sitter/__tests__/integration.spec.ts`
- `src/services/code-index/__tests__/orchestrator.spec.ts`

## Совместимость

- Публичный API `languageParser` сохранен.
- `ILanguageExtractor` по-прежнему требует только `extract`.
- Графовые сущности теперь унифицированы для всех языков.

## Итог

Tree-sitter и Neo4j используют общую инфраструктуру: один ParserManager, единые query и универсальный графовый экстрактор. Это позволяет расширять поддержку языков без 1С-специфичных классов и имен.
