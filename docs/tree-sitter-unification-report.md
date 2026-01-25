# Отчет об обновлении унификации Tree-sitter

**Дата:** 2026-01-24  
**Версия:** 2.0.0

## Кратко

Архитектура Tree-sitter и Neo4j-графа унифицирована для всех языков:
- удалены 1С-специфичные имена и классы в графовом экстракторе
- введен единый `TreeSitterGraphExtractor`
- нормализация языков перенесена в общий слой `languageParser`

## Основные изменения

### 1. Унифицированный графовый экстрактор
- Новый класс `TreeSitterGraphExtractor` для всех языков
- Использует общий ParserManager и общий набор query
- Создает `file` entities и `defines` relationships для базовых определений
- `calls` relationships строятся только если query содержит `call` captures

**Файл:** `src/services/neo4j/extractors/tree-sitter-graph-extractor.ts`

### 2. Общая нормализация языков
- `resolveLanguageConfig` и `normalizeLanguageId` добавлены в `languageParser`
- единый источник правды для расширений и languageId

**Файл:** `src/services/tree-sitter/languageParser.ts`

### 3. RelationshipExtractor без 1С-специфики
- использует `getGraphQueryForLanguage`
- кэширует экстракторы по languageId

**Файл:** `src/services/neo4j/relationship-extractor.ts`

### 4. Унификация Neo4j индексации
- `CodeIndexOrchestrator` индексирует все поддерживаемые языки единообразно
- удалены специальные ветки для `.bsl`

**Файл:** `src/services/code-index/orchestrator.ts`

## Переименования

- `tree-sitter-1c/` → `tree-sitter-grammars/`
- `onec-extractor.ts` → `tree-sitter-graph-extractor.ts`
- тесты экстрактора переименованы и обновлены

## Тесты

Обновлены или переписаны:
- `src/services/neo4j/extractors/__tests__/tree-sitter-graph-extractor.spec.ts`
- `src/services/neo4j/__tests__/relationship-extractor.spec.ts`
- `src/services/tree-sitter/__tests__/languageParser.spec.ts`
- `src/services/tree-sitter/__tests__/integration.spec.ts`
- `src/services/code-index/__tests__/orchestrator.spec.ts`

## Итог

Графовая кодовая база теперь опирается на единую Tree-sitter инфраструктуру и поддерживает все языки, для которых есть query. 1С остается поддерживаемым языком, но без 1С-специфичных названий и классов в общем API.
