---
name: effort-estimation-human-hours
description: Estimate engineering effort in human-hours from solution scope and repository change proxies
---

# Skill: Effort estimation (human-hours)

## Purpose

Estimate effort in **human-hours** from task scope, proposed solution, and repository-change proxies.

## Portability boundary

- This skill must remain portable.
- Do not depend on historical protocol folders inside the template pack.
- If project-specific calibration artifacts exist in the current workspace, use them.
- Otherwise use the generic estimation flow and state that calibration is unavailable.

## Inputs

- Task brief or solution description
- Optional protocol `brief.md` and `plan.md`
- Optional repository signals: changed files, diff size, commit count, subsystem spread
- Optional workspace-local calibration artifacts

## Recommended flow

1. Read the task scope and expected deliverables.
2. Estimate complexity drivers:
    - breadth of affected files/modules
    - testing burden
    - integration risk
    - migration or rollout risk
    - documentation burden
3. If workspace-local calibration artifacts exist, use them as an adjustment layer.
4. Produce:
    - `Optimistic`
    - `Expected`
    - `Pessimistic`
5. Explain the main drivers and uncertainty.

## Output format

- Expected: `<hours>`
- Optimistic: `<hours>`
- Pessimistic: `<hours>`
- Drivers: 3-7 bullets
- Risks: 1-5 bullets
- Confidence: low / medium / high

## Important notes

- Never claim calibrated precision when calibration artifacts are absent.
- Prefer conservative transparency over fake certainty.
- Keep the result explainable and tied to observable task properties.
