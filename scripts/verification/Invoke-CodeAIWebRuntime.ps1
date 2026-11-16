[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Stop')]
    [string]$Action = 'Status',
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$BunExe = 'E:\CodeAI\.tools\bun-windows-x64\bun.exe',
    [string]$WorkingDirectory = 'E:\CodeAI\packages\app',
    [string]$StateDirectory = 'E:\CodeAI\.cache\codeai-runtime'
)

$ErrorActionPreference = 'Stop'
$pidPath = Join-Path $StateDirectory 'runtime.pid'
$stdoutPath = Join-Path $StateDirectory 'runtime.out.log'
$stderrPath = Join-Path $StateDirectory 'runtime.err.log'

function Get-RuntimeStatus {
    $code = (& curl.exe -sS -o NUL -w "%{http_code}" "$RuntimeUrl/api/project" 2>$null).Trim()
    return $code
}

function Wait-Runtime {
    1..60 | ForEach-Object {
        $code = Get-RuntimeStatus
        if ($code -in @('200', '401', '403')) { return $code }
        Start-Sleep -Milliseconds 500
    }

    throw "CodeAI Runtime did not respond at $RuntimeUrl. See $stdoutPath and $stderrPath."
}

function Start-Runtime {
    $existing = Get-RuntimeStatus
    if ($existing -in @('200', '401', '403')) {
        return [ordered]@{ state = 'already-running'; url = $RuntimeUrl; http = $existing }
    }

    if (-not (Test-Path $BunExe)) { throw "Bun executable not found: $BunExe" }
    if (-not (Test-Path $WorkingDirectory)) { throw "Runtime working directory not found: $WorkingDirectory" }

    New-Item -ItemType Directory -Force $StateDirectory | Out-Null
    $process = Start-Process -FilePath $BunExe -WorkingDirectory $WorkingDirectory -ArgumentList @('run', 'dev:connected') -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -WindowStyle Hidden -PassThru
    $process.Id | Set-Content -Path $pidPath -Encoding ascii
    $code = Wait-Runtime
    return [ordered]@{ state = 'started'; pid = $process.Id; url = $RuntimeUrl; http = $code; logs = $StateDirectory }
}

function Stop-Runtime {
    if (-not (Test-Path $pidPath)) { return [ordered]@{ state = 'not-managed' } }

    $processId = [int](Get-Content $pidPath -Raw)
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Remove-Item -LiteralPath $pidPath -Force
        return [ordered]@{ state = 'already-stopped'; pid = $processId }
    }

    if ($process.Path -ne $BunExe) { throw "Refusing to stop PID $processId because it is not the managed Bun executable." }
    Stop-Process -Id $processId
    Remove-Item -LiteralPath $pidPath -Force
    return [ordered]@{ state = 'stopped'; pid = $processId }
}

$result = switch ($Action) {
    'Start' { Start-Runtime }
    'Status' { [ordered]@{ state = if ((Get-RuntimeStatus) -in @('200', '401', '403')) { 'running' } else { 'offline' }; url = $RuntimeUrl; http = Get-RuntimeStatus } }
    'Stop' { Stop-Runtime }
}

$result | ConvertTo-Json -Compress
