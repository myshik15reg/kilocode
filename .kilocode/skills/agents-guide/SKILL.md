---
name: agents-guide
description: Agent selection and delegation rules - specialist-first, subagent patterns, skills integration, model selection.
---

# Agents Guide

## Quick Rules

1. **Specialist-first:** prefer narrowest specialist over generic `code`
2. **Alfa Code:** one task = one mode; use `new_task`
3. **Memory First:** read Memory Bank, confirm `[MB: OK]`

## Research Subagents (Read-Only)

| Subagent                     | Purpose                       |
| ---------------------------- | ----------------------------- |
| `planning-research-codebase` | Internal code analysis        |
| `planning-research-web`      | External docs, best practices |

Output: findings only, no file writes.

## Subagent Query Patterns

- **Parallel:** ask independent questions in single message
- **Sequential:** follow up after initial answers
- **Cross-reference:** compare internal vs external findings

## Skills Integration

| Task Type      | Skill                      |
| -------------- | -------------------------- |
| CLI commands   | `cli-master`               |
| Git operations | `git-workflow`             |
| Code review    | `code-review`              |
| Testing        | `project-tests`            |
| Security       | `security-audit`           |
| Performance    | `performance-optimization` |
| Localization   | `translation`              |

## Model Selection

| Task Type    | Model             | Reason            |
| ------------ | ----------------- | ----------------- |
| Planning     | Opus/o1           | High reasoning    |
| Coding       | Sonnet/GPT-4o     | Balanced          |
| Simple edits | Haiku/GPT-4o-mini | Fast              |
| Review       | Opus/o1           | Critical analysis |

## Delegation Format

```
new_task:
  mode: <specialist>
  context: <brief summary>
  goal: <specific outcome>
  constraints: <limits>
```
