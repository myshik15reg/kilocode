---
name: context-tiers
description: Context optimization strategy - lazy loading, tiered reading, token economy for efficient agent work.
---

# Context Tiers (Optimization)

> Read MINIMUM necessary. Save tokens and time.

## Principle: Lazy Loading

```
DON'T read everything at once.
Read Level 0 → identify task → read only relevant.
```

## Level 0: Always Read (~50 lines)

**File:** `.kilocode/QUICK.md` or Memory Bank index

- Confirmation: `[MB: OK]`
- Protocol requirement
- Mode selection table
- Quality gates summary
- Delegation format

## Level 1: Task-Specific

### Development Task
```
.kilocode/QUICK.md
.kilocode/memory-bank/brief.md
.protocols/.../plan.md
```

### Testing Task
```
.kilocode/QUICK.md
/testing-detailed skill
```

### Security Task
```
.kilocode/QUICK.md
/security-audit skill
```

### Orchestration Task
```
.kilocode/QUICK.md
/orchestrator-guide skill
```

## Level 2: Deep Dive (on demand)

Only when explicitly needed:
- Full architecture docs
- Complete API specs
- Historical context

## Anti-Pattern

❌ Read all rules at start
❌ Load full Memory Bank
❌ Read every config file

✅ Start minimal
✅ Expand as needed
✅ Use skills for details
