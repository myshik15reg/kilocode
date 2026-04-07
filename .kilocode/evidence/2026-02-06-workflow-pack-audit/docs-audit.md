# Docs audit — workflow-pack (2026-02-06)

## Summary

- Коридор чтения в целом правильный и соответствует задумке: entrypoints → QUICK (Level 0) → Memory Bank → rules/workflows.
- Основной источник «разрыва» связности: в ключевых документах встречаются ссылки на отсутствующие PowerShell-скрипты `scripts/workflowai-*.ps1`.
- Каталог `old/` — полный дубликат репозитория: полезен как исторический слепок и источник evidence, но повышает шум и риск дрейфа.

## Issues

| Severity | Где                                                                             | Проблема                                                                                                                                 | Влияние                                                   |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| BLOCKER  | `README.md`, `.kilocode/QUICK.md`, `.kilocode/workflows/first-time-setup.md`    | Ссылки на `scripts/workflowai-*.ps1`, при этом каталога `scripts/` в актуальном корне нет.                                               | Ломается onboarding и copy-paste сценарии.                |
| HIGH     | `old/`                                                                          | Полный дубликат repo (включая `.kilocode/`, `.protocols/`, `docs/`).                                                                     | Шум в навигации + риск расхождений (две «версии правды»). |
| HIGH     | `.kilocode/memory-bank/context.md`                                              | Стабильные ссылки на `.kilocode/evidence/...` есть, но каталога `.kilocode/evidence/` нет (evidence сейчас в `old/.kilocode/evidence/`). | Memory Bank указывает на несуществующие evidence-пути.    |
| MEDIUM   | `.kilocode/workflows/quickref.md`, `.kilocode/workflows/overview.md`            | Упоминание отсутствующего workflow `spec-driven-development.md`.                                                                         | В quickref/overview есть «висячие» ссылки.                |
| MEDIUM   | `.kilocode/workflows/global-install.md`, `.kilocode/rules/integration-guide.md` | Неконсистентные пути вида `~/~/.kilocode` и `$HOME/~/.kilocode`.                                                                         | Команды/пути хуже копируются и вводят в заблуждение.      |

## Proposed edits (minimal)

### Сделано в рамках этого шага (3 файла, максимальный эффект)

1. `README.md`

- Добавлен явный «коридор чтения» для агента.
- Убран «жёсткий» quick start через отсутствующие `scripts/workflowai-*.ps1` (оставлена ссылка на документы установки как справка).
- Навигация дополнена ссылкой на индекс паттернов.

2. `.kilocode/QUICK.md`

- Убрана команда с `scripts/workflowai-doctor.ps1` (скрипты в корне отсутствуют).
- Приведены ссылки «что читать дальше» к `.kilocode/rules/*.md`.

3. `.kilocode/workflows/first-time-setup.md`

- Убраны прямые команды запуска отсутствующих `./scripts/workflowai-*.ps1`.
- Пути в коридоре чтения и структуре проекта приведены к `.kilocode/...` (project-local).

### Follow-ups (вынести в отдельные подзадачи)

- Решить судьбу скриптов: либо добавить в репозиторий минимальный `scripts/` набор, либо удалить/заменить ВСЕ ссылки на `scripts/workflowai-*.ps1` в `.kilocode/` документации.
- Восстановить стабильное evidence-хранилище: `old/.kilocode/evidence/` → `.kilocode/evidence/` и обновить ссылки в Memory Bank.
- Свернуть legacy `old/`: после миграции нужного — оставить один `old/README.md` (указатель) или удалить каталог полностью (лучше: git tag/release asset + удаление каталога).
- Убрать упоминания `spec-driven-development.md` из quickref/overview или добавить workflow, если он реально нужен.

## Risks

- Если у части пользователей есть локальные `scripts/workflowai-*.ps1` (вне этого репо), удаление команд из entrypoints может снизить «copy-paste удобство».
    - Митигация: держать скриптовые сценарии в одном месте (например, отдельный раздел/док) и ссылаться на него; не размазывать команды по всем entrypoints.
- Приведение путей к `.kilocode/...` должно оставаться совместимым с embedded-режимом; для global install потребуется отдельная согласованная схема путей (и наличие скриптов).
