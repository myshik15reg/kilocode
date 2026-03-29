# Quick Reference (menu)

Purpose: fast selection of process, mode, and source-of-truth links. This file MUST stay short and operational. Documentation standard: [`docs-standards.md`](../rules/docs-standards.md:1).

## Minimal task start

1. Read [`memory-bank/index.md`](../memory-bank/index.md:1) and [`context.md`](../memory-bank/context.md:1), then confirm `[MB: OK]`.
2. Prime context: [`context-priming.md`](context-priming.md:1).
3. Clean the task contract: [`brief-refinement.md`](brief-refinement.md:1).
4. If the repository changes, create a protocol: [`protocol-new.md`](protocol-new.md:1).
5. If needed, shape target-state and execution artifacts: [`spec-plans-generation.md`](spec-plans-generation.md:1).
6. Select mode by SoT: [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1).
7. Delegate by SoT: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
8. Close the protocol by [`protocol-review-merge.md`](protocol-review-merge.md:1).

## Mode selection (80/20)

| Situation | Mode | Source |
|---|---|---|
| Planning, protocol, docs-only | `architect` | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Multi-step coordination | `orchestrator` | [`agent-routing.md`](../rules/agent-routing.md:1) |
| Implementation | narrowest `*-dev/*-specialist`, else `code` | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Unknown-cause bug | `debug` | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Known-cause fix | `code-fixer` or specialist dev | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1) |
| Testing | `unit-tester` / `integration-tester` / `e2e-tester` | [`testing-rules.md`](../rules/testing-rules.md:1) |
| Review | `reviewer` | [`roles.md`](../rules/roles.md:1) |
| 1C | `1c-orchestrator` | [`REGISTRY.md`](../modes/REGISTRY.md:268) |

## Workflow menu

Slash command note: runtime slash commands are discovered from [`.kilocode/commands/`](../commands/:1). Those command files point back to workflows in this directory.

| Need | Run |
|---|---|
| Initialize or repair Memory Bank | `/init-memory-bank.md` |
| Refine task brief | `/brief-refinement.md` |
| Shape `Spec` and `Plans` | `/spec-plans-generation.md` |
| FAST PATH micro-change | `/quick-fix.md` |
| New protocol | `/protocol-new.md` |
| Resume protocol | `/protocol-resume.md` |
| Review / merge / close | `/protocol-review-merge.md` |
| Incident / hotfix | `/hotfix-emergency.md` |
| Failure recovery | `/failure-recovery.md` |
| Quality gates setup | `/quality-enforcement.md` |
| Project setup | `/project-setup.md` |
| Global install | `/global-install.md` |
| Multi-agent orchestration | `/agent-orchestration.md` |

## References

| Topic | Link |
|---|---|
| Entry points | [`AGENTS.md`](../../AGENTS.md:1), [`QUICK.md`](../QUICK.md:1) |
| Quality gates | [`quality-gates.md`](../rules/quality-gates.md:1), [`testing-rules.md`](../rules/testing-rules.md:1), [`waiver-workflow.md`](waiver-workflow.md:1) |
| Script paths | [`scripts-entrypoints.md`](scripts-entrypoints.md:1) |
| Rules index | [`rules/index.md`](../rules/index.md:1) |
| System map | [`system-map.md`](../system-map.md:1) |


