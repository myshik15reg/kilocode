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

## Core Files

| Файл | Описание |
|------|----------|
| [`code-standards.md`](code-standards.md) | Общие стандарты кода (SOLID, документация) |
| [`testing.md`](testing.md) | Стандарты тестирования (coverage, AAA) |

## Как использовать

1. **При старте задачи** — прочитай `code-standards.md` и `testing.md`
2. **Для конкретного языка** — прочитай файл из `languages/`
3. **Для безопасности** — прочитай `security/security.md`
4. **Для frontend** — прочитай файлы из `frontend/`

## Quick Reference

### Минимальные требования

| Метрика | Значение |
|---------|----------|
| Test Coverage (Lines) | ≥ 70% |
| Test Coverage (Branches) | ≥ 60% |
| Documentation | Все публичные API |
| Code Review | Обязательно |

### Обязательные проверки

- [ ] Код соответствует стандартам языка
- [ ] SOLID принципы соблюдены
- [ ] Unit tests написаны
- [ ] Нет security issues
- [ ] Документация актуальна
