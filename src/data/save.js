// ═══════════════════════════════════════════════════════════
// SAVE SYSTEM — Persistent game data via localStorage
// ═══════════════════════════════════════════════════════════

const Save = {

  // ── Core get/set ──
  get(key, defaultVal) {
    try {
      const v = localStorage.getItem('sl_' + key);
      return v !== null ? JSON.parse(v) : defaultVal;
    } catch { return defaultVal; }
  },

  set(key, value) {
    try { localStorage.setItem('sl_' + key, JSON.stringify(value)); } catch {}
  },

  // ── High score ──
  highScore()       { return this.get('hs', 0); },
  saveHighScore(s)  { if (s > this.highScore()) this.set('hs', s); },

  // ── Shards (main currency) ──
  shards()          { return this.get('shards', 0); },
  addShards(n)      { this.set('shards', this.shards() + n); },
  spendShards(n)    {
    const s = this.shards();
    if (s < n) return false;
    this.set('shards', s - n);
    return true;
  },

  // ── Fragments (meta currency) ──
  fragments()       { return this.get('fragments', 0); },
  addFragments(n)   { this.set('fragments', this.fragments() + n); },
  spendFragments(n) {
    const f = this.fragments();
    if (f < n) return false;
    this.set('fragments', f - n);
    return true;
  },

  // ── Ship ownership ──
  isOwned(id)       { return !!(this.get('owned', {})[id]); },
  own(id)           { const o = this.get('owned', {}); o[id] = true; this.set('owned', o); },

  // ── Active skin/ship ──
  skin()            { return this.get('skin', 'ranger'); },
  setSkin(s)        { this.set('skin', s); },

  // ── Leaderboard ──
  leaderboard()     { return this.get('lb', []); },
  addLeaderboardEntry(entry) {
    const lb = this.leaderboard();
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    lb.splice(10);
    this.set('lb', lb);
  },

  // ── Lore unlocks ──
  lore()            { return this.get('lore', []); },
  unlockLore(i)     {
    const l = this.lore();
    if (!l.includes(i)) { l.push(i); this.set('lore', l); }
  },

  // ── Meta upgrades ──
  meta(key, defaultVal) { return (this.get('meta', {}))[key] ?? defaultVal; },
  setMeta(key, value)   {
    const m = this.get('meta', {});
    m[key] = value;
    this.set('meta', m);
  },
  hasMeta(key)          { return !!this.meta(key, false); },

  // ── Legacy aliases (used by scenes) ──
  hs()                  { return this.highScore(); },
  saveHs(s)             { return this.saveHighScore(s); },
  lb()                  { return this.leaderboard(); },
  addLb(e)              { return this.addLeaderboardEntry(e); },

  // ── Stats tracking ──
  stats()           { return this.get('stats', {}); },
  addStat(key, n=1) {
    const s = this.stats();
    s[key] = (s[key] || 0) + n;
    this.set('stats', s);
  },
};
