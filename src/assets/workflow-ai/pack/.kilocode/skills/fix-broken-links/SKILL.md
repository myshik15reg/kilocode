---
name: fix-broken-links
description: Validate `.kilocode/memory-bank/**` links and fix broken references
---

# Fix Broken Links in Memory Bank

This skill helps validate and fix broken links in your project's Memory Bank under `.kilocode/memory-bank/`.

## When to Use

Use this skill when:

- User explicitly asks to fix broken links
- You need to validate Memory Bank integrity

## Invocation

From the target project root, run the validation script from the installed WorkFlowAI location.

## Process

### Step 1: Run Validation Script

Execute the validation script to scan Memory Bank in the current project.

Run this from the **project root** (where `.kilocode/memory-bank/` exists).

The script will:

- Scan all `.kilocode/memory-bank/**` files
- Check all `index.md` links
- Check all cross-references
- Report broken links with file paths

### Step 2: Parse Results

If validation fails, review the broken links and classify them:

- wrong relative path
- renamed target file
- obsolete placeholder link
- stale section that should be removed

### Step 3: Fix Each Broken Link

For each broken link:

- Check if a similar file exists
- If yes, update the link
- If not, remove or rewrite the stale reference conservatively
- Preserve the intent of the original section

### Step 4: Re-validate

After fixing links, run the validator again until the remaining issues are either resolved or explicitly documented.

### Step 5: Summary

Provide a short summary:

- total links fixed
- validation status
- any remaining manual-review items

## Script Location

Use the script relative to this skill directory or the installed WorkFlowAI root:

```bash
python <WORKFLOWAI_ROOT>/skills/fix-broken-links/scripts/validate-memory-bank-links.py
```

## Important Notes

- Always read files before editing
- Preserve intent rather than blindly deleting text
- Be conservative when a target is ambiguous
- Report before/after clearly
