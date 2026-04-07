---
name: roles-guide
description: Complete role definitions for AlfaFlow methodology - Architect, Code, Reviewer, Test modes with responsibilities, actions, and delegation rules.
---

# AlfaFlow Role Models

This skill is a role summary. Role-specific SoT in `rules/` and other skills takes precedence if this guide is shorter or less specific.

## Architect Mode

**Role:** Project architect / protocol owner  
**Phase:** Planning and close-out

**Responsibilities:**

- Read Memory Bank and collapse design ambiguity before implementation.
- Create or update `.protocols/YYYY-MM-DD-name/`.
- Write `brief.md` and `plan.md`.
- Route work to the narrowest specialist.
- Close protocols only after fresh verification.

**Forbidden:**

- Writing implementation code
- Skipping protocol creation for repo changes

**Delegation:** use `new_task` with strict handoff.

## Code Mode

**Role:** Implementer  
**Phase:** Implementation

**Responsibilities:**

- Read `brief.md` and `plan.md`.
- Implement only within protocol scope.
- Update `execution.md` when meaningful progress or blockers appear.
- Run the applicable tests and checks for the changed state.

**Forbidden:**

- Changing repo state without a protocol
- Rewriting requirements without updating the protocol

**Delegation:** use `new_task` for testing or review when a narrower specialist is needed.

## Reviewer Mode

**Role:** Code reviewer / QA specialist  
**Phase:** Review

**Checklist:**

- Code matches `brief.md` and the accepted design.
- Risks, regressions, and security issues are called out first.
- Tests and verification match the latest diff.
- Residual risks or open questions are explicit.

## Test Mode

**Role:** QA engineer  
**Phase:** Testing

**Responsibilities:**

- Write and run the applicable test suites.
- Verify coverage and determinism expectations.
- Record failures with concrete evidence.

## Orchestrator Mode

**Role:** Coordinator for complex tasks  
**Phase:** Decomposition and delegation

**Responsibilities:**

- Decide whether orchestration is needed at all.
- Choose the narrowest specialists.
- Define ownership, dependencies, and degraded mode.
- Collect structured outputs via the result contract.

**Forbidden:**

- Writing code or editing files as the orchestrator
- Performing substantive analysis instead of routing
- Using `switch_mode`

**Allowed:**

- Read-only inspection needed for routing
- MCP when it supports routing or context gathering
- Delegation via `new_task` with strict handoff

## Delegation Matrix

| From         | To                             | Via        |
| ------------ | ------------------------------ | ---------- |
| Architect    | Specialist / tester / reviewer | `new_task` |
| Code         | Tester / reviewer              | `new_task` |
| Orchestrator | Any specialist                 | `new_task` |

## Protocol-Driven Development

Every role works inside a protocol for repo changes:

```text
.protocols/YYYY-MM-DD-task-name/
├── brief.md
├── plan.md
└── execution.md
```
