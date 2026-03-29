---
name: project-tests
description: Discover how a specific project expects tests to be run and choose the smallest verification path that matches repository policy.
---

# Project Tests

Use this skill when you need to understand or run tests in an unfamiliar repository.

## Goal

Find the repository's real testing entrypoints and pick the smallest relevant test scope first.

## Process

1. Identify the package manager or build system.
2. Check project scripts, workspace docs, and adjacent test files.
3. Find the nearest existing test pattern for the area being changed.
4. Start with the most targeted relevant test command.
5. Expand to broader checks only as confidence or task scope requires.

## What to look for

- package scripts such as `test`, `test:unit`, `test:integration`, `test:e2e`, `coverage`, `lint`
- workspace-specific test commands
- local testing conventions near the changed files
- repository rules about where and how tests must be run

## Rules

1. Prefer the smallest relevant test first.
2. Do not invent a test strategy that conflicts with repository instructions.
3. If no test exists, use adjacent patterns before creating a new one.
4. Keep testing proportional to the risk and scope of the change.

## Related sources

- Detailed testing guidance: [`../testing-detailed/SKILL.md`](../testing-detailed/SKILL.md:1)
- Quality gates: [`../../rules/quality-gates.md`](../../rules/quality-gates.md:1)
