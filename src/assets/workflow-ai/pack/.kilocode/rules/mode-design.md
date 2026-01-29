# Mode Design Notes

Purpose: clarify why there are many modes and when to consolidate.

## Why Many Modes Are OK
- Mode files are loaded on selection, not all at once.
- Specialization keeps prompts focused and reduces noise.
- Duplication is acceptable if it avoids mode cross-talk.

## When to Consolidate
- The same rule appears in many modes and drifts out of sync.
- A rule is core (applies to every mode) and belongs in `AGENTS.md`.
- The maintenance cost is higher than the clarity benefit.

## Preferred Pattern
- Keep core rules in `AGENTS.md` and `~/.kilocode/rules/`.
- Keep mode files short and mode-specific.
- Link to shared rules instead of copying them.

## Consolidation Checklist
- Identify duplicated rules and move them to a shared doc.
- Replace duplicates with a short link to the shared rule.
- Verify that mode prompts still stand alone.
