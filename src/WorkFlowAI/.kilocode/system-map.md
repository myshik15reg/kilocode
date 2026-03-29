# AlfaFlowAI System Map

Purpose: explain the structure of the workflow pack, its runtime corridor, and where maintainers should look for stable source-of-truth documents.

## Runtime entrypoints

| Audience | Entry point | Purpose |
|---|---|---|
| Agent | [`../AGENTS.md`](../AGENTS.md:1) | startup corridor and non-negotiables |
| Agent | [`QUICK.md`](QUICK.md:1) | compact startup rules |
| Agent | [`memory-bank/index.md`](memory-bank/index.md:1) | workspace context model |
| Agent | [`workflows/quickref.md`](workflows/quickref.md:1) | operational workflow menu |
| Maintainer | [`../docs/audit-map.md`](../docs/audit-map.md:1) | cleanup status and legacy map |

## Directory roles

| Path | Role |
|---|---|
| `.kilocode/memory-bank/` | workspace context templates and guidance |
| `.kilocode/rules/` | normative rules and thin wrappers |
| `.kilocode/workflows/` | operational workflows and command targets |
| `.kilocode/patterns/` | reusable implementation and orchestration patterns |
| `.kilocode/skills/` | reusable instruction packs in `SKILL.md` |
| `.kilocode/modes/` | runtime mode documentation and summaries |
| `.protocols/` | template-safe protocol placeholders only |
| `docs/` | maintainer-facing notes and audit artifacts |

## Core source-of-truth map

| Topic | Source |
|---|---|
| Terminology | [`rules/terminology.md`](rules/terminology.md:1) |
| Routing | [`rules/agent-routing.md`](rules/agent-routing.md:1) |
| Handoff | [`patterns/orchestration/context-handoff.md`](patterns/orchestration/context-handoff.md:1) |
| Protocol lifecycle | [`workflows/protocol-new.md`](workflows/protocol-new.md:1), [`workflows/protocol-resume.md`](workflows/protocol-resume.md:1), [`workflows/protocol-review-merge.md`](workflows/protocol-review-merge.md:1) |
| Modes | [`modes/REGISTRY.md`](modes/REGISTRY.md:1), [`.kilocodemodes`](../.kilocodemodes:1) |
| Skills index | [`skills/index.md`](skills/index.md:1) |
| Audit status | [`../docs/audit-map.md`](../docs/audit-map.md:1) |

## Maintenance guidance

1. Keep startup and routing docs compact.
2. Prefer source-of-truth links over duplicated explanations.
3. Treat dated protocol folders in `WorkFlowAI/.protocols/` as template contamination.
4. Use the audit map to decide whether to clean, archive, or ignore a legacy file.
