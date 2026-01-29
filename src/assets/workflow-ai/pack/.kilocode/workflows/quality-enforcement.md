# Рабочий процесс: Гейты качества (quality-enforcement)

## Цель
Сделать требования WorkFlowAI **исполняемыми**, а не декларативными:
- 100% coverage (lines/branches/functions)
- 0 lint errors / 0 lint warnings
- security checks (OWASP mindset + dependency scan + secrets detection)

Результат: merge блокируется автоматически (CI + branch protection), а PR'ы проверяются по единому чеклисту.

## Когда использовать
- Подключаете WorkFlowAI к новому репозиторию.
- Хотите перестать "полагаться на дисциплину" и включить автоматические гейты качества.
- Нужен единый каркас для разных стеков (команды задаются конфигом).

## Архитектура

Скрипты runner и guardrails встроены в kilocode глобально:
- `~/.kilocode/workflowai/scripts/workflowai-quality-gates.ps1` — runner
- `~/.kilocode/workflowai/scripts/workflowai-guardrails.ps1` — stack-agnostic проверки

В проект копируются только конфиги и CI workflow:
- `./.github/workflows/workflowai-quality-gates.yml`
- `./.github/PULL_REQUEST_TEMPLATE.md`
- `./scripts/workflowai-quality-gates.json` (команды под ваш репозиторий)

## Шаги

### 1) Скаффолдинг (рекомендуется)
**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath . -InitQualityGates
```

**Unix/macOS (PowerShell 7):**
```bash
pwsh -File "$HOME/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath . -InitQualityGates
```

Альтернатива (manual): скопируйте содержимое `~/.kilocode/workflowai/templates/quality-gates/project/` в корень проекта.

### 2) Настройка команд гейтов качества
Отредактируйте `./scripts/workflowai-quality-gates.json` под стек проекта.

Правило: CI должен запускать **ровно те же** команды, что и разработчик локально.

Guardrails вызываются из глобального скрипта:
```json
{ "name": "Guardrails", "command": "pwsh", "args": ["-File", "$HOME/.kilocode/workflowai/scripts/workflowai-guardrails.ps1", "-ProjectPath", "."] }
```

### Пресеты (быстрый старт)
После скаффолдинга используйте готовые пресеты из `./scripts/presets/`:

| Пресет | Стек |
|--------|------|
| `node.json` | Node.js (npm) |
| `node-pnpm.json` | Node.js (pnpm) |
| `python.json` | Python (pip) |
| `python-poetry.json` | Python (poetry) |
| `dotnet.json` | .NET |
| `java-maven.json` | Java (Maven) |

```powershell
# Скопировать пресет как основной конфиг
Copy-Item scripts/presets/node.json scripts/workflowai-quality-gates.json
```

### 3) CI: включить pipeline
Закоммитьте `.github/workflows/workflowai-quality-gates.yml`.

Важно: если вашему стеку нужен "setup" (например, `actions/setup-node`) - добавьте его в workflow до запуска runner.

### 4) Защита ветки (branch protection)
Настройте защищённую ветку (GitHub/GitLab):
- запрет прямого push в `main`
- merge только через PR
- требовать 1+ одобрения ревью
- требовать status checks (job `quality-gates`)
- запрет force push

### 5) (Опционально) Хуки pre-commit
Локальные хуки полезны как быстрый "ранний блокер", но принудительное соблюдение должно жить в CI.

### 6) Проверка
Локально:

**Windows (PowerShell):**
```powershell
# Runner
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-quality-gates.ps1" -ProjectPath . -ConfigPath ./scripts/workflowai-quality-gates.json

# Только guardrails
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-guardrails.ps1" -ProjectPath .
```

**Unix/macOS (PowerShell 7):**
```bash
# Runner
pwsh -File "$HOME/.kilocode/workflowai/scripts/workflowai-quality-gates.ps1" -ProjectPath . -ConfigPath ./scripts/workflowai-quality-gates.json

# Только guardrails
pwsh -File "$HOME/.kilocode/workflowai/scripts/workflowai-guardrails.ps1" -ProjectPath .
```

## Ссылки
- Требования качества (source of truth): `~/.kilocode/rules/quality-gates.md`
- CI templates: `~/.kilocode/workflowai/templates/quality-gates/`
- Project setup: `~/.kilocode/workflows/project-setup.md`
- Testing rules: `~/.kilocode/rules/testing-rules.md`
- Git workflow: `~/.kilocode/rules/git-workflow-rules.md`
