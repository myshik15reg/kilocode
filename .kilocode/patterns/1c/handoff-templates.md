# Шаблоны Context Handoff для 1С-агентов

> Готовые шаблоны передачи контекста между 1С-агентами.
> Используй эти шаблоны при делегировании через `new_task`.

> Примечание по путям: в embedded-режиме используй `.kilocode/...`; при global install — `~/.kilocode/...`.

## Общий формат

```xml
<new_task>
<mode>{agent-slug}</mode>
<message>
ЗАДАЧА: [Описание]

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: [Analysis | Design | Implementation | Testing | Review]

INPUTS:
- [файл 1]
- [файл 2]

PREVIOUS_OUTPUTS:
- [Что сделал предыдущий агент]

CONSTRAINTS:
1. [Ограничение 1]
2. [Ограничение 2]

CAPABILITIES:
- memory_bank: full | limited | none
- subagents: yes | no
- tools: full | read-only | none
=======================

РЕЗУЛЬТАТ: [Ожидаемый формат]
СЛЕДУЮЩИЙ АГЕНТ: [Кому передать]
</message>
</new_task>
```

---

## 1. orchestrator → 1c-orchestrator

```xml
<new_task>
<mode>1c-orchestrator</mode>
<message>
ЗАДАЧА: [исходная задача пользователя]

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: [если есть]
ORIGIN: orchestrator → 1c-orchestrator
REASON: 1С-специфичная задача

CONSTRAINTS:
1. Классифицировать задачу (проектная / поддержка / hotfix)
2. Создать протокол
3. Делегировать первому агенту в цепочке
4. НЕ делать аналитику самостоятельно

CAPABILITIES:
- memory_bank: full
- subagents: yes
- tools: read + command + mcp
=======================

РЕЗУЛЬТАТ: brief.md + делегирование следующему агенту
</message>
</new_task>
```

---

## 2. 1c-orchestrator → 1c-business-analyst

```xml
<new_task>
<mode>1c-business-analyst</mode>
<message>
ЗАДАЧА: Провести бизнес-анализ для задачи "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Analysis

INPUTS:
- .protocols/.../brief.md (исходная заявка)
- .kilocode/memory-bank/product.md (бизнес-контекст)

CONSTRAINTS:
1. Использовать Dual Analysis (Generator + Critic)
2. User Stories должны быть независимо тестируемыми
3. AC в формате ДАНО/КОГДА/ТОГДА
4. Неясности помечать [НУЖНО УТОЧНИТЬ: ...]

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: read-only
=======================

РЕЗУЛЬТАТ:
- artifacts/analysis/business-analysis.md (BRD)
- artifacts/analysis/user-stories.md
- artifacts/analysis/dual-analysis-notes.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-system-analyst
</message>
</new_task>
```

---

## 3. 1c-business-analyst → 1c-system-analyst

```xml
<new_task>
<mode>1c-system-analyst</mode>
<message>
ЗАДАЧА: Разработать техническое задание на основе бизнес-анализа "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Analysis

 INPUTS:
 - .protocols/.../artifacts/analysis/business-analysis.md (BRD)
 - .protocols/.../artifacts/analysis/user-stories.md (User Stories)
 - .kilocode/memory-bank/architecture.md (текущая архитектура)
 - .kilocode/patterns/languages/1c.md (стандарты 1С)

PREVIOUS_OUTPUTS:
- БА: [кол-во] User Stories, [кол-во] функциональных требований
- Dual Analysis: [кол-во] рисков выявлено и митигировано

CONSTRAINTS:
1. Алгоритмы в псевдокоде (НЕ BSL!)
2. Обязательный Impact Analysis
3. Mental Simulation для критичных сценариев
4. Объекты метаданных с типами и обоснованием

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: read-only
=======================

РЕЗУЛЬТАТ:
- artifacts/analysis/technical-solution.md (ТЗ)
- artifacts/analysis/data-model.md
- artifacts/analysis/algorithms.md
- artifacts/analysis/impact-analysis.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-architect
</message>
</new_task>
```

---

## 4. 1c-system-analyst → 1c-architect

```xml
<new_task>
<mode>1c-architect</mode>
<message>
ЗАДАЧА: Спроектировать архитектуру решения "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Design

 INPUTS:
 - .protocols/.../artifacts/analysis/technical-solution.md (ТЗ)
 - .protocols/.../artifacts/analysis/data-model.md (структура данных)
 - .kilocode/memory-bank/architecture.md (текущая архитектура)
 - .kilocode/patterns/languages/1c.md (SOLID для 1С)

PREVIOUS_OUTPUTS:
- СА: [кол-во] новых объектов метаданных, [кол-во] изменяемых
- СА: [кол-во] алгоритмов описано
- СА: Impact Analysis: [краткие выводы]

CONSTRAINTS:
1. SOLID принципы для 1С
2. Минимизация связности модулей
3. Переиспользование БСП где возможно
4. ADR для каждого нестандартного решения
5. Design Review обязателен

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- artifacts/design/architecture.md
- artifacts/design/adr-001-*.md (если нестандартные решения)
- artifacts/design/design-review.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-developer
</message>
</new_task>
```

---

## 5. 1c-architect → Написание решения (skill task-solution)

```xml
<new_task>
<mode>1c-architect</mode>
<message>
ЗАДАЧА: Написать детальное решение (solution.md) для "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Solution Writing

 INPUTS:
 - .protocols/.../artifacts/design/architecture.md (архитектура)
 - .protocols/.../artifacts/analysis/technical-solution.md (ТЗ)
 - .protocols/.../artifacts/analysis/data-model.md (структура данных)
 - .kilocode/skills/task-solution/SKILL.md (skill написания решения)

PREVIOUS_OUTPUTS:
- Архитектор: Design Review [Approved]
- Архитектор: [кол-во] ADR создано

CONSTRAINTS:
1. Применить skill task-solution (ОБЯЗАТЕЛЬНО)
2. Изучить существующий код перед написанием
3. Повелительное наклонение ("Создать", "Добавить")
4. Блок верификации обязателен
5. Примеры кода с указанием местоположения
6. Показать пользователю для подтверждения

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- .protocols/.../solution.md (детальное решение)

СЛЕДУЮЩИЙ АГЕНТ: 1c-developer
</message>
</new_task>
```

---

## 5b. Решение → 1c-developer

```xml
<new_task>
<mode>1c-developer</mode>
<message>
ЗАДАЧА: Реализовать функционал "[название]" согласно решению

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Implementation

 INPUTS:
 - .protocols/.../solution.md (ГЛАВНЫЙ ВХОД — детальное решение)
 - .protocols/.../artifacts/design/architecture.md (архитектура)
 - .protocols/.../artifacts/analysis/technical-solution.md (ТЗ)
 - .kilocode/patterns/languages/1c.md (стандарты кодирования)

PREVIOUS_OUTPUTS:
- Архитектор: Design Review [Approved]
- Архитектор: solution.md написан и верифицирован пользователем

CONSTRAINTS:
1. Реализовывать СТРОГО по solution.md
2. TDD: тесты первыми
3. jdocstring для всех экспортных методов
4. Комментарии к изменениям: // + Альфа-Лизинг. ФИО. Дата. УЗ №.
5. Префикс ал_ для новых объектов
6. АПК: 0 errors, 0 warnings
7. Заполнить Базу измененных объектов

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- Код в конфигурации 1С
- artifacts/implementation/changed-objects.md
- artifacts/implementation/code-samples/

СЛЕДУЮЩИЙ АГЕНТ: 1c-tester
</message>
</new_task>
```

---

## 6. 1c-developer → 1c-tester

```xml
<new_task>
<mode>1c-tester</mode>
<message>
ЗАДАЧА: Написать Unit-тесты (xUnitFor1C) для "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Testing

INPUTS:
- .protocols/.../artifacts/implementation/changed-objects.md
- .protocols/.../artifacts/analysis/technical-solution.md (алгоритмы)
- .protocols/.../artifacts/analysis/user-stories.md (AC)

PREVIOUS_OUTPUTS:
- Developer: [кол-во] модулей, [кол-во] функций реализовано
- Developer: АПК = 0 errors

CONSTRAINTS:
1. Coverage: 100% (lines/branches/functions)
2. AAA pattern (Arrange-Act-Assert)
3. Тесты на edge cases обязательны
4. Naming: Тест_[Метод]_[Сценарий]

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- Unit-тесты (.bsl)
- artifacts/testing/coverage-report.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-vanessa-tester
</message>
</new_task>
```

---

## 7. 1c-tester → 1c-vanessa-tester

```xml
<new_task>
<mode>1c-vanessa-tester</mode>
<message>
ЗАДАЧА: Написать BDD-сценарии (Vanessa) для "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Testing

INPUTS:
- .protocols/.../artifacts/analysis/user-stories.md (AC)
- .protocols/.../artifacts/testing/test-plan.md

PREVIOUS_OUTPUTS:
- 1c-tester: Unit-тесты написаны, Coverage [X]%

CONSTRAINTS:
1. Сценарии детерминированные
2. Тестовые данные изолированы
3. Теги: @regression, @smoke, @critical
4. Короткие сценарии, переиспользуемые шаги

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- tests/features/*.feature (BDD сценарии)
- artifacts/testing/vanessa-report.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-quality-specialist
</message>
</new_task>
```

---

## 8. Тестирование → 1c-quality-specialist

```xml
<new_task>
<mode>1c-quality-specialist</mode>
<message>
ЗАДАЧА: Code Review для "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Review

INPUTS:
- .protocols/.../artifacts/implementation/changed-objects.md
- .protocols/.../artifacts/implementation/code-samples/
- .protocols/.../artifacts/testing/coverage-report.md
- .protocols/.../brief.md (исходные требования)

PREVIOUS_OUTPUTS:
- 1c-tester: Coverage [X]%, все тесты green
- 1c-vanessa-tester: [кол-во] BDD сценариев, все passed
- Заказчик: [подтверждение получено / ожидается]

CONSTRAINTS:
1. OWASP Top 10 проверка
2. SOLID принципы
3. Стандарты именования 1С (ал_ префикс)
4. jdocstring для экспортных методов
5. АПК: 0 errors, 0 warnings
6. База измененных объектов = Код

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: read-only + command (АПК)
=======================

РЕЗУЛЬТАТ:
- artifacts/review/code-review.md (Approved / Request Changes)
- artifacts/review/apk-report.md
- artifacts/review/quality-checklist.md
- artifacts/review/findings.json

СЛЕДУЮЩИЙ АГЕНТ:
- Если Approved → 1c-orchestrator (релиз)
- Если Request Changes → 1c-developer (исправления)
</message>
</new_task>
```

---

## 9. 1c-quality-specialist → 1c-orchestrator (Релиз)

```xml
<new_task>
<mode>1c-orchestrator</mode>
<message>
ЗАДАЧА: Координация релиза "[название]"

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Release

INPUTS:
- .protocols/.../artifacts/review/code-review.md (CR: Approved)
- .protocols/.../artifacts/testing/coverage-report.md (100%)
- .protocols/.../artifacts/testing/business-approval.md

PREVIOUS_OUTPUTS:
- Quality Specialist: CR Approved
- Coverage: 100%
- Бизнес-подтверждение: получено

CONSTRAINTS:
1. Все гейты пройдены
2. Подготовить release notes
3. Координировать перенос в продуктив
4. Получить ОПЭ подтверждение
5. Обновить Memory Bank
6. Закрыть протокол

CAPABILITIES:
- memory_bank: full
- subagents: yes
- tools: read + command + mcp
=======================

РЕЗУЛЬТАТ:
- artifacts/release/release-notes.md
- Memory Bank обновлён
- Протокол закрыт → DONE
</message>
</new_task>
```

---

## Сокращённый цикл: orchestrator → developer (поддержка)

```xml
<new_task>
<mode>1c-developer</mode>
<message>
ЗАДАЧА: [Поддержка] [описание]

=== CONTEXT HANDOFF ===
ROOT: [workspace root]
PROTOCOL: .protocols/YYYY-MM-DD-name/
PHASE: Implementation (Сокращённый цикл - Поддержка)

INPUTS:
- .protocols/.../brief.md

CONSTRAINTS:
1. Время реализации < 1 час
2. TDD обязателен
3. Coverage для измененного кода = 100%
4. База измененных объектов заполнить

SKIP_PHASES: БА, СА, Архитектура

CAPABILITIES:
- memory_bank: full
- subagents: no
- tools: full
=======================

РЕЗУЛЬТАТ:
- Исправленный код + Unit-тесты
- artifacts/implementation/changed-objects.md

СЛЕДУЮЩИЙ АГЕНТ: 1c-quality-specialist
</message>
</new_task>
```
