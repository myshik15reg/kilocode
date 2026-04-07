# Scripts Entrypoints (SoT): workflowai-\*.ps1

## Goal

Зафиксировать единый источник истины по тому, где ожидаются PowerShell-скрипты `workflowai-*.ps1` и как их запускать без неявных предположений.

Нормативная переносимость: [`docs-standards.md`](../rules/docs-standards.md:1).
Правила доказательности: [`evidence-rules.md`](../rules/evidence-rules.md:1).

## Contexts

| Context                | Meaning                               | Notes                                                          |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Embedded workflow-pack | pack живёт внутри репозитория проекта | В корне репозитория pack каталога `./scripts/` может не быть.  |
| Global install         | pack установлен в home-dir            | Скрипты, если поставляются, ожидаются рядом с pack.            |
| Consuming project      | проект, куда копируют templates       | `./scripts/` относится к consuming project, а не к корню pack. |

## Matrix: which scripts are expected where

| Script                          | Purpose                                                                  | Expected location                                                                          | Important                                                         |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `workflowai-install-global.ps1` | установить pack в home-dir                                               | Conditional: `./scripts/` exists only if you added it                                      | Embedded pack может не содержать этих скриптов.                   |
| `workflowai-init-project.ps1`   | инициализировать проект (MB, `.protocols/`, `temp/`, optional templates) | Global install: `$HOME/.kilocode/workflowai/scripts/` or `~/.kilocode/workflowai/scripts/` | Если скриптов нет, используйте manual copy из embedded templates. |
| `workflowai-new-protocol.ps1`   | создать каркас протокола                                                 | Global install: `$HOME/.kilocode/workflowai/scripts/` or `~/.kilocode/workflowai/scripts/` | Repo-local `./scripts/...` допустим только как условный сценарий. |
| `workflowai-doctor.ps1`         | диагностика целостности pack (links/encoding/structure)                  | Global install: `$HOME/.kilocode/workflowai/scripts/` or `~/.kilocode/workflowai/scripts/` | Документация MUST помечать отсутствие как допустимое.             |
| `workflowai-quality-gates.ps1`  | runner гейтов качества                                                   | Consuming project: `./scripts/workflowai-quality-gates.ps1`                                | Это часть CI template, а не корень pack.                          |
| `workflowai-guardrails.ps1`     | stack-agnostic guardrails                                                | Consuming project: `./scripts/workflowai-guardrails.ps1`                                   | Это часть CI template, а не корень pack.                          |

## How to run (examples)

### Windows (PowerShell)

```powershell
# Doctor (if global pack and scripts are available)
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-doctor.ps1" -ProjectPath .

# Init project (if global pack and scripts are available)
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath .

# New protocol (if global pack and scripts are available)
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-new-protocol.ps1" -ProjectPath . -Name "feature-name" -WithContext
```

### Unix/macOS (PowerShell 7 / pwsh)

```bash
pwsh -File ~/.kilocode/workflowai/scripts/workflowai-doctor.ps1 -ProjectPath .
pwsh -File ~/.kilocode/workflowai/scripts/workflowai-init-project.ps1 -ProjectPath .
```

### Repo-local `./scripts/...` (conditional)

`./scripts/workflowai-*.ps1` допустим только если внутри конкретного проекта реально существует каталог `./scripts/` и вы знаете, откуда в него попали скрипты.

Для quality gates template это штатно: см. [`quality-enforcement.md`](quality-enforcement.md:1) и [`templates/quality-gates/README.md`](../templates/quality-gates/README.md:1).
