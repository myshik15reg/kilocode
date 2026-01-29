# One Mode Per Task — Delegation Examples

Правило описано в `AGENTS.md`. Этот файл содержит только короткие примеры.

> Kilo Code: делегируй через `new_task`, `switch_mode` запрещён. Codex CLI: `new_task` нет, допустима роль-петля в одной сессии.

## Минимальный чеклист
- Делегируй через `new_task` (не `switch_mode`).
- Указывай `CAPABILITIES` (memory_bank/subagents/tools).
- Передавай путь к протоколу и ожидаемые артефакты.
- Соблюдай Context Isolation.

## Architect -> Code
```yaml
new_task:
  mode: code
  capabilities:
    memory_bank: full
    subagents: yes
    tools: full
  message: |
    TASK: Implement according to plan.
    Protocol: .protocols/2025-12-31-auth/plan.md
    Inputs: .protocols/2025-12-31-auth/brief.md
    Outputs: updated code + tests + execution.md
```

## Code -> Unit Tester
```yaml
new_task:
  mode: unit-tester
  capabilities:
    memory_bank: full
    subagents: yes
    tools: full
  message: |
    TASK: Verify tests and coverage 100%.
    Target: src/auth.ts
    Protocol: .protocols/2025-12-31-auth/
```

## Memory-bank limited
```yaml
new_task:
  mode: reviewer
  capabilities:
    memory_bank: limited
    subagents: no
    tools: read-only
  message: |
    TASK: Code review.
    Context Capsule: .protocols/2025-12-31-auth/context-capsule.md
    Protocol: .protocols/2025-12-31-auth/
```
