# Scripts Entrypoints

Purpose: document how optional `workflowai-*` helper scripts should be treated.

## Important boundary

Scripts are optional helpers, not the source of truth.
The source of truth remains the workflow and rule documents in `.kilocode/`.

## Contexts

| Context           | Meaning                                                            |
| ----------------- | ------------------------------------------------------------------ |
| Embedded pack     | workflow docs live inside a repository or extension asset bundle   |
| Global install    | workflow assets are installed under the user's home Kilo directory |
| Consuming project | a project workspace that uses the templates and rules              |

## Rules

1. Do not assume a helper script exists unless the current installation documents it.
2. If a script is missing, follow the documented manual workflow instead.
3. Repository-local `./scripts/` paths belong to the consuming project, not automatically to the workflow pack.
4. Keep script references descriptive and optional.

## Typical optional helpers

| Helper                       | Intended use                                           |
| ---------------------------- | ------------------------------------------------------ |
| `workflowai-init-project.*`  | initialize workspace Memory Bank or template structure |
| `workflowai-new-protocol.*`  | scaffold a protocol folder                             |
| `workflowai-doctor.*`        | validate workflow pack integrity                       |
| `workflowai-quality-gates.*` | run repo-specific verification helpers                 |

## Manual fallback

If no helper scripts are available:

- create the workspace Memory Bank from templates or docs
- create protocol folders manually using [`protocol-new.md`](protocol-new.md:1)
- run project verification using the repository's own scripts and package commands
