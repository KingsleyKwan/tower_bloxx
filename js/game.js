(() => {
  "use strict";

  const STORAGE_KEY = "tower_bloxx_best";
  const MAX_LIVES = 3;
  const BLOCK_H = 42;
  const BASE_W = 160;
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

  const FLOOR_PALETTES = [
    { wall: "#e76f51", trim: "#c44536", window: "#ffe066" },
    { wall: "#f4a261", trim: "#e76f51", window: "#fff3b0" },
    { wall: "#2a9d8f", trim: "#1d7a6f", window: "#caf0f8" },
    { wall: "#457b9d", trim: "#1d3557", window: "#a8dadc" },
    { wall: "#e9c46a", trim: "#c9a227", window: "#fff8e7" },
    { wall: "#9b5de5", trim: "#7b2cbf", window: "#e0aaff" },
  ];

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
    crane = {
      w: width,
      h: BLOCK_H,
      x: W / 2,
      y: 0,
      palette,
      angle: 0,
    };
    swingPhase = Math.random() > 0.5 ? 0 : Math.PI;
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
    showHint = true;
    el.hint.classList.remove("hidden");

    const foundationW = Math.min(BASE_W, W * 0.42);
    tower.push({
      x: W / 2 - foundationW / 2,
      y: groundY - BLOCK_H,
      w: foundationW,
      h: BLOCK_H,
      palette: { wall: "#6c757d", trim: "#495057", window: "#dee2e6" },
      isBase: true,
    });

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

    const desiredCam = Math.max(0, groundY - (top.y - BLOCK_H * 4) - H * 0.35);
    targetCameraY = Math.max(targetCameraY, desiredCam);

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

    if (state === "playing" && crane) {
      swingPhase += dt * swingSpeed();
      const amp = swingAmplitude();
      const top = topBlock();
      const center = top.x + top.w / 2;
      crane.x = center + Math.sin(swingPhase) * amp;
      crane.y = 78;
    }

    if (state === "dropping" && falling) {
      falling.vy += 2200 * dt;
      falling.y += falling.vy * dt;
      if (falling.y >= falling.targetY) {
        falling.y = falling.targetY;
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

  function drawBlock(b, screenY) {
    const { x, w, h, palette } = b;
    const y = screenY;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + 3, y + h - 2, w, 6);

    // Body
    ctx.fillStyle = palette.wall;
    ctx.fillRect(x, y, w, h);

    // Side depth
    ctx.fillStyle = palette.trim;
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x, y + h - 5, w, 5);

    // Roof ledge
    ctx.fillStyle = palette.trim;
    ctx.fillRect(x - 2, y, w + 4, 6);

    // Windows
    const cols = Math.max(2, Math.floor(w / 28));
    const winW = 10;
    const winH = 14;
    const gapX = (w - cols * winW) / (cols + 1);
    const gapY = (h - 8 - winH) / 2;
    ctx.fillStyle = palette.window;
    for (let c = 0; c < cols; c++) {
      const wx = x + gapX + c * (winW + gapX);
      const wy = y + 6 + gapY;
      ctx.fillRect(wx, wy, winW, winH);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(wx, wy, winW, 3);
      ctx.fillStyle = palette.window;
    }

    if (b.isBase) {
      ctx.fillStyle = "#adb5bd";
      ctx.fillRect(x + 8, y + h * 0.35, w - 16, h * 0.45);
      ctx.fillStyle = "#868e96";
      ctx.fillRect(x + w / 2 - 8, y + h * 0.4, 16, h * 0.4);
    }
  }

  function drawCrane() {
    if (!crane) return;
    const cx = crane.x;
    const topY = 18;
    const blockY = crane.y;

    // Boom
    ctx.strokeStyle = "#f4a261";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.08, topY + 10);
    ctx.lineTo(W * 0.92, topY + 10);
    ctx.stroke();

    // Cabin
    ctx.fillStyle = "#e76f51";
    ctx.fillRect(W * 0.08 - 18, topY - 4, 36, 28);
    ctx.fillStyle = "#264653";
    ctx.fillRect(W * 0.08 - 10, topY + 2, 14, 12);

    // Cable
    ctx.strokeStyle = "#495057";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 10);
    ctx.lineTo(cx, blockY);
    ctx.stroke();

    // Hook
    ctx.fillStyle = "#343a40";
    ctx.fillRect(cx - 6, blockY - 6, 12, 8);

    drawBlock(
      {
        x: cx - crane.w / 2,
        w: crane.w,
        h: crane.h,
        palette: crane.palette,
      },
      blockY
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
      drawBlock(falling, falling.y - cameraY);
    }

    drawCrane();
    drawParticles();
    drawFloatTexts();

    ctx.restore();
  }

  function drawMenuBackdrop() {
    drawSky();
    drawGround();
    const previewW = Math.min(BASE_W, W * 0.42);
    drawBlock(
      {
        x: W / 2 - previewW / 2,
        w: previewW,
        h: BLOCK_H,
        palette: { wall: "#6c757d", trim: "#495057", window: "#dee2e6" },
        isBase: true,
      },
      groundY - BLOCK_H
    );

    // Idle swinging preview block
    const amp = Math.min(W * 0.28, 120);
    const cx = W / 2 + Math.sin(performance.now() / 700) * amp;
    const by = 90;
    ctx.strokeStyle = "#495057";
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
      by
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
  resize();
  requestAnimationFrame(loop);
})();
