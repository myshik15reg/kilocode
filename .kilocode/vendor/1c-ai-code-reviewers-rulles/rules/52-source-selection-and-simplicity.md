---
rule_id: source-selection-and-simplicity
title: Выбор SoT и простота решения
scope: architecture
priority: high
tags: [architecture, source-selection, simplicity, reuse, maintainability]
---

# Выбор SoT и простота решения

## Архитектурный принцип

1. Если в задаче уже есть утверждённый источник истины: модуль, контракт, shared mechanism, exchange flow, payload builder или другой approved path, новое решение должно опираться на него.
2. Если diff или сопутствующий evidence показывают обход approved mechanism, extension point, shared module, payload builder, exchange flow или API contract, это должно подниматься как structural finding.
3. Если reviewer видит новую инфраструктуру там, где можно было расширить существующую, нужно отдельно оценивать, является ли это оправданным усложнением или лишним drift.
4. Если change выглядит простым локально, но вносит параллельный путь записи, построения пакета, маршрутизации или расчёта, это тоже architectural smell.
5. Structural finding должен опираться на task context, diff, architecture evidence, reuse evidence или Qdrant lookup; если evidence неполный, статус должен оставаться `unknown`, а не маскироваться категоричностью.

## Типовые findings

1. Создан новый путь поверх уже существующего или утверждённого решения, хотя approved source of truth уже существует.
2. Введён лишний helper, transport wrapper, очередь, пакет или HTTP path там, где уже есть существующий расширяемый механизм.
3. Реализация уходит из approved module/layer и создаёт новый уровень связности без достаточного обоснования.
4. Небольшой локальный diff фактически дублирует или обходит существующий flow и потому увеличивает стоимость сопровождения.
5. Упрощённый с виду change скрывает structural problem, хотя явной runtime-ошибки пока не видно.

## Severity

1. `solution_mismatch` или `architecture` - когда решение конфликтует с утверждённым подходом, даже если дефект ещё не проявился.
2. `duplicate` - когда новая логика повторяет уже существующий approved reuse path.
3. `risk` - когда формируется drift risk или избыточная поддержка, но прямой runtime defect ещё не доказан.
4. `warning` использовать по умолчанию; `critical` только если structural choice ломает approved architecture, source of truth или создаёт высокий риск регрессии.
