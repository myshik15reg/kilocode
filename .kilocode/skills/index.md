# Skills (навыки)

Skills - это переиспользуемые, узкие, ориентированные на задачу инструкции для агента. Каждый skill живёт в своей папке и содержит файл `SKILL.md`.

## Общие навыки (General)

| Skill                                                    | Описание                                               |
| -------------------------------------------------------- | ------------------------------------------------------ |
| [`cli-master/`](cli-master/)                             | Безопасная и эффективная работа с CLI                  |
| [`cli-compatibility/`](cli-compatibility/)               | Совместимость CLI между платформами                    |
| [`code-review/`](code-review/)                           | Систематическое code review и контроль качества        |
| [`devcontainer-kilocode/`](devcontainer-kilocode/)       | Настройка devcontainer с bind mounts для Alfa Code     |
| [`git-workflow/`](git-workflow/)                         | Git-процесс (ветки/коммиты/PR)                         |
| [`performance-optimization/`](performance-optimization/) | Поиск и устранение узких мест производительности       |
| [`project-tests/`](project-tests/)                       | Запуск/добавление тестов и рост покрытия               |
| [`translation/`](translation/)                           | i18n/локализация (безопасность ключей и плейсхолдеров) |
| [`security-audit/`](security-audit/)                     | Аудит безопасности и чеклист OWASP                     |
| [`mcp-usage/`](mcp-usage/)                               | Использование MCP-серверов (context7, playwright)      |
| [`anti-patterns/`](anti-patterns/)                       | Обнаружение и исправление антипаттернов                |
| [`testing-detailed/`](testing-detailed/)                 | Детальное тестирование и TDD                           |
| [`quality-gates/`](quality-gates/)                       | Гейты качества (coverage, lint, security)              |
| [`humanizer-ru/`](humanizer-ru/)                         | Очеловечивание ИИ-текста на русском (text-only)        |
| [`defer/`](defer/)                                       | Дефер находок в backlog (skill + скрипт)               |
| [`load-context/`](load-context/)                         | Загрузка общего контекста для шага протокола           |

## Навыки оркестрации (Orchestration)

| Skill                                        | Описание                            |
| -------------------------------------------- | ----------------------------------- |
| [`orchestrator-guide/`](orchestrator-guide/) | Руководство для Orchestrator-режима |
| [`agents-guide/`](agents-guide/)             | Руководство по работе с агентами    |
| [`roles-guide/`](roles-guide/)               | Руководство по ролям                |
| [`mode-selection/`](mode-selection/)         | Выбор режима для задачи             |
| [`context-tiers/`](context-tiers/)           | Уровни контекста (Level 0/1/2)      |
| [`tool-access/`](tool-access/)               | Матрица доступа к инструментам      |
| [`ui-ux-roles/`](ui-ux-roles/)               | Роли UI/UX разработки               |

## Навыки решения задач (Task)

| Skill                                                              | Описание                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`task-solution/`](task-solution/)                                 | Написание решения по задаче (solution.md)                                                        |
| [`effort-estimation-human-hours/`](effort-estimation-human-hours/) | Оценка трудозатрат разработки (человеко‑часы) по solution + git‑прокси, с калибровкой по истории |

## 1C Generic

| Skill                          | Описание                     |
| ------------------------------ | ---------------------------- |
| [`1c-workflow/`](1c-workflow/) | Общий workflow разработки 1С |

## 1C-Alfa (фирменные стандарты)

| Skill                                                            | Описание                      |
| ---------------------------------------------------------------- | ----------------------------- |
| [`1c-alfa-sdlc/`](1c-alfa-sdlc/)                                 | SDLC для 1С-проектов Альфа    |
| [`1c-alfa-access-control/`](1c-alfa-access-control/)             | Контроль доступа (RLS, права) |
| [`1c-alfa-coding-standards/`](1c-alfa-coding-standards/)         | Стандарты кодирования 1С      |
| [`1c-alfa-extension-policy/`](1c-alfa-extension-policy/)         | Политика расширений           |
| [`1c-alfa-http-services/`](1c-alfa-http-services/)               | HTTP-сервисы и REST API       |
| [`1c-alfa-kd3/`](1c-alfa-kd3/)                                   | Конфигуратор документов KD3   |
| [`1c-alfa-storage/`](1c-alfa-storage/)                           | Хранилище файлов              |
| [`1c-alfa-traceability/`](1c-alfa-traceability/)                 | Трассировка изменений         |
| [`1c-alfa-ui-forms/`](1c-alfa-ui-forms/)                         | Формы и UI компоненты         |
| [`1c-alfa-rabbitmq/`](1c-alfa-rabbitmq/)                         | RabbitMQ для обменов          |
| [`1c-alfa-json-contracts/`](1c-alfa-json-contracts/)             | JSON-контракты                |
| [`1c-alfa-integration-overview/`](1c-alfa-integration-overview/) | Обзор интеграций              |
| [`1c-alfa-integration-settings/`](1c-alfa-integration-settings/) | Настройки интеграции          |
| [`1c-alfa-bpm/`](1c-alfa-bpm/)                                   | BPM/CRM движок                |
| [`1c-alfa-feature-toggles/`](1c-alfa-feature-toggles/)           | Feature toggles               |
| [`1c-alfa-template-generator/`](1c-alfa-template-generator/)     | Генератор шаблонов            |
| [`1c-alfa-crm-registers/`](1c-alfa-crm-registers/)               | CRM регистры                  |

---

**Всего: 43 навыка**

## Как использовать

1. Перед задачей посмотри список навыков
2. Открой нужный `SKILL.md` и следуй шагам
3. Если подходящего skill нет — используй `../workflows/create-new-skill.md`
