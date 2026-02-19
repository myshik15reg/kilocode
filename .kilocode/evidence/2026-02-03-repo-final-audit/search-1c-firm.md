# Search: `1c-firm`

Time (UTC): 2026-02-03T10:27:58Z

Goal: validate that the legacy prefix `1c-firm` is absent:

- in file contents;
- in file/directory names.

> Note: the content scan excludes `.git/`, `node_modules/`, `temp/` and common binary extensions.

---

## 1) Content scan

Command (PowerShell):

```powershell
$excludeDirRegex = '\\(\\.git|node_modules|temp)\\'
$excludeExt = @(
  '.docx', '.pdf',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
  '.zip', '.7z', '.tar', '.gz', '.rar',
  '.exe', '.dll'
)

$paths = Get-ChildItem -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch $excludeDirRegex -and
    -not ($excludeExt -contains $_.Extension.ToLowerInvariant())
  } |
  Select-Object -ExpandProperty FullName

Select-String -Path $paths -Pattern '1c-firm' -SimpleMatch
```

Result:

- Matches: **0**

---

## 2) Path/name scan

Command (PowerShell):

```powershell
Get-ChildItem -Recurse -Force |
  Where-Object { $_.FullName -match '1c-firm' } |
  Select-Object -ExpandProperty FullName
```

Result:

- Matches: **0**
