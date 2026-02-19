# Rules index (navigation)

Назначение: дать стабильные ссылки на SoT и wrappers без дублирования требований. Нормативная рамка и требования к документам: [`docs-standards.md`](docs-standards.md:1).

## Core SoT (read first)

| Topic               | SoT                                                                    |
| ------------------- | ---------------------------------------------------------------------- |
| Terminology         | [`terminology.md`](terminology.md:1)                                   |
| Evidence            | [`evidence-rules.md`](evidence-rules.md:1)                             |
| Docs standards      | [`docs-standards.md`](docs-standards.md:1)                             |
| Agent routing       | [`agent-routing.md`](agent-routing.md:1)                               |
| Scripts entrypoints | [`scripts-entrypoints.md`](../workflows/scripts-entrypoints.md:1)      |
| Handoff protocol    | [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1) |
| Mode selection      | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)       |

## Core rules (always loaded)

| Rule                                               | Purpose                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| [`safety.md`](safety.md:1)                         | Safety protocols and Memory Bank protection    |
| [`quality-gates-core.md`](quality-gates-core.md:1) | Key quality metrics (100% coverage, lint, TDD) |
| [`concepts-core.md`](concepts-core.md:1)           | Core concepts (Memory Bank, Protocols, Agents) |

## Mode-specific rules (runtime-loaded)

| Mode         | Location                                                                    | Note                                 |
| ------------ | --------------------------------------------------------------------------- | ------------------------------------ |
| Orchestrator | [`rules-orchestrator/delegation.md`](../rules-orchestrator/delegation.md:1) | Delegation and specialist-first      |
| Architect    | [`rules-architect/planning.md`](../rules-architect/planning.md:1)           | Protocol planning and docs-only flow |
| Code         | [`rules-code/testing.md`](../rules-code/testing.md:1)                       | TDD + coverage requirements          |
| Code         | [`rules-code/git-workflow.md`](../rules-code/git-workflow.md:1)             | Conventional commits and branch flow |

## Thin wrappers (stable links)

Wrappers MUST быть тонкими и ссылаться на SoT. См. правило 2 в [`docs-standards.md`](docs-standards.md:1).

| Wrapper                                                | SoT                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [`quality-gates.md`](quality-gates.md:1)               | [`quality-gates/SKILL.md`](../skills/quality-gates/SKILL.md:1)                                                           |
| [`testing-rules.md`](testing-rules.md:1)               | [`testing-detailed/SKILL.md`](../skills/testing-detailed/SKILL.md:1)                                                     |
| [`security-rules.md`](security-rules.md:1)             | [`security-audit/SKILL.md`](../skills/security-audit/SKILL.md:1) and [`security.md`](../patterns/security/security.md:1) |
| [`git-workflow-rules.md`](git-workflow-rules.md:1)     | [`git-workflow/SKILL.md`](../skills/git-workflow/SKILL.md:1)                                                             |
| [`orchestrator-guide.md`](orchestrator-guide.md:1)     | [`orchestrator-guide/SKILL.md`](../skills/orchestrator-guide/SKILL.md:1)                                                 |
| [`tool-access-matrix.md`](tool-access-matrix.md:1)     | [`tool-access/SKILL.md`](../skills/tool-access/SKILL.md:1)                                                               |
| [`mode-selection-guide.md`](mode-selection-guide.md:1) | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)                                                         |
| [`agents-guide.md`](agents-guide.md:1)                 | [`agents-guide/SKILL.md`](../skills/agents-guide/SKILL.md:1)                                                             |
| [`mcp-usage-guide.md`](mcp-usage-guide.md:1)           | [`mcp-usage/SKILL.md`](../skills/mcp-usage/SKILL.md:1)                                                                   |
| [`anti-patterns.md`](anti-patterns.md:1)               | [`anti-patterns/SKILL.md`](../skills/anti-patterns/SKILL.md:1)                                                           |
| [`roles.md`](roles.md:1)                               | [`roles-guide/SKILL.md`](../skills/roles-guide/SKILL.md:1)                                                               |
| [`tool-usage-guide.md`](tool-usage-guide.md:1)         | [`tool-access-matrix.md`](tool-access-matrix.md:1) and [`ai-execution-rules.md`](ai-execution-rules.md:1)                |
| [`context-tiers.md`](context-tiers.md:1)               | [`context-tiers/SKILL.md`](../skills/context-tiers/SKILL.md:1)                                                           |
| [`1c-workflow.md`](1c-workflow.md:1)                   | [`1c-workflow/SKILL.md`](../skills/1c-workflow/SKILL.md:1)                                                               |

## Supporting references

| Topic               | File                                                           |
| ------------------- | -------------------------------------------------------------- |
| OWASP mindset       | [`security-rules.md`](security-rules.md:1)                     |
| Unix conventions    | [`environment-unix.md`](environment-unix.md:1)                 |
| Windows conventions | [`environment-windows.md`](environment-windows.md:1)           |
| Memory Bank usage   | [`memory-bank-instructions.md`](memory-bank-instructions.md:1) |
| FAQ                 | [`faq.md`](faq.md:1)                                           |
