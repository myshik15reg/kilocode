# Рабочий процесс: OpenSpec — Предложение (openspec-proposal)

## Назначение
Создать и провалидировать предложение изменения OpenSpec **до** любой реализации.

## Шаги
1. Прочитать `openspec/AGENTS.md` и `openspec/project.md`.
2. Определить объём работ и выбрать уникальный `change-id` (`kebab-case`, начиная с глагола).
3. Создать `openspec/changes/CHANGE_ID/` со структурой:
   - `proposal.md`
   - `tasks.md`
   - (опционально) `design.md`
   - delta-spec в `specs/CAPABILITY/spec.md`
4. Убедиться, что у каждого требования есть минимум один блок `#### Scenario:`.
5. Запустить `openspec validate CHANGE_ID --strict`.
6. Остановиться и запросить одобрение **перед** началом реализации.
