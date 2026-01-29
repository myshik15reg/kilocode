# Skills (навыки)

Skills - это переиспользуемые, узкие, ориентированные на задачу инструкции для агента. Каждый skill живёт в своей папке и содержит файл `SKILL.md`.

## Доступные навыки
- [`cli-master/`](cli-master/) - безопасная и эффективная работа с CLI
- [`code-review/`](code-review/) - систематическое code review и контроль качества
- [`devcontainer-kilocode/`](devcontainer-kilocode/) - настройка devcontainer с bind mounts для KiloCode
- [`git-workflow/`](git-workflow/) - git-процесс (ветки/коммиты/PR)
- [`performance-optimization/`](performance-optimization/) - поиск и устранение узких мест производительности
- [`project-tests/`](project-tests/) - запуск/добавление тестов и рост покрытия
- [`translation/`](translation/) - i18n/локализация (безопасность ключей и плейсхолдеров)
- [`security-audit/`](security-audit/) - аудит безопасности и чеклист OWASP

## Как использовать
1. Перед задачей посмотри список: `~/.kilocode/skills/`.
2. Открой нужный `SKILL.md` и следуй шагам.
3. Если подходящего skill нет - используй `~/.kilocode/workflows/create-new-skill.md`.
