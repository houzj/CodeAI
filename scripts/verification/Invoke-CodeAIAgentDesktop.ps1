[CmdletBinding()]
param(
    [ValidateSet('Start','Snapshot','Screenshot','Close','ListWindows','Smoke')]
    [string]$Action = 'Snapshot',
    [string]$CodeAIExe = 'C:\Users\Administrator\AppData\Local\Programs\ai.codeai.desktop.dev\CodeAI.exe',
    [string]$AgentDesktopExe = 'E:\SunEyeVision_V2\.tools\agent-desktop\node_modules\agent-desktop\bin\agent-desktop-win32-x64.exe',
    [string]$AgentDesktopHome = 'E:\SunEyeVision_V2\.agent-desktop-state-elevated',
    [string]$ScreenshotPath = 'E:\CodeAI\.cache\agent-desktop-codeai.png'
)

$ErrorActionPreference = 'Stop'

function Invoke-AgentDesktop {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $previousHome = $env:AGENT_DESKTOP_HOME
    try {
        $env:AGENT_DESKTOP_HOME = $AgentDesktopHome
        $raw = & $AgentDesktopExe @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Agent Desktop failed: $($raw -join [Environment]::NewLine)" }
        return ($raw | ConvertFrom-Json)
    } finally {
        $env:AGENT_DESKTOP_HOME = $previousHome
    }
}

function Get-CodeAIWindow {
    $result = Invoke-AgentDesktop @('list-windows','--app','CodeAI.exe')
    $window = @($result.data) | Select-Object -First 1
    if ($null -eq $window) { throw 'CodeAI window not found.' }
    return $window
}

function Start-CodeAI {
    if (-not (Test-Path $CodeAIExe)) { throw "CodeAI executable not found: $CodeAIExe" }
    Invoke-AgentDesktop @('launch',$CodeAIExe,'--activate') | Out-Null
    Start-Sleep -Milliseconds 800
    Get-CodeAIWindow
}

function Find-Nodes {
    param([Parameter(Mandatory)]$Node)
    $children = @($Node.children | Where-Object { $null -ne $_ } | ForEach-Object { Find-Nodes -Node $_ })
    @($Node) + $children
}

function Invoke-Smoke {
    $window = Get-CodeAIWindow
    $snapshot = Invoke-AgentDesktop @('snapshot','--window-id',$window.id,'-i','--compact','--timeout-ms','20000')
    $nodes = @(Find-Nodes -Node $snapshot.data.tree)
    $names = @($nodes | ForEach-Object { [string]$_.name } | Where-Object { $_ })
    $hasProjectsNavigation = $names -contains 'Projects and sessions'
    $legacyTabLabel = [string]([char]0x5173 + [char]0x95ed + [char]0x6807 + [char]0x7b7e + [char]0x9875)
    $hasLegacySessionTabs = $names | Where-Object { $_ -eq $legacyTabLabel }
    $result = [ordered]@{
        window = $window.title
        projects_navigation = $hasProjectsNavigation
        legacy_session_tab_controls = @($hasLegacySessionTabs).Count
        verified_at = (Get-Date).ToUniversalTime().ToString('o')
    }
    $result | ConvertTo-Json -Compress
    if (-not $hasProjectsNavigation) { throw 'Projects and sessions navigation was not found.' }
    if (@($hasLegacySessionTabs).Count -gt 0) { throw 'Legacy top session tab controls are still present.' }
}

switch ($Action) {
    'Start' { Start-CodeAI }
    'Snapshot' {
        $window = Get-CodeAIWindow
        Invoke-AgentDesktop @('snapshot','--window-id',$window.id,'-i','--compact','--timeout-ms','20000')
    }
    'Screenshot' {
        $directory = Split-Path $ScreenshotPath -Parent
        New-Item -ItemType Directory -Force $directory | Out-Null
        Invoke-AgentDesktop @('screenshot',$ScreenshotPath,'--app','CodeAI.exe','--headed')
    }
    'Close' { Invoke-AgentDesktop @('close-app','CodeAI.exe') }
    'ListWindows' { Invoke-AgentDesktop @('list-windows','--app','CodeAI.exe') }
    'Smoke' { Invoke-Smoke }
}
