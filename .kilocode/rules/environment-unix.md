# Environment: Linux/macOS (Unix shell)

Используйте эти договорённости, когда команда выполняется в Unix среде (Linux/macOS) и предполагается `bash`/`zsh`.

## Command Style

- Предпочитайте POSIX-совместимый `bash` синтаксис.
- Пути: `/path/to/file` (forward slashes), пробелы — всегда в кавычках.
- Если команда заметно отличается на разных ОС — сначала давайте универсальный вариант, затем отдельные блоки "Linux" / "macOS".

## Shell Conventions (bash/zsh)

- Env vars: `export NAME="value"` (или `NAME=value command`)
- CI mode: `CI=true command`
- Chain commands: `&&` / `||` (явно), а для скриптов: `set -euo pipefail`
- Exit code: `echo $?` (в интерактиве), в скриптах используйте `set -e`

## PowerShell scripts on Unix

WorkFlowAI содержит `.ps1` скрипты. На Unix запускайте их через PowerShell 7 (`pwsh`):

```bash
pwsh -File scripts/workflowai-doctor.ps1 -ProjectPath .
pwsh -File scripts/workflowai-init-project.ps1 -ProjectPath .
```

## Common Equivalents (bash <-> PowerShell)

- `ls` <-> `Get-ChildItem`
- `cat file` <-> `Get-Content file`
- `rm -rf dir` <-> `Remove-Item -Recurse -Force dir`
- `cp a b` <-> `Copy-Item a b`
- `mv a b` <-> `Move-Item a b`
