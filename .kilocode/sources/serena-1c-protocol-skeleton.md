# Протокол (скелет) для внедрения/использования Serena в 1С-проектах

> Назначение: шаблон артефактов для протокола, если решите фиксировать изменения документации AlfaFlowAI и/или регламенты по Serena.
> Ссылки и имена — плейсхолдеры.

## Папка протокола

- `.protocols/YYYY-MM-DD-serena-1c-mcp/brief.md`
- `.protocols/YYYY-MM-DD-serena-1c-mcp/plan.md`
- `.protocols/YYYY-MM-DD-serena-1c-mcp/execution.md`

---

## brief.md (шаблон)

```markdown
# Brief: Serena/MCP для 1С-проектов

## Контекст

- Источник/повод: статья Habr (Serena/MCP) + наблюдения по экономии токенов.
- Текущий semantic stack: bge-m3 + Qdrant + bge-rerank + Neo4j.

## Цель

- Определить: использовать ли Serena (и/или BSL-форк) и в каком режиме.
- Обновить документацию AlfaFlowAI: где и как применять инструменты (read-only by default).

## In Scope

- ADR/decision memo по Serena.
- Обновление Markdown-документов workflow-pack.
- Правила безопасности/контролей (кэш, доступ к файлам, supply chain).

## Out of Scope

- Реализация/внедрение semantic stack.
- Написание BSL-кода или изменение прикладной конфигурации.

## Ограничения и гейты качества

- Read-only по умолчанию для MCP-инструментов.
- Любые автоправки — только через протокол и ветку.
- 1С гейты: АПК, xUnitFor1C, Vanessa, обязательный Code Review.

## Definition of Done

- Decision memo с критериями «включать/не включать».
- Обновлены выбранные .md файлы, описан безопасный режим.
- Добавлены рекомендации по .gitignore для кэшей (если применимо).
```

---

## plan.md (шаблон)

```markdown
# Plan: Serena/MCP для 1С-проектов

- [ ] Зафиксировать текущий процесс 1С SDLC и места применения retrieval/графа знаний.
- [ ] Сформировать ADR: Serena как доп. слой к semantic stack (или отказ).
- [ ] Описать модель доступа Serena (read-only default, enable-write только на этапе реализации).
- [ ] Описать риски: локальный доступ к коду, кэш, логи, supply chain BSL-форка.
- [ ] Предложить меры контроля (pin versions, sandbox, allowlist tools, .gitignore).
- [ ] Обновить документацию (список файлов в brief).
- [ ] Самопроверка ссылок и консистентности гейтов качества.
```
