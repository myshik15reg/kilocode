# Terminology

## Normative language

1. `MUST` = mandatory requirement.
2. `MUST NOT` = forbidden action.
3. `SHOULD` = recommended default; deviations need a clear reason.
4. `MAY` = optional action.

## Core terms

| Term | Definition | Rule |
|---|---|---|
| `mode` | runtime role with responsibilities, limits, and tool access | one task runs in one mode at a time |
| `agent` | a worker operating in a specific mode | specialist-first selection applies |
| `task` | one unit of work with one goal and one Definition of Done | repo-changing tasks require a protocol unless an explicit exception says otherwise |
| `protocol` | temporary task workspace in `.protocols/YYYY-MM-DD-name/` | long-lived results must move to stable paths before closure |
| `handoff` | structured delegation package for another mode | use the canonical `=== CONTEXT HANDOFF ===` format |
| `evidence` | verifiable support for a claim, decision, or finding | facts should be source-backed |
| `assumption` | unverified statement used temporarily | label it `ASSUMPTION:` and pair it with a safe default |
| `scope` | explicit in-scope and out-of-scope boundaries | record it in planning and handoff |
| `AC` | acceptance criteria describing observable behavior | prefer Given/When/Then when useful |
| `DoD` | completion criteria for the task | include required verification and docs updates |

## Canonical references

- Mode selection: [`../skills/mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)
- Protocol creation: [`../workflows/protocol-new.md`](../workflows/protocol-new.md:1)
- Handoff format: [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1)
- Evidence discipline: [`evidence-rules.md`](evidence-rules.md:1)
- Artifact storage: [`artifacts-and-storage.md`](artifacts-and-storage.md:1)

## Writing rules

1. Reuse these terms consistently across rules, workflows, and skills.
2. If a new term becomes normative, add it here before spreading it elsewhere.
3. Do not redefine `protocol`, `task`, or `handoff` differently in local documents.
