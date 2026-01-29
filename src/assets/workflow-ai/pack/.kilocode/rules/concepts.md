# Core Concepts: Memory Bank, Protocols, Agents

> Базовые понятия WorkFlowAI и AlfaFlow.

## 1) Memory Bank

Memory Bank - долговременный контекст проекта. Он отвечает на вопросы: кто мы, зачем, как устроены, на чем работаем и какой текущий фокус.

### Структура
- `index.md` - точка входа, навигация по режимам.
- `brief.md` - цели и краткое описание проекта.
- `product.md` - зачем, проблемы пользователей, UX.
- `architecture.md` - архитектурные решения, паттерны, структура.
- `tech.md` - стек, зависимости, инструменты.
- `context.md` - текущий фокус, статус, следующие шаги.

### Принципы
- **Memory First** - всегда начинай с `.kilocode/memory-bank/index.md`.
- **Lazy Loading** - читай только нужные файлы.
- **Keep It Concise** - каждый файл краткий, без лишнего.
- **Update After Milestones** - обновляй после значимых изменений.

## 2) Protocols

Protocol - изолированный контекст задачи. Он фиксирует требования, план и ход выполнения.

### Структура
```
.protocols/YYYY-MM-DD-feature-name/
├── brief.md      # требования и Definition of Done
├── plan.md       # план и файлы к изменению
├── execution.md  # лог решений и прогресса
└── context.md    # доп. материалы (опционально)
```

### Жизненный цикл
1. Запрос пользователя.
2. Architect/Orchestrator создает протокол.
3. Code Mode реализует по plan.md.
4. Reviewer проверяет качество.
5. Architect закрывает протокол и обновляет Memory Bank.

## 3) Agents (Modes)

Агенты = режимы (modes). Каждый агент узко специализируется на типе задач.

### Слои
- Orchestration (координация)
- Analysis (требования, анализ)
- Architecture (дизайн решений)
- Development (реализация)
- Testing (тестирование)
- Quality (ревью, аудит)

**Правило (Kilo Code):** для делегирования используй `new_task`, `switch_mode` запрещён.  
**Исключение (Codex CLI):** `new_task` нет, допускается роль-петля в одной сессии.

## 4) Как это работает вместе
1. Прочитать Memory Bank и подтвердить `[MB: OK]`.
2. Создать протокол и план.
3. Реализовать задачу по plan.md.
4. Пройти тесты и ревью.
5. Обновить Memory Bank и закрыть протокол.

## Следующие документы
- `~/.kilocode/workflows/overview.md`
- `~/.kilocode/rules/agents-guide.md`
- `~/.kilocode/workflows/protocol-examples.md`
