(() => {
  "use strict";

  const STORAGE_KEY = "sg2-diamond-journal-v1";
  const DB_NAME = "sg2-diamond-journal";
  const DB_VERSION = 1;
  const DATA_VERSION = 3;
  const UNDO_MS = 5000;
  const DEFAULT_NICKNAME = "像素冒险者";
  const QQ_GROUP_UIN = "1124909778";
  const QQ_GROUP_JOIN_URL =
    "https://qun.qq.com/universal-share/share?ac=1&authKey=NcYpwsw0uyoFEvfs9K2U0pbty1aFJLvkQXB1WnvvOnZCPSvzCZwEphqSlFLl6wyi&busi_data=eyJncm91cENvZGUiOiIxMTI0OTA5Nzc4IiwidG9rZW4iOiJXQUZ6VVRtQmJOMnNJTTFiN2I0S2hQR1JiclgwVksxTWROSi8wVldZVmR6a016RFpNNjM5NTU0Q2hUdmFPN0tsIiwidWluIjoiMTYzNDM2NTAxOCJ9&data=RAJFbnazxsLdojQkwFPLDWRy45IJE61AEZPZvLGCa1pr1G0BoThgG3AXuHnVre6ylk5h6p8rtADBwgggG83gBA&svctype=4&tempid=h5_group_info";
  const NOTIFICATION_LABELS = {
    chest: { title: "宝箱可以领取了", action: "回到手账记录宝箱" },
    diamond: { title: "钻石奖励可以领取了", action: "回到手账领取钻石" },
  };
  const EXTRA_SOURCES = [
    {
      id: "boss",
      name: "BOSS",
      reward: 1,
      icon: "./assets/source-boss.png",
      rateLimit: { windowMs: 5000, max: 2 },
    },
    {
      id: "seed",
      name: "种子",
      reward: 1,
      icon: "./assets/source-seed.png",
      rateLimit: { windowMs: 5000, max: 2 },
    },
    {
      id: "bonus-chest",
      name: "宝箱",
      reward: 1,
      icon: "./assets/source-chest.png",
      rateLimit: { windowMs: 5000, max: 2 },
    },
    {
      id: "daily-task",
      name: "每日任务",
      reward: 5,
      icon: "./assets/task-icon.svg",
      dailyLimit: 1,
    },
    {
      id: "character-card",
      name: "角色卡合成",
      reward: 1,
      icon: "./assets/source-character-card.png",
    },
    {
      id: "daily-gift",
      name: "天天送礼物",
      reward: 1,
      icon: "./assets/source-daily-gift.png",
      dailyLimit: 2,
    },
  ];
  const EXTRA_SOURCE_BY_ID = new Map(EXTRA_SOURCES.map((source) => [source.id, source]));
  const ASSISTANT_MESSAGES = {
    empty: [
      "手账已经准备好了。领完奖励后点一下“下一个”，今天的第一颗钻石就从这里开始。",
      "今天的冒险刚刚开始，先去看看宝箱和钻石奖励吧。",
      "别急着错过刷新时间，先把下一次领取记进手账里。",
      "今天还没有记录，不过没关系，从第一笔开始就很棒。",
    ],
    starting: [
      "已经有 {total} 颗钻石入账了，小收获也算数，保持自己的节奏。",
      "第一段进度已经写进手账，今天开了个好头。",
      "今天已经收获 {total} 颗钻石，接下来慢慢来就好。",
      "领取记录已经开始了，每一次小积累都会留在你的手账里。",
    ],
    steady: [
      "今天已经收获 {total} 颗钻石，状态正在稳步上升。",
      "目前的收获是 {total} 颗钻石，宝箱和每日任务都别忘了看看。",
      "节奏不错，已经拿到 {total} 颗钻石了，继续保持。",
      "每一次领取都在积累，今天的 {total} 颗钻石已经记好了。",
    ],
    strong: [
      "今天已经收获 {total} 颗钻石，领取节奏很稳，也记得适当休息一下。",
      "手账里的钻石来到了 {total} 颗，今天的冒险收获相当不错。",
      "已经攒下 {total} 颗钻石了，按自己的节奏继续探索吧。",
      "今天的进度很扎实，{total} 颗钻石已经成为你的记录。",
    ],
    excellent: [
      "今天已经收获 {total} 颗钻石，效率和坚持都在线。",
      "{total} 颗钻石入账，今天的手账已经很丰富了。",
      "今天的收获达到 {total} 颗钻石，给自己一点掌声吧。",
      "今天的冒险成果是 {total} 颗钻石，继续保持轻松的心态。",
    ],
    peak: [
      "今天已经收获 {total} 颗钻石，这是一份很漂亮的成绩，也别忘了休息。",
      "{total} 颗钻石，今天的你已经把每一次机会都认真记下来了。",
      "手账今天格外充实：{total} 颗钻石。接下来的时间也按自己的节奏来。",
      "今天的 {total} 颗钻石已经收入手账，做得很好，下一颗也顺其自然。",
    ],
  };

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
    formulaTotal: $("#formulaTotal"),
    sourceDiamonds: $("#sourceDiamonds"),
    dailyTaskSlot: $("#dailyTaskSlot"),
    sourceGrid: $("#sourceGrid"),
    profileSheet: $("#profileSheet"),
    settingsSheet: $("#settingsSheet"),
    qqGroupSheet: $("#qqGroupSheet"),
    ledgerSheet: $("#ledgerSheet"),
    ledgerTitle: $("#ledgerTitle"),
    ledgerSummary: $("#ledgerSummary"),
    ledgerList: $("#ledgerList"),
    celebrationCanvas: $("#celebrationCanvas"),
    rewardFlightLayer: $("#rewardFlightLayer"),
    rewardTotalFloat: $("#rewardTotalFloat"),
    rewardTotalValue: $("#rewardTotalValue"),
    rewardTotalGain: $("#rewardTotalGain"),
    sourceUndoToast: $("#sourceUndoToast"),
    sourceUndoText: $("#sourceUndoText"),
    sourceUndoBtn: $("#sourceUndoBtn"),
    profileAvatarImage: $("#profileAvatarImage"),
    profileAvatarFallback: $("#profileAvatarFallback"),
    pageAvatarImage: $("#pageAvatarImage"),
    pageAvatarFallback: $("#pageAvatarFallback"),
    pageNickname: $("#pageNickname"),
    pageTodayLabel: $("#pageTodayLabel"),
    nicknameInput: $("#nicknameInput"),
    avatarInput: $("#avatarInput"),
    chestDurationInput: $("#chestDurationInput"),
    diamondDurationInput: $("#diamondDurationInput"),
    darkModeToggle: $("#darkModeToggle"),
    dailyTaskVisibilityToggle: $("#dailyTaskVisibilityToggle"),
    notificationSettings: $("#notificationSettings"),
    notificationToggle: $("#notificationToggle"),
    notificationStatus: $("#notificationStatus"),
    notificationHint: $("#notificationHint"),
    testNotificationBtn: $("#testNotificationBtn"),
    themeGrid: $("#themeGrid"),
    installBtn: $("#installBtn"),
    toast: $("#toast"),
    dailyStrip: $("#dailyStrip"),
    trendChart: $("#trendChart"),
    trendEmpty: $("#trendEmpty"),
    trendAverage: $("#trendAverage"),
    trendAverageLabel: $("#trendAverageLabel"),
    trendBest: $("#trendBest"),
    trendStreak: $("#trendStreak"),
    trendAnalysis: $("#trendAnalysis"),
    trendEyebrow: $("#trendEyebrow"),
    chartHint: $("#chartHint"),
    pointDate: $("#pointDate"),
    pointTotal: $("#pointTotal"),
    pointChest: $("#pointChest"),
    pointDiamond: $("#pointDiamond"),
    pointExtra: $("#pointExtra"),
    pointDelta: $("#pointDelta"),
    companionDays: $("#companionDays"),
    companionTotal: $("#companionTotal"),
    yearReviewSheet: $("#yearReviewSheet"),
    yearReviewSheetBody: $("#yearReviewSheet .sheet"),
    yearReviewYear: $("#yearReviewYear"),
    yearTotal: $("#yearTotal"),
    yearRangeLabel: $("#yearRangeLabel"),
    yearActiveDays: $("#yearActiveDays"),
    yearRecordCount: $("#yearRecordCount"),
    yearBestMonth: $("#yearBestMonth"),
    yearSourceBreakdown: $("#yearSourceBreakdown"),
    yearMonthListView: $("#yearMonthListView"),
    yearMonthList: $("#yearMonthList"),
    yearMonthDetail: $("#yearMonthDetail"),
    yearMonthTitle: $("#yearMonthTitle"),
    yearMonthTotal: $("#yearMonthTotal"),
    yearMonthActiveDays: $("#yearMonthActiveDays"),
    yearMonthBestDay: $("#yearMonthBestDay"),
    yearMonthCount: $("#yearMonthCount"),
    yearMonthChart: $("#yearMonthChart"),
    yearMonthChartEmpty: $("#yearMonthChartEmpty"),
    yearMonthSourceBreakdown: $("#yearMonthSourceBreakdown"),
    exportReportSheet: $("#exportReportSheet"),
    exportMonthFields: $("#exportMonthFields"),
    exportYearSelect: $("#exportYearSelect"),
    exportMonthSelect: $("#exportMonthSelect"),
    exportRangeLabel: $("#exportRangeLabel"),
    exportRangeDates: $("#exportRangeDates"),
    exportPreviewTotal: $("#exportPreviewTotal"),
    exportMockTotal: $("#exportMockTotal"),
    exportMockDays: $("#exportMockDays"),
    exportMockRecords: $("#exportMockRecords"),
    generateReportBtn: $("#generateReportBtn"),
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
  let serviceWorkerRegistration = null;
  let notificationTimer = 0;
  let sourceCooldownTimer = 0;
  let sourceRenderTimer = 0;
  let rewardTotalTimer = 0;
  let sourceUndoTimer = 0;
  let sourceUndoState = null;

  const runtime = {
    undo: { chest: null, diamond: null },
    batchUndo: null,
    period: "day",
    selectedDayOffset: 0,
    trendRange: 7,
    reviewYear: new Date().getFullYear(),
    reviewMonth: null,
    exportRange: "day",
    notificationPending: new Set(),
    assistantKey: "",
  };

  function defaultData() {
    return {
      version: DATA_VERSION,
      profile: { nickname: DEFAULT_NICKNAME, startedAt: null },
      settings: {
        theme: "blue",
        dark: false,
        notifications: false,
        showDailyTask: true,
        durations: { chest: 70, diamond: 45 },
      },
      current: { chest: null, diamond: null },
      sourceRate: { boss: [], seed: [], "bonus-chest": [] },
    };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeData(input) {
    const fallback = defaultData();
    const source = input && typeof input === "object" ? input : {};
    const sourceVersion = Number(source.version) || 1;
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
      sourceRate: { ...fallback.sourceRate, ...(source.sourceRate || {}) },
    };

    result.profile.nickname =
      String(result.profile.nickname || "").trim().slice(0, 16) || DEFAULT_NICKNAME;
    const startedAt = Number(result.profile.startedAt);
    result.profile.startedAt = Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null;
    if (!THEMES.some((theme) => theme.id === result.settings.theme)) {
      result.settings.theme = "blue";
    }
    result.settings.dark = Boolean(result.settings.dark);
    result.settings.notifications = Boolean(result.settings.notifications);
    result.settings.showDailyTask = result.settings.showDailyTask !== false;
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
          notificationSentFor: Number(current.notificationSentFor) || 0,
        };
      }
    }
    if (sourceVersion < 2) {
      if (Number(result.settings.durations.chest) === 60) {
        result.settings.durations.chest = 70;
      }
      if (Number(result.settings.durations.diamond) === 30) {
        result.settings.durations.diamond = 45;
      }
      result.version = DATA_VERSION;
    }
    if (sourceVersion < DATA_VERSION) {
      result.version = DATA_VERSION;
    }
    for (const extraSource of EXTRA_SOURCES) {
      if (!extraSource.rateLimit) continue;
      const timestamps = Array.isArray(result.sourceRate[extraSource.id])
        ? result.sourceRate[extraSource.id]
        : [];
      result.sourceRate[extraSource.id] = timestamps
        .map(Number)
        .filter(Number.isFinite)
        .slice(-extraSource.rateLimit.max);
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

  function dayStartForOffset(offset = 0) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    return date.getTime();
  }

  function periodRange(period, dayOffset = runtime.selectedDayOffset) {
    const now = Date.now();
    if (period === "day") {
      const start = dayStartForOffset(dayOffset);
      return { start, end: start + 86400000 };
    }
    return { start: dateStartFor(period), end: now + 1 };
  }

  function eventReward(event) {
    const reward = Number(event?.reward);
    if (Number.isFinite(reward)) return reward;
    return event?.type === "diamond" ? 2 : 1;
  }

  function sourceForEvent(event) {
    return event?.type === "source" ? EXTRA_SOURCE_BY_ID.get(event.sourceId) || null : null;
  }

  const SOURCE_CATEGORY_META = [
    { key: "chest", name: "宝箱奖励", colorIndex: 0 },
    { key: "diamond", name: "钻石奖励", colorIndex: 1 },
    { key: "daily-task", name: "每日任务", colorIndex: 2 },
    { key: "boss", name: "BOSS", colorIndex: 3 },
    { key: "seed", name: "种子", colorIndex: 4 },
    { key: "bonus-chest", name: "额外宝箱", colorIndex: 5 },
    { key: "character-card", name: "角色卡合成", colorIndex: 6 },
    { key: "daily-gift", name: "天天送礼物", colorIndex: 7 },
    { key: "other", name: "其他来源", colorIndex: 8 },
  ];
  const SOURCE_CATEGORY_BY_KEY = new Map(
    SOURCE_CATEGORY_META.map((category) => [category.key, category])
  );

  function eventCategory(event) {
    let key = "other";
    if (event?.type === "chest") key = "chest";
    else if (event?.type === "diamond") key = "diamond";
    else if (event?.type === "source") key = String(event.sourceId || "other");
    if (!SOURCE_CATEGORY_BY_KEY.has(key)) key = "other";
    return SOURCE_CATEGORY_BY_KEY.get(key);
  }

  function localDayNumber(timestamp) {
    const date = new Date(timestamp);
    return Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
    );
  }

  function localDayStart(timestamp = Date.now()) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function localMonthRange(year, monthIndex) {
    return {
      start: new Date(year, monthIndex, 1).getTime(),
      end: new Date(year, monthIndex + 1, 1).getTime(),
    };
  }

  function localYearRange(year) {
    return {
      start: new Date(year, 0, 1).getTime(),
      end: new Date(year + 1, 0, 1).getTime(),
    };
  }

  function summarizeEventRange(sourceEvents, start, end) {
    const rangeEvents = eventsInRange(sourceEvents, { start, end });
    const activeDays = new Set();
    const byDay = new Map();
    const bySource = new Map(
      SOURCE_CATEGORY_META.map((category) => [
        category.key,
        { ...category, total: 0, count: 0 },
      ])
    );

    for (const event of rangeEvents) {
      const reward = eventReward(event);
      const day = localDayNumber(event.claimedAt);
      const category = eventCategory(event);
      const categoryRow = bySource.get(category.key);
      categoryRow.total += reward;
      categoryRow.count += 1;
      activeDays.add(day);
      const dayRow = byDay.get(day) || { day, total: 0, count: 0 };
      dayRow.total += reward;
      dayRow.count += 1;
      byDay.set(day, dayRow);
    }

    const days = [...byDay.values()].sort((a, b) => a.day - b.day);
    const total = rangeEvents.reduce((sum, event) => sum + eventReward(event), 0);
    return {
      events: rangeEvents,
      total,
      count: rangeEvents.length,
      activeDays: activeDays.size,
      bestDay: days.reduce(
        (best, day) => (!best || day.total > best.total ? day : best),
        null
      ),
      bySource: [...bySource.values()],
    };
  }

  function dailySeries(start, end, includeEmpty = true) {
    const first = new Date(start);
    first.setHours(0, 0, 0, 0);
    const last = new Date(end - 1);
    last.setHours(0, 0, 0, 0);
    const points = [];
    for (
      let cursor = first.getTime();
      cursor <= last.getTime();
      cursor = new Date(
        new Date(cursor).getFullYear(),
        new Date(cursor).getMonth(),
        new Date(cursor).getDate() + 1
      ).getTime()
    ) {
      const next = new Date(
        new Date(cursor).getFullYear(),
        new Date(cursor).getMonth(),
        new Date(cursor).getDate() + 1
      ).getTime();
      const summary = summarizeEventRange(events, cursor, next);
      if (includeEmpty || summary.count) {
        points.push({
          start: cursor,
          label: `${new Date(cursor).getMonth() + 1}/${new Date(cursor).getDate()}`,
          total: summary.total,
          count: summary.count,
        });
      }
    }
    return points;
  }

  function hourlySeries(start, end) {
    const firstHour = localDayStart(start);
    return Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(firstHour);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(firstHour);
      hourEnd.setHours(hour + 1, 0, 0, 0);
      const summary = summarizeEventRange(
        events,
        Math.max(start, hourStart.getTime()),
        Math.min(end, hourEnd.getTime())
      );
      return {
        start: hourStart.getTime(),
        label: `${String(hour).padStart(2, "0")}:00`,
        total: summary.total,
        count: summary.count,
      };
    });
  }

  function monthlySeries(year) {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const range = localMonthRange(year, monthIndex);
      const summary = summarizeEventRange(events, range.start, Math.min(range.end, Date.now() + 1));
      return {
        start: range.start,
        label: `${monthIndex + 1}月`,
        total: summary.total,
        count: summary.count,
        activeDays: summary.activeDays,
      };
    });
  }

  function formatRangeDate(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(timestamp));
  }

  function extraSourceIconMarkup(source) {
    if (source.icon) {
      return `<img src="${source.icon}" alt="" />`;
    }
    return `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 12h22v15H5zM3.5 8.5h25V13h-25zM16 8.5V27M16 8.5c-5.5 0-8-2-6.5-4.5C11 1.5 15 2.5 16 8.5Zm0 0c5.5 0 8-2 6.5-4.5C21 1.5 17 2.5 16 8.5Z" />
      </svg>
    `;
  }

  function eventsInRange(sourceEvents, range) {
    return sourceEvents.filter(
      (event) =>
        Number(event.claimedAt) >= range.start && Number(event.claimedAt) < range.end
    );
  }

  function trendDays(range = runtime.trendRange) {
    return Array.from({ length: range }, (_, index) => {
      const offset = range - 1 - index;
      const start = dayStartForOffset(offset);
      const dayEvents = eventsInRange(events, { start, end: start + 86400000 });
      return {
        offset,
        start,
        total: dayEvents.reduce((sum, event) => sum + eventReward(event), 0),
        count: dayEvents.length,
      };
    });
  }

  function dayDetail(day) {
    const start = day.start;
    const dayEvents = eventsInRange(events, { start, end: start + 86400000 });
    return {
      chest: dayEvents
        .filter((event) => event.type === "chest")
        .reduce((sum, event) => sum + eventReward(event), 0),
      diamond: dayEvents
        .filter((event) => event.type === "diamond")
        .reduce((sum, event) => sum + eventReward(event), 0),
      extra: dayEvents
        .filter((event) => event.type === "source")
        .reduce((sum, event) => sum + eventReward(event), 0),
    };
  }

  function consecutiveRecordDays() {
    let count = 0;
    for (let offset = 0; offset < 366; offset += 1) {
      const start = dayStartForOffset(offset);
      const hasRecord = events.some(
        (event) =>
          Number(event.claimedAt) >= start && Number(event.claimedAt) < start + 86400000
      );
      if (!hasRecord) break;
      count += 1;
    }
    return count;
  }

  function renderPointDetail(days) {
    const selected =
      days.find((day) => day.offset === runtime.selectedDayOffset) || days[days.length - 1];
    const detail = dayDetail(selected);
    const previousStart = selected.start - 86400000;
    const previousEvents = eventsInRange(events, {
      start: previousStart,
      end: previousStart + 86400000,
    });
    const previousTotal = previousEvents.reduce((sum, event) => sum + eventReward(event), 0);
    const delta = selected.total - previousTotal;
    const dateLabel = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(new Date(selected.start));

    elements.pointDate.textContent = selected.offset === 0 ? `今天 · ${dateLabel}` : dateLabel;
    elements.pointTotal.innerHTML = `${selected.total} <small>钻石</small>`;
    elements.pointChest.textContent = String(detail.chest);
    elements.pointDiamond.textContent = String(detail.diamond);
    elements.pointExtra.textContent = String(detail.extra);
    elements.pointDelta.textContent =
      delta > 0
        ? `较前一天 +${delta}`
        : delta < 0
          ? `较前一天 ${delta}`
          : "与前一天持平";
  }

  function renderCompanionStrip() {
    const startedAt =
      Number(data.profile.startedAt) || Number(events[0]?.claimedAt) || Date.now();
    const days = Math.max(
      1,
      localDayNumber(Date.now()) - localDayNumber(startedAt) + 1
    );
    const total = events.reduce((sum, event) => sum + eventReward(event), 0);
    elements.companionDays.textContent = String(days);
    elements.companionTotal.textContent = String(total);
  }

  function sourceBreakdownMarkup(summary, { compact = false } = {}) {
    const denominator = Math.max(1, summary.total);
    const rows = summary.bySource.filter(
      (source) => source.count > 0 || ["chest", "diamond", "daily-task"].includes(source.key)
    );
    return rows
      .sort((a, b) => b.total - a.total)
      .map((source) => {
        const percentage = summary.total ? Math.round((source.total / denominator) * 100) : 0;
        return `
          <div class="year-source-row${compact ? " compact" : ""}">
            <span class="year-source-dot" style="--source-color:color-mix(in srgb, var(--accent) ${Math.max(24, 86 - source.colorIndex * 8)}%, #74a7ff)"></span>
            <span class="year-source-name">${source.name}</span>
            <strong>${source.total}<small>颗</small></strong>
            <span class="year-source-percent">${percentage}%</span>
            <i style="--source-width:${percentage}%"></i>
          </div>
        `;
      })
      .join("");
  }

  function reviewYearBounds() {
    const currentYear = new Date().getFullYear();
    const earliest = events.length
      ? new Date(Number(events[0].claimedAt)).getFullYear()
      : currentYear;
    return { min: Math.min(earliest, currentYear), max: currentYear };
  }

  function renderYearReview() {
    const year = runtime.reviewYear;
    const range = localYearRange(year);
    const summary = summarizeEventRange(events, range.start, Math.min(range.end, Date.now() + 1));
    const months = monthlySeries(year);
    const bounds = reviewYearBounds();
    const bestMonth = months.reduce(
      (best, month) => (!best || month.total > best.total ? month : best),
      null
    );

    elements.yearReviewYear.textContent = String(year);
    elements.yearTotal.textContent = String(summary.total);
    elements.yearRangeLabel.textContent = `${year} 年度累计收获`;
    elements.yearActiveDays.textContent = String(summary.activeDays);
    elements.yearRecordCount.textContent = String(summary.count);
    elements.yearBestMonth.textContent =
      bestMonth?.total > 0 ? bestMonth.label : "—";
    elements.yearSourceBreakdown.innerHTML = sourceBreakdownMarkup(summary);

    $$("[data-year-step]").forEach((button) => {
      const nextYear = year + Number(button.dataset.yearStep);
      button.disabled = nextYear < bounds.min || nextYear > bounds.max;
    });

    const maxMonth = Math.max(1, ...months.map((month) => month.total));
    elements.yearMonthList.innerHTML = months
      .map((month, index) => {
        const future = month.start > Date.now();
        const width = Math.round((month.total / maxMonth) * 100);
        return `
          <button class="year-month-row" type="button" data-review-month="${index}" ${future ? "disabled" : ""}>
            <span class="year-month-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="year-month-copy">
              <strong>${month.label}</strong>
              <small>${month.count ? `${month.count} 次记录 · ${month.activeDays} 天活跃` : "暂无记录"}</small>
              <i style="--month-width:${width}%"></i>
            </span>
            <span class="year-month-value">${month.total}<small>钻石</small></span>
            <span class="year-month-arrow">›</span>
          </button>
        `;
      })
      .join("");

    const showingMonth = runtime.reviewMonth !== null;
    elements.yearMonthListView.hidden = showingMonth;
    elements.yearMonthDetail.hidden = !showingMonth;
    if (showingMonth) renderYearMonthDetail();
  }

  function renderYearMonthDetail() {
    const monthIndex = runtime.reviewMonth;
    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return;
    const range = localMonthRange(runtime.reviewYear, monthIndex);
    const summary = summarizeEventRange(events, range.start, Math.min(range.end, Date.now() + 1));
    const days = dailySeries(range.start, Math.min(range.end, Date.now() + 1));
    const bestDay = summary.bestDay
      ? new Date(summary.bestDay.day * 86400000).getUTCDate()
      : null;

    elements.yearMonthTitle.textContent = `${runtime.reviewYear} 年 ${monthIndex + 1} 月`;
    elements.yearMonthTotal.textContent = String(summary.total);
    elements.yearMonthActiveDays.textContent = String(summary.activeDays);
    elements.yearMonthBestDay.textContent = bestDay ? `${bestDay}日` : "—";
    elements.yearMonthCount.textContent = String(summary.count);
    elements.yearMonthSourceBreakdown.innerHTML = sourceBreakdownMarkup(summary, {
      compact: true,
    });
    elements.yearMonthChartEmpty.hidden = summary.count > 0;
    elements.yearMonthChart.hidden = summary.count === 0;
    if (summary.count > 0) {
      window.requestAnimationFrame(() => drawMonthChart(days));
    }
  }

  function drawMonthChart(days) {
    const canvas = elements.yearMonthChart;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = rect.width;
    const height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#2f7dff";
    const muted = styles.getPropertyValue("--muted").trim() || "#71839b";
    const line = styles.getPropertyValue("--line").trim() || "rgba(62,124,199,.14)";
    const surface = styles.getPropertyValue("--surface-solid").trim() || "#ffffff";
    const maxValue = Math.max(4, ...days.map((day) => day.total));
    const ceiling = Math.ceil(maxValue / 4) * 4;
    const plot = { left: 27, right: width - 7, top: 12, bottom: height - 24 };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    const xFor = (index) =>
      plot.left + (plotWidth * index) / Math.max(1, days.length - 1);
    const yFor = (value) => plot.bottom - (plotHeight * value) / ceiling;

    context.font = '8px -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif';
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = muted;
    context.strokeStyle = line;
    context.lineWidth = 1;
    for (let step = 0; step <= 4; step += 1) {
      const value = (ceiling / 4) * step;
      const y = yFor(value);
      context.beginPath();
      context.setLineDash([3, 5]);
      context.moveTo(plot.left, y);
      context.lineTo(plot.right, y);
      context.stroke();
      context.fillText(String(Math.round(value)), plot.left - 6, y);
    }
    context.setLineDash([]);

    const points = days.map((day, index) => ({
      x: xFor(index),
      y: yFor(day.total),
      total: day.total,
      index,
    }));
    const gradient = context.createLinearGradient(0, plot.top, 0, plot.bottom);
    gradient.addColorStop(0, colorMix(accent, surface, 0.2));
    gradient.addColorStop(1, colorMix(accent, surface, 0.96));
    context.beginPath();
    context.moveTo(points[0].x, plot.bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points[points.length - 1].x, plot.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.globalAlpha = 0.46;
    context.fill();
    context.globalAlpha = 1;

    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.strokeStyle = accent;
    context.lineWidth = 2.4;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, point.total > 0 ? 2.4 : 1.7, 0, Math.PI * 2);
      context.fillStyle = point.total > 0 ? accent : surface;
      context.fill();
      context.strokeStyle = accent;
      context.lineWidth = 1.4;
      context.stroke();
    });

    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = muted;
    days.forEach((day, index) => {
      if (index !== 0 && index !== days.length - 1 && (index + 1) % 5 !== 0) return;
      context.fillText(`${index + 1}日`, xFor(index), plot.bottom + 8);
    });
  }

  function openYearReview() {
    runtime.reviewYear = new Date().getFullYear();
    runtime.reviewMonth = null;
    renderYearReview();
    openSheet(elements.yearReviewSheet);
  }

  function selectReviewMonth(monthIndex) {
    runtime.reviewMonth = monthIndex;
    renderYearReview();
    elements.yearReviewSheetBody.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeYearMonthDetail() {
    runtime.reviewMonth = null;
    renderYearReview();
    elements.yearReviewSheetBody.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildExportModel(rangeType = runtime.exportRange) {
    const now = new Date();
    const nowTime = now.getTime();
    let start;
    let end;
    let label;
    let detailLabel;

    if (rangeType === "week") {
      start = dateStartFor("week");
      end = nowTime + 1;
      label = "本周数据";
      detailLabel = "本周一至今天";
    } else if (rangeType === "month") {
      start = dateStartFor("month");
      end = nowTime + 1;
      label = "本月数据";
      detailLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
    } else if (rangeType === "custom-month") {
      const year = Number(elements.exportYearSelect.value) || now.getFullYear();
      const monthIndex = Math.max(0, Math.min(11, Number(elements.exportMonthSelect.value)));
      const range = localMonthRange(year, monthIndex);
      start = range.start;
      end = Math.min(range.end, nowTime + 1);
      label = `${year} 年 ${monthIndex + 1} 月`;
      detailLabel = `${year}.${String(monthIndex + 1).padStart(2, "0")}`;
    } else if (rangeType === "year") {
      start = localYearRange(now.getFullYear()).start;
      end = nowTime + 1;
      label = `${now.getFullYear()} 年数据`;
      detailLabel = `今年 1 月至今`;
    } else {
      start = localDayStart(nowTime);
      end = nowTime + 1;
      label = "今日数据";
      detailLabel = formatRangeDate(nowTime);
    }

    if (end <= start) end = start + 1;
    const summary = summarizeEventRange(events, start, end);
    const points =
      rangeType === "day"
        ? hourlySeries(start, end)
        : rangeType === "year"
          ? monthlySeries(now.getFullYear()).filter((point) => point.start <= nowTime)
          : dailySeries(start, end);
    const bestPoint = points.reduce(
      (best, point) => (!best || point.total > best.total ? point : best),
      null
    );
    const activeDayCount =
      rangeType === "day"
        ? summary.count
          ? 1
          : 0
        : summary.activeDays;
    const average = activeDayCount
      ? Math.round((summary.total / activeDayCount) * 10) / 10
      : 0;
    const sources = summary.bySource
      .filter((source) => source.count > 0)
      .sort((a, b) => b.total - a.total);

    return {
      rangeType,
      start,
      end,
      label,
      detailLabel,
      summary,
      points,
      bestPoint,
      activeDayCount,
      average,
      sources,
      dateLabel:
        start === localDayStart(nowTime)
          ? formatRangeDate(nowTime)
          : `${formatRangeDate(start)} — ${formatRangeDate(end - 1)}`,
    };
  }

  function populateExportSelectors() {
    const currentYear = new Date().getFullYear();
    const earliestYear = events.length
      ? new Date(Number(events[0].claimedAt)).getFullYear()
      : currentYear;
    const years = [];
    for (let year = currentYear; year >= Math.min(earliestYear, currentYear); year -= 1) {
      years.push(year);
    }
    elements.exportYearSelect.innerHTML = years
      .map((year) => `<option value="${year}">${year} 年</option>`)
      .join("");
    elements.exportMonthSelect.innerHTML = Array.from(
      { length: 12 },
      (_, index) => `<option value="${index}">${index + 1} 月</option>`
    ).join("");
    elements.exportYearSelect.value = String(currentYear);
    elements.exportMonthSelect.value = String(new Date().getMonth());
  }

  function renderExportPreview() {
    const model = buildExportModel();
    elements.exportRangeLabel.textContent = model.label;
    elements.exportRangeDates.textContent = model.dateLabel;
    elements.exportPreviewTotal.textContent = String(model.summary.total);
    elements.exportMockTotal.textContent = String(model.summary.total);
    elements.exportMockDays.textContent = String(model.activeDayCount);
    elements.exportMockRecords.textContent = String(model.summary.count);
    $$("[data-export-range]").forEach((button) => {
      const active = button.dataset.exportRange === runtime.exportRange;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.exportMonthFields.hidden = runtime.exportRange !== "custom-month";
  }

  function openExportReport() {
    runtime.exportRange = "day";
    populateExportSelectors();
    renderExportPreview();
    openSheet(elements.exportReportSheet);
  }

  function setExportRange(rangeType) {
    if (!["day", "week", "month", "custom-month", "year"].includes(rangeType)) return;
    runtime.exportRange = rangeType;
    renderExportPreview();
  }

  function hexToRgba(hex, alpha) {
    const [r, g, b] = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function reportFont(size, weight = 700) {
    return `${weight} ${size}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;
  }

  function roundRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function fillRoundRect(context, x, y, width, height, radius, fillStyle, strokeStyle = "") {
    roundRectPath(context, x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
    if (strokeStyle) {
      context.strokeStyle = strokeStyle;
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function loadReportImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function reportSourceColor(accent, index) {
    const tones = [
      "#6e75ff",
      "#25b7a5",
      "#ec9c32",
      "#e85f7c",
      "#3d9fea",
      "#55b873",
      "#8b6ddb",
      "#7c8ba0",
      "#ba78b8",
    ];
    return index === 0
      ? accent
      : colorMix(accent, tones[index % tones.length], 0.42);
  }

  function drawReportLineChart(context, model, plot, colors) {
    const points = model.points;
    const maxValue = Math.max(4, ...points.map((point) => point.total));
    const ceiling = Math.ceil(maxValue / 4) * 4;
    const xFor = (index) =>
      plot.left + (plot.width * index) / Math.max(1, points.length - 1);
    const yFor = (value) => plot.top + plot.height - (plot.height * value) / ceiling;

    context.save();
    context.font = reportFont(28, 600);
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let step = 0; step <= 4; step += 1) {
      const value = (ceiling / 4) * step;
      const y = yFor(value);
      context.beginPath();
      context.setLineDash([10, 14]);
      context.strokeStyle = colors.line;
      context.lineWidth = 2;
      context.moveTo(plot.left, y);
      context.lineTo(plot.left + plot.width, y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = colors.muted;
      context.fillText(String(Math.round(value)), plot.left - 22, y);
    }

    const coords = points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point.total),
    }));
    const area = context.createLinearGradient(0, plot.top, 0, plot.top + plot.height);
    area.addColorStop(0, hexToRgba(colors.accent, 0.34));
    area.addColorStop(1, hexToRgba(colors.accent, 0.02));
    context.beginPath();
    context.moveTo(coords[0].x, plot.top + plot.height);
    coords.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(coords[coords.length - 1].x, plot.top + plot.height);
    context.closePath();
    context.fillStyle = area;
    context.fill();

    context.beginPath();
    coords.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.strokeStyle = colors.accent;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();

    coords.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 9, 0, Math.PI * 2);
      context.fillStyle = colors.surface;
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = colors.accent;
      context.stroke();
    });

    context.font = reportFont(26, 600);
    context.fillStyle = colors.muted;
    context.textAlign = "center";
    context.textBaseline = "top";
    const labelEvery =
      points.length > 24 ? 5 : points.length > 12 ? 2 : 1;
    points.forEach((point, index) => {
      const show =
        index === 0 ||
        index === points.length - 1 ||
        index % labelEvery === 0;
      if (show) {
        context.fillText(
          point.label,
          xFor(index),
          plot.top + plot.height + 24
        );
      }
    });
    context.restore();
  }

  async function generateReportBlob(model) {
    const canvas = document.createElement("canvas");
    canvas.width = 3840;
    canvas.height = 2160;
    const context = canvas.getContext("2d");
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#2f7dff";
    const accentStrong =
      styles.getPropertyValue("--accent-strong").trim() || accent;
    const onAccent =
      styles.getPropertyValue("--on-accent").trim() || "#ffffff";
    const dark = data.settings.dark;
    const theme = THEMES.find((item) => item.id === data.settings.theme) || THEMES[0];
    const colors = {
      accent,
      accentStrong,
      onAccent,
      background: dark ? "#081324" : "#f3f7ff",
      panel: dark ? "#142743" : "#ffffff",
      panelAlt: dark ? "#102039" : "#f7faff",
      text: dark ? "#edf6ff" : "#14243c",
      muted: dark ? "#a3b7ce" : "#71839b",
      line: dark ? "rgba(148, 201, 255, 0.16)" : "rgba(62, 124, 199, 0.14)",
      surface: dark ? "#142743" : "#ffffff",
    };

    const background = context.createLinearGradient(0, 0, 3840, 2160);
    background.addColorStop(0, colors.background);
    background.addColorStop(1, dark ? "#0d1d33" : "#e5efff");
    context.fillStyle = background;
    context.fillRect(0, 0, 3840, 2160);

    let glow = context.createRadialGradient(300, 100, 0, 300, 100, 900);
    glow.addColorStop(0, hexToRgba(accent, dark ? 0.24 : 0.16));
    glow.addColorStop(1, hexToRgba(accent, 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, 1500, 1400);
    glow = context.createRadialGradient(3500, 450, 0, 3500, 450, 800);
    glow.addColorStop(0, hexToRgba(accentStrong, dark ? 0.18 : 0.1));
    glow.addColorStop(1, hexToRgba(accentStrong, 0));
    context.fillStyle = glow;
    context.fillRect(2400, 0, 1440, 1400);

    fillRoundRect(
      context,
      120,
      92,
      3600,
      310,
      42,
      dark ? "rgba(20,39,67,0.92)" : "rgba(255,255,255,0.9)",
      colors.line
    );
    try {
      const logo = await loadReportImage(
        dark ? "./assets/platform-logo-white.png" : "./assets/platform-logo-blue.png"
      );
      const logoHeight = 94;
      const logoWidth = Math.min(330, logo.width * (logoHeight / logo.height));
      context.drawImage(logo, 178, 204, logoWidth, logoHeight);
    } catch (error) {
      context.fillStyle = colors.accent;
      context.font = reportFont(62, 900);
      context.fillText("SG.像素2", 178, 282);
    }

    context.fillStyle = colors.muted;
    context.font = reportFont(24, 800);
    context.textAlign = "left";
    context.fillText("PIXEL SURVIVAL GAME 2 · DATA BRIEF", 540, 205);
    context.fillStyle = colors.text;
    context.font = reportFont(82, 900);
    context.fillText("钻石手账", 540, 296);
    context.fillStyle = colors.accent;
    context.font = reportFont(31, 800);
    context.fillText(`${model.label} · ${model.detailLabel}`, 540, 350);

    context.textAlign = "right";
    context.fillStyle = colors.muted;
    context.font = reportFont(25, 700);
    context.fillText(
      `导出日期 ${formatRangeDate(Date.now())}`,
      3650,
      205
    );
    fillRoundRect(
      context,
      3180,
      236,
      470,
      92,
      46,
      dark ? hexToRgba(accent, 0.2) : hexToRgba(accent, 0.1),
      hexToRgba(accent, 0.2)
    );
    context.fillStyle = colors.accent;
    context.font = reportFont(31, 850);
    context.textAlign = "center";
    context.fillText(`${theme.name} · ${dark ? "深色" : "浅色"}简报`, 3415, 294);

    const cardY = 444;
    const cardGap = 38;
    const cardWidth = (3600 - cardGap * 3) / 4;
    const kpis = [
      ["总收获", `${model.summary.total}`, "钻石"],
      ["活跃天数", `${model.activeDayCount}`, "天"],
      ["记录次数", `${model.summary.count}`, "次"],
      ["活跃日均", `${model.average}`, "钻石"],
    ];
    kpis.forEach(([label, value, unit], index) => {
      const x = 120 + index * (cardWidth + cardGap);
      const active = index === 0;
      const fill = active
        ? (() => {
            const gradient = context.createLinearGradient(
              x,
              cardY,
              x + cardWidth,
              cardY + 300
            );
            gradient.addColorStop(0, accent);
            gradient.addColorStop(1, accentStrong);
            return gradient;
          })()
        : colors.panel;
      fillRoundRect(
        context,
        x,
        cardY,
        cardWidth,
        300,
        34,
        fill,
        active ? hexToRgba(colors.onAccent === "#14243c" ? "#14243c" : "#ffffff", 0.18) : colors.line
      );
      context.fillStyle = active ? colors.onAccent : colors.muted;
      context.font = reportFont(29, 750);
      context.textAlign = "left";
      context.fillText(label, x + 36, cardY + 70);
      context.fillStyle = active ? colors.onAccent : colors.text;
      context.font = reportFont(88, 950);
      context.fillText(value, x + 36, cardY + 193);
      const valueWidth = context.measureText(value).width;
      context.font = reportFont(29, 700);
      context.fillStyle = active ? colors.onAccent : colors.muted;
      context.fillText(unit, x + 45 + valueWidth, cardY + 190);
    });

    fillRoundRect(context, 120, 802, 2460, 1110, 38, colors.panel, colors.line);
    context.fillStyle = colors.muted;
    context.font = reportFont(25, 800);
    context.textAlign = "left";
    context.fillText("PERFORMANCE OVERVIEW", 176, 888);
    context.fillStyle = colors.text;
    context.font = reportFont(48, 900);
    context.fillText("钻石收益趋势", 176, 950);
    context.textAlign = "right";
    context.fillStyle = colors.accent;
    context.font = reportFont(44, 900);
    context.fillText(`${model.summary.total} 钻石`, 2518, 948);
    context.fillStyle = colors.muted;
    context.font = reportFont(24, 650);
    context.fillText(
      model.rangeType === "day"
        ? "今日按小时统计"
        : model.rangeType === "year"
          ? "今年按月统计"
          : "所选区间按日统计",
      2518,
      1001
    );
    drawReportLineChart(
      context,
      model,
      { left: 240, top: 1085, width: 2180, height: 650 },
      colors
    );

    fillRoundRect(context, 2640, 802, 1080, 1110, 38, colors.panel, colors.line);
    context.fillStyle = colors.muted;
    context.font = reportFont(25, 800);
    context.textAlign = "left";
    context.fillText("DIAMOND SOURCES", 2702, 888);
    context.fillStyle = colors.text;
    context.font = reportFont(45, 900);
    context.fillText("来源构成", 2702, 950);
    const reportSources =
      model.sources.length
        ? model.sources.slice(0, 8)
        : [{ ...SOURCE_CATEGORY_META[0], total: 0, count: 0 }];
    const rowHeight = 94;
    reportSources.forEach((source, index) => {
      const y = 1035 + index * rowHeight;
      const percentage = model.summary.total
        ? Math.round((source.total / model.summary.total) * 100)
        : 0;
      const color = reportSourceColor(accent, index);
      context.fillStyle = color;
      context.beginPath();
      context.arc(2722, y, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = colors.text;
      context.font = reportFont(30, 760);
      context.textAlign = "left";
      context.fillText(source.name, 2752, y + 9);
      context.textAlign = "right";
      context.fillStyle = colors.text;
      context.font = reportFont(34, 900);
      context.fillText(String(source.total), 3650, y + 9);
      context.fillStyle = colors.muted;
      context.font = reportFont(22, 650);
      context.fillText(`${percentage}%`, 3668, y + 50);
      fillRoundRect(
        context,
        2752,
        y + 30,
        804,
        12,
        6,
        colors.panelAlt
      );
      if (percentage > 0) {
        fillRoundRect(
          context,
          2752,
          y + 30,
          Math.max(18, (804 * percentage) / 100),
          12,
          6,
          color
        );
      }
    });

    fillRoundRect(context, 120, 1948, 3600, 126, 30, colors.panelAlt, colors.line);
    context.fillStyle = colors.text;
    context.font = reportFont(30, 850);
    context.textAlign = "left";
    context.fillText(
      `最高${model.rangeType === "day" ? "时段" : model.rangeType === "year" ? "月份" : "单日"}  ${
        model.bestPoint?.total ? `${model.bestPoint.label} · ${model.bestPoint.total} 钻石` : "暂无记录"
      }`,
      176,
      2023
    );
    context.fillStyle = colors.muted;
    context.font = reportFont(23, 650);
    context.fillText(
      "像素生存者2 · 钻石手账  |  数据仅来自本机记录  |  local-first data journal",
      176,
      2057
    );
    context.textAlign = "right";
    context.fillStyle = colors.accent;
    context.font = reportFont(28, 850);
    context.fillText(`${theme.name}主题`, 3638, 2023);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("简报图片生成失败"))),
        "image/png"
      );
    });
  }

  function reportFileName(model) {
    const stamp = new Date();
    const date = [
      stamp.getFullYear(),
      String(stamp.getMonth() + 1).padStart(2, "0"),
      String(stamp.getDate()).padStart(2, "0"),
    ].join("");
    const range = model.detailLabel
      .replace(/[\\/:*?"<>|\s]+/g, "-")
      .replace(/\./g, "");
    return `钻石手账-${range}-4K简报-${date}.png`;
  }

  function downloadBlobFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function exportReport() {
    const button = elements.generateReportBtn;
    if (button.disabled) return;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "正在生成 4K 简报…";
    try {
      const model = buildExportModel();
      const blob = await generateReportBlob(model);
      downloadBlobFile(blob, reportFileName(model));
      showToast("4K 简报已生成，正在下载");
    } catch (error) {
      console.error(error);
      showToast("简报生成失败，请稍后重试");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
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

  function isIOSDevice() {
    const userAgent = navigator.userAgent || "";
    return (
      /iPad|iPhone|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function notificationsSupported() {
    return (
      !isIOSDevice() &&
      window.isSecureContext &&
      typeof Notification !== "undefined" &&
      "serviceWorker" in navigator
    );
  }

  function currentNotificationPermission() {
    return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  }

  async function requestNotificationPermission() {
    if (!notificationsSupported()) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission;
    try {
      const result = Notification.requestPermission();
      if (result && typeof result.then === "function") {
        return await result;
      }
      return currentNotificationPermission();
    } catch (error) {
      console.warn("通知权限请求失败。", error);
      return Notification.permission;
    }
  }

  function renderNotificationSettings() {
    if (
      !elements.notificationToggle ||
      !elements.notificationStatus ||
      !elements.notificationHint ||
      !elements.testNotificationBtn
    ) {
      return;
    }

    const supported = notificationsSupported();
    const permission = currentNotificationPermission();
    const enabled = Boolean(data.settings.notifications);
    const canUse = supported && permission !== "denied";
    let status = "未开启";
    let hint =
      "开启后会分别提醒宝箱和钻石奖励。网页版需保持应用打开或在后台运行。";
    let hintState = "idle";

    if (isIOSDevice()) {
      status = "iOS 暂不支持";
      hint = "iOS 网页和主屏幕 PWA 无法可靠执行后台定时通知，此功能已关闭。Android 用户可继续使用 APK 提醒。";
      hintState = "warning";
    } else if (!window.isSecureContext) {
      status = "需要 HTTPS";
      hint = "通知只能通过 HTTPS 或 localhost 使用，请打开正式发布的 GitHub Pages 地址。";
      hintState = "warning";
    } else if (permission === "unsupported") {
      status = "浏览器不支持";
      hint = "当前浏览器没有提供系统通知。Android 用户可安装 APK 获得完整的本地通知。";
      hintState = "warning";
    } else if (permission === "denied") {
      status = "已被系统阻止";
      hint = "请在浏览器的网站权限中允许通知，然后刷新页面重新开启。";
      hintState = "warning";
    } else if (enabled && permission === "granted") {
      status = "已开启";
      hint = "宝箱和钻石会在预计领取时间分别弹出通知。请保持应用打开或在后台运行。";
      hintState = "ready";
    } else if (enabled && permission === "default") {
      status = "等待授权";
      hint = "开启通知后，请在浏览器弹窗中选择“允许”。";
      hintState = "ready";
    }

    elements.notificationToggle.checked = enabled && permission === "granted";
    elements.notificationToggle.disabled = !canUse;
    elements.testNotificationBtn.disabled = !canUse;
    elements.notificationStatus.textContent = status;
    elements.notificationHint.textContent = hint;
    elements.notificationHint.dataset.state = hintState;
  }

  async function showReminderNotification(kind, { test = false } = {}) {
    if (currentNotificationPermission() !== "granted") {
      throw new Error("通知权限尚未开启");
    }

    const labels = NOTIFICATION_LABELS[kind] || NOTIFICATION_LABELS.chest;
    const title = test ? "钻石手账通知测试成功" : labels.title;
    const expectedAt = Number(data.current[kind]?.expectedAt) || Date.now();
    const body = test
      ? "宝箱和钻石到点后，会像这样提醒你。"
      : `${formatTime(expectedAt)} · ${labels.action}`;
    const tag = test ? `sg2-test-${Date.now()}` : `sg2-${kind}-${data.current[kind]?.expectedAt || "now"}`;
    const options = {
      body,
      icon: "./assets/app-icon-192.png",
      badge: "./assets/favicon-32.png",
      tag,
      renotify: !test,
      data: { url: "./", kind },
    };

    if (serviceWorkerRegistration?.showNotification) {
      await serviceWorkerRegistration.showNotification(title, options);
      return;
    }

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration?.showNotification) {
          await registration.showNotification(title, options);
          return;
        }
      } catch (error) {
        console.warn("Service Worker 通知不可用，尝试使用页面通知。", error);
      }
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  async function checkDueNotifications() {
    if (
      !data.settings.notifications ||
      !notificationsSupported() ||
      currentNotificationPermission() !== "granted"
    ) {
      return;
    }

    const now = Date.now();
    for (const kind of ["chest", "diamond"]) {
      const current = data.current[kind];
      const expectedAt = Number(current?.expectedAt);
      if (
        !current ||
        !Number.isFinite(expectedAt) ||
        now < expectedAt ||
        Number(current.notificationSentFor) === expectedAt ||
        runtime.notificationPending.has(kind)
      ) {
        continue;
      }

      runtime.notificationPending.add(kind);
      try {
        await showReminderNotification(kind);
        if (data.current[kind] === current) {
          current.notificationSentFor = expectedAt;
          saveData();
        }
      } catch (error) {
        console.warn(`${NOTIFICATION_LABELS[kind].title}通知发送失败。`, error);
      } finally {
        runtime.notificationPending.delete(kind);
      }
    }
  }

  function scheduleReminderCheck() {
    window.clearTimeout(notificationTimer);
    notificationTimer = 0;
    if (
      !data.settings.notifications ||
      !notificationsSupported() ||
      currentNotificationPermission() !== "granted"
    ) {
      return;
    }

    const pendingTimes = ["chest", "diamond"]
      .map((kind) => {
        const current = data.current[kind];
        const expectedAt = Number(current?.expectedAt);
        if (
          !current ||
          !Number.isFinite(expectedAt) ||
          Number(current.notificationSentFor) === expectedAt
        ) {
          return Number.POSITIVE_INFINITY;
        }
        return expectedAt;
      })
      .filter(Number.isFinite);

    if (!pendingTimes.length) return;
    const delay = Math.max(250, Math.min(...pendingTimes) - Date.now() + 250);
    notificationTimer = window.setTimeout(async () => {
      await checkDueNotifications();
      scheduleReminderCheck();
    }, Math.min(delay, 2147483647));
  }

  function renderDateHeader() {
    const label = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(new Date());
    elements.todayLabel.textContent = label;
    if (elements.pageTodayLabel) elements.pageTodayLabel.textContent = label;
  }

  function renderProfile() {
    elements.headerNickname.textContent = data.profile.nickname;
    if (elements.pageNickname) elements.pageNickname.textContent = data.profile.nickname;
    elements.nicknameInput.value = data.profile.nickname;
    setAvatarSources(avatarUrl || pendingAvatarUrl);
  }

  function setAvatarSources(url) {
    const images = [
      elements.headerAvatarImage,
      elements.profileAvatarImage,
      elements.pageAvatarImage,
    ].filter(Boolean);
    const fallbacks = [
      elements.headerAvatarFallback,
      elements.profileAvatarFallback,
      elements.pageAvatarFallback,
    ].filter(Boolean);
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
      .filter(
        (event) =>
          event.type !== "source" &&
          Number(event.claimedAt) > cutoff &&
          Number(event.claimedAt) <= now
      )
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

    let hasUndo = false;
    for (const kind of ["chest", "diamond"]) {
      const undo = runtime.undo[kind];
      if (undo && now < undo.expiresAt) {
        hasUndo = true;
      } else if (undo) {
        runtime.undo[kind] = null;
      }
    }
    if (runtime.batchUndo && now < runtime.batchUndo.expiresAt) {
      hasUndo = true;
    } else if (runtime.batchUndo) {
      runtime.batchUndo = null;
    }

    if (!parts.length && !hasUndo) {
      elements.actionDock.innerHTML = `
        <button
          class="combined-button dock-combined-button"
          id="claimBothBtn"
          type="button"
          data-claim-both
        >
          <span class="combined-icon" aria-hidden="true">✓</span>
          <span>两边都领了，一起记录</span>
          <span class="combined-spark" aria-hidden="true">✦</span>
        </button>
      `;
      return;
    }

    const recentTotal = diamondTotalInWindow(events, now);
    const completionLabel = runtime.batchUndo
      ? "宝箱和钻石已一起记录"
      : runtime.undo.chest
        ? "宝箱记录已更新"
        : "钻石奖励已记录";
    const completion = parts.length
      ? ""
      : `<div class="dock-complete"><span>✓</span>${completionLabel}</div>`;
    elements.actionDock.innerHTML = `
      <div class="action-dock-content">
        ${parts.join("")}
        ${completion}
        <div class="action-dock-meta">
          <span class="rolling-limit">近 60 秒 ${recentTotal}/6 钻石</span>
        </div>
      </div>
    `;
  }

  function pickAssistantMessage(messages, seed) {
    const mixed = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
    return messages[mixed % messages.length];
  }

  function renderAssistant() {
    const start = dateStartFor("day");
    const todayEvents = events.filter(
      (event) => Number(event.claimedAt) >= start && Number(event.claimedAt) <= Date.now()
    );
    const chestEvents = todayEvents.filter((event) => event.type === "chest");
    const diamondEvents = todayEvents.filter((event) => event.type === "diamond");
    const sourceEvents = todayEvents.filter((event) => event.type === "source");
    const totalDiamonds = todayEvents.reduce((total, event) => total + eventReward(event), 0);
    let pool = ASSISTANT_MESSAGES.empty;
    if (totalDiamonds >= 60) pool = ASSISTANT_MESSAGES.peak;
    else if (totalDiamonds >= 30) pool = ASSISTANT_MESSAGES.excellent;
    else if (totalDiamonds >= 15) pool = ASSISTANT_MESSAGES.strong;
    else if (totalDiamonds >= 5) pool = ASSISTANT_MESSAGES.steady;
    else if (totalDiamonds > 0) pool = ASSISTANT_MESSAGES.starting;

    const key = [
      start,
      totalDiamonds,
      chestEvents.length,
      diamondEvents.length,
      sourceEvents.length,
      data.settings.showDailyTask ? 1 : 0,
    ].join(":");
    if (key === runtime.assistantKey) return;
    runtime.assistantKey = key;

    const seed =
      Math.floor(start / 86400000) +
      totalDiamonds * 7 +
      chestEvents.length * 11 +
      diamondEvents.length * 13 +
      sourceEvents.length * 17;
    let message = pickAssistantMessage(pool, seed);
    message = message
      .replaceAll("{total}", String(totalDiamonds))
      .replaceAll("{chest}", String(chestEvents.length))
      .replaceAll("{diamond}", String(diamondEvents.length));

    if (
      data.settings.showDailyTask &&
      totalDiamonds > 0 &&
      extraSourceCountToday("daily-task") === 0
    ) {
      message += " 每日任务今天还没有记录，别忘了去看看。";
    }
    elements.assistantText.textContent = message;
  }

  function extraSourceCountToday(sourceId) {
    const start = dateStartFor("day");
    return events.filter(
      (event) =>
        event.type === "source" &&
        event.sourceId === sourceId &&
        Number(event.claimedAt) >= start
    ).length;
  }

  function todayDiamondTotal() {
    const start = dateStartFor("day");
    return events
      .filter((event) => Number(event.claimedAt) >= start && Number(event.claimedAt) <= Date.now())
      .reduce((total, event) => total + eventReward(event), 0);
  }

  function showRewardTotal(total, gain = 1, caption = "") {
    if (!elements.rewardTotalFloat) return;
    window.clearTimeout(rewardTotalTimer);
    elements.rewardTotalValue.textContent = String(total);
    elements.rewardTotalGain.textContent =
      caption || `本次 ${gain >= 0 ? "+" : ""}${gain}`;
    elements.rewardTotalFloat.hidden = false;
    elements.rewardTotalFloat.classList.remove("show");
    void elements.rewardTotalFloat.offsetWidth;
    elements.rewardTotalFloat.classList.add("show");
    rewardTotalTimer = window.setTimeout(() => {
      elements.rewardTotalFloat.classList.remove("show");
      window.setTimeout(() => {
        if (!elements.rewardTotalFloat.classList.contains("show")) {
          elements.rewardTotalFloat.hidden = true;
        }
      }, 220);
    }, 2400);
  }

  function animateDiamondsToTotal(button, reward, total) {
    if (!button || !elements.rewardFlightLayer || !elements.rewardTotalFloat) {
      showRewardTotal(total, reward);
      return;
    }
    const buttonRect = button.getBoundingClientRect();
    if (!buttonRect.width || !buttonRect.height) {
      showRewardTotal(total, reward);
      return;
    }

    showRewardTotal(total, reward);
    const targetRect = elements.rewardTotalFloat.getBoundingClientRect();
    const targetDiamond = elements.rewardTotalFloat.querySelector("img");
    const diamondRect = targetDiamond?.getBoundingClientRect();
    const targetX = diamondRect
      ? diamondRect.left + diamondRect.width / 2
      : targetRect.left + targetRect.width / 2;
    const targetY = diamondRect
      ? diamondRect.top + diamondRect.height / 2
      : targetRect.top + targetRect.height / 2;
    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height * 0.42;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flightFrameMs = 1000 / 120;
    const duration = reducedMotion ? 280 : 1180;
    const stagger = reducedMotion ? 24 : 110;
    const flights = [];

    for (let index = 0; index < reward; index += 1) {
      const diamond = document.createElement("img");
      diamond.className = "flying-diamond";
      diamond.src = "./assets/diamond.png";
      diamond.alt = "";
      diamond.draggable = false;
      const sourceX = startX + (index - (reward - 1) / 2) * 7;
      diamond.style.left = `${sourceX}px`;
      diamond.style.top = `${startY}px`;
      elements.rewardFlightLayer.appendChild(diamond);
      flights.push({
        element: diamond,
        sourceX,
        sourceY: startY,
        deltaX: targetX - startX,
        deltaY: targetY - startY,
        delay: index * stagger,
        done: false,
      });
    }

    const startedAt = performance.now();
    const frame = (now) => {
      for (const flight of flights) {
        if (flight.done) continue;
        const elapsed = now - startedAt - flight.delay;
        if (elapsed < 0) continue;
        const quantizedElapsed = Math.floor(elapsed / flightFrameMs) * flightFrameMs;
        const progress = Math.min(1, quantizedElapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const x = flight.sourceX + flight.deltaX * eased;
        const y = flight.sourceY + flight.deltaY * eased - Math.sin(Math.PI * progress) * 42;
        const scale = 0.62 + Math.sin(Math.PI * Math.min(progress * 1.35, 1)) * 0.5;
        const opacity =
          progress < 0.1
            ? progress / 0.1
            : Math.max(0, 1 - Math.max(0, progress - 0.7) / 0.3);
        flight.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
        flight.element.style.left = `${x}px`;
        flight.element.style.top = `${y}px`;
        flight.element.style.opacity = String(opacity);
        if (progress >= 1) {
          flight.done = true;
          flight.element.remove();
        }
      }

      if (flights.some((flight) => !flight.done)) {
        window.requestAnimationFrame(frame);
      }
    };
    window.requestAnimationFrame(frame);
  }

  function triggerSourceFeedback(button, success) {
    if (!button) return;
    button.classList.remove("is-rewarded", "is-blocked");
    void button.offsetWidth;
    button.classList.add(success ? "is-rewarded" : "is-blocked");
    window.setTimeout(() => {
      button.classList.remove("is-rewarded", "is-blocked");
    }, success ? 520 : 340);
  }

  function scheduleSourceRender(delay = 230) {
    window.clearTimeout(sourceRenderTimer);
    sourceRenderTimer = window.setTimeout(renderExtraSources, delay);
  }

  function renderExtraSources() {
    if (!elements.sourceGrid || !elements.dailyTaskSlot) return;
    window.clearTimeout(sourceCooldownTimer);
    sourceCooldownTimer = 0;
    const now = Date.now();
    let nextAvailableAt = Number.POSITIVE_INFINITY;
    const dailyTask = EXTRA_SOURCE_BY_ID.get("daily-task");
    const dailyCount = extraSourceCountToday(dailyTask.id);
    const dailyDisabled = dailyCount >= dailyTask.dailyLimit;
    elements.dailyTaskSlot.hidden = !data.settings.showDailyTask;

    elements.dailyTaskSlot.innerHTML = `
      <button
        class="daily-task-action${dailyDisabled ? " is-completed" : ""}"
        type="button"
        data-source-id="${dailyTask.id}"
        aria-label="每日任务，点击获得 ${dailyTask.reward} 钻石，今日 ${dailyCount}/${dailyTask.dailyLimit}"
        aria-disabled="${dailyDisabled}"
      >
        <span class="daily-task-icon">
          <img src="${dailyTask.icon}" alt="" />
        </span>
        <span class="daily-task-copy">
          <strong>每日任务</strong>
          <small>${dailyDisabled ? "今日已完成 · 明日 00:00 重置" : "每日任务可领取 5 钻石"}</small>
        </span>
        <span class="daily-task-reward">
          <img src="./assets/diamond.png" alt="" />
          <span><b>+${dailyTask.reward}</b><small>今日 ${dailyCount}/${dailyTask.dailyLimit}</small></span>
        </span>
      </button>
    `;

    elements.sourceGrid.innerHTML = EXTRA_SOURCES.filter(
      (source) => source.id !== dailyTask.id
    ).map((source) => {
      const todayCount = source.dailyLimit ? extraSourceCountToday(source.id) : 0;
      let state = "每次 +1";
      let disabled = false;

      if (source.dailyLimit) {
        disabled = todayCount >= source.dailyLimit;
        state = disabled
          ? `今日 ${todayCount}/${source.dailyLimit} · 明日再来`
          : `今日 ${todayCount}/${source.dailyLimit}`;
      } else if (source.rateLimit) {
        const recent = (data.sourceRate[source.id] || [])
          .map(Number)
          .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - source.rateLimit.windowMs);
        data.sourceRate[source.id] = recent;
        disabled = recent.length >= source.rateLimit.max;
        if (disabled && recent.length) {
          const remainingSeconds = Math.max(
            1,
            Math.ceil((recent[0] + source.rateLimit.windowMs - now) / 1000)
          );
          state = `${remainingSeconds} 秒后可再点`;
          nextAvailableAt = Math.min(
            nextAvailableAt,
            recent[0] + source.rateLimit.windowMs
          );
        } else {
          state = recent.length
            ? `5秒内 ${recent.length}/${source.rateLimit.max}`
            : "5秒限 2 次";
        }
      }
      const stateClass = disabled
        ? source.dailyLimit
          ? " is-completed"
          : " is-cooldown"
        : "";

      return `
        <button
          class="source-action${stateClass}"
          type="button"
          data-source-id="${source.id}"
          aria-label="${source.name}，点击获得 ${source.reward} 钻石，${state}"
          aria-disabled="${disabled}"
        >
          <span class="source-gain">+${source.reward}</span>
          <span class="source-icon">${extraSourceIconMarkup(source)}</span>
          <span class="source-name">${source.name}</span>
          <span class="source-state">${state}</span>
        </button>
      `;
    }).join("");

    if (Number.isFinite(nextAvailableAt)) {
      sourceCooldownTimer = window.setTimeout(
        renderExtraSources,
        Math.max(250, nextAvailableAt - now + 100)
      );
    }
  }

  async function addExtraDiamond(sourceId, button) {
    const source = EXTRA_SOURCE_BY_ID.get(sourceId);
    if (!source) return;
    const now = Date.now();
    const previousRate = source.rateLimit
      ? [...(data.sourceRate[source.id] || [])]
      : null;

    if (source.dailyLimit && extraSourceCountToday(source.id) >= source.dailyLimit) {
      triggerSourceFeedback(button, false);
      triggerHapticFeedback("warning");
      showToast(`${source.name}今天的次数已用完`);
      return;
    }

    if (source.rateLimit) {
      const recent = (data.sourceRate[source.id] || [])
        .map(Number)
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - source.rateLimit.windowMs);
      if (recent.length >= source.rateLimit.max) {
        triggerSourceFeedback(button, false);
        triggerHapticFeedback("warning");
        showToast(`${source.name}点击太快，请稍后再试`);
        data.sourceRate[source.id] = recent;
        return;
      }
      data.sourceRate[source.id] = [...recent, now];
    }

    const event = {
      id: uid(source.id),
      type: "source",
      sourceId: source.id,
      sourceName: source.name,
      claimedAt: now,
      duration: 0,
      reward: source.reward,
    };
    events.push(event);
    saveData();
    const persistPromise = putEvent(event);
    const total = todayDiamondTotal();
    button?.setAttribute("aria-disabled", "true");
    triggerSourceFeedback(button, true);
    triggerHapticFeedback(source.reward >= 5 ? "both" : "single");
    launchCelebration(button);
    renderAssistant();
    renderAnalytics();
    if (elements.ledgerSheet.classList.contains("open")) renderLedger();
    window.setTimeout(() => animateDiamondsToTotal(button, source.reward, total), 130);
    scheduleSourceRender(520);
    showSourceUndo(source, event, previousRate, persistPromise);

    try {
      await persistPromise;
    } catch (error) {
      console.error(error);
      showToast("钻石已记录，但本地数据库写入失败");
    }
  }

  function hideSourceUndo({ clearState = true } = {}) {
    window.clearTimeout(sourceUndoTimer);
    sourceUndoTimer = 0;
    if (!elements.sourceUndoToast) return;
    elements.sourceUndoToast.classList.remove("show");
    window.setTimeout(() => {
      if (!elements.sourceUndoToast.classList.contains("show")) {
        elements.sourceUndoToast.hidden = true;
      }
    }, 180);
    if (clearState) sourceUndoState = null;
  }

  function displayUndoToast(message, state) {
    if (!elements.sourceUndoToast) return;
    window.clearTimeout(sourceUndoTimer);
    sourceUndoState = state;
    elements.sourceUndoText.textContent = message;
    elements.sourceUndoToast.hidden = false;
    elements.sourceUndoToast.classList.remove("show");
    void elements.sourceUndoToast.offsetWidth;
    elements.sourceUndoToast.classList.add("show");
    sourceUndoTimer = window.setTimeout(() => hideSourceUndo(), 5000);
  }

  function showSourceUndo(source, event, previousRate, persistPromise) {
    displayUndoToast(`${source.name} +${source.reward} 钻石`, {
      type: "source",
      event,
      source,
      previousRate,
      persistPromise,
    });
  }

  function showClaimUndo(message, kind) {
    displayUndoToast(message, { type: "claim", kind });
  }

  async function undoLastSource() {
    const undo = sourceUndoState;
    if (!undo) return;
    hideSourceUndo({ clearState: false });
    if (undo.type === "claim") {
      if (undo.kind === "batch") await undoBatch();
      else await undoKind(undo.kind);
      sourceUndoState = null;
      return;
    }
    window.clearTimeout(sourceUndoTimer);
    events = events.filter((event) => event.id !== undo.event.id);
    if (undo.previousRate && undo.source.rateLimit) {
      data.sourceRate[undo.source.id] = undo.previousRate;
    }
    saveData();
    renderExtraSources();
    renderAssistant();
    renderAnalytics();
    if (elements.ledgerSheet.classList.contains("open")) renderLedger();
    hideSourceUndo();
    showToast(`${undo.source.name}记录已撤销`);
    try {
      await undo.persistPromise;
      await deleteEvents([undo.event.id]);
    } catch (error) {
      console.error(error);
    }
  }

  function renderStats() {
    const range = periodRange(runtime.period);
    const periodEvents = eventsInRange(events, range);
    const chestEvents = periodEvents.filter((event) => event.type === "chest");
    const diamondEvents = periodEvents.filter((event) => event.type === "diamond");
    const sourceEvents = periodEvents.filter((event) => event.type === "source");
    const chestDiamonds = chestEvents.reduce(
      (total, event) => total + eventReward(event),
      0
    );
    const fixedDiamonds = diamondEvents.reduce((total, event) => total + eventReward(event), 0);
    const sourceDiamonds = sourceEvents.reduce((total, event) => total + eventReward(event), 0);
    const total = chestDiamonds + fixedDiamonds + sourceDiamonds;

    elements.periodLabel.textContent =
      runtime.period === "day"
        ? runtime.selectedDayOffset === 0
          ? "今日合计"
          : `${formatDate(range.start)}合计`
        : runtime.period === "week"
          ? "本周合计"
          : "本月合计";
    elements.totalDiamonds.textContent = String(total);
    elements.chestCount.textContent = String(chestEvents.length);
    elements.diamondCount.textContent = String(diamondEvents.length);
    elements.chestDiamonds.textContent = String(chestDiamonds);
    elements.sourceDiamonds.textContent = String(sourceDiamonds);
    elements.formulaTotal.textContent = `${total} 钻石`;
  }

  function renderDailyTrend() {
    if (!elements.dailyStrip || !elements.trendChart) return;
    const range = runtime.trendRange;
    const days = trendDays(range);
    elements.trendChart.closest(".trend-card").classList.toggle("is-month-view", range === 30);

    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" });
    elements.dailyStrip.hidden = range === 30;
    elements.dailyStrip.classList.toggle("is-month", range === 30);
    elements.trendEyebrow.textContent = `LAST ${range} DAYS`;
    elements.trendAverageLabel.textContent = `近 ${range} 日日均`;
    elements.trendEmpty.textContent = `最近 ${range} 天还没有数据，领取一次后会在这里形成趋势。`;
    elements.trendChart.setAttribute(
      "aria-label",
      `最近 ${range} 天每日钻石收益折线图`
    );
    elements.chartHint.textContent =
      range === 30
        ? "整月数据已压缩在同一坐标轴，点击节点查看当天详情"
        : "点击折线节点，查看当天详情";
    elements.dailyStrip.innerHTML = days
      .map((day) => {
        const date = new Date(day.start);
        const dayName =
          day.offset === 0
            ? "今天"
            : range > 7
              ? `${date.getMonth() + 1}/${date.getDate()}`
              : weekday.format(date);
        return `
          <button
            class="day-chip${runtime.period === "day" && runtime.selectedDayOffset === day.offset ? " active" : ""}"
            type="button"
            data-day-offset="${day.offset}"
            aria-label="${formatDate(day.start)}，${day.total} 钻石，${day.count} 条记录"
          >
            <span>${dayName}</span>
            <strong>${day.total}</strong>
            <small>钻石</small>
          </button>
        `;
      })
      .join("");

    const total = days.reduce((sum, day) => sum + day.total, 0);
    const average = Math.round((total / range) * 10) / 10;
    const best = days.reduce((current, day) => (day.total > current.total ? day : current), days[0]);
    elements.trendAverage.innerHTML = `${average} <small>钻石</small>`;
    elements.trendBest.innerHTML = `${best.total} <small>钻石</small>`;
    elements.trendStreak.innerHTML = `${consecutiveRecordDays()} <small>天</small>`;
    renderPointDetail(days);

    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];
    const delta = today.total - yesterday.total;
    const bestLabel =
      best.total > 0 ? `${formatDate(best.start)}是近 ${range} 日最高点` : "继续积累数据";
    const deltaText =
      delta > 0
        ? `比昨天多 ${delta} 钻石，保持这个节奏。`
        : delta < 0
          ? `比昨天少 ${Math.abs(delta)} 钻石，今天还有机会追回来。`
          : "和昨天持平，领取节奏很稳定。";
    elements.trendAnalysis.textContent = `近 ${range} 日共获得 ${total} 钻石；${bestLabel}。${deltaText}`;

    const hasData = days.some((day) => day.count > 0);
    elements.trendEmpty.hidden = hasData;
    elements.trendChart.hidden = !hasData;
    if (hasData) drawTrendChart(days);
  }

  function drawTrendChart(days) {
    const canvas = elements.trendChart;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }

    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#2f7dff";
    const muted = styles.getPropertyValue("--muted").trim() || "#71839b";
    const line = styles.getPropertyValue("--line").trim() || "rgba(62,124,199,.14)";
    const surface = styles.getPropertyValue("--surface-solid").trim() || "#ffffff";
    const success = styles.getPropertyValue("--success").trim() || "#0c9b76";
    const maxValue = Math.max(4, ...days.map((day) => day.total));
    const ceiling = Math.ceil(maxValue / 4) * 4;
    const plot = { left: 28, right: width - 10, top: 15, bottom: height - 25 };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    const xFor = (index) => plot.left + (plotWidth * index) / (days.length - 1);
    const yFor = (value) => plot.bottom - (plotHeight * value) / ceiling;

    context.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.strokeStyle = line;
    context.fillStyle = muted;
    context.lineWidth = 1;

    for (let step = 0; step <= 4; step += 1) {
      const value = (ceiling / 4) * step;
      const y = yFor(value);
      context.beginPath();
      context.setLineDash([3, 5]);
      context.moveTo(plot.left, y);
      context.lineTo(plot.right, y);
      context.stroke();
      context.fillText(String(Math.round(value)), plot.left - 7, y);
    }
    context.setLineDash([]);

    context.textAlign = "center";
    context.textBaseline = "top";
    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" });
    days.forEach((day, index) => {
      const showLabel =
        days.length <= 7 ||
        index === 0 ||
        index === days.length - 1 ||
        index % 5 === 0;
      if (!showLabel) return;
      const date = new Date(day.start);
      const label =
        day.offset === 0
          ? "今天"
          : days.length <= 7
            ? weekday.format(date)
            : `${date.getMonth() + 1}/${date.getDate()}`;
      context.fillStyle = day.offset === runtime.selectedDayOffset ? accent : muted;
      context.fillText(label, xFor(index), plot.bottom + 8);
    });

    const points = days.map((day, index) => ({
      x: xFor(index),
      y: yFor(day.total),
      total: day.total,
      offset: day.offset,
    }));

    const gradient = context.createLinearGradient(0, plot.top, 0, plot.bottom);
    gradient.addColorStop(0, colorMix(accent, surface, 0.25));
    gradient.addColorStop(1, colorMix(accent, surface, 0.96));
    context.beginPath();
    context.moveTo(points[0].x, plot.bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points[points.length - 1].x, plot.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.globalAlpha = 0.48;
    context.fill();
    context.globalAlpha = 1;

    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.strokeStyle = accent;
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    const trendValues =
      days.length > 7
        ? days.map((_, index) => {
            const start = Math.max(0, index - 6);
            const windowValues = days.slice(start, index + 1);
            return windowValues.reduce((sum, day) => sum + day.total, 0) / windowValues.length;
          })
        : days.map(() => days.reduce((sum, day) => sum + day.total, 0) / days.length);
    context.beginPath();
    trendValues.forEach((value, index) => {
      const x = xFor(index);
      const y = yFor(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.setLineDash(days.length > 7 ? [5, 5] : [7, 6]);
    context.strokeStyle = success;
    context.lineWidth = 1.6;
    context.globalAlpha = 0.72;
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([]);

    points.forEach((point) => {
      const active = point.offset === runtime.selectedDayOffset;
      context.beginPath();
      context.arc(point.x, point.y, active ? 4.5 : days.length > 7 ? 1.8 : 2.7, 0, Math.PI * 2);
      context.fillStyle = active ? accent : surface;
      context.fill();
      context.lineWidth = active ? 2.5 : 1.5;
      context.strokeStyle = accent;
      context.stroke();
    });
  }

  function renderAnalytics() {
    renderStats();
    renderDailyTrend();
    renderCompanionStrip();
    if (elements.yearReviewSheet.classList.contains("open")) renderYearReview();
  }

  function renderLedger() {
    const range = periodRange(runtime.period);
    const periodEvents = eventsInRange(events, range)
      .sort((a, b) => b.claimedAt - a.claimedAt);
    const total = periodEvents.reduce((sum, event) => sum + eventReward(event), 0);
    const label =
      runtime.period === "day"
        ? runtime.selectedDayOffset === 0
          ? "今日"
          : formatDate(range.start)
        : runtime.period === "week"
          ? "本周"
          : "本月";
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
        const source = sourceForEvent(event);
        const label = isChest ? "宝箱" : source ? source.name : "钻石奖励";
        const iconMarkup = source
          ? `<span class="ledger-icon source-ledger-icon">${extraSourceIconMarkup(source)}</span>`
          : `<img class="ledger-icon" src="./assets/${isChest ? "chest" : "diamond"}.png" alt="" />`;
        return `
          <article class="ledger-item">
            ${iconMarkup}
            <div class="ledger-copy">
              <strong>${label}</strong>
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
    if (sourceUndoState?.event.id === id) hideSourceUndo();
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
    renderAnalytics();
    renderAssistant();
    renderExtraSources();
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
    renderNotificationSettings();
    renderAvailability("chest");
    renderAvailability("diamond");
    renderActionDock();
    renderAssistant();
    renderExtraSources();
    renderAnalytics();
    scheduleReminderCheck();
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

  function triggerHapticFeedback(type = "single") {
    if (typeof navigator.vibrate !== "function") return false;
    try {
      if (type === "warning") return navigator.vibrate(28);
      return navigator.vibrate(type === "both" ? [14, 28, 20] : 18);
    } catch (error) {
      console.warn("设备不支持震动反馈。", error);
      return false;
    }
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
    const duration = clampDuration(data.settings.durations[kind], kind === "chest" ? 70 : 45);
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
        notificationSentFor: 0,
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
    showClaimUndo(`${kind === "chest" ? "宝箱" : "钻石奖励"}记录已更新`, kind);
    animateDiamondsToTotal(button, created.current.reward, todayDiamondTotal());
    launchCelebration(button);
    renderAll();
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
    showClaimUndo("宝箱和钻石已一起记录", "batch");
    animateDiamondsToTotal(
      button,
      chestClaim.current.reward + diamondClaim.current.reward,
      todayDiamondTotal()
    );
    launchCelebration(button);
    renderAll();
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
    const previousReward = Number(current.reward) || 0;
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
    renderAssistant();
    renderAnalytics();
    const delta = reward - previousReward;
    showRewardTotal(
      todayDiamondTotal(),
      delta,
      delta < 0 ? `本次扣除 ${Math.abs(delta)}` : `本次 +${reward}`
    );
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

  function showPage(pageName) {
    const target = document.querySelector(`[data-page-view="${pageName}"]`);
    if (!target) return;
    $$("[data-page-view]").forEach((page) => {
      page.hidden = page !== target;
      page.classList.toggle("active", page === target);
    });
    $$("[data-nav-page]").forEach((button) => {
      const active = button.dataset.navPage === pageName;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    if (pageName === "data") {
      window.requestAnimationFrame(() => {
        renderAnalytics();
        window.requestAnimationFrame(() => drawTrendChart(trendDays()));
      });
    }
  }

  function selectTrendPoint(event) {
    const canvas = elements.trendChart;
    const days = trendDays();
    const rect = canvas.getBoundingClientRect();
    const localX = Math.min(rect.width - 10, Math.max(28, event.clientX - rect.left));
    const ratio = (localX - 28) / Math.max(1, rect.width - 38);
    const index = Math.max(0, Math.min(days.length - 1, Math.round(ratio * (days.length - 1))));
    runtime.period = "day";
    runtime.selectedDayOffset = days[index].offset;
    $$(".segment").forEach((item) => {
      const active = item.dataset.period === "day";
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderAnalytics();
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
    elements.dailyTaskVisibilityToggle.checked = data.settings.showDailyTask;
    renderNotificationSettings();
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
    data.settings.showDailyTask = elements.dailyTaskVisibilityToggle.checked;
    saveData();
    applyTheme();
    renderIntervals();
    renderExtraSources();
    renderAssistant();
    closeSheet(elements.settingsSheet);
    showToast("设置已保存");
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
        triggerHapticFeedback("single");
        claimSingle(button.dataset.claim, button);
      });
    });
    document.addEventListener("click", (event) => {
      const claimBothButton = event.target.closest("[data-claim-both]");
      if (claimBothButton) {
        triggerButtonPress(claimBothButton);
        triggerHapticFeedback("both");
        claimBoth(claimBothButton);
        return;
      }
      const sourceButton = event.target.closest("[data-source-id]");
      if (sourceButton) {
        addExtraDiamond(sourceButton.dataset.sourceId, sourceButton);
        return;
      }
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
        return;
      }
      const dayChip = event.target.closest("[data-day-offset]");
      if (dayChip) {
        runtime.period = "day";
        runtime.selectedDayOffset = Number(dayChip.dataset.dayOffset) || 0;
        $$(".segment").forEach((item) => {
          const active = item.dataset.period === "day";
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
        });
        renderAnalytics();
        return;
      }
      const yearStep = event.target.closest("[data-year-step]");
      if (yearStep) {
        const bounds = reviewYearBounds();
        const nextYear = runtime.reviewYear + Number(yearStep.dataset.yearStep);
        if (nextYear < bounds.min || nextYear > bounds.max) return;
        runtime.reviewYear = nextYear;
        runtime.reviewMonth = null;
        renderYearReview();
        return;
      }
      const reviewMonthButton = event.target.closest("[data-review-month]");
      if (reviewMonthButton) {
        selectReviewMonth(Number(reviewMonthButton.dataset.reviewMonth));
        return;
      }
      const exportRangeButton = event.target.closest("[data-export-range]");
      if (exportRangeButton) {
        setExportRange(exportRangeButton.dataset.exportRange);
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
        renderAnalytics();
      });
    });

    $$("[data-trend-range]").forEach((button) => {
      button.addEventListener("click", () => {
        runtime.trendRange = Number(button.dataset.trendRange) === 30 ? 30 : 7;
        if (runtime.selectedDayOffset >= runtime.trendRange) {
          runtime.selectedDayOffset = 0;
          runtime.period = "day";
        }
        $$("[data-trend-range]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
        renderAnalytics();
        window.requestAnimationFrame(() => drawTrendChart(trendDays()));
      });
    });

    elements.trendChart.addEventListener("click", selectTrendPoint);
    elements.trendChart.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const days = trendDays();
      const currentIndex = Math.max(
        0,
        days.findIndex((day) => day.offset === runtime.selectedDayOffset)
      );
      const nextIndex = Math.max(
        0,
        Math.min(
          days.length - 1,
          currentIndex + (event.key === "ArrowLeft" ? -1 : 1)
        )
      );
      runtime.period = "day";
      runtime.selectedDayOffset = days[nextIndex].offset;
      $$(".segment").forEach((item) => {
        const active = item.dataset.period === "day";
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderAnalytics();
    });

    $("#profileBtn").addEventListener("click", openProfile);
    $("#avatarPickBtn").addEventListener("click", () => elements.avatarInput.click());
    $("#settingsBtn").addEventListener("click", openSettings);
    $("#ledgerBtn").addEventListener("click", openLedger);
    $("#dataLedgerBtn").addEventListener("click", openLedger);
    $("#yearReviewBtn").addEventListener("click", openYearReview);
    $("#exportReportBtn").addEventListener("click", openExportReport);
    $("#yearMonthBackBtn").addEventListener("click", closeYearMonthDetail);
    $("#generateReportBtn").addEventListener("click", exportReport);
    elements.exportYearSelect.addEventListener("change", renderExportPreview);
    elements.exportMonthSelect.addEventListener("change", renderExportPreview);
    $("#qqGroupBtn").addEventListener("click", () => openSheet(elements.qqGroupSheet));
    $$("[data-nav-page]").forEach((button) => {
      button.addEventListener("click", () => showPage(button.dataset.navPage));
    });
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
    elements.sourceUndoBtn.addEventListener("click", undoLastSource);

    elements.notificationToggle.addEventListener("change", async () => {
      if (!elements.notificationToggle.checked) {
        data.settings.notifications = false;
        saveData();
        window.clearTimeout(notificationTimer);
        notificationTimer = 0;
        renderNotificationSettings();
        showToast("到点通知已关闭");
        return;
      }

      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        data.settings.notifications = false;
        saveData();
        renderNotificationSettings();
        showToast(
          permission === "denied"
            ? "通知权限已被阻止，请在浏览器的网站权限中重新允许"
            : "当前环境无法开启系统通知"
        );
        return;
      }

      data.settings.notifications = true;
      saveData();
      renderNotificationSettings();
      await checkDueNotifications();
      scheduleReminderCheck();
      showToast("到点通知已开启");
    });

    elements.testNotificationBtn.addEventListener("click", async () => {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        renderNotificationSettings();
        showToast(
          permission === "denied"
            ? "通知权限已被阻止，请在浏览器的网站权限中重新允许"
            : "当前环境无法发送系统通知"
        );
        return;
      }

      try {
        await showReminderNotification("chest", { test: true });
        data.settings.notifications = true;
        saveData();
        renderNotificationSettings();
        await checkDueNotifications();
        scheduleReminderCheck();
        showToast("测试通知已发送");
      } catch (error) {
        console.error(error);
        showToast("测试通知发送失败，请检查系统通知权限");
      }
    });

    elements.themeGrid.addEventListener("click", (event) => {
      const item = event.target.closest("[data-theme-id]");
      if (!item) return;
      data.settings.theme = item.dataset.themeId;
      saveData();
      applyTheme();
      renderDailyTrend();
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
      elements.yearReviewSheet,
      elements.exportReportSheet,
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
        renderExtraSources();
        renderAnalytics();
        checkDueNotifications();
        scheduleReminderCheck();
      }
    });

    window.addEventListener("resize", () => {
      const dataPage = document.querySelector('[data-page-view="data"]');
      if (dataPage && !dataPage.hidden) renderDailyTrend();
      if (
        elements.yearMonthDetail &&
        !elements.yearMonthDetail.hidden &&
        elements.yearReviewSheet.classList.contains("open")
      ) {
        const monthRange = localMonthRange(runtime.reviewYear, runtime.reviewMonth);
        drawMonthChart(
          dailySeries(monthRange.start, Math.min(monthRange.end, Date.now() + 1))
        );
      }
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
    });
  }

  function registerServiceWorker() {
    if (
      window.SG2Native ||
      window.SG2_APK_SHELL ||
      !("serviceWorker" in navigator) ||
      !location.protocol.startsWith("http")
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("./sw.js?v=26", { updateViaCache: "none" })
        .then((registration) => {
          serviceWorkerRegistration = registration;
          registration.update();
          renderNotificationSettings();
          checkDueNotifications();
          scheduleReminderCheck();
        })
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
    if (isIOSDevice() && data.settings.notifications) {
      data.settings.notifications = false;
    }
    saveData();
    applyTheme();
    bindEvents();
    registerServiceWorker();
    try {
      events = await getAllEvents();
    } catch (error) {
      console.warn("无法读取领取记录。", error);
      showToast("本地数据库暂不可用，请确认浏览器没有禁用存储");
    }
    if (!Number.isFinite(Number(data.profile.startedAt)) || data.profile.startedAt <= 0) {
      data.profile.startedAt = Number(events[0]?.claimedAt) || Date.now();
      saveData();
    }
    await loadAvatar();
    renderAll();
    window.setInterval(updateUndoTimers, 250);
    window.setInterval(() => {
      renderDateHeader();
      renderAvailability("chest");
      renderAvailability("diamond");
      renderAssistant();
      renderExtraSources();
      checkDueNotifications();
      scheduleReminderCheck();
    }, 30000);

  }

  init();
})();
