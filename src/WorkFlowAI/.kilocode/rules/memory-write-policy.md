# Memory Write Policy (SoT)

## Purpose

Задать жёсткую политику записи знаний, чтобы `WorkFlowAI` не превращал `.notes`, `.protocols` и `memory-bank` в смешанный шум.

## Storage classes

| Layer                                        | Purpose                                         | Stability   |
| -------------------------------------------- | ----------------------------------------------- | ----------- |
| session scratch / temp                       | ephemeral thinking and throwaway notes          | discardable |
| `.notes/`                                    | staging for raw observations and thematic notes | temporary   |
| `.protocols/.../artifacts/`                  | task-local evidence and intermediate files      | task-scoped |
| `.kilocode/evidence/` / `.kilocode/sources/` | durable references and reusable evidence        | stable      |
| `.kilocode/memory-bank/`                     | long-lived project truth                        | stable SoT  |

## Rules

1. `memory-bank` MUST contain only long-lived project facts or decisions.
2. Raw research notes MUST NOT go directly into `memory-bank`.
3. `.notes/` MUST remain a staging layer, not a second SoT.
4. Protocol artifacts MUST remain task-local unless promoted explicitly.
5. Promotion to `memory-bank` MUST be curated, sourced and deduplicated.

6. Новые файлы Memory Bank и обновления к ним MUST быть на русском; технические литералы MAY оставаться как есть.
7. Файлы Memory Bank с кириллицей MUST быть UTF-8 без BOM.

## Write gates for Memory Bank

Запись в `memory-bank` разрешена только если материал одновременно:

1. reusable beyond the current task;
2. sourced or traceable to stable evidence;
3. not merely a temporary hypothesis;
4. concise enough to survive future sessions;
5. deduplicated against existing Memory Bank files.

## Update triggers

| Change type                          | Update target     |
| ------------------------------------ | ----------------- |
| changed current focus / next steps   | `context.md`      |
| architecture decisions changed       | `architecture.md` |
| stack/tools/process commands changed | `tech.md`         |
| project goals / constraints changed  | `brief.md`        |
| users / scenarios changed            | `product.md`      |

## Forbidden writes

1. automatic dumps of agent thoughts;
2. copied article summaries without promotion review;
3. task-local blockers that will expire after the protocol;
4. unsourced factual claims.

## Notes

1. If in doubt, keep the material in `.notes` or protocol artifacts first.
2. Use [`../commands/update-memory-bank.md`](../commands/update-memory-bank.md:1) only after applying this policy.
