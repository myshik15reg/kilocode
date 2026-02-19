# WorkFlowAI - Руководство для AI-агентов

> **⚡ QUICK START:** Для быстрого старта читай `.kilocode/QUICK.md` (~50 строк).
> Этот файл — **полный reference** (Level 2). Читай по необходимости.

## Context Tiers (Оптимизация)

```
Level 0: .kilocode/QUICK.md         (~50 строк)  — ВСЕГДА
Level 1: Task-specific files         (~100-200)   — по типу задачи
Level 2: Этот файл + детальные guides             — reference
```

**Подробнее:** `.kilocode/rules/context-tiers.md`

---

## 🎯 Быстрый старт

1. **Читай QUICK.md:** `.kilocode/QUICK.md` для минимального контекста
2. **Подтверди прочтение:** Выведи строку `[MB: OK]`
3. **Создай протокол:** Обязателен для любой задачи
4. **Выбери режим:** Specialist First (см. таблицу в QUICK.md)
5. **Следуй правилам:** 100% coverage, TDD, 0 lint errors

## ✅ Тривиальная vs нетривиальная задача

**Тривиальная правка** (протокол обязателен; допускается минимальный план) - только если ВСЕ условия:

- меняется **1 файл**, изменение **≤ 10 строк**
- **нет** изменения поведения/логики/публичного API
- **нет** новых зависимостей, конфигов, CI/скриптов, миграций

**Всё остальное = нетривиальная задача.** Если сомневаешься — считай нетривиальным.

**Примеры классификации:** `.kilocode/rules/task-classification.md`

## 🧰 Kilo Code vs Codex CLI

**Kilo Code:** `read_file`, `apply_diff`, `write_to_file`, `execute_command`, делегирование через `new_task`
**Codex CLI:** `functions.shell_command` (с timeout), `functions.apply_patch`, role-loop в одной сессии

**Подробности:** `.kilocode/rules/tool-usage-guide.md`

## 80/20: какой режим выбрать

| Задача                          | Режим                                             |
| ------------------------------- | ------------------------------------------------- |
| Планирование/закрытие протокола | `architect`                                       |
| Координация multi-agent         | `orchestrator`                                    |
| Реализация                      | `*-dev` / `*-specialist` / `code`                 |
| Тесты                           | `unit-tester`, `integration-tester`, `e2e-tester` |
| Code Review                     | `reviewer`                                        |
| Вопрос/поиск                    | `ask`                                             |

**Полный реестр:** `.kilocode/modes/REGISTRY.md` | **Skills:** `.kilocode/skills/index.md`

---

## 🔥 Абсолютные правила (Zero Tolerance)

- **100% coverage** (lines/branches/functions) и **TDD** — `.kilocode/rules/testing-rules.md`
- **Lint: 0 errors / 0 warnings** — `.kilocode/patterns/code-standards.md`
- **TODO только с тикетом:** `// TODO(#123): ...`
- **`kilocode_change` маркер** при изменении кода

---

## 📋 Core Principles

1. **Memory First:** `.kilocode/memory-bank/index.md` → `[MB: OK]`
2. **No Protocol, No Code:** Любые изменения без протокола запрещены
3. **Update Plan:** После каждого шага обновляй `plan.md`
4. **ONE MODE PER TASK:** Смена режима только через `new_task`
5. **Baby Steps:** Мелкие итерации. Сломал → откатись
6. **Absolute Quality:** Качество > скорость

---

## 🛠️ Режимы работы

### 🏛️ Architect Mode

**Роль:** Планирование и завершение
**Читать:** `.kilocode/memory-bank/`, `.kilocode/rules/project-rules.md`
**Обязанности:** Создание протоколов, `brief.md`, `plan.md`, Code Review, Merge
**ЗАПРЕЩЕНО:** Писать код — делегируй через `new_task`

### 💻 Code Mode

**Роль:** Реализация
**Читать:** `.protocols/.../brief.md`, `plan.md`, `.kilocode/patterns/code-standards.md`
**Обязанности:** Код по плану, обновление `plan.md`, тесты (100% coverage!)
**ЗАПРЕЩЕНО:** Менять архитектуру без обновления `architecture.md`

### 🔍 Reviewer Mode

**Роль:** Code Review, QA
**Checklist:** SOLID, 100% coverage, 0 lint, OWASP Top 10, TODO с тикетами

### ❓ Ask Mode

**Роль:** Консультант — поиск информации, разъяснения

### 🏢 1C Modes

**Точка входа:** `1c-orchestrator` | **Специфика:** `.kilocode/rules/1c-workflow.md`

---

## 📚 Ключевые документы

**Обязательны:**

1. `.kilocode/memory-bank/index.md` — точка входа
2. `.kilocode/rules/project-rules.md` — основные правила
3. `.kilocode/rules/testing-rules.md` — 100% coverage, TDD
4. `.kilocode/rules/security-rules.md` — OWASP Top 10
5. `.kilocode/patterns/code-standards.md` — SOLID, KISS, DRY

**Специализированные:** `.kilocode/rules/tool-usage-guide.md`, `.kilocode/rules/mcp-usage-guide.md`, `.kilocode/rules/git-workflow-rules.md`

---

## 🔗 Навигация

```
.kilocode/
├── memory-bank/       # Глобальный контекст проекта
├── rules/             # Правила для агентов
├── patterns/          # Паттерны кода
├── skills/            # Переиспользуемые навыки
├── workflows/         # Процессы
└── modes/             # Специализированные режимы

.protocols/            # Локальные контексты задач
└── YYYY-MM-DD-name/
    ├── brief.md       # Требования
    ├── plan.md        # План задачи
    └── execution.md   # Лог выполнения
```

---

## 💡 Принципы делегирования

**Kilo Code:** `new_task` (не `switch_mode`) | **Codex CLI:** role-loop в одной сессии

```xml
<!-- ✅ ПРАВИЛЬНО -->
<new_task>
<mode>code</mode>
<message>ЗАДАЧА: Реализовать функцию X по плану</message>
</new_task>
```

**Один таск = один режим** — переключение режима → создай новую подзадачу!

---

## 🎓 Философия качества

> "Качество важнее скорости. 100% покрытие тестами — это не 'желательно', это 'обязательно'."

**TRIZ:** При конфликте принципов приоритет — Идеальному Конечному Результату.
**Emergent Design:** Дизайн рождается через TDD (Red-Green-Refactor).

---

**Готов начать? Выведи `[MB: OK]` и приступай к работе! 🚀**
