# Context Capsule Pattern

Purpose: provide a minimal, self-contained context packet for delegation when the target model cannot read the Memory Bank, has limited file access, or cannot spawn subagents.

## When to use

- Cross-model handoff (Claude Code, Codex, Gemini, etc.).
- Memory Bank is unavailable or unreliable to the target model.
- Subagent support is limited or disabled.
- High risk of context compaction or loss.

## Rules

- Keep it short (<= 40 lines where possible).
- Use bullets and explicit file paths.
- Include quality gates (TDD + 100% coverage + lint clean).
- State model limitations explicitly.
- Provide acceptance criteria and expected deliverable.
- Avoid references to "hidden" context not included in the capsule.

## Template

```markdown
CAPSULE ID: YYYY-MM-DD/short-name
TASK: <one sentence>
MODEL CAPABILITIES:

- memory_bank: none | limited | full
- subagents: yes | no
- tools: none | read-only | full

OBJECTIVE:

- <what success looks like>

SUCCESS CRITERIA:

- <acceptance criteria>

CONSTRAINTS:

- TDD: tests before code
- Coverage: 100% (lines/branches/functions)
- Lint: 0 errors, 0 warnings
- <domain/security constraints>

SCOPE:

- In scope: <items>
- Out of scope: <items>

KEY FILES:

- <path>
- <path>

DECISIONS:

- <decision + rationale>

OPEN QUESTIONS:

- <question>

RISKS:

- <risk + mitigation>

DELIVERABLE:

- <expected output artifacts>
```

## Usage

1. Save the capsule in `.protocols/<task>/context-capsule.md`.
2. Paste the capsule into the `new_task` message for models without Memory Bank access.
3. Update the capsule after major decisions or scope changes.

---

## Practical Examples

### Example 1: Code Review (reviewer with limited memory_bank)

```markdown
CAPSULE ID: 2025-01-15/auth-refactor-review
TASK: Review authentication refactoring PR

MODEL CAPABILITIES:

- memory_bank: limited
- subagents: no
- tools: read-only

OBJECTIVE:

- Ensure auth refactoring meets security and quality standards

SUCCESS CRITERIA:

- No OWASP Top 10 vulnerabilities
- 100% test coverage verified
- No lint warnings
- Consistent with existing patterns

CONSTRAINTS:

- TDD: verify tests were written first (check commit order)
- Coverage: 100% (lines/branches/functions)
- Lint: 0 errors, 0 warnings
- Security: validate JWT handling, password hashing, rate limiting

SCOPE:

- In scope: src/auth/_, tests/auth/_
- Out of scope: database migrations, UI changes

KEY FILES:

- src/auth/AuthService.ts (main changes)
- src/auth/JwtProvider.ts (token handling)
- tests/auth/AuthService.test.ts (test coverage)
- src/auth/types.ts (interfaces)

DECISIONS:

- Use argon2 for password hashing (vs bcrypt) - performance + security
- JWT refresh tokens stored in httpOnly cookies - XSS protection

OPEN QUESTIONS:

- Rate limiting strategy: per-user or per-IP?

RISKS:

- Breaking change in token format - ensure migration path exists

DELIVERABLE:

- Approval or list of required changes with file:line references
```

### Example 2: Implementation Task (python-dev with no memory_bank)

```markdown
CAPSULE ID: 2025-01-15/user-export-api
TASK: Implement user data export endpoint

MODEL CAPABILITIES:

- memory_bank: none
- subagents: no
- tools: full

OBJECTIVE:

- Create GDPR-compliant user data export endpoint

SUCCESS CRITERIA:

- GET /api/v1/users/{id}/export returns JSON with all user data
- Response includes: profile, orders, preferences, audit_log
- Tests cover all branches (100%)
- Response time < 2s for typical user

CONSTRAINTS:

- TDD: tests before code
- Coverage: 100% (lines/branches/functions)
- Lint: 0 errors, 0 warnings (ruff)
- Framework: FastAPI + SQLAlchemy
- Auth: require valid JWT with user:read scope

SCOPE:

- In scope: endpoint, service layer, unit tests
- Out of scope: async background jobs, email notification

KEY FILES:

- src/api/routes/users.py (add endpoint here)
- src/services/user_service.py (data aggregation logic)
- src/models/user.py (existing model)
- tests/api/test_users.py (add tests here)

DECISIONS:

- Return JSON (not CSV) for programmatic access
- Include soft-deleted records with is_deleted flag

OPEN QUESTIONS:

- None (requirements clarified)

RISKS:

- Large data volumes - implement pagination if > 1MB response

DELIVERABLE:

- Endpoint implementation + passing tests
- Update plan.md with [x] status
```

### Example 3: Research Task (planning-research-codebase)

```markdown
CAPSULE ID: 2025-01-15/error-handling-analysis
TASK: Analyze error handling patterns in codebase

MODEL CAPABILITIES:

- memory_bank: limited
- subagents: no
- tools: read-only

OBJECTIVE:

- Document current error handling approaches for standardization

SUCCESS CRITERIA:

- List all error handling patterns found
- Identify inconsistencies
- Recommend unified approach

CONSTRAINTS:

- Read-only: NO file modifications
- Output format: structured findings with file:line references

SCOPE:

- In scope: src/**/\*.ts, src/**/\*.py
- Out of scope: tests, config files, node_modules

KEY FILES:

- Start from: src/api/_, src/services/_

DECISIONS:

- Focus on exception types and error response formats

OPEN QUESTIONS:

- Are there custom exception classes?
- How are errors logged?

RISKS:

- None (read-only analysis)

DELIVERABLE:

- Findings report in .protocols/.../artifacts/research/error-handling-analysis.md
- Include: patterns found, file locations, recommendations
```

---

## Compression Tips

When capsule exceeds 40 lines:

1. **Merge similar items**: Combine related constraints
2. **Use shorthand**: `TDD+100%+lint` instead of separate bullets
3. **Reference files**: Point to plan.md instead of duplicating scope
4. **Prioritize**: Include only info the target model NEEDS to complete task

### Compressed Example (< 20 lines)

```markdown
CAPSULE: 2025-01-15/fix-login-bug
TASK: Fix login redirect loop on expired session

CAPS: memory_bank=none | subagents=no | tools=full

OBJECTIVE: Session expiry -> redirect to /login (not loop)
CRITERIA: Bug fixed + regression test + 100% coverage
CONSTRAINTS: TDD + lint clean + no breaking changes

FILES:

- src/auth/SessionMiddleware.ts:45 (bug location)
- tests/auth/session.test.ts (add test)

DECISION: Clear session cookie before redirect
DELIVERABLE: Fix + test, update plan.md
```
