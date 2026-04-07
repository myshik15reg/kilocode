# Workflow: 1c-review-pack

## Goal

Use the vendored review corpus `.kilocode/vendor/1c-ai-code-reviewers-rulles/` as the retrieval-first review layer for 1C code review in `WorkFlowAI`.

## When to use

1. During the `1c-quality-specialist` phase.
2. When review must rely on Alfa-first evidence for BSL/1C changes.
3. When protocol artifacts must include both human-readable review notes and structured findings.

## Source of Truth

1. Local bridge skill: [`../skills/1c-review-pack/SKILL.md`](../skills/1c-review-pack/SKILL.md:1)
2. Vendored entrypoint: [`../vendor/1c-ai-code-reviewers-rulles/indexes/start-here.md`](../vendor/1c-ai-code-reviewers-rulles/indexes/start-here.md:1)
3. Vendored router: [`../vendor/1c-ai-code-reviewers-rulles/indexes/file-signal-router.md`](../vendor/1c-ai-code-reviewers-rulles/indexes/file-signal-router.md:1)
4. Vendored finding contract: [`../vendor/1c-ai-code-reviewers-rulles/rules/10-finding-format.md`](../vendor/1c-ai-code-reviewers-rulles/rules/10-finding-format.md:1)

## Required artifacts

```text
.protocols/.../artifacts/review/
├── code-review.md
├── quality-checklist.md
├── apk-report.md
└── findings.json
```

## Notes

1. `code-review.md` stays compatible with the existing 1C handoff chain.
2. `findings.json` adds machine-readable, line-aware findings.
3. Review remains Alfa-first; official 1C and tooling are secondary evidence layers.
