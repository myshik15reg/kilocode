# Workflow: protocol-new (create protocol)

## Goal

Создать протокол как временный workspace для `task`, чтобы требования, шаги, решения и артефакты были трассируемыми и переносимыми.

Термины: [`terminology.md`](../rules/terminology.md:1).
Правила планирования: [`planning.md`](../rules-architect/planning.md:1).
Хранилище артефактов: [`artifacts-and-storage.md`](../rules/artifacts-and-storage.md:1).
Гейты качества: [`quality-gates.md`](../rules/quality-gates.md:1).

Язык и кодировка: новые `brief.md`, `plan.md` и `execution.md` MUST быть на русском и в UTF-8 без BOM. См. [`../rules/language-and-encoding.md`](../rules/language-and-encoding.md:1).

## Precondition: design readiness

Before writing `brief.md`, check whether the design is already collapsed enough for protocol planning.

Run [`brainstorm-design.md`](brainstorm-design.md:1) first when at least one of these is true:

1. the request is ambiguous;
2. there are multiple viable approaches to compare;
3. success criteria are unclear;
4. a large initiative needs decomposition before protocol planning.

Use `protocol-new.md` directly when the task is already specific enough to write scoped requirements and a concrete plan.

## Decide protocol depth first

| Classification   | When to use                                                                                         | Required depth                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Trivial          | Все условия из [`task-classification.md`](../rules/task-classification.md:1) выполнены одновременно | `brief.md` короткий, `plan.md` из 1 шага, `execution.md` optional         |
| Non-trivial      | Любое условие trivial нарушено                                                                      | Полный `brief.md`, `plan.md` с основными шагами, `execution.md` optional  |
| Long / delegated | Multi-domain, multi-step, нужен handoff                                                             | Полный `brief.md`, `plan.md` с шагами и AGENT, `execution.md` recommended |

Правило: protocol обязателен во всех трёх случаях; меняется только глубина.

## Output

| Path                                                 | Purpose                                    |
| ---------------------------------------------------- | ------------------------------------------ |
| `.protocols/YYYY-MM-DD-name/brief.md`                | цель, DoD, AC, constraints                 |
| `.protocols/YYYY-MM-DD-name/plan.md`                 | пошаговый план (INPUT/OUTPUT/VERIFY/AGENT) |
| `.protocols/YYYY-MM-DD-name/execution.md` (optional) | лог выполнения и решения                   |
| `.protocols/YYYY-MM-DD-name/artifacts/`              | промежуточные артефакты                    |

## Steps

|   # | Step                               | INPUT                                   | OUTPUT                                               | VERIFY                                                                                                                                                                       |
| --: | ---------------------------------- | --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Check design readiness             | user request + repo context             | direct protocol path or `brainstorm-design` decision | ambiguity is resolved before planning                                                                                                                                        |
|   2 | Classify task                      | user request + repo context             | task class + protocol name (slug)                    | классификация совпадает с [`task-classification.md`](../rules/task-classification.md:1), slug соответствует naming rules в [`planning.md`](../rules-architect/planning.md:1) |
|   3 | Create protocol folder             | protocol name                           | `.protocols/YYYY-MM-DD-name/` scaffold               | все файлы из Output созданы                                                                                                                                                  |
|   4 | Write `brief.md` at selected depth | requirements + constraints + task class | `brief.md` filled                                    | trivial: короткая цель/DoD/constraints; non-trivial: полная структура из [`planning.md`](../rules-architect/planning.md:1)                                                   |
|   5 | Write `plan.md` at selected depth  | brief.md + task class                   | `plan.md` filled                                     | trivial: 1 шаг; non-trivial: каждый шаг имеет INPUT/OUTPUT/VERIFY/AGENT                                                                                                      |
|   6 | Decide delegation only if needed   | plan.md + chosen mode                   | handoff message (if needed)                          | формат соответствует SoT [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1)                                                                              |

## Minimal depth for trivial task

```text
# Plan: <Task name>

## Steps

### Step 1: Apply local change
INPUT: exact file + exact request
OUTPUT: updated file
VERIFY: targeted check or docs self-check
AGENT: narrowest relevant mode
```

## Notes

1. Протокол MUST использоваться для любых repo changes. Source: [`AGENTS.md`](../../AGENTS.md:1).
2. Trivial task MUST NOT эскалироваться в полный план без причины; safe default — минимальная глубина по [`task-classification.md`](../rules/task-classification.md:1).
3. Any approved design summary produced by [`brainstorm-design.md`](brainstorm-design.md:1) SHOULD be copied into `brief.md` or protocol artifacts before implementation planning.
4. Любые результаты, которые должны пережить `task`, MUST быть перенесены из протокола в стабильные пути (`.kilocode/evidence/`, `.kilocode/sources/`) до удаления протокола. Source: [`artifacts-and-storage.md`](../rules/artifacts-and-storage.md:1).
5. Удаление протокола MAY выполняться только после явного подтверждения пользователя. Source: [`safety.md`](../rules/safety.md:1).

6. Если пользователь явно не просил другой рабочий язык, `brief.md`, `plan.md` и `execution.md` MUST быть на русском; code/paths/slugs/official names MAY оставаться англоязычными. Source: [`../rules/language-and-encoding.md`](../rules/language-and-encoding.md:1).

## Script scaffolding (conditional)

Если доступен `workflowai-new-protocol.ps1`, его пути и условия MUST следовать SoT: [`scripts-entrypoints.md`](scripts-entrypoints.md:1).
