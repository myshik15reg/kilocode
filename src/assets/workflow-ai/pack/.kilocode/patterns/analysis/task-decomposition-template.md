# Task Decomposition Template

Purpose: break large tasks into small, independent subtasks with full scope coverage.

## Step 1: Extract Requirements
- Read the full request and list every requirement.
- Number them: [R1], [R2], ...
- Include functional, non-functional, and implicit requirements.

## Step 2: Decompose
- Each task: 30 minutes to 4 hours.
- Each task is atomic with a clear deliverable.
- Identify dependencies and parallel groups.
- Include affected file paths for every task.
- Map every task to one or more requirements.
- Group tasks by user story when stories exist; each story should be independently testable.

## Step 3: Coverage Matrix
| Requirement | Covered by Tasks | Status |
|-------------|------------------|--------|
| [R1] | #001, #002 | OK |
| [R2] | #002 | OK |

## Step 4: Verification
- All requirements mapped to at least one task.
- No orphan tasks (every task maps back to a requirement).
- Tests included (TDD, 100% coverage).
- Dependencies and parallel groups are explicit.

## Output Location
Create `.protocols/<protocol>/artifacts/tasks/` with:
- `README.md` (summary + coverage matrix)
- `task-001-<name>.md`, `task-002-<name>.md`, ...
- If multiple decompositions exist, use subfolders: `tasks/<task-name>/`.

## Task File Template
```markdown
# Task #001: <Title>

## Requirements Addressed
- [R1] ...
- [R2] ...

## Description
<What to build/change and why>

## Affected Files
- path/to/file.ext - <what changes>

## Implementation Details
<Concrete steps, not vague statements>

## Dependencies
- [ ] Task #000 - <dependency>
- [x] No dependencies

## Completion Criteria
- [ ] <measurable outcome>
- [ ] <measurable outcome>
- [ ] Tests added/updated
- [ ] Tests pass
```

## Constraints
- No deadlines or assignments.
- No tasks larger than 4 hours or smaller than 30 minutes.
- Every requirement must map to at least one task.
- Tasks should be independently deliverable and testable.
