# Workflow: session-checkpoint

## Goal

Сохранить явное состояние длинной задачи перед compaction, сменой сессии, handoff или `protocol-resume`, чтобы следующий агент не восстанавливал execution state по догадкам.

Связанные документы: [`protocol-resume.md`](protocol-resume.md:1), [`planner-executor.md`](planner-executor.md:1), [`beads-task-tracking.md`](beads-task-tracking.md:1), [`../patterns/orchestration/context-capsule.md`](../patterns/orchestration/context-capsule.md:1), [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1).

## When to use

Используй workflow, когда:

1. задача растягивается на несколько сессий;
2. есть риск compaction или потери tool-state;
3. есть handoff между режимами или агентами;
4. задача tool-heavy и имеет несколько зависимых шагов;
5. текущий `execution.md` уже не даёт быстрого ответа на вопрос «что делать следующим».

## Output

| Artifact            | Location                              | Purpose                         |
| ------------------- | ------------------------------------- | ------------------------------- |
| checkpoint note     | `.protocols/<protocol>/checkpoint.md` | human-readable resume state     |
| optional state file | `.protocols/<protocol>/state.json`    | machine-readable frontier state |

## Required sections for `checkpoint.md`

1. current objective;
2. completed work;
3. in-progress step;
4. next exact action;
5. open risks / blockers;
6. last verification performed;
7. files and commands needed to resume safely.

## Steps

|   # | Step                            | INPUT                     | OUTPUT                     | VERIFY                                   |
| --: | ------------------------------- | ------------------------- | -------------------------- | ---------------------------------------- |
|   1 | Capture execution frontier      | plan + execution state    | completed/in-progress/next | next action is explicit                  |
|   2 | Record verification freshness   | latest checks             | `last_verified` note       | no stale `done` claims                   |
|   3 | Record blockers and assumptions | current risks             | open risks list            | blockers are actionable                  |
|   4 | Save resume commands/files      | local context             | reproducible resume path   | next agent knows where to start          |
|   5 | Sync protocol state             | checkpoint + execution.md | consistent protocol trail  | checkpoint and execution do not conflict |

## Guardrails

1. MUST state one exact next action, not a vague direction.
2. MUST distinguish `completed`, `in_progress` and `next`.
3. MUST record the latest verification or explicitly say `not run`.
4. MUST keep transient execution state in protocol artifacts, not в `Memory Bank`.
5. SHOULD update the checkpoint after any major scope or frontier change.

## Minimal template

```markdown
# Checkpoint

## Objective

- ...

## Completed

- ...

## In Progress

- ...

## Next

- Exact next action: ...

## Verification

- Last verified: ...

## Risks

- ...

## Resume

- Files:
- Commands:
```
