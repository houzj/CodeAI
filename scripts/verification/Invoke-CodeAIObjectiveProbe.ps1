[CmdletBinding()]
param(
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$Password = $(if ($env:CODEAI_DEV_PASSWORD) { $env:CODEAI_DEV_PASSWORD } else { 'codeai-dev-local' }),
    [string]$Directory = 'E:\CodeAI',
    [string]$OutputPath = 'E:\CodeAI\.cache\codeai-web-objective.json',
    [switch]$KeepSession
)

$ErrorActionPreference = 'Stop'

function Get-CodeAIHeaders {
    $credential = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("opencode:$Password"))
    return @{ Authorization = "Basic $credential" }
}

function Invoke-CodeAIJson {
    param(
        [Parameter(Mandatory)][ValidateSet('Get', 'Post', 'Delete')][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $params = @{ Uri = "$RuntimeUrl$Path"; Method = $Method; Headers = Get-CodeAIHeaders }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }
    return Invoke-RestMethod @params
}

$projects = @(Invoke-CodeAIJson -Method Get -Path '/api/project')
$project = $projects | Where-Object { $_.canonical -eq $Directory } | Select-Object -First 1
if ($null -eq $project) { throw "Project for directory '$Directory' was not found in the Runtime." }

$session = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{ title = 'CodeAI objective validation'; location = @{ directory = $Directory } }).data
$goalCommand = @{ name = 'goal'; text = 'Reply with READY and stop.' }
Invoke-CodeAIJson -Method Post -Path "/api/session/$($session.id)/command" -Body $goalCommand | Out-Null
$rpcBody = @{ input = @{ sessionID = $session.id } }
$goal = $null
1..20 | ForEach-Object {
    $goal = (Invoke-CodeAIJson -Method Post -Path ('/api/rpc/opencode.goal/get?location%5Bdirectory%5D=' + [Uri]::EscapeDataString($Directory)) -Body $rpcBody).output
    if ($null -ne $goal) { return }
    Start-Sleep -Milliseconds 500
}

Invoke-CodeAIJson -Method Post -Path "/api/session/$($session.id)/command" -Body @{ name = 'goal'; text = 'pause' } | Out-Null
$paused = (Invoke-CodeAIJson -Method Post -Path ('/api/rpc/opencode.goal/get?location%5Bdirectory%5D=' + [Uri]::EscapeDataString($Directory)) -Body $rpcBody).output

$schedule = (Invoke-CodeAIJson -Method Post -Path '/api/experimental/schedule' -Body @{
        sessionID = $session.id
        name = 'CodeAI objective schedule validation'
        when = @{ in = '1 second' }
        prompt = 'OBJECTIVE_SCHEDULE_READY'
    }).data
$inbox = @()
$scheduleMessage = $false
1..30 | ForEach-Object {
    $inbox = @((Invoke-CodeAIJson -Method Get -Path "/api/session/$($session.id)/inbox").data)
    $scheduleMessage = @($inbox | Where-Object { $_.payload.text -eq 'OBJECTIVE_SCHEDULE_READY' }).Count -gt 0
    if ($scheduleMessage) { return }
    Start-Sleep -Milliseconds 500
}

$result = [ordered]@{
    runtime = $RuntimeUrl
    project = [ordered]@{ id = $project.id; directory = $project.canonical }
    session = $session.id
    goal = [ordered]@{ initialStatus = $goal.status; objective = $goal.objective; pausedStatus = $paused.status; pauseReason = $paused.reason }
    schedule = [ordered]@{ id = $schedule.id; status = $schedule.status; messageObserved = $scheduleMessage }
    sessionRetained = [bool]$KeepSession
    passed = $goal.status -eq 'active' -and $paused.status -eq 'paused' -and $schedule.status -eq 'active' -and $scheduleMessage
    verifiedAt = [DateTime]::UtcNow.ToString('o')
}

$directoryPath = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force $directoryPath | Out-Null
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12

Invoke-CodeAIJson -Method Delete -Path "/api/experimental/schedule/$($schedule.id)" | Out-Null
if (-not $KeepSession) { Invoke-CodeAIJson -Method Delete -Path "/api/session/$($session.id)" | Out-Null }

if (-not $result.passed) { throw 'Objective probe did not complete the Goal and Schedule lifecycle.' }
