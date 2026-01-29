# Рабочие процессы (WorkFlowAI пакет для Kilo Code)

Этот каталог — библиотека воркфлоу. В Kilo Code можно запускать файл как воркфлоу через `/имя-файла.md`.

## С чего начать
- [`first-time-setup.md`](first-time-setup.md) — **НАЧНИ ЗДЕСЬ** если первый раз в WorkFlowAI.
- [`quickref.md`](quickref.md) — краткая шпаргалка по выбору процесса и режимов.
- [`overview.md`](overview.md) — карта процессов и рекомендации по применению.
- [`project-setup.md`](project-setup.md) — подключение пакета к проекту (с нуля или в существующий репозиторий).
- [`global-install.md`](global-install.md) — установка пакета глобально в `~/~/.kilocode/` (Windows/PowerShell-first).

## Протоколы (обязательны для любых задач)
- [`protocol-new.md`](protocol-new.md) — создать новый протокол.
- [`protocol-resume.md`](protocol-resume.md) — продолжить протокол.
- [`protocol-review-merge.md`](protocol-review-merge.md) — ревью, слияние и закрытие протокола.
- [`protocol-examples.md`](protocol-examples.md) — примеры протоколов.

## Оркестрация и управление задачами
- [`agent-orchestration.md`](agent-orchestration.md) — декомпозиция и координация (multi-agent).
- [`beads-task-tracking.md`](beads-task-tracking.md) — трекинг долгих задач.
- [`orchestration-troubleshooting.md`](orchestration-troubleshooting.md) — устранение проблем оркестрации и процесса.

## Качество и безопасность
- [`quality-enforcement.md`](quality-enforcement.md) — гейты качества (CI/PR) и контроль соблюдения правил.
- [`waiver-workflow.md`](waiver-workflow.md) — процесс исключений из правил (редко и осознанно).
- [`dependency-management.md`](dependency-management.md) — обновления зависимостей и security-практики.
- [`scorecard.md`](scorecard.md) — самооценка качества пакета (процессы/правила).
- [`metrics.md`](metrics.md) — метрики (опционально).

## Разработка и эксплуатация
- [`deep-analysis.md`](deep-analysis.md) — глубокий анализ репозитория/кода.
- [`refactoring-workflow.md`](refactoring-workflow.md) — системный рефакторинг.
- [`documentation-workflow.md`](documentation-workflow.md) — цикл документации.
- [`migration-workflow.md`](migration-workflow.md) — миграции базы данных.
- [`deployment-workflow.md`](deployment-workflow.md) — деплой.
- [`hotfix-emergency.md`](hotfix-emergency.md) — инциденты и прод-аварии.

## Troubleshooting
- [`failure-recovery.md`](failure-recovery.md) — восстановление после ошибок (git, quality gates, process).
- [`quick-diagnosis.md`](quick-diagnosis.md) — быстрый триаж проблем (build, tests, lint, runtime).

## Спецификации OpenSpec (если используется)
- [`openspec-change-workflow.md`](openspec-change-workflow.md) — жизненный цикл изменения.
- [`openspec-proposal.md`](openspec-proposal.md) — стадия предложения.
- [`openspec-apply.md`](openspec-apply.md) — реализация.
- [`openspec-archive.md`](openspec-archive.md) — архивирование.

## 1C:Enterprise
Специализированные процессы для платформы 1С:Предприятие. Интегрированы с основным AlfaFlow.

- [`~/.kilocode/rules/1c-workflow.md`](../rules/1c-workflow.md) — основной workflow 1C (роли, циклы, интеграция с AlfaFlow).
- [`1c-testing-workflow.md`](1c-testing-workflow.md) — тестирование 1C (xUnitFor1C + Vanessa Automation).
- [`~/.kilocode/patterns/1c/index.md`](../patterns/1c/index.md) — паттерны 1C.

**Точка входа:** Для любой задачи 1C делегируй `1c-orchestrator`.

## Утилиты
- [`create-new-skill.md`](create-new-skill.md) — создание нового навыка (skill).
- [`update-indexes.md`](update-indexes.md) — обновление индексных файлов.
- [`vibe-coding.md`](vibe-coding.md) — контролируемое исследование/прототипирование.
- [`styleguide.md`](styleguide.md) — подключение и применение styleguide/patterns.
