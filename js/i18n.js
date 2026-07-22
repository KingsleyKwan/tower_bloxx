(() => {
  "use strict";

  const LANG_KEY = "tower_bloxx_lang";
  const SUPPORTED = ["en", "zh-HK"];

  const STRINGS = {
    en: {
      "meta.canvas": "Tower Bloxx game canvas",
      "hud.population": "Population",
      "hud.floors": "Floors",
      "hud.lives": "Lives",
      "hud.livesAria": "Lives remaining",
      "hud.combo": "COMBO x{n}",
      "hud.rescueReady": "Rescue ready",
      "hud.rescueUsed": "Rescue used",
      "hint.drop": "Tap / Click to drop",
      "start.title": "Build the tallest tower",
      "start.lede":
        "A crane swings each floor. Drop it onto the stack. Perfect landings fill your combo and pack in more residents.",
      "start.how1": "Tap, click, or press Space to drop",
      "start.how2": "3 misses and the build is over",
      "start.how3": "Chase PERFECT combos and unlock new themes",
      "start.play": "Play",
      "start.best": "Best population: {n}",
      "start.themesNext": "Themes: {list} · next at {n} floors",
      "start.themesAll": "Themes unlocked: {list}",
      "board.title": "Top 10",
      "board.loading": "Loading…",
      "board.empty": "No scores yet — be the first!",
      "board.unavailable": "Board unavailable",
      "board.global": "Global Top 10 · live",
      "board.offline": "Offline — cached scores on this device",
      "board.loadFail": "Could not reach global board",
      "board.savedGlobal": "Saved to Global Top 10",
      "board.savedLocalPending": "Saved on this device (global sync pending)",
      "board.savedLocal": "Saved on this device",
      "go.title": "Game Over",
      "go.new": "NEW",
      "go.ledeMiss": "Your tower couldn’t take another miss.",
      "go.ledeBest": "New high population. The city grows with you.",
      "go.population": "Population",
      "go.best": "Best",
      "go.blocks": "Blocks",
      "go.bestCombo": "Best Combo",
      "go.accuracy": "Accuracy",
      "go.themeNext": 'Next theme "{name}" unlocks at {n} floors.',
      "go.themeAll": "All themes unlocked. Neon City is yours.",
      "go.retry": "Try Again",
      "name.title": "Top 10!",
      "name.lede": "Your population made the board. Enter a name (max 10 characters, Chinese OK).",
      "name.label": "Name",
      "name.placeholder": "Your name",
      "name.save": "Save to Top 10",
      "name.skip": "Skip",
      "name.saving": "Saving…",
      "name.needName": "Please enter a name (max 10 characters).",
      "name.saveFail": "Could not save. Try again.",
      "banner.theme": "Theme: {name}",
      "banner.rescue": "CLOSE CALL — rescued!",
      "banner.miss": "MISS!",
      "banner.top10": "On the Global Top 10!",
      "banner.saved": "Score saved!",
      "float.perfect": "PERFECT!",
      "float.closeCall": "CLOSE CALL",
      "float.miss": "MISS!",
      "float.close": "CLOSE!",
      "theme.night": "Night City",
      "theme.sunset": "Sunset",
      "theme.forest": "Forest",
      "theme.ocean": "Ocean",
      "theme.aurora": "Aurora",
      "theme.neon": "Neon",
      "lang.aria": "Language",
      "lang.en": "EN",
      "lang.zh": "香港中文",
    },
    "zh-HK": {
      "meta.canvas": "Tower Bloxx 遊戲畫面",
      "hud.population": "人口",
      "hud.floors": "樓層",
      "hud.lives": "生命",
      "hud.livesAria": "剩餘生命",
      "hud.combo": "連擊 x{n}",
      "hud.rescueReady": "救援就緒",
      "hud.rescueUsed": "已用救援",
      "hint.drop": "輕觸／點擊放下",
      "start.title": "建造最高的大樓",
      "start.lede":
        "吊臂左右擺動每一層樓。把握時機放下。完美落地可延續連擊，吸納更多居民。",
      "start.how1": "輕觸、點擊或按空白鍵放下",
      "start.how2": "失手三次，建築工程就結束",
      "start.how3": "追求完美連擊，解鎖全新主題",
      "start.play": "開始",
      "start.best": "最佳人口：{n}",
      "start.themesNext": "主題：{list} · 下一款於 {n} 層解鎖",
      "start.themesAll": "已解鎖主題：{list}",
      "board.title": "十大排行",
      "board.loading": "載入中…",
      "board.empty": "尚未有紀錄——做第一名吧！",
      "board.unavailable": "排行榜暫時無法使用",
      "board.global": "全球十大排行 · 即時",
      "board.offline": "離線——顯示此裝置快取",
      "board.loadFail": "無法連接全球排行榜",
      "board.savedGlobal": "已儲存至全球十大",
      "board.savedLocalPending": "已儲存至此裝置（全球同步待處理）",
      "board.savedLocal": "已儲存至此裝置",
      "go.title": "遊戲結束",
      "go.new": "新紀錄",
      "go.ledeMiss": "你的大樓經不起再一次失手。",
      "go.ledeBest": "人口創新高。城市與你一同成長。",
      "go.population": "人口",
      "go.best": "最佳",
      "go.blocks": "層數",
      "go.bestCombo": "最高連擊",
      "go.accuracy": "命中率",
      "go.themeNext": "下一主題「{name}」於 {n} 層解鎖。",
      "go.themeAll": "全部主題已解鎖。霓虹之城屬於你。",
      "go.retry": "再玩一次",
      "name.title": "打入十大！",
      "name.lede": "你的人口已上榜。請輸入名稱（最多 10 個字，可用中文）。",
      "name.label": "名稱",
      "name.placeholder": "你的名字",
      "name.save": "儲存至十大",
      "name.skip": "略過",
      "name.saving": "儲存中…",
      "name.needName": "請輸入名稱（最多 10 個字）。",
      "name.saveFail": "無法儲存，請再試。",
      "banner.theme": "主題：{name}",
      "banner.rescue": "好險——成功救援！",
      "banner.miss": "失手！",
      "banner.top10": "打入全球十大！",
      "banner.saved": "分數已儲存！",
      "float.perfect": "完美！",
      "float.closeCall": "好險",
      "float.miss": "失手！",
      "float.close": "差一點！",
      "theme.night": "夜之城",
      "theme.sunset": "夕陽",
      "theme.forest": "森林",
      "theme.ocean": "海洋",
      "theme.aurora": "極光",
      "theme.neon": "霓虹",
      "lang.aria": "語言",
      "lang.en": "EN",
      "lang.zh": "香港中文",
    },
  };

  let lang = "en";
  const listeners = [];

  function detectInitial() {
    const saved = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("zh")) return "zh-HK";
    return "en";
  }

  function t(key, vars) {
    const table = STRINGS[lang] || STRINGS.en;
    let s = table[key] ?? STRINGS.en[key] ?? key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] != null ? String(vars[k]) : `{${k}}`
      );
    }
    return s;
  }

  function themeName(id) {
    return t(`theme.${id}`);
  }

  function applyStatic() {
    document.documentElement.lang = lang === "zh-HK" ? "zh-HK" : "en";

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key) node.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (key) node.setAttribute("placeholder", t(key));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria");
      if (key) node.setAttribute("aria-label", t(key));
    });

    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next) || next === lang) {
      applyStatic();
      return;
    }
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    applyStatic();
    listeners.forEach((fn) => {
      try {
        fn(lang);
      } catch {
        /* ignore */
      }
    });
  }

  function getLang() {
    return lang;
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function wireToggle() {
    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-lang");
        if (next) setLang(next);
      });
    });
  }

  lang = detectInitial();
  window.TowerBloxxI18n = { t, themeName, getLang, setLang, onChange, applyStatic, wireToggle };
})();
