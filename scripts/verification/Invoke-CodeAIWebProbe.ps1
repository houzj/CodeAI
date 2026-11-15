[CmdletBinding()]
param(
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$Password = $(if ($env:CODEAI_DEV_PASSWORD) { $env:CODEAI_DEV_PASSWORD } else { 'codeai-dev-local' }),
    [string]$Directory = 'E:\CodeAI',
    [string]$Title = 'CodeAI web continuous input probe',
    [string]$PromptA = 'CONTINUOUS_A',
    [string]$PromptB = 'CONTINUOUS_B',
    [string]$OutputPath = 'E:\CodeAI\.cache\codeai-web-continuous-input.json'
)

$ErrorActionPreference = 'Stop'

function Get-CodeAIHeaders {
    $credential = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("opencode:$Password"))
    return @{ Authorization = "Basic $credential" }
}

function Invoke-CodeAIJson {
    param(
        [Parameter(Mandatory)][ValidateSet('Get', 'Post')][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $params = @{
        Uri = "$RuntimeUrl$Path"
        Method = $Method
        Headers = Get-CodeAIHeaders
    }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }
    return Invoke-RestMethod @params
}

$projects = @(Invoke-CodeAIJson -Method Get -Path '/api/project')
$project = $projects | Where-Object { $_.canonical -eq $Directory } | Select-Object -First 1
if ($null -eq $project) {
    throw "Project for directory '$Directory' was not found in the Runtime."
}

$session = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{
        title = $Title
        location = @{ directory = $Directory }
    }).data

[void][Reflection.Assembly]::LoadWithPartialName('System.Net.Http')
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
    'Basic',
    [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("opencode:$Password"))
)
$promptPath = "/api/session/$($session.id)/prompt"
$promptTasks = @($PromptA, $PromptB) | ForEach-Object {
    $content = [System.Net.Http.StringContent]::new(
        (@{ text = $_; metadata = @{}; delivery = 'steer' } | ConvertTo-Json -Depth 8 -Compress),
        [Text.Encoding]::UTF8,
        'application/json'
    )
    $client.PostAsync("$RuntimeUrl$promptPath", $content)
}
$responses = [Threading.Tasks.Task]::WhenAll($promptTasks).GetAwaiter().GetResult()
$admitted = @($responses | ForEach-Object {
        [ordered]@{
            status = [int]$_.StatusCode
            body = $_.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        }
    })
$inbox = Invoke-CodeAIJson -Method Get -Path "/api/session/$($session.id)/inbox" | Select-Object -ExpandProperty data

$result = [ordered]@{
    runtime = $RuntimeUrl
    project = [ordered]@{ id = $project.id; directory = $project.canonical }
    session = [ordered]@{ id = $session.id; title = $session.title; projectID = $session.projectID }
    admitted = $admitted
    inbox = @($inbox | ForEach-Object { $_.payload.text })
    passed = @($admitted | Where-Object { $_.status -eq 200 }).Count -eq 2 -and
        @($inbox | Where-Object { $_.payload.text -eq $PromptB }).Count -eq 1
    verifiedAt = [DateTime]::UtcNow.ToString('o')
}

$directory = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force $directory | Out-Null
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12
if (-not $result.passed) {
    throw 'Continuous input probe did not observe two successful admissions and a queued second prompt.'
}
