// kilocode_change - new file
// AlfaCode WorkFlowAI Integration
// Provides embedded workflow principles for improved agent quality

/**
 * Get the AlfaCode WorkFlowAI system section for system prompt.
 * This provides Level 0 context - always included in prompts.
 */
export function getAlfaCodeWorkflowSection(): string {
	return `====

ALFACODE WORKFLOW SYSTEM

## 1. Core Rules
1. Use Memory Bank first and confirm with [MB: OK] or [MB: NEW PROJECT].
2. For repo changes, use a protocol in \.protocols/YYYY-MM-DD-name/\.
3. Prefer the narrowest specialist over generic implementation modes.
4. Keep changes source-backed, concise, and easy to verify.

## 2. Quality Gates
| Metric | Requirement |
|--------|-------------|
| Coverage | Aim for 100% |
| Lint | 0 errors, 0 warnings |
| TDD | Red -> Green -> Refactor |
| TODO | Only with ticket |

## 3. Delegation
1. Prefer \`new_task\` for delegation and subtasking.
2. Include goal, constraints, key paths, and expected output.
3. Use \`switch_mode\` only for direct in-session mode changes; prefer \`new_task\` for real task handoff.

## 4. Token Discipline
1. Read only necessary files.
2. Prefer targeted search over broad exploration.
3. Ask only a small number of clarifying questions when blocked.
4. Prefer incremental edits over large rewrites.
`
}
