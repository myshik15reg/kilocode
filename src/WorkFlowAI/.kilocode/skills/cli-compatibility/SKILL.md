---
name: cli-compatibility
description: Portable guidance for command execution across shells and environments, with emphasis on avoiding shell-specific assumptions.
---

# CLI Compatibility

Use this skill when writing or suggesting commands that should work reliably across environments.

## Core rules

1. Avoid shell-specific shortcuts unless the environment guarantees them.
2. Prefer explicit sequential commands over clever chaining when portability matters.
3. Make working-directory assumptions explicit.
4. Keep command examples small and easy to adapt.

## Common compatibility concerns

- different shell syntax
- path quoting differences
- working directory ambiguity
- tool availability varying by project or machine

## Good practice

- state the intended shell or environment when relevant
- prefer repository-documented commands over custom invention
- use project-local tools and scripts when available
