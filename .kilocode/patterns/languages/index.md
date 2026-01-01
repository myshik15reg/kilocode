# Language Patterns Index

Паттерны и стандарты кода для различных языков программирования.

## 1С:Предприятие (Основной язык)

| Язык | Файл | Описание |
|------|------|----------|
| **1С:Предприятие 8.3** | [1c.md](1c.md) | BSL, jdocstring, SOLID для 1С, тестирование |

> **Примечание:** 1С — основной рабочий язык. Инструкции максимально детальные.

## Backend Languages

| Язык | Файл | Описание |
|------|------|----------|
| **Rust** | [rust.md](rust.md) | Memory safety, RAII, async с Tokio |
| **Java** | [java.md](java.md) | SOLID, Streams, Spring patterns |
| **C#** | [csharp.md](csharp.md) | .NET, async/await, LINQ |
| **C++** | [cpp.md](cpp.md) | Modern C++20, smart pointers, RAII |
| **Python** | [python.md](python.md) | Type hints, async, Pydantic |
| **Go** | [go.md](go.md) | Goroutines, channels, interfaces |
| **Kotlin** | [kotlin.md](kotlin.md) | Coroutines, Flow, sealed classes |

## Frontend Languages/Frameworks

| Технология | Файл | Описание |
|------------|------|----------|
| **TypeScript** | [typescript.md](typescript.md) | Advanced types, generics, guards |
| **React** | [react.md](react.md) | Hooks, React Query, Zustand |
| **Vue.js** | [vuejs.md](vuejs.md) | Composition API, Pinia, signals |
| **Angular** | [angular.md](angular.md) | Signals, standalone components |

## Node.js Ecosystem

| Технология | Файл | Описание |
|------------|------|----------|
| **Node.js** | [nodejs.md](nodejs.md) | Express, NestJS, TypeScript |

## Общие принципы для всех языков

### SOLID
- **S** - Single Responsibility
- **O** - Open/Closed
- **L** - Liskov Substitution
- **I** - Interface Segregation
- **D** - Dependency Inversion

### Именование
- Классы/Типы: `PascalCase`
- Функции/Методы: `camelCase` или `snake_case` (зависит от языка)
- Константы: `UPPER_SNAKE_CASE`
- Приватные поля: `_prefix` или `m_prefix`

### Тестирование
- Unit tests: 70%+ coverage
- Integration tests: критические пути
- E2E tests: основные сценарии

### Документация
- Публичные API документированы
- Примеры использования
- Описание параметров и возвращаемых значений
