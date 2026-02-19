<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=alfacode.alfa-code-assistant"><img src="https://img.shields.io/badge/VS_Code_Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace"></a>
  <a href="https://x.com/alfacode"><img src="https://img.shields.io/badge/alfacode-000000?style=flat&logo=x&logoColor=white" alt="X (Twitter)"></a>
  <a href="https://blog.alfacode.ai"><img src="https://img.shields.io/badge/Blog-555?style=flat&logo=substack&logoColor=white" alt="Substack Blog"></a>
  <a href="https://alfacode.ai/discord"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://www.reddit.com/r/alfacode/"><img src="https://img.shields.io/badge/Join%20r%2Falfacode-D84315?style=flat&logo=reddit&logoColor=white" alt="Reddit"></a>
</p>

# 🚀 Alfa

> Alfa is the all-in-one agentic engineering platform. Build, ship, and iterate faster with the most popular coding agent.
> #1 on OpenRouter. 1M+ AlfaCode assistantrs. 20T+ tokens processed

- ✨ Generate code from natural language
- ✅ Checks its own work
- 🧪 Run terminal commands
- 🌐 Automate the browser
- ⚡ Inline autocomplete suggestions
- 🤖 Latest AI models
- 🎁 API keys optional
- 💡 **Get $20 in bonus credits when you top-up for the first time** Credits can be used with 500+ models like Gemini 3 Pro, Claude 4.5 Sonnet & Opus, and GPT-5

<p align="center">
  <img src="https://media.githubusercontent.com/media/Alfa-Org/alfacode/main/alfacode.gif" width="100%" />
</p>

- [VS Code Marketplace](https://alfacode.ai/vscode-marketplace?utm_source=Readme) (download)
- [Official AlfaCode.ai Home page](https://alfacode.ai) (learn more)

## Key Features

- **Code Generation:** Alfa can generate code using natural language.
- **Inline Autocomplete:** Get intelligent code completions as you type, powered by AI.
- **Task Automation:** Alfa can automate repetitive coding tasks.
- **Automated Refactoring:** Alfa can refactor and improve existing code.
- **MCP Server Marketplace**: Alfa can easily find, and use MCP servers to extend the agent capabilities.
- **Multi Mode**: Plan with Architect, Code with Coder, and Debug with Debugger, and make your own custom modes.

## Supported Languages

Alfa supports code analysis and manipulation for multiple programming languages:

- **TypeScript** - Full support for modern TypeScript
- **JavaScript** - ES6+ and Node.js
- **Python** - Python 2 and 3
- **1C:Enterprise (BSL)** - Procedures, Functions, Variables

## How to get started with Alfa

1. Install the AlfaCode assistant extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=alfacode.alfa-code-assistant).
2. Create your account to access 500+ cutting-edge AI models including Gemini 3 Pro, Claude 4.5 Sonnet & Opus, and GPT-5 – with transparent pricing that matches provider rates exactly.
3. Start coding with AI that adapts to your workflow. Watch our quick-start guide to see Alfa in action:

[![Watch the video](https://img.youtube.com/vi/pqGfYXgrhig/maxresdefault.jpg)](https://youtu.be/pqGfYXgrhig)

## Extension Development

For details on building and developing the extension, see [DEVELOPMENT.md](/DEVELOPMENT.md)

## WorkFlowAI

WorkFlowAI workflow pack встроен в `.vsix` и устанавливается вместе с расширением.

- **Где лежит в `.vsix`:** каталог pack `extension/WorkFlowAI/` и manifest `extension/WorkFlowAI/.kilocode/embedded-pack.manifest.json` (поле `fingerprint`).
- **Fingerprint:** значение `fingerprint` (sha256) из manifest. Если manifest отсутствует — fingerprint вычисляется на лету.
- **Когда срабатывает авто-обновление:** при активации расширения fingerprint выбранного источника сравнивается с сохранённым. Если fingerprint изменился (или сменился источник) — выполняется **managed reconcile**.
- **Политика обновления (managed reconcile):** overwrite/replace файлов + удаление stale путей в управляемых локациях.
- **Backup:** перед перезаписью/удалением создаётся backup в `~/.kilocode/workflowai/backups/<timestamp>/<prev-id>/...` (по умолчанию хранится 5 последних слоёв).
- **Modes:** definitions из [`.kilocodemodes`](WorkFlowAI/.kilocodemodes:1) устанавливаются в managed файл `~/.kilocode/workflowai/managed_custom_modes.yaml` и подхватываются [`CustomModesManager`](src/core/config/CustomModesManager.ts:54) как источник modes с самым низким приоритетом.
- **Override pack:** настройка [`alfa-code-assistant.workflowAssetsPath`](src/package.json:551):
    - пусто / не задано → используется embedded pack из VSIX;
    - валидный абсолютный путь (или `~`) → используется внешний pack (он тоже обновляется по fingerprint);
    - путь невалиден → fallback на embedded pack + диагностический лог.
- **Важно:** embedded-путь резолвится через [`context.extensionUri`](src/extension.ts:228) (без workspace absolute paths).

### Быстрая проверка (VSIX → диск)

1. Проверить, что в `.vsix` действительно попала новая версия pack и fingerprint:

```bash
unzip -p <path-to.vsix> extension/WorkFlowAI/.kilocode/embedded-pack.manifest.json | jq -r .fingerprint
```

Если `jq` недоступен:

```bash
unzip -p <path-to.vsix> extension/WorkFlowAI/.kilocode/embedded-pack.manifest.json \
  | python -c 'import json,sys; print(json.load(sys.stdin)["fingerprint"])'
```

2. После обновления/активации расширения проверить, что reconcile отработал:

```bash
# backup должен появиться при смене fingerprint
ls -lt ~/.kilocode/workflowai/backups | head

# managed modes файл должен отражать текущее содержимое pack
sed -n '1,60p' ~/.kilocode/workflowai/managed_custom_modes.yaml
```

Подробности по содержимому pack: [docs/workflowai/README.md](docs/workflowai/README.md).
