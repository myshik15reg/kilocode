# Environment: Windows + PowerShell (SoT)

Назначение: зафиксировать минимальные договорённости для копируемых команд и корректной работы с UTF-8.

## Command style

| Topic | Rule |
|---|---|
| Shell | PowerShell SHOULD быть основным примером для Windows |
| Paths | Windows-пути SHOULD быть в кавычках при пробелах |
| Command chaining | `;` SHOULD использоваться вместо `&&` для совместимости |

## UTF-8 setup (recommended)

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
$PSDefaultParameterValues['Add-Content:Encoding'] = 'utf8'
$PSDefaultParameterValues['Get-Content:Encoding'] = 'utf8'
```

## Home path note

1. В PowerShell `~` внутри строк MAY не разворачиваться.
2. Для copy-paste путей SHOULD использоваться `$HOME/...`.

