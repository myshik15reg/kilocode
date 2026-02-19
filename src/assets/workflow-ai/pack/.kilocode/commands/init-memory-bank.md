---
description: "Initialize Memory Bank: scaffold full set of files from global templates"
---

# /init-memory-bank

## Outcome (what MUST be created in the consuming project)

This command bootstraps a project by creating **only**:

1. `./.kilocode/memory-bank/` (if missing) and the full set of Memory Bank files:
    1. `index.md`
    2. `context.md`
    3. `brief.md`
    4. `product.md`
    5. `architecture.md`
    6. `tech.md`
2. `./.protocols/` (if missing) with template files (see below).

This command MUST NOT create `./.kilocode/rules/*` (rules stay global).

## Source of templates (global)

Templates are installed by the extension into global templates:

1. Unix (Linux/macOS): `~/.kilocode/workflowai/templates/`
2. Windows: `%USERPROFILE%\\.kilocode\\workflowai\\templates\\`

Memory Bank templates live in:

1. Unix: `~/.kilocode/workflowai/templates/memory-bank/`
2. Windows: `%USERPROFILE%\\.kilocode\\workflowai\\templates\\memory-bank\\`

Protocols templates live in:

1. Unix: `~/.kilocode/workflowai/templates/protocols/`
2. Windows: `%USERPROFILE%\\.kilocode\\workflowai\\templates\\protocols\\`

## Agent checklist (bootstrap)

1. Ensure directories exist:
    1. `./.kilocode/memory-bank/`
    2. `./.protocols/`
2. For each of the 6 Memory Bank files listed above:
    1. If the destination file already exists — leave it untouched.
    2. If missing — copy it from the global templates `memory-bank/` directory.
3. For protocols, ensure these exist (copy from global templates if missing):
    1. `./.protocols/README.md`
    2. `./.protocols/index.md`
4. Summarize what was created vs skipped.

## Command examples (ExecuteCommand tool)

### bash (Linux/macOS)

```bash
mkdir -p .kilocode/memory-bank .protocols

template_root="$HOME/.kilocode/workflowai/templates"

for f in index.md context.md brief.md product.md architecture.md tech.md; do
	[ -f ".kilocode/memory-bank/$f" ] || cp "$template_root/memory-bank/$f" ".kilocode/memory-bank/$f"
done

for f in README.md index.md; do
	[ -f ".protocols/$f" ] || cp "$template_root/protocols/$f" ".protocols/$f"
done
```

### PowerShell (Windows)

```powershell
New-Item -ItemType Directory -Force ".kilocode/memory-bank", ".protocols" | Out-Null

$templateRoot = Join-Path $HOME ".kilocode/workflowai/templates"

$mbFiles = "index.md","context.md","brief.md","product.md","architecture.md","tech.md"
foreach ($f in $mbFiles) {
	$dest = Join-Path ".kilocode/memory-bank" $f
	if (-not (Test-Path $dest)) {
		Copy-Item (Join-Path $templateRoot ("memory-bank/" + $f)) $dest
	}
}

$protocolFiles = "README.md","index.md"
foreach ($f in $protocolFiles) {
	$dest = Join-Path ".protocols" $f
	if (-not (Test-Path $dest)) {
		Copy-Item (Join-Path $templateRoot ("protocols/" + $f)) $dest
	}
}
```

## Next steps after scaffold

1. Open and read: [`.kilocode/memory-bank/index.md`](.kilocode/memory-bank/index.md:1)
2. Confirm `[MB: OK]` in the chat.
3. Fill placeholders in:
    1. [`.kilocode/memory-bank/context.md`](.kilocode/memory-bank/context.md:1)
    2. [`.kilocode/memory-bank/brief.md`](.kilocode/memory-bank/brief.md:1)
    3. [`.kilocode/memory-bank/product.md`](.kilocode/memory-bank/product.md:1)
    4. [`.kilocode/memory-bank/architecture.md`](.kilocode/memory-bank/architecture.md:1)
    5. [`.kilocode/memory-bank/tech.md`](.kilocode/memory-bank/tech.md:1)

## Rules location (do not copy into project)

If you need the detailed Memory Bank usage rules:

1. Global (preferred): `~/.kilocode/rules/memory-bank-instructions.md` (Windows: `%USERPROFILE%\\.kilocode\\rules\\memory-bank-instructions.md`).
2. Embedded-pack repos MAY also have a workspace-local `.kilocode/rules/memory-bank-instructions.md`.
