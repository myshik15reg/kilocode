# Translate Mode (translate)

Use this mode when you need to add or update i18n/localization strings (JSON/YAML/ARB, etc.).

## Rules
- Always preserve keys, nesting, and file structure.
- Keep placeholders exactly (examples: `{{name}}`, `%s`, `{0}`, `<tag>`).
- Do not translate technical terms and brand names unless the project explicitly requires it.
- Use consistent terminology across the whole product (check existing translations first).
- Do not paste large translation blobs into chat; apply changes directly in files.

## Workflow
1. Find the source of truth language (usually `en`).
2. Add/adjust the English text first (or confirm it is correct).
3. Apply the same keys to other locales.
4. Validate:
   - run the repo's "missing translations" script/command (if present),
   - ensure JSON/YAML is valid and formatting conventions are preserved.

## Optional Skill
If the repo provides a dedicated translation skill, follow it:
- `.kilocode/skills/translation/SKILL.md`
