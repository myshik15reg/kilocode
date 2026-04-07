---
name: skills-sh-codex-readiness-integration-test
description: Curated bridge for auditing whether a repository is ready for Codex-driven integration-test work. Use when Codex needs to evaluate integration-test setup, environment isolation, service dependencies, and evidence capture for agentic integration testing rather than just running existing tests.
---

# skills.sh Bridge: Codex Readiness Integration Test

## Purpose

Assess whether integration-test work can be executed predictably by an agent without hidden environment knowledge.

## Triggers

- The task is a readiness audit for Codex-style integration testing.
- Integration tests depend on services, fixtures, or environment setup that may be under-documented.
- The workflow-pack needs eval coverage for integration-test readiness.

## Context

- `../../workflows/agent-evaluation-lifecycle.md` - doc-eval lifecycle
- `../../workflows/workflow-evals.md` - stable scenario set
- `../project-tests/SKILL.md` - current test execution path
- `../quality-gates/SKILL.md` - local quality expectations
- `../detect-tech-stack/SKILL.md` - stack and CI discovery

## Procedure

1. Identify integration-test scripts, dependent services, seed data, and teardown expectations.
2. Check whether environment provisioning and failure signals are documented well enough for a fresh agent.
3. Record blockers such as hidden secrets, manual-only steps, shared-state hazards, or missing cleanup.
4. Recommend protocol-backed fixes to docs or workflows instead of treating readiness as execution.
5. Re-run the readiness review after process updates.

## Local Overrides

- This bridge is an evaluation tool, not the default execution path for integration tests.
- Do not introduce repo-local harness files or custom Codex home directories unless explicitly requested.
- Keep readiness findings subordinate to local test skills, quality gates, and evidence rules.

## When not to use

- The user only wants the integration suite executed.
- The issue is a failing GitHub Actions job rather than repository readiness.
- The task is about unit-test clarity only.

## Related Local Skills

- [`project-tests`](../project-tests/SKILL.md)
- [`quality-gates`](../quality-gates/SKILL.md)
- [`detect-tech-stack`](../detect-tech-stack/SKILL.md)

## Upstream Source

- `https://skills.sh/openai/skills/codex-readiness-integration-test`
- Retrieved for curation: 2026-04-08
