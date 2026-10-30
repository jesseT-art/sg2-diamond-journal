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

网页版使用 Notification API 和 Service Worker，在应用打开或后台存活时按 `expectedAt` 提醒。普通网页被系统完全结束后没有可靠的精确后台定时能力；Android APK 使用原生本地闹钟，可在应用关闭、重启及更新后恢复提醒。

每次领取的 `notificationSentFor` 保存为对应的 `expectedAt`，确保同一轮奖励只提醒一次。

## 交付检查

- `node --check app.js`
- `node --check sw.js`
- 页面无横向溢出，设置面板可滚动
- 开关通知后能发送“测试通知”
- 修改版本后线上刷新一次即可载入新资源
- 发布后保留上一个 Git 提交，便于回退
