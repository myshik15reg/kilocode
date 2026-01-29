# Environment: Windows + PowerShell

Use these conventions when the project is developed on Windows and commands are expected to be run in PowerShell.

## Command Style
- Prefer PowerShell syntax over bash/zsh constructs.
- Use Windows paths (`C:\\path\\to\\file`) and quote paths with spaces.
- If commands differ significantly across shells, provide PowerShell first and optionally a bash alternative.

## PowerShell Conventions
- Env vars: `$env:NAME = "value"`
- CI mode (disable watch prompts): `$env:CI = "true"`
- Chain commands: `;` (avoid relying on `&&` / `||` unless explicitly targeting PowerShell 7+)
- Exit code: check `$LASTEXITCODE` when needed

## Encoding (UTF-8)
- WorkFlowAI docs/scripts are UTF-8 without BOM.
- When reading `.md` in Windows PowerShell, use `Get-Content -Raw -Encoding utf8 <path>` to avoid mojibake.
- If console output renders unicode poorly, set `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` and `$OutputEncoding = [System.Text.Encoding]::UTF8`.

## Common Equivalents
- `ls` -> `Get-ChildItem`
- `cat` -> `Get-Content`
- `rm -rf` -> `Remove-Item -Recurse -Force`
- `cp` -> `Copy-Item`
- `mv` -> `Move-Item`
