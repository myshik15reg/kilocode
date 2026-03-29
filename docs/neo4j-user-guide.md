# Руководство пользователя: Гибридный поиск кода с Neo4j

## Обзор

AlfaCode assistant теперь поддерживает **гибридный поиск кода**, комбинирующий:

- **Семантический поиск** (Qdrant) - находит код по смыслу, а не по ключевым словам
- **Графовый поиск** (Neo4j) - понимает связи между компонентами кода

Результат: более точные и контекстно-зависимые результаты поиска.

## Что такое гибридный поиск?

### Традиционный семантический поиск

```
Запрос: "функция для сложения чисел"
Результат: Находит функции add(), sum(), calculate() по сходству векторов
```

### Гибридный поиск (Семантический + Графовый)

```
Запрос: "функция для сложения чисел"
Результат:
1. Находит add(), sum(), calculate() (семантика)
2. Анализирует, где эти функции используются (граф зависимостей)
3. Учитывает важность функции в проекте
4. Комбинирует оценки: 60% семантика + 40% граф
```

## Преимущества

### 1. Лучшая точность поиска

- Учитывает контекст использования кода
- Отличает важные функции от вспомогательных
- Понимает связи между компонентами

### 2. Анализ влияния изменений

- Показывает, какой код зависит от данной функции
- Помогает оценить риски рефакторинга
- Визуализирует граф зависимостей

### 3. Навигация по кодовой базе

- Быстро находит связанные файлы
- Показывает цепочки вызовов
- Помогает понять архитектуру

## Установка и настройка

### Шаг 1: Установка Neo4j

**Windows Server 2019:**

1. Скачайте Neo4j Community Edition через VPN (из-за блокировки CloudFront)
2. Следуйте инструкции: [`docs/neo4j-windows-service-installation.md`](neo4j-windows-service-installation.md)
3. Запустите Neo4j как Windows Service
4. Проверьте доступность: http://localhost:7474

**Альтернативы:**

- Docker: `docker run -p 7474:7474 -p 7687:7687 neo4j:5.25.1`
- Neo4j Aura (облачная версия)

### Шаг 2: Настройка AlfaCode assistant

1. Откройте настройки VSCode (Ctrl+,)
2. Найдите "AlfaCode assistant: Neo4j"
3. Укажите параметры подключения:

```json
{
	"kilocode.neo4j.enabled": true,
	"kilocode.neo4j.uri": "bolt://localhost:7687",
	"kilocode.neo4j.username": "neo4j",
	"kilocode.neo4j.database": "neo4j"
}
```

4. Установите пароль через Command Palette:
    - `Ctrl+Shift+P` → "AlfaCode assistant: Set Neo4j Password"
    - Введите пароль (по умолчанию: `neo4j`, но рекомендуется сменить)

### Шаг 3: Индексация проекта

1. Откройте Command Palette (`Ctrl+Shift+P`)
2. Выполните команду: "AlfaCode assistant: Start Code Indexing"
3. Дождитесь завершения (будут индексированы Qdrant + Neo4j)

**Статус индексации:**

- Qdrant: Векторные эмбеддинги для семантического поиска
- Neo4j: Граф зависимостей (imports, calls, inherits, etc.)

## Использование

### Обычный поиск

AlfaCode assistant **автоматически** использует гибридный поиск, если Neo4j включен:

1. Откройте палитру команд (`Ctrl+Shift+P`)
2. "AlfaCode assistant: Search Code Index"
3. Введите запрос: "функция для валидации email"
4. Получите результаты с учетом контекста

**Как это работает под капотом:**

```typescript
// Пользователь видит обычный поиск
searchIndex("email validation")

// Внутри AlfaCode assistant:
if (neo4jEnabled && neo4jAvailable) {
	// Используется HybridSearchService
	return hybridSearch(query) // Qdrant + Neo4j
} else {
	// Fallback на семантический поиск
	return semanticSearch(query) // Только Qdrant
}
```

### Продвинутый поиск (через API)

Для разработчиков расширений:

```typescript
import { CodeIndexSearchService } from './services/code-index/search-service'

const searchService = new CodeIndexSearchService(...)

// Гибридный поиск с детальными метриками
const results = await searchService.hybridSearch("user authentication", "src/auth")

results.forEach(result => {
  console.log(`File: ${result.filePath}`)
  console.log(`Semantic Score: ${result.semanticScore}`) // 0.0-1.0
  console.log(`Graph Score: ${result.graphScore}`)       // 0.0-1.0
  console.log(`Combined: ${result.combinedScore}`)       // Weighted avg
  console.log(`Related Entities: ${result.relatedEntities.length}`)
  console.log(`Entity Types: ${result.graphMetadata?.entityTypes}`)
})
```

### Анализ влияния изменений

**Сценарий:** Вы хотите изменить функцию `calculateTotal()` и понять, что сломается.

```typescript
import { HybridSearchService } from './services/neo4j/hybrid-search-service'

const hybridService = new HybridSearchService(...)

// Найти всех, кто использует эту функцию
const dependents = await hybridService.searchDependents(
  "function:src/cart.ts:calculateTotal",
  maxDepth: 3 // До 3 уровней вложенности
)

dependents.forEach(dep => {
  console.log(`${dep.filePath} зависит от calculateTotal`)
  console.log(`Depth: ${dep.graphMetadata?.impactDepth}`)
})
```

**Вывод:**

```
src/checkout.ts зависит от calculateTotal (Depth: 1)
src/payment.ts зависит от calculateTotal (Depth: 2)
src/analytics.ts зависит от calculateTotal (Depth: 3)
```

## Примеры использования

### Пример 1: Поиск реализации функции

**Запрос:** "where is user authentication implemented"

**Результаты:**

```
1. src/auth/authenticate.ts (Score: 0.95)
   - Semantic: 0.9 (высокое сходство с запросом)
   - Graph: 1.0 (много зависимых модулей)
   - Entities: [function:authenticate, class:AuthService]

2. src/middleware/auth.ts (Score: 0.88)
   - Semantic: 0.85
   - Graph: 0.93 (используется в routes)
   - Entities: [function:verifyToken, function:checkPermissions]
```

### Пример 2: Поиск использований API

**Запрос:** "API endpoints that use database transactions"

**Результаты показывают:**

- Файлы с эндпоинтами
- Связи с database service
- Цепочки вызовов до транзакций

### Пример 3: Рефакторинг

**Задача:** Переименовать `UserService` → `AccountService`

**Действия:**

1. Найдите класс: `"UserService class definition"`
2. Используйте `searchDependents()` для анализа влияния
3. Список файлов для изменения:
    ```
    src/services/user.ts (определение)
    src/controllers/user.controller.ts (импорт)
    src/routes/api.ts (использование)
    tests/user.spec.ts (тесты)
    ```

## Настройка весов поиска

По умолчанию: **60% семантика + 40% граф**

Можно изменить для конкретных запросов:

```typescript
// Больше семантики (для абстрактных запросов)
const results = await searchService.hybridSearch("algorithm for sorting", {
	semanticWeight: 0.8, // 80% семантика
	graphWeight: 0.2, // 20% граф
})

// Больше графа (для структурных запросов)
const results = await searchService.hybridSearch("dependencies of module X", {
	semanticWeight: 0.3, // 30% семантика
	graphWeight: 0.7, // 70% граф
})
```

## Поддерживаемые языки

Neo4j индексация поддерживает:

| Язык                      | Entities                                    | Relationships                                    |
| ------------------------- | ------------------------------------------- | ------------------------------------------------ |
| **TypeScript/JavaScript** | ✅ function, class, interface, type, import | ✅ imports, calls, inherits, implements, exports |
| **Python**                | ✅ function, class, import                  | ✅ imports, calls, inherits                      |
| **Java**                  | ✅ class, method, import                    | ✅ imports, extends, implements                  |
| **Другие**                | ✅ fallback (file entity)                   | ⚠️ ограниченная поддержка                        |

## Troubleshooting

### Neo4j не подключается

**Проблема:** "Failed to connect to Neo4j at bolt://localhost:7687"

**Решение:**

1. Проверьте, запущен ли Neo4j:
    ```cmd
    sc query Neo4j
    ```
2. Проверьте порт 7687:
    ```cmd
    netstat -an | findstr 7687
    ```
3. Проверьте пароль в VSCode Settings

### Индексация Neo4j не запускается

**Проблема:** Qdrant работает, но Neo4j не индексирует

**Решение:**

1. Проверьте логи: Output → AlfaCode assistant
2. Убедитесь, что `neo4j.enabled = true`
3. Переиндексируйте: "AlfaCode assistant: Clear Index Data" → "Start Code Indexing"

### Медленный поиск

**Проблема:** Гибридный поиск работает медленно

**Решение:**

1. Создайте индексы в Neo4j:
    ```cypher
    CREATE INDEX entity_file_path IF NOT EXISTS FOR (e:CodeEntity) ON (e.filePath)
    CREATE INDEX entity_type IF NOT EXISTS FOR (e:CodeEntity) ON (e.type)
    ```
2. Уменьшите `maxResults` в настройках
3. Используйте `directoryPrefix` для ограничения области поиска

### Fallback на семантический поиск

**Ситуация:** Neo4j временно недоступен

**Поведение:** AlfaCode assistant автоматически использует только Qdrant

**Логи:**

```
[CodeIndexSearchService] Neo4j unavailable, using semantic-only search
```

## FAQ

**Q: Нужно ли переиндексировать проект после установки Neo4j?**  
A: Да, выполните "Clear Index Data" → "Start Code Indexing" для создания графа.

**Q: Сколько места занимает Neo4j индекс?**  
A: ~10-50 MB на 1000 файлов (зависит от сложности кода).

**Q: Можно ли использовать Neo4j Aura (cloud)?**  
A: Да, укажите URI облачного инстанса: `neo4j+s://xxxxx.databases.neo4j.io`

**Q: Работает ли гибридный поиск без Neo4j?**  
A: Да, автоматически используется semantic-only search (Qdrant).

**Q: Как отключить Neo4j, но сохранить Qdrant?**  
A: Установите `kilocode.neo4j.enabled: false` в настройках.

## Дополнительные ресурсы

- [Архитектура гибридной системы](neo4j-hybrid-architecture.md)
- [Установка Neo4j на Windows](neo4j-windows-service-installation.md)
- [API документация](../src/services/neo4j/interfaces.ts)
- [Unit тесты](../src/services/neo4j/__tests__)

## Обратная связь

Нашли баг или есть предложение? Создайте issue на GitHub.
