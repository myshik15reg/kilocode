# Workflow: workspace-context-bootstrap

## Goal

Собрать свежий task-local снимок реального состояния репозитория и окружения перед планированием, реализацией или handoff, когда одного `Memory Bank` недостаточно.

Связанные документы: [`context-priming.md`](context-priming.md:1), [`research-retrieval.md`](research-retrieval.md:1), [`../patterns/orchestration/context-capsule.md`](../patterns/orchestration/context-capsule.md:1), [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1), [`../skills/detect-tech-stack/SKILL.md`](../skills/detect-tech-stack/SKILL.md:1).

## When to use

Используй workflow, когда:

1. `Memory Bank` пустой, устаревший или слишком общий для текущей задачи.
2. Решение зависит от реального состояния репозитория, CI, shell, runner, devcontainer или доступных инструментов.
3. Нужен компактный, свежий контекст для subagent/handoff.
4. Есть риск ложных допущений о стеке, entrypoints или verify path.

## Output

| Artifact                  | Location                                                 | Purpose                              |
| ------------------------- | -------------------------------------------------------- | ------------------------------------ |
| workspace context note    | `.protocols/<protocol>/artifacts/workspace-context.md`   | human-readable snapshot              |
| optional machine snapshot | `.protocols/<protocol>/artifacts/workspace-context.json` | structured automation-friendly facts |
| updated context capsule   | `.protocols/<protocol>/context-capsule.md`               | compact handoff                      |

## Required sections for `workspace-context.md`

1. repo identity and date/time of snapshot;
2. active task scope;
3. detected stack / key entrypoints;
4. relevant quality rails and verify commands;
5. constraints and assumptions;
6. gaps, stale docs or drift risks;
7. exact files or paths that matter for the task.

## Steps

|   # | Step                          | INPUT                          | OUTPUT                       | VERIFY                                       |
| --: | ----------------------------- | ------------------------------ | ---------------------------- | -------------------------------------------- |
|   1 | Scope the snapshot            | task + repo context            | bounded snapshot target      | snapshot has explicit purpose and boundaries |
|   2 | Collect only the needed facts | repo files / commands / skills | candidate facts              | facts are fresh and task-relevant            |
|   3 | Normalize and compress        | candidate facts                | `workspace-context.md`       | no raw dump, no duplicate noise              |
|   4 | Mark assumptions and gaps     | normalized facts               | assumptions + drift risks    | unsupported claims are explicit              |
|   5 | Derive handoff capsule        | workspace context + task goal  | updated `context-capsule.md` | capsule is self-contained                    |
|   6 | Decide promotion              | stable vs transient findings   | keep task-local or promote   | `Memory Bank` receives only long-lived facts |

## Guardrails

1. MUST NOT copy raw command output into `Memory Bank`.
2. MUST keep the initial snapshot task-local in `.protocols/.../artifacts/`.
3. SHOULD prefer `detect-tech-stack` or narrow targeted reads over total repository dumps.
4. MUST record freshness: when the snapshot was taken and what commands/files it relied on.
5. If the snapshot reveals durable project truth, promote only the concise conclusion, not the raw evidence.

## Minimal template

```markdown
# Workspace Context

## Snapshot

- Date: YYYY-MM-DD
- Task: ...
- Root: ...

## Fresh facts

- Stack / runtime:
- Entry points:
- Verify path:

## Constraints

- ...

## Assumptions

- ASSUMPTION: ...

## Drift risks

- ...

## Key files

- ...
```
