# Project Brief

## One-liner
WorkFlowAI is a workflow pack for Kilo Code that enforces protocol-driven, high-quality AI-assisted development.

## Goals
- Provide a reusable, consistent workflow (rules + templates + scripts) for AI agents.
- Enforce quality gates (TDD, 100% coverage, lint clean, security checks).
- Make onboarding and setup repeatable via scripts and documented workflows.

## Non-Goals (out of scope)
- Implementing product-specific application features for downstream projects.
- Replacing project-specific business documentation or architecture decisions.

## Success Criteria
- `workflowai-doctor.ps1` passes with no failures on a clean repo.
- Memory Bank and protocol usage are consistent and kept up to date.
- Global install + project init are documented and reproducible.

## Constraints
- **Quality:** TDD + 100% coverage (lines/branches/functions), 0 lint errors/warnings
- **Process:** No Protocol, No Code (for non-trivial tasks)
- **Portability:** Must work in both global and embedded modes.
- **Encoding:** UTF-8 without BOM for all pack files.
- **Platform:** Windows + PowerShell supported (primary path).

## Stakeholders
- **Owner:** WorkFlowAI maintainers
- **Users:** Kilo Code users and AI agents working in projects
- **Dependencies:** PowerShell, Kilo Code runtime, Git

## Definition of Done (per task)
- Tests added and pass with 100% coverage
- Lint is clean (0 errors / 0 warnings)
- Security checklist applied (OWASP where relevant)
- Protocol updated (`brief.md`, `plan.md`, `execution.md`)
- Memory Bank updated (`context.md`, and others if needed)
