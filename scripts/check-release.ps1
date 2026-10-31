param(
    [switch]$RequireClean
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Failures = [System.Collections.Generic.List[string]]::new()

function Assert-Check {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        $script:Failures.Add($Message)
    }
}

$ReleasePath = Join-Path $Root "release.json"
$Release = Get-Content -LiteralPath $ReleasePath -Raw | ConvertFrom-Json
$Version = [int]$Release.version
$Index = Get-Content -LiteralPath (Join-Path $Root "index.html") -Raw
$App = Get-Content -LiteralPath (Join-Path $Root "app.js") -Raw
$ServiceWorker = Get-Content -LiteralPath (Join-Path $Root "sw.js") -Raw

Assert-Check ($Version -gt 0) "release.json 的 version 无效。"
$ManifestValid = $false
try {
    Get-Content -LiteralPath (Join-Path $Root "manifest.webmanifest") -Raw | ConvertFrom-Json | Out-Null
    $ManifestValid = $true
} catch {
    $ManifestValid = $false
}
Assert-Check $ManifestValid "manifest.webmanifest 不是有效 JSON。"

$IndexRefs = [regex]::Matches($Index, '\?v=(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Assert-Check ($IndexRefs.Count -eq 3) "index.html 应有 3 个带版本的资源引用，实际为 $($IndexRefs.Count)。"
Assert-Check (($IndexRefs | Where-Object { $_ -ne $Version }).Count -eq 0) "index.html 存在与 release.json 不一致的资源版本。"

$AppRefs = [regex]::Matches($App, 'sw\.js\?v=(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Assert-Check ($AppRefs.Count -eq 1) "app.js 应有且仅有 1 个 Service Worker 版本引用。"
Assert-Check (($AppRefs | Where-Object { $_ -ne $Version }).Count -eq 0) "app.js 的 Service Worker 版本不一致。"

$SwRefs = [regex]::Matches($ServiceWorker, '\?v=(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Assert-Check ($SwRefs.Count -ge 3) "sw.js 的 APP_SHELL 版本引用不足。"
Assert-Check (($SwRefs | Where-Object { $_ -ne $Version }).Count -eq 0) "sw.js 的 APP_SHELL 版本不一致。"
Assert-Check ($ServiceWorker -match "sg2-diamond-journal-v$Version") "sw.js 的 CACHE_NAME 与当前版本不一致。"

$Required = @(
    "index.html",
    "app.js",
    "styles.css",
    "sw.js",
    "manifest.webmanifest",
    "assets/app-icon-192.png",
    "assets/app-icon-512.png",
    "assets/favicon-32.png"
)
foreach ($RelativePath in $Required) {
    Assert-Check (Test-Path -LiteralPath (Join-Path $Root $RelativePath)) "缺少发布文件：$RelativePath"
}

Assert-Check ($App -match 'notificationToggle') "app.js 缺少通知开关逻辑。"
Assert-Check ($App -match 'function isIOSDevice') "app.js 缺少 iOS 平台检测。"
Assert-Check ($App -match '!isIOSDevice\(\)') "通知兼容性检查未排除 iOS。"
Assert-Check ($App -match 'triggerHapticFeedback') "app.js 缺少领取震动反馈逻辑。"
Assert-Check ($App -match 'navigator\.vibrate') "app.js 未使用浏览器震动接口。"
Assert-Check ($ServiceWorker -match 'notificationclick') "sw.js 缺少通知点击处理。"
Assert-Check ($App -match 'sg2-diamond-journal-v1') "localStorage 兼容键疑似被修改。"
Assert-Check ($App -match 'const DB_NAME = "sg2-diamond-journal"') "IndexedDB 名称疑似被修改。"

& node --check (Join-Path $Root "app.js")
Assert-Check ($LASTEXITCODE -eq 0) "app.js 语法检查失败。"
& node --check (Join-Path $Root "sw.js")
Assert-Check ($LASTEXITCODE -eq 0) "sw.js 语法检查失败。"

if ($RequireClean) {
    $SafeRoot = $Root.Replace("\", "/")
    $Status = & git -c "safe.directory=$SafeRoot" -C $Root status --porcelain
    Assert-Check ($LASTEXITCODE -eq 0) "无法读取 Git 状态。"
    Assert-Check (-not $Status) "工作区仍有未提交文件，不能正式发布。"
}

if ($Failures.Count -gt 0) {
    $Failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "发布检查通过：v$Version"
Write-Output "线上地址：$($Release.pagesUrl)"
