# Task Classification (trivial vs non-trivial)

Назначение: единая, исполнимая классификация глубины протокола.

Источник принципа: [`AGENTS.md`](../../AGENTS.md:1).

## Trivial definition

Тривиальная правка допустима только если одновременно выполнены все условия.

| Condition | Trivial requires |
|---|---|
| Files changed | 1 file |
| Size | ≤ 10 lines |
| Behavior/API | no change |
| Dependencies/CI/scripts/migrations | no changes |

## Examples

| Change | Classification | Why |
|---|---|---|
| Исправить опечатку в README | trivial | 1 file, no behavior |
| Переименовать публичную функцию | non-trivial | API change |
| Правка в 3 файлах | non-trivial | multi-file |

