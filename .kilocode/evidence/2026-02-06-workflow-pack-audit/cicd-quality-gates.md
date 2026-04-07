# CI/CD: Quality Gates template — enforceability fix

**Protocol:** `.protocols/2026-02-05-workflow-pack-audit/`

## Problem (BLOCKER)

- GitHub Actions workflow в template вызывал отсутствующий runner:
    - `.kilocode/templates/quality-gates/project/.github/workflows/workflowai-quality-gates.yml` → `./scripts/workflowai-quality-gates.ps1` (файла не было)
- В JSON/presets использовались Windows-only плейсхолдеры `%USERPROFILE%` для `-File`, что создавало риск «тихого» неисполнения.

## Changes

### 1) Added missing runner script (template is now self-contained)

- Added: `.kilocode/templates/quality-gates/project/scripts/workflowai-quality-gates.ps1`
    - Minimal runner: валидирует JSON, последовательно запускает шаги, останавливается на первом неуспехе, пробрасывает exit code.

### 2) Added local guardrails (remove hidden global dependency)

- Added: `.kilocode/templates/quality-gates/project/scripts/workflowai-guardrails.ps1`
    - Проверки:
        - TODO только с тикетом: `TODO(#123)`
        - запрет директив отключения линтера/типизации (`eslint-disable`, `@ts-ignore`, `# noqa`, ...)
        - опционально: проверка формата `kilocode_change` маркеров (по флагу)

### 3) OS-agnostic paths in JSON/presets

- Updated configs to call local guardrails via relative path:
    - `./scripts/workflowai-guardrails.ps1`
- Removed `%USERPROFILE%` placeholders from template configs/presets.

### 4) Docs sync

- Updated template README and `quality-enforcement` workflow doc to describe **repo-local** runner/guardrails.

## How to verify

### Local (PowerShell)

From repo root:

```powershell
# Run the template runner against the template project
pwsh -File ./.kilocode/templates/quality-gates/project/scripts/workflowai-quality-gates.ps1 -ProjectPath ./.kilocode/templates/quality-gates/project
```

### GitHub Actions (template usage)

1. Copy `project/` contents into the target repo root (`.github/` + `scripts/`).
2. Adjust `scripts/workflowai-quality-gates.json` (or copy a preset).
3. Add toolchain setup steps to `.github/workflows/workflowai-quality-gates.yml` (setup-node/setup-python/etc.) before running the runner.
4. Ensure branch protection requires the `quality-gates` job.
