---
rule_id: finding-format
title: Формат finding
scope: output
priority: critical
tags: [output, findings, line-context]
---

# Формат finding

Каждый finding должен содержать поля:

1. `file`
2. `beforeLineNumber`
3. `beforeLineText`
4. `line`
5. `lineText`
6. `afterLineNumber`
7. `afterLineText`
8. `severity`
9. `category`
10. `title`
11. `description`
12. `suggestion`
13. `standard_ref`
14. `rule_id`
15. `confidence`
16. `evidence_refs`
17. `certainty_note`

## Семантика полей

1. `line` - основная проблемная строка.
2. `beforeLine*` и `afterLine*` - по одной строке соседнего контекста, если она доступна.
3. Если соседние строки недоступны, использовать `0` и пустой текст.
4. `title` должен быть коротким и быстро читаемым; лучше диагностическая формулировка, а не пересказ всего описания.
5. `evidence_refs` должен быть массивом ссылок на правила, anchors, архитектурные материалы, tool diagnostics или конфигурационные ключи.
6. `certainty_note` объясняет неполный контекст, спорный источник, chunk-ограничение или остаточную неопределённость; если finding хорошо подтверждён, строка должна быть пустой.

## Качество finding

1. Нельзя заполнять схему формально: finding без реального evidence считается дефектом ревью.
2. Если доказан один сильный root cause, не дублировать его несколькими слабыми косметическими findings.
3. Если точная строка не локализуется из доступного контекста, это должно быть явно отражено в `certainty_note`.
4. `confidence` должен отражать силу evidence, а не уверенность модели в себе.

## Контракт совместимости

1. Человеко-читаемые описания могут быть на русском языке.
2. Технические ключи finding не переводятся.
3. Значения `severity`, `category`, `confidence` сохраняются в стабильном машинном виде, потому что на них может завязываться downstream-обработка.

## Mapping для внешних анализаторов

1. Базовый finding-контракт должен оставаться тем же, даже если источник - внешний статический анализатор, например `bsl-language-server`.
2. Нельзя заменять line-aware поля одним blob-полем вида `CodeText`.
3. Если finding основан на диагностике `bsl-language-server`, предпочтителен формат:
    1. `rule_id`: `bsl-language-server:<DiagnosticCode>`
    2. `title`: человекочитаемое имя диагностики
    3. `standard_ref`: привязка к `v8std` или локальному регламенту
    4. `evidence_refs`: сначала ссылки на локальный pack, затем конфигурационные и task-specific evidence

## Допустимые значения

### `category`

1. `standards_violation`
2. `logical_consistency`
3. `solution_mismatch`
4. `architecture`
5. `performance`
6. `security`
7. `documentation`
8. `duplicate`
9. `bug`
10. `risk`

### `severity`

1. `critical` - вероятный баг, регрессия или release blocker.
2. `warning` - заметная проблема качества или риска.
3. `info` - неблокирующее улучшение или дополнительная проверка.

### `confidence`

1. `high`
2. `medium`
3. `low`
