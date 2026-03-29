# UX Rebrand Audit Note

## Changed now

- User-visible extension branding in `src/package.json` and `src/package.nls*.json` now says `AlfaCode assistant` where the extension name is shown.
- Onboarding and walkthrough copy in `src/walkthrough/*.md` now refers to `AlfaCode assistant`.
- User-facing WorkflowAI overview copy in `docs/workflowai/README.md` now refers to `AlfaCode assistant`.
- Visible webview strings updated to `AlfaCode assistant` in welcome, help, slash command, export-adjacent, bug-report, footer, and suggestion-logo surfaces.
- User-facing Neo4j help and setup docs now refer to `AlfaCode assistant` while keeping compatibility keys and command identifiers unchanged where needed.
- Affected test expectations were updated to match the new visible brand.

## Intentionally kept internal

- Internal package and namespace identifiers such as `@kilocode/*`, `.kilocode`, protocol/workflow IDs, and storage-related names.
- Existing product/service names like `AlfaCode Cloud` and `AlfaCode Router` where they identify separate user-facing services rather than the extension name.
- Existing internal/provider keys such as `kilocode`, `roo`, config keys, API field names, and compatibility-oriented paths.
- Icon asset filenames and other merge-sensitive implementation details that do not change the visible extension brand.
