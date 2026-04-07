# Skills usage (wrapper)

Назначение: правило `skill-first` перед написанием новых инструкций.

1. Перед стартом новой `task` агент SHOULD проверить наличие подходящего skill.
2. Если подходящий skill найден, агент SHOULD следовать его `SKILL.md`.
3. Если skill отсутствует и шаблон нужен повторно, MAY создать новый skill через workflow [`create-new-skill.md`](../workflows/create-new-skill.md:1).
4. Curated bridge skills from `skills.sh` live under `skills-sh-*` and MUST adapt upstream ideas to local SoT instead of replacing it.
5. If a narrower local skill already covers the task, it SHOULD take precedence over a `skills-sh-*` bridge.

Skills index: [`skills/index.md`](../skills/index.md:1).
