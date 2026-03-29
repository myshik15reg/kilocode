---
description: "Update durable Memory Bank context after verified changes"
argument-hint: "(optional) what changed"
---

Goal: keep Memory Bank accurate after durable project context changes.

Minimum update:
1. Update [`.kilocode/memory-bank/context.md`](.kilocode/memory-bank/context.md:1)
   - What changed (1-5 bullet points)
   - Risks / follow-ups
   - Next steps

Update additional files only if impacted:
- [`.kilocode/memory-bank/architecture.md`](.kilocode/memory-bank/architecture.md:1) - if architecture decisions changed
- [`.kilocode/memory-bank/tech.md`](.kilocode/memory-bank/tech.md:1) - if stack/tools changed
- [`.kilocode/memory-bank/product.md`](.kilocode/memory-bank/product.md:1) - if UX/personas/flows changed
- [`.kilocode/memory-bank/brief.md`](.kilocode/memory-bank/brief.md:1) - if project goals/constraints changed

Do not write task-local `Spec`, `Plans`, or raw protocol history into Memory Bank.

Rule: update Memory Bank **before** closing a protocol only when durable knowledge changed.

Related guidance:
1. [`.kilocode/rules/memory-bank-instructions.md`](.kilocode/rules/memory-bank-instructions.md:1)
2. [`.kilocode/rules/brief-spec-memory-bank.md`](.kilocode/rules/brief-spec-memory-bank.md:1)


