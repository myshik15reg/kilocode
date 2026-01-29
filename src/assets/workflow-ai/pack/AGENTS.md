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
- меняется **1 файл**
- изменение **<= 10 строк**
- **нет** изменения поведения/логики/публичного API
- **нет** новых зависимостей, конфигов, CI/скриптов, миграций

**Всё остальное = нетривиальная задача.** Протокол обязателен всегда; если сомневаешься — усложняй план, но не отменяй протокол.

### Примеры классификации

| Задача | Классификация | Почему |
|--------|---------------|--------|
| Исправить опечатку в комментарии | Тривиально | 1 файл, 1 строка, нет изменения логики |
| Исправить опечатку в переменной | **Нетривиально** | Изменение поведения (если используется) |
| Обновить URL в README | Тривиально | 1 файл, нет логики |
| Обновить URL в коде | **Нетривиально** | Изменение поведения |
| Добавить комментарий | Тривиально | Нет изменения логики |
| Переименовать функцию | **Нетривиально** | Изменение публичного API |
| Исправить форматирование | Тривиально | Нет изменения логики |
| Добавить параметр в функцию | **Нетривиально** | Изменение API |
| Исправить typo в 3 файлах | **Нетривиально** | Больше 1 файла |
| Обновить версию зависимости | **Нетривиально** | Может изменить поведение |
| Добавить console.log для debug | **Нетривиально** | Изменение кода (удали перед merge!) |

### Правило большого пальца
**Если сомневаешься — считай нетривиальным.** Лучше перестараться с протоколом, чем пропустить важное.

## 🧰 Kilo Code vs Codex CLI (tools)

**Kilo Code (VSCode):**
- Инструменты: `read_file`, `apply_diff`, `write_to_file`, `execute_command`
- Делегирование: `new_task` (`switch_mode` запрещён)

**Codex CLI (terminal):**
- Команды: `functions.shell_command` (всегда с `timeout_ms`, см. `.kilocode/rules/ai-execution-rules.md`)
- Редактирование файлов: `functions.apply_patch`
- План (опционально): `functions.update_plan`
- `new_task` недоступен -> используй role-loop внутри одной сессии (architect -> implementer -> tester -> reviewer); это **исключение для Codex CLI**, протокол обязателен всегда

Подробности: `.kilocode/rules/tool-usage-guide.md`.

## 80/20: какой режим выбрать

- Планирование/закрытие протокола: `architect`
- Координация сложной задачи и multi-agent: `orchestrator` (+ `decomposer` при необходимости)
- Реализация: самый узкий `*-dev` / `*-specialist` (и только если нет — `code`)
- Тесты: `unit-tester`, `integration-tester`, `e2e-tester`, `security-tester`
- Code Review/QA: `reviewer`
- Вопрос/поиск/разъяснение: `ask` (+ `planning/research-*` для read-only исследований)

**Полный реестр режимов:** `.kilocode/modes/REGISTRY.md`
**Выбор режима:** `.kilocode/rules/agents-guide.md`, `.kilocode/rules/orchestrator-guide.md`
**Доступные skills:** `.kilocode/skills/index.md`

---

## 🔥 Абсолютные правила (Zero Tolerance)

Единые требования качества и процесса (детали в первоисточниках):
- **100% coverage (lines/branches/functions) и TDD** - см. `.kilocode/rules/testing-rules.md`
- **Lint: 0 errors / 0 warnings, не отключать правила** - см. `.kilocode/patterns/code-standards.md`
- **TODO только с тикетом**: `// TODO(#123): ...` - см. `.kilocode/patterns/code-standards.md`
- **Changesets для монорепозиториев**: `npx changeset add` - см. `.kilocode/rules/git-workflow-rules.md`
- **`kilocode_change` маркер при изменении кода** - см. `.kilocode/patterns/code-standards.md`

---

## 📋 Core Principles

1. **Memory First:** Всегда начинай с `.kilocode/memory-bank/index.md` -> `[MB: OK]`
2. **No Protocol, No Code:** Любые изменения без протокола в `.protocols/` — запрещены (без исключений)
3. **Update Plan:** После каждого шага обновляй `.protocols/.../plan.md`
4. **Log Decisions:** Нестандартные решения -> `.protocols/.../execution.md`
5. **Clean Finish:** Все тесты проходят -> обнови Memory Bank
6. **Context Isolation:** Работай только с файлами из плана
7. **Cleanup Policy:** Удаляй временные артефакты после завершения
8. **ONE MODE PER TASK:** В Kilo Code один таск = один режим; смена режима только через `new_task`, `switch_mode` запрещён. Исключение: Codex CLI, где допустима роль-петля в одной сессии
9. **Baby Steps:** Мелкие итерации. Сломал -> откатись и сделай шаг меньше
10. **Design Principles:** SOLID, KISS, DRY, YAGNI, TRIZ, Emergent Design
11. **Absolute Quality:** Качество > скорость. 100% coverage обязателен

---

## 🗣️ Язык и кодировка

- Отвечай на языке пользователя (RU/EN).
- Внутри репозитория допускается RU/EN документация, но не смешивай языки в одном абзаце без необходимости.
- Все файлы WorkFlowAI — UTF-8 без BOM; в Windows PowerShell читай Markdown явно с UTF-8: `Get-Content -Raw -Encoding utf8 <path>` (см. `.kilocode/rules/environment-windows.md`).

---

## 🛠️ Режимы работы

### 🏛️ Architect Mode
**Роль:** Планирование и завершение
**Читать:**
- `.kilocode/memory-bank/brief.md`, `product.md`, `architecture.md`, `context.md`
- `.kilocode/rules/project-rules.md`

**Обязанности:**
- Создание протоколов в `.protocols/YYYY-MM-DD-feature-name/`
- Написание `brief.md`, `plan.md`
- Code Review после реализации
- Merge и обновление Memory Bank

**ЗАПРЕЩЕНО:** Писать код — делегируй через `new_task`

---

### 💻 Code Mode
**Роль:** Реализация
**Читать:**
- `.protocols/.../brief.md`, `plan.md`
- `.kilocode/patterns/code-standards.md`
- `.kilocode/rules/testing-rules.md`, `.kilocode/rules/security-rules.md`

**Обязанности:**
- Писать код по плану
- Обновлять `plan.md` (отмечать выполненное)
- Вести `execution.md`
- Запускать тесты (100% coverage!)

**ЗАПРЕЩЕНО:** Менять архитектуру без обновления `architecture.md`

---

### 🔍 Reviewer Mode
**Роль:** Code Review, QA
**Читать:**
- `.kilocode/patterns/code-standards.md`
- `.kilocode/rules/security-rules.md`, `.kilocode/rules/testing-rules.md`

**Checklist:**
- [ ] SOLID принципы соблюдены
- [ ] Tests: 100% coverage (lines, branches, functions)
- [ ] Lint: 0 errors, 0 warnings
- [ ] Security: OWASP Top 10 защита
- [ ] TODO: все с тикетами
- [ ] Changesets добавлены (если монорепо)
- [ ] Документация обновлена

---

### ❓ Ask Mode
**Роль:** Консультант
**Когда использовать:** Поиск информации, разъяснения

---

### 🌍 Translate Mode
**Роль:** Локализация
**Специфика:** См. `.kilocode/modes/translate.md`
**Когда использовать:** Работа с i18n файлами, переводы

---

### 🏢 1C Modes
**Точка входа:** `1c-orchestrator`
**Специфика:** См. `.kilocode/rules/1c-workflow.md`
**Доступные режимы:**
- `1c-orchestrator` — координация
- `1c-business-analyst` — бизнес-требования
- `1c-system-analyst` — техническое проектирование
- `1c-architect` — архитектура решения
- `1c-developer` — разработка
- `1c-tester` — тестирование (Vanessa Automation)
- Другие специализированные режимы (см. `.kilocode/rules/1c-workflow.md`)

---

## 📚 Ключевые документы

### Обязательны к прочтению:
1. `.kilocode/memory-bank/index.md` — точка входа для контекста
2. `.kilocode/rules/project-rules.md` — основные правила AlfaFlow
3. `.kilocode/rules/testing-rules.md` — 100% coverage, TDD
4. `.kilocode/rules/security-rules.md` — OWASP Top 10
5. `.kilocode/patterns/code-standards.md` — SOLID, KISS, DRY, YAGNI

### Специализированные:
- `.kilocode/rules/tool-usage-guide.md` — использование инструментов
- `.kilocode/rules/mcp-usage-guide.md` — MCP серверы (context7, memory, playwright)
- `.kilocode/rules/git-workflow-rules.md` — Conventional Commits, PR process
- `.kilocode/rules/mode-delegation-example.md` — делегирование между режимами

---

## ✅ Pre-Commit / Pre-Merge

См. `.kilocode/rules/git-workflow-rules.md` и `.kilocode/workflows/protocol-review-merge.md`.

---

## 🚨 Emergency Protocols

### Hotfix Workflow
См. `.kilocode/workflows/hotfix-emergency.md`

**Процесс:**
1. Создать ветку `fix/critical-bug`
2. Минимальный review, но ОБЯЗАТЕЛЬНЫЙ
3. Deploy немедленно
4. Post-mortem после инцидента

---

## 🔗 Навигация

### Структура проекта:
```
.kilocode/
├── memory-bank/       # Глобальный контекст проекта

.kilocode/
├── rules/             # Правила для агентов
├── patterns/          # Паттерны кода (SOLID, Security, Testing)
├── skills/            # Переиспользуемые навыки (CLI, Git, Tests)
├── workflows/         # Процессы (Hotfix, New Skill)
└── modes/             # Специализированные режимы (Translate, 1C)

.protocols/            # Локальные контексты задач
└── YYYY-MM-DD-name/
    ├── brief.md       # Требования
    ├── plan.md        # План задачи
    └── execution.md   # Лог выполнения
```

### Быстрые ссылки:
- **Memory Bank:** `.kilocode/memory-bank/index.md`
- **Правила:** `.kilocode/rules/index.md`
- **Паттерны:** `.kilocode/patterns/`
- **Skills:** `.kilocode/skills/`

---

## 💡 Принципы делегирования

**Kilo Code: используй `new_task`, `switch_mode` запрещён. Codex CLI: `new_task` нет — роль-петля в одной сессии.**
```xml
<!-- ✅ ПРАВИЛЬНО -->
<new_task>
<mode>code</mode>
<message>ЗАДАЧА: Реализовать функцию X по плану</message>
</new_task>

<!-- ❌ НЕПРАВИЛЬНО -->
<switch_mode>
<mode_slug>code</mode_slug>
</switch_mode>
```

**Один таск = один режим** — переключение режима -> создай новую подзадачу!

---

## 🤖 Hybrid AI Strategy & Prompt Engineering

### Роли моделей (Model Roles)

**Primary Model (Deep Reasoning)** — модель с высоким уровнем рассуждения (Claude 3.5 Sonnet, o1):
- **Архитектура**: Проектирование системных решений, дизайн паттернов
- **Сложная логика**: Реализация бизнес-правил, алгоритмов
- **Финальное качество**: Code Review, рефакторинг
- **Критические решения**: Выбор технологий, компромиссы

**Secondary Model (Rapid)** — модель с быстрым откликом (Gemini 1.5 Pro, Haiku):
- **Быстрое прототипирование**: UI/Frontend компоненты
- **Анализ контекста**: Обработка документации, логов
- **Рутина**: Генерация шаблонов, тестов, форматирование

### Prompt Repetition (Bidirectional Attention)

Для повышения точности Secondary Models в задачах поиска и анализа используйте технику **Prompt Repetition**:

*   **Суть:** Дублирование основного запроса в начале и в конце промпта.
*   **Формат:** `<QUERY> ... context ... <QUERY>`
*   **Зачем:** Устраняет "слепоту" модели к инструкциям в начале длинного контекста.

---

## 🎓 Философия качества

> "Качество важнее скорости. 100% покрытие тестами, отсутствие линтер-ворнингов и строгая типизация — это не 'желательно', это 'обязательно'. Мы не идём на компромиссы с качеством."

**TRIZ:** При конфликте принципов приоритет — Идеальному Конечному Результату.

**Emergent Design:** Дизайн рождается через TDD (Red-Green-Refactor).

---

**Готов начать? Выведи `[MB: OK]` и приступай к работе! 🚀**
