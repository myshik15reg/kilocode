# Workflow: documentation

## Goal

Update documentation so it stays aligned with source-of-truth behavior and helps future work rather than creating duplicate noise.

## Use when

- code or process changes affect user or maintainer understanding
- a missing doc blocks safe execution or onboarding
- a source-of-truth file needs clarification or consolidation

## Core rules

1. Prefer updating existing source-of-truth docs over creating duplicates.
2. Keep docs close to the thing they explain.
3. Separate runtime guidance from maintainer-only notes.
4. Do not let narrative docs contradict operational source-of-truth files.

## Recommended flow

| Step | Outcome                                            |
| ---- | -------------------------------------------------- |
| 1    | identify the audience and source-of-truth location |
| 2    | update the smallest correct document set           |
| 3    | remove or reduce duplication where possible        |
| 4    | verify links and references still make sense       |

## Good outputs

- shorter, clearer source-of-truth text
- corrected links and entrypoints
- explicit boundary between template and workspace state
- concise maintainer notes when runtime docs should stay lean

## Anti-patterns

- adding another wrapper when a source doc can be fixed directly
- mixing historical notes into runtime startup docs
- creating broad documentation churn during a code-only task without user value
