# Tree-sitter Grammar для 1С:Предприятие 8.3

Парсер для языка программирования 1С:Предприятие (BSL - Built-in Script Language) на основе Tree-sitter.

## О проекте

Этот проект реализует грамматику Tree-sitter для языка 1С:Предприятие 8.3. Tree-sitter — это библиотека для создания быстрых и надежных парсеров, которая используется в современных редакторах кода для подсветки синтаксиса, навигации и других функций.

## Текущий статус

**Версия:** 0.1.0 (Phase 1 - Базовая структура)

На данный момент реализована базовая структура проекта с минимальной грамматикой:

- ✅ Распознавание процедур без параметров
- ✅ Распознавание функций без параметров
- ✅ Поддержка комментариев (`//`)
- ✅ Идентификаторы с поддержкой кириллицы
- ✅ Case-insensitive ключевые слова

## Требования

- Node.js >= 14
- npm или yarn
- Tree-sitter CLI (устанавливается автоматически как dev-зависимость)
- **C/C++ компилятор** (для запуска тестов):
    - Windows: Visual Studio Build Tools или MinGW
    - macOS: Xcode Command Line Tools
    - Linux: gcc/g++

## Установка

```bash
# Клонирование репозитория
cd tools/tree-sitter-grammars

# Установка зависимостей
npm install

# Генерация парсера
npm run generate
```

## Использование

### Генерация парсера

```bash
npm run generate
```

Эта команда генерирует C-код парсера из [`grammar.js`](grammar.js:1).

### Запуск тестов

```bash
npm test
```

Тесты находятся в [`test/corpus/`](test/corpus/:1).

**Примечание:** Для запуска тестов требуется установленный C компилятор. Если компилятор отсутствует, вы увидите ошибку "Failed to execute C compiler". Однако парсер может быть успешно сгенерирован и использован без запуска тестов.

### Парсинг файлов

```bash
npm run parse examples/simple.bsl
```

Эта команда парсит указанный файл и выводит дерево синтаксического разбора.

## Структура проекта

```
tools/tree-sitter-grammars/
├── grammar.js              # Основной файл грамматики
├── package.json            # Конфигурация Node.js проекта
├── bindings/               # Генерируемые bindings
│   └── node/               # Node.js bindings
├── src/                    # Генерируемый парсер (C-код)
│   ├── parser.c
│   └── tree_sitter/
├── test/                   # Тесты грамматики
│   └── corpus/
│       └── declarations.txt
└── examples/               # Примеры кода 1С
    └── simple.bsl
```

## Разработка грамматики

Грамматика определена в файле [`grammar.js`](grammar.js:1). Для добавления новых правил:

1. Отредактируйте [`grammar.js`](grammar.js:1)
2. Запустите `npm run generate` для генерации парсера
3. Добавьте тесты в `test/corpus/`
4. Запустите `npm test` для проверки

### Основные правила грамматики

- `source_file` — корневой узел (файл с кодом)
- `procedure_declaration` — объявление процедуры
- `function_declaration` — объявление функции
- `comment` — однострочный комментарий
- `identifier` — идентификатор (поддержка кириллицы)

## Спецификация

Детальная спецификация грамматики находится в файле [`docs/tree-sitter-onec-grammar-spec.md`](../docs/tree-sitter-onec-grammar-spec.md).

## Roadmap

### Phase 1 (Текущая фаза) ✅

- [x] Базовая структура проекта
- [x] Процедуры и функции (без параметров)
- [x] Комментарии

### Phase 2 (Планируется)

- [ ] Параметры процедур и функций
- [ ] Директивы препроцессора
- [ ] Переменные и константы
- [ ] Базовые типы данных

### Phase 3 (Планируется)

- [ ] Выражения и операторы
- [ ] Управляющие конструкции
- [ ] Обработка ошибок

## Примеры

### Простая процедура

```bsl
// Простой пример
Процедура ПримерПроцедуры()
КонецПроцедуры
```

### Простая функция

```bsl
Функция ПримерФункции()
КонецФункции
```

## Вклад в проект

Проект находится в активной разработке. Если вы хотите внести вклад:

1. Изучите спецификацию в [`docs/tree-sitter-onec-grammar-spec.md`](../docs/tree-sitter-onec-grammar-spec.md)
2. Создайте issue для обсуждения изменений
3. Создайте pull request с описанием изменений

## Лицензия

MIT

## Авторы

Kilocode Team

## Интеграция с Kilocode

### 1. Компиляция в WASM

Подробные инструкции по компиляции грамматики в WASM модуль см. в [WASM Compilation Guide](docs/WASM_COMPILATION.md).

Краткая версия:

```bash
cd tools/tree-sitter-grammars
npm install
npm run generate
tree-sitter build-wasm
cp tree-sitter-onec.wasm ../src/dist/tree-sitter-onec.wasm
```

### 2. Использование TreeSitterGraphExtractor

TreeSitterGraphExtractor - общий экстрактор графа, используемый для всех языков.

```typescript
import { TreeSitterGraphExtractor } from "../src/services/neo4j/extractors/tree-sitter-graph-extractor"
import { getGraphQueryForLanguage } from "../src/services/tree-sitter/languageParser"

const languageId = "onec"
const extractor = new TreeSitterGraphExtractor(languageId, getGraphQueryForLanguage(languageId) ?? "")
await extractor.initialize("../src/dist/tree-sitter-onec.wasm")

const code = `
Функция Пример()
	Возврат "Hello";
КонецФункции
`

const { entities, relationships } = await extractor.extract(code, "test.bsl")
console.log(entities)
console.log(relationships)
```

### 3. RelationshipExtractor

RelationshipExtractor использует общий маппинг из `languageParser.ts`, поэтому ручная регистрация языка не требуется. Достаточно наличия query и корректного languageId (`onec`) для расширений `.bsl`/`.os`.

### Извлекаемые сущности

- **file**
- **function** (включая процедуры и методы)
- **class**
- **interface**
- **module**
- **type** / **enum**
- **variable** / **property**

### Типы связей

- `defines` - файл определяет сущность
- `calls` - вызовы функций (если query содержит call captures)

## Ссылки

- [Tree-sitter](https://tree-sitter.github.io/)
- [Документация 1С:Предприятие](https://its.1c.ru/)
- [WASM Compilation Guide](docs/WASM_COMPILATION.md)
- [TreeSitterGraphExtractor](../src/services/neo4j/extractors/tree-sitter-graph-extractor.ts)
