# Правила ревью кода 1С

Русскоязычный retrieval-first pack правил для code review по 1С/BSL в изолированной среде.

## Главный нормативный порядок

1. Сначала локальные Alfa-регламенты и task-specific evidence.
2. Затем архитектурный и контрактный контекст задачи.
3. Затем официальные стандарты и документация 1С как второй слой.
4. Затем official tooling evidence.

## Prompting discipline

1. Runtime должен трактовать prompt как execution contract, а не как role-play.
2. Приоритет имеют `GOAL`, `INPUTS`, `CONSTRAINTS`, `OUTPUT`, а не persona-ярлыки вроде `expert` или `senior`.
3. Persona может использоваться только как краткая метка контекста, но не как источник авторитета или повод сужать доказательность.
4. Если факт нельзя подтвердить локальным evidence, reviewer должен явно сохранять неопределённость.

## Старт работы

1. `indexes/start-here.md`
2. `indexes/file-signal-router.md`
3. `manifests/rules-manifest.json`

## Важные entrypoints

1. `indexes/firm-standards-index.md`
2. `indexes/v8std-core-index.md`
3. `indexes/architecture-index.md`
4. `indexes/jdocstring-index.md`
5. `indexes/alfa-performance.md`
6. `indexes/official-1c-performance.md`

## Source layers

1. `sources/alfa/primary/` — полные локальные Alfa-источники, primary SoT.
2. `sources/alfa/compact/` — compact routing-evidence по локальным нормам.
3. `sources/alfa/reg.md`, `sources/alfa/kd3.md` — curated extracts, подчинённые полным Alfa-источникам.
4. `sources/v8std/` — локальный cache exact standards `v8std`.
5. `sources/official/1c/` — локальные official notes по platform и SSL/BSP.
6. `sources/official/tooling/` — локальные official notes по tooling.

## Контракт упаковки

1. Эта папка — корень isolated pack.
2. Все runtime-зависимости должны жить внутри pack.
3. Runtime не должен зависеть от интернета.
4. Все пути из manifest разрешаются относительно корня pack.

## Важно

1. Alfa-стандарты выше `v8std` и других внешних источников.
2. Машинный контракт findings остаётся стабильным.
3. Все источники должны быть достижимы через индексы.
4. В контекст загружается только релевантный маршрут, а не весь corpus сразу.
