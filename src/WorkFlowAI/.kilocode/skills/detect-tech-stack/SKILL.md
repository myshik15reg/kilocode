---
name: detect-tech-stack
description: Identify the relevant project stack quickly so the agent can choose the right mode, tooling, and test strategy.
---

# Detect Tech Stack

Use this skill when the project stack is unclear and the next step depends on knowing the language, framework, or package ecosystem.

## Goal

Identify only the stack details needed for the current task.

## Process

1. Check manifest and config files first.
2. Look for the nearest runtime and test entrypoints.
3. Use the result to guide mode selection and verification strategy.
4. Stop once the next safe action is clear.

## Typical signals

- package managers and lockfiles
- framework configs
- language-specific build files
- test runner configs
- deployment or container configs when operations work is involved

## Output

Return a short stack summary with the specific evidence that matters for the task.
