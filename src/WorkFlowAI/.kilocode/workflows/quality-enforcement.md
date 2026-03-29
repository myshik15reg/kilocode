# Quality Enforcement

Purpose: explain how quality gates are enforced in practice through repository tooling and CI.

Normative rules live in [`../rules/quality-gates.md`](../rules/quality-gates.md:1).

## Enforcement model

1. Define required test, coverage, lint, and safety checks in the repository.
2. Run the smallest relevant checks locally during implementation.
3. Run the full required gate set before merge.
4. Use CI and branch protection where the platform supports them.
5. Route exceptions through [`waiver-workflow.md`](waiver-workflow.md:1).

## What this workflow does

- maps policy to local commands or scripts
- encourages CI-based enforcement
- keeps local helpers optional and repository-specific
- avoids inventing global script assumptions for every project

## Typical setup

| Area | Example expectation |
|---|---|
| tests | project has documented commands for required test scopes |
| coverage | project can verify required coverage policy where applicable |
| lint | project has a zero-warning/error policy where applicable |
| CI | protected branches require the relevant status checks |

## References

- Quality policy: [`../rules/quality-gates.md`](../rules/quality-gates.md:1)
- Testing: [`../rules/testing-rules.md`](../rules/testing-rules.md:1)
- Git policy: [`../rules/git-workflow-rules.md`](../rules/git-workflow-rules.md:1)
- Waivers: [`waiver-workflow.md`](waiver-workflow.md:1)
