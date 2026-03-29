# Workflow: project-setup (инициализация consuming project)

## Goal

Подготовить consuming project к применению AlfaFlowAI workflow-pack: создать структуру, заполнить Memory Bank, создать первый протокол.

Нормативная переносимость: [`docs-standards.md`](../rules/docs-standards.md:1).
SoT по скриптам и путям: [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

## When to use

| Situation | Use this workflow |
|---|---|
| First time in a project | yes |
| Embed pack into repo | yes |
| Global install already done | yes |

## Steps

| # | Step | INPUT | OUTPUT | VERIFY |
|---:|---|---|---|---|
| 1 | Choose integration model | project context | `Embedded` or `Global` | решение фиксируется в `.kilocode/memory-bank/context.md` |
| 2 | Scaffold structure | selected model | `.kilocode/`, `.protocols/`, `temp/` exist | entrypoints resolve by inspection |
| 3 | Fill Memory Bank placeholders | answers | Memory Bank has no `<PLACEHOLDER>` for basics | agent can read and confirm `[MB: OK]` |
| 4 | Create first protocol | requirement | `.protocols/YYYY-MM-DD-name/` | brief/plan exist and are non-empty |
| 5 | (Optional) Add quality gates templates | chosen policy | `./.github/` + `./scripts/` in consuming project | workflow points to existing scripts |

## Notes (portable defaults)

1. Integration options are defined in [`integration-guide.md`](../rules/integration-guide.md:1).
2. Protocol creation workflow: [`protocol-new.md`](protocol-new.md:1).
3. Quality gates enforcement workflow: [`quality-enforcement.md`](quality-enforcement.md:1).

## References

| Topic | Link |
|---|---|
| Concepts | [`concepts.md`](../rules/concepts.md:1) |
| Memory Bank rules | [`memory-bank-instructions.md`](../rules/memory-bank-instructions.md:1) |
| Global install | [`global-install.md`](global-install.md:1) |
