# Skills Index Rule

## Purpose
This rule ensures that Kilo Code checks for relevant skills before starting any task, enabling the use of specialized, reusable capabilities.

## When to Apply
- Before starting ANY new task or protocol
- When encountering a repetitive pattern that could be automated
- When the user asks for help with specific domains (testing, CLI, etc.)

## How to Use

### 1. Check for Existing Skills
Before beginning work, list the contents of `.kilocode/skills/` to see what skills are available:
```bash
ls .kilocode/skills/
```

### 2. Select Relevant Skills
Review available skill files and determine which ones apply to the current task. A skill is relevant if:
- The task matches the skill's **Triggers**
- The task requires the skill's **Context**
- The task can benefit from the skill's **Workflow**

### 3. Apply the Skill
Read the selected skill file and follow its instructions:
```markdown
# Example: Using project-tests skill

1. Read `.kilocode/skills/project-tests/SKILL.md`
2. Follow the workflow steps
3. Report results to user
```

### 4. Create New Skills (If Needed)
If no existing skill matches the task:
1. Use the `create-new-skill` workflow: `.kilocode/workflows/create-new-skill.md`
2. Document the new skill in `.kilocode/skills/`
3. Update this index if necessary

## Available Skills

### Core Skills
- `cli-master/SKILL.md` - Safe and effective CLI usage
- `code-review/SKILL.md` - Systematic code review and quality control
- `git-workflow/SKILL.md` - Git operations and version control best practices
- `performance-optimization/SKILL.md` - Identify and resolve performance bottlenecks
- `project-tests/SKILL.md` - Standardized testing workflow
- `security-audit/SKILL.md` - Comprehensive security auditing and vulnerability protection

### Skill Categories

**Development Workflow:**
- `git-workflow/SKILL.md` - Branching, commits, PRs, merges
- `cli-master/SKILL.md` - Command-line operations

**Quality Assurance:**
- `code-review/SKILL.md` - SOLID principles, code quality, security
- `project-tests/SKILL.md` - Unit, integration, E2E testing
- `security-audit/SKILL.md` - Security scanning, OWASP Top 10

**Performance:**
- `performance-optimization/SKILL.md` - Database, backend, frontend optimization

## Integration with Memory Bank
Skills should always read relevant Memory Bank files:
- `tech.md` - To understand the project's tech stack
- `architecture.md` - To align with architectural decisions
- `product.md` - To understand user goals

## Safety Rules
- Never execute a skill's instructions without verifying they are safe for the current context
- Always ask for confirmation before running destructive commands
- If a skill conflicts with project rules, prioritize the project rules
