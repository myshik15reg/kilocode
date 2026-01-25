# План

## Шаги
- [x] Обновить схемы/типы глобальных настроек и ExtensionState.
- [x] Добавить логику контекстного роутинга (fast/deep) + unit-тесты.
- [x] Обновить UI настроек контекста и состояния webview.
- [x] Обновить интеграцию environment_details.
- [x] Запустить таргетные vitest для src и webview-ui, зафиксировать результаты.
- [x] Исправить ошибки компиляции в code-index orchestrator tests (mock path + доступ к private).
- [x] Исправить падения code-index тестов (config-manager, manager, qdrant-client).
- [x] Исправить мок vscode для тестов MCP (Uri/RelativePattern).
- [x] Актуализировать core webview/task тесты под новые default/migration и моки vscode.
- [x] Полный прогон `pnpm --filter ./src test` (vitest full).

## Файлы к изменению
- packages/types/src/global-settings.ts
- src/shared/ExtensionMessage.ts
- src/core/environment/getEnvironmentDetails.ts
- src/core/context-management/context-routing.ts (new)
- src/core/context-management/__tests__/context-routing.spec.ts (new)
- src/core/webview/ClineProvider.ts
- src/core/webview/__tests__/ClineProvider.spec.ts
- src/services/neo4j/extractors/tree-sitter-graph-extractor.ts
- src/shared/modes.ts
- src/services/code-index/__tests__/orchestrator.spec.ts
- src/services/code-index/__tests__/config-manager.spec.ts
- src/services/code-index/__tests__/manager.spec.ts
- src/services/code-index/vector-store/__tests__/qdrant-client.spec.ts
- src/services/mcp/__tests__/McpHub.spec.ts
- src/core/webview/__tests__/webviewMessageHandler.codeIndex.spec.ts
- src/core/task/__tests__/flushPendingToolResultsToHistory.spec.ts
- src/__tests__/common-mocks.ts
- src/__tests__/dist_assets.spec.ts
- src/__tests__/extension.spec.ts
- src/services/neo4j/__tests__/hybrid-search-service.spec.ts
- .kilocode/memory-bank/context.md
- webview-ui/src/components/settings/ContextManagementSettings.tsx
- webview-ui/src/components/settings/SettingsView.tsx
- webview-ui/src/components/settings/__tests__/ContextManagementSettings.spec.tsx
- webview-ui/src/components/settings/__tests__/SettingsView.unsaved-changes.spec.tsx
- webview-ui/src/components/settings/__tests__/SettingsView.change-detection.spec.tsx
- webview-ui/src/context/ExtensionStateContext.tsx
- webview-ui/src/context/__tests__/ExtensionStateContext.spec.tsx
- webview-ui/src/i18n/locales/en/settings.json
- webview-ui/src/i18n/locales/es/settings.json
- webview-ui/src/i18n/locales/ru/settings.json
- protocol-new.md
- .protocols/2026-01-24-context-routing-settings/{brief.md,plan.md,execution.md}
