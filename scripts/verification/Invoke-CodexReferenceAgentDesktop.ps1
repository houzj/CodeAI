[CmdletBinding()]
param(
    [ValidateSet('Start','Snapshot','Screenshot','Close','ListWindows')]
    [string]$Action = 'Snapshot',
    [string]$ReferenceExe = 'C:\Users\Administrator\AppData\Local\Programs\OpenAI\Codex\Codex.exe',
    [string]$AgentDesktopExe = 'E:\SunEyeVision_V2\.tools\agent-desktop\node_modules\agent-desktop\bin\agent-desktop-win32-x64.exe',
    [string]$AgentDesktopHome = 'E:\SunEyeVision_V2\.agent-desktop-state-elevated',
    [string]$ScreenshotPath = 'E:\CodeAI\.cache\codex-reference.png'
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

function Get-ReferenceWindow {
    $result = Invoke-AgentDesktop @('list-windows','--app','Codex.exe')
    $window = @($result.data) | Select-Object -First 1
    if ($null -eq $window) { throw 'Codex reference window not found.' }
    return $window
}

switch ($Action) {
    'Start' {
        if (-not (Test-Path $ReferenceExe)) { throw "Reference executable not found: $ReferenceExe" }
        Invoke-AgentDesktop @('launch',$ReferenceExe,'--activate')
    }
    'Snapshot' {
        $window = Get-ReferenceWindow
        Invoke-AgentDesktop @('snapshot','--window-id',$window.id,'-i','--compact','--timeout-ms','20000')
    }
    'Screenshot' {
        New-Item -ItemType Directory -Force (Split-Path $ScreenshotPath -Parent) | Out-Null
        Invoke-AgentDesktop @('screenshot',$ScreenshotPath,'--app','Codex.exe','--headed')
    }
    'Close' { Invoke-AgentDesktop @('close-app','Codex.exe') }
    'ListWindows' { Invoke-AgentDesktop @('list-windows','--app','Codex.exe') }
}
