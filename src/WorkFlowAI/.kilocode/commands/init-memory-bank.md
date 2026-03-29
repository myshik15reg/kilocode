---
description: "Workflow: initialize or repair workspace Memory Bank and continue into the artifact flow"
---

Source of Truth (workflow): [`.kilocode/workflows/init-memory-bank.md`](.kilocode/workflows/init-memory-bank.md:1)

Use this entrypoint when the workspace Memory Bank is missing, incomplete, or needs repair.

Recommended flow:
1. Initialize or repair workspace Memory Bank by [`.kilocode/workflows/init-memory-bank.md`](.kilocode/workflows/init-memory-bank.md:1)
2. Read [`.kilocode/memory-bank/index.md`](.kilocode/memory-bank/index.md:1) and confirm `[MB: OK]`
3. Prime context by [`.kilocode/workflows/context-priming.md`](.kilocode/workflows/context-priming.md:1)
4. Clean the task contract by [`.kilocode/workflows/brief-refinement.md`](.kilocode/workflows/brief-refinement.md:1)
