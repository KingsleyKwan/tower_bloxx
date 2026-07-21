(() => {
  "use strict";

  const APP_VERSION = "1.3.0";
  const STORAGE_KEY = "tower_bloxx_best";
  const THEME_KEY = "tower_bloxx_theme_best";
  const MAX_LIVES = 3;
  const BLOCK_H = 78;
  const BASE_W = 92;
  const MIN_OVERLAP = 0.28;
  const NEAR_MISS_OVERLAP = 0.42;
  const PERFECT_TOL = 8;
  const COMBO_MS = 4200;
  const CRANE_SCREEN_Y = 70;
  const FOCUS_SCREEN_Y = 300;
  const DROP_GAP = 130;
  const MAX_TOWER_SWAY = 34;
  const MAX_COMBO = 99;
  const RESCUE_FLOOR_UNLOCK = 3;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const el = {
    hud: document.getElementById("hud"),
    score: document.getElementById("score"),
    floors: document.getElementById("floors"),
    lives: document.getElementById("lives"),
    comboWrap: document.getElementById("combo-wrap"),
    comboBar: document.getElementById("combo-bar"),
    comboText: document.getElementById("combo-text"),
    themeChip: document.getElementById("theme-chip"),
    rescueChip: document.getElementById("rescue-chip"),
    hint: document.getElementById("hint"),
    banner: document.getElementById("banner"),
    flash: document.getElementById("flash"),
    start: document.getElementById("start-screen"),
    gameover: document.getElementById("gameover-screen"),
    btnStart: document.getElementById("btn-start"),
    btnRetry: document.getElementById("btn-retry"),
    finalScore: document.getElementById("final-score"),
    finalFloors: document.getElementById("final-floors"),
    finalBest: document.getElementById("final-best"),
    finalCombo: document.getElementById("final-combo"),
    finalAccuracy: document.getElementById("final-accuracy"),
    newBadge: document.getElementById("new-badge"),
    themeUnlockNote: document.getElementById("theme-unlock-note"),
    bestStart: document.getElementById("best-start"),
    themesStart: document.getElementById("themes-start"),
    gameoverLede: document.getElementById("gameover-lede"),
  };

  const FLOOR_PALETTES = [
    { wall: "#3ec6d8", wallDeep: "#2aa8bc", band: "#e8c84a", bandDeep: "#d4a82e", rivet: "#f0d35c" },
    { wall: "#36bfd4", wallDeep: "#249ab0", band: "#ebcc52", bandDeep: "#d6ab32", rivet: "#f3d866" },
    { wall: "#45cddc", wallDeep: "#2fb0c4", band: "#e6c446", bandDeep: "#d0a528", rivet: "#eed058" },
    { wall: "#2ebfd0", wallDeep: "#1f9aab", band: "#eacb4e", bandDeep: "#d5a930", rivet: "#f1d560" },
  ];

  const BASE_PALETTE = {
    wall: "#7a8794",
    wallDeep: "#5c6772",
    band: "#c5a35a",
    bandDeep: "#a8843e",
    rivet: "#d4b56a",
  };

  const THEMES = [
    {
      id: "night",
      name: "Night City",
      at: 0,
      sky: ["#0b1d3a", "#1a3a5c", "#2d4a6f"],
      cloud: "rgba(180,200,230,0.18)",
      city: "rgba(90,120,160,0.35)",
      ground: ["#2f4a3a", "#1f3328"],
    },
    {
      id: "sunset",
      name: "Sunset",
      at: 10,
      sky: ["#ff7b54", "#ffb347", "#ffe0a3"],
      cloud: "rgba(255,240,220,0.4)",
      city: "rgba(120,70,90,0.28)",
      ground: ["#6b8f3a", "#4f6e28"],
    },
    {
      id: "forest",
      name: "Forest",
      at: 25,
      sky: ["#87c5a4", "#b7e0c8", "#e7f6ee"],
      cloud: "rgba(255,255,255,0.4)",
      city: "rgba(70,110,80,0.28)",
      ground: ["#3f7d3a", "#2d5c2a"],
    },
    {
      id: "ocean",
      name: "Ocean",
      at: 50,
      sky: ["#1d7a9c", "#3aa7c9", "#a8e4f0"],
      cloud: "rgba(255,255,255,0.42)",
      city: "rgba(40,90,120,0.3)",
      ground: ["#2a9d8f", "#1d7a6f"],
    },
    {
      id: "aurora",
      name: "Aurora",
      at: 100,
      sky: ["#13294b", "#1f6f6a", "#7bdcb5"],
      cloud: "rgba(180,255,220,0.22)",
      city: "rgba(80,140,160,0.3)",
      ground: ["#355c4a", "#243f34"],
    },
    {
      id: "neon",
      name: "Neon",
      at: 250,
      sky: ["#12061f", "#3a0ca3", "#f72585"],
      cloud: "rgba(255,120,220,0.18)",
      city: "rgba(90,40,140,0.4)",
      ground: ["#2b1055", "#1a0a33"],
    },
  ];

  let W = 0;
  let H = 0;
  let dpr = 1;
  let state = "menu";
  let lastT = 0;
  let score = 0;
  let floors = 0;
  let lives = MAX_LIVES;
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let themeBest = Number(localStorage.getItem(THEME_KEY) || best || 0);
  let combo = 0;
  let comboMsLeft = 0;
  let bestCombo = 0;
  let drops = 0;
  let hits = 0;
  let cameraY = 0;
  let targetCameraY = 0;
  let tower = [];
  let crane = null;
  let falling = null;
  let particles = [];
  let floatTexts = [];
  let rings = [];
  let trails = [];
  let shake = 0;
  let groundY = 0;
  let swingPhase = 0;
  let swingAnchorX = 0;
  let swayPhase = 0;
  let swayAmp = 0;
  let instability = 0;
  let showHint = true;
  let rescueAvailable = false;
  let rescueUsed = false;
  let activeTheme = THEMES[0];
  let bannerTimer = 0;
  let audioCtx = null;
  let squash = null; // { index, t, dur }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 70;
    if (state === "menu") targetCameraY = 0;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function getBest() {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  }

  function saveBest(value) {
    best = Math.max(getBest(), value);
    localStorage.setItem(STORAGE_KEY, String(best));
  }

  function saveThemeProgress(floorCount) {
    themeBest = Math.max(themeBest, floorCount);
    localStorage.setItem(THEME_KEY, String(themeBest));
  }

  function themeForScore(s) {
    let t = THEMES[0];
    for (const th of THEMES) {
      if (s >= th.at) t = th;
    }
    return t;
  }

  function unlockedThemeNames() {
    return THEMES.filter((t) => themeBest >= t.at).map((t) => t.name);
  }

  function nextTheme() {
    return THEMES.find((t) => themeBest < t.at) || null;
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, dur, type = "square", gain = 0.04, slide = 0) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sfx(kind) {
    ensureAudio();
    if (!audioCtx) return;
    if (kind === "drop") tone(220, 0.08, "triangle", 0.035, -80);
    else if (kind === "land") {
      tone(180, 0.06, "square", 0.03);
      tone(90, 0.1, "sawtooth", 0.02);
    } else if (kind === "perfect") {
      tone(523, 0.08, "sine", 0.045);
      setTimeout(() => tone(659, 0.08, "sine", 0.04), 70);
      setTimeout(() => tone(784, 0.12, "sine", 0.04), 140);
    } else if (kind === "combo") {
      tone(440, 0.07, "square", 0.035);
      tone(660, 0.1, "square", 0.03, 120);
    } else if (kind === "miss") tone(110, 0.25, "sawtooth", 0.05, -40);
    else if (kind === "rescue") {
      tone(392, 0.1, "sine", 0.04);
      setTimeout(() => tone(523, 0.15, "sine", 0.04), 90);
    } else if (kind === "milestone") {
      tone(523, 0.08, "triangle", 0.04);
      setTimeout(() => tone(659, 0.08, "triangle", 0.04), 80);
      setTimeout(() => tone(784, 0.08, "triangle", 0.04), 160);
      setTimeout(() => tone(1046, 0.18, "triangle", 0.045), 240);
    } else if (kind === "gameover") {
      tone(300, 0.15, "triangle", 0.04, -60);
      setTimeout(() => tone(200, 0.25, "triangle", 0.04, -80), 120);
    } else if (kind === "theme") {
      tone(349, 0.1, "sine", 0.035);
      setTimeout(() => tone(440, 0.12, "sine", 0.035), 100);
    }
  }

  function showBanner(text, ms = 900, celebrate = false) {
    el.banner.textContent = text;
    el.banner.classList.toggle("celebrate", celebrate);
    el.banner.classList.remove("hidden");
    bannerTimer = ms;
  }

  function flashRed() {
    el.flash.hidden = false;
    el.flash.classList.remove("on");
    void el.flash.offsetWidth;
    el.flash.classList.add("on");
  }

  function setShake(level) {
    // normal ~6, near-miss ~12, perfect ~5, miss ~16
    shake = Math.max(shake, level);
  }

  function renderLives() {
    el.lives.innerHTML = "";
    for (let i = 0; i < MAX_LIVES; i++) {
      const d = document.createElement("span");
      d.className = "life" + (i < lives ? "" : " empty");
      el.lives.appendChild(d);
    }
  }

  function updateHud() {
    el.score.textContent = String(score);
    el.floors.textContent = String(floors);
    renderLives();
    el.themeChip.textContent = activeTheme.name;

    if (combo > 0 && comboMsLeft > 0) {
      el.comboWrap.hidden = false;
      el.comboBar.style.width = `${clamp(comboMsLeft / COMBO_MS, 0, 1) * 100}%`;
      el.comboText.textContent = `COMBO x${combo}`;
    } else {
      el.comboWrap.hidden = true;
    }

    if (floors >= RESCUE_FLOOR_UNLOCK) {
      el.rescueChip.hidden = false;
      if (rescueUsed) {
        el.rescueChip.textContent = "Rescue used";
        el.rescueChip.classList.add("used");
      } else {
        el.rescueChip.textContent = "Rescue ready";
        el.rescueChip.classList.remove("used");
        rescueAvailable = true;
      }
    } else {
      el.rescueChip.hidden = true;
    }
  }

  function topBlock() {
    return tower[tower.length - 1] || null;
  }

  function swingSpeed() {
    return 1.45 + floors * 0.07 + Math.min(instability * 0.01, 0.5);
  }

  function swingAmplitude() {
    const base = Math.min(W * 0.36, 170);
    return base + Math.min(floors * 3.2, 55);
  }

  function swaySpeed() {
    return 1.1 + floors * 0.035;
  }

  function updateSwayAmp() {
    const heightAmp = Math.max(0, (floors - 2) * 2.2);
    const leanAmp = Math.min(instability * 0.22, 16);
    swayAmp = clamp(heightAmp + leanAmp, 0, MAX_TOWER_SWAY);
  }

  function blockSwayX(index) {
    if (tower.length <= 1 || swayAmp <= 0) return 0;
    const t = index / (tower.length - 1);
    return Math.sin(swayPhase) * swayAmp * t * t;
  }

  function topSwayX() {
    return blockSwayX(tower.length - 1);
  }

  function topCenterX() {
    const top = topBlock();
    return top.x + top.w / 2 + topSwayX();
  }

  function craneHangY() {
    return CRANE_SCREEN_Y;
  }

  function applyTheme(fromFloors, announce) {
    const next = themeForScore(fromFloors);
    if (next.id !== activeTheme.id) {
      activeTheme = next;
      if (announce) {
        sfx("theme");
        showBanner(`Theme: ${next.name}`, 1100, true);
      }
    } else {
      activeTheme = next;
    }
    el.themeChip.textContent = activeTheme.name;
  }

  function spawnCraneBlock() {
    const top = topBlock();
    const width = top ? top.w : BASE_W;
    const palette = FLOOR_PALETTES[floors % FLOOR_PALETTES.length];
    if (!Number.isFinite(swingAnchorX) || swingAnchorX === 0) {
      swingAnchorX = topCenterX();
    }
    const amp = swingAmplitude();
    crane = {
      w: width,
      h: BLOCK_H,
      x: swingAnchorX + Math.sin(swingPhase) * amp,
      y: craneHangY(),
      palette,
    };
    trails = [];
    state = "playing";
  }

  function resetGame() {
    score = 0;
    floors = 0;
    lives = MAX_LIVES;
    combo = 0;
    comboMsLeft = 0;
    bestCombo = 0;
    drops = 0;
    hits = 0;
    cameraY = 0;
    targetCameraY = 0;
    tower = [];
    falling = null;
    particles = [];
    floatTexts = [];
    rings = [];
    trails = [];
    shake = 0;
    swingPhase = 0;
    swingAnchorX = 0;
    swayPhase = 0;
    swayAmp = 0;
    instability = 0;
    showHint = true;
    rescueAvailable = false;
    rescueUsed = false;
    squash = null;
    bannerTimer = 0;
    el.banner.classList.add("hidden");
    el.hint.classList.remove("hidden");
    applyTheme(0, false);

    const foundationW = Math.min(BASE_W, W * 0.28);
    tower.push({
      x: W / 2 - foundationW / 2,
      y: groundY - BLOCK_H,
      w: foundationW,
      h: BLOCK_H,
      palette: BASE_PALETTE,
      isBase: true,
    });

    swingAnchorX = W / 2;
    spawnCraneBlock();
    updateHud();
  }

  function startGame() {
    ensureAudio();
    el.start.classList.add("hidden");
    el.gameover.classList.add("hidden");
    el.hud.classList.remove("hidden");
    resetGame();
  }

  function endGame() {
    state = "gameover";
    const prevBest = getBest();
    const isNew = score > prevBest;
    saveBest(score);
    saveThemeProgress(floors);
    sfx("gameover");

    el.finalScore.textContent = String(score);
    el.finalFloors.textContent = String(floors);
    el.finalBest.textContent = String(best);
    el.finalCombo.textContent = `x${bestCombo}`;
    const accuracy = drops > 0 ? Math.round((hits / drops) * 100) : 0;
    el.finalAccuracy.textContent = `${accuracy}%`;
    el.newBadge.classList.toggle("hidden", !isNew);
    el.gameoverLede.textContent = isNew
      ? "New high population. The city grows with you."
      : "Your tower couldn’t take another miss.";

    const nxt = nextTheme();
    el.themeUnlockNote.textContent = nxt
      ? `Next theme "${nxt.name}" unlocks at ${nxt.at} floors.`
      : "All themes unlocked. Neon City is yours.";

    el.gameover.classList.remove("hidden");
    el.hint.classList.add("hidden");
    el.rescueChip.hidden = true;
  }

  function addFloatText(x, y, text, color, scale = 1) {
    floatTexts.push({ x, y, text, color, life: 1, scale });
  }

  function burst(x, y, color, n = 10, speed = 1) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x,
        y,
        vx: rand(-140, 140) * speed,
        vy: rand(-220, -40) * speed,
        life: rand(0.4, 1),
        color,
        size: rand(3, 8),
      });
    }
  }

  function addRing(x, y, color) {
    rings.push({ x, y, r: 10, life: 1, color });
  }

  function celebrateComboThreshold() {
    if (combo === 5 || combo === 10 || (combo > 10 && combo % 5 === 0)) {
      sfx("milestone");
      el.comboWrap.classList.remove("pulse");
      void el.comboWrap.offsetWidth;
      el.comboWrap.classList.add("pulse");
      showBanner(`COMBO x${combo}`, 900, true);
      burst(W / 2, H * 0.35 + cameraY, "#ff9f1c", 28, 1.4);
      burst(W / 2, H * 0.35 + cameraY, "#ffe066", 18, 1.2);
    } else {
      sfx("combo");
    }
  }

  function drop() {
    if (state !== "playing" || !crane) return;
    ensureAudio();

    if (showHint) {
      showHint = false;
      el.hint.classList.add("hidden");
    }

    drops += 1;
    sfx("drop");
    const top = topBlock();
    const worldX = crane.x - crane.w / 2;
    const startY = cameraY + craneHangY();

    falling = {
      x: worldX,
      y: startY,
      w: crane.w,
      h: crane.h,
      vy: 0,
      tilt: Math.sin(swingPhase) * 0.14,
      palette: crane.palette,
      targetY: top.y - crane.h,
    };
    crane = null;
    trails = [];
    state = "dropping";
  }

  function placeBlock(block, overlapRatio, offset) {
    const perfect = Math.abs(offset) <= PERFECT_TOL;
    const nearMissLand = !perfect && overlapRatio < NEAR_MISS_OVERLAP;

    let points = Math.round(40 + floors * 12);
    points = Math.round(points * (0.55 + overlapRatio * 0.7));

    hits += 1;
    sfx("land");

    if (perfect) {
      combo = combo > 0 && comboMsLeft > 0 ? Math.min(MAX_COMBO, combo + 1) : 1;
      comboMsLeft = COMBO_MS;
      bestCombo = Math.max(bestCombo, combo);
      points = Math.round(points * (1 + combo * 0.35));
      addFloatText(block.x + block.w / 2, block.y, "PERFECT!", "#e85d04", 1.15);
      burst(block.x + block.w / 2, block.y + block.h / 2, "#ffe066", 22, 1.3);
      burst(block.x + block.w / 2, block.y + block.h / 2, "#ffffff", 10, 0.9);
      addRing(block.x + block.w / 2, block.y + block.h / 2, "rgba(255, 214, 10, 0.9)");
      setShake(5);
      sfx("perfect");
      celebrateComboThreshold();
    } else if (combo > 0 && comboMsLeft > 0) {
      points = Math.round(points * (1 + combo * 0.2));
      comboMsLeft = Math.max(comboMsLeft, COMBO_MS * 0.85);
      setShake(nearMissLand ? 12 : 7);
      if (nearMissLand) {
        flashRed();
        addFloatText(block.x + block.w / 2, block.y - 8, "CLOSE!", "#c44536", 1.05);
      }
    } else {
      combo = 0;
      comboMsLeft = 0;
      setShake(nearMissLand ? 12 : 7);
      if (nearMissLand) {
        flashRed();
        addFloatText(block.x + block.w / 2, block.y - 8, "CLOSE!", "#c44536", 1.05);
      }
    }

    score += points;
    floors += 1;
    addFloatText(block.x + block.w / 2, block.y + 22, `+${points}`, "#1f2a36", 1);

    const restX = block.x - topSwayX();
    tower.push({
      x: restX,
      y: block.y,
      w: block.w,
      h: block.h,
      palette: block.palette,
    });
    squash = { index: tower.length - 1, t: 0, dur: 0.28 };

    instability += Math.abs(offset) * 0.35 + (perfect ? 0 : 4);
    instability = Math.max(0, instability - (perfect ? 3 : 0));
    updateSwayAmp();

    saveThemeProgress(floors);
    applyTheme(floors, true);

    const peak = topBlock();
    const desiredFocus = Math.max(FOCUS_SCREEN_Y, craneHangY() + BLOCK_H + DROP_GAP);
    targetCameraY = Math.min(targetCameraY, peak.y - desiredFocus);

    falling = null;
    updateHud();
    spawnCraneBlock();
  }

  function missBlock(block) {
    // Second chance: one free rescue after enough floors
    if (!rescueUsed && floors >= RESCUE_FLOOR_UNLOCK && rescueAvailable) {
      rescueUsed = true;
      rescueAvailable = false;
      flashRed();
      setShake(14);
      burst(block.x + block.w / 2, block.y + block.h / 2, "#ff6b6b", 18);
      addFloatText(W / 2, cameraY + H * 0.32, "CLOSE CALL", "#ffd6a5", 1.2);
      showBanner("CLOSE CALL — rescued!", 1200);
      sfx("rescue");
      combo = 0;
      comboMsLeft = 0;
      instability += 8;
      updateSwayAmp();
      falling = null;
      updateHud();
      spawnCraneBlock();
      return;
    }

    lives -= 1;
    setShake(16);
    flashRed();
    burst(block.x + block.w / 2, block.y + block.h / 2, block.palette.wall, 18);
    addFloatText(W / 2, cameraY + H * 0.35, "MISS!", "#c44536", 1.2);
    showBanner("MISS!", 700);
    sfx("miss");
    combo = 0;
    comboMsLeft = 0;
    instability += 10;
    updateSwayAmp();
    falling = null;
    updateHud();

    if (lives <= 0) {
      endGame();
      return;
    }
    spawnCraneBlock();
  }

  function resolveLanding(block) {
    const top = topBlock();
    const sway = topSwayX();
    const topX = top.x + sway;
    const left = Math.max(block.x, topX);
    const right = Math.min(block.x + block.w, topX + top.w);
    const overlap = right - left;
    const overlapRatio = overlap / block.w;
    const offset = block.x + block.w / 2 - (topX + top.w / 2);

    if (overlap <= 0 || overlapRatio < MIN_OVERLAP) {
      // Near-miss tension even when failing
      if (overlapRatio > 0.05 && overlapRatio < MIN_OVERLAP) {
        flashRed();
        addFloatText(block.x + block.w / 2, block.y, "CLOSE!", "#c44536");
      }
      missBlock(block);
      return;
    }

    block.y = top.y - block.h;
    placeBlock(block, overlapRatio, offset);
  }

  function update(dt) {
    cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 4);
    if (shake > 0) shake = Math.max(0, shake - dt * 28);

    if (bannerTimer > 0) {
      bannerTimer -= dt * 1000;
      if (bannerTimer <= 0) el.banner.classList.add("hidden");
    }

    if (squash) {
      squash.t += dt;
      if (squash.t >= squash.dur) squash = null;
    }

    if (state === "playing" && combo > 0 && comboMsLeft > 0) {
      comboMsLeft -= dt * 1000;
      if (comboMsLeft <= 0) {
        combo = 0;
        comboMsLeft = 0;
      }
    }

    if (state === "playing" || state === "dropping") updateHud();

    if (state === "playing" || state === "dropping") {
      swingPhase += dt * swingSpeed();
      swayPhase += dt * swaySpeed();
      updateSwayAmp();
    }

    if (state === "playing" && crane) {
      const amp = swingAmplitude();
      const targetCenter = topCenterX();
      swingAnchorX += (targetCenter - swingAnchorX) * Math.min(1, dt * 3);
      crane.x = swingAnchorX + Math.sin(swingPhase) * amp;
      crane.y = craneHangY();

      // Swing ghost trail
      trails.push({
        x: crane.x - crane.w / 2,
        y: crane.y,
        w: crane.w,
        h: crane.h,
        palette: crane.palette,
        life: 0.35,
      });
      if (trails.length > 10) trails.shift();
    }

    if (state === "dropping" && falling) {
      falling.vy += 2200 * dt;
      falling.y += falling.vy * dt;
      falling.tilt *= Math.max(0, 1 - dt * 3);
      const top = topBlock();
      falling.targetY = top.y - falling.h;
      if (falling.y >= falling.targetY) {
        falling.y = falling.targetY;
        falling.tilt = 0;
        resolveLanding(falling);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.y -= 55 * dt;
      f.life -= dt;
      if (f.life <= 0) floatTexts.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 120 * dt;
      r.life -= dt * 1.4;
      if (r.life <= 0) rings.splice(i, 1);
    }

    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= dt;
      if (trails[i].life <= 0) trails.splice(i, 1);
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, activeTheme.sky[0]);
    g.addColorStop(0.5, activeTheme.sky[1]);
    g.addColorStop(1, activeTheme.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = activeTheme.cloud;
    drawCloud(W * 0.15, 80 - cameraY * 0.05, 70);
    drawCloud(W * 0.7, 140 - cameraY * 0.04, 90);
    drawCloud(W * 0.4, 40 - cameraY * 0.06, 55);

    if (activeTheme.id === "aurora") {
      ctx.globalAlpha = 0.25;
      const ag = ctx.createLinearGradient(0, 0, W, H * 0.5);
      ag.addColorStop(0, "#00f5d4");
      ag.addColorStop(0.5, "#7b2cbf");
      ag.addColorStop(1, "#00bbf9");
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, W, H * 0.55);
      ctx.globalAlpha = 1;
    }
  }

  function drawCloud(x, y, s) {
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.38, 0, 0, Math.PI * 2);
    ctx.ellipse(x - s * 0.45, y + 4, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.4, y + 6, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    const y = groundY - cameraY;
    ctx.fillStyle = activeTheme.city;
    for (let i = 0; i < 12; i++) {
      const bx = (i / 12) * W + ((i * 37) % 20);
      const bh = 40 + ((i * 53) % 80);
      ctx.fillRect(bx, y - bh + 8, 28 + (i % 3) * 10, bh);
    }

    ctx.fillStyle = activeTheme.ground[0];
    ctx.fillRect(0, y, W, H - y + 40);
    ctx.fillStyle = activeTheme.ground[1];
    ctx.fillRect(0, y, W, 10);

    const base = tower[0];
    if (base) {
      ctx.fillStyle = "#868e96";
      ctx.fillRect(base.x - 18, y - 6, base.w + 36, 14);
      ctx.fillStyle = "#495057";
      ctx.fillRect(base.x - 28, y + 4, base.w + 56, 18);
    }
  }

  function roundRectPath(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawWindow(wx, wy, ww, wh) {
    ctx.fillStyle = "#6b3a28";
    roundRectPath(wx - 2, wy - 2, ww + 4, wh + 4, 3);
    ctx.fill();

    const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    g.addColorStop(0, "#5a7a9a");
    g.addColorStop(0.45, "#8eb4d4");
    g.addColorStop(1, "#3d5a78");
    ctx.fillStyle = g;
    roundRectPath(wx, wy, ww, wh, 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(wx + ww * 0.25, wy + wh * 0.2);
    ctx.lineTo(wx + ww * 0.45, wy + wh * 0.75);
    ctx.moveTo(wx + ww * 0.42, wy + wh * 0.18);
    ctx.lineTo(wx + ww * 0.62, wy + wh * 0.72);
    ctx.stroke();
  }

  function drawRivet(cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#f0d35c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
  }

  function drawBlock(b, screenY, angle = 0, alpha = 1, squashAmt = 0) {
    let { x, w, h, palette } = b;
    let y = screenY;
    if (squashAmt > 0) {
      const sy = 1 - squashAmt * 0.22;
      const sx = 1 + squashAmt * 0.14;
      const nw = w * sx;
      const nh = h * sy;
      x = x + (w - nw) / 2;
      y = y + (h - nh);
      w = nw;
      h = nh;
    }

    const band = Math.max(10, Math.round(h * 0.16));
    const radius = Math.max(8, Math.round(w * 0.1));

    ctx.save();
    ctx.globalAlpha = alpha;
    if (angle) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(angle);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    roundRectPath(x + 4, y + 6, w, h, radius);
    ctx.fill();

    roundRectPath(x, y, w, h, radius);
    const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
    bodyGrad.addColorStop(0, palette.wallDeep);
    bodyGrad.addColorStop(0.18, palette.wall);
    bodyGrad.addColorStop(0.82, palette.wall);
    bodyGrad.addColorStop(1, palette.wallDeep);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.save();
    roundRectPath(x, y, w, h, radius);
    ctx.clip();
    const topBand = ctx.createLinearGradient(x, y, x, y + band);
    topBand.addColorStop(0, "#f3dc6a");
    topBand.addColorStop(0.55, palette.band);
    topBand.addColorStop(1, palette.bandDeep);
    ctx.fillStyle = topBand;
    ctx.fillRect(x, y, w, band);
    ctx.fillStyle = palette.bandDeep;
    ctx.fillRect(x, y + h - band, w, band);
    ctx.restore();

    roundRectPath(x, y, w, h, radius);
    ctx.strokeStyle = "rgba(30, 90, 100, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!b.isBase) {
      const winW = w * 0.22;
      const winH = h * 0.36;
      const winY = y + (h - winH) / 2;
      const gap = w * 0.08;
      const pairW = winW * 2 + gap;
      const winX0 = x + (w - pairW) / 2;
      drawWindow(winX0, winY, winW, winH);
      drawWindow(winX0 + winW + gap, winY, winW, winH);
    } else {
      const doorW = w * 0.28;
      const doorH = h * 0.42;
      const doorX = x + (w - doorW) / 2;
      const doorY = y + h - band - doorH + 2;
      ctx.fillStyle = "#5c6772";
      roundRectPath(doorX, doorY, doorW, doorH, 4);
      ctx.fill();
    }

    const rr = Math.max(3.5, w * 0.055);
    const inset = Math.max(10, w * 0.12);
    drawRivet(x + inset, y + inset, rr);
    drawRivet(x + w - inset, y + inset, rr);
    drawRivet(x + inset, y + h - inset, rr);
    drawRivet(x + w - inset, y + h - inset, rr);

    ctx.restore();
  }

  function drawCrane() {
    if (!crane) return;
    const cx = crane.x;
    const topY = 18;
    const blockY = crane.y;
    const tilt = Math.sin(swingPhase) * 0.14;

    for (const t of trails) {
      drawBlock(t, t.y, 0, clamp(t.life * 0.45, 0, 0.35));
    }

    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.12, topY + 8);
    ctx.lineTo(W * 0.88, topY + 8);
    ctx.stroke();

    ctx.strokeStyle = "#6c757d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 8);
    ctx.lineTo(cx, blockY + 4);
    ctx.stroke();

    ctx.fillStyle = "#495057";
    ctx.beginPath();
    ctx.arc(cx, blockY + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    drawBlock(
      { x: cx - crane.w / 2, w: crane.w, h: crane.h, palette: crane.palette },
      blockY,
      tilt
    );
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y - cameraY, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawRings() {
    for (const r of rings) {
      ctx.globalAlpha = clamp(r.life, 0, 1);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y - cameraY, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloatTexts() {
    ctx.textAlign = "center";
    for (const f of floatTexts) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = `900 ${Math.round(18 * (f.scale || 1))}px Nunito, sans-serif`;
      ctx.fillText(f.text, f.x, f.y - cameraY);
    }
    ctx.globalAlpha = 1;
  }

  function squashAmountFor(index) {
    if (!squash || squash.index !== index) return 0;
    const p = squash.t / squash.dur;
    // Elastic settle: squash then rebound
    if (p < 0.35) return p / 0.35;
    if (p < 0.7) return 1 - ((p - 0.35) / 0.35) * 1.2;
    return Math.max(0, -0.2 + ((p - 0.7) / 0.3) * 0.2);
  }

  function draw() {
    const sx = shake ? rand(-shake, shake) : 0;
    const sy = shake ? rand(-shake, shake) : 0;
    ctx.save();
    ctx.translate(sx, sy);

    drawSky();
    drawGround();

    for (let i = 0; i < tower.length; i++) {
      const b = tower[i];
      const sway = blockSwayX(i);
      drawBlock({ ...b, x: b.x + sway }, b.y - cameraY, 0, 1, squashAmountFor(i));
    }

    if (falling) {
      drawBlock(falling, falling.y - cameraY, falling.tilt || 0);
    }

    drawCrane();
    drawRings();
    drawParticles();
    drawFloatTexts();

    ctx.restore();
  }

  function drawMenuBackdrop() {
    activeTheme = themeForScore(themeBest);
    drawSky();
    drawGround();
    const previewW = Math.min(BASE_W, W * 0.28);
    drawBlock(
      {
        x: W / 2 - previewW / 2,
        w: previewW,
        h: BLOCK_H,
        palette: BASE_PALETTE,
        isBase: true,
      },
      groundY - BLOCK_H
    );

    const amp = Math.min(W * 0.28, 120);
    const cx = W / 2 + Math.sin(performance.now() / 700) * amp;
    const by = 90;
    const tilt = Math.sin(performance.now() / 700) * 0.14;
    ctx.strokeStyle = "#6c757d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 28);
    ctx.lineTo(cx, by);
    ctx.stroke();
    drawBlock(
      {
        x: cx - previewW / 2,
        w: previewW,
        h: BLOCK_H,
        palette: FLOOR_PALETTES[0],
      },
      by,
      tilt
    );
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;

    if (state === "playing" || state === "dropping") {
      update(dt);
      draw();
    } else if (state === "gameover") {
      draw();
    } else {
      drawMenuBackdrop();
    }

    requestAnimationFrame(loop);
  }

  function onPointer() {
    if (state === "playing") drop();
  }

  function onKey(e) {
    if (e.code === "Space" || e.code === "ArrowDown" || e.code === "Enter") {
      e.preventDefault();
      if (state === "menu" || state === "gameover") startGame();
      else onPointer();
    }
  }

  el.btnStart.addEventListener("click", startGame);
  el.btnRetry.addEventListener("click", startGame);
  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", resize);

  document.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  best = getBest();
  themeBest = Math.max(Number(localStorage.getItem(THEME_KEY) || 0), 0);
  if (best > 0) el.bestStart.textContent = `Best population: ${best}`;
  const unlocked = unlockedThemeNames();
  const nxt = nextTheme();
  el.themesStart.textContent = nxt
    ? `Themes: ${unlocked.join(", ")} · next at ${nxt.at} floors`
    : `Themes unlocked: ${unlocked.join(", ")}`;

  const versionEl = document.getElementById("app-version");
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;
  resize();
  requestAnimationFrame(loop);
})();
