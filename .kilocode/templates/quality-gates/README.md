# Quality Gates Templates

Шаблоны для CI/CD и PR workflow (GitHub Actions). Включают **самодостаточные** runner/guardrails скрипты (PowerShell), которые выполняют шаги из JSON-конфига.

## Содержимое

| Файл                                                     | Назначение                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `project/.github/workflows/workflowai-quality-gates.yml` | GitHub Actions workflow                                    |
| `project/.github/PULL_REQUEST_TEMPLATE.md`               | PR template с чеклистом                                    |
| `project/scripts/workflowai-quality-gates.ps1`           | Runner: читает JSON и выполняет шаги                       |
| `project/scripts/workflowai-guardrails.ps1`              | Guardrails: stack-agnostic проверки (TODO/disable/markers) |
| `project/scripts/workflowai-quality-gates.json`          | Конфиг команд (настрой под проект)                         |
| `project/scripts/presets/*.json`                         | Готовые конфиги для разных стеков                          |

## Как использовать

> **Полная инструкция**: [`quality-enforcement.md`](../../workflows/quality-enforcement.md:1) (embedded) / `~/.kilocode/workflows/quality-enforcement.md` (global install)

## Принцип

AlfaFlowAI не навязывает стек: **вы задаёте команды** в JSON-конфиге, CI запускает runner (`./scripts/workflowai-quality-gates.ps1`).

### Guardrails (что проверяется)

- `TODO` в коде допускается только с тикетом: `TODO(#123)`
- запрещены директивы отключения линтеров/типизации (например `eslint-disable`, `@ts-ignore`, `# noqa`)
- опционально: валидация формата `kilocode_change` маркеров (`kilocode_change: [YYYY-MM-DD] ...`)
