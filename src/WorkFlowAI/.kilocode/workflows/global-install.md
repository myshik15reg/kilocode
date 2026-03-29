# Workflow: global-install (global install для Alfa Code)

## Goal

Установить workflow-pack глобально в Alfa Code и описать переносимую схему, при которой:

1. правила и workflows живут глобально;
2. контекст проекта (Memory Bank), `temp/` и протоколы живут внутри consuming project.

Нормативная переносимость путей: [`docs-standards.md`](../rules/docs-standards.md:1).
SoT по скриптам и путям: [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

## What Alfa Code expects

| Concern | Location | Meaning |
|---|---|---|
| Global rules | `~/.kilocode/rules/` (Unix) или `$HOME/.kilocode/rules/` (PowerShell) | загружается автоматически |
| Global workflows | `~/.kilocode/workflows/` (Unix) или `$HOME/.kilocode/workflows/` (PowerShell) | библиотека workflows, вызов через `/name.md` |
| Local overrides | `<project>/.kilocode/rules/`, `<project>/.kilocode/workflows/` | перекрывают global при необходимости |
| Project entrypoint | [`AGENTS.md`](../../AGENTS.md:1) | точка входа агента в consuming project |

## Step 1: Install pack globally

Важно: в embedded workflow-pack репозитории каталога `./scripts/` может не быть, поэтому repo-local installer является условным сценарием. Условия и пути MUST следовать [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

### Option A (conditional): repo-local installer exists

Условие: в репозитории реально существует `./scripts/workflowai-install-global.ps1`.

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/workflowai-install-global.ps1
```

### Option B: manual copy (portable default)

1. Скопируй rules и workflows в home-dir Alfa Code.

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.kilocode/rules" | Out-Null
New-Item -ItemType Directory -Force -Path "$HOME/.kilocode/workflows" | Out-Null
Copy-Item -Recurse -Force ./.kilocode/rules/* "$HOME/.kilocode/rules/"
Copy-Item -Recurse -Force ./.kilocode/workflows/* "$HOME/.kilocode/workflows/"
```

Unix/macOS:

```bash
mkdir -p ~/.kilocode/rules ~/.kilocode/workflows
cp -R ./.kilocode/rules/* ~/.kilocode/rules/
cp -R ./.kilocode/workflows/* ~/.kilocode/workflows/
```

2. (Optional) Скопируй templates в `~/.kilocode/workflowai/templates/` (Unix) или `$HOME/.kilocode/workflowai/templates/` (PowerShell), если используешь global install как источник шаблонов для проектов.

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.kilocode/workflowai/templates" | Out-Null
Copy-Item -Recurse -Force ./.kilocode/templates/* "$HOME/.kilocode/workflowai/templates/"
```

Unix/macOS:

```bash
mkdir -p ~/.kilocode/workflowai/templates
cp -R ./.kilocode/templates/* ~/.kilocode/workflowai/templates/
```

## Step 2: Initialize a consuming project

Процесс инициализации проекта: [`project-setup.md`](project-setup.md:1).

Правило: любые упоминания repo-local `./scripts/...` MUST быть условными и проверяемыми; см. [`evidence-rules.md`](../rules/evidence-rules.md:1) и [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

## Step 3: Verify

1. Открой consuming project в VS Code с Alfa Code.
2. Убедись, что entrypoint существует: [`AGENTS.md`](../../AGENTS.md:1).
3. Убедись, что agent читает Memory Bank и подтверждает контекст строкой `[MB: OK]`. Source: [`memory-bank/index.md`](../memory-bank/index.md:1).

## References

| Topic | Link |
|---|---|
| Integration options | [`integration-guide.md`](../rules/integration-guide.md:1) |
| Project init | [`project-setup.md`](project-setup.md:1) |
| Script path SoT | [`scripts-entrypoints.md`](scripts-entrypoints.md:1) |
