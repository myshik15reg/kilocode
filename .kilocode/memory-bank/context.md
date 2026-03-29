# Context

## What changed

- Audited WorkFlowAI slash commands, especially `/init-memory-bank`, and confirmed parser/installer integration.
- Hardened the architecture boundary: `WorkFlowAI` is template-only, while live Memory Bank and protocols belong to the current workspace.
- Added `.gitignore` rules to keep live protocol folders out of version control while preserving `.protocols/README.md` and `.protocols/index.md`.
- Fixed the `webview-ui` build regression around `AlfaCodeSettings` typing/tests so validation works again.
- Reworked code index configuration around a `Qdrant-first` model with optional `Neo4j` and optional reranker.
- Moved tree-sitter grammar sources out of repo root into `tools/tree-sitter-grammars`.
- Made vector store names workspace-scoped and manual-only; indexing should stay blocked until the user provides a project-specific name.
- Confirmed local integration with `Qdrant`, `Neo4j`, LiteLLM `bge-m3`, and LiteLLM `bge-reranker-v2-m3`.
- Polished settings layout for both `AlfaCodeSettings` and `CodeIndexPopover` so related cards align consistently.

## Risks / follow-ups

- `WorkFlowAI` docs and pack docs must stay aligned with runtime discovery rules.
- Future changes to settings props/tests can reintroduce UI build drift if component and test types diverge.
- `CodeIndexPopover` still emits many Vite browser-external warnings from shared `src/` imports during build, even though the build succeeds.

## Next step

Use this root Memory Bank as the live source of project context for future non-trivial tasks in this workspace, especially for code index/storage/graph work.

## WorkflowAI full audit update

- Ran a recursive audit across the full `WorkFlowAI/` tree and classified high-confidence issues.
- Fixed workflow overlap between `close-protocol` and `protocol-review-merge` to make protocol closure more autonomous and less ambiguous.
- Replaced non-portable legacy content in `effort-estimation-human-hours` with a workspace-safe estimation flow.
- Normalized several high-traffic template files and documented legacy residue inside `WorkFlowAI/.protocols/`.
- Completed a second cleanup wave for runtime-critical docs: routing, roles, skills index, mode index, handoff protocol, protocol lifecycle workflows, Memory Bank usage, and terminology.
- Reduced startup ambiguity and token waste by turning several noisy legacy docs into compact source-of-truth corridors aligned with current AlfaCode behavior.
- Revalidated the pack sync path and targeted WorkflowAI installer/slash-command tests after the cleanup.

## Remaining known issue

- Many files inside `WorkFlowAI/` still contain mojibake or legacy content, but most are low-traffic reference material rather than runtime-critical entrypoints.
- A dated legacy protocol folder still physically exists inside `WorkFlowAI/.protocols/`; policy blocked automatic removal during this run.

## WorkflowAI third-wave cleanup update

- Cleaned additional long-tail but behavior-relevant docs around orchestration, onboarding, repo hygiene, script entrypoints, delegation examples, and deferred backlog handling.
- Removed another layer of legacy mojibake and non-portable guidance from `agent-orchestration`, `overview`, `first-time-setup`, `scripts-entrypoints`, `mode-delegation-example`, `repo-hygiene`, `skills-index`, `defer`, and `README`.
- Replaced Claude-specific backlog path assumptions in `defer` with a portable workspace-first fallback model.
- Revalidated WorkflowAI pack sync and targeted installer/slash-command tests after the third-wave cleanup.
- Remaining legacy content is now concentrated mostly in deep reference material, secondary workflows, and domain-heavy docs rather than startup-critical corridors.

## WorkflowAI fourth-wave cleanup update

- Cleaned another operational layer: `failure-recovery`, `hotfix-emergency`, `quality-enforcement`, `waiver-workflow`, `quality-gates`, `tool-usage-guide`, and `agents-guide`.
- Reduced contradictions between incident handling, waiver flow, delegation rules, and quality-gate wrappers.
- Shifted several wrappers from rigid noisy wording to compact source-of-truth routing that is easier for agents to follow with lower token cost.
- Revalidated pack sync and targeted WorkflowAI validation tests after the fourth-wave cleanup.
- Remaining cleanup is now mostly a long-tail content problem in secondary domain references, 1C-heavy materials, and some deep skills/docs rather than workflow runtime corridors.

## WorkflowAI fifth-wave mapping update

- Produced a stable maintainer audit map at `WorkFlowAI/docs/audit-map.md` with four status buckets: `clean-core`, `clean-secondary`, `legacy-low-risk`, and `archive-candidate`.
- Normalized `WorkFlowAI/.kilocode/system-map.md` so future cleanup can reference an explicit structure and ownership map instead of relying on scattered notes.
- Added `WorkFlowAI/docs/README.md` to separate maintainer-only audit artifacts from the runtime startup corridor.
- The remaining cleanup scope is now explicitly bounded and easier to prioritize in future waves.

## WorkflowAI sixth-wave archive update

- Attempted to physically remove the dated legacy protocol folder under `WorkFlowAI/.protocols/`, but filesystem policy blocked the delete operation in this run.
- Converted the audit map into a practical shortlist with `safe to delete`, `safe to move out of pack`, and `rewrite later only if needed` sections.
- This leaves one known physical residue item, but it is now explicitly quarantined in documentation and excluded from the recommended runtime model.

## WorkflowAI seventh-wave rewrite update

- Rewrote the next highest-value remaining guidance docs: `quick-fix`, `deep-analysis`, `refactoring-workflow`, `mode-selection`, and `orchestrator-guide`.
- These files were strong token and behavior multipliers, so cleaning them further reduced ambiguity in routing, analysis depth, and small-change execution.
- Updated the audit map to move this set out of the rewrite backlog and into cleaned secondary status.

## WorkflowAI eighth-wave rewrite update

- Rewrote the next operational set: `dependency-management`, `documentation-workflow`, `migration-workflow`, `orchestration-troubleshooting`, and `testing-detailed`.
- This reduced another layer of token-heavy legacy guidance in planning, migration, dependency safety, and testing behavior.
- Updated the audit map to move this set out of the rewrite backlog and into cleaned secondary status.

## WorkflowAI ninth-wave rewrite update

- Rewrote another universal long-tail set: `create-new-skill`, `text-normalization`, `update-indexes`, `project-tests`, and `load-context`.
- This removed more non-portable and token-heavy guidance from generic skills and maintenance workflows used across many repositories.
- Updated the audit map to move this set into cleaned secondary status.

## WorkflowAI tenth-wave 1C entry update

- Rewrote the 1C entry-layer: the 1C wrapper rule, 1C testing workflow, 1C SDLC overview, 1C patterns index, and the main 1C workflow skill.
- This did not attempt to rewrite the full deep 1C reference corpus, but it significantly improved the first-hop routing and onboarding path for 1C tasks.
- Updated the audit map to move this 1C entry set into cleaned secondary status while leaving deeper 1C materials in the legacy cluster.

## WorkflowAI eleventh-wave deep 1C update

- Rewrote the first deep 1C reference cluster around KD3, RabbitMQ, and JSON contracts into compact, portable guidance.
- This reduced a large amount of 1C-specific legacy noise while preserving the main operational safety reminders for integrations and contract work.
- Updated the audit map to move this set into cleaned secondary status.

## WorkflowAI twelfth-wave deep 1C update

- Rewrote the next deep 1C specialist set around access control, storage workflow, HTTP services, BPM, and the 1C language reference entry.
- This further reduced the 1C legacy cluster while keeping the remaining deep material focused on genuinely niche references.
- Updated the audit map to move this set into cleaned secondary status.

## WorkflowAI thirteenth-wave general cleanup update

- Rewrote another high-impact general cluster: anti-patterns, CLI compatibility, tech-stack detection, MCP usage, and the core testing/code/pattern indexes.
- This further reduced the non-1C legacy surface that still influenced agent behavior across all repositories.
- Updated the audit map to move this set into cleaned secondary status.

## WorkflowAI fourteenth-wave general cleanup update

- Rewrote another general-tail cluster: roles-guide, ui-ux-roles, task-solution, protocol-examples, quick-diagnosis, styleguide, and vibe-coding.
- This reduced another layer of noisy secondary guidance that still shaped task framing and execution style across repositories.
- Updated the audit map to move this set into cleaned secondary status.

## WorkflowAI fifteenth-wave full-tail cleanup update

- Completed another recursive cleanup pass across the remaining high-impact `WorkFlowAI` tail.
- Rewrote the remaining noisy behavior-relevant docs around OpenSpec, Beads task tracking, 1C extension hotfixes, Swagger publication, SDLC, storage, and traceability.
- Rewrote the remaining noisy shared references for handoff templates, `jdocstring`, MySQL, Nuxt, Tailwind, and the `humanizer-ru` skill into compact source-of-truth guidance.
- Confirmed the canonical delegation path stays `new_task`; no legacy `switch_mode` or `new_tast` residue remains in the active workflow/rules/skills/patterns set.
- The practical residual risk inside `WorkFlowAI` is now mostly archival or deep reference material, not startup-critical runtime guidance.

## WorkflowAI integration fix update

- Fixed a real installer gap: pack-managed slash commands under `~/.kilocode/commands/` now update on reinstall/sync instead of getting stuck on the first installed version.
- Preserved user-owned custom commands in the same directory; only commands shipped by the pack are refreshed.
- Added a regression test to verify managed command overwrite plus custom-command preservation.

## WorkflowAI prompt dedup update

- Removed fallback injection of global template `AGENTS.md` into custom instructions when the workspace has no local `AGENTS.md`.
- This avoids duplicating the built-in AlfaCode workflow section in the system prompt and reduces startup token waste.
- Clarified prompt wording so `switch_mode` is treated as direct in-session switching, while `new_task` remains the preferred real handoff path.
