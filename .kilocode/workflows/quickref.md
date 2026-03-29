# Quick Reference (menu)

Назначение: быстрый выбор процесса, режима и гейтов качества. Этот файл MUST оставаться коротким и операционным. Нормативная рамка документации: [`docs-standards.md`](../rules/docs-standards.md:1).

## Minimal task start

1. Контекст: прочитай [`memory-bank/index.md`](../memory-bank/index.md:1) и затем [`context.md`](../memory-bank/context.md:1), подтверди `[MB: OK]`.
2. Если меняется репозиторий, MUST создать протокол: [`protocol-new.md`](protocol-new.md:1).
3. Выбор режима MUST следовать SoT: [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1).
4. Делегирование MUST следовать SoT: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
5. Закрытие протокола MUST следовать: [`protocol-review-merge.md`](protocol-review-merge.md:1).

## Mode selection (80/20)

| Situation                             | Mode                                                | Source                                                           |
| ------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Планирование, протокол, docs-only     | `architect`                                         | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Multi-step coordination, декомпозиция | `orchestrator`                                      | [`agent-routing.md`](../rules/agent-routing.md:1)                |
| Реализация                            | narrowest `*-dev/*-specialist`, иначе `code`        | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Bug: причина неизвестна               | `debug`                                             | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Bug: причина известна, нужен фикс     | `code-fixer` или specialist dev                     | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Тестирование                          | `unit-tester` / `integration-tester` / `e2e-tester` | [`testing-rules.md`](../rules/testing-rules.md:1)                |
| Code review                           | `reviewer`                                          | [`roles.md`](../rules/roles.md:1)                                |
| 1C:Enterprise                         | `1c-orchestrator` (entry point)                     | [`REGISTRY.md`](../modes/REGISTRY.md:268)                        |

## Workflow menu

| Need                                          | Run                         |
| --------------------------------------------- | --------------------------- |
| FAST PATH: быстрая правка / микро‑рефакторинг | `/quick-fix.md`             |
| Новый протокол                                | `/protocol-new.md`          |
| Продолжить протокол                           | `/protocol-resume.md`       |
| Ревью, merge, закрытие                        | `/protocol-review-merge.md` |
| Инцидент / hotfix                             | `/hotfix-emergency.md`      |
| Recovery (после ошибок процесса/гейтов)       | `/failure-recovery.md`      |
| Quality gates enforcement (CI/PR templates)   | `/quality-enforcement.md`   |
| Подключить pack к проекту                     | `/project-setup.md`         |
| Глобальная установка pack                     | `/global-install.md`        |
| Оркестрация multi-agent                       | `/agent-orchestration.md`   |

## Quality gates (non-negotiable)

| Gate       | Requirement                     | Source                                            |
| ---------- | ------------------------------- | ------------------------------------------------- |
| Coverage   | 100% (lines/branches/functions) | [`quality-gates.md`](../rules/quality-gates.md:1) |
| Lint       | 0 errors, 0 warnings            | [`quality-gates.md`](../rules/quality-gates.md:1) |
| TDD        | Red -> Green -> Refactor        | [`testing-rules.md`](../rules/testing-rules.md:1) |
| Exceptions | only via waiver                 | [`waiver-workflow.md`](waiver-workflow.md:1)      |

## Script entrypoints (portable paths)

Любые утверждения про `workflowai-*.ps1` MUST следовать SoT: [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

## Minimal command snippets (examples)

```text
git status
git diff
git diff --cached
git commit -m "type(scope): subject"
```

## References

| Topic        | Link                                                          |
| ------------ | ------------------------------------------------------------- |
| Entry points | [`AGENTS.md`](../../AGENTS.md:1), [`QUICK.md`](../QUICK.md:1) |
| Rules index  | [`rules/index.md`](../rules/index.md:1)                       |
| System map   | [`system-map.md`](../system-map.md:1)                         |
