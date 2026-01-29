$cwd = "D:\AlfaCode assistans"

function Get-SingleQuotedValue([string]$block, [string]$key) {
    $marker = "$($key): '"
    $idx = $block.IndexOf($marker)
    if ($idx -lt 0) { return "" }
    $i = $idx + $marker.Length
    $sb = New-Object System.Text.StringBuilder
    while ($i -lt $block.Length) {
        $ch = $block[$i]
        if ($ch -eq "'") {
            if ($i + 1 -lt $block.Length -and $block[$i + 1] -eq "'") {
                [void]$sb.Append("'")
                $i += 2
                continue
            }
            break
        }
        [void]$sb.Append($ch)
        $i++
    }
    return $sb.ToString()
}

function Get-BlockScalarValue([string[]]$lines, [int]$startIndex) {
    # Assumes line at startIndex is like "  customInstructions: |" or ">"
    $sb = New-Object System.Text.StringBuilder
    for ($i = $startIndex + 1; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s{2}[a-zA-Z_]') { break }
        # strip 4 spaces if present
        $text = $line
        if ($text.StartsWith('    ')) { $text = $text.Substring(4) }
        [void]$sb.Append($text)
        if ($i -lt $lines.Length - 1) { [void]$sb.Append("`n") }
    }
    return $sb.ToString().TrimEnd("`n")
}

function Parse-CustomModes([string]$raw) {
    $modes = @()
    $regex = [regex]'(?ms)(^|\n)- slug: ([^\n]+)(.*?)(?=\n- slug:|\z)'
    foreach ($m in $regex.Matches($raw)) {
        $slug = $m.Groups[2].Value.Trim()
        $block = $m.Groups[3].Value
        $name = ([regex]::Match($block, '(?m)^\s{2}name:\s*(.*)$')).Groups[1].Value.Trim()
        $role = ([regex]::Match($block, '(?m)^\s{2}roleDefinition:\s*(.*)$')).Groups[1].Value.Trim()
        $when = ([regex]::Match($block, '(?m)^\s{2}whenToUse:\s*(.*)$')).Groups[1].Value.Trim()
        $desc = ([regex]::Match($block, '(?m)^\s{2}description:\s*(.*)$')).Groups[1].Value.Trim()

        $customInstructions = ""
        $lines = $block -split "`r?`n"
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match '^\s{2}customInstructions:\s*\|') {
                $customInstructions = Get-BlockScalarValue $lines $i
                break
            }
            if ($lines[$i] -match '^\s{2}customInstructions:\s*') {
                $customInstructions = Get-SingleQuotedValue $block 'customInstructions'
                break
            }
        }

        # parse groups
        $groups = @()
        $inGroups = $false
        foreach ($line in $lines) {
            if ($line -match '^\s{2}groups:\s*$') { $inGroups = $true; continue }
            if ($inGroups -and $line -match '^\s{2}[a-zA-Z_]') { $inGroups = $false }
            if (-not $inGroups) { continue }
            if ($line -match '^\s*-\s*(.+)$') {
                $entry = $Matches[1].Trim()
                if ($entry.StartsWith('[')) {
                    $inner = $entry.TrimStart('[').Trim()
                    $first = ($inner -split '[,\]]')[0].Trim()
                    $entry = $first
                }
                $entry = $entry.Trim('"', "'")
                if ($entry) { $groups += $entry }
            }
        }

        $modes += [pscustomobject]@{
            slug = $slug
            name = $(if ($name) { $name } else { $slug })
            roleDefinition = $role
            whenToUse = $when
            description = $desc
            groups = $groups
            customInstructions = $customInstructions
        }
    }
    return $modes
}

function Get-ToolGroups([string]$toolsFile) {
    $content = Get-Content -Raw $toolsFile
    $groups = @{}
    $groupRegex = [regex]'(?ms)(\w+):\s*\{\s*tools:\s*\[(.*?)\]\s*(?:,|\})'
    foreach ($m in $groupRegex.Matches($content)) {
        $group = $m.Groups[1].Value.Trim()
        $listRaw = $m.Groups[2].Value
        $tools = @()
        foreach ($toolMatch in [regex]::Matches($listRaw, '"([^"]+)"')) {
            $tools += $toolMatch.Groups[1].Value
        }
        $groups[$group] = $tools
    }

    $always = @()
    $alwaysMatch = [regex]::Match($content, '(?ms)ALWAYS_AVAILABLE_TOOLS[^\[]*\[(.*?)\]\s*as const')
    if ($alwaysMatch.Success) {
        foreach ($toolMatch in [regex]::Matches($alwaysMatch.Groups[1].Value, '"([^"]+)"')) {
            $always += $toolMatch.Groups[1].Value
        }
    }

    return @{ groups = $groups; always = $always }
}

function Extract-TemplateFromReturn([string]$content) {
    $returnIdx = $content.IndexOf('return')
    if ($returnIdx -lt 0) { return "" }
    $tickIdx = $content.IndexOf('`', $returnIdx)
    if ($tickIdx -lt 0) { return "" }

    $sb = New-Object System.Text.StringBuilder
    $i = $tickIdx + 1
    $bsBuffer = 0
    while ($i -lt $content.Length) {
        $ch = $content[$i]
        if ($ch -eq '\') {
            $bsBuffer++
            $i++
            continue
        }
        if ($ch -eq '`') {
            if (($bsBuffer % 2) -eq 1) {
                # escaped backtick: emit backslashes minus one, then backtick
                if ($bsBuffer -gt 1) { [void]$sb.Append('\', $bsBuffer - 1) }
                [void]$sb.Append('`')
                $bsBuffer = 0
                $i++
                continue
            }
            # unescaped backtick -> end of template literal
            if ($bsBuffer -gt 0) { [void]$sb.Append('\', $bsBuffer) }
            break
        }
        if ($bsBuffer -gt 0) {
            [void]$sb.Append('\', $bsBuffer)
            $bsBuffer = 0
        }
        [void]$sb.Append($ch)
        $i++
    }
    return $sb.ToString()
}

function Get-TemplateLength([string]$filePath, [hashtable]$replaceMap) {
    $content = Get-Content -Raw $filePath
    $tmpl = Extract-TemplateFromReturn $content
    if (-not $tmpl) { return 0 }

    foreach ($key in $replaceMap.Keys) {
        $value = [string]$replaceMap[$key]
        $tmpl = [regex]::Replace($tmpl, "\$\{[^}]*$key[^}]*\}", [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $value })
    }
    # remove remaining interpolations
    $tmpl = [regex]::Replace($tmpl, "\$\{[^}]*\}", "")
    return $tmpl.Length
}

$rawModes = Get-Content -Raw (Join-Path $cwd '.kilocodemodes')
$customModes = Parse-CustomModes $rawModes
$modeCount = $customModes.Count
$codeMode = $customModes | Where-Object { $_.slug -eq 'code' } | Select-Object -First 1

$agentsPath = Join-Path $cwd 'AGENTS.md'
$agentsContent = Get-Content -Raw $agentsPath

$memoryContextPath = Join-Path $cwd '.kilocode\memory-bank\context.md'
$memoryContext = if (Test-Path $memoryContextPath) { Get-Content -Raw $memoryContextPath } else { '' }
$memorySection = if ($memoryContext) {
@"
## Project Context (from .kilocode/memory-bank/context.md)
$memoryContext

[MB: OK] - Memory Bank loaded
"@
} else {
@"
## Project Context (Memory Bank)
[MB: NEW PROJECT] - No Memory Bank found for this workspace.

Initialize with: /init-memory-bank
"@
}

# AlfaCode workflow section length
$workflowFile = Join-Path $cwd 'src\core\prompts\sections\alfa-code-workflow.ts'
$workflowTemplate = Extract-TemplateFromReturn (Get-Content -Raw $workflowFile)
$workflowLen = if ($workflowTemplate) { $workflowTemplate.Length } else { 0 }

# Modes section length (approx): include desc for built-ins only (>20 modes)
$defaultModesFile = Join-Path $cwd 'packages\types\src\mode.ts'
$defaultModesContent = Get-Content -Raw $defaultModesFile
$builtInSlugs = [System.Collections.Generic.HashSet[string]]::new()
foreach ($m in [regex]::Matches($defaultModesContent, 'slug:\s*[''" ]([^''"]+)[''"]')) {
    $null = $builtInSlugs.Add($m.Groups[1].Value)
}

$builtIn = @($customModes | Where-Object { $builtInSlugs.Contains($_.slug) })
$customOnly = @($customModes | Where-Object { -not $builtInSlugs.Contains($_.slug) })
$orderedModes = $builtIn + $customOnly

$modeLines = foreach ($mode in $orderedModes) {
    if (-not $builtInSlugs.Contains($mode.slug)) {
        "  * `"$($mode.name)`" mode ($($mode.slug))"
    } else {
        $desc = if ($mode.whenToUse) { $mode.whenToUse } elseif ($mode.roleDefinition) { ($mode.roleDefinition -split '\.')[0] } else { '' }
        if ($desc) { "  * `"$($mode.name)`" mode ($($mode.slug)) - $desc" } else { "  * `"$($mode.name)`" mode ($($mode.slug))" }
    }
}
$modesSection = "====`n`nMODES`n`n- These are the currently available modes:`n" + ($modeLines -join "`n") + "`nIf the user asks you to create or edit a new mode for this project, you should read the instructions by using the fetch_instructions tool, like this:`n<fetch_instructions>`n<task>create_mode</task>`n</fetch_instructions>`n"

# Tool descriptions approx
$toolsInfo = Get-ToolGroups (Join-Path $cwd 'src\shared\tools.ts')
$groupsMap = $toolsInfo.groups
$alwaysTools = $toolsInfo.always
$modeGroups = $codeMode.groups

$toolsSet = [System.Collections.Generic.HashSet[string]]::new()
foreach ($g in $modeGroups) {
    if ($groupsMap.ContainsKey($g)) {
        foreach ($t in $groupsMap[$g]) { $null = $toolsSet.Add($t) }
    }
}
foreach ($t in $alwaysTools) { $null = $toolsSet.Add($t) }

# apply defaults: disable codebase_search, run_slash_command, generate_image
$null = $toolsSet.Remove('codebase_search')
$null = $toolsSet.Remove('run_slash_command')
$null = $toolsSet.Remove('generate_image')

$toolFiles = @{
    execute_command = 'src\core\prompts\tools\execute-command.ts'
    read_file = 'src\core\prompts\tools\read-file.ts'
    fetch_instructions = 'src\core\prompts\tools\fetch-instructions.ts'
    write_to_file = 'src\core\prompts\tools\write-to-file.ts'
    search_files = 'src\core\prompts\tools\search-files.ts'
    list_files = 'src\core\prompts\tools\list-files.ts'
    browser_action = 'src\core\prompts\tools\browser-action.ts'
    ask_followup_question = 'src\core\prompts\tools\ask-followup-question.ts'
    attempt_completion = 'src\core\prompts\tools\attempt-completion.ts'
    use_mcp_tool = 'src\core\prompts\tools\use-mcp-tool.ts'
    access_mcp_resource = 'src\core\prompts\tools\access-mcp-resource.ts'
    switch_mode = 'src\core\prompts\tools\switch-mode.ts'
    new_task = 'src\core\prompts\tools\new-task.ts'
    codebase_search = 'src\core\prompts\tools\codebase-search.ts'
    update_todo_list = 'src\core\prompts\tools\update-todo-list.ts'
    run_slash_command = 'src\core\prompts\tools\run-slash-command.ts'
    generate_image = 'src\core\prompts\tools\generate-image.ts'
    delete_file = 'src\core\prompts\tools\delete-file.ts'
    apply_diff = ''
}

# approximate apply_diff by length of diff strategy description (static text in TS file)
$diffFile = Join-Path $cwd 'src\core\diff\strategies\multi-search-replace.ts'
$diffContent = Get-Content -Raw $diffFile
$diffTemplate = Extract-TemplateFromReturn $diffContent
$applyDiffLen = if ($diffTemplate) { ([regex]::Replace($diffTemplate, '\$\{[^}]*\}', '')).Length } else { 0 }

$toolLengths = @{}
$totalToolsLen = 0
foreach ($tool in $toolsSet) {
    if ($tool -eq 'apply_diff') {
        $len = $applyDiffLen
    } elseif ($toolFiles.ContainsKey($tool)) {
        $filePath = Join-Path $cwd $toolFiles[$tool]
        $replaceMap = @{ 'args.cwd' = $cwd }
        $len = Get-TemplateLength $filePath $replaceMap
    } else {
        $len = 0
    }
    $toolLengths[$tool] = $len
    $totalToolsLen += $len
}

Write-Host "=== Prompt component sizes (approx chars) ==="
Write-Host "Modes in .kilocodemodes: $modeCount"
Write-Host "Code mode roleDefinition length: $($codeMode.roleDefinition.Length)"
Write-Host "Code mode customInstructions length: $($codeMode.customInstructions.Length)"
Write-Host "AGENTS.md length: $($agentsContent.Length)"
Write-Host "Memory Bank context length: $($memoryContext.Length)"
Write-Host "Memory Bank section length: $($memorySection.Length)"
Write-Host "AlfaCode workflow section length: $workflowLen"
Write-Host "Modes section length: $($modesSection.Length)"
Write-Host "Tools catalog length (approx): $totalToolsLen"
Write-Host "Workflow snippet (first 120 chars): $($workflowTemplate.Substring(0,[Math]::Min(120,$workflowTemplate.Length)))"
if ($workflowTemplate.Length -gt 0) {
    $tailStart = [Math]::Max(0, $workflowTemplate.Length - 120)
    Write-Host "Workflow tail (last 120 chars): $($workflowTemplate.Substring($tailStart))"
}
Write-Host ""
Write-Host "Top tool description lengths (approx):"
$toolLengths.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 8 | ForEach-Object {
    Write-Host ("{0,-18} {1,6}" -f $_.Key, $_.Value)
}

Write-Host ""
Write-Host "Optional tool description lengths (approx):"
$optionalList = @('browser_action','codebase_search','generate_image','run_slash_command')
foreach ($opt in $optionalList) {
    if ($toolFiles.ContainsKey($opt)) {
        $len = Get-TemplateLength (Join-Path $cwd $toolFiles[$opt]) @{ 'args.cwd' = $cwd }
        Write-Host ("{0,-18} {1,6}" -f $opt, $len)
    }
}

Write-Host ""
Write-Host "Other section lengths (approx):"
$sectionFiles = @{
    markdown = 'src\core\prompts\sections\markdown-formatting.ts'
    objective = 'src\core\prompts\sections\objective.ts'
    capabilities = 'src\core\prompts\sections\capabilities.ts'
    rules = 'src\core\prompts\sections\rules.ts'
    systemInfo = 'src\core\prompts\sections\system-info.ts'
}
foreach ($key in $sectionFiles.Keys) {
    $len = Get-TemplateLength (Join-Path $cwd $sectionFiles[$key]) @{ 'cwd' = $cwd }
    Write-Host ("{0,-18} {1,6}" -f $key, $len)
}
