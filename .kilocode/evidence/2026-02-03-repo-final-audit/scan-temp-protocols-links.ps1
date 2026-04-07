param(
  [Parameter(Mandatory = $false)][string]$Root = ".",
  [Parameter(Mandatory = $false)][string]$OutMd = ".kilocode/evidence/2026-02-03-repo-final-audit/temp-protocols-links.md",
  [Parameter(Mandatory = $false)][string]$OutJson = ".kilocode/evidence/2026-02-03-repo-final-audit/temp-protocols-links.json",
  [Parameter(Mandatory = $false)][string[]]$ExcludeDirNames = @(".git", "node_modules", "temp")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-Utf8NoBomEncoding {
  return New-Object System.Text.UTF8Encoding($false)
}

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $full = [System.IO.Path]::GetFullPath($Path)
  $dir = [System.IO.Path]::GetDirectoryName($full)
  if (-not [System.IO.Directory]::Exists($dir)) {
    [System.IO.Directory]::CreateDirectory($dir) | Out-Null
  }

  [System.IO.File]::WriteAllText($full, $Content, (New-Utf8NoBomEncoding))
}

function Normalize-PathSeparators {
  param([Parameter(Mandatory = $true)][string]$Path)
  return ($Path -replace '/', '\\')
}

function Is-Excluded {
  param(
    [Parameter(Mandatory = $true)][string]$FullPath,
    [Parameter(Mandatory = $true)][string[]]$ExcludeNames
  )

  $p = Normalize-PathSeparators $FullPath
  foreach ($name in $ExcludeNames) {
    $n = ([string]$name).Trim()
    if ($n -eq "") { continue }

    # match directory segment
    $pattern = "(^|\\\\)" + [regex]::Escape($n) + "(\\\\|$)"
    if ($p -match $pattern) { return $true }
  }
  return $false
}

function Get-TextBestEffort {
  param([Parameter(Mandatory = $true)][string]$FilePath)

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
  try {
    return $utf8Strict.GetString($bytes)
  }
  catch {
    try {
      return [System.Text.Encoding]::Default.GetString($bytes)
    }
    catch {
      return $null
    }
  }
}

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$RootFull,
    [Parameter(Mandatory = $true)][string]$FullPath
  )

  # PowerShell 5.1 / .NET Framework compatibility:
  # [System.IO.Path]::GetRelativePath is not available.
  if ($FullPath.StartsWith($RootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $FullPath.Substring($RootFull.Length)
    # Trim leading path separators (PowerShell 5.1-friendly)
    $rel = ($rel -replace '^[\\/]+', '')
    return $rel
  }

  return $FullPath
}

function Parse-LinkTarget {
  param([Parameter(Mandatory = $true)][string]$Raw)

  $t = $Raw.Trim()

  if ($t.StartsWith("<") -and $t.Contains(">")) {
    $end = $t.IndexOf(">")
    $url = $t.Substring(1, $end - 1)
    $rest = $t.Substring($end + 1).Trim()
    return @{ Url = $url; Rest = $rest; HasWhitespace = ($rest -ne "") }
  }

  $m = [regex]::Match($t, '^\s*(\S+)(\s+.+)?$')
  if ($m.Success) {
    $url = $m.Groups[1].Value
    $rest = $m.Groups[2].Value.Trim()
    return @{ Url = $url; Rest = $rest; HasWhitespace = ($rest -ne "") }
  }

  return @{ Url = $t; Rest = ""; HasWhitespace = $false }
}

function Strip-LineSuffix {
  param([Parameter(Mandatory = $true)][string]$PathLike)

  # KiloCode / VSCode convention: "path/to/file.ext:123" (line reference)
  $m = [regex]::Match($PathLike, '^(.*):(\d+)$')
  if ($m.Success) { return $m.Groups[1].Value }
  return $PathLike
}

function Is-ExternalUrl {
  param([Parameter(Mandatory = $true)][string]$Url)

  $u = Strip-LineSuffix $Url
  if ($u -match '^[a-zA-Z][a-zA-Z0-9+\-.]*:') { return $true }
  if ($u.StartsWith("//")) { return $true }
  return $false
}

function Normalize-ForPrefixCheck {
  param([Parameter(Mandatory = $true)][string]$Url)

  $u = $Url

  $qIndex = $u.IndexOf("?")
  if ($qIndex -ge 0) { $u = $u.Substring(0, $qIndex) }

  $hashIndex = $u.IndexOf("#")
  if ($hashIndex -ge 0) { $u = $u.Substring(0, $hashIndex) }

  $u = Strip-LineSuffix $u

  try {
    $u = [System.Uri]::UnescapeDataString($u)
  }
  catch {
    # keep raw
  }

  $u = ($u -replace '\\', '/')
  $u = $u.Trim()

  while ($u.StartsWith("./")) { $u = $u.Substring(2) }
  while ($u.StartsWith("../")) { $u = $u.Substring(3) }
  while ($u.StartsWith("/")) { $u = $u.TrimStart("/") }

  return $u
}

function Get-PrefixMatch {
  param([Parameter(Mandatory = $true)][string]$Normalized)

  if ($Normalized -eq "") { return "" }
  if ($Normalized -eq "temp" -or $Normalized.StartsWith("temp/")) { return "temp" }
  if ($Normalized -eq ".protocols" -or $Normalized.StartsWith(".protocols/")) { return ".protocols" }
  return ""
}

$rootFull = (Resolve-Path -LiteralPath $Root).Path

$mdFiles = Get-ChildItem -LiteralPath $rootFull -Recurse -File -Filter *.md |
  Where-Object { -not (Is-Excluded $_.FullName $ExcludeDirNames) }

$mdFilesCount = @($mdFiles).Count

$findings = New-Object System.Collections.Generic.List[object]
$unreadable = New-Object System.Collections.Generic.List[object]

foreach ($file in $mdFiles) {
  $text = Get-TextBestEffort $file.FullName
  if ($null -eq $text) {
    $unreadable.Add([pscustomobject]@{ Source = $file.FullName })
    continue
  }

  $lines = $text -split "`r?`n", -1
  $inFence = $false

  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]

    if ($line -match '^\s*```' -or $line -match '^\s*~~~') {
      $inFence = -not $inFence
      continue
    }
    if ($inFence) { continue }

    # reference definitions: [label]: target
    $refDefMatches = [regex]::Matches($line, '^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)(?:\s+"[^"]*")?\s*$')
    foreach ($m in $refDefMatches) {
      $rawTarget = $m.Groups[1].Value
      $parsed = Parse-LinkTarget $rawTarget
      $url = $parsed.Url
      if (Is-ExternalUrl $url) { continue }
      if ($url.StartsWith("#")) { continue }

      $norm = Normalize-ForPrefixCheck $url
      $prefix = Get-PrefixMatch $norm
      if ($prefix -eq "") { continue }

      $rel = Get-RelativePath -RootFull $rootFull -FullPath $file.FullName
      $findings.Add([pscustomobject]@{
          Source = $rel
          Line = ($i + 1)
          Kind = "ref"
          Prefix = $prefix
          Target = $rawTarget
          Normalized = $norm
        })
    }

    # image links: ![alt](target)
    $imgMatches = [regex]::Matches($line, '!\[[^\]]*\]\(([^)]+)\)')
    foreach ($m in $imgMatches) {
      $rawTarget = $m.Groups[1].Value
      $parsed = Parse-LinkTarget $rawTarget
      $url = $parsed.Url
      if (Is-ExternalUrl $url) { continue }
      if ($url.StartsWith("#")) { continue }

      $norm = Normalize-ForPrefixCheck $url
      $prefix = Get-PrefixMatch $norm
      if ($prefix -eq "") { continue }

      $rel = Get-RelativePath -RootFull $rootFull -FullPath $file.FullName
      $findings.Add([pscustomobject]@{
          Source = $rel
          Line = ($i + 1)
          Kind = "image"
          Prefix = $prefix
          Target = $rawTarget
          Normalized = $norm
        })
    }

    # inline links: [text](target) (excluding images)
    $linkMatches = [regex]::Matches($line, '(?<!\!)\[[^\]]+\]\(([^)]+)\)')
    foreach ($m in $linkMatches) {
      $rawTarget = $m.Groups[1].Value
      $parsed = Parse-LinkTarget $rawTarget
      $url = $parsed.Url
      if (Is-ExternalUrl $url) { continue }
      if ($url.StartsWith("#")) { continue }

      $norm = Normalize-ForPrefixCheck $url
      $prefix = Get-PrefixMatch $norm
      if ($prefix -eq "") { continue }

      $rel = Get-RelativePath -RootFull $rootFull -FullPath $file.FullName
      $findings.Add([pscustomobject]@{
          Source = $rel
          Line = ($i + 1)
          Kind = "link"
          Prefix = $prefix
          Target = $rawTarget
          Normalized = $norm
        })
    }
  }
}

$now = (Get-Date).ToUniversalTime().ToString("s") + "Z"

$total = $findings.Count

function Is-InProtocolsDir {
  param([Parameter(Mandatory = $true)][string]$RelativePath)
  $p = ($RelativePath -replace '\\', '/')
  return $p.StartsWith('.protocols/')
}

$outsideProtocols = @($findings | Where-Object { -not (Is-InProtocolsDir $_.Source) }).Count
$outsideProtocolsTemp = @($findings | Where-Object { $_.Prefix -eq 'temp' -and -not (Is-InProtocolsDir $_.Source) }).Count
$outsideProtocolsProtocols = @($findings | Where-Object { $_.Prefix -eq '.protocols' -and -not (Is-InProtocolsDir $_.Source) }).Count

$insideProtocols = @($findings | Where-Object { Is-InProtocolsDir $_.Source }).Count
$insideProtocolsTemp = @($findings | Where-Object { $_.Prefix -eq 'temp' -and (Is-InProtocolsDir $_.Source) }).Count
$insideProtocolsProtocols = @($findings | Where-Object { $_.Prefix -eq '.protocols' -and (Is-InProtocolsDir $_.Source) }).Count

function Escape-MarkdownTableCell {
  param([Parameter(Mandatory = $false)][string]$Value)

  if ($null -eq $Value) { return "" }
  $v = $Value -replace "\r?\n", " "
  $v = $v -replace '\|', '\\|'
  return $v
}

$md = New-Object System.Collections.Generic.List[string]
$md.Add('# Check: Markdown link targets to `temp/` and `.protocols/` (excluding code fences)')
$md.Add("")
$md.Add("- Time (UTC): $now")
$md.Add("- Root: $rootFull")
$md.Add("- Excluded dirs: " + ($ExcludeDirNames -join ", "))
$md.Add("- Files scanned (md): $mdFilesCount")
$md.Add("- Unreadable files (decode failed): $($unreadable.Count)")
$md.Add("")

$md.Add("## Summary")
$md.Add("")
$md.Add("| Metric | Value |")
$md.Add("|---|---:|")
$md.Add("| Total matches (all scopes) | $total |")
$md.Add("| Matches outside .protocols/ (SoT risk) | $outsideProtocols |")
$md.Add("| Matches outside .protocols/ -> temp/ | $outsideProtocolsTemp |")
$md.Add("| Matches outside .protocols/ -> .protocols/ | $outsideProtocolsProtocols |")
$md.Add("| Matches inside .protocols/ (protocol artifacts) | $insideProtocols |")
$md.Add("| Matches inside .protocols/ -> temp/ | $insideProtocolsTemp |")
$md.Add("| Matches inside .protocols/ -> .protocols/ | $insideProtocolsProtocols |")
$md.Add("")

$md.Add("## Matches outside .protocols/ (SoT risk)")
$md.Add("")
$outside = $findings | Where-Object { -not (Is-InProtocolsDir $_.Source) }
if (@($outside).Count -eq 0) {
  $md.Add('_No link targets to `temp/` or `.protocols/` detected outside `.protocols/`._')
}
else {
  $md.Add("| Source | Line | Kind | Prefix | Target |")
  $md.Add("|---|---:|---|---|---|")
  foreach ($it in $outside) {
    $src = Escape-MarkdownTableCell $it.Source
    $t = Escape-MarkdownTableCell $it.Target
    $md.Add("| $src | $($it.Line) | $($it.Kind) | $($it.Prefix) | $t |")
  }
}

$md.Add("")
$md.Add("## Matches inside .protocols/ (protocol artifacts)")
$md.Add("")
$inside = $findings | Where-Object { Is-InProtocolsDir $_.Source }
if (@($inside).Count -eq 0) {
  $md.Add('_No link targets to `temp/` or `.protocols/` detected inside `.protocols/`._')
}
else {
  $md.Add("| Source | Line | Kind | Prefix | Target |")
  $md.Add("|---|---:|---|---|---|")
  foreach ($it in $inside) {
    $src = Escape-MarkdownTableCell $it.Source
    $t = Escape-MarkdownTableCell $it.Target
    $md.Add("| $src | $($it.Line) | $($it.Kind) | $($it.Prefix) | $t |")
  }
}

$contentMd = ($md -join "`n") + "`n"
Write-Utf8NoBomFile -Path $OutMd -Content $contentMd

try {
  $jsonObj = [pscustomobject]@{
    time = $now
    root = $rootFull
    excludedDirs = $ExcludeDirNames
    stats = [pscustomobject]@{
      scannedMdFiles = $mdFilesCount
      unreadableFiles = $unreadable.Count
      totalMatches = $total
      matchesOutsideProtocols = $outsideProtocols
      matchesOutsideProtocolsTemp = $outsideProtocolsTemp
      matchesOutsideProtocolsProtocols = $outsideProtocolsProtocols
      matchesInsideProtocols = $insideProtocols
      matchesInsideProtocolsTemp = $insideProtocolsTemp
      matchesInsideProtocolsProtocols = $insideProtocolsProtocols
    }
    matches = $findings
    unreadable = $unreadable
  }
  $json = $jsonObj | ConvertTo-Json -Depth 6
  Write-Utf8NoBomFile -Path $OutJson -Content ($json + "`n")
}
catch {
  # ignore json errors
}

Write-Host "OK: wrote $OutMd"
Write-Host "OK: wrote $OutJson"
Write-Host "Matches outside .protocols: $outsideProtocols"
exit 0
