# 钻石手账维护说明

## 项目定位

本目录是“像素生存者2 钻石手账”的唯一正式源码目录。

- 本地入口：`index.html`
- 页面样式：`styles.css`
- 应用逻辑：`app.js`
- PWA 缓存与通知点击：`sw.js`
- 发布仓库：`https://github.com/jesseT-art/sg2-diamond-journal`
- 线上地址：`https://jesseT-art.github.io/sg2-diamond-journal/`

不要修改 `outputs\preview-app` 作为正式版本，它只用于旧预览。不要为了更新页面而清空浏览器数据库。

## 数据兼容

- localStorage 键名：`sg2-diamond-journal-v1`
- IndexedDB 名称：`sg2-diamond-journal`
- 新增字段必须使用默认值兼容旧数据。
- 未经用户明确要求，不得删除昵称、头像、领取记录或修改历史事件格式。
- `DATA_VERSION=2` 会把旧版初始间隔 60/30 迁移到 70/45；其他自定义间隔必须保留。

## 标准更新流程

1. 修改 `index.html`、`styles.css` 或 `app.js`。
2. 每次发布必须提升 PWA 资源版本：

```powershell
pwsh -NoProfile -File scripts/bump-version.ps1 -Version 10
```

3. 运行发布检查：

```powershell
pwsh -NoProfile -File scripts/check-release.ps1
```

4. 本地预览后提交并推送 `main` 分支。GitHub Pages 会自动发布。

如 Windows 提示 Git 的 `dubious ownership`，使用：

```powershell
git -c safe.directory="C:/Users/16343/Documents/Codex/2026-10-24/1-2-30-1-2-30/outputs/app" status
```

本机 Git 使用 Windows schannel 时会报 `SEC_E_NO_CREDENTIALS`，联网操作增加
`-c http.sslBackend=openssl` 即可读取公开仓库。推送仍需本机已登录的 GitHub 凭据：

```powershell
git -c http.sslBackend=openssl push origin main
```

## 版本规则

以下版本必须完全一致：

- `index.html` 中 CSS、JS、manifest 的 `?v=`
- `app.js` 中 Service Worker 的 `sw.js?v=`
- `sw.js` 中 `CACHE_NAME` 和所有 APP_SHELL `?v=`
- `release.json` 中的 `version`

不要手改部分版本号，不要保留两个资源版本混用。

## 通知实现边界

Android 和其他兼容浏览器使用 Notification API 与 Service Worker，在应用打开或后台存活时按 `expectedAt` 提醒。普通网页被系统完全结束后没有可靠的精确后台定时能力；Android APK 使用原生本地闹钟，可在应用关闭、重启及更新后恢复提醒。

iOS 网页和主屏幕 PWA 已确认无法可靠执行本地后台定时通知，因此 `isIOSDevice()` 必须直接禁用通知入口并清除已开启标记，不请求权限、不创建通知计时器。

每次领取的 `notificationSentFor` 保存为对应的 `expectedAt`，确保同一轮奖励只提醒一次。

## 震动反馈

宝箱、钻石的“下一个”按钮和“一起领取”按钮会在点击时调用 `navigator.vibrate`。单领使用短震，双领使用轻量双震。iOS 网页不提供 Vibration API，必须无提示降级，不应因此阻止领取。

## 额外钻石来源

`EXTRA_SOURCES` 定义首页 BOSS、种子、额外宝箱、每日任务、角色卡合成和天天送礼物六个入口。每次点击保存为 `type: "source"` 的本地事件，并进入钻石明细。每日任务每天 1 次、每次 5 钻石；天天送礼物每天 2 次、每次 1 钻石。BOSS、种子和额外宝箱在任意 5 秒窗口内分别最多记录 2 次。额外来源不计入普通领取的“近 60 秒最多 6 钻石”限制。

每日任务使用独立横向卡片、Lucide `clipboard-check` 任务图标和钻石图案；天天送礼物复用礼物图标。点击后必须在重建来源按钮之前调用 `launchCelebration`，否则旧按钮脱离 DOM 后无法取得正确的彩带起点。

额外来源点击必须依次提供：按压反馈、成功波纹与图标弹跳、彩带、现有钻石图标的逐个飞行动画、顶部今日总钻石玻璃卡片、5 秒撤销提示。每日任务生成 5 个飞行动画对象，其他来源生成 1 个。飞行使用 120Hz 固定时间步长，单次总时长约 1.2 秒。

宝箱、钻石和双领按钮仍保留原有 5 秒撤销逻辑，但视觉上必须统一使用底部全局撤销条，不在操作区显示额外撤销小按钮。不得改变三个固定按钮的文字、图标、尺寸和按压动画。主按钮成功记录后也必须调用钻石飞行动画和总钻石卡片：单领默认 2 颗，双领 4 颗。

宝箱收益从默认 2 改为 0 或 1 时，必须同步扣减该事件奖励、今日总额、助手文案和顶部总钻石卡片。不得只更新宝箱选项而不更新余额。

`settings.showDailyTask` 控制首页每日任务板块是否显示，默认开启。关闭只隐藏入口，不得删除已经存在的每日任务记录或历史统计。

像素小助手根据今日总钻石的 0、1–4、5–14、15–29、30–59、60+ 六档选择不同随机文案。页面首次进入不播放位移动画或淡入动画。

## 交付检查

- `node --check app.js`
- `node --check sw.js`
- 页面无横向溢出，设置面板可滚动
- 开关通知后能发送“测试通知”
- 修改版本后线上刷新一次即可载入新资源
- 发布后保留上一个 Git 提交，便于回退
