(() => {
  "use strict";

  const APP_VERSION = "1.1.0";
  const STORAGE_KEY = "tower_bloxx_best";
  const MAX_LIVES = 3;
  // Chunky cube floors (classic Tower Bloxx), not long thin slabs
  const BLOCK_H = 78;
  const BASE_W = 92;
  const MIN_OVERLAP = 0.28;
  const PERFECT_TOL = 6;
  const COMBO_MS = 2800;

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
    hint: document.getElementById("hint"),
    start: document.getElementById("start-screen"),
    gameover: document.getElementById("gameover-screen"),
    btnStart: document.getElementById("btn-start"),
    btnRetry: document.getElementById("btn-retry"),
    finalScore: document.getElementById("final-score"),
    finalFloors: document.getElementById("final-floors"),
    finalBest: document.getElementById("final-best"),
    bestStart: document.getElementById("best-start"),
  };

  // Classic Tower Bloxx: cyan body + gold bands (slight shade shifts per floor)
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

  let W = 0;
  let H = 0;
  let dpr = 1;
  let state = "menu"; // menu | playing | dropping | settling | gameover
  let lastT = 0;
  let score = 0;
  let floors = 0;
  let lives = MAX_LIVES;
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let combo = 0;
  let comboUntil = 0;
  let cameraY = 0;
  let targetCameraY = 0;
  let tower = [];
  let crane = null;
  let falling = null;
  let particles = [];
  let floatTexts = [];
  let shake = 0;
  let groundY = 0;
  let swingPhase = 0;
  let swingAnchorX = 0;
  let showHint = true;

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

    const now = performance.now();
    if (combo > 0 && now < comboUntil) {
      el.comboWrap.hidden = false;
      const left = (comboUntil - now) / COMBO_MS;
      el.comboBar.style.width = `${clamp(left, 0, 1) * 100}%`;
      el.comboText.textContent = `COMBO x${combo}`;
    } else {
      if (combo > 0 && now >= comboUntil) combo = 0;
      el.comboWrap.hidden = true;
    }
  }

  function topBlock() {
    return tower[tower.length - 1] || null;
  }

  function swingSpeed() {
    return 1.35 + floors * 0.045;
  }

  function swingAmplitude() {
    const base = Math.min(W * 0.38, 180);
    return base + Math.min(floors * 2.2, 40);
  }

  function spawnCraneBlock() {
    const top = topBlock();
    const width = top ? top.w : BASE_W;
    const palette = FLOOR_PALETTES[floors % FLOOR_PALETTES.length];
    if (!Number.isFinite(swingAnchorX) || swingAnchorX === 0) {
      swingAnchorX = top.x + top.w / 2;
    }
    const amp = swingAmplitude();
    crane = {
      w: width,
      h: BLOCK_H,
      // Continue from current swing phase (no reset jump)
      x: swingAnchorX + Math.sin(swingPhase) * amp,
      y: 78,
      palette,
      angle: 0,
    };
    state = "playing";
  }

  function resetGame() {
    score = 0;
    floors = 0;
    lives = MAX_LIVES;
    combo = 0;
    comboUntil = 0;
    cameraY = 0;
    targetCameraY = 0;
    tower = [];
    falling = null;
    particles = [];
    floatTexts = [];
    shake = 0;
    swingPhase = 0;
    swingAnchorX = 0;
    showHint = true;
    el.hint.classList.remove("hidden");

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
    el.start.classList.add("hidden");
    el.gameover.classList.add("hidden");
    el.hud.classList.remove("hidden");
    resetGame();
  }

  function endGame() {
    state = "gameover";
    saveBest(score);
    el.finalScore.textContent = String(score);
    el.finalFloors.textContent = String(floors);
    el.finalBest.textContent = String(best);
    el.gameover.classList.remove("hidden");
    el.hint.classList.add("hidden");
  }

  function addFloatText(x, y, text, color) {
    floatTexts.push({ x, y, text, color, life: 1 });
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x,
        y,
        vx: rand(-120, 120),
        vy: rand(-180, -40),
        life: rand(0.4, 0.9),
        color,
        size: rand(3, 7),
      });
    }
  }

  function drop() {
    if (state !== "playing" || !crane) return;

    if (showHint) {
      showHint = false;
      el.hint.classList.add("hidden");
    }

    const top = topBlock();
    const worldX = crane.x - crane.w / 2;

    falling = {
      x: worldX,
      y: cameraY + 90,
      w: crane.w,
      h: crane.h,
      vy: 0,
      tilt: Math.sin(swingPhase) * 0.14,
      palette: crane.palette,
      targetY: top.y - crane.h,
    };
    crane = null;
    state = "dropping";
  }

  function placeBlock(block, overlapRatio, offset) {
    const top = topBlock();
    const perfect = Math.abs(offset) <= PERFECT_TOL;
    const now = performance.now();

    let points = Math.round(40 + floors * 12);
    points = Math.round(points * (0.55 + overlapRatio * 0.7));

    if (perfect) {
      combo = now < comboUntil ? combo + 1 : 1;
      comboUntil = now + COMBO_MS;
      points = Math.round(points * (1 + combo * 0.35));
      addFloatText(block.x + block.w / 2, block.y, "PERFECT!", "#e85d04");
      burst(block.x + block.w / 2, block.y + block.h / 2, "#ffe066", 14);
    } else if (now < comboUntil) {
      points = Math.round(points * (1 + combo * 0.2));
      comboUntil = now + COMBO_MS * 0.75;
    } else {
      combo = 0;
    }

    score += points;
    floors += 1;
    addFloatText(block.x + block.w / 2, block.y + 18, `+${points}`, "#1f2a36");

    tower.push({
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      palette: block.palette,
    });

    // Soft lean: if offset large, nudge visual sway via camera shake
    shake = perfect ? 4 : 8 + Math.abs(offset) * 0.08;

    // Follow tower upward only once the top rises past the focus line.
    // (y grows downward, so camera decreases into negative values as we scroll up.)
    const FOCUS_SCREEN_Y = 170;
    const peak = topBlock();
    targetCameraY = Math.min(targetCameraY, peak.y - FOCUS_SCREEN_Y);

    falling = null;
    updateHud();
    spawnCraneBlock();
  }

  function missBlock(block) {
    lives -= 1;
    shake = 14;
    burst(block.x + block.w / 2, block.y + block.h / 2, block.palette.wall, 16);
    addFloatText(W / 2, H * 0.35, "MISS!", "#c44536");
    combo = 0;
    comboUntil = 0;
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
    const left = Math.max(block.x, top.x);
    const right = Math.min(block.x + block.w, top.x + top.w);
    const overlap = right - left;
    const overlapRatio = overlap / block.w;
    const offset = block.x + block.w / 2 - (top.x + top.w / 2);

    if (overlap <= 0 || overlapRatio < MIN_OVERLAP) {
      missBlock(block);
      return;
    }

    // Snap resting y onto tower top
    block.y = top.y - block.h;
    placeBlock(block, overlapRatio, offset);
  }

  function update(dt) {
    cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 4);
    if (shake > 0) shake = Math.max(0, shake - dt * 30);

    // Combo bar tick
    if (state === "playing" || state === "dropping") updateHud();

    // Keep swing momentum running even while a block is falling
    if (state === "playing" || state === "dropping") {
      swingPhase += dt * swingSpeed();
    }

    if (state === "playing" && crane) {
      const amp = swingAmplitude();
      const top = topBlock();
      const targetCenter = top.x + top.w / 2;
      // Ease anchor toward tower top so off-center landings don't teleport the wire
      swingAnchorX += (targetCenter - swingAnchorX) * Math.min(1, dt * 3);
      crane.x = swingAnchorX + Math.sin(swingPhase) * amp;
      crane.y = 78;
    }

    if (state === "dropping" && falling) {
      falling.vy += 2200 * dt;
      falling.y += falling.vy * dt;
      falling.tilt *= Math.max(0, 1 - dt * 3);
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
      f.y -= 40 * dt;
      f.life -= dt;
      if (f.life <= 0) floatTexts.splice(i, 1);
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4eb8e8");
    g.addColorStop(0.45, "#8ed6f5");
    g.addColorStop(1, "#d8f1fb");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Soft clouds
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    drawCloud(W * 0.15, 80 - cameraY * 0.05, 70);
    drawCloud(W * 0.7, 140 - cameraY * 0.04, 90);
    drawCloud(W * 0.4, 40 - cameraY * 0.06, 55);
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
    // Distant skyline
    ctx.fillStyle = "rgba(69, 123, 157, 0.25)";
    for (let i = 0; i < 12; i++) {
      const bx = (i / 12) * W + ((i * 37) % 20);
      const bh = 40 + ((i * 53) % 80);
      ctx.fillRect(bx, y - bh + 8, 28 + (i % 3) * 10, bh);
    }

    ctx.fillStyle = "#7cb518";
    ctx.fillRect(0, y, W, H - y + 40);
    ctx.fillStyle = "#5a8f12";
    ctx.fillRect(0, y, W, 10);

    // Foundation pad
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
    // Frame
    ctx.fillStyle = "#6b3a28";
    roundRectPath(wx - 2, wy - 2, ww + 4, wh + 4, 3);
    ctx.fill();

    // Glass
    const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    g.addColorStop(0, "#5a7a9a");
    g.addColorStop(0.45, "#8eb4d4");
    g.addColorStop(1, "#3d5a78");
    ctx.fillStyle = g;
    roundRectPath(wx, wy, ww, wh, 2);
    ctx.fill();

    // Shine streaks
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
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(160,120,30,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawBlock(b, screenY, angle = 0) {
    const { x, w, h, palette } = b;
    const y = screenY;
    const band = Math.max(10, Math.round(h * 0.16));
    const radius = Math.max(8, Math.round(w * 0.1));

    ctx.save();
    if (angle) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(angle);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Soft drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    roundRectPath(x + 4, y + 6, w, h, radius);
    ctx.fill();

    // Main cyan body
    roundRectPath(x, y, w, h, radius);
    const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
    bodyGrad.addColorStop(0, palette.wallDeep);
    bodyGrad.addColorStop(0.18, palette.wall);
    bodyGrad.addColorStop(0.82, palette.wall);
    bodyGrad.addColorStop(1, palette.wallDeep);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Top gold band
    ctx.save();
    roundRectPath(x, y, w, h, radius);
    ctx.clip();
    const topBand = ctx.createLinearGradient(x, y, x, y + band);
    topBand.addColorStop(0, "#f3dc6a");
    topBand.addColorStop(0.55, palette.band);
    topBand.addColorStop(1, palette.bandDeep);
    ctx.fillStyle = topBand;
    ctx.fillRect(x, y, w, band);

    // Bottom gold band
    const botBand = ctx.createLinearGradient(x, y + h - band, x, y + h);
    botBand.addColorStop(0, palette.band);
    botBand.addColorStop(1, palette.bandDeep);
    ctx.fillStyle = botBand;
    ctx.fillRect(x, y + h - band, w, band);
    ctx.restore();

    // Bevel highlight on left / top edge of body
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.4, y + band + 4);
    ctx.lineTo(x + radius * 0.4, y + h - band - 4);
    ctx.stroke();

    // Outer outline
    roundRectPath(x, y, w, h, radius);
    ctx.strokeStyle = "rgba(30, 90, 100, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Two classic side-by-side windows
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
      // Simple door on foundation
      const doorW = w * 0.28;
      const doorH = h * 0.42;
      const doorX = x + (w - doorW) / 2;
      const doorY = y + h - band - doorH + 2;
      ctx.fillStyle = "#5c6772";
      roundRectPath(doorX, doorY, doorW, doorH, 4);
      ctx.fill();
      ctx.fillStyle = "#f0d35c";
      ctx.beginPath();
      ctx.arc(doorX + doorW * 0.72, doorY + doorH * 0.55, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Four corner rivets (classic Tower Bloxx studs)
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

    // Thin boom cable rail
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.12, topY + 8);
    ctx.lineTo(W * 0.88, topY + 8);
    ctx.stroke();

    // Cable
    ctx.strokeStyle = "#6c757d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 8);
    ctx.lineTo(cx, blockY + 4);
    ctx.stroke();

    // Hook
    ctx.fillStyle = "#495057";
    ctx.beginPath();
    ctx.arc(cx, blockY + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    drawBlock(
      {
        x: cx - crane.w / 2,
        w: crane.w,
        h: crane.h,
        palette: crane.palette,
      },
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

  function drawFloatTexts() {
    ctx.textAlign = "center";
    ctx.font = "900 18px Nunito, sans-serif";
    for (const f of floatTexts) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - cameraY);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    const sx = shake ? rand(-shake, shake) : 0;
    const sy = shake ? rand(-shake, shake) : 0;
    ctx.save();
    ctx.translate(sx, sy);

    drawSky();
    drawGround();

    for (const b of tower) {
      drawBlock(b, b.y - cameraY);
    }

    if (falling) {
      drawBlock(falling, falling.y - cameraY, falling.tilt || 0);
    }

    drawCrane();
    drawParticles();
    drawFloatTexts();

    ctx.restore();
  }

  function drawMenuBackdrop() {
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

    // Idle swinging preview block
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
      if (state === "menu") startGame();
      else if (state === "gameover") startGame();
      else onPointer();
    }
  }

  el.btnStart.addEventListener("click", startGame);
  el.btnRetry.addEventListener("click", startGame);
  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", resize);

  // Prevent scroll/bounce on mobile
  document.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  best = getBest();
  if (best > 0) el.bestStart.textContent = `Best population: ${best}`;
  const versionEl = document.getElementById("app-version");
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;
  resize();
  requestAnimationFrame(loop);
})();
