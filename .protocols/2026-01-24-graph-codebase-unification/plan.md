# План

## Шаги
- [x] Фаза 1: Анализ текущей реализации, выявление точек привязки к 1С, список файлов/переименований.
- [x] Фаза 2: Проектирование унифицированной модели и API для графовой кодовой базы.
- [x] Фаза 3: Реализация изменений и переименований, обновление зависимостей/импортов.
- [x] Фаза 4: Обновление документации, тестов, проверка качества.

## Проверка фаз
- [x] Ручная проверка фазы 1 (список файлов и проблем составлен)
- [x] Ручная проверка фазы 2 (модель и API согласованы)
- [ ] Ручная проверка фазы 3 (сборка/запуск без регрессий)
- [ ] Ручная проверка фазы 4 (доки и тесты обновлены)

## Файлы к изменению
- src/services/neo4j/relationship-extractor.ts
- src/services/neo4j/relationship-indexer.ts
- src/services/neo4j/extractors/tree-sitter-graph-extractor.ts
- src/services/neo4j/extractors/__tests__/tree-sitter-graph-extractor.spec.ts (rename/update)
- src/services/neo4j/__tests__/relationship-extractor.spec.ts
- src/services/tree-sitter/languageParser.ts
- src/services/tree-sitter/queries/onec.ts (if needed for unified graph queries)
- src/services/tree-sitter/__tests__/integration.spec.ts
- src/services/tree-sitter/__tests__/languageParser.spec.ts
- src/services/code-index/orchestrator.ts
- src/services/code-index/__tests__/orchestrator.spec.ts
- docs/tree-sitter-unification.md
- docs/tree-sitter-unification-report.md
- docs/tree-sitter-migration-guide.md
- docs/kilocode-1c-improvements.md
- docs/graph-integration-summary.md
- protocol-new.md
- docs/tree-sitter-onec-grammar-spec.md
- tree-sitter-grammars/README.md
- tree-sitter-grammars/docs/WASM_COMPILATION.md
- tree-sitter-grammars/package.json
- tree-sitter-grammars/grammar.js
- tree-sitter-grammars/ (rename)

## Матрица покрытия требований
| Требование | Задачи |
|---|---|
| R1 | T001 |
| R2 | T002 |
| R3 | T003 |
| R4 | T004 |
| R5 | T005 |

## Список задач
- [x] T001 Анализ кода Neo4j и 1С-специфики (поиск + чтение файлов)
- [x] T002 Проект унифицированной модели графа и API
- [x] T003 Переименование каталогов/файлов/идентификаторов
- [x] T004 Интеграция/удаление лишних частей (tree-sitter семантика)
- [x] T005 Обновление документации и тестов
