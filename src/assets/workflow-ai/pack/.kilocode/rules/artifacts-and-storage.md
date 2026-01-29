# Artifacts and Storage

This guide standardizes where workflow artifacts and temporary files live.

## Rules
- `.protocols/<protocol>/` holds task-specific artifacts and logs.
- Use `.protocols/<protocol>/artifacts/` for research, decisions, and evidence.
- `temp/` is scratch space (scripts, caches, short-lived files). Clean after the task.
- `temp/screenshot/` stores temporary UI evidence.
- `docs/` is optional in *consuming projects*; this template keeps its docs under `~/.kilocode/`.

## Artifact Output Map
- Architecture decisions (ADR): `.protocols/<protocol>/artifacts/decisions/ADR-0001-<topic>.md`
- Solution research: `.protocols/<protocol>/artifacts/research/YYYYMMDD-HHMMSS-<topic>.md`
- Task decomposition: `.protocols/<protocol>/artifacts/tasks/README.md` + `task-001-<name>.md`
- Creative sessions: `.protocols/<protocol>/artifacts/creative/YYYYMMDD-HHMMSS-<topic>.md`
- Evidence (screenshots/logs): `.protocols/<protocol>/artifacts/evidence/`

## Naming Conventions
- Use lowercase slugs with hyphens.
- Keep slugs short and descriptive.
- Use timestamps when creating multiple artifacts in a day.
