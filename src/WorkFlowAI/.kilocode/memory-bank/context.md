# Context

## Current status

- 2026-04-09 выполнено исследование внешних agent runtime patterns и добавлена первая operational wave в workflow-pack.
- В pack появились явные workflow для `workspace context bootstrap` и `session checkpoint`.

## Current focus

- Проверить новые workflow на реальной нетривиальной задаче в consuming project.
- Не смешивать long-lived `Memory Bank` с transient execution state.

## Next step

- На следующей длинной задаче прогнать связку `workspace-context-bootstrap.md` -> `protocol-new.md` -> `session-checkpoint.md` -> `protocol-resume.md` и уточнить шаблоны по результатам.
