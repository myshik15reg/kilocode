# Agent Templates (reference-only)

Назначение: дать компактные референсы для ролей субагентов без импорта внешней оркестрации и без создания второй Source of Truth.

## Status

Этот каталог содержит только reference-level guidance. Канонические правила делегации остаются в:

1. [`context-handoff.md`](../../patterns/orchestration/context-handoff.md:1)
2. [`agents-guide/SKILL.md`](../../skills/agents-guide/SKILL.md:1)
3. [`orchestrator-guide/SKILL.md`](../../skills/orchestrator-guide/SKILL.md:1)
4. [`agent-orchestration.md`](../../workflows/agent-orchestration.md:1)

## Recommended role set

| Role               | Use for                                       | Write access |
| ------------------ | --------------------------------------------- | ------------ |
| `code-reviewer`    | review findings, regressions, maintainability | no           |
| `security-auditor` | secrets, auth, data flow, dependency risk     | no           |
| `debugger`         | root-cause analysis for bugs                  | limited      |
| `test-architect`   | test plan, gaps, regression coverage          | limited      |
| `docs-writer`      | docs updates after implementation stabilises  | limited      |
| `release-manager`  | release checklist and rollout sanity          | limited      |

## Rules for use

1. Treat role names as examples, not executable agent definitions.
2. Create concrete handoffs from current SoT instead of copying external agent files.
3. Read-only roles SHOULD run before writing roles.
4. If one role depends on another role's output, schedule them sequentially.

## Creation pattern

Каждый новый subagent template SHOULD specify:

1. purpose and stop condition;
2. allowed files or area of ownership;
3. expected output artifact;
4. verification step;
5. handoff contract back to orchestrator.
