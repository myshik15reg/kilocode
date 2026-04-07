# Workflow: brainstorm-design

## Goal

Collapse design ambiguity before protocol planning: explore the current context, compare a small set of viable approaches, converge on one recommended direction, and end with an approved design summary that can feed `protocol-new.md`.

Related docs: [`protocol-new.md`](protocol-new.md:1), [`research-retrieval.md`](research-retrieval.md:1), [`../rules/workflow-prompt-writing.md`](../rules/workflow-prompt-writing.md:1), [`../rules/evidence-rules.md`](../rules/evidence-rules.md:1), [`../rules/task-classification.md`](../rules/task-classification.md:1).

## When to use

Use this workflow when at least one of these is true:

1. the request is ambiguous and repo change scope cannot be written safely yet;
2. there are 2-3 materially different implementation or architecture options;
3. success criteria are unclear;
4. the initiative is large enough that decomposition must happen before protocol planning;
5. the user explicitly asks to compare approaches or choose a direction.

## Do not use

Do not use this workflow for:

1. exact bug fixes with known root cause;
2. trivial repo changes;
3. docs-only micro-changes;
4. tasks with an already approved design or exact implementation target.

## Required output

The workflow MUST converge to these sections:

1. `problem framing`
2. `constraints`
3. `options considered`
4. `recommended approach`
5. `trade-offs`
6. `open questions`
7. `approved design summary`
8. `next action`

Allowed terminal statuses:

1. `approved-for-protocol`
2. `needs-clarification`

## Steps

|   # | Step                          | INPUT                                          | OUTPUT                                           | VERIFY                                               |
| --: | ----------------------------- | ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
|   1 | Explore current context first | user request + repo/docs context               | grounded problem framing                         | existing SoT and repo facts checked before questions |
|   2 | Ask only blocking questions   | explored context                               | one blocking question at a time                  | each question changes the decision space             |
|   3 | Compare a small option set    | problem framing + constraints                  | 2-3 viable approaches with trade-offs            | options are realistic and materially different       |
|   4 | Recommend one direction       | option set                                     | recommended approach + rationale                 | recommendation is tied to constraints and evidence   |
|   5 | Converge to design summary    | chosen direction                               | approved design summary                          | summary is concrete enough to seed `brief.md`        |
|   6 | Hand off to protocol or stop  | approved design summary or unresolved blockers | `approved-for-protocol` or `needs-clarification` | next action is explicit                              |

## Rules

1. Explore before asking.
2. Ask at most one blocking question at a time.
3. Do not use persona-heavy prompting as a substitute for a design contract.
4. Do not spawn subagents by default.
5. Keep raw exploration in the response, `.notes`, or protocol artifacts until promotion is justified.
6. If the task will change the repo, `protocol-new.md` remains mandatory after this workflow.

## Notes

1. `approved design summary` is staging until it is copied into protocol artifacts.
2. If the work is retrieval-heavy, use [`research-retrieval.md`](research-retrieval.md:1) during Step 1 instead of dumping large context into one prompt.
3. The expected handoff is `brainstorm-design -> protocol-new`, not direct implementation.
