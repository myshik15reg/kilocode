# WorkFlowAI - workflow pack для AlfaCode assistant

WorkFlowAI - набор правил, шаблонов и workflow для AlfaCode assistant, который встраивается в другие проекты.
Фокус: абсолютное качество (TDD, 100% coverage, нулевые lint ошибки) и дисциплина через Memory Bank.

## Быстрый старт

### Global install (рекомендуется)

```powershell
# 1. Установить pack глобально
powershell -ExecutionPolicy Bypass -File scripts/workflowai-install-global.ps1

# 2. Инициализировать проект
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath .

# 3. Создать первый протокол
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-new-protocol.ps1" -ProjectPath . -Name "feature-name"
```

### Embed (встраивание в репозиторий)

Скопируйте: `AGENTS.md`, `.kilocode/`, `.kilocodemodes`, `.clinerules`, `.protocols/README.md`

Подробности: `.kilocode/workflows/global-install.md`, `.kilocode/rules/integration-guide.md`

## Требования к качеству

- **100% coverage** (lines/branches/functions)
- **TDD**: Red → Green → Refactor
- **Lint**: 0 ошибок, 0 предупреждений
- **No Protocol, No Code** — протокол обязателен

## Troubleshooting

### ENOENT при чтении skill-файлов

Проект не инициализирован. Запустите:

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath .
```

### Проверка установки

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-doctor.ps1" -ProjectPath .
```

## Навигация

- **Главный манифест:** [AGENTS.md](AGENTS.md)
- **Memory Bank:** [.kilocode/memory-bank/index.md](../../.kilocode/memory-bank/index.md)
- **Правила:** [.kilocode/rules/index.md](../../.kilocode/rules/index.md)
- **Режимы (127 шт.):** [.kilocode/modes/REGISTRY.md](../../.kilocode/modes/REGISTRY.md)
- **Skills:** [.kilocode/skills/index.md](../../.kilocode/skills/index.md)
- **Workflows:** [.kilocode/workflows/index.md](../../.kilocode/workflows/index.md)
