---
name: 1c-review-pack
description: Retrieval-first 1C code review using the vendored Alfa/v8std/tooling review pack.
---

# 1C Review Pack

## Purpose

This skill connects `WorkFlowAI` 1C review flow with the vendored repository `.kilocode/vendor/1c-ai-code-reviewers-rulles/`.
It defines how `1c-quality-specialist` performs retrieval-first review, routes evidence, and writes stable review artifacts.

## Triggers

Use this skill when:

- `1c-quality-specialist` reviews BSL or 1C metadata changes
- protocol reaches the 1C code review phase
- user asks for 1C code review based on Alfa rules
- review must produce structured findings with line context

## Context

Before review, read in this order:

1. Protocol inputs: `.protocols/.../brief.md`, changed files, testing artifacts
2. Vendored entrypoint: `../../vendor/1c-ai-code-reviewers-rulles/indexes/start-here.md`
3. Vendored router: `../../vendor/1c-ai-code-reviewers-rulles/indexes/file-signal-router.md`
4. Vendored manifest: `../../vendor/1c-ai-code-reviewers-rulles/manifests/rules-manifest.json`
5. Vendored finding contract: `../../vendor/1c-ai-code-reviewers-rulles/rules/10-finding-format.md`

## Procedure

### Step 1: Lock the review contract

1. Treat the prompt as an execution contract, not as role-play.
2. Use Alfa-first evidence order from the vendored review pack.
3. Do not bulk-load the whole corpus.

### Step 2: Route by change signal

1. Inspect changed files or review scope.
2. Use `indexes/file-signal-router.md` to choose the minimal domain route.
3. Load Alfa sources first; use official 1C and tooling only as the second evidence layer.

### Step 3: Review with minimal sufficient evidence

1. Open the relevant domain index from the vendored pack.
2. Open only the exact rules and source notes needed for the finding.
3. Keep uncertainty explicit when architecture or neighboring context is missing.

### Step 4: Produce review artifacts

Write protocol review artifacts to:

1. `.protocols/.../artifacts/review/code-review.md` - human verdict and comments
2. `.protocols/.../artifacts/review/quality-checklist.md` - quality gate checklist
3. `.protocols/.../artifacts/review/apk-report.md` - APK or analyzer report
4. `.protocols/.../artifacts/review/findings.json` - structured findings using the vendored schema

### Step 5: Preserve compatibility

1. `code-review.md` remains the human-facing verdict for the existing workflow.
2. `findings.json` is the machine-readable layer for downstream processing.
3. `evidence_refs` must reference vendored pack sources in Alfa-first order.

## Rules

1. The vendored review pack is SoT for 1C code review routing and finding schema.
2. Generic workflow/process SoT remains in `WorkFlowAI`.
3. Do not copy vendored rules into local generic rule files unless there is an explicit bridge need.
4. If the vendored pack evolves, update this skill and mode wiring, not the review findings contract.

## Output Contract

Each structured finding in `findings.json` must follow the schema defined in:
`../../vendor/1c-ai-code-reviewers-rulles/rules/10-finding-format.md`
