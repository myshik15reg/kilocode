# 1C (firm): Контекст-прайминг (2-step intake + targeted load) (1c-alfa-context-priming)

## Назначение
Быстро и безопасно выбрать **фирменные правила/skills** для 1С-задачи без «подгрузки всего».

## Источники (firm SoT)
- SDLC + классификация заявок «поддержка/проект»: [`REG`](../sources/1c-alfa/reg.md#sdlc), [`REG`](../sources/1c-alfa/reg.md#sdlc-task-classification)
- Обязательность фиксации изменений в «Базе изменённых объектов»: [`REG`](../sources/1c-alfa/reg.md#sdlc-development-gate-changed-objects)
- КД3 (пайплайны выполнения): [`KD3`](../sources/1c-alfa/kd3.md#pipelines)
- Управляемые формы (компоновка): [`FORMS`](../sources/1c-alfa/forms.md#forms-headings)

## Критические ограничения
- `temp/` рассматривается как read-only источник.
- В примерах использовать плейсхолдеры: `<TICKET>`, `<HOST>`, `<USER>`.
- Детали интеграций фиксируются только через стабильные SoT-выжимки в `.kilocode/sources/1c-alfa/`.

---

## Шаг 1 — Intake (профиль задачи)
Собери минимальные ответы:

1) **Контур/конфигурация:** CRM / ERP / КД3 / другое.

2) **Класс задачи:**
- «поддержка» (оценка кодирования < 1 часа)
- «проектная» (оценка кодирования > 1 часа)

Основание классификации: [`REG`](../sources/1c-alfa/reg.md#sdlc-task-classification)

3) **Что меняем (триггеры загрузки правил):**
- метаданные (новые объекты / изменение типовых)
- формы/UX
- расширение (hotfix) / обновляемость
- роли/права доступа
- интеграция (REST/JSON/RabbitMQ)

4) **Трассируемость:** номер заявки `<TICKET>` (УЗ/трекер) + список изменяемых объектов.

Основание «База изменённых объектов» как обязательный артефакт: [`REG`](../sources/1c-alfa/reg.md#sdlc-development-gate-changed-objects)

---

## Шаг 2 — Targeted load (минимальная подгрузка firm-правил)

### 2.1 Всегда загружать
- Skill: `1c-alfa-sdlc`
- Skill: `1c-alfa-coding-standards`

### 2.2 Условно загружать
- Если есть изменения объектов/релиза → `1c-alfa-traceability`
- Если КД3 → `1c-alfa-kd3`
- Если UI/формы → `1c-alfa-ui-forms`
- Если расширение/hotfix → `1c-alfa-extension-policy`
- Если роли/права → `1c-alfa-access-control`
- Если интеграция → `1c-alfa-integration-overview` + (при наличии RabbitMQ/JSON) соответствующие навыки:
  - `1c-alfa-rabbitmq`
  - `1c-alfa-json-contracts`

### 2.3 Выход (результат прайминга)
Зафиксируй итог в протоколе задачи:
- класс задачи (поддержка/проект)
- список skills для работы
- обязательные артефакты/гейты SDLC
- риск-зоны (КД3/интеграции/права/формы)

---

## Связанные процессы
- SDLC: `.kilocode/workflows/1c-alfa-sdlc.md`
- Трассируемость: `.kilocode/workflows/1c-alfa-traceability.md`
- Тестирование 1С (pack): `.kilocode/workflows/1c-testing-workflow.md`
