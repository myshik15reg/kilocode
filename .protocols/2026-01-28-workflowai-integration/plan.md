# Plan: WorkflowAI integration

## Steps

### Step 1: Confirm current integration surface

- **STATUS:** ✅ Done
- **INPUT:**
    - Инсталлятор ассетов: [`src/services/alfa-code/WorkflowAssetsInstaller.ts`](src/services/alfa-code/WorkflowAssetsInstaller.ts:1)
    - Тесты: [`src/services/alfa-code/__tests__/WorkflowAssetsInstaller.spec.ts`](src/services/alfa-code/__tests__/WorkflowAssetsInstaller.spec.ts:1)
    - Пак ассетов: [`src/assets/workflow-ai/pack/`](src/assets/workflow-ai/pack:1)
- **OUTPUT:**
    - Список уже интегрированных функций (copy rules/skills/workflows/patterns/modes/templates).
    - Перечень потенциальных «пробелов» для максимальной интеграции.
- **VERIFY:**
    - Сверить, что install вызывается при активации: [`src/extension.ts`](src/extension.ts:216) → [`ensureWorkflowAiAssetsInstalled()`](src/services/alfa-code/WorkflowAssetsInstaller.ts:223).
- **AGENT:** architect

### Step 2: Define VSIX packaging validation points

- **STATUS:** ✅ Done
- **INPUT:**
    - Потенциальные точки включения ассетов в VSIX:
        - [`src/.vscodeignore`](src/.vscodeignore:1)
        - `package.json` (раздел `files`/`contributes`)
        - сборочные скрипты (например, `scripts/`)
    - Текущие тесты ассетов: [`src/__tests__/dist_assets.spec.ts`](src/__tests__/dist_assets.spec.ts:1)
- **OUTPUT:**
    - Чек-лист упаковки ассетов (какие каталоги должны войти в VSIX и почему).
    - Решение: какие файлы нужно обновить/проверить.
- **VERIFY:**
    - Убедиться, что pack каталоги не исключены .vscodeignore или сборкой.
- **AGENT:** architect (или devops для анализа сборки)

### Step 3: Strategy for partial integration

- **STATUS:** ✅ Done
- **INPUT:**
    - Сценарии: частично установленные ассеты, неполный merge custom modes, отсутствие templates.
- **OUTPUT:**
    - Политика восстановления (idempotent installer, overwrite/merge правила, безопасный merge modes).
    - Требования к логированию/telemetry (если нужно).
- **VERIFY:**
    - Определить критерии «считаем интеграцию полной».
- **AGENT:** architect

### Step 4: Test strategy

- **STATUS:** ✅ Done
- **INPUT:**
    - Существующие unit-тесты инсталлятора.
    - `dist_assets.spec.ts` для проверки состава dist.
- **OUTPUT:**
    - План новых тестов/расширений (unit/integration).
    - Команды запуска (например, `cd src && pnpm test services/alfa-code/__tests__/WorkflowAssetsInstaller.spec.ts`).
- **VERIFY:**
    - Соответствие TDD и 100% coverage.
- **AGENT:** unit-tester

### Step 5: Implementation handoff checklist

- **STATUS:** ✅ Done
- **INPUT:**
    - Решения из шагов 1-4.
- **OUTPUT:**
    - Список файлов для изменения (при необходимости):
        - [`src/services/alfa-code/WorkflowAssetsInstaller.ts`](src/services/alfa-code/WorkflowAssetsInstaller.ts:1)
        - [`src/services/alfa-code/__tests__/WorkflowAssetsInstaller.spec.ts`](src/services/alfa-code/__tests__/WorkflowAssetsInstaller.spec.ts:1)
        - [`src/__tests__/dist_assets.spec.ts`](src/__tests__/dist_assets.spec.ts:1)
        - [`src/.vscodeignore`](src/.vscodeignore:1)
        - `package.json`
        - сборочные скрипты в `scripts/`
- **VERIFY:**
    - Все изменения отмечены `kilocode_change` там, где нужно.
- **AGENT:** typescript-dev

## Artifacts

- Чек-лист упаковки VSIX (в `.protocols/2026-01-28-workflowai-integration/artifacts/`).
- Решение по partial integration (краткая заметка).
- Результаты тестов/команды запуска.
