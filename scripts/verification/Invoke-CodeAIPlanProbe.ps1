[CmdletBinding()]
param(
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$Password = $(if ($env:CODEAI_DEV_PASSWORD) { $env:CODEAI_DEV_PASSWORD } else { 'codeai-dev-local' }),
    [string]$Directory = 'E:\CodeAI',
    [string]$OutputPath = 'E:\CodeAI\.cache\codeai-web-plan.json',
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

$session = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{ title = 'CodeAI plan validation'; location = @{ directory = $Directory } }).data
Invoke-CodeAIJson -Method Post -Path "/api/session/$($session.id)/agent" -Body @{ agent = 'plan' } | Out-Null
Invoke-CodeAIJson -Method Post -Path "/api/session/$($session.id)/prompt" -Body @{
    text = 'Give a one-line plan.'
    metadata = @{}
    delivery = 'steer'
    resume = $true
} | Out-Null

$messages = @()
$synthetic = $null
$assistant = $null
1..40 | ForEach-Object {
    $messages = @((Invoke-CodeAIJson -Method Get -Path "/api/session/$($session.id)/message").data)
    $synthetic = $messages | Where-Object { $_.type -eq 'synthetic' -and $_.text -like '<system-reminder>*Plan mode*' } | Select-Object -Last 1
    $assistant = $messages | Where-Object { $_.type -eq 'assistant' -and $_.agent -eq 'plan' } | Select-Object -Last 1
    if ($null -ne $synthetic -and $null -ne $assistant) { return }
    Start-Sleep -Milliseconds 500
}

$result = [ordered]@{
    runtime = $RuntimeUrl
    project = [ordered]@{ id = $project.id; directory = $project.canonical }
    session = $session.id
    agent = 'plan'
    reminderObserved = $null -ne $synthetic
    assistantObserved = $null -ne $assistant
    messageCount = $messages.Count
    sessionRetained = [bool]$KeepSession
    passed = $null -ne $synthetic -and $null -ne $assistant
    verifiedAt = [DateTime]::UtcNow.ToString('o')
}

$directoryPath = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force $directoryPath | Out-Null
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12

if (-not $KeepSession) { Invoke-CodeAIJson -Method Delete -Path "/api/session/$($session.id)" | Out-Null }

if (-not $result.passed) { throw 'Plan probe did not observe the Plan reminder and Plan agent response.' }
