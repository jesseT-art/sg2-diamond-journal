(() => {
  "use strict";

  const STORAGE_KEY = "sg2-diamond-journal-v1";
  const DB_NAME = "sg2-diamond-journal";
  const DB_VERSION = 1;
  const UNDO_MS = 5000;
  const DEFAULT_NICKNAME = "像素冒险者";
  const QQ_GROUP_UIN = "1124909778";
  const QQ_GROUP_JOIN_URL =
    "https://qun.qq.com/universal-share/share?ac=1&authKey=NcYpwsw0uyoFEvfs9K2U0pbty1aFJLvkQXB1WnvvOnZCPSvzCZwEphqSlFLl6wyi&busi_data=eyJncm91cENvZGUiOiIxMTI0OTA5Nzc4IiwidG9rZW4iOiJXQUZ6VVRtQmJOMnNJTTFiN2I0S2hQR1JiclgwVksxTWROSi8wVldZVmR6a016RFpNNjM5NTU0Q2hUdmFPN0tsIiwidWluIjoiMTYzNDM2NTAxOCJ9&data=RAJFbnazxsLdojQkwFPLDWRy45IJE61AEZPZvLGCa1pr1G0BoThgG3AXuHnVre6ylk5h6p8rtADBwgggG83gBA&svctype=4&tempid=h5_group_info";

  const THEMES = [
    { id: "blue", name: "经典蓝", swatch: "#2f7dff", accent: "#2f7dff", strong: "#1f6bff", soft: "#eaf3ff" },
    { id: "mint", name: "浅葱绿", swatch: "#31cdbd", accent: "#22b9aa", strong: "#15998d", soft: "#e4f9f6" },
    { id: "pink", name: "桃桃粉", swatch: "#ff91a6", accent: "#f46f89", strong: "#dc506e", soft: "#ffedf1" },
    { id: "purple", name: "星辰紫", swatch: "#805fff", accent: "#7350ef", strong: "#5d36df", soft: "#f0eaff" },
    { id: "yellow", name: "盛夏黄", swatch: "#f3c62f", accent: "#d8a600", strong: "#b98a00", soft: "#fff8dd" },
    { id: "red", name: "元气红", swatch: "#ff6b78", accent: "#ef5264", strong: "#d63c50", soft: "#ffeaec" },
    { id: "gray", name: "素雅灰", swatch: "#8b95a5", accent: "#778395", strong: "#5e6a7d", soft: "#eef1f5" },
    { id: "white", name: "极简白", swatch: "#e8edf4", accent: "#63738a", strong: "#48586e", soft: "#f2f5f8" },
    { id: "black", name: "极致黑", swatch: "#30363d", accent: "#3c4651", strong: "#20262d", soft: "#e8ebee" },
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const elements = {
    html: document.documentElement,
    headerAvatarImage: $("#headerAvatarImage"),
    headerAvatarFallback: $("#headerAvatarFallback"),
    headerNickname: $("#headerNickname"),
    todayLabel: $("#todayLabel"),
    assistantText: $("#assistantText"),
    chestAvailability: $("#chestAvailability"),
    diamondAvailability: $("#diamondAvailability"),
    actionDock: $("#actionDock"),
    chestIntervalLabel: $("#chestIntervalLabel"),
    diamondIntervalLabel: $("#diamondIntervalLabel"),
    periodLabel: $("#periodLabel"),
    totalDiamonds: $("#totalDiamonds"),
    chestCount: $("#chestCount"),
    diamondCount: $("#diamondCount"),
    chestDiamonds: $("#chestDiamonds"),
    fixedDiamonds: $("#fixedDiamonds"),
    formulaTotal: $("#formulaTotal"),
    profileSheet: $("#profileSheet"),
    settingsSheet: $("#settingsSheet"),
    qqGroupSheet: $("#qqGroupSheet"),
    ledgerSheet: $("#ledgerSheet"),
    ledgerTitle: $("#ledgerTitle"),
    ledgerSummary: $("#ledgerSummary"),
    ledgerList: $("#ledgerList"),
    celebrationCanvas: $("#celebrationCanvas"),
    profileAvatarImage: $("#profileAvatarImage"),
    profileAvatarFallback: $("#profileAvatarFallback"),
    nicknameInput: $("#nicknameInput"),
    avatarInput: $("#avatarInput"),
    chestDurationInput: $("#chestDurationInput"),
    diamondDurationInput: $("#diamondDurationInput"),
    darkModeToggle: $("#darkModeToggle"),
    themeGrid: $("#themeGrid"),
    installBtn: $("#installBtn"),
    toast: $("#toast"),
    claimBothBtn: $("#claimBothBtn"),
  };

  let dbPromise = null;
  let toastTimer = 0;
  let deferredInstallPrompt = null;
  let pendingAvatarBlob = null;
  let pendingAvatarUrl = "";
  let avatarUrl = "";
  let picker = null;
  let celebrationFrame = 0;
  let celebrationLastTime = 0;
  let celebrationAccumulator = 0;
  let celebrationParticles = [];
  let celebrationContext = null;

  const runtime = {
    undo: { chest: null, diamond: null },
    batchUndo: null,
    period: "day",
  };

  function defaultData() {
    return {
      version: 1,
      profile: { nickname: DEFAULT_NICKNAME },
      settings: {
        theme: "blue",
        dark: false,
        durations: { chest: 60, diamond: 30 },
      },
      current: { chest: null, diamond: null },
    };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeData(input) {
    const fallback = defaultData();
    const source = input && typeof input === "object" ? input : {};
    const result = {
      ...fallback,
      ...source,
      profile: { ...fallback.profile, ...(source.profile || {}) },
      settings: {
        ...fallback.settings,
        ...(source.settings || {}),
        durations: {
          ...fallback.settings.durations,
          ...((source.settings && source.settings.durations) || {}),
        },
      },
      current: { ...fallback.current, ...(source.current || {}) },
    };

    result.profile.nickname =
      String(result.profile.nickname || "").trim().slice(0, 16) || DEFAULT_NICKNAME;
    if (!THEMES.some((theme) => theme.id === result.settings.theme)) {
      result.settings.theme = "blue";
    }
    result.settings.dark = Boolean(result.settings.dark);
    for (const kind of ["chest", "diamond"]) {
      const duration = Number(result.settings.durations[kind]);
      result.settings.durations[kind] =
        Number.isFinite(duration) && duration >= 1 ? Math.min(1440, Math.round(duration)) : fallback.settings.durations[kind];
      const current = result.current[kind];
      if (
        !current ||
        !Number.isFinite(Number(current.claimedAt)) ||
        !Number.isFinite(Number(current.expectedAt))
      ) {
        result.current[kind] = null;
      } else {
        result.current[kind] = {
          claimedAt: Number(current.claimedAt),
          expectedAt: Number(current.expectedAt),
          duration: Number(current.duration) || result.settings.durations[kind],
          reward: kind === "diamond" ? 2 : [0, 1, 2].includes(Number(current.reward)) ? Number(current.reward) : 2,
          eventId: String(current.eventId || ""),
        };
      }
    }
    return result;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return normalizeData(raw ? JSON.parse(raw) : null);
    } catch (error) {
      console.warn("无法读取本地设置，将使用默认值。", error);
      return defaultData();
    }
  }

  let data = loadData();
  let events = [];

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("无法保存本地设置。", error);
      showToast("本地存储空间不足，请清理部分数据后重试");
    }
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", { keyPath: "id" });
          store.createIndex("claimedAt", "claimedAt");
          store.createIndex("type", "type");
        }
        if (!db.objectStoreNames.contains("media")) {
          db.createObjectStore("media", { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function storeRequest(storeName, mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request;
      try {
        request = action(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("本地数据库操作已取消"));
    });
  }

  async function getAllEvents() {
    const rows = await storeRequest("events", "readonly", (store) => store.getAll());
    return (Array.isArray(rows) ? rows : [])
      .filter((event) => event && Number.isFinite(Number(event.claimedAt)))
      .sort((a, b) => a.claimedAt - b.claimedAt);
  }

  async function putEvent(event) {
    return storeRequest("events", "readwrite", (store) => store.put(event));
  }

  async function deleteEvents(ids) {
    if (!ids.length) return;
    return storeRequest("events", "readwrite", (store) => {
      ids.forEach((id) => store.delete(id));
      return null;
    });
  }

  async function clearEvents() {
    return storeRequest("events", "readwrite", (store) => store.clear());
  }

  async function getMedia(key) {
    return storeRequest("media", "readonly", (store) => store.get(key));
  }

  async function putMedia(row) {
    return storeRequest("media", "readwrite", (store) => store.put(row));
  }

  async function clearMedia() {
    return storeRequest("media", "readwrite", (store) => store.clear());
  }

  function uid(kind) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${kind}-${window.crypto.randomUUID()}`;
    }
    return `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clampDuration(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(1, Math.min(1440, Math.round(number)));
  }

  function parseHex(hex) {
    let normalized = String(hex).replace("#", "");
    if (normalized.length === 3) {
      normalized = normalized
        .split("")
        .map((char) => char + char)
        .join("");
    }
    return [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16));
  }

  function colorMix(first, second, amount) {
    const a = parseHex(first);
    const b = parseHex(second);
    return `#${a
      .map((channel, index) =>
        Math.round(channel + (b[index] - channel) * amount)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")}`;
  }

  function luminance(hex) {
    const [r, g, b] = parseHex(hex);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function applyTheme() {
    const theme = THEMES.find((item) => item.id === data.settings.theme) || THEMES[0];
    const dark = data.settings.dark;
    elements.html.dataset.mode = dark ? "dark" : "light";

    let accent = theme.accent;
    let strong = theme.strong;
    let soft = theme.soft;
    if (dark && luminance(accent) < 120) {
      accent = colorMix(accent, "#ffffff", 0.38);
      strong = colorMix(strong, "#ffffff", 0.2);
    }
    if (dark) {
      soft = colorMix(theme.accent, "#10233d", 0.77);
    }

    const rootStyle = elements.html.style;
    rootStyle.setProperty("--accent", accent);
    rootStyle.setProperty("--accent-strong", strong);
    rootStyle.setProperty("--accent-soft", soft);
    rootStyle.setProperty("--button-edge", colorMix(strong, "#071d43", 0.4));
    rootStyle.setProperty("--on-accent", luminance(accent) > 174 ? "#14243c" : "#ffffff");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", accent);
    renderThemeGrid();
  }

  function dateStartFor(period) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    if (period === "week") {
      const offset = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - offset);
    } else if (period === "month") {
      date.setDate(1);
    }
    return date.getTime();
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(new Date(timestamp));
  }

  function sameCalendarDay(first, second) {
    const a = new Date(first);
    const b = new Date(second);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function dateRelation(timestamp) {
    const now = new Date();
    const target = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const dayDifference = Math.round((targetDay - today) / 86400000);
    if (dayDifference === 0) return "今天";
    if (dayDifference === 1) return "明天";
    if (dayDifference === -1) return "昨天";
    return `${target.getMonth() + 1}月${target.getDate()}日`;
  }

  function renderDateHeader() {
    elements.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(new Date());
  }

  function renderProfile() {
    elements.headerNickname.textContent = data.profile.nickname;
    elements.nicknameInput.value = data.profile.nickname;
    setAvatarSources(avatarUrl || pendingAvatarUrl);
  }

  function setAvatarSources(url) {
    const images = [elements.headerAvatarImage, elements.profileAvatarImage];
    const fallbacks = [elements.headerAvatarFallback, elements.profileAvatarFallback];
    images.forEach((image) => {
      if (url) {
        image.src = url;
        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.hidden = true;
      }
    });
    fallbacks.forEach((fallback) => {
      fallback.hidden = Boolean(url);
    });
  }

  function statusMarkup(kind) {
    const current = data.current[kind];
    if (!current) {
      return {
        main: "尚未记录",
        sub: "点击“下一个”记录当前时间",
        ready: false,
      };
    }

    const now = Date.now();
    if (now >= current.expectedAt) {
      return {
        main: "现在可以领取",
        sub: `原预计 ${dateRelation(current.expectedAt)} ${formatTime(current.expectedAt)}`,
        ready: true,
      };
    }

    return {
      main: `预计 <span class="time-value">${formatTime(current.expectedAt)}</span>`,
      sub: `${dateRelation(current.expectedAt)}可领取 · 上次 ${formatTime(current.claimedAt)}`,
      ready: false,
    };
  }

  function renderAvailability(kind) {
    const element = kind === "chest" ? elements.chestAvailability : elements.diamondAvailability;
    const status = statusMarkup(kind);
    element.classList.toggle("is-ready", status.ready);
    element.innerHTML = `<strong class="availability-main">${status.main}</strong><span class="availability-sub">${status.sub}</span>`;
  }

  function remainingSeconds(expiresAt) {
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  function diamondTotalInWindow(sourceEvents, now = Date.now()) {
    const cutoff = now - 60000;
    return sourceEvents
      .filter((event) => Number(event.claimedAt) > cutoff && Number(event.claimedAt) <= now)
      .reduce((total, event) => total + (Number(event.reward) || 0), 0);
  }

  function renderActionDock() {
    const parts = [];
    const now = Date.now();

    if (picker === "chest" && data.current.chest) {
      parts.push(`
        <div class="quantity-box">
          <span class="quantity-label">本次宝箱开出多少钻石？</span>
          <div class="quantity-options">
            ${[0, 1, 2]
              .map(
                (value) =>
                  `<button class="quantity-chip${data.current.chest.reward === value ? " active" : ""}" type="button" data-quantity="${value}">${value}</button>`
              )
              .join("")}
          </div>
        </div>
      `);
    }

    const undoButtons = [];
    for (const kind of ["chest", "diamond"]) {
      const undo = runtime.undo[kind];
      if (undo && now < undo.expiresAt) {
        const label = kind === "chest" ? "宝箱" : "钻石";
        undoButtons.push(
          `<button class="undo-chip" type="button" data-undo-kind="${kind}">撤回${label} · <span>${remainingSeconds(undo.expiresAt)}</span>s</button>`
        );
      } else if (undo) {
        runtime.undo[kind] = null;
      }
    }
    if (runtime.batchUndo && now < runtime.batchUndo.expiresAt) {
      undoButtons.push(
        `<button class="undo-chip" type="button" data-undo-batch="1">撤回双领 · <span>${remainingSeconds(runtime.batchUndo.expiresAt)}</span>s</button>`
      );
    } else if (runtime.batchUndo) {
      runtime.batchUndo = null;
    }

    if (!parts.length && !undoButtons.length) {
      elements.actionDock.innerHTML = `
        <div class="action-dock-idle">
          <span class="action-dock-mark">+</span>
          <span>领取后可在这里选择本次钻石收益或撤回记录</span>
        </div>
      `;
      return;
    }

    const recentTotal = diamondTotalInWindow(events, now);
    elements.actionDock.innerHTML = `
      <div class="action-dock-content">
        ${parts.join("")}
        <div class="action-dock-meta">
          <span class="rolling-limit">近 60 秒 ${recentTotal}/6 钻石</span>
          <div class="undo-actions">${undoButtons.join("")}</div>
        </div>
      </div>
    `;
  }

  function renderAssistant() {
    const start = dateStartFor("day");
    const todayEvents = events.filter(
      (event) => Number(event.claimedAt) >= start && Number(event.claimedAt) <= Date.now()
    );
    const chestEvents = todayEvents.filter((event) => event.type === "chest");
    const diamondEvents = todayEvents.filter((event) => event.type === "diamond");
    const chestDiamonds = chestEvents.reduce(
      (total, event) => total + ([0, 1, 2].includes(Number(event.reward)) ? Number(event.reward) : 1),
      0
    );
    const totalDiamonds = chestDiamonds + diamondEvents.length * 2;

    if (!todayEvents.length) {
      elements.assistantText.textContent =
        "今天还没有领取记录。领完奖励后点一下“下一个”，我来帮你统计今日收获。";
      return;
    }
    elements.assistantText.textContent =
      `今日已领宝箱 ${chestEvents.length} 次、钻石奖励 ${diamondEvents.length} 次，共收获 ${totalDiamonds} 钻石。继续加油！`;
  }

  function renderStats() {
    const start = dateStartFor(runtime.period);
    const periodEvents = events.filter(
      (event) => Number(event.claimedAt) >= start && Number(event.claimedAt) <= Date.now()
    );
    const chestEvents = periodEvents.filter((event) => event.type === "chest");
    const diamondEvents = periodEvents.filter((event) => event.type === "diamond");
    const chestDiamonds = chestEvents.reduce(
      (total, event) => total + ([0, 1, 2].includes(Number(event.reward)) ? Number(event.reward) : 1),
      0
    );
    const fixedDiamonds = diamondEvents.length * 2;
    const total = chestDiamonds + fixedDiamonds;

    elements.periodLabel.textContent =
      runtime.period === "day" ? "本日合计" : runtime.period === "week" ? "本周合计" : "本月合计";
    elements.totalDiamonds.textContent = String(total);
    elements.chestCount.textContent = String(chestEvents.length);
    elements.diamondCount.textContent = String(diamondEvents.length);
    elements.chestDiamonds.textContent = String(chestDiamonds);
    elements.fixedDiamonds.textContent = String(fixedDiamonds);
    elements.formulaTotal.textContent = `${total} 钻石`;
  }

  function renderLedger() {
    const start = dateStartFor(runtime.period);
    const periodEvents = events
      .filter(
        (event) => Number(event.claimedAt) >= start && Number(event.claimedAt) <= Date.now()
      )
      .sort((a, b) => b.claimedAt - a.claimedAt);
    const total = periodEvents.reduce((sum, event) => sum + (Number(event.reward) || 0), 0);
    const label =
      runtime.period === "day" ? "本日" : runtime.period === "week" ? "本周" : "本月";
    elements.ledgerTitle.textContent = `${label}钻石记录`;
    elements.ledgerSummary.textContent = `${label}共获得 ${total} 钻石 · ${periodEvents.length} 条记录`;

    if (!periodEvents.length) {
      elements.ledgerList.innerHTML = '<div class="ledger-empty">当前周期还没有钻石记录</div>';
      return;
    }

    elements.ledgerList.innerHTML = periodEvents
      .map((event) => {
        const date = new Date(event.claimedAt);
        const stamp = `${date.getMonth() + 1}月${date.getDate()}日 ${formatTime(event.claimedAt)}`;
        const isChest = event.type === "chest";
        return `
          <article class="ledger-item">
            <img class="ledger-icon" src="./assets/${isChest ? "chest" : "diamond"}.png" alt="" />
            <div class="ledger-copy">
              <strong>${isChest ? "宝箱" : "钻石奖励"}</strong>
              <span>${stamp}</span>
            </div>
            <span class="ledger-reward">+${Number(event.reward) || 0}<small>钻石</small></span>
            <button class="ledger-delete" type="button" data-delete-record="${event.id}" aria-label="删除这条钻石记录">×</button>
          </article>
        `;
      })
      .join("");
  }

  function openLedger() {
    renderLedger();
    openSheet(elements.ledgerSheet);
  }

  async function deleteDiamondRecord(id) {
    const record = events.find((event) => event.id === id);
    if (!record) return;
    events = events.filter((event) => event.id !== id);
    for (const kind of ["chest", "diamond"]) {
      if (data.current[kind]?.eventId === id) {
        data.current[kind].eventId = "";
      }
      if (runtime.undo[kind]?.eventIds?.includes(id)) {
        runtime.undo[kind] = null;
      }
    }
    if (runtime.batchUndo?.eventIds?.includes(id)) {
      runtime.batchUndo = null;
    }
    picker = null;
    saveData();
    renderActionDock();
    renderStats();
    renderAssistant();
    renderLedger();
    showToast("钻石记录已删除");
    try {
      await deleteEvents([id]);
    } catch (error) {
      console.error(error);
    }
  }

  function renderIntervals() {
    const { chest, diamond } = data.settings.durations;
    elements.chestIntervalLabel.textContent = `每 ${chest} 分钟`;
    elements.diamondIntervalLabel.textContent = `每 ${diamond} 分钟`;
  }

  function renderThemeGrid() {
    if (!elements.themeGrid) return;
    elements.themeGrid.innerHTML = THEMES.map(
      (theme) => `
        <button class="theme-item${data.settings.theme === theme.id ? " active" : ""}" type="button" data-theme-id="${theme.id}">
          <span class="theme-swatch" style="--swatch:${theme.swatch}"></span>
          <span>${theme.name}</span>
        </button>
      `
    ).join("");
  }

  function renderAll() {
    applyTheme();
    renderDateHeader();
    renderProfile();
    renderIntervals();
    renderAvailability("chest");
    renderAvailability("diamond");
    renderActionDock();
    renderAssistant();
    renderStats();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2200);
  }

  function triggerButtonPress(button) {
    if (!button) return;
    button.classList.remove("is-pressing");
    void button.offsetWidth;
    button.classList.add("is-pressing");
    window.setTimeout(() => button.classList.remove("is-pressing"), 220);
  }

  function resizeCelebrationCanvas() {
    const canvas = elements.celebrationCanvas;
    if (!canvas) return null;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return context;
  }

  function updateCelebration(stepSeconds) {
    for (const particle of celebrationParticles) {
      particle.life -= stepSeconds;
      particle.vy += 760 * stepSeconds;
      particle.vx *= 0.994;
      particle.x += particle.vx * stepSeconds;
      particle.y += particle.vy * stepSeconds;
      particle.rotation += particle.rotationSpeed * stepSeconds;
      if (particle.kind === "spark") {
        particle.vx *= 0.988;
        particle.vy *= 0.992;
      }
    }
    celebrationParticles = celebrationParticles.filter(
      (particle) =>
        particle.life > 0 &&
        particle.y < window.innerHeight + 80 &&
        particle.x > -100 &&
        particle.x < window.innerWidth + 100
    );
  }

  function drawCelebration() {
    if (!celebrationContext) return;
    const context = celebrationContext;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const particle of celebrationParticles) {
      const fade = Math.min(1, particle.life / particle.maxLife * 2.2);
      context.save();
      context.globalAlpha = Math.max(0, fade);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (particle.kind === "spark") {
        context.shadowColor = particle.color;
        context.shadowBlur = 9;
        context.beginPath();
        context.arc(0, 0, particle.width, 0, Math.PI * 2);
        context.fill();
      } else {
        const squish = 0.35 + Math.abs(Math.cos(particle.rotation * 1.6)) * 0.65;
        context.fillRect(
          -particle.width / 2,
          (-particle.height / 2) * squish,
          particle.width,
          particle.height * squish
        );
      }
      context.restore();
    }
  }

  function celebrationLoop(timestamp) {
    const fixedStepMs = 1000 / 120;
    if (!celebrationLastTime) celebrationLastTime = timestamp;
    const elapsed = Math.min(100, timestamp - celebrationLastTime);
    celebrationLastTime = timestamp;
    celebrationAccumulator += elapsed;
    while (celebrationAccumulator >= fixedStepMs) {
      updateCelebration(fixedStepMs / 1000);
      celebrationAccumulator -= fixedStepMs;
    }
    drawCelebration();
    if (celebrationParticles.length) {
      celebrationFrame = window.requestAnimationFrame(celebrationLoop);
    } else {
      celebrationFrame = 0;
      celebrationLastTime = 0;
      celebrationAccumulator = 0;
    }
  }

  function launchCelebration(button) {
    if (!button) return;
    celebrationContext = resizeCelebrationCanvas();
    if (!celebrationContext) return;
    const rect = button.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height * 0.38;
    const accent = getComputedStyle(elements.html).getPropertyValue("--accent").trim() || "#2f7dff";
    const colors = [accent, "#ffffff", "#67dcff", "#ffd45f", "#ff82ad", "#60e2a8"];
    const count = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 58;

    for (let index = 0; index < count; index += 1) {
      const isSpark = index % 4 === 0;
      const angle = -Math.PI * (0.15 + Math.random() * 0.7);
      const speed = (isSpark ? 420 : 300) + Math.random() * 660;
      const maxLife = 0.85 + Math.random() * 0.8;
      celebrationParticles.push({
        x: originX + (Math.random() - 0.5) * rect.width * 0.42,
        y: originY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed * (0.55 + Math.random() * 0.55),
        vy: Math.sin(angle) * speed,
        width: isSpark ? 1.5 + Math.random() * 2 : 3 + Math.random() * 5,
        height: isSpark ? 0 : 7 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 13,
        color: colors[Math.floor(Math.random() * colors.length)],
        kind: isSpark ? "spark" : "ribbon",
        maxLife,
        life: maxLife,
      });
    }
    if (!celebrationFrame) celebrationFrame = window.requestAnimationFrame(celebrationLoop);
  }

  function makeClaim(kind, now) {
    const duration = clampDuration(data.settings.durations[kind], kind === "chest" ? 60 : 30);
    const id = uid(kind);
    const reward = 2;
    return {
      event: {
        id,
        type: kind,
        claimedAt: now,
        expectedAt: now + duration * 60000,
        duration,
        reward,
      },
      current: {
        claimedAt: now,
        expectedAt: now + duration * 60000,
        duration,
        reward,
        eventId: id,
      },
    };
  }

  async function claimSingle(kind, button) {
    const now = Date.now();
    const created = makeClaim(kind, now);
    if (diamondTotalInWindow([...events, created.event], now) > 6) {
      showToast("60 秒内最多记录 6 颗钻石，请稍后再试");
      return;
    }
    const previous = clone(data.current[kind]);
    data.current[kind] = created.current;
    events.push(created.event);
    runtime.batchUndo = null;
    runtime.undo[kind] = {
      previous,
      eventIds: [created.event.id],
      expiresAt: now + UNDO_MS,
    };
    runtime.undo[kind === "chest" ? "diamond" : "chest"] = null;
    picker = kind === "chest" ? "chest" : null;
    saveData();
    renderAll();
    launchCelebration(button);
    showToast(`已记录，预计 ${dateRelation(created.current.expectedAt)} ${formatTime(created.current.expectedAt)} 可领取`);
    try {
      await putEvent(created.event);
    } catch (error) {
      console.error(error);
      showToast("记录已保存在页面，但本地数据库写入失败");
    }
  }

  async function claimBoth(button) {
    const now = Date.now();
    const previous = {
      chest: clone(data.current.chest),
      diamond: clone(data.current.diamond),
    };
    const chestClaim = makeClaim("chest", now);
    const diamondClaim = makeClaim("diamond", now);
    if (diamondTotalInWindow([...events, chestClaim.event, diamondClaim.event], now) > 6) {
      showToast("60 秒内最多记录 6 颗钻石，请稍后再试");
      return;
    }
    data.current.chest = chestClaim.current;
    data.current.diamond = diamondClaim.current;
    events.push(chestClaim.event, diamondClaim.event);
    runtime.undo.chest = null;
    runtime.undo.diamond = null;
    runtime.batchUndo = {
      previous,
      eventIds: [chestClaim.event.id, diamondClaim.event.id],
      expiresAt: now + UNDO_MS,
    };
    picker = "chest";
    saveData();
    renderAll();
    launchCelebration(button);
    showToast("宝箱和钻石都已记录，宝箱收益默认按 2 钻石计算");
    try {
      await Promise.all([putEvent(chestClaim.event), putEvent(diamondClaim.event)]);
    } catch (error) {
      console.error(error);
      showToast("记录已保存在页面，但本地数据库写入失败");
    }
  }

  async function setChestReward(value) {
    const reward = [0, 1, 2].includes(Number(value)) ? Number(value) : 2;
    const current = data.current.chest;
    if (!current) return;
    const event = events.find((item) => item.id === current.eventId);
    const candidateEvents = events.map((item) =>
      item.id === current.eventId ? { ...item, reward } : item
    );
    if (diamondTotalInWindow(candidateEvents, Date.now()) > 6) {
      showToast("60 秒内最多记录 6 颗钻石，不能继续增加");
      return;
    }
    current.reward = reward;
    if (event) event.reward = reward;
    picker = null;
    saveData();
    renderActionDock();
    renderStats();
    showToast(`本次宝箱按 ${reward} 钻石记录`);
    if (event) {
      try {
        await putEvent(event);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function undoKind(kind) {
    const undo = runtime.undo[kind];
    if (!undo || Date.now() >= undo.expiresAt) {
      runtime.undo[kind] = null;
      renderActionDock();
      return;
    }
    data.current[kind] = undo.previous;
    events = events.filter((event) => !undo.eventIds.includes(event.id));
    runtime.undo[kind] = null;
    if (picker === kind) picker = null;
    saveData();
    renderAll();
    showToast("已回到上一个记录");
    try {
      await deleteEvents(undo.eventIds);
    } catch (error) {
      console.error(error);
    }
  }

  async function undoBatch() {
    const undo = runtime.batchUndo;
    if (!undo || Date.now() >= undo.expiresAt) {
      runtime.batchUndo = null;
      renderActionDock();
      return;
    }
    data.current.chest = undo.previous.chest;
    data.current.diamond = undo.previous.diamond;
    events = events.filter((event) => !undo.eventIds.includes(event.id));
    runtime.batchUndo = null;
    picker = null;
    saveData();
    renderAll();
    showToast("已回到两个奖励的上一次记录");
    try {
      await deleteEvents(undo.eventIds);
    } catch (error) {
      console.error(error);
    }
  }

  function openSheet(sheet) {
    sheet.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeSheet(sheet) {
    sheet.classList.remove("open");
    if (sheet === elements.profileSheet) {
      if (pendingAvatarUrl) {
        URL.revokeObjectURL(pendingAvatarUrl);
        pendingAvatarUrl = "";
      }
      pendingAvatarBlob = null;
      setAvatarSources(avatarUrl);
    }
    if (!$$(".sheet-backdrop.open").length) {
      document.body.style.overflow = "";
    }
  }

  function openProfile() {
    pendingAvatarBlob = null;
    if (pendingAvatarUrl) {
      URL.revokeObjectURL(pendingAvatarUrl);
      pendingAvatarUrl = "";
    }
    elements.nicknameInput.value = data.profile.nickname;
    setAvatarSources(avatarUrl);
    openSheet(elements.profileSheet);
  }

  function openSettings() {
    elements.chestDurationInput.value = String(data.settings.durations.chest);
    elements.diamondDurationInput.value = String(data.settings.durations.diamond);
    elements.darkModeToggle.checked = data.settings.dark;
    renderThemeGrid();
    openSheet(elements.settingsSheet);
  }

  async function compressAvatar(file) {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("请选择图片文件");
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("无法读取图片"));
        img.src = objectUrl;
      });
      const size = 256;
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - sourceSize) / 2;
      const sy = (image.naturalHeight - sourceSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("头像处理失败"))),
          "image/jpeg",
          0.86
        );
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function saveProfile() {
    const nickname =
      elements.nicknameInput.value.trim().slice(0, 16) || DEFAULT_NICKNAME;
    data.profile.nickname = nickname;
    if (pendingAvatarBlob) {
      try {
        await putMedia({ key: "avatar", blob: pendingAvatarBlob, type: pendingAvatarBlob.type });
        if (avatarUrl) URL.revokeObjectURL(avatarUrl);
        avatarUrl = URL.createObjectURL(pendingAvatarBlob);
        if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
        pendingAvatarUrl = "";
        pendingAvatarBlob = null;
      } catch (error) {
        console.error(error);
        showToast("头像保存失败，请重试");
        return;
      }
    }
    saveData();
    renderProfile();
    closeSheet(elements.profileSheet);
    showToast("个人资料已保存");
  }

  async function saveSettings() {
    data.settings.durations.chest = clampDuration(
      elements.chestDurationInput.value,
      data.settings.durations.chest
    );
    data.settings.durations.diamond = clampDuration(
      elements.diamondDurationInput.value,
      data.settings.durations.diamond
    );
    data.settings.dark = elements.darkModeToggle.checked;
    saveData();
    applyTheme();
    renderIntervals();
    closeSheet(elements.settingsSheet);
    showToast("设置已保存，新间隔从下次领取开始生效");
  }

  function copyTextSync(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.background = "transparent";
    textarea.style.fontSize = "16px";
    let copied = false;
    try {
      document.body.appendChild(textarea);
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, text.length);
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  async function copyText(text) {
    if (copyTextSync(text)) return true;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  function openQqGroupCard() {
    const userAgent = navigator.userAgent || "";
    const inQQ = /QQ\//i.test(userAgent) || /QQBrowser/i.test(userAgent);
    const inWeChat = /MicroMessenger/i.test(userAgent);
    const android = /Android/i.test(userAgent);
    const cardUrl =
      `mqqapi://card/show_pslcard?src_type=internal&version=1&uin=${QQ_GROUP_UIN}&card_type=group&source=qrcode`;
    const cardUrlExternal =
      `mqqapi://card/show_pslcard?src_type=internal&version=1&uin=${QQ_GROUP_UIN}&card_type=group&source=external`;
    const intentUrl =
      `intent://card/show_pslcard?src_type=internal&version=1&uin=${QQ_GROUP_UIN}&card_type=group&source=qrcode#Intent;scheme=mqqapi;package=com.tencent.mobileqq;end`;
    const primary = inQQ
      ? QQ_GROUP_JOIN_URL || cardUrl
      : inWeChat
        ? QQ_GROUP_JOIN_URL || cardUrl
        : android
          ? intentUrl
          : QQ_GROUP_JOIN_URL || cardUrl;
    const fallback = QQ_GROUP_JOIN_URL || (inQQ ? cardUrlExternal : cardUrl);
    let opened = false;

    const markOpened = () => {
      opened = true;
    };
    const openViaFrame = (url) => {
      const frame = document.createElement("iframe");
      frame.style.display = "none";
      frame.src = url;
      document.body.appendChild(frame);
      window.setTimeout(() => frame.remove(), 900);
    };
    const openViaLink = (url) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => link.remove(), 900);
    };

    window.addEventListener("pagehide", markOpened, { once: true });
    window.addEventListener("blur", markOpened, { once: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) markOpened();
      },
      { once: true }
    );

    try {
      window.location.href = primary;
    } catch (error) {
      openViaFrame(primary);
    }

    window.setTimeout(() => {
      if (opened || document.hidden) return;
      if (inWeChat && !QQ_GROUP_JOIN_URL) {
        showToast("微信内无法直接跳转 QQ，请用浏览器打开");
        return;
      }
      try {
        if (inQQ) openViaFrame(fallback);
        else if (android) window.location.href = fallback;
        else openViaLink(fallback);
      } catch (error) {
        // Ignore browser scheme restrictions after the automatic fallback.
      }
    }, 700);
  }

  async function joinQqGroup() {
    const copied = await copyText(QQ_GROUP_UIN);
    if (!copied) {
      showToast("复制失败，请长按群号手动复制");
      return;
    }
    closeSheet(elements.qqGroupSheet);
    showToast("QQ群号已复制，正在打开群名片");
    openQqGroupCard();
  }

  async function resetAllData() {
    if (!window.confirm("将清空昵称、头像、设置和全部领取记录，且无法撤销。确定继续吗？")) {
      return;
    }
    try {
      await Promise.all([clearEvents(), clearMedia()]);
      localStorage.removeItem(STORAGE_KEY);
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      window.location.reload();
    } catch (error) {
      console.error(error);
      showToast("清空失败，请关闭页面后重新尝试");
    }
  }

  async function loadAvatar() {
    try {
      const avatar = await getMedia("avatar");
      if (avatar?.blob) {
        avatarUrl = URL.createObjectURL(avatar.blob);
        setAvatarSources(avatarUrl);
      }
    } catch (error) {
      console.warn("无法读取头像。", error);
    }
  }

  function updateUndoTimers() {
    let needsRender = false;
    for (const kind of ["chest", "diamond"]) {
      const undo = runtime.undo[kind];
      if (!undo) continue;
      if (Date.now() >= undo.expiresAt) {
        runtime.undo[kind] = null;
        needsRender = true;
      } else {
        const counter = document.querySelector(`[data-undo-kind="${kind}"] span`);
        if (counter) counter.textContent = String(remainingSeconds(undo.expiresAt));
      }
    }
    if (runtime.batchUndo) {
      if (Date.now() >= runtime.batchUndo.expiresAt) {
        runtime.batchUndo = null;
        needsRender = true;
      } else {
        const counter = document.querySelector("[data-undo-batch] span");
        if (counter) counter.textContent = String(remainingSeconds(runtime.batchUndo.expiresAt));
      }
    }
    if (needsRender) renderActionDock();
  }

  async function promptInstall() {
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      showToast("当前已经在桌面应用模式中");
      return;
    }
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (choice.outcome === "accepted") {
        showToast("已开始安装");
      }
      return;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      showToast("Safari：点分享按钮，再选择“添加到主屏幕”");
    } else {
      showToast("浏览器菜单：选择“安装应用”或“添加到主屏幕”");
    }
  }

  function bindEvents() {
    $$("[data-claim]").forEach((button) => {
      button.addEventListener("click", () => {
        triggerButtonPress(button);
        claimSingle(button.dataset.claim, button);
      });
    });
    elements.claimBothBtn.addEventListener("click", () => {
      triggerButtonPress(elements.claimBothBtn);
      claimBoth(elements.claimBothBtn);
    });

    document.addEventListener("click", (event) => {
      const quantity = event.target.closest("[data-quantity]");
      if (quantity) {
        setChestReward(quantity.dataset.quantity);
        return;
      }
      const undoKindButton = event.target.closest("[data-undo-kind]");
      if (undoKindButton) {
        undoKind(undoKindButton.dataset.undoKind);
        return;
      }
      if (event.target.closest("[data-undo-batch]")) {
        undoBatch();
        return;
      }
      const deleteRecordButton = event.target.closest("[data-delete-record]");
      if (deleteRecordButton) {
        deleteDiamondRecord(deleteRecordButton.dataset.deleteRecord);
      }
    });

    $$(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        runtime.period = button.dataset.period;
        $$(".segment").forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
        });
        renderStats();
      });
    });

    $("#profileBtn").addEventListener("click", openProfile);
    $("#avatarPickBtn").addEventListener("click", () => elements.avatarInput.click());
    $("#settingsBtn").addEventListener("click", openSettings);
    $("#ledgerBtn").addEventListener("click", openLedger);
    $("#qqGroupBtn").addEventListener("click", () => openSheet(elements.qqGroupSheet));
    $("#qqCopyBtn").addEventListener("click", (event) => {
      triggerButtonPress(event.currentTarget);
      joinQqGroup();
    });

    elements.avatarInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        pendingAvatarBlob = await compressAvatar(file);
        if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
        pendingAvatarUrl = URL.createObjectURL(pendingAvatarBlob);
        setAvatarSources(pendingAvatarUrl);
      } catch (error) {
        showToast(error.message || "头像处理失败");
      }
    });

    $("#saveProfileBtn").addEventListener("click", saveProfile);
    $("#saveSettingsBtn").addEventListener("click", saveSettings);
    $("#resetBtn").addEventListener("click", resetAllData);
    elements.installBtn.addEventListener("click", promptInstall);

    elements.themeGrid.addEventListener("click", (event) => {
      const item = event.target.closest("[data-theme-id]");
      if (!item) return;
      data.settings.theme = item.dataset.themeId;
      saveData();
      applyTheme();
    });

    elements.darkModeToggle.addEventListener("change", () => {
      data.settings.dark = elements.darkModeToggle.checked;
      saveData();
      applyTheme();
    });

    $$("[data-close-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        closeSheet(document.getElementById(button.dataset.closeSheet));
      });
    });

    [
      elements.profileSheet,
      elements.settingsSheet,
      elements.qqGroupSheet,
      elements.ledgerSheet,
    ].forEach((backdrop) => {
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) closeSheet(backdrop);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        $$(".sheet-backdrop.open").forEach(closeSheet);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        renderAvailability("chest");
        renderAvailability("diamond");
        renderAssistant();
        renderStats();
      }
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

    const register = () => {
      navigator.serviceWorker
        .register("./sw.js?v=7", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch((error) => {
          console.warn("Service Worker 注册失败。", error);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }

  async function init() {
    applyTheme();
    bindEvents();
    registerServiceWorker();
    try {
      events = await getAllEvents();
    } catch (error) {
      console.warn("无法读取领取记录。", error);
      showToast("本地数据库暂不可用，请确认浏览器没有禁用存储");
    }
    await loadAvatar();
    renderAll();
    window.setInterval(updateUndoTimers, 250);
    window.setInterval(() => {
      renderDateHeader();
      renderAvailability("chest");
      renderAvailability("diamond");
      renderAssistant();
    }, 30000);

  }

  init();
})();
