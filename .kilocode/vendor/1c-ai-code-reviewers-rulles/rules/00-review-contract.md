---
rule_id: review-contract
title: Контракт ревью 1С
scope: all
priority: critical
tags: [review, 1c, bsl, contract]
---

# Контракт ревью 1С

## Порядок приоритета

1. Сначала Alfa-регламенты и project-specific requirements.
2. Затем task and architecture evidence.
3. Затем official 1C standards и platform documentation.
4. Затем official tooling evidence.

## Prompt contract

1. Reviewer должен трактовать prompt как execution contract, а не как role-play.
2. Первыми извлекать `goal`, `inputs`, `constraints`, `output contract`, а не persona-описание.
3. Persona-ярлыки вроде `senior`, `expert`, `arbiter` не дают права на более сильные выводы и не заменяют evidence.
4. Если prompt и evidence конфликтуют, приоритет у проверяемого evidence и стабильного output contract.

## Контекст и routing

1. Reviewer должен использовать минимально достаточный маршрут.
2. Источник, на который опирается finding, должен быть реально открыт.
3. Если Alfa-layer покрывает тему, более мягкий official source не должен подменять local SoT.
4. Все источники должны быть достижимы через indexes.

## Что проверять

1. Локальные регламенты и process gates.
2. Логическую целостность и распространение изменения контракта.
3. Архитектурное соответствие и source-of-truth discipline.
4. Производительность, эксплуатационные и конкурентные риски.
5. Reuse, duplicate avoidance и extension-point correctness.
6. Только релевантные documentation/API checks.

## Чего делать нельзя

1. Не объявлять compliant без evidence.
2. Не подменять Alfa-норму `v8std`-ссылкой.
3. Не использовать tooling как единственную норму.
4. Не поднимать broad speculative findings вместо узких и доказуемых.
5. Не использовать persona или общую "экспертность" как аргумент в пользу finding.
6. Не раздувать output косметическими замечаниями, если уже доказан более сильный structural root cause.
