# Рабочий процесс: Тестирование 1C (xUnit + Vanessa + Регрессия) (1c-testing-workflow)

## Описание

Единый воркфлоу тестирования для 1C, который объединяет unit-тесты xUnitFor1C, BDD-сценарии Vanessa Automation

и регрессионный прогон. Оптимизирован под TDD и гейты качества с 100% покрытием.

## Когда использовать

- Новые фичи или рефакторинг 1C, где нужно полное покрытие тестами.
- Баги, где важно зафиксировать регрессию на бизнес-потоках.
- CI пайплайны, где нужно гонять unit + BDD вместе.

## Входные данные

- Объём работ по фиче или описание бага.
- Параметры конфигурации/инфобазы 1C.
- Текущие каталоги тестов (xUnit + Vanessa).

## Выходные данные

- xUnitFor1C tests targeting 100% coverage (lines/branches/functions) under the local quality gates; any temporary gap requires a waiver.
- Файлы feature и step definitions для Vanessa Automation.
- Описание набора регрессионных тестов (теги или список сьютов).
- Краткое резюме отчёта (unit + BDD).

## Роли

- `1c-orchestrator` — координирует этапы и артефакты.
- `1c-tester` — пишет xUnitFor1C тесты и проверяет покрытие.
- `1c-vanessa-tester` — пишет и отвечает за Vanessa-сценарии и набор регрессии.
- `1c-quality-specialist` — проводит ревью и проверяет гейты качества.

## Шаги

1. Стратегия тестирования

    - Определить границы unit vs BDD и критические регрессионные пути.

    - Выбрать способ измерения покрытия и пороги.

2. Unit-тесты (xUnitFor1C)

    - `1c-tester` пишет тесты первым (TDD).

    - Target: 100% lines/branches/functions under the local quality gates; if that is temporarily impossible, a waiver is required before merge/release.

    - Добавлять тесты на крайние случаи до реализации.

3. BDD-сценарии (Vanessa Automation)

    - `1c-vanessa-tester` пишет сценарии для бизнес-потоков.

    - Делать сценарии детерминированными и изолировать данные.

    - Тегировать сценарии для регрессии (например, `@regression`, `@smoke`).

4. Сборка набора регрессии

    - Собрать список регрессии из тегированных сценариев + критичных xUnit тестов.

    - Документировать точки входа и необходимые data seeds.

5. Запуск (CI/local)

    - Запустить xUnit тесты и собрать отчёт о покрытии.

    - Запустить сьюты Vanessa Automation (регрессия + smoke).

    - Падать по любому гейту качества: тесты, линтер, покрытие.

6. Бизнес-гейт (обязательный перед релизом)

    - Провести **бизнес‑тестирование** в отдельной тестовой среде силами заказчика/представителя заказчика.

    - Получить **письменное подтверждение** от заказчика о корректной работе функционала (либо возврат на доработку).

    - Зафиксировать артефакт подтверждения в `<TICKET>`.

    Основание (firm SoT): этап «Тестирование» включает ИТ‑тестирование и бизнес‑тестирование; подтверждение заказчика — обязательный артефакт DoD.

    - [`REG`](../sources/1c-alfa/reg.md#sdlc-testing-gate)

7. Ревью и закрытие

    - `1c-quality-specialist` валидирует покрытие и полноту сценариев.

    - Обновить протокол и тестовую документацию.

## Примечания

- Используй OneScript/Vanessa CLI или project runner; MCP Vanessa можно добавить позже.
- Храни тестовые данные в фикстурах; избегай разделяемого mutable state.
- Предпочитай короткие сценарии; длинные потоки дроби на переиспользуемые шаги.

## Чеклист

- [ ] xUnitFor1C тесты добавлены первыми (TDD)
- [ ] Coverage is 100% (lines/branches/functions) or the deviation is pre-approved via waiver
- [ ] Vanessa сценарии добавлены для критичных потоков
- [ ] Набор регрессии тегирован и задокументирован
- [ ] Тесты зелёные в CI/local
- [ ] Бизнес‑тестирование выполнено, получено письменное подтверждение заказчика
- [ ] Протокол обновлён

## Ссылки

- `.kilocode/rules/1c-workflow.md`
- `.kilocode/patterns/1c/index.md`
- `.kilocode/rules/testing-rules.md`

## Review Pack Handoff

1. После тестового этапа `1c-quality-specialist` MUST выполнять review через [`1c-review-pack.md`](1c-review-pack.md:1).
2. Результаты review MUST сохраняться в `.protocols/.../artifacts/review/code-review.md`, `.protocols/.../artifacts/review/quality-checklist.md`, `.protocols/.../artifacts/review/apk-report.md` и `.protocols/.../artifacts/review/findings.json`.
