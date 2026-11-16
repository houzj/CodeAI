[CmdletBinding()]
param(
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$Password = $(if ($env:CODEAI_DEV_PASSWORD) { $env:CODEAI_DEV_PASSWORD } else { 'codeai-dev-local' }),
    [string]$Directory = 'E:\CodeAI',
    [string]$OutputPath = 'E:\CodeAI\.cache\codeai-web-collaboration.json',
    [switch]$KeepSessions
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

$parent = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{ title = 'CodeAI collaboration parent'; location = @{ directory = $Directory } }).data
$child = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{ parentID = $parent.id; title = 'CodeAI collaboration worker'; agent = 'build' }).data

$message = (Invoke-CodeAIJson -Method Post -Path "/api/session/$($parent.id)/synthetic" -Body @{
        text = 'task.assigned'
        description = 'Coordinator assigned a worker task'
        metadata = @{
            type = 'task.assigned'
            goalID = 'goal-validation'
            sourceSessionID = $parent.id
            targetSessionID = $child.id
            causationID = 'cause-validation'
            payload = @{ task = 'verify' }
        }
        delivery = 'queue'
        resume = $false
    }).data
$children = @((Invoke-CodeAIJson -Method Get -Path "/api/session?parentID=$([Uri]::EscapeDataString($parent.id))").data)
$inbox = @((Invoke-CodeAIJson -Method Get -Path "/api/session/$($parent.id)/inbox").data)

$result = [ordered]@{
    runtime = $RuntimeUrl
    project = [ordered]@{ id = $project.id; directory = $project.canonical }
    parent = [ordered]@{ id = $parent.id; title = $parent.title }
    child = [ordered]@{ id = $child.id; parentID = $child.parentID; title = $child.title }
    children = @($children | ForEach-Object { $_.id })
    message = [ordered]@{ type = $message.type; text = $message.payload.text; metadataType = $message.payload.metadata.type; delivery = $message.delivery }
    inbox = [ordered]@{ count = $inbox.Count; type = $inbox[0].type; metadataType = $inbox[0].payload.metadata.type; delivery = $inbox[0].delivery }
    passed = $child.parentID -eq $parent.id -and @($children | Where-Object { $_.id -eq $child.id }).Count -eq 1 -and $message.type -eq 'synthetic' -and $message.payload.metadata.type -eq 'task.assigned' -and $message.delivery -eq 'queue' -and $inbox.Count -eq 1
    sessionsRetained = [bool]$KeepSessions
    verifiedAt = [DateTime]::UtcNow.ToString('o')
}

$directoryPath = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force $directoryPath | Out-Null
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12

if (-not $KeepSessions) {
    Invoke-CodeAIJson -Method Delete -Path "/api/session/$($parent.id)" | Out-Null
}

if (-not $result.passed) { throw 'Collaboration probe did not observe the parent/child and durable message contract.' }
