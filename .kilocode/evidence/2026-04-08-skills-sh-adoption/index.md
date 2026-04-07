# Evidence: curated skills.sh adoption

## Summary

This bundle records the upstream source URLs, retrieval date, local adaptation decisions, and risk notes for the `skills-sh-*` bridge skills added to WorkFlowAI on 2026-04-08.

General source notes:

- Registry homepage: `https://skills.sh/`
- Docs and installation/safety guidance: `https://skills.sh/docs`
- Official publishers index: `https://skills.sh/official`
- Audit/status index: `https://skills.sh/audits`

Local curation rules used for this adoption:

1. Keep local SoT in `.kilocode/skills/`.
2. Keep upstream references in evidence; do not copy large upstream bodies into bridge skills.
3. Use raw vendor storage only when upstream support files must be preserved unchanged.
4. Preserve local protocol, evidence, routing, and verification rules as the controlling layer.

## Adopted bridge skills

| Local bridge                                 | Upstream source                                                     | Retrieved  | Local adaptation notes                                                                                    | Risk / audit notes                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `skills-sh-writing-plans`                    | `https://skills.sh/obra/superpowers/writing-plans`                  | 2026-04-08 | Routed to `protocol-new.md`, local planning rules, and specialist-first `AGENT` fields.                   | Safe as a bridge because planning remains local and protocol-backed.                     |
| `skills-sh-systematic-debugging`             | `https://skills.sh/obra/superpowers/systematic-debugging`           | 2026-04-08 | Bound to `debug` routing, `quick-diagnosis.md`, and evidence-first diagnosis.                             | Prevents patch-first thrash; fix path still requires local specialist routing.           |
| `skills-sh-verification-before-completion`   | `https://skills.sh/obra/superpowers/verification-before-completion` | 2026-04-08 | Subordinated to local `verification-before-completion.md` and `protocol-review-merge.md`.                 | Explicitly blocks stale success claims; does not replace quality gates.                  |
| `skills-sh-dispatching-parallel-agents`      | `https://skills.sh/obra/superpowers/dispatching-parallel-agents`    | 2026-04-08 | Requires local `CONTEXT HANDOFF`, `Result Contract`, and degraded-mode fallback.                          | Parallelism is constrained by local ownership and overlap rules.                         |
| `skills-sh-subagent-driven-development`      | `https://skills.sh/obra/superpowers/subagent-driven-development`    | 2026-04-08 | Limited to decision-complete plans and runtimes that explicitly allow delegation.                         | Prevents subagent use as a substitute for planning or narrow specialists.                |
| `skills-sh-using-git-worktrees`              | `https://skills.sh/obra/superpowers/using-git-worktrees`            | 2026-04-08 | Adapted to local git workflow, PowerShell-safe commands, and `pre-action-check.md`.                       | Worktrees remain optional; cleanup stays behind local safety checks.                     |
| `skills-sh-codex-readiness-unit-test`        | `https://skills.sh/openai/skills/codex-readiness-unit-test`         | 2026-04-08 | Reframed as repo-readiness evaluation layered on local `project-tests` and `quality-gates`.               | Avoids replacing normal test execution flow.                                             |
| `skills-sh-codex-readiness-integration-test` | `https://skills.sh/openai/skills/codex-readiness-integration-test`  | 2026-04-08 | Reframed as integration-readiness evaluation without introducing repo-local harness artifacts by default. | Guards against overfitting the pack to one external harness pattern.                     |
| `skills-sh-gh-fix-ci`                        | `https://skills.sh/openai/skills/gh-fix-ci`                         | 2026-04-08 | Constrained to GitHub Actions and tied back to local git, security, and pre-action checks.                | Does not authorize push, deploy, or secret operations by itself.                         |
| `skills-sh-skill-creator`                    | `https://skills.sh/anthropics/skills/skill-creator`                 | 2026-04-08 | Redirected to `.kilocode/skills/`, `create-new-skill.md`, and local index maintenance.                    | Keeps reusable-skill creation local and evidence-backed instead of upstream-copy driven. |

## Deferred candidates

These skills were evaluated as potentially useful but intentionally deferred from wave 1:

- `webapp-testing`
- `differential-review`
- `property-based-testing`
- `n8n-conventions`
- `spec-driven-development`

## Audit posture

`skills.sh` exposes both official publishers and an audits/status surface, but the registry still requires local review before adoption. This curation therefore treats upstream skills as inspiration plus evidence, while local bridge skills remain the operational SoT for WorkFlowAI.
