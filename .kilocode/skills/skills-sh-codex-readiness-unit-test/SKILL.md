---
name: skills-sh-codex-readiness-unit-test
description: Curated bridge for auditing whether a repository is ready for Codex-driven unit-test work. Use when Codex needs to evaluate unit-test scripts, setup clarity, deterministic execution, and documentation readiness for agentic unit testing, not when the user simply wants tests run.
---

# skills.sh Bridge: Codex Readiness Unit Test

## Purpose

Assess whether a repo is clear and deterministic enough for agentic unit-test execution and improvement.

## Triggers

- The task is a readiness audit for Codex-style unit testing.
- The team wants to know whether unit-test commands and prerequisites are discoverable.
- The workflow-pack needs eval coverage for unit-test readiness.

## Context

- `../../workflows/agent-evaluation-lifecycle.md` - doc-eval lifecycle
- `../../workflows/workflow-evals.md` - stable scenario set
- `../project-tests/SKILL.md` - normal test execution path
- `../testing-detailed/SKILL.md` - detailed testing expectations
- `../quality-gates/SKILL.md` - local pass criteria

## Procedure

1. Identify unit-test commands, fixtures, environment assumptions, and cleanup expectations.
2. Check whether a new agent could find and run the unit-test path without guesswork.
3. Record missing setup, ambiguous scripts, flaky prerequisites, and missing evidence trails as readiness gaps.
4. Recommend local protocol-backed improvements instead of silently patching process gaps.
5. Re-check readiness after any doc or workflow updates.

## Local Overrides

- This bridge is for readiness assessment, not the default path for running unit tests.
- Normal unit-test execution still uses local test skills and quality gates.
- Preserve the local 100% coverage/lint expectations for implementation work.

## When not to use

- The user only wants tests run now.
- The problem is integration or e2e readiness rather than unit tests.
- The task is already a code-change implementation protocol.

## Related Local Skills

- [`project-tests`](../project-tests/SKILL.md)
- [`testing-detailed`](../testing-detailed/SKILL.md)
- [`quality-gates`](../quality-gates/SKILL.md)

## Upstream Source

- `https://skills.sh/openai/skills/codex-readiness-unit-test`
- Retrieved for curation: 2026-04-08
