# DevOps: аудит и оптимизация `.kilocodemodes`

Протокол: [`.protocols/2026-02-05-workflow-pack-audit/`](.protocols/2026-02-05-workflow-pack-audit/:1)

## Цель

- Удалить устаревшие/Deprecated режимы.
- Выровнять список актуальных режимов (минимум — покрыть все slugs из реестра).
- Упорядочить/сгруппировать без раздувания инструкций (ссылки на SoT вместо копипасты).

## Что удалено (Deprecated)

Удалены режимы, помеченные как Deprecated в реестре/названии и имеющие прямые замены:

- `code-skeptic` → `reviewer --skeptic`
- `code-simplifier` → `refactorer --simplify`
- `error-detective` → `debug --deep`
- `test-analyzer` → `qa-engineer`

## Что добавлено / восстановлено (актуальные, но отсутствовали)

Из `old/.kilocodemodes` добавлены режимы, присутствующие в наборе доступных специалистов, но отсутствовавшие в текущем файле:

- `rust-dev`
- `spring-boot-dev`
- `mysql-specialist`
- `mongodb-specialist`
- `redis-specialist`
- `elasticsearch-specialist`
- `sqlalchemy-dev`
- `pinia-dev`
- `ngrx-dev`
- `aspnet-core-dev`
- `cpp-dev`

## Порядок / группировка

В [`.kilocodemodes`](.kilocodemodes:1) введены секции в требуемом порядке:

1. orchestration
2. analysis
3. architecture
4. development
5. testing
6. quality
7. security
8. docs
9. devops
10. 1c

## Консистентность и «не раздувать»

Сделано:

- Убраны дубли секционных заголовков при автоматическом reorder (скрипт чистит старые `# === ... ===` перед вставкой новых).
- Нормализованы ссылки вида `~/.kilocode/...` → `.kilocode/...` (для embedded workflow-pack внутри репозитория).
- В добавленных режимах удалены «migration placeholders» (тексты про авто-миграцию и ссылки на несуществующие `.kilocode/agents/...`) — заменено на короткие инструкции + ссылки на SoT (например, [`AGENTS.md`](AGENTS.md:1), [`testing-rules.md`](.kilocode/rules/testing-rules.md:1), [`code-standards.md`](.kilocode/patterns/code-standards.md:1)).
- Удалён оставшийся маркер `**DEPRECATED:**` внутри описания `refactorer` (заменён на `**MERGED:**`).
- Ссылки/тексты, которые ссылались на `TestAnalyzer`, приведены к `QA Engineer` (так как `test-analyzer` удалён).

## Валидация

- YAML парсится (без ошибок).
- Все slugs из реестра присутствуют в `.kilocodemodes`.
- Deprecated slugs отсутствуют.
- Дубликатов `slug` нет.

## Риски / обратная совместимость

- **Breaking change:** если где-то есть прямые ссылки на удалённые slugs (`code-skeptic`, `code-simplifier`, `error-detective`, `test-analyzer`) — их нужно заменить на новые режимы/флаги (см. список выше).
- Реестр [`.kilocode/modes/REGISTRY.md`](.kilocode/modes/REGISTRY.md:1) покрыт полностью; при этом `.kilocodemodes` содержит и дополнительные режимы сверх реестра (сохранено сознательно, чтобы не ломать существующий расширенный набор специалистов).
- Массовая замена `~/.kilocode` → `.kilocode` корректна для embedded-пака; при сценарии global-install пути могут отличаться (в этом репозитории SoT — локальные `.kilocode/*`).
