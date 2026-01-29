# Rules (Optimized)

> WorkFlowAI requires 100% coverage (lines/branches/functions).
> Tiered system: Core Rules (always) + Mode-Specific + Skills (on-demand)

## Core Rules (Always Loaded)
- [`safety.md`](safety.md) - Safety protocols and Memory Bank protection
- [`quality-gates-core.md`](quality-gates-core.md) - Key quality metrics (100% coverage, lint, TDD)
- [`concepts-core.md`](concepts-core.md) - Core concepts (Memory Bank, Protocols, Agents)

## Mode-Specific Rules
Loaded automatically based on current mode:

### Orchestrator Mode (`rules-orchestrator/`)
- `delegation.md` - Delegation and specialist selection

### Code Mode (`rules-code/`)
- `testing.md` - TDD and coverage rules
- `git-workflow.md` - Conventional Commits

### Architect Mode (`rules-architect/`)
- `roles-summary.md` - Role definitions
- `planning.md` - Protocol creation rules

## Skills (On-Demand via `/skill-name`)
Full guides loaded only when needed:

| Skill | Description |
|-------|-------------|
| `/orchestrator-guide` | Complete orchestrator guide with agent matrix |
| `/mcp-usage` | MCP servers usage (context7, memory, playwright) |
| `/anti-patterns` | Common mistakes and how to avoid them |
| `/ui-ux-roles` | UI/UX and DevOps specialized roles |
| `/code-review` | Code review checklist and guidelines |
| `/security-audit` | Security audit procedures |

## Supporting Files (Reference)
- [`security-rules.md`](security-rules.md) - OWASP checklist
- [`environment-windows.md`](environment-windows.md) - Windows conventions
- [`environment-unix.md`](environment-unix.md) - Unix conventions
- [`memory-bank-instructions.md`](memory-bank-instructions.md) - Memory Bank usage
- [`faq.md`](faq.md) - Common questions

## Wrappers (stable links)
Эти страницы нужны, чтобы ссылки из разных мест репозитория не ломались и всегда указывали на актуальный "источник истины" (skills/patterns):
- [`quality-gates.md`](quality-gates.md)
- [`testing-rules.md`](testing-rules.md)
- [`security-rules.md`](security-rules.md)
- [`git-workflow-rules.md`](git-workflow-rules.md)
- [`anti-patterns.md`](anti-patterns.md)
- [`orchestrator-guide.md`](orchestrator-guide.md)
- [`roles.md`](roles.md)
- [`mcp-usage-guide.md`](mcp-usage-guide.md)
- [`tool-usage-guide.md`](tool-usage-guide.md)
- [`tool-access-matrix.md`](tool-access-matrix.md)
- [`mode-selection-guide.md`](mode-selection-guide.md)
- [`agents-guide.md`](agents-guide.md)
- [`context-tiers.md`](context-tiers.md)
- [`1c-workflow.md`](1c-workflow.md)

## Quick Start
1. Core rules loaded automatically (~3K tokens)
2. Mode rules loaded per current mode (~2K tokens)
3. Skills loaded on-demand via slash commands

**Total context: ~5-6K tokens** (vs ~50K before optimization)
