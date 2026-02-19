# Repo Hygiene

Purpose: keep the repository clean, predictable, and reviewable.

## Storage Rules

- Workflow pack docs live under `~/.kilocode/` in this template.
- Project docs in consuming repos may live in `docs/` (optional).
- Temporary scripts and scratch files go to `temp/`.
- Screenshots go to `temp/screenshot/`.
- Protocols live only in `.protocols/`.

## Clean Status Checklist

- No unrelated untracked files before a task starts.
- No large binary files without Git LFS.
- No scratch files at repo root.
- `temp/` stays temporary; clean it after the task.

## File Naming

- Protocols: `.protocols/YYYY-MM-DD-name/`.
- Markdown in `~/.kilocode/`: lowercase, `kebab-case` (`some-doc.md`) to avoid case-sensitivity issues.
- Docs (in consuming repos): clear, lowercase, hyphenated.
- Screenshots: `temp/screenshot/YYYY-MM-DD-short-name.png`.
- PowerShell scripts: `scripts/workflowai-<action>.ps1` (kebab-case).

### Allowed Exceptions

- `AGENTS.md` (project entrypoint)
- `README.md` (repo entrypoint)
- `SKILL.md` (skill convention)
- `.clinerules`, `.kilocodemodes`, `.gitignore` (tool conventions)

## Daily Hygiene

- Check `git status` before and after changes.
- Delete stale worktrees and temp artifacts.
- Keep internal links up to date.

## Local-only Artifacts (must not be tracked)

- IDE/workspace: `*.code-workspace`, `.vscode/`, `.idea/`
- AI tool configs: `.claude/` and similar
