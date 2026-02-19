[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath,

  [string]$ConfigPath = "./scripts/workflowai-quality-gates.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Resolve-PathRelativeToProject {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedProjectPath,
    [Parameter(Mandatory = $true)][string]$Path
  )

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return (Resolve-Path -LiteralPath $Path).Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $ResolvedProjectPath $Path)).Path
}

function Expand-HomePlaceholders {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return $null
  }

  $homeDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
  $out = $Value

  # Support common home placeholders to avoid OS-specific configs.
  $out = $out -replace '^~(?=[/\\]|$)', $homeDir
  $out = $out -replace '\$\{HOME\}', $homeDir
  $out = $out -replace '\$HOME(?=[/\\]|$)', $homeDir
  $out = $out -replace '%USERPROFILE%', $homeDir

  return $out
}

function Resolve-StepCommand {
  param([Parameter(Mandatory = $true)][string]$Command)

  $resolved = Expand-HomePlaceholders -Value $Command

  # Cross-platform convenience:
  # - GitHub-hosted runners have `pwsh`.
  # - Some Windows environments have only `powershell`.
  if ($resolved -in @('pwsh', 'pwsh.exe')) {
    if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
      if (Get-Command powershell -ErrorAction SilentlyContinue) {
        return 'powershell'
      }
    }
  }

  if ($resolved -in @('powershell', 'powershell.exe')) {
    if (-not (Get-Command powershell -ErrorAction SilentlyContinue)) {
      if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        return 'pwsh'
      }
    }
  }

  return $resolved
}

$resolvedProjectPath = Resolve-ExistingPath -Path $ProjectPath -Purpose 'ProjectPath'
$resolvedConfigPath = Resolve-PathRelativeToProject -ResolvedProjectPath $resolvedProjectPath -Path $ConfigPath

$configRaw = Get-Content -LiteralPath $resolvedConfigPath -Raw -Encoding utf8

try {
  # ConvertFrom-Json in Windows PowerShell 5.1 does not support -Depth.
  $config = $configRaw | ConvertFrom-Json
} catch {
  throw "Invalid JSON in config: $resolvedConfigPath. $($_.Exception.Message)"
}

if ($null -eq $config.version -or $config.version -ne 1) {
  throw "Unsupported config version: '$($config.version)'. Expected: 1"
}

$steps = @($config.steps)
if ($steps.Count -lt 1) {
  throw 'Config has no steps (steps[] is empty)'
}

$exitCode = 0

Push-Location -LiteralPath $resolvedProjectPath
try {
  $i = 0
  foreach ($step in $steps) {
    $i++

    $stepName = [string]$step.name
    $stepCommand = [string]$step.command

    if ([string]::IsNullOrWhiteSpace($stepName)) {
      throw "Invalid step #${i}: missing 'name'"
    }
    if ([string]::IsNullOrWhiteSpace($stepCommand)) {
      throw "Invalid step '$stepName': missing 'command'"
    }

    $args = @()
    if ($null -ne $step.args) {
      if ($step.args -is [string]) {
        throw "Invalid step '$stepName': 'args' must be an array"
      }
      if (-not ($step.args -is [System.Array])) {
        throw "Invalid step '$stepName': 'args' must be an array"
      }

      foreach ($arg in @($step.args)) {
        if ($null -eq $arg) {
          throw "Invalid step '$stepName': args contains null"
        }
        $args += (Expand-HomePlaceholders -Value ([string]$arg))
      }
    }

    $cmd = Resolve-StepCommand -Command $stepCommand

    Write-Host "==> [$i/$($steps.Count)] $stepName"
    $global:LASTEXITCODE = 0

    try {
      & $cmd @args
    } catch {
      $exitCode = 1
      Write-Error -ErrorAction Continue "Step '$stepName' threw: $($_.Exception.Message)"
      break
    }

    if ($LASTEXITCODE -ne 0) {
      $exitCode = $LASTEXITCODE
      Write-Error -ErrorAction Continue "Step '$stepName' failed with exit code $exitCode"
      break
    }
  }
} finally {
  Pop-Location
}

exit $exitCode
