# Execution Log

- 2026-01-24: Создан протокол задачи, начата фаза анализа.
- 2026-01-24: Завершён анализ: выявлены 1С-специфичные экстракторы (OneCExtractor), неунифицированные ID сущностей, и отдельный каталог tree-sitter-1c без WASM. Принято решение унифицировать графовый экстрактор через tree-sitter queries, перейти на единый формат ID (type:filePath:name) и убрать 1С-специфичные имена.
- 2026-01-24: Принята модель унифицированного графа: единый TreeSitterGraphExtractor поверх существующих queries (использует base queries для всех языков и full для onec), file->defines relationships как базовый граф, optional calls из captures с call.*. Нормализация языка до tree-sitter languageId (tsx/typescript/onec и т.д.), новые нейтральные имена файлов/папок.
- 2026-01-24: Реализовано: TreeSitterGraphExtractor, обновлены RelationshipExtractor и CodeIndexOrchestrator, унифицированы тесты и документация, tree-sitter-grammars README/WASM docs приведены к нейтральному naming (tree-sitter-onec.wasm, tree-sitter-onec package).
- 2026-01-24: Обновлён план, добавлен docs/kilocode-1c-improvements.md в список изменяемых файлов.
- 2026-01-24: Попытка запуска точечных тестов (pnpm --filter kilo-code test ...). Pretest упал: turbo не найден в PATH (turbo not recognized); требуется установка/настройка окружения.
- 2026-01-24: Приведён раздел интеграции 1С в docs/kilocode-1c-improvements.md к актуальной архитектуре (RelationshipExtractor + TreeSitterGraphExtractor, актуальные тесты).
- 2026-01-24: Повторная попытка тестов через `pnpm --filter kilo-code exec vitest run ...` завершилась ошибкой загрузки vitest.config.ts: отсутствует optional dependency `@rollup/rollup-win32-x64-msvc` (требуется пересборка/установка зависимостей).
- 2026-01-24: Обновлён protocol-new.md для указания активного протокола унификации графовой кодовой базы.
