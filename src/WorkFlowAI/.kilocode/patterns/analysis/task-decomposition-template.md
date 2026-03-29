# Task Decomposition Template

Purpose: break a large request into small, independently deliverable subtasks with full requirement coverage.

> Storage rule: keep decomposition artifacts inside the active protocol: `.protocols/<protocol>/artifacts/tasks/` (see [`artifacts-and-storage.md`](../../rules/artifacts-and-storage.md:1)).

---

## Step 1: Extract requirements

- Read the full request and list every requirement.
- Number them: `[R1]`, `[R2]`, ...
- Include functional, non-functional, and implicit requirements.
- If acceptance criteria exist, link each AC to a requirement.

## Step 2: Decompose into tasks

Rules:

- Each task should take **30 minutes to 4 hours**.
- Each task is **atomic** and has a **single clear deliverable**.
- Identify **dependencies** and **parallel groups**.
- List **affected file paths** for every task.
- Map every task to one or more requirements.
- If user stories exist: group tasks by story; each story must be independently testable.

## Step 3: Coverage matrix

Create a matrix to ensure **no missed requirements**.

| Requirement | Covered by Tasks | Status |
|-------------|------------------|--------|
| `[R1]` | `task-001-...`, `task-002-...` | OK |
| `[R2]` | `task-002-...` | OK |

## Step 4: Verification

- All requirements are mapped to at least one task.
- No orphan tasks (every task maps back to a requirement).
- Tests are included where code changes are planned (TDD + 100% coverage gate).
- Dependencies and parallel groups are explicit.

---

## Output location (protocol artifacts)

Create `.protocols/<protocol>/artifacts/tasks/` with:

- `README.md` — summary + coverage matrix + ordering.
- `task-001-<name>.md`, `task-002-<name>.md`, ...

If multiple decompositions exist for one protocol, use subfolders:

- `tasks/<topic>/README.md`
- `tasks/<topic>/task-001-...md`

---

## Task file template

```markdown
# Task #001: <Title>

## Requirements Addressed
- [R1] ...
- [R2] ...

## Description
<What to build/change and why>

## Affected Files
- path/to/file.ext — <what changes>

## Implementation Details
<Concrete steps, not vague statements>

## Dependencies
- [ ] Task #000 — <dependency>
- [x] No dependencies

## Completion Criteria
- [ ] <measurable outcome>
- [ ] <measurable outcome>
- [ ] Tests added/updated
- [ ] Tests pass (100% coverage)
```

## Constraints

- No deadlines or assignments.
- No tasks larger than 4 hours or smaller than 30 minutes.
- Every requirement must map to at least one task.
- Tasks should be independently deliverable and testable.

