# Аудит quality/security rails — WorkFlowAI workflow-pack

**Protocol:** [`.protocols/2026-02-05-workflow-pack-audit/`](.protocols/2026-02-05-workflow-pack-audit/:1)  
**Date:** 2026-02-06  
**Auditor:** security-auditor (SAST)

## Scope

- Quality rails: 100% coverage + TDD, lint = 0, запрет «отключателей» правил.
- Enforceability: наличие/работоспособность CI templates + как их подключать.
- Secrets hygiene: утечки/ложные срабатывания/опасные примеры.
- Dependency security: практики и минимальные, безопасные рекомендации.

## Summary

- **Wrappers vs SoT:** тонкие wrappers для качества/безопасности в целом непротиворечивы и корректно указывают на SoT skills/patterns: см. [`quality-gates.md`](.kilocode/rules/quality-gates.md:1), [`quality-gates/SKILL.md`](.kilocode/skills/quality-gates/SKILL.md:1), [`security-rules.md`](.kilocode/rules/security-rules.md:1), [`security.md`](.kilocode/patterns/security/security.md:1).
- **Главный риск — enforceability:** CI-шаблон quality gates вызывает отсутствующий runner-скрипт, а документация параллельно описывает «глобальные» runner/guardrails. В текущем виде rails становятся в основном декларативными (не блокируют merge автоматически) — см. [`workflowai-quality-gates.yml`](.kilocode/templates/quality-gates/project/.github/workflows/workflowai-quality-gates.yml:17).
- **Secrets:** явных секретов (по быстрым сигнатурам ключей/приватных ключей) не обнаружено, но есть:
    - tracked локальные артефакты ([`.claude/settings.local.json`](.claude/settings.local.json:1), [`WorkFlowAI.code-workspace`](WorkFlowAI.code-workspace:1)) вопреки [`repo-hygiene.md`](.kilocode/rules/repo-hygiene.md:36);
    - «секрет‑похожие» строки в примерах (например `sk_live_…`) → риск ложных срабатываний секрет‑сканеров и CI шум.
- **Dependencies:** процесс обновления зависимостей в целом хороший ([`dependency-management.md`](.kilocode/workflows/dependency-management.md:1)), но в security skill/паттернах стоит добавить минимальные safety‑notes (избежать `--force` по умолчанию, не навязывать global install, учитывать exfiltration в `monitor`).

## Findings

| severity    | location                                                                                                                                                                                                                                                                                                       | проблема                                                                                                                                                                                                           | рекомендация                                                                                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BLOCKER** | [`workflowai-quality-gates.yml`](.kilocode/templates/quality-gates/project/.github/workflows/workflowai-quality-gates.yml:17)                                                                                                                                                                                  | GitHub Actions workflow запускает `./scripts/workflowai-quality-gates.ps1`, но в template такого файла нет → CI не исполняется, гейты качества/безопасности не enforceable.                                        | Либо добавить `project/scripts/workflowai-quality-gates.ps1` в template (самодостаточный runner/обёртка), либо привести workflow+docs к единому варианту запуска (и явно описать prerequisites для GitHub-hosted vs self-hosted runner). |
| **HIGH**    | [`global-install.md`](.kilocode/workflows/global-install.md:3), [`integration-guide.md`](.kilocode/rules/integration-guide.md:10), [`project-setup.md`](.kilocode/workflows/project-setup.md:28)                                                                                                               | Опечатки путей `~/~/.kilocode` и `$HOME/~/.kilocode` ломают copy-paste и создают риск работы с «не тем» каталогом (в PowerShell `~` внутри строки не разворачивается как HOME).                                    | Стандартизировать пути: `~/.kilocode` (Unix/общий), PowerShell: `$HOME/.kilocode` (без `~/`).                                                                                                                                            |
| **HIGH**    | [`workflowai-quality-gates.json`](.kilocode/templates/quality-gates/project/scripts/workflowai-quality-gates.json:5), пресеты ([`node.json`](.kilocode/templates/quality-gates/project/scripts/presets/node.json:6), [`python.json`](.kilocode/templates/quality-gates/project/scripts/presets/python.json:6)) | Используется Windows‑специфичный плейсхолдер `%USERPROFILE%` внутри аргумента `-File`. Это работает только при кастомной подстановке runner’ом; при дрейфе/отсутствии подстановки guardrails «тихо» не запустится. | В templates/presets заменить на единый OS‑agnostic плейсхолдер (например `~`) и/или явно указать, что подстановка выполняется runner’ом и обязана валидироваться.                                                                        |
| **MEDIUM**  | [`quality-enforcement.md`](.kilocode/workflows/quality-enforcement.md:4), [`quality-gates/SKILL.md`](.kilocode/skills/quality-gates/SKILL.md:42)                                                                                                                                                               | Документация декларирует _dependency scan + secrets detection_ как часть rails, а в templates/presets нет явных шагов (кроме «Guardrails»). Плюс в SoT-пайплайне заявлен `security-scan`.                          | Либо (а) явно перечислить, что именно проверяет guardrails (secrets/deps/etc.), либо (б) добавить минимальные stack-native шаги в пресеты/пример-конфиг (без новых зависимостей) и описать их как обязательные для CI.                   |
| **MEDIUM**  | [`security-audit/SKILL.md`](.kilocode/skills/security-audit/SKILL.md:445), [`security.md`](.kilocode/patterns/security/security.md:98)                                                                                                                                                                         | «Секрет‑похожие» строки в примерах (например `sk_live_…`, connection string с `password`) могут триггерить secret scanners и создавать шум/ложные блокировки.                                                      | Заменить на плейсхолдеры, которые не матчат популярные сигнатуры, и явно маркировать как example (`*_EXAMPLE_DO_NOT_USE`, `<user>:<pass>`).                                                                                              |
| **MEDIUM**  | [`security-audit/SKILL.md`](.kilocode/skills/security-audit/SKILL.md:471), [`security.md`](.kilocode/patterns/security/security.md:273)                                                                                                                                                                        | Встречаются потенциально рискованные рекомендации без safety-note (`npm audit fix --force`, `npm install -g …`, `… monitor`) → риск регрессий/нежелательных изменений/выгрузки метаданных наружу.                  | Добавить 2–3 строки предосторожности: `--force` только осознанно + review/waiver; предпочитать `npx`/локальные dev deps; `monitor` — только по политике (возможна отправка метаданных).                                                  |
| **MEDIUM**  | [`repo-hygiene.md`](.kilocode/rules/repo-hygiene.md:36), tracked files: [`.claude/settings.local.json`](.claude/settings.local.json:1), [`WorkFlowAI.code-workspace`](WorkFlowAI.code-workspace:1)                                                                                                             | В репо отслеживаются локальные артефакты, которые по правилам не должны коммититься. Это увеличивает риск случайной утечки (в будущем), дрейфа окружения и шума в PR.                                              | Удалить из трекинга + добавить минимальный корневой `.gitignore` под local-only артефакты.                                                                                                                                               |

## Proposed minimal edits (по файлам)

### 1) Enforceability: CI quality gates

- В [`workflowai-quality-gates.yml`](.kilocode/templates/quality-gates/project/.github/workflows/workflowai-quality-gates.yml:17) привести запуск к реально существующему runner’у:
    - **Вариант A (самодостаточно для GitHub-hosted):** добавить в template файл `project/scripts/workflowai-quality-gates.ps1` и оставить текущий вызов. Скрипт должен запускать шаги из [`workflowai-quality-gates.json`](.kilocode/templates/quality-gates/project/scripts/workflowai-quality-gates.json:1) и валидировать exit codes.
    - **Вариант B (только self-hosted):** заменить вызов на глобальный runner из [`quality-enforcement.md`](.kilocode/workflows/quality-enforcement.md:90) и в явном виде написать prerequisite: «runner должен быть установлен на runner-машине».
- В [`templates/quality-gates/README.md`](.kilocode/templates/quality-gates/README.md:14) и [`quality-enforcement.md`](.kilocode/workflows/quality-enforcement.md:18) синхронизировать утверждение «runner/guardrails глобальные» с реальным CI шаблоном (сейчас CI вызывает локальный скрипт, которого нет).

### 2) Стандартизация путей (copy-paste safety)

- В [`global-install.md`](.kilocode/workflows/global-install.md:3) заменить `~/~/.kilocode` → `~/.kilocode` (включая блоки [`global-install.md`](.kilocode/workflows/global-install.md:8), [`global-install.md`](.kilocode/workflows/global-install.md:26)).
- В [`global-install.md`](.kilocode/workflows/global-install.md:38) и [`project-setup.md`](.kilocode/workflows/project-setup.md:28) заменить `$HOME/~/.kilocode` → `$HOME/.kilocode`.
- В [`integration-guide.md`](.kilocode/rules/integration-guide.md:10) заменить `~/~/.kilocode` → `~/.kilocode` (и в «compatibility notes» на [`integration-guide.md`](.kilocode/rules/integration-guide.md:43)).

### 3) Templates JSON/presets: убрать Windows-специфику из плейсхолдеров

- В [`workflowai-quality-gates.json`](.kilocode/templates/quality-gates/project/scripts/workflowai-quality-gates.json:5) и пресетах (например [`node.json`](.kilocode/templates/quality-gates/project/scripts/presets/node.json:6), [`dotnet.json`](.kilocode/templates/quality-gates/project/scripts/presets/dotnet.json:6)) заменить `%USERPROFILE%/...` на `~/.kilocode/...` (или другой единый плейсхолдер) и коротко описать, кто и как делает подстановку.

### 4) Secrets hygiene: снизить риск ложных срабатываний

- В [`security-audit/SKILL.md`](.kilocode/skills/security-audit/SKILL.md:445) заменить `sk_live_…` на не‑матчящий плейсхолдер (например `STRIPE_SECRET_KEY_EXAMPLE_DO_NOT_USE`).
- В блоке env vars в [`security-audit/SKILL.md`](.kilocode/skills/security-audit/SKILL.md:517) заменить строку подключения с `user:password@…` на нейтральный шаблон (`postgresql://<user>:<pass>@<host>/<db>`).
- В [`security.md`](.kilocode/patterns/security/security.md:98) заменить `sk-123…` на нейтральный `API_KEY_EXAMPLE_DO_NOT_USE`.

### 5) Dependency/security guidance: добавить safety-note (без раздувания)

- В [`security-audit/SKILL.md`](.kilocode/skills/security-audit/SKILL.md:471) добавить короткое предупреждение рядом с `npm audit fix --force` и global install, а также предложить безопасную альтернативу через `npx`.
- В секции зависимостей в [`security.md`](.kilocode/patterns/security/security.md:272) добавить 1–2 строки: «авто-fix не запускать в CI без review», «`monitor` — только по политике/согласованию».

### 6) Repo hygiene как часть security rails

- Учитывая правило из [`repo-hygiene.md`](.kilocode/rules/repo-hygiene.md:36), убрать из трекинга [`.claude/settings.local.json`](.claude/settings.local.json:1) и [`WorkFlowAI.code-workspace`](WorkFlowAI.code-workspace:1).
- Добавить минимальный `.gitignore` в корень (как минимум: `.claude/`, `*.code-workspace`, `.vscode/`, `.idea/`).
