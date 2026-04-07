---
name: skills-sh-using-git-worktrees
description: Curated bridge for using Git worktrees to isolate parallel or risky work in WorkFlowAI. Use when Codex needs separate directories for branch-isolated changes, concurrent agent execution, or review-safe experimentation without disturbing the main worktree.
---

# skills.sh Bridge: Using Git Worktrees

## Purpose

Provide a safe isolation pattern for concurrent or risky changes without normalizing worktrees as the default for every task.

## Triggers

- Parallel agent or branch-isolated work needs separate directories.
- The current worktree is dirty and isolation is safer than reusing it.
- Review or experimental changes should not disturb the main workspace.

## Context

- `../git-workflow/SKILL.md` - local branch and commit conventions
- `../cli-compatibility/SKILL.md` - cross-shell CLI safety
- `../../workflows/pre-action-check.md` - risky git actions and cleanup
- `../../rules/security-rules.md` - secret and environment hygiene
- `../orchestrator-guide/SKILL.md` - when worktree isolation helps orchestration

## Procedure

1. Confirm that worktree isolation is actually needed and name the target branch/worktree clearly.
2. Check the current worktree state before creating a new one.
3. Create a dedicated worktree for the isolated branch and keep ownership explicit.
4. Perform the scoped work inside that directory only.
5. Merge or clean up only after verification and the applicable local git safety checks.

## Local Overrides

- Worktrees are optional, not mandatory, for multi-agent tasks.
- Follow local git workflow rules and pre-action checks before cleanup or branch deletion.
- Keep Windows/PowerShell-safe command patterns; avoid shell-specific shortcuts in shared docs.

## When not to use

- Single-threaded edits in a clean worktree.
- Tasks that do not need branch or path isolation.
- Situations where the user/runtime does not allow git operations.

## Related Local Skills

- [`git-workflow`](../git-workflow/SKILL.md)
- [`cli-compatibility`](../cli-compatibility/SKILL.md)
- [`orchestrator-guide`](../orchestrator-guide/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/using-git-worktrees`
- Retrieved for curation: 2026-04-08
