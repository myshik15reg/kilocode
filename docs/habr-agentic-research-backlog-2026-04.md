# Habr Research Memo: Agentic Improvements for AlfaCode assistants

Date: 2026-04-03

## Executive Summary

This memo reviews 8 Habr articles and translates them into a practical backlog for AlfaCode assistants.

Main conclusion:

- the biggest upside for this project is not "more agents", but stronger methodology, smaller work units, better handoff artifacts, stricter verification, and more traceable review;
- the project already has strong building blocks for this: `AGENTS.md`, `.kilocode`, `Memory Bank`, protocol folders, helper routing, subagent orchestration, restart/handoff recovery, `Qdrant + Neo4j + reranker`, and early `pattern-memory`;
- the best next move is a three-wave sequence: `Workflow -> Quality -> Memory`.

Strongest ideas worth adopting:

1. Methodology-first orchestration instead of agent catalog sprawl.
2. Git-backed task artifacts that survive restarts and context compaction.
3. Subagent specialization by role, tools, and cost profile.
4. Structural review and "proof before done".
5. Brownfield-safe autonomy levels instead of one universal agent policy.
6. Diff-aware review UX and explicit iteration control.
7. Hierarchical retrieval as an optional overlay for long structured documents.

Ideas to reject:

- replacing semantic retrieval with PageIndex;
- large monolithic agent packs with heavy maintenance burden;
- deep or wide multi-agent parallelism on unstable tasks;
- treating greenfield-style autonomy as safe for brownfield or regulated work.

## Current Project Snapshot

The current repository already contains the key surfaces needed for these ideas.

### Workflow / orchestration surfaces

- `AGENTS.md`
- `.kilocode/QUICK.md`
- `.kilocode/workflows/index.md`
- `src/core/prompts/sections/alfa-code-workflow.ts`
- `src/core/slash-commands/kilo.ts`
- `src/core/context/instructions/workflows.ts`
- `src/core/orchestration/subagents/SubagentServiceComposition.ts`
- `packages/agent-runtime/src/process.ts`

### Quality / review / recovery surfaces

- `src/__tests__/problematic-process-restart.spec.ts`
- `src/__tests__/provider-delegation.spec.ts`
- `packages/types/src/task-control.ts`
- `src/core/orchestration/task-control/TaskRecoveryPacketService.ts`
- `src/core/orchestration/task-control/TaskRestartService.ts`
- prompt sections and tool surfaces around task completion, restart, and review behavior

### Memory / retrieval surfaces

- `src/services/alfa-code/MemoryBankService.ts`
- `packages/types/src/orchestration-pattern-memory.ts`
- `src/core/orchestration/pattern-memory/OrchestrationPatternMemoryService.ts`
- `src/services/code-index/config-manager.ts`
- `src/services/code-index/orchestrator.ts`
- `src/services/code-index/search-service.ts`
- `src/services/browser/UrlContentFetcher.ts`

The backlog below intentionally builds on these surfaces instead of inventing a parallel architecture.

## Article-by-Article Findings

### 1. `1017110` - 3000+ hours in Claude Code

Source: <https://habr.com/ru/articles/1017110/>

Key ideas:

- methodology matters more than a large local collection of agents;
- mandatory stages like brainstorming, planning, TDD, and verification are more valuable than ad hoc delegation;
- git-backed task tracking survives restart and context compaction;
- context growth reduces the need for aggressive agent sprawl, but does not remove the need for discipline.

Best fit for AlfaCode:

- strengthen the existing workflow contract instead of adding a large new agent catalog;
- make handoff durable through repo artifacts, not only prompt summaries;
- keep helper routing thin and compositional, not monolithic.

What not to copy literally:

- the exact plugin stack;
- the assumption that a larger context window removes the need for careful orchestration.

### 2. `1007842` - VS Code extension for controlled AI workflow

Source: <https://habr.com/ru/articles/1007842/>

Key ideas:

- good AI-assisted development is human-controlled, plan-first, and diff-reviewed;
- if the plan is too large and too many files change, the task needs more decomposition;
- reviewing changes in full editor context is more effective than chat-only diff review;
- file references and explicit context injection improve planning quality.

Best fit for AlfaCode:

- add diff-aware review and chunk-level accept/reject concepts to the UX backlog;
- tighten workflow guidance around "small enough change sets";
- improve plan and context attachment flows in slash-command and workflow surfaces.

What not to copy literally:

- a Cursor-like UI clone;
- the "single human can track only one chat" constraint as a hard product rule.

### 3. `1006602` - Subagents in agent coding

Source: <https://habr.com/ru/articles/1006602/>

Key ideas:

- subagents are useful because of context isolation, parallelism, and specialization;
- specialization should include prompt, model, and tool scope;
- subagent outputs work better when they produce concise summaries and optionally file-backed reports;
- one-level orchestration is easier to reason about than recursive nesting.

Best fit for AlfaCode:

- formalize subagent roles and tool scopes on top of existing delegation and helper routing;
- attach durable markdown handoff artifacts to research/review-heavy subtasks;
- keep depth shallow and use a thin orchestration layer around `new_task`.

What not to copy literally:

- a separate `.claude/agents/`-style subsystem;
- uncontrolled parallel fan-out.

### 4. `1005730` - Good code review as the core AI skill

Source: <https://habr.com/ru/articles/1005730/>

Key ideas:

- the highest-value review question is "is this solving the problem the right way?";
- AI tends to choose overly heavy solutions if no one stops it;
- structural review beats cosmetic review for AI-generated changes;
- the main operator skill is recognizing unnecessary complexity and reusing what already exists.

Best fit for AlfaCode:

- encode structural review prompts and checklists into workflow and completion behavior;
- bias reviewers and recovery flows toward "reuse existing system / simpler path / less new infrastructure";
- classify findings by risk and architectural fit, not only syntax or style.

What not to copy literally:

- a generic "review harder" policy without concrete runtime gates.

### 5. `1005204` - Full vibe-coding guide from idea to release

Source: <https://habr.com/ru/articles/1005204/>

Key ideas that are actually relevant here:

- terminal logs are essential for AI-assisted debugging;
- frequent Git checkpoints reduce the cost of bad iterations;
- markdown documentation and explicit setup guidance reduce ambiguity for non-expert operators;
- one feature branch / one focused unit of work is easier to reason about than parallel feature drift.

Best fit for AlfaCode:

- improve workflow docs and onboarding around terminal-first debugging and Git checkpoints;
- make documentation-backed planning and task context more explicit;
- reuse the article only for practical workflow ergonomics, not as engineering authority.

What not to copy literally:

- the article's broad vibe-coding claims;
- solo-founder shortcuts as a default process for a brownfield monorepo.

### 6. `1002598` - Four stages of refactoring AI code

Source: <https://habr.com/ru/companies/ruvds/articles/1002598/>

Key ideas:

- brownfield AI work needs changing autonomy levels as the codebase matures;
- early-stage or fragile architecture needs human micromanagement and smaller iterations;
- multi-agent execution works poorly on a loose or unstable base;
- explicit domain boundaries matter more than architecture-shaped file names.

Best fit for AlfaCode:

- add a brownfield autonomy ladder to workflow and review policy;
- route fragile tasks toward smaller, review-heavy loops instead of high autonomy;
- use maturity and blast radius to decide whether delegation should be broad, narrow, or avoided.

What not to copy literally:

- four staged refactors as a universal template;
- the assumption that "more agents" helps before architecture stabilizes.

### 7. `1017318` - PageIndex as an alternative to vector search

Source: <https://habr.com/ru/articles/1017318/>

Key ideas:

- TOC/tree-based retrieval gives more traceable reasoning with page and section references;
- the strongest value is on long, structured, document-like sources;
- the approach is resource-heavy and weak as a replacement for large multi-document corpora;
- even PageIndex ends up needing metadata or semantic search once the corpus grows.

Best fit for AlfaCode:

- treat TOC/PageIndex as an optional overlay for long docs: protocols, memory-bank pages, architecture docs, release docs, and fetched documentation;
- use it as a refinement layer after document selection, not as the base retrieval engine.

What not to copy literally:

- replacing `Qdrant`;
- treating PageIndex as the default search strategy for the whole repo.

### 8. `1015004` - AI agents in greenfield, brownfield, and regulated work

Source: <https://habr.com/ru/articles/1015004/>

Key ideas:

- there is no single agentic SDLC that fits all project types;
- brownfield and regulated work need risk-based review and explicit auditability;
- critical changes need stronger human review than utility and support work;
- observability, rollback, and staged rollout are part of the safety envelope.

Best fit for AlfaCode:

- add risk-tiered review policy to runtime and workflow design;
- preserve human accountability and audit trails for high-blast-radius changes;
- map autonomy level to project risk, not only to model capability.

What not to copy literally:

- hard numeric review quotas without project-specific tuning;
- DORA-style metrics as the only decision framework for this product.

## Cross-Cutting Themes

### Theme 1: Methodology beats catalog size

The project already has a workflow system. The high-value move is to make it more binding and more operational:

- clearer mandatory steps;
- smaller unit-of-work discipline;
- more explicit evidence before completion;
- better handoff persistence.

### Theme 2: Durable task memory is more important than bigger prompts

The repository already has:

- protocol folders;
- Memory Bank;
- pattern memory;
- restart/handoff logic.

The next step is to connect them into durable task artifacts rather than relying on chat history and restart summaries alone.

### Theme 3: Review quality is a product feature

For AlfaCode assistants, review is not an optional human habit. It is part of the runtime product behavior:

- what gets delegated;
- what gets summarized;
- when a task can say "done";
- when restart is allowed;
- how the UI presents changes to the user.

### Theme 4: Hierarchical retrieval should be additive

The strongest memory/index opportunity is not a replacement of semantic search, but better document navigation for:

- long markdown workflows;
- protocols and audit logs;
- fetched documentation pages;
- generated task artifacts.

## Prioritized Backlog

The shortlist below is intentionally limited to 9 initiatives.

### Now

#### 1. Unified Workflow Contract v2

- Priority: `Now`
- Why: highest leverage, lowest architectural risk
- What: upgrade the current workflow instructions so every non-trivial task follows a stronger sequence: `understand -> decompose -> implement -> verify -> review -> complete`
- Expected benefit: less ambiguity, fewer oversized edits, lower token waste, better recovery quality
- Failure mode: workflow becomes too verbose and slows straightforward tasks
- Implementation surface: `AGENTS.md`, `.kilocode/QUICK.md`, `.kilocode/workflows/*`, `src/core/prompts/sections/alfa-code-workflow.ts`
- API impact: `no API change`
- Estimated complexity: `S`
- Validation method: run the 5 mandatory scenarios and compare task drift, restart quality, and token usage

#### 2. Git-Backed Task Artifacts and Handoff Reports

- Priority: `Now`
- Why: strongest bridge between workflow, recovery, and memory
- What: make research/review/planning subtasks produce durable markdown artifacts in protocol or task folders, then pass references instead of only prompt summaries
- Expected benefit: better resumability, cheaper restarts, stronger auditability, less prompt bloat
- Failure mode: artifact sprawl without indexing or retention policy
- Implementation surface: protocol folders, `new_task` flow, `TaskRecoveryPacketService`, `TaskRestartService`, `SubagentServiceComposition`
- API impact: `internal only`
- Estimated complexity: `M`
- Validation method: focus on `Recovery scenario` and `Long-context scenario`

#### 3. Subagent Specialization Policy

- Priority: `Now`
- Why: the runtime already supports most of the required primitives
- What: formalize role classes such as `research`, `planner`, `implementer`, `reviewer`, `tester` with default tool scope and helper-profile guidance
- Expected benefit: better task routing, lower cost, safer delegation, clearer handoffs
- Failure mode: role taxonomy becomes decorative and not actually enforced
- Implementation surface: `packages/agent-runtime/src/process.ts`, `src/core/orchestration/subagents/*`, helper routing surfaces, prompt/tool policy
- API impact: `internal only`
- Estimated complexity: `M`
- Validation method: compare `Workflow scenario` and `Recovery scenario` with and without role-scoped routing

### Next

#### 4. Verification-Before-Completion Gate

- Priority: `Next`
- Why: directly addresses false-positive "done" behavior
- What: require explicit proof command selection, fresh execution, output inspection, and evidence attachment before completion on non-trivial tasks
- Expected benefit: fewer false completions, better trust, better restart packet quality
- Failure mode: gate becomes too rigid for docs-only or exploratory work
- Implementation surface: completion prompts, task-control state, recovery packet generation, task history metadata
- API impact: `internal only`
- Estimated complexity: `M`
- Validation method: focus on `Review scenario` and `Brownfield scenario`

#### 5. Risk-Tiered Review Policy

- Priority: `Next`
- Why: strong fit for brownfield and high-blast-radius work
- What: classify work into risk tiers such as `critical`, `business`, `support` and vary review strictness, verification depth, and human approval expectations
- Expected benefit: better operator trust and more proportional process cost
- Failure mode: incorrect risk classification undermines the policy
- Implementation surface: workflow prompts, review tooling, task metadata, UI messaging
- API impact: `user-facing contract change`
- Estimated complexity: `M`
- Validation method: focus on `Review scenario` and `Brownfield scenario`

#### 6. Brownfield Autonomy Ladder

- Priority: `Next`
- Why: aligns agent behavior with subsystem maturity
- What: add guidance and runtime policy for modes like `micromanaged`, `guided`, `component-isolated`, `autonomous` depending on fragility, coupling, and blast radius
- Expected benefit: fewer destructive large-step edits in unstable areas
- Failure mode: the ladder is defined but not connected to routing or review
- Implementation surface: workflow docs, delegation policy, prompt sections, possibly task metadata
- API impact: `no API change` at first, `internal only` if later persisted
- Estimated complexity: `S/M`
- Validation method: focus on `Brownfield scenario`

#### 7. Diff-Aware Review UX

- Priority: `Next`
- Why: critical for human control and iteration clarity
- What: improve UI support for changed-file navigation, per-chunk acceptance/rejection, and explicit "reviewed all changed files" state
- Expected benefit: higher-quality human review and faster iteration loops
- Failure mode: UI adds complexity without enough backend state to support it cleanly
- Implementation surface: `webview-ui`, slash-command surfaces, task history / diff state
- API impact: `user-facing contract change`
- Estimated complexity: `M/L`
- Validation method: focus on `Review scenario`

### Later

#### 8. Hierarchical Retrieval Overlay for Long Documents

- Priority: `Later`
- Why: useful, but only after workflow and verification are stronger
- What: add optional TOC/section-summary indexing for long markdown and fetched-doc pages, then combine it with current semantic retrieval
- Expected benefit: more interpretable retrieval for long, structured content
- Failure mode: expensive index build with weak benefit on ordinary code search
- Implementation surface: `UrlContentFetcher`, code-index ingestion, memory/protocol docs, retrieval pipeline
- API impact: `internal only` initially, `user-facing contract change` if surfaced in settings
- Estimated complexity: `L`
- Validation method: focus on `Long-context scenario`

#### 9. Unified Task Memory Index

- Priority: `Later`
- Why: combines existing Memory Bank, protocol artifacts, and pattern memory
- What: index durable task artifacts, memory-bank pages, and pattern-memory signals into a searchable task-memory layer
- Expected benefit: faster resume, better recommendation quality, less prompt repetition
- Failure mode: memory becomes noisy or stale without lifecycle rules
- Implementation surface: `MemoryBankService`, `OrchestrationPatternMemoryService`, protocol artifacts, code index
- API impact: `internal only`
- Estimated complexity: `L`
- Validation method: focus on `Workflow scenario`, `Recovery scenario`, and `Long-context scenario`

## Recommended Implementation Order

### Wave 1: Workflow

- `Unified Workflow Contract v2`
- `Git-Backed Task Artifacts and Handoff Reports`
- `Subagent Specialization Policy`

Reason:

- these three improve behavior immediately without destabilizing the current architecture;
- they also create the foundation for later quality and memory work.

### Wave 2: Quality

- `Verification-Before-Completion Gate`
- `Risk-Tiered Review Policy`
- `Brownfield Autonomy Ladder`
- `Diff-Aware Review UX`

Reason:

- this wave turns review quality into explicit product behavior;
- it depends on stronger workflow and durable task context.

### Wave 3: Memory

- `Hierarchical Retrieval Overlay for Long Documents`
- `Unified Task Memory Index`

Reason:

- retrieval improvements matter most after task artifacts and review outputs exist;
- otherwise the memory layer indexes too little or the wrong things.

## Public API / Interface Impact Assessment

### `AGENT_CONFIG` and lifecycle / IPC

- Possible future changes: `taskArtifactsRoot`, `handoffPolicyVersion`, `reviewCheckpointMode`, `riskTier`
- Recommended status: `internal only`
- Rationale: these are runtime orchestration concerns and should not become public-facing configuration until proven stable.

### Task-control and handoff types

- Possible future changes: `review-required`, `verification-pending`, `branch-from-review`, richer recovery packet metadata
- Recommended status: `internal only`
- Rationale: types can expand first without exposing new user semantics immediately.

### Slash commands and workflow surfaces

- Possible future changes: `/review-diff`, `/checkpoint`, `/resume-from-plan`, `/research`
- Recommended status: `user-facing contract change`
- Rationale: command names and behavior become part of the operator UX.

### Code-index settings and state contracts

- Possible future changes: long-doc hierarchical indexing, task-memory indexing, explainable retrieval options
- Recommended status: `user-facing contract change`
- Rationale: settings would affect storage, cost, and user expectations.

## Validation Scenarios

Every shortlisted initiative should be evaluated against these 5 scenarios.

### 1. Workflow scenario

- new non-trivial task
- uses protocol + Memory Bank + delegation
- success signal: lower ambiguity, fewer oversized edits, smaller handoff payloads

### 2. Recovery scenario

- a subtask loops or aborts
- success signal: restart summary is clearer, next attempt uses better context, repeated failure rate drops

### 3. Review scenario

- diff contains a realistic behavioral regression
- success signal: the system surfaces the architectural or behavioral risk, not only style issues

### 4. Brownfield scenario

- change touches existing coupled module
- success signal: scope stays narrower, proof burden rises, unsafe autonomy decreases

### 5. Long-context scenario

- large repo or long-running investigation
- success signal: prompt size growth slows down and retrieval remains relevant

## Do Not Adopt

These ideas should stay out of the current roadmap.

### 1. Replace semantic retrieval with PageIndex

Reason:

- current architecture already has a strong semantic baseline;
- PageIndex is promising for long documents, but weak as a base strategy for large multi-document corpora.

### 2. Build a giant local agent catalog

Reason:

- maintenance cost is high;
- the repository already has enough workflow and runtime surfaces to benefit more from stronger discipline than from more templates.

### 3. Make multi-agent parallelism the default

Reason:

- fragile or brownfield work benefits more from constrained loops than from concurrency;
- the article on staged autonomy explicitly argues against this on unstable architecture.

### 4. Apply one autonomy policy to all project types

Reason:

- greenfield, brownfield, and regulated work have different risk envelopes;
- AlfaCode assistants should reflect that instead of flattening them.

### 5. Treat chat history as the main memory layer

Reason:

- the project already has better primitives: protocol files, Memory Bank, pattern memory, and potential task artifacts;
- durable repo-backed memory is more recoverable and cheaper.

## Final Recommendation

If only three items are funded first, they should be:

1. `Unified Workflow Contract v2`
2. `Git-Backed Task Artifacts and Handoff Reports`
3. `Verification-Before-Completion Gate`

This combination gives the best ratio of:

- implementation cost;
- user trust improvement;
- fit with existing architecture;
- long-term leverage for later memory and review features.

## Sources

- <https://habr.com/ru/articles/1017110/>
- <https://habr.com/ru/articles/1007842/>
- <https://habr.com/ru/articles/1006602/>
- <https://habr.com/ru/articles/1005730/>
- <https://habr.com/ru/articles/1005204/>
- <https://habr.com/ru/companies/ruvds/articles/1002598/>
- <https://habr.com/ru/articles/1017318/>
- <https://habr.com/ru/articles/1015004/>
