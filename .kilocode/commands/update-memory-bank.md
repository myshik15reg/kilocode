---
description: "Update Memory Bank after changes: curated policy + minimal checklist"
argument-hint: "(optional) what changed"
---

Goal: keep Memory Bank accurate after meaningful work.

Before writing, apply: [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1).
Язык и кодировка: обновления Memory Bank по умолчанию ведутся на русском, а файлы с кириллицей должны оставаться UTF-8 без BOM. См. [`../rules/language-and-encoding.md`](../rules/language-and-encoding.md:1).

## Minimum update

1. Update [`../memory-bank/context.md`](../memory-bank/context.md:1)
    - What changed (1-5 bullet points)
    - Risks / follow-ups
    - Next steps

## Update additional files only if impacted

- [`../memory-bank/architecture.md`](../memory-bank/architecture.md:1) — if architecture decisions changed
- [`../memory-bank/tech.md`](../memory-bank/tech.md:1) — if stack, tools, or process commands changed
- [`../memory-bank/product.md`](../memory-bank/product.md:1) — if UX, personas, or flows changed
- [`../memory-bank/brief.md`](../memory-bank/brief.md:1) — if project goals or constraints changed

## Do not write directly to Memory Bank if the material is

1. raw research notes;
2. task-local protocol log;
3. temporary heuristic;
4. unsourced claim;
5. duplicated existing MB content.

Rule: update Memory Bank before closing a protocol, but only when long-lived context actually changed.
