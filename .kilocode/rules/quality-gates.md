# Quality Gates (источник требований качества)

> Этот файл — короткая обёртка для стабильных ссылок в документации.
> **Source of truth:** skill `/quality-gates` (см. `.kilocode/skills/quality-gates/SKILL.md`).

## Коротко (нельзя нарушать)

- **Coverage:** 100% (lines/branches/functions).
- **Lint:** 0 ошибок и 0 предупреждений; отключать правила нельзя.
- **TDD:** Red → Green → Refactor.
- Исключения — только через процесс waiver (см. `../workflows/waiver-workflow.md`).

## См. также

- [`quality-gates-core.md`](quality-gates-core.md) — краткое резюме, загружается всегда.
- [`../workflows/quality-enforcement.md`](../workflows/quality-enforcement.md) — как включить enforcement в CI/PR.
