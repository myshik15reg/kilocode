# Brief

## Project

AlfaCode assistant monorepo with embedded WorkFlowAI runtime assets.

## Current objective

Keep WorkFlowAI highly reusable as a template pack while ensuring live project/task state remains workspace-local, low-noise, and token-efficient.

## Constraints

- Minimize token usage in always-on prompts.
- Keep WorkFlowAI portable across extension installs.
- Avoid storing cross-project task history in the template pack.
- Keep fixes minimal and merge-friendly.
