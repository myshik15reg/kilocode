# Tech

## UI Files

- `webview-ui/src/components/settings/AlfaCodeSettings.tsx`
- `webview-ui/src/components/settings/SettingsView.tsx`
- `webview-ui/src/i18n/locales/en/kilocode.json`

## Validation

Relevant UI tests run from `webview-ui/` using Vitest.

## Notes

Routing presets currently choose from existing API profiles listed in `listApiConfigMeta` and default to the first available helper profile when applying one-click cheap-helper presets.
