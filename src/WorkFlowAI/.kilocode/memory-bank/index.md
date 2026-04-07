# Memory Bank

Проектный контекст для людей и AI-агентов. Хранится в репозитории проекта: `.kilocode/memory-bank/`.

## Session start

1. Прочитать этот файл.
2. Прочитать `context.md`.
3. Подтвердить в чате: `[MB: OK]`.

## Navigation

- `brief.md` — цель/требования/DoD
- `product.md` — пользователи и сценарии
- `architecture.md` — архитектура и решения
- `tech.md` — стек и команды
- `context.md` — текущий фокус и следующий шаг

## Update policy

Язык и кодировка: active Memory Bank ведётся на русском; файлы с кириллицей MUST быть UTF-8 без BOM. См. [`../rules/language-and-encoding.md`](../rules/language-and-encoding.md:1).

Memory Bank MUST обновляться только для долгоживущего контекста проекта.

1. Используй [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1) перед любой записью.
2. Используй [`../commands/update-memory-bank.md`](../commands/update-memory-bank.md:1) после meaningful work.
3. Raw notes и task-local artifacts MUST NOT попадать сюда напрямую; сначала `.notes/` или `.protocols/.../artifacts/`.
