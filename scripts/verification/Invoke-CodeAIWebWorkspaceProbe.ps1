[CmdletBinding()]
param(
    [string]$RuntimeUrl = 'http://127.0.0.1:4097',
    [string]$Password = $(if ($env:CODEAI_DEV_PASSWORD) { $env:CODEAI_DEV_PASSWORD } else { 'codeai-dev-local' }),
    [string]$Directory = 'E:\CodeAI',
    [string]$OutputPath = 'E:\CodeAI\.cache\codeai-web-workspace.json'
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
        [object]$Body,
        [string]$Query
    )

    $uri = "${RuntimeUrl}${Path}"
    if ($Query) { $uri = "${uri}?${Query}" }
    Write-Verbose "Request URI: $uri"
    $params = @{ Uri = [Uri]$uri; Method = $Method; Headers = (Get-CodeAIHeaders) }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }
    return Invoke-RestMethod @params
}

$projects = @(Invoke-CodeAIJson -Method Get -Path '/api/project')
$project = $projects | Where-Object { $_.canonical -eq $Directory } | Select-Object -First 1
if ($null -eq $project) { throw "Project for directory '$Directory' was not found in the Runtime." }

$session = (Invoke-CodeAIJson -Method Post -Path '/api/session' -Body @{ title = 'CodeAI workspace probe'; location = @{ directory = $Directory } }).data
$locationQuery = 'location[directory]=' + [Uri]::EscapeDataString($Directory)
$vcs = (Invoke-CodeAIJson -Method Get -Path '/api/vcs' -Query $locationQuery).data
$vcsStatus = @((Invoke-CodeAIJson -Method Get -Path '/api/vcs/status' -Query $locationQuery).data)
$branches = @((Invoke-CodeAIJson -Method Get -Path '/api/vcs/branch' -Query $locationQuery).data)

$permission = (Invoke-CodeAIJson -Method Post -Path "/api/session/$($session.id)/permission" -Body @{
        action = 'shell'
        resources = @($Directory)
        save = @()
        metadata = @{ probe = 'codeai-workspace' }
    }).data
$pendingPermissions = @((Invoke-CodeAIJson -Method Get -Path "/api/session/$($session.id)/permission").data)

$artifact = (Invoke-CodeAIJson -Method Post -Path '/api/experimental/artifacts' -Query $locationQuery -Body @{
        title = 'CodeAI workspace probe artifact'
        entry = 'index.html'
        sessionID = $session.id
        files = @{ 'index.html' = '<!doctype html><title>CodeAI workspace probe</title><main>artifact</main>' }
    }).data
$artifactContent = (Invoke-CodeAIJson -Method Get -Path "/api/experimental/artifacts/$($artifact.id)" -Query $locationQuery).data
[void](Invoke-CodeAIJson -Method Delete -Path "/api/experimental/artifacts/$($artifact.id)" -Query $locationQuery)

$result = [ordered]@{
    runtime = $RuntimeUrl
    project = [ordered]@{ id = $project.id; directory = $project.canonical }
    session = [ordered]@{ id = $session.id; projectID = $session.projectID }
    vcs = [ordered]@{ provider = $vcs.provider; branch = $vcs.branch.current; statusCount = $vcsStatus.Count; branchCount = $branches.Count }
    permission = [ordered]@{ effect = $permission.effect; pendingCount = $pendingPermissions.Count }
    artifact = [ordered]@{ id = $artifact.id; provider = $artifact.provider; files = @($artifactContent.files.PSObject.Properties.Name); deleted = $true }
    passed = $vcs.provider -eq 'git' -and $vcs.branch.current -eq 'dev' -and $permission.effect -in @('allow', 'deny', 'ask') -and $pendingPermissions.Count -eq 0 -and @($artifactContent.files.PSObject.Properties.Name) -contains 'index.html'
    verifiedAt = [DateTime]::UtcNow.ToString('o')
}

$directoryPath = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force $directoryPath | Out-Null
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12
if (-not $result.passed) { throw 'Workspace probe did not complete the VCS, permission and artifact checks.' }
