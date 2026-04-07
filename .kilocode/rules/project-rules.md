# Project Rules (thin core)

Назначение: дать стабильный минимальный коридор ссылок на источники истины (SoT). Требования к документам: [`docs-standards.md`](docs-standards.md:1).

## Core entrypoints

1. Агент MUST начинать с [`AGENTS.md`](../../AGENTS.md:1).
2. Агент MUST прочитать [`QUICK.md`](../QUICK.md:1) как Level 0.
3. Для контекста проекта агент MUST читать Memory Bank: [`memory-bank/index.md`](../memory-bank/index.md:1).

## Canonical SoT

| Topic          | SoT                                                                    |
| -------------- | ---------------------------------------------------------------------- |
| Terminology    | [`terminology.md`](terminology.md:1)                                   |
| Evidence rules | [`evidence-rules.md`](evidence-rules.md:1)                             |
| Handoff        | [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1) |
| Mode selection | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)       |
| Quality gates  | [`quality-gates/SKILL.md`](../skills/quality-gates/SKILL.md:1)         |

## Processes

1. Любая `task`, которая изменяет репозиторий, MUST иметь протокол в `.protocols/YYYY-MM-DD-name/`. Канонический процесс: [`protocol-new.md`](../workflows/protocol-new.md:1).
2. Orchestration multi-step MUST выполняться по [`agent-orchestration.md`](../workflows/agent-orchestration.md:1) и с handoff по SoT [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
3. Пути скриптов MUST описываться только через SoT [`scripts-entrypoints.md`](../workflows/scripts-entrypoints.md:1).
