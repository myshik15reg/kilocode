# План: исправление devcontainer postCreateCommand

## Шаги
1. Уточнить расположение requirements.txt (поиск/подтверждение пути).
2. Обновить .devcontainer/setup.sh:
   - перевести окончания строк в LF;
   - заменить переход в каталог на "корень репозитория через директорию скрипта".
3. Обновить .devcontainer/devcontainer.json:
   - postCreateCommand: сначала запуск setup.sh, затем pip install -r <path/to/requirements.txt>, затем mkdir -p каталогов настроек.
4. Опционально: добавить защиту от CRLF (gitattributes/редактор/линтер) — зафиксировать решение.
5. Проверить, что порядок команд в postCreateCommand корректен и не содержит лишних аргументов.

## Выходные артефакты
- .protocols/2026-01-23-devcontainer-postcreate-fix/brief.md
- .protocols/2026-01-23-devcontainer-postcreate-fix/plan.md
- .protocols/2026-01-23-devcontainer-postcreate-fix/execution.md

## Критерии завершения планирования
- План согласован с ожидаемыми изменениями.
- В протоколе зафиксированы риски/ограничения и опциональные решения.
