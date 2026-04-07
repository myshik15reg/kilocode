# Patterns Index

Центральный индекс всех паттернов и стандартов проекта.

## Directories

### [`1c/`](1c/)

Паттерны для 1С:Enterprise:

- `jdocstring.md` — документирование методов
- `kd3.md` — конфигуратор документов
- `rabbitmq.md` — интеграция с RabbitMQ
- `handoff-templates.md` — шаблоны передачи контекста

### [`analysis/`](analysis/)

Паттерны анализа:

- `dual-analysis.md` — Generator + Critic метод
- `requirements-template.md` — шаблон требований
- `task-decomposition-template.md` — шаблон декомпозиции задач (requirements → tasks → coverage)

### [`orchestration/`](orchestration/)

Паттерны оркестрации агентов:

- `context-handoff.md` — протокол передачи контекста
- `context-capsule.md` — минимальный пакет контекста
- `result-contract.md` — канонический формат результатов подзадач
- `agent-guardrails.md` — guardrails вокруг agent-driven работы
- `integration-types.md` — различение `resource` / `prompt` / `tool`

### [`languages/`](languages/)

Паттерны для конкретных языков программирования:

- Backend: Rust, Java, C#, C++, Python, Go, Kotlin
- Frontend: TypeScript, React, Vue.js, Angular
- Node.js ecosystem

### [`databases/`](databases/)

Паттерны для баз данных:

- PostgreSQL, MongoDB, MySQL, Redis

### [`security/`](security/)

Стандарты безопасности:

- OWASP Top 10
- Input validation
- Authentication/Authorization
- Security headers

### [`frontend/`](frontend/)

Frontend-специфичные паттерны:

- UI компоненты
- CSS/Tailwind
- Accessibility

### [`documentation/`](documentation/)

Шаблоны и правила для документации:

- README шаблоны
- API docs шаблоны
- AI-only module docs

## Core Files

| Файл                                                                                 | Описание                                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`code-standards.md`](code-standards.md)                                             | Общие стандарты кода (SOLID, документация)                    |
| [`design-patterns.md`](design-patterns.md)                                           | Best practices и шаблоны проектирования (GoF + архитектурные) |
| [`frameworks.md`](frameworks.md)                                                     | Рекомендуемые фреймворки по стеку и правила выбора            |
| [`testing.md`](testing.md)                                                           | Стандарты тестирования (coverage, AAA)                        |
| [`documentation/readme-template.md`](documentation/readme-template.md)               | Шаблон README (структура, принципы)                           |
| [`documentation/api-docs-template.md`](documentation/api-docs-template.md)           | Шаблон API документации (контракты/примеры)                   |
| [`documentation/ai-module-doc-template.md`](documentation/ai-module-doc-template.md) | Шаблон AI-only документации модуля                            |
| [`orchestration/context-handoff.md`](orchestration/context-handoff.md)               | Context handoff protocol for delegation                       |
| [`orchestration/context-capsule.md`](orchestration/context-capsule.md)               | Minimal context packet for memory-bank-limited models         |
| [`orchestration/result-contract.md`](orchestration/result-contract.md)               | Structured result contract for handoff outputs                |
| [`orchestration/agent-guardrails.md`](orchestration/agent-guardrails.md)             | Agent guardrails lifecycle                                    |
| [`orchestration/integration-types.md`](orchestration/integration-types.md)           | Typed integration semantics for context, prompts, and actions |

## Как использовать

1. **При старте задачи** — прочитай `code-standards.md` и `testing.md`
2. **Для оркестрации** — прочитай `orchestration/context-handoff.md` и `orchestration/result-contract.md`
3. **Для внешних интеграций/MCP** — прочитай `orchestration/integration-types.md`
4. **Для конкретного языка** — прочитай файл из `languages/`
5. **Для безопасности** — прочитай `security/security.md`
6. **Для frontend** — прочитай файлы из `frontend/`
