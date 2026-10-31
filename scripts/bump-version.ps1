param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 999999)]
    [int]$Version
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ReleasePath = Join-Path $Root "release.json"
$Current = [int](Get-Content -LiteralPath $ReleasePath -Raw | ConvertFrom-Json).version

if ($Version -le $Current) {
    throw "新版本必须大于当前版本 $Current。"
}

function Update-FileText {
    param(
        [string]$RelativePath,
        [string]$Pattern,
        [string]$Replacement
    )

    $Path = Join-Path $Root $RelativePath
    $Content = Get-Content -LiteralPath $Path -Raw
    $Regex = [regex]::new($Pattern)
    if (-not $Regex.IsMatch($Content)) {
        throw "未在 $RelativePath 中找到可更新的版本标记。"
    }
    $Updated = $Regex.Replace($Content, $Replacement)
    [System.IO.File]::WriteAllText($Path, $Updated, [System.Text.UTF8Encoding]::new($false))
}

$VersionText = [string]$Version
$Today = Get-Date -Format "yyyy-MM-dd"

Update-FileText "index.html" '(\./styles\.css\?v=)\d+' ('${1}' + $VersionText)
Update-FileText "index.html" '(\./app\.js\?v=)\d+' ('${1}' + $VersionText)
Update-FileText "index.html" '(\./manifest\.webmanifest\?v=)\d+' ('${1}' + $VersionText)
Update-FileText "app.js" '(\./sw\.js\?v=)\d+' ('${1}' + $VersionText)
Update-FileText "sw.js" 'sg2-diamond-journal-v\d+' ('sg2-diamond-journal-v' + $VersionText)
Update-FileText "sw.js" '(\?v=)\d+' ('${1}' + $VersionText)
Update-FileText "release.json" '"version"\s*:\s*\d+' ('"version": ' + $VersionText)
Update-FileText "release.json" '"updatedAt"\s*:\s*"\d{4}-\d{2}-\d{2}"' ('"updatedAt": "' + $Today + '"')

Write-Output "已升级：v$Current -> v$Version"
& (Join-Path $PSScriptRoot "check-release.ps1")
