# Быстрый справочник

Короткая шпаргалка: как быстро выбрать процесс, режим и гейты качества.

## Старт задачи
1. Прочитай `.kilocode/memory-bank/index.md` и подтверди: `[MB: OK]`.
2. Оцени сложность:
   - **Тривиально** (1 файл, не более 10 строк, без изменения поведения) - протокол обязателен, но план может быть минимальным.
   - **Всё остальное** - протокол обязателен с полноценным планом; запускай `protocol-new.md`.
3. Если задача многоэтапная/длинная - используй `agent-orchestration.md`.

## Важно про PowerShell
- Не полагайся на `&&` в примерах команд (в PowerShell это частая причина ошибок).
- Лучше: отдельные команды строками или `;`.

## Выбор режима (80/20)
- Планирование/закрытие протокола — `architect`
- Декомпозиция и делегирование — `orchestrator`
- Реализация — самый узкий подходящий режим (`*-dev` / `*-specialist`), иначе `code`
- Отладка — `debug`
- Вопросы/анализ без правок — `ask`
- Тесты/QA — специализированные режимы (если настроены), иначе `code` + строгий TDD

## Инструменты (кратко)
- Kilo Code (VS Code): `read_file`, `apply_diff`, `write_to_file`, `execute_command`, `new_task`.
- Codex CLI: `functions.shell_command`, `functions.apply_patch` (без `new_task`; допускается role-loop в одной сессии).

## Какой процесс запускать
- Инцидент/прод-авария — `hotfix-emergency.md`
- Новая функциональность — `protocol-new.md` (при необходимости: `spec-driven-development.md`)
- Продолжить протокол — `protocol-resume.md`
- Ревью/слияние/закрытие протокола — `protocol-review-merge.md`
- Многоэтапная работа и декомпозиция — `agent-orchestration.md`
- Системный рефакторинг — `refactoring-workflow.md`
- Документация — `documentation-workflow.md`
- Миграции БД — `migration-workflow.md`
- Деплой — `deployment-workflow.md`
- Обновления зависимостей — `dependency-management.md`
- Исключение из правил (редко) — `waiver-workflow.md`
- Подключить пакет к проекту — `project-setup.md` (или `global-install.md` для глобальной установки)

## Гейты качества (всегда)
- Покрытие: 100% (lines/branches/functions)
- Линтер: 0 ошибок / 0 предупреждений
- TODO только с тикетом: `// TODO(#123)`
- Безопасность: базовый чеклист OWASP (если применимо)

## Частые команды (примеры)

### Git
```text
git status
git diff
git diff --cached
git commit -m "type(scope): subject"
```

### Тесты
```text
npm test
npm test -- --coverage
npm run lint
npm run typecheck
```

## Диагностика пакета (WorkFlowAI)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/workflowai-doctor.ps1 -ProjectPath .
```

## Ссылки
- `index.md`
- `overview.md`
- `~/.kilocode/rules/index.md`
