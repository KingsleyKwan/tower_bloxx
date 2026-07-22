(() => {
  "use strict";

  const LOCAL_CACHE_KEY = "tower_bloxx_global_cache";
  const cfg = window.TOWER_BLOXX_LEADERBOARD || {};
  const URL = cfg.url || "";
  const TOP_N = cfg.topN || 10;
  const MAX_NAME = cfg.maxNameLen || 10;

  let lastGlobalOk = false;

  // Letters (incl. Chinese), numbers, spaces, hyphen, underscore — max MAX_NAME characters
  function normalizeName(name) {
    const cleaned = String(name || "")
      .replace(/[^\p{L}\p{N}\s\-_]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    return Array.from(cleaned).slice(0, MAX_NAME).join("");
  }

  function nameKey(name) {
    return normalizeName(name).toLocaleLowerCase();
  }

  function charLen(str) {
    return Array.from(String(str || "")).length;
  }

  function readCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeCache(entries) {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(entries.slice(0, TOP_N)));
  }

  function collapseTop(entries) {
    const map = new Map();
    for (const e of entries) {
      const name = normalizeName(e.name);
      const score = Number(e.score) || 0;
      if (!name || score <= 0) continue;
      const key = nameKey(name);
      const prev = map.get(key);
      if (!prev || score > prev.score) {
        map.set(key, {
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
    if (!URL) throw new Error("no leaderboard url");
    const res = await fetch(URL, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("leaderboard fetch failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  // Remote-first: when the cloud API is up, the board is only global scores.
  // Local storage is a cache / offline fallback — never mixed into a live global list.
  async function getTop10() {
    if (!URL) {
      lastGlobalOk = false;
      return readCache();
    }
    try {
      const remote = await fetchRemote();
      const top = collapseTop(remote);
      writeCache(top);
      lastGlobalOk = true;
      return top;
    } catch {
      lastGlobalOk = false;
      return readCache();
    }
  }

  function isGlobal() {
    return lastGlobalOk;
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

    if (!URL) {
      const local = collapseTop([{ name, score: s, ts: Date.now() }, ...readCache()]);
      writeCache(local);
      lastGlobalOk = false;
      return { ok: true, global: false, top: local };
    }

    try {
      const remote = await fetchRemote();
      const existing = remote.find((e) => nameKey(e.name) === nameKey(name));
      const payload = { name, score: s, ts: Date.now() };

      if (existing && existing._id) {
        if ((Number(existing.score) || 0) >= s) {
          const top = collapseTop(remote);
          writeCache(top);
          lastGlobalOk = true;
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
      if (!lastGlobalOk) throw new Error("verify failed");
      return { ok: true, global: true, improved: true, top };
    } catch (err) {
      // Keep a local cache so the player isn't blocked offline, but mark as not global.
      const local = collapseTop([{ name, score: s, ts: Date.now() }, ...readCache()]);
      writeCache(local);
      lastGlobalOk = false;
      return { ok: true, global: false, top: local, error: String(err && err.message) };
    }
  }

  window.TowerBloxxBoard = {
    getTop10,
    qualifies,
    submitScore,
    normalizeName,
    charLen,
    isGlobal,
    MAX_NAME,
    TOP_N,
  };
})();
