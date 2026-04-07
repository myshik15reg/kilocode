# Rules index (navigation)

Назначение: дать стабильные ссылки на SoT и wrappers без дублирования требований. Нормативная рамка и требования к документам: [`docs-standards.md`](docs-standards.md:1).

## Core SoT (read first when writing rules)

| Topic                          | SoT                                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| Terminology                    | [`terminology.md`](terminology.md:1)                                       |
| Evidence                       | [`evidence-rules.md`](evidence-rules.md:1)                                 |
| Docs standards                 | [`docs-standards.md`](docs-standards.md:1)                                 |
| Язык и кодировка               | [`language-and-encoding.md`](language-and-encoding.md:1)                   |
| Handoff protocol               | [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1)     |
| Result contract                | [`result-contract.md`](../patterns/orchestration/result-contract.md:1)     |
| Integration typing             | [`integration-types.md`](../patterns/orchestration/integration-types.md:1) |
| Workflow prompt writing        | [`workflow-prompt-writing.md`](workflow-prompt-writing.md:1)               |
| Memory write policy            | [`memory-write-policy.md`](memory-write-policy.md:1)                       |
| Review feedback policy         | [`review-feedback-policy.md`](review-feedback-policy.md:1)                 |
| Verification before completion | [`verification-before-completion.md`](verification-before-completion.md:1) |
| Mode selection                 | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)           |

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
| [`skills-index.md`](skills-index.md:1)                 | [`index.md`](../skills/index.md:1)                                                                                       |
| [`anti-patterns.md`](anti-patterns.md:1)               | [`anti-patterns/SKILL.md`](../skills/anti-patterns/SKILL.md:1)                                                           |

## Mode-specific rules (runtime-loaded)

| Mode         | Location                                                                    | Note                                          |
| ------------ | --------------------------------------------------------------------------- | --------------------------------------------- |
| Orchestrator | [`rules-orchestrator/delegation.md`](../rules-orchestrator/delegation.md:1) | Must follow zero-analytics + specialist-first |
| Architect    | [`rules-architect/planning.md`](../rules-architect/planning.md:1)           | Protocol creation and documentation           |
| Code         | [`rules-code/testing.md`](../rules-code/testing.md:1)                       | TDD + coverage requirements                   |
