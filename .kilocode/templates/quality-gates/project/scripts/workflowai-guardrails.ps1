[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath,

  [switch]$CheckKiloCodeChangeMarkers
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$excludeDirs = @(
  '.git',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  'dist',
  'build',
  'target',
  'bin',
  'obj'
)

function New-ExcludeRegex {
  param(
    [Parameter(Mandatory = $true)][string[]]$ExcludeDirs
  )

  $excludePart = ($ExcludeDirs | ForEach-Object { [Regex]::Escape($_) }) -join '|'
  return "[\\/](?:$excludePart)[\\/]"
}

$excludeRegexForFsScan = New-ExcludeRegex -ExcludeDirs $excludeDirs

function Find-ForbiddenBinaryDocs {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedProjectPath,
    [Parameter(Mandatory = $true)][string]$ExcludeRegex
  )

  $files = @(
    Get-ChildItem -LiteralPath $ResolvedProjectPath -Recurse -File -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch $ExcludeRegex } |
      Where-Object {
        $ext = $_.Extension
        if ([string]::IsNullOrWhiteSpace($ext)) {
          return $false
        }

        $ext = $ext.ToLowerInvariant()
        return ($ext -eq '.doc' -or $ext -eq '.docx')
      } |
      ForEach-Object { $_.FullName }
  )

  return $files
}

function Resolve-ExistingPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Purpose
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "$Purpose is empty"
  }

  try {
    return (Resolve-Path -LiteralPath $Path).Path
  } catch {
    throw "$Purpose does not exist: $Path"
  }
}

function Get-RepoFiles {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedProjectPath
  )

  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($null -ne $git) {
    try {
      $gitRoot = & git rev-parse --show-toplevel 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($gitRoot)) {
        $gitRoot = $gitRoot.Trim()

        $tracked = & git ls-files
        if ($LASTEXITCODE -eq 0) {
          $comparison = [System.StringComparison]::Ordinal
          if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
            $comparison = [System.StringComparison]::OrdinalIgnoreCase
          }

          $projectRootNormalized = (Resolve-Path -LiteralPath $ResolvedProjectPath).Path
          $projectRootWithSep = $projectRootNormalized.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

          $result = @()
          foreach ($rel in @($tracked)) {
            if ([string]::IsNullOrWhiteSpace($rel)) {
              continue
            }

            $relNormalized = $rel
            if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
              $relNormalized = $relNormalized -replace '/', [System.IO.Path]::DirectorySeparatorChar
            }

            $full = Join-Path $gitRoot $relNormalized
            if (-not (Test-Path -LiteralPath $full)) {
              continue
            }

            $fullResolved = (Resolve-Path -LiteralPath $full).Path
            if ($fullResolved.StartsWith($projectRootWithSep, $comparison) -or ($fullResolved -eq $projectRootNormalized)) {
              $result += $fullResolved
            }
          }

          if ($result.Count -gt 0) {
            return $result
          }
        }
      }
    } catch {
      # Fallback to filesystem scan.
    }
  }

  $excludeRegex = $excludeRegexForFsScan

  return @(
    Get-ChildItem -LiteralPath $ResolvedProjectPath -Recurse -File -Force |
      Where-Object { $_.FullName -notmatch $excludeRegex } |
      ForEach-Object { $_.FullName }
  )
}

$resolvedProjectPath = Resolve-ExistingPath -Path $ProjectPath -Purpose 'ProjectPath'
$selfPath = (Resolve-Path -LiteralPath $PSCommandPath).Path

$forbiddenDocs = @(Find-ForbiddenBinaryDocs -ResolvedProjectPath $resolvedProjectPath -ExcludeRegex $excludeRegexForFsScan)
if ($forbiddenDocs.Count -gt 0) {
  Write-Host 'Guardrails: forbidden binary .doc/.docx files detected. Policy: keep knowledge in Markdown (.md) only.'
  foreach ($p in $forbiddenDocs) {
    Write-Host ("- {0}" -f $p)
  }
  exit 1
}

$allowedExtensions = @(
  '.c', '.cpp', '.cs', '.go', '.h', '.hpp', '.java', '.js', '.jsx', '.kt', '.ps1', '.psm1', '.py', '.rs', '.sh', '.ts', '.tsx',
  '.json', '.toml', '.xml', '.yml', '.yaml'
)

Push-Location -LiteralPath $resolvedProjectPath
try {
  $repoFiles = Get-RepoFiles -ResolvedProjectPath $resolvedProjectPath
  $filesToScan = @()

  foreach ($f in $repoFiles) {
    $full = [string]$f
    if ([string]::IsNullOrWhiteSpace($full)) {
      continue
    }

    $fullResolved = (Resolve-Path -LiteralPath $full).Path
    if ($fullResolved -eq $selfPath) {
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullResolved).ToLowerInvariant()
    if ($allowedExtensions -contains $ext) {
      if (Test-Path -LiteralPath $fullResolved) {
        $filesToScan += $fullResolved
      }
    }
  }

  if ($filesToScan.Count -eq 0) {
    Write-Host 'Guardrails: no matching files to scan (OK)'
    exit 0
  }

  $failed = $false

  # 1) TODO must have a ticket: TODO(#123)
  $todoMatches = @(Select-String -Path $filesToScan -Pattern '\bTODO\b' -AllMatches -ErrorAction SilentlyContinue)
  $badTodos = @($todoMatches | Where-Object { $_.Line -notmatch 'TODO\(#\d+\)' })
  if ($badTodos.Count -gt 0) {
    $failed = $true
    Write-Host "Guardrails: found TODO without ticket. Use TODO(#123):"
    foreach ($m in $badTodos) {
      Write-Host ("{0}:{1}: {2}" -f $m.Path, $m.LineNumber, $m.Line.TrimEnd())
    }
  }

  # 2) Lint/typing disables are forbidden
  $disableTokens = @(
    'eslint-disable',
    '@ts-ignore',
    '@ts-nocheck',
    'tslint:disable',
    '# noqa',
    'pylint: disable',
    'nolint',
    'noinspection'
  )

  $disableMatches = @(Select-String -Path $filesToScan -SimpleMatch -Pattern $disableTokens -ErrorAction SilentlyContinue)
  if ($disableMatches.Count -gt 0) {
    $failed = $true
    Write-Host 'Guardrails: found lint/typing disables (forbidden):'
    foreach ($m in $disableMatches) {
      Write-Host ("{0}:{1}: {2}" -f $m.Path, $m.LineNumber, $m.Line.TrimEnd())
    }
  }

  # 3) Optional: validate marker format (does NOT enforce presence)
  if ($CheckKiloCodeChangeMarkers) {
    $markerMatches = @(Select-String -Path $filesToScan -SimpleMatch -Pattern 'kilocode_change:' -ErrorAction SilentlyContinue)
    foreach ($m in $markerMatches) {
      if ($m.Line -notmatch 'kilocode_change:\s*\[\d{4}-\d{2}-\d{2}\]') {
        $failed = $true
        Write-Host 'Guardrails: invalid kilocode_change marker format. Expected: kilocode_change: [YYYY-MM-DD] ...'
        Write-Host ("{0}:{1}: {2}" -f $m.Path, $m.LineNumber, $m.Line.TrimEnd())
      }
    }
  }

  if ($failed) {
    exit 1
  }

  Write-Host 'Guardrails: OK'
  exit 0
} finally {
  Pop-Location
}
