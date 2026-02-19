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

## 1C (firm)

- [`1c-alfa-rabbitmq/`](1c-alfa-rabbitmq/) - RabbitMQ для обменов (vHost naming, payload, отложенная отправка, РЗ/очереди) + чеклист и evidence
- [`1c-alfa-json-contracts/`](1c-alfa-json-contracts/) - JSON-контракты (запрет kebab-case) + чеклист и evidence
- [`1c-alfa-integration-settings/`](1c-alfa-integration-settings/) - хранение настроек интеграции (обязательность, безопасное хранилище) + чеклист и evidence
- [`1c-alfa-bpm/`](1c-alfa-bpm/) - BPM/CRM движок бизнес-процессов (точки/обработчики/РЗ) + чеклист и evidence
- [`1c-alfa-feature-toggles/`](1c-alfa-feature-toggles/) - отключаемый функционал и очистка легаси + чеклист и evidence
- [`1c-alfa-template-generator/`](1c-alfa-template-generator/) - template generator (генерация по шаблону) + чеклист и evidence
- [`1c-alfa-crm-registers/`](1c-alfa-crm-registers/) - CRM регистры (минимум требований) + чеклист и evidence

## Как использовать

1. Перед задачей посмотри список: `~/.kilocode/skills/`.
2. Открой нужный `SKILL.md` и следуй шагам.
3. Если подходящего skill нет - используй `~/.kilocode/workflows/create-new-skill.md`.
