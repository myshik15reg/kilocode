---
name: devcontainer-kilocode
description: Настройка devcontainer с bind mounts для KiloCode (skills/modes) на Windows.
---

# Навык: Devcontainer KiloCode

## Назначение
Навык описывает воспроизводимую настройку devcontainer для работы с KiloCode, включая проброс локальной папки `~/.kilocode` и файла `custom_modes.yaml` через bind mounts. Это снижает риск несовпадения локальных настроек и повышает повторяемость окружения.

## Триггеры
Используй этот навык, когда:
- нужно подготовить devcontainer для работы с KiloCode
- требуется доступ контейнера к локальным настройкам `~/.kilocode`
- нужно пробросить `custom_modes.yaml` в контейнер
- возникают расхождения между локальной и контейнерной конфигурацией KiloCode

## Контекст
Перед применением прочитать:
- `.kilocode/memory-bank/tech.md` — понять стек и используемые инструменты разработки
- `.kilocode/memory-bank/architecture.md` — проверить ограничения архитектуры/окружения
- `~/.kilocode/workflows/create-new-skill.md` — убедиться в соответствии структуре skills
- `~/.kilocode/rules/environment-windows.md` — правила Windows путей и quoting

## Процедура

### Шаг 1: Определить пути хоста и целевые mount points
1. Зафиксируй пути хоста (Windows):
   - `C:\Users\Евгений\.kilocode`
   - `C:\Users\Евгений\AppData\Roaming\Code\User\globalStorage\kilocode.kilo-code\settings\custom_modes.yaml`
2. Определи пути в контейнере:
   - `/root/.kilocode`
   - `/root/.kilocode/modes`
   - `/root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml`
   - `/root/.kilocode/cli/global/settings/custom_modes.yaml`

### Шаг 2: Подготовить `.devcontainer/devcontainer.json`
Добавь bind mounts через поле `mounts`. Используй явные Windows пути и quoting.

**Переменные окружения контейнера:**
- `KILOCODE_GLOBAL_PATH` — путь к KiloCode внутри контейнера (например, `/root/.kilocode`)
- `KILOCODE_MODES_PATH` — путь к каталогу `modes` (например, `/root/.kilocode/modes`)

Эти переменные используются в скриптах сборки и командах контейнера для упрощения путей.

```json
{
  "name": "Kilo Code Development",
  "dockerFile": "Dockerfile",
  "context": "..",

  "containerEnv": {
    "KILOCODE_GLOBAL_PATH": "/root/.kilocode",
    "KILOCODE_MODES_PATH": "/root/.kilocode/modes"
  },

  "mounts": [
    "type=bind,source=C:\\Users\\Евгений\\.kilocode,target=/root/.kilocode,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/modes,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/cli/global/settings/custom_modes.yaml,type=bind,consistency=cached,readonly"
  ]
}
```

### Шаг 3: Проверить права доступа
1. Убедись, что пользователь контейнера (`root` или указанный в `remoteUser`/`containerUser`) имеет доступ на чтение к `/root/.kilocode` (mounts помечены `readonly`).
2. Проверь, что `custom_modes.yaml` доступен для чтения.

### Шаг 4: Проверить результат в контейнере
1. Убедись, что read-only mount'ы доступны пользователю контейнера (`root` или указанному в `remoteUser`/`containerUser`).
2. Проверь наличие всех целевых путей монтирования:
   - `/root/.kilocode`
   - `/root/.kilocode/modes`
   - `/root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml`
   - `/root/.kilocode/cli/global/settings/custom_modes.yaml`
3. Если путь назначения отличается от ожидаемого — обнови `mounts` и зафиксируй изменение в протоколе.

## Лучшие практики
- Всегда используйте bind mounts (не копирование), чтобы изменения на хосте сразу попадали в контейнер.
- Используйте явные Windows пути с экранированием обратных слэшей.
- Держите `custom_modes.yaml` в отдельном mount, чтобы не зависеть от внутренней структуры `.kilocode`.
- Проверяйте, что `mounts` не перезаписывают существующие файлы контейнера без необходимости.

## Диагностика и решения

### Devcontainer не стартует из-за путей
- Проверь корректность Windows путей и двойное экранирование `\\`.
- Убедись, что путь существует на хосте.

### Файлы не видны внутри контейнера
- Перезапусти контейнер после правки `devcontainer.json`.
- Проверь, что указаны корректные `target` пути.

### Ошибка прав доступа
- Убедись, что пользователь контейнера имеет права на каталог.
- При необходимости добавь `remoteUser` и настрой `postCreateCommand` для chmod/chown.

## Интеграция с протоколами
Если навык используется в протоколе:
1. Укажи изменение `.devcontainer/devcontainer.json` в `plan.md`.
2. Зафиксируй выбранные пути `source`/`target` в `execution.md`.
3. При изменении структуры KiloCode обнови `.kilocode/memory-bank/architecture.md`.

## Примеры

### Пример 1: Минимальный `devcontainer.json` с bind mounts
```json
{
  "name": "Kilo Code Development",
  "dockerFile": "Dockerfile",
  "context": "..",

  "containerEnv": {
    "KILOCODE_GLOBAL_PATH": "/root/.kilocode",
    "KILOCODE_MODES_PATH": "/root/.kilocode/modes"
  },

  "mounts": [
    "type=bind,source=C:\\Users\\Евгений\\.kilocode,target=/root/.kilocode,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/modes,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/cli/global/settings/custom_modes.yaml,type=bind,consistency=cached,readonly"
  ]
}
```

### Пример 2: Полный `devcontainer.json` с Docker-in-Docker
```json
{
  "name": "Kilo Code Development",
  "dockerFile": "Dockerfile",
  "context": "..",

  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "moby": true,
      "dockerDashComposeVersion": "v2.20.2"
    }
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "kilocode.kilo-code",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  },

  "postCreateCommand": "npm install -g @kilocode/cli && mkdir -p /root/.kilocode /root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings /root/.kilocode/cli/global/settings",
  "postStartCommand": "echo '🚀 Kilo Code devcontainer is ready! 🐳 Docker CLI available for managing external containers'",
  
  "remoteUser": "root",
  "containerUser": "root",

  "containerEnv": {
    "KILOCODE_GLOBAL_PATH": "/root/.kilocode",
    "KILOCODE_MODES_PATH": "/root/.kilocode/modes"
  },

  "mounts": [
    "type=bind,source=C:\\Users\\Евгений\\.kilocode,target=/root/.kilocode,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/modes,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.vscode-server/data/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml,type=bind,consistency=cached,readonly",
    "type=bind,source=C:\\Users\\Евгений\\AppData\\Roaming\\Code\\User\\globalStorage\\kilocode.kilo-code\\settings\\custom_modes.yaml,target=/root/.kilocode/cli/global/settings/custom_modes.yaml,type=bind,consistency=cached,readonly"
  ]
}
```

## Интеграция с протоколами
Если навык используется в протоколе:
1. Укажи изменение `.devcontainer/devcontainer.json` в `plan.md`.
2. Зафиксируй выбранные пути `source`/`target` в `execution.md`.
3. При изменении структуры KiloCode обнови `.kilocode/memory-bank/architecture.md`.
