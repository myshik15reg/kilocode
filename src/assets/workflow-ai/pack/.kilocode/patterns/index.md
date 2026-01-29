# Patterns Index

Центральный индекс всех паттернов и стандартов проекта.

## Directories

### [`languages/`](languages/)
Паттерны для конкретных языков программирования:
- Backend: Rust, Java, C#, C++, Python, Go, Kotlin
- Frontend: TypeScript, React, Vue.js, Angular
- Node.js ecosystem

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

| Файл | Описание |
|------|----------|
| [`code-standards.md`](code-standards.md) | Общие стандарты кода (SOLID, документация) |
| [`design-patterns.md`](design-patterns.md) | Best practices и шаблоны проектирования (GoF + архитектурные) |
| [`frameworks.md`](frameworks.md) | Рекомендуемые фреймворки по стеку и правила выбора |
| [`testing.md`](testing.md) | Стандарты тестирования (coverage, AAA) |
| [`documentation/readme-template.md`](documentation/readme-template.md) | Шаблон README (структура, принципы) |
| [`documentation/api-docs-template.md`](documentation/api-docs-template.md) | Шаблон API документации (контракты/примеры) |
| [`documentation/ai-module-doc-template.md`](documentation/ai-module-doc-template.md) | Шаблон AI-only документации модуля |
| [`orchestration/context-handoff.md`](orchestration/context-handoff.md) | Context handoff protocol for delegation |
| [`orchestration/context-capsule.md`](orchestration/context-capsule.md) | Minimal context packet for memory-bank-limited models |

## Как использовать

1. **При старте задачи** — прочитай `code-standards.md` и `testing.md`
2. **Для конкретного языка** — прочитай файл из `languages/`
3. **Для безопасности** — прочитай `security/security.md`
4. **Для frontend** — прочитай файлы из `frontend/`

## Quick Reference

### Минимальные требования

| Метрика | Значение |
|---------|----------|
| Test Coverage (Lines) | ≥ 100% |
| Test Coverage (Branches) | ≥ 100% |
| Documentation | Все публичные API |
| Code Review | Обязательно |

### Обязательные проверки

- [ ] Код соответствует стандартам языка
- [ ] SOLID принципы соблюдены
- [ ] Unit tests написаны
- [ ] Нет security issues
- [ ] Документация актуальна
