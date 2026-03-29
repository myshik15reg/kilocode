# Context Handoff Protocol

Purpose: define the canonical delegation format for `new_task` so the receiving agent gets enough context without extra token waste.

## Non-negotiables

1. Every handoff includes `=== CONTEXT HANDOFF ===`.
2. Facts are source-backed.
3. Assumptions are labeled `ASSUMPTION:` and paired with a safe default.
4. The receiving agent should not need to guess the task context.
5. Pass only the minimum context needed for execution.
6. Prefer a cleaned `brief` or compact capsule over raw chat history.

## Required fields

| Field             | Meaning                                                |
| ----------------- | ------------------------------------------------------ |
| `ROOT`            | workspace root                                         |
| `PROTOCOL`        | active protocol path or `N/A`                          |
| `ORIGIN`          | source mode to target mode                             |
| `DOMAIN`          | technical or business domain                           |
| `PHASE`           | planning / implementation / testing / review / release |
| `GOAL`            | one measurable objective                               |
| `INPUTS`          | files, artifacts, or references to read                |
| `CONSTRAINTS`     | mandatory rules and boundaries                         |
| `OUT OF SCOPE`    | what must not be done                                  |
| `VERIFY`          | how success is checked                                 |
| `EXPECTED OUTPUT` | what to return                                         |

## Optional fields

- `ASSUMPTIONS`
- `QUESTIONS`
- `TEMP`
- `LIMITATIONS`
- `MCP INSTRUCTIONS`
- `CAPSULE`
- `BRIEF`

## Canonical template

```text
TASK: <short title>

=== CONTEXT HANDOFF ===
ROOT: <path>
PROTOCOL: <path or N/A>
ORIGIN: <from -> to>
DOMAIN: <domain>
PHASE: <phase>

GOAL:
<one measurable goal>

INPUTS:
1. <path:line> - <why>
2. <path:line> - <why>

CONSTRAINTS:
1. <must or must not>
2. <must or must not>

OUT OF SCOPE:
1. <explicit exclusion>

VERIFY:
1. <verification step>

EXPECTED OUTPUT:
<expected result>

ASSUMPTIONS:
1. ASSUMPTION: <...>. Risk: <...>. Default: <...>.

BRIEF:
<clean task contract or short summary of it>

QUESTIONS:
1. <single blocking question>

TEMP:
1. TEMP: <safe rule until answer arrives>.
=======================
```
