# Plan

- [x] Заинвентаризировать структуру и entrypoints

    - INPUT: `AGENTS.md`, `README.md`, `.kilocode/*`
    - OUTPUT: список hotspots
    - VERIFY: выявлены дубли, неоднозначности и тяжёлые файлы
    - AGENT: codex

- [-] Создать audit evidence

    - INPUT: результаты обзора
    - OUTPUT: `artifacts/audit.md`
    - VERIFY: есть наблюдения, риски, предложения
    - AGENT: codex

- [ ] Внести точечные оптимизации entrypoints

    - INPUT: audit findings
    - OUTPUT: сокращённые/уточнённые high-traffic docs
    - VERIFY: меньше дублирования, больше ссылок на SoT
    - AGENT: codex

- [ ] Проверить согласованность ссылок и терминов

    - INPUT: изменённые файлы
    - OUTPUT: результаты grep-проверок
    - VERIFY: нет явных конфликтов
    - AGENT: codex

- [ ] Подготовить handoff и рекомендации
    - INPUT: итоговые изменения и audit
    - OUTPUT: краткий отчёт пользователю
    - VERIFY: отражены изменения и следующие шаги
    - AGENT: codex
