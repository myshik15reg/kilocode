# WorkFlowAI Audit Map

Purpose: keep a stable map of what parts of `WorkFlowAI` are already normalized, what still contains legacy residue, and what should be archived, moved, or removed later.

This file is a maintainer artifact for the workflow pack itself.
It is not part of the runtime startup corridor for consuming projects.

## Status legend

| Status              | Meaning                                                        |
| ------------------- | -------------------------------------------------------------- |
| `clean-core`        | normalized and suitable for runtime-critical use               |
| `clean-secondary`   | cleaned enough for normal use, but not startup-critical        |
| `legacy-low-risk`   | still deep reference material with low runtime impact          |
| `archive-candidate` | removable, replaceable, or better moved out of the active pack |

## Clean core

These areas directly affect routing, startup, portability, protocol lifecycle, and token cost.

### Entry corridor

- `WorkFlowAI/AGENTS.md`
- `WorkFlowAI/README.md`
- `WorkFlowAI/.kilocode/QUICK.md`
- `WorkFlowAI/.kilocode/memory-bank/index.md`
- `WorkFlowAI/.kilocode/workflows/index.md`
- `WorkFlowAI/.kilocode/workflows/quickref.md`

### Core rules and routing

- `WorkFlowAI/.kilocode/rules/index.md`
- `WorkFlowAI/.kilocode/rules/project-rules.md`
- `WorkFlowAI/.kilocode/rules/terminology.md`
- `WorkFlowAI/.kilocode/rules/memory-bank-instructions.md`
- `WorkFlowAI/.kilocode/rules/agent-routing.md`
- `WorkFlowAI/.kilocode/rules/roles.md`
- `WorkFlowAI/.kilocode/rules/quality-gates.md`
- `WorkFlowAI/.kilocode/rules/tool-usage-guide.md`
- `WorkFlowAI/.kilocode/rules/agents-guide.md`
- `WorkFlowAI/.kilocode/rules/repo-hygiene.md`
- `WorkFlowAI/.kilocode/rules/skills-index.md`
- `WorkFlowAI/.kilocode/rules/mode-delegation-example.md`

### Core orchestration and protocol flow

- `WorkFlowAI/.kilocode/patterns/orchestration/context-handoff.md`
- `WorkFlowAI/.kilocode/workflows/context-priming.md`
- `WorkFlowAI/.kilocode/workflows/protocol-new.md`
- `WorkFlowAI/.kilocode/workflows/protocol-resume.md`
- `WorkFlowAI/.kilocode/workflows/protocol-review-merge.md`
- `WorkFlowAI/.kilocode/workflows/close-protocol.md`
- `WorkFlowAI/.kilocode/workflows/agent-orchestration.md`
- `WorkFlowAI/.kilocode/workflows/failure-recovery.md`
- `WorkFlowAI/.kilocode/workflows/hotfix-emergency.md`
- `WorkFlowAI/.kilocode/workflows/quality-enforcement.md`
- `WorkFlowAI/.kilocode/workflows/waiver-workflow.md`

### Core mode and skill navigation

- `WorkFlowAI/.kilocode/modes/index.md`
- `WorkFlowAI/.kilocode/modes/REGISTRY.md`
- `WorkFlowAI/.kilocode/modes/kilocodemodes-edit-spec.md`
- `WorkFlowAI/.kilocode/skills/index.md`

## Clean secondary

These files were improved enough to be useful, but they are not the first runtime documents an agent depends on.

### General workflows and skills

- `WorkFlowAI/.kilocode/workflows/overview.md`
- `WorkFlowAI/.kilocode/workflows/first-time-setup.md`
- `WorkFlowAI/.kilocode/workflows/scripts-entrypoints.md`
- `WorkFlowAI/.kilocode/workflows/quick-fix.md`
- `WorkFlowAI/.kilocode/workflows/deep-analysis.md`
- `WorkFlowAI/.kilocode/workflows/refactoring-workflow.md`
- `WorkFlowAI/.kilocode/workflows/dependency-management.md`
- `WorkFlowAI/.kilocode/workflows/documentation-workflow.md`
- `WorkFlowAI/.kilocode/workflows/migration-workflow.md`
- `WorkFlowAI/.kilocode/workflows/orchestration-troubleshooting.md`
- `WorkFlowAI/.kilocode/workflows/create-new-skill.md`
- `WorkFlowAI/.kilocode/workflows/text-normalization.md`
- `WorkFlowAI/.kilocode/workflows/update-indexes.md`
- `WorkFlowAI/.kilocode/workflows/protocol-examples.md`
- `WorkFlowAI/.kilocode/workflows/quick-diagnosis.md`
- `WorkFlowAI/.kilocode/workflows/styleguide.md`
- `WorkFlowAI/.kilocode/workflows/vibe-coding.md`
- `WorkFlowAI/.kilocode/workflows/beads-task-tracking.md`
- `WorkFlowAI/.kilocode/workflows/openspec-apply.md`
- `WorkFlowAI/.kilocode/workflows/openspec-archive.md`
- `WorkFlowAI/.kilocode/workflows/openspec-change-workflow.md`
- `WorkFlowAI/.kilocode/workflows/openspec-proposal.md`
- `WorkFlowAI/.kilocode/skills/defer/SKILL.md`
- `WorkFlowAI/.kilocode/skills/effort-estimation-human-hours/SKILL.md`
- `WorkFlowAI/.kilocode/skills/fix-broken-links/SKILL.md`
- `WorkFlowAI/.kilocode/skills/mode-selection/SKILL.md`
- `WorkFlowAI/.kilocode/skills/orchestrator-guide/SKILL.md`
- `WorkFlowAI/.kilocode/skills/testing-detailed/SKILL.md`
- `WorkFlowAI/.kilocode/skills/project-tests/SKILL.md`
- `WorkFlowAI/.kilocode/skills/load-context/SKILL.md`
- `WorkFlowAI/.kilocode/skills/anti-patterns/SKILL.md`
- `WorkFlowAI/.kilocode/skills/cli-compatibility/SKILL.md`
- `WorkFlowAI/.kilocode/skills/detect-tech-stack/SKILL.md`
- `WorkFlowAI/.kilocode/skills/mcp-usage/SKILL.md`
- `WorkFlowAI/.kilocode/skills/roles-guide/SKILL.md`
- `WorkFlowAI/.kilocode/skills/ui-ux-roles/SKILL.md`
- `WorkFlowAI/.kilocode/skills/task-solution/SKILL.md`
- `WorkFlowAI/.kilocode/skills/humanizer-ru/SKILL.md`

### Patterns and references now normalized

- `WorkFlowAI/.kilocode/system-map.md`
- `WorkFlowAI/.protocols/index.md`
- `WorkFlowAI/.kilocode/patterns/testing.md`
- `WorkFlowAI/.kilocode/patterns/code-standards.md`
- `WorkFlowAI/.kilocode/patterns/index.md`
- `WorkFlowAI/.kilocode/patterns/languages/index.md`
- `WorkFlowAI/.kilocode/patterns/1c/handoff-templates.md`
- `WorkFlowAI/.kilocode/patterns/1c/jdocstring.md`
- `WorkFlowAI/.kilocode/patterns/databases/mysql.md`
- `WorkFlowAI/.kilocode/patterns/frontend/frameworks/nuxtjs.md`
- `WorkFlowAI/.kilocode/patterns/frontend/tailwind.md`

### 1C workflows and skills normalized

- `WorkFlowAI/.kilocode/workflows/1c-testing-workflow.md`
- `WorkFlowAI/.kilocode/workflows/1c-full-sdlc.md`
- `WorkFlowAI/.kilocode/workflows/1c-alfa-extension-hotfix.md`
- `WorkFlowAI/.kilocode/workflows/1c-alfa-http-swagger.md`
- `WorkFlowAI/.kilocode/workflows/1c-alfa-sdlc.md`
- `WorkFlowAI/.kilocode/workflows/1c-alfa-storage.md`
- `WorkFlowAI/.kilocode/workflows/1c-alfa-traceability.md`
- `WorkFlowAI/.kilocode/patterns/1c/index.md`
- `WorkFlowAI/.kilocode/patterns/languages/1c.md`
- `WorkFlowAI/.kilocode/skills/1c-workflow/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-kd3/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-rabbitmq/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-json-contracts/SKILL.md`
- `WorkFlowAI/.kilocode/patterns/1c/kd3.md`
- `WorkFlowAI/.kilocode/patterns/1c/rabbitmq.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-access-control/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-storage/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-http-services/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-bpm/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-template-generator/SKILL.md`
- `WorkFlowAI/.kilocode/skills/1c-alfa-traceability/SKILL.md`

## Legacy low risk

These areas are now mostly deep references or optional docs. They may still be worth future trimming, but they are not blocking runtime quality.

- selected language/framework reference files not used in the startup corridor
- maintainer notes that do not influence routing or slash-command execution
- deep source snapshots under `WorkFlowAI/.kilocode/sources/`

## Archive candidates

These items should be considered for later removal, relocation, or stronger quarantine.

- `WorkFlowAI/.protocols/2026-03-07-workflowai-audit-optimization/` - legacy dated protocol residue inside the template pack; safe-delete in principle, but physical deletion was blocked during audit runs
- any future dated folders under `WorkFlowAI/.protocols/` - not valid template content
- maintainer-only historical audit notes that do not affect runtime behavior
- obsolete workflow docs that duplicate normalized source-of-truth guidance without adding operational value

## Practical shortlist

### Safe to delete

- `WorkFlowAI/.protocols/2026-03-07-workflowai-audit-optimization/` when policy allows removal
- any future dated task folders accidentally committed under `WorkFlowAI/.protocols/`

### Safe to move out of pack

- maintainer-only historical audit notes
- one-off migration notes that do not affect consuming projects

### Rewrite later only if needed

- low-traffic reference docs outside the startup corridor that remain accurate enough for archival use

## Current audit outcome

- Runtime-critical corridor is normalized.
- Slash-command relevant documentation is aligned with current command discovery behavior.
- Workspace-specific state is separated from the template pack.
- Token-heavy legacy noise is now concentrated mostly outside startup-critical paths.
- The main remaining structural issue is the dated legacy protocol folder under `WorkFlowAI/.protocols/`.
