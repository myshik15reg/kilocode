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

From target project, run:

```bash
python .kilocode/skills/fix-broken-links/scripts/validate-memory-bank-links.py
```

## Process

### Step 1: Run Validation Script

Execute the validation script to scan Memory Bank in the current project:

```bash
python .kilocode/skills/fix-broken-links/scripts/validate-memory-bank-links.py
```

Run this from the **project root** (where `.kilocode/memory-bank/` exists).

The script will:

- Scan all `.kilocode/memory-bank/**` files
- Check all `index.md` links
- Check all cross-references
- Report broken links with file paths

**Exit Codes:**

- `0` - All links valid, no action needed
- `1` - Broken links found, proceed to fix

### Step 2: Parse Results

If validation fails (exit code 1), the output contains:

- List of broken index links
- List of broken cross-references
- Format: `source_file: `[link_text] (link_target)` → resolved_path`

Example:

```
.kilocode/memory-bank/guides/index.md: `[Testing] (./testing.md)` → .kilocode/memory-bank/guides/testing.md
```

### Step 3: Fix Each Broken Link

For each broken link, analyze and fix:

**A. Check if similar file exists:**

- Use repo search (`rg`, file search, or the active IDE search) to find similar file names
- Example: `testing.md` not found, but `testing-guide.md` exists
- Action: Update link to correct file

**B. If no similar file exists:**

- Check if link is to planned but not created file
- Options:
    1. Remove link entirely (keep text as plain text)
    2. Remove entire section if obsolete
    3. Keep as placeholder with note

**C. Apply fix:**

- Use the active repo editing tool to update the file
- Report what was changed

### Step 4: Re-validate

After fixing all links, run validation script again:

```bash
python .kilocode/skills/fix-broken-links/scripts/validate-memory-bank-links.py
```

If still has errors, repeat Step 3 for remaining issues.

### Step 5: Summary

Provide summary:

- Total links fixed
- Validation status (✅ passed or ❌ still has issues)
- List any remaining issues that need manual review

## Examples

### Example 1: Update to similar file

```
Broken: .kilocode/memory-bank/guides/index.md: `[Testing] (./testing.md)`
Found: .kilocode/memory-bank/guides/testing-guide.md

Action: Edit .kilocode/memory-bank/guides/index.md
Change: `[Testing] (./testing.md)` → `[Testing] (./testing-guide.md)`
```

### Example 2: Remove broken link

```
Broken: .kilocode/memory-bank/README.md: `[Old Guide] (./guides/deprecated.md)`
No similar files found.

Action: Edit .kilocode/memory-bank/README.md
Change: `[Old Guide] (./guides/deprecated.md)` → Old Guide (deprecated)
```

### Example 3: Remove obsolete section

```
Broken: Multiple links in "## Legacy Workflows" section
All files missing, section is obsolete.

Action: Edit .kilocode/memory-bank/workflows/index.md
Remove entire "## Legacy Workflows" section
```

## Important Notes

- **Always read files before editing** - inspect the file content first to preserve intent
- **Preserve intent** - Understand what the link was trying to accomplish
- **Be conservative** - If unsure, ask user before removing content
- **Batch edits** - Group similar fixes together for efficiency
- **Report clearly** - Show before/after for each fix

## Script Location

```
.kilocode/skills/fix-broken-links/scripts/validate-memory-bank-links.py
```

It's a standalone Python script that:

- Requires no dependencies beyond standard library
- Works without `generation-plan.md`
- Scans `.kilocode/memory-bank/` directory automatically
- Validates both index links and cross-references
