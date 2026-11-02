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
    "assets/app-ui.ttf",
    "assets/app-icon-192.png",
    "assets/app-icon-512.png",
    "assets/favicon-32.png",
    "assets/source-boss.png",
    "assets/source-seed.png",
    "assets/source-chest.png",
    "assets/source-daily-gift.png",
    "assets/source-character-card.png",
    "assets/task-icon.svg"
)
foreach ($RelativePath in $Required) {
    Assert-Check (Test-Path -LiteralPath (Join-Path $Root $RelativePath)) "缺少发布文件：$RelativePath"
}

Assert-Check ($App -match 'notificationToggle') "app.js 缺少通知开关逻辑。"
Assert-Check ($App -match 'function isIOSDevice') "app.js 缺少 iOS 平台检测。"
Assert-Check ($App -match '!isIOSDevice\(\)') "通知兼容性检查未排除 iOS。"
Assert-Check ($App -match 'triggerHapticFeedback') "app.js 缺少领取震动反馈逻辑。"
Assert-Check ($App -match 'navigator\.vibrate') "app.js 未使用浏览器震动接口。"
Assert-Check ($App -match 'const EXTRA_SOURCES') "app.js 缺少首页额外钻石来源配置。"
Assert-Check ($App -match 'function addExtraDiamond') "app.js 缺少额外钻石记录逻辑。"
Assert-Check ($App -match 'animateDiamondsToTotal') "app.js 缺少钻石飞行动画。"
Assert-Check ($App -match 'created\.current\.reward, todayDiamondTotal') "单领按钮未接入钻石飞行动画。"
Assert-Check ($App -match 'chestClaim\.current\.reward \+ diamondClaim\.current\.reward') "双领按钮未接入四颗钻石飞行动画。"
Assert-Check ($App -match 'ASSISTANT_MESSAGES') "app.js 缺少分层助手文案。"
Assert-Check ($App -match 'showSourceUndo') "app.js 缺少来源记录撤销。"
Assert-Check ($App -match 'showClaimUndo') "app.js 缺少主领取按钮统一撤销。"
Assert-Check ($App -match 'const previousReward') "宝箱收益修正逻辑不完整。"
Assert-Check ($App -match 'showDailyTask') "app.js 缺少每日任务显示设置。"
Assert-Check ($App -match 'durations: \{ chest: 70, diamond: 45 \}') "默认刷新间隔不是 70/45 分钟。"
Assert-Check ($App -match 'const DATA_VERSION = 3') "本地数据结构版本号缺失。"
Assert-Check ($App -match 'profile: \{ nickname: DEFAULT_NICKNAME, startedAt: null \}') "首次使用时间字段缺失。"
Assert-Check ($App -match 'function renderCompanionStrip') "首页陪伴横条逻辑缺失。"
Assert-Check ($App -match 'function generateReportBlob') "4K 简报生成逻辑缺失。"
Assert-Check ($App -match 'canvas\.width = 3840') "4K 简报宽度不是 3840。"
Assert-Check ($App -match 'canvas\.height = 2160') "4K 简报高度不是 2160。"
Assert-Check ($App -match 'function showReportPreview') "简报图片预览逻辑缺失。"
Assert-Check ($App -match 'function openReportImageActions') "简报长按保存菜单缺失。"
Assert-Check ($App -match 'navigator\.share') "iOS 图片分享保存入口缺失。"
Assert-Check ($App -match 'model\.reportType') "4K 简报缺少类型标识。"
Assert-Check ($App -match 'data\.profile\.nickname') "4K 简报缺少用户昵称。"
Assert-Check ($App -match 'reportImages\.diamond') "4K 简报缺少钻石图标。"
Assert-Check ($App -match 'drawContainedImage') "Logo 或头像未使用等比缩放。"
Assert-Check ($App -match 'gradient\.addColorStop\(0, accentStrong\)') "总收获色块未使用深色到浅色渐变。"
Assert-Check ($App -match 'barGradient\.addColorStop\(0, color\)') "来源进度条未使用深色到浅色渐变。"
Assert-Check ($Index -match 'id="sourceGrid"') "index.html 缺少额外钻石来源板块。"
Assert-Check ($Index -match 'id="rewardTotalFloat"') "index.html 缺少顶部总钻石悬浮窗。"
Assert-Check ($Index -match 'id="companionStrip"|class="companion-strip"') "index.html 缺少陪伴横条。"
Assert-Check ($Index -match 'id="exportReportSheet"') "index.html 缺少 4K 简报导出弹层。"
Assert-Check ($Index -match 'id="reportPreviewSheet"') "index.html 缺少 4K 简报预览弹层。"
Assert-Check ($Index -match 'id="reportImageActionMenu"') "index.html 缺少图片长按操作窗口。"
Assert-Check ((Get-Content -LiteralPath (Join-Path $Root "styles.css") -Raw) -match 'orientation: landscape[^}]*max-height: 600px') "styles.css 缺少横屏奖励页适配。"
Assert-Check ((Get-Content -LiteralPath (Join-Path $Root "styles.css") -Raw) -match 'font-family: "SG2UI"') "styles.css 缺少统一字体定义。"
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
