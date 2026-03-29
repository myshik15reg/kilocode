# Workflow: orchestration-troubleshooting

## Goal

Recover when multi-mode coordination becomes confused, wasteful, or blocked.

## Symptoms

Use this workflow when one or more of these appears:

- handoffs are too vague
- specialists are duplicating work
- context is too large or noisy
- orchestration keeps looping without progress
- the next responsible mode is unclear

## Triage steps

1. Re-state the actual goal.
2. Check whether orchestration is still needed.
3. Identify the last good handoff or verified result.
4. Remove stale or irrelevant context.
5. Delegate the next smallest clear subtask.

## Common fixes

| Problem               | Correction                                                |
| --------------------- | --------------------------------------------------------- |
| vague handoff         | rewrite it using the canonical handoff format             |
| too much context      | replace bulk text with a small capsule and file list      |
| wrong specialist      | reroute using mode-selection rules                        |
| overlapping ownership | assign one area to one mode at a time                     |
| endless routing       | stop and ask one blocking question or pick a safe default |

## References

- Orchestration flow: [`agent-orchestration.md`](agent-orchestration.md:1)
- Handoff protocol: [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1)
- Mode selection: [`../skills/mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)
