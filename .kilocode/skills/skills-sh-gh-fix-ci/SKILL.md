---
name: skills-sh-gh-fix-ci
description: Curated bridge for diagnosing and repairing failing GitHub Actions workflows in WorkFlowAI. Use when Codex needs to inspect GitHub Actions logs, classify CI failures, propose the smallest safe fix path, and tie risky actions back to local git, security, and pre-action rules.
---

# skills.sh Bridge: GitHub Actions Fix CI

## Purpose

Provide a disciplined troubleshooting path for GitHub Actions failures without bypassing local safety rules.

## Triggers

- A GitHub Actions workflow or job is failing.
- The team needs a minimal safe fix path for CI rather than broad pipeline redesign.
- CI logs point to scripts, environment setup, caching, secrets, or flaky tests.

## Context

- `../../workflows/pre-action-check.md` - safety corridor for risky actions
- `../../workflows/planner-executor.md` - tool-heavy inspection loops
- `../../workflows/quality-enforcement.md` - CI and gate expectations
- `../git-workflow/SKILL.md` - safe git actions around CI fixes
- `../security-audit/SKILL.md` - secret and environment handling

## Procedure

1. Inspect the failing GitHub Actions job and capture the exact failure signal.
2. Classify the failure as configuration, script, dependency, cache, secret, or flaky-test related.
3. Identify the smallest repo or workflow change that addresses the actual cause.
4. Verify locally when possible before proposing a rerun or push.
5. Route any risky follow-up action through `pre-action-check.md`.

## Local Overrides

- Scope is GitHub Actions only; do not generalize this bridge to other CI systems.
- This bridge does not authorize commit, push, deploy, or secret changes by itself.
- Prefer local stack-native fixes and quality gates over CI-only band-aids.

## When not to use

- The failing system is not GitHub Actions.
- There is no concrete CI evidence yet.
- The problem is normal local test execution rather than pipeline behavior.

## Related Local Skills

- [`git-workflow`](../git-workflow/SKILL.md)
- [`security-audit`](../security-audit/SKILL.md)
- [`project-tests`](../project-tests/SKILL.md)

## Upstream Source

- `https://skills.sh/openai/skills/gh-fix-ci`
- Retrieved for curation: 2026-04-08
