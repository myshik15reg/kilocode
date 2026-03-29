# 1C KD3 Patterns

Purpose: provide a compact reference entry for KD3-related implementation patterns.

## Use this file for

- understanding where KD3 changes can be risky
- identifying whether logic belongs to export, import, or shared processing
- recalling the need for traceability and minimal safe changes

## Key reminders

1. Shared KD3 algorithms are high-risk.
2. Rule identity and mapping structure should stay stable unless the migration plan explicitly changes them.
3. Export and import paths should be reviewed separately.
4. Large illustrative examples belong in external evidence or project docs, not in the startup path.

## Related sources

- KD3 skill: [`../../skills/1c-alfa-kd3/SKILL.md`](../../skills/1c-alfa-kd3/SKILL.md:1)
- 1C patterns index: [`index.md`](index.md:1)
