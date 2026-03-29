# Audit Findings

## Summary

Цель аудита — уменьшить стоимость входа в контекст и число лишних токенов без ослабления обязательных quality gates.

## Main findings

1. `AGENTS.md`, `.kilocode/QUICK.md`, `.kilocode/workflows/quickref.md` и `README.md` повторяют одни и те же требования: protocol mandatory, `[MB: OK]`, quality gates, `new_task`/`switch_mode` policy.
2. `README.md` перегружен длинными procedural блоками для template-copy и troubleshooting; для entrypoint-файла это дорогой контекст.
3. High-traffic документы местами содержат не action-oriented ссылки, а почти полные дубли правил, что увеличивает токены на каждую сессию.
4. `memory-bank/context.md` заполнен заглушками (`...`), поэтому подтверждение `[MB: OK]` формально выполняется, но практической пользы мало.
5. В пакете очень тяжёлая папка `.kilocode/evidence/`; она полезна как архив, но повышает шум при repo-wide поиске и inventory.
6. Есть признаки encoding drift в части документов при чтении через консоль Windows; это не всегда содержательная ошибка файла, но ухудшает DX при проверках.

## Risks

- Долгий и дорогой старт каждой новой сессии.
- Повышенная вероятность несогласованного изменения правил в нескольких местах.
- Снижение автономности: агент чаще перечитывает entrypoint-файлы, чем реально работает по SoT.

## Optimization principles

1. Entry points должны быть короткими и директивными.
2. Подробные правила должны жить только в SoT / skills / workflows.
3. Часто читаемые файлы должны ссылаться, а не пересказывать.
4. Evidence и архивные материалы не должны конкурировать с operational docs.

## Focused changes proposed

1. Сжать `README.md` до обзора + ссылок на SoT.
2. Сократить `AGENTS.md` и `QUICK.md` до обязательного минимума, оставив деталь в linked SoT.
3. Сделать `quickref.md` ещё более menu-oriented, без повторения норм из `AGENTS.md`.
4. Заполнить `memory-bank/context.md` реальным статусом пакета и next steps.
5. Для крупных evidence-папок в будущем — вынести архивные сканы в отдельный архив/подрепозиторий или добавить явную навигацию `operational vs archive`.

## Changes selected now

- Обновить `README.md` как короткий обзор pack.
- Обновить `.kilocode/memory-bank/context.md`, чтобы Memory Bank давал полезный контекст.
- Локально уменьшить навигационный шум без изменения quality policy.

## Deferred recommendations

1. Ввести lightweight script/link checker для markdown cross-links.
2. Добавить отдельный `ARCHIVE.md` для `.kilocode/evidence/` и описать, что это не runtime context.
3. Нормализовать encoding policy для Windows/PowerShell чтения.
4. Ввести token budget rules для entrypoint docs: например, soft cap по размеру high-traffic файлов.
