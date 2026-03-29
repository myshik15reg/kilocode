# 1C context handoff templates

Purpose: pass task-specific context between agents with `new_task` while keeping workspace state in the workspace, not in the template pack.

## Required shape
```xml
<new_task>
<mode>{agent-slug}</mode>
<message>
TASK: [short task]

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: [Analysis | Design | Implementation | Testing | Review]
INPUTS:
- [file or artifact]
CONSTRAINTS:
1. [rule]
EXPECTED_OUTPUT:
- [artifact or result]
=== END HANDOFF ===
</message>
</new_task>
```

## Rules
- Use `new_task`, not legacy variants or typos.
- Point to the active workspace `.protocols/...` folder.
- Reference workspace Memory Bank files when needed.
- Pass only the minimum context needed for the next specialist.
- State deliverable format explicitly.

## 1C example
```xml
<new_task>
<mode>1c-developer</mode>
<message>
TASK: Implement approved 1C change for <TICKET>

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Implementation
INPUTS:
- .protocols/.../brief.md
- .protocols/.../artifacts/analysis/system-analysis.md
CONSTRAINTS:
1. Update changed objects for <TICKET>
2. Keep delta minimal and release-safe
EXPECTED_OUTPUT:
- implementation summary
- changed objects update
=== END HANDOFF ===
</message>
</new_task>
```
