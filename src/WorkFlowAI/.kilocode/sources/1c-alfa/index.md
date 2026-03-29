# Firm SoT (sanitизированные выжимки источников): 1С

Этот каталог содержит **санитизированные** выжимки внутренних firm‑регламентов, чтобы pack мог работать **без зависимости от `temp/`**.

Ограничения:
- здесь **нет** оригинальных `.docx/.pdf`;
- здесь **нет** URL/хостов/учётных данных/персональных данных;
- для примеров используются плейсхолдеры: `<TICKET>`, `<USER>`, `<DATETIME>`, `<HOST>`.

## Быстрая навигация

### REG — регламент разработки 1С (операционный минимум)
- SDLC «Заявка → DONE»: [`reg.md#sdlc`](reg.md#sdlc)
- Трассируемость изменений («База изменённых объектов», XML): [`reg.md#traceability`](reg.md#traceability)
- Хранилище разработчиков (1C Storage): [`reg.md#storage`](reg.md#storage)
- Расширения (политика, hotfix через «Исправление»): [`reg.md#extensions`](reg.md#extensions)
- HTTP‑сервисы и Swagger (УЗ): [`reg.md#http-swagger`](reg.md#http-swagger)
- Интеграции (подтверждённый минимум): [`reg.md#integration-overview`](reg.md#integration-overview)
- Стандарты кода и метаданных: [`reg.md#coding-standards`](reg.md#coding-standards)
- Права доступа и роли: [`reg.md#access-control`](reg.md#access-control)

### KD3 — регламент доработки/CR правил «Конвертация данных», ред. 3.0
- Ключевые правила: [`kd3.md#key-rules`](kd3.md#key-rules)
- Firm‑пайплайны выполнения: [`kd3.md#pipelines`](kd3.md#pipelines)
- Минимальный процесс доработки: [`kd3.md#process`](kd3.md#process)

### FORMS — приложение «Компоновка управляемых форм»
- Чеклист компоновки: [`forms.md#checklist`](forms.md#checklist)

---

## Интеграции (детали)

- RabbitMQ (стандарты): [`rabbitmq.md`](rabbitmq.md)
- Пакеты обмена (модель/ограничения): [`exchange-packet.md`](exchange-packet.md)
- JSON (правила именования): [`json.md`](json.md)
- Хранение настроек интеграции: [`integration-settings.md`](integration-settings.md)

## Бизнес-домены

- Управленческий контур взаиморасчётов: [`mutual-settlements.md`](mutual-settlements.md)

## BPM / CRM

- Движок бизнес‑процессов и точки: [`bpm.md`](bpm.md)

## Прочее

- Отключаемый функционал и очистка легаси: [`feature-toggles.md`](feature-toggles.md)
- Template generator: [`template-generator.md`](template-generator.md)
- CRM регистры: [`crm-registers.md`](crm-registers.md)
- Очередь отложенных заданий (статус извлечения): [`deferred-jobs.md`](deferred-jobs.md)
- Логирование использования (статус извлечения): [`logging-usage.md`](logging-usage.md)
- Соответствие объектов (статус извлечения): [`object-mapping.md`](object-mapping.md)

## Трассируемость / соответствие

- Матрица соответствия требований: [`compliance-matrix.md`](compliance-matrix.md)
