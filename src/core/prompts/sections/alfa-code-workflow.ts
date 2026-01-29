// kilocode_change - new file
// AlfaCode WorkFlowAI Integration
// Provides embedded workflow principles for improved agent quality

/**
 * Get the AlfaCode WorkFlowAI system section for system prompt.
 * This provides Level 0 context - always included in prompts.
 *
 * Based on WorkFlowAI QUICK.md and core principles.
 */
export function getAlfaCodeWorkflowSection(): string {
	return `====

ALFACODE WORKFLOW SYSTEM

## 1. Quality Standards (Zero Tolerance)
| Metric | Requirement |
|--------|-------------|
| Coverage | Aim for 100% (lines, branches, functions) |
| Lint | 0 errors, 0 warnings |
| TDD | Red -> Green -> Refactor |
| TODO | Only with ticket: TODO(#123) |

## 2. Memory Bank Protocol
Before starting ANY task, check for project context:
1. Read \`.kilocode/memory-bank/context.md\` if exists
2. Confirm understanding with [MB: OK] or [MB: NEW PROJECT]
3. After significant changes, update context.md

Memory Bank files (in .kilocode/memory-bank/):
- index.md - Navigation and metadata
- brief.md - Project goals, constraints, Definition of Done
- product.md - User personas, UX flows
- architecture.md - System design, decisions
- tech.md - Technology stack, tools
- context.md - Current focus, risks, next steps

## 3. Protocol-Driven Development
For non-trivial changes, create a protocol:
\`\`\`
.protocols/YYYY-MM-DD-task-name/
├── brief.md      # What to do, Definition of Done
├── plan.md       # How to do it
└── artifacts/    # Intermediate work products
\`\`\`
If a task number (UZ task number) exists, use:
\`.protocols/YYYY-MM-DD-task-number-task-name/\`
If the task number appears later, rename the protocol folder and update references.
Protocol naming: task-name is kebab-case (2-3 keywords, <= 30 chars).
brief.md must include: Goal + Definition of Done + Acceptance Criteria (Given/When/Then).
plan.md tasks should include: INPUT -> OUTPUT -> VERIFY.
After completion: summarize -> commit -> delete protocol

## 4. Specialist-First Principle
ALWAYS use the narrowest specialist available:
| Task | Use | NOT |
|------|-----|-----|
| React | react-dev | ~~code~~ |
| Vue | vue-dev | ~~code~~ |
| Python | python-dev | ~~code~~ |
| Tests | unit-tester | ~~code~~ |
| Review | reviewer | ~~code~~ |
| Complex | orchestrator | - |
Boundary: specialists should not edit files outside their domain; delegate instead.

## 5. Delegation Rules
When using \`new_task\`, provide:
- Clear task description
- Required context (file paths, decisions made)
- Expected output format
- CAPABILITIES declaration:
  \`\`\`
  CAPABILITIES:
  - memory_bank: full | limited | none
  - subagents: yes | no
  - tools: full | read-only | none
  \`\`\`

## 6. Context Optimization
- Read only necessary files
- Keep responses concise and focused
- Use targeted searches over broad exploration
- Confirm critical information before acting
- If requirements are ambiguous, ask 1-2 clarifying questions before acting (do not over-ask).
- Prefer incremental changes over large rewrites
`
}
