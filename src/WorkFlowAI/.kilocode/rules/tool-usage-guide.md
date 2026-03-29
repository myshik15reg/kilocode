# Tool Usage Guide

Source of truth:

- Tool permissions: [`../skills/tool-access/SKILL.md`](../skills/tool-access/SKILL.md:1)
- Execution safety: [`ai-execution-rules.md`](ai-execution-rules.md:1)

## Minimal rules

1. Use only the tools allowed for the current mode.
2. Delegate across modes with `new_task` rather than informal switching.
3. Treat destructive or irreversible actions as higher-risk operations.
4. Prefer the smallest tool capable of proving or changing what is needed.
5. When tool guidance conflicts, follow the stricter source-of-truth rule.
