---
rule_id: architecture-compliance
title: Соответствие архитектуре
scope: architecture
priority: high
tags: [architecture, solution, compliance]
---

# Соответствие архитектуре

## С чем сравнивать реализацию

1. С описанием решения в задаче.
2. С approved concept или design-review outcome, если процесс этого требует.
3. С ADR, архитектурной заметкой или solution document.
4. С интерфейсными контрактами и target object list.
5. С changed-object evidence и обязательными delivery artifacts.

## Когда поднимать finding

1. Требуемый объект, модуль или flow отсутствует в реализации.
2. Реализация использует другой интеграционный механизм, чем approved architecture.
3. Архитектура требует reuse или extension существующего модуля, а код дублирует логику в другом месте.
4. Архитектура подразумевает обновление контракта, но связанные модули, настройки или схемы не изменены.
5. KD3 rule code содержит бизнес-side effects, которые должны жить в методах конфигурации, а не в правилах обмена.
6. Кастомизация supplier object обходит предпочтительный путь: override hook, subscription, programmatic form change или изменение основной конфигурации.
7. Для описанной архитектуры отсутствуют обязательные PKD, queue, Swagger, changed objects или другие релизные артефакты.

## Если evidence неполный

1. Нельзя помечать реализацию как compliant.
2. Нужно выдать finding или summary note, что архитектурное соответствие проверить полностью нельзя.
3. Если процесс требует design review или approved concept, отсутствие этих данных нужно фиксировать как gap, а не закрывать предположением.
