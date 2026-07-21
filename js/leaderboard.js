(() => {
  "use strict";

  const LOCAL_KEY = "tower_bloxx_local_board";
  const cfg = window.TOWER_BLOXX_LEADERBOARD || {};
  const URL = cfg.url || "";
  const TOP_N = cfg.topN || 10;
  const MAX_NAME = cfg.maxNameLen || 10;

  function normalizeName(name) {
    return String(name || "")
      .replace(/[^\w\s\-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME);
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeLocal(entries) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, TOP_N)));
  }

  function collapseTop(entries) {
    const map = new Map();
    for (const e of entries) {
      const name = normalizeName(e.name);
      const score = Number(e.score) || 0;
      if (!name || score <= 0) continue;
      const prev = map.get(name.toLowerCase());
      if (!prev || score > prev.score) {
        map.set(name.toLowerCase(), {
          name,
          score,
          ts: e.ts || Date.now(),
          _id: e._id,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, TOP_N);
  }

  async function fetchRemote() {
    if (!URL) return [];
    const res = await fetch(URL, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("leaderboard fetch failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function getTop10() {
    let remote = [];
    try {
      remote = await fetchRemote();
    } catch {
      remote = [];
    }
    const local = readLocal();
    const merged = collapseTop([...remote, ...local]);
    writeLocal(merged);
    return merged;
  }

  function qualifies(score, top) {
    const s = Number(score) || 0;
    if (s <= 0) return false;
    if (!top || top.length < TOP_N) return true;
    return s > top[top.length - 1].score;
  }

  async function submitScore(rawName, score) {
    const name = normalizeName(rawName);
    const s = Number(score) || 0;
    if (!name || s <= 0) return { ok: false, reason: "invalid" };

    const local = collapseTop([{ name, score: s, ts: Date.now() }, ...readLocal()]);
    writeLocal(local);

    if (!URL) return { ok: true, global: false, top: local };

    try {
      const remote = await fetchRemote();
      const existing = remote.find(
        (e) => normalizeName(e.name).toLowerCase() === name.toLowerCase()
      );
      const payload = { name, score: s, ts: Date.now() };

      if (existing && existing._id) {
        if ((Number(existing.score) || 0) >= s) {
          const top = collapseTop(remote);
          return { ok: true, global: true, improved: false, top };
        }
        const put = await fetch(`${URL}/${existing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!put.ok) throw new Error("update failed");
      } else {
        const post = await fetch(URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!post.ok) throw new Error("create failed");
      }

      const top = await getTop10();
      return { ok: true, global: true, improved: true, top };
    } catch (err) {
      return { ok: true, global: false, top: local, error: String(err && err.message) };
    }
  }

  window.TowerBloxxBoard = {
    getTop10,
    qualifies,
    submitScore,
    normalizeName,
    MAX_NAME,
    TOP_N,
  };
})();
