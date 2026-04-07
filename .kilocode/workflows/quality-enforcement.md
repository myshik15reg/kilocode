# Workflow: quality-enforcement

## Goal

Сделать требования AlfaFlowAI исполняемыми и для code changes, и для agent-workflow quality.

Base expectations:

- 100% coverage (lines/branches/functions)
- 0 lint errors / 0 lint warnings
- security checks (OWASP mindset + dependency scan + secrets detection)
- agent-flow evals for workflow-pack changes
- fresh verification before completion claims
- explicit review-feedback disposition when review materially affects scope or design

## When to use

1. Подключаете AlfaFlowAI к новому репозиторию.
2. Хотите включить автоматические quality gates.
3. Изменяете сам workflow-pack и хотите проверить route/eval consistency.

## Two layers

| Layer                 | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| Project quality gates | executable checks in consuming project                                       |
| Workflow-pack evals   | doc/process checks for routing, contracts, memory discipline, review closure |

## Consuming project architecture

Runner и guardrails поставляются вместе с шаблоном и живут в проекте:

- `./scripts/workflowai-quality-gates.ps1`
- `./scripts/workflowai-guardrails.ps1`
- `./scripts/workflowai-quality-gates.json`
- `./.github/workflows/workflowai-quality-gates.yml`

## Setup steps for consuming project

1. Scaffold quality gates into the project.
2. Copy or adjust a preset in `./scripts/presets/`.
3. Enable CI workflow and branch protection.
4. Run gates locally before relying on CI.

### Local commands

```powershell
powershell -ExecutionPolicy Bypass -File "./scripts/workflowai-quality-gates.ps1" -ProjectPath . -ConfigPath ./scripts/workflowai-quality-gates.json
powershell -ExecutionPolicy Bypass -File "./scripts/workflowai-guardrails.ps1" -ProjectPath .
```

```bash
pwsh -File "./scripts/workflowai-quality-gates.ps1" -ProjectPath . -ConfigPath ./scripts/workflowai-quality-gates.json
pwsh -File "./scripts/workflowai-guardrails.ps1" -ProjectPath .
```

## Workflow-pack evaluation layer

Для изменений в самом pack используй:

1. [`agent-evaluation-lifecycle.md`](agent-evaluation-lifecycle.md:1)
2. [`workflow-evals.md`](workflow-evals.md:1)
3. [`../rules/review-feedback-policy.md`](../rules/review-feedback-policy.md:1)
4. [`../rules/verification-before-completion.md`](../rules/verification-before-completion.md:1)

Это doc/process eval, а не CI runner requirement.

## Close-out discipline

1. Review comments MUST be triaged, not blindly accepted.
2. Scope-changing feedback MUST reopen or update the protocol before implementation proceeds.
3. `done`/`ready`/`merged` claims MUST have fresh verification for the current state.
4. Docs-only workflow-pack changes use docs/evidence self-check instead of invented runtime gates.

## Optional hooks

Hooks MAY использоваться в consuming project как early blocker, но core policy живёт в SoT docs и CI. Use them as optional automation mirrored from [`../patterns/orchestration/agent-guardrails.md`](../patterns/orchestration/agent-guardrails.md:1).

## References

- [`../rules/quality-gates.md`](../rules/quality-gates.md:1)
- [`../rules/review-feedback-policy.md`](../rules/review-feedback-policy.md:1)
- [`../rules/verification-before-completion.md`](../rules/verification-before-completion.md:1)
- [`../templates/quality-gates/`](../templates/quality-gates/)
- [`project-setup.md`](project-setup.md:1)
- [`agent-evaluation-lifecycle.md`](agent-evaluation-lifecycle.md:1)
- [`workflow-evals.md`](workflow-evals.md:1)
