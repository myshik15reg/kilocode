# Рабочий процесс: Инициализация проекта (project-setup)

## Цель
Быстро и корректно подготовить проект к работе с WorkFlowAI + KiloCode: создать структуру, заполнить Memory Bank, завести первый протокол.

## Когда использовать
- Новый проект (greenfield) или подключение workflow pack в существующий репозиторий (brownfield).
- Перед первой задачей в проекте.

## Шаги
1. **Скаффолдинг (файлы/папки)**
   - Если pack установлен глобально: см. `~/.kilocode/workflows/global-install.md`.
   - Инициализируй проект: `workflowai-init-project.ps1` (создаст Memory Bank, patterns/skills, `.protocols/`, `temp/`, `docs/`).
   - Если нужны гейты качества (CI + PR checklist): запусти init с `-InitQualityGates` и следуй `~/.kilocode/workflows/quality-enforcement.md`.

2. **Определи тип проекта (greenfield/brownfield)**
   - Greenfield: репозиторий пустой или только общие docs.
   - Brownfield: есть `.git`, зависимости (`package.json`, `pyproject.toml`, `go.mod`, …) или `src/`/`app/` с кодом.
   - Если репозиторий “грязный” (`git status --porcelain` не пуст) — предупреди пользователя и согласуй порядок действий.

3. **Заполни Memory Bank (интерактивно, вопросы по одному)**
   - Заполни плейсхолдеры: `.kilocode/memory-bank/index.md`, затем `brief.md`, `product.md`, `tech.md`, `architecture.md`, `context.md`.
   - Ограничься **1 вопросом за раз** и максимум **5 вопросами на раздел**, чтобы не перегружать пользователя.
   - Всегда добивайся формулировок, которые можно проверить тестами/критериями (в т.ч. NFR).

4. **Создай первый протокол**
   - Запусти `~/.kilocode/workflows/protocol-new.md` и создай `.protocols/YYYY-MM-DD-name/`.
   - (опционально) Скаффолдинг протокола скриптом: `scripts/workflowai-new-protocol.ps1` (при global install: `$HOME/~/.kilocode/workflowai/scripts/workflowai-new-protocol.ps1`).
   - В `plan.md` используй статусы `[ ]` / `[~]` / `[x]` и добавь (если нужно) задачи "Manual verification" в конце фаз.
   - Добавь ссылку на протокол в `.protocols/index.md` (если используете индекс протоколов).

5. **Старт работы**
   - Подтвердить чтение Memory Bank: `[MB: OK]`.
   - Дальше — работа строго по `plan.md` и правилам из `AGENTS.md`.

## Ссылки
- `~/.kilocode/rules/concepts.md`
- `~/.kilocode/rules/memory-bank-instructions.md`
- `~/.kilocode/workflows/protocol-new.md`
- `~/.kilocode/workflows/global-install.md`
