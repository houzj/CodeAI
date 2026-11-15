[CmdletBinding()]
param(
    [string[]]$Path = @('packages/app/src','packages/desktop/src','packages/desktop/resources'),
    [string]$Pattern = '(?i)(OpenCode|open code|opencode\.ai|opencode://|OpenCodeLogo|opencode-logo)'
)

$ErrorActionPreference = 'Stop'
$files = @($Path | ForEach-Object {
    if (Test-Path $_) {
        Get-ChildItem -LiteralPath $_ -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension -in @('.ts','.tsx','.js','.jsx','.json','.html','.css','.xml','.desktop','.yml','.yaml','.md') }
    }
})

$matches = @($files | Select-String -Pattern $Pattern -AllMatches | Where-Object {
    $line = $_.Line
    $value = $line -replace '^\s*["''][^"'']+["'']\s*:\s*', ''
    $_.Path -notmatch '\\(node_modules|dist|\.cache|components-lab|stories|tests?)\\' -and
    $_.Path -notmatch '\.(test|stories)\.(ts|tsx|js|jsx)$' -and
    $line -notmatch '^\s*import\s' -and
    $line -notmatch '^\s*//|^\s*/\*|^\s*\*' -and
    $line -notmatch 'OPENCODE_(CHANNEL|VERSION|TARGET|DESKTOP|INSTALLER|SERVER|MOUNTED)' -and
    $line -notmatch 'package(?:\.json)?|@opencode/|opencode-(?:theme|window|color|desktop)' -and
    $_.Path -notmatch 'resources[\\/]linux[\\/]opencode-desktop\.desktop$' -and
    $line -notmatch 'providerID|integrationID|worktree|directory|test|fixture|storybook|example|provider\.id|provider\.integration|model\.provider|group\.category|featuredProviders|POPULAR|CONSOLE_(INTEGRATION|GROUP_KEY)|OpenCodeLogo|OpenCode[A-Za-z]+|OpenCode\.make|module\.OpenCode|sidecar\.module|opencode-go|opencodeMounted|VITE_OPENCODE|OPENCODE_TEST|OPENCODE_|localStorage|indexedDB|GLOBAL_STORAGE|WINDOW_STORAGE|LOCAL_PREFIX|BroadcastChannel|opencode\.(workspace|draft|persist|pwa|onboarding|debug|pierre|desktop|global|window)|opencode-(onboarding|debug|pierre)|opencode/desktop|opencode-cli|opencode\.settings|Context\.Service|["'']opencode["'']|opencode:' -and
    $line -notmatch 'language\.t\([^)]*opencode|provider\.connect\.opencode|dialog\.provider\.opencode' -and
    $value -match $Pattern
})

$matches | Select-Object -First 40 | ForEach-Object {
    [pscustomobject]@{
        path = $_.Path
        line = $_.LineNumber
        text = $_.Line.Trim()
    }
} | ConvertTo-Json -Depth 4

if ($matches.Count -gt 0) {
    throw "User-visible brand candidates found: $($matches.Count)"
}

Write-Output 'Brand scan passed.'
