# Environment: Linux/macOS (Unix shell)

Назначение: договорённости для примеров команд в Unix окружении.

## Command style

| Topic | Rule |
|---|---|
| Shell | POSIX-compatible `bash`/`zsh` SHOULD использоваться |
| Paths | `/path/to/file` SHOULD использоваться; пробелы MUST быть в кавычках |
| Chain | `&&` SHOULD использоваться явно |

## PowerShell scripts on Unix

PowerShell `.ps1` на Unix MUST запускаться через PowerShell 7 (`pwsh`). Пути и сценарии: [`scripts-entrypoints.md`](../workflows/scripts-entrypoints.md:1).

