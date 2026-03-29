# Workflow: 1C testing

## Goal

Provide a high-level testing path for 1C work using the right mix of unit, scenario, and regression checks.

## Typical layers

| Layer                     | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| xUnit-style tests         | verify local logic and isolated behavior |
| Vanessa or scenario tests | verify key business flows                |
| regression checks         | protect high-risk paths after change     |

## Use when

- new 1C behavior is introduced
- a 1C bug fix needs regression protection
- a 1C change affects user or integration flows

## Core rules

1. Match the test depth to the change risk.
2. Keep scenario tests focused on meaningful business flows.
3. Use regression checks for known fragile paths.
4. Align with repository and team quality policy.

## Related sources

- 1C workflow skill: [`../skills/1c-workflow/SKILL.md`](../skills/1c-workflow/SKILL.md:1)
- 1C SDLC: [`1c-full-sdlc.md`](1c-full-sdlc.md:1)
