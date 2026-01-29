# Integration Guide

Purpose: reuse this workflow pack in other projects without dragging project-specific history.

## Option A (recommended): Global install + per-project init
Use this when you want one shared workflow pack across many projects.

1. Install globally (once):
   - Run `scripts/workflowai-install-global.ps1` (from this repo).
   - It installs into `~/~/.kilocode/` (KiloCode global directory).
2. Initialize each project:
   - Run `~/~/.kilocode/workflowai/scripts/workflowai-init-project.ps1 -ProjectPath <project>`.
   - Creates per-project `.kilocode/memory-bank/`, `~/.kilocode/patterns/`, `~/.kilocode/skills/`, `.protocols/`, `temp/`, `docs/`.
   - If global templates are available, patterns/skills are typically created as links (junctions) and added to `.gitignore` to avoid accidental commits.
   - Optional: scaffold CI/PR quality gates with `-InitQualityGates` (see `~/.kilocode/workflows/quality-enforcement.md`).
3. Use local overrides only when needed:
   - `<project>/~/.kilocode/rules/` and `<project>/~/.kilocode/workflows/` override global.

Important: If you use global install, avoid copying the full `~/.kilocode/rules` and `~/.kilocode/workflows` into every repo unless you intentionally want project-local overrides (otherwise you'll duplicate content).

## Option B: Embed the pack into the repo
Use this when the workflow pack must travel with the repository (no global dependency).

### What to copy
- `AGENTS.md`
- `~/.kilocode/` (rules, patterns, workflows, skills, memory bank templates)
- `.kilocodemodes`
- `.clinerules`
- `.protocols/README.md`, `.protocols/index.md` (templates only)

### What NOT to copy
- `.protocols/YYYY-MM-DD-*/` task folders (project-specific)
- `temp/` (scratch area, should be gitignored)
- Existing Memory Bank content from another project (reinitialize)

## If the target repo already has `~/.kilocode/`
Merge, don’t overwrite:
1. Diff `AGENTS.md` and `~/.kilocode/` against this pack.
2. Keep repo-specific additions (examples: `docs/`, `specs/`, project-only skills/workflows).
3. Adopt quality gates consistently (TDD + 100% coverage + 0 lint warnings).
4. Re-check internal links after merges.

## KiloCode compatibility notes
- Global root: `~/~/.kilocode/`
- Project root: `<project>/~/.kilocode/` (legacy `<project>/.roo/` may still be used in old repos)
- Entrypoint: `AGENTS.md` / `AGENT.md` at project root
