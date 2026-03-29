# Core Concepts: Memory Bank, Protocols, Agents

Назначение: единые определения и связь между Memory Bank, протоколами и режимами.

Термины: [`terminology.md`](terminology.md:1).
Нормативная рамка документов: [`docs-standards.md`](docs-standards.md:1).

## 1) Memory Bank

Memory Bank = долгоживущий контекст consuming project в `.kilocode/memory-bank/`.

| File                                        | Meaning                    |
| ------------------------------------------- | -------------------------- |
| [`index.md`](../memory-bank/index.md:1)     | навигация и правила чтения |
| [`context.md`](../memory-bank/context.md:1) | текущий фокус              |

## 2) Protocols

Protocol = временный workspace задачи в `.protocols/YYYY-MM-DD-name/`.

| File           | Meaning            |
| -------------- | ------------------ |
| `brief.md`     | требования и DoD   |
| `plan.md`      | шаги и verify      |
| `execution.md` | лог (если ведётся) |

Процесс: [`protocol-new.md`](../workflows/protocol-new.md:1).

## 3) Agents (modes)

1. Один `task` MUST выполняться в одном `mode`.
2. Делегирование MUST выполняться через `new_task` и strict handoff. SoT: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
3. Выбор режима MUST следовать SoT: [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1).
