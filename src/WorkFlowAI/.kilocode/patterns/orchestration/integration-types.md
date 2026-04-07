# Integration Types (pattern)

## Purpose

Разделить reusable integration surfaces на три разных типа, чтобы `WorkFlowAI` не смешивал источник контекста, шаблон prompt-а и исполняемое действие в одном неразделённом контракте.

Связанные документы: [`context-handoff.md`](context-handoff.md:1), [`result-contract.md`](result-contract.md:1), [`../../rules/workflow-prompt-writing.md`](../../rules/workflow-prompt-writing.md:1), [`../../rules/mcp-usage-guide.md`](../../rules/mcp-usage-guide.md:1).

## Kinds

| Kind       | Purpose                                       | Default behavior                                                        |
| ---------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `resource` | read-only context or reference material       | безопасно подключать как input/context                                  |
| `prompt`   | reusable instruction template or bridge layer | вызывается человеком/агентом осознанно, не считается фактом сам по себе |
| `tool`     | executable action or callable capability      | требует явного action contract и approval semantics                     |

## Required metadata

Каждое integration description MUST явно указывать:

| Field           | Meaning                                                          |
| --------------- | ---------------------------------------------------------------- |
| `kind`          | один из `resource`, `prompt`, `tool`                             |
| `version`       | версия, дата или другой стабильный compatibility marker          |
| `capabilities`  | какие действия или данные реально доступны                       |
| `approval_mode` | нужен ли human approval, auto-safe use, read-only use only, etc. |
| `owner`         | кто поддерживает integration contract                            |
| `update_policy` | как обновляется и кто отвечает за drift                          |

## Rules

1. Один integration entry MUST иметь ровно один `kind`.
2. Если одна система даёт и context, и executable actions, эти surfaces MUST быть описаны отдельно.
3. `resource` SHOULD использоваться в `INPUTS`, index files, vendored corpora и других read-only context paths.
4. `prompt` MUST оставаться reusable template/bridge и MUST NOT маскироваться под factual evidence.
5. `tool` MUST описывать side effects, ограничения и approval expectations отдельно от resource/prompt layer.
6. Если workflow не может безопасно различить `resource`, `prompt` и `tool`, integration contract считается неполным.

## Examples

| Example                    | Kind       | Why                                      |
| -------------------------- | ---------- | ---------------------------------------- |
| vendored review corpus     | `resource` | read-only evidence layer                 |
| `skills-sh-*` bridge skill | `prompt`   | reusable adaptation layer over local SoT |
| Playwright browser actions | `tool`     | executable actions against browser state |

## Anti-patterns

| Anti-pattern                                              | Why it is wrong                                  | Replace with                                    |
| --------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| One blob that mixes docs, instructions and commands       | нельзя проверить boundaries и approval semantics | separate `resource` / `prompt` / `tool` entries |
| Treating a prompt template as evidence                    | template не доказывает факт                      | source-backed `resource` refs                   |
| Hiding executable actions inside free-text workflow prose | tool boundaries и side effects теряются          | explicit `tool` contract with constraints       |
