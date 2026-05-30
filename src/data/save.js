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

  // ── Shards (main currency) — delegate to dedicated Shards module ──
  // Every read/write goes through Shards.get/add/spend so a single
  // global toggle (Shards.DEBUG_LOG = true) traces every mutation.
  shards()          { return Shards.get(); },
  addShards(n)      { Shards.add(n, 'Save.addShards'); return Shards.get(); },
  spendShards(n)    { return Shards.spend(n, 'Save.spendShards'); },

  // ── Fragments (meta currency) ──
  fragments()       { return this.get('fragments', 0); },
  addFragments(n)   { this.set('fragments', this.fragments() + n); this.addStat('total_fragments', n); },
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
    lb.splice(30);  // keep top 30
    this.set('lb', lb);
  },

  // ── Operator name (player identity for leaderboard) ──
  operatorName()    { return this.get('operator_name', '') || ''; },
  setOperatorName(n){
    const clean = String(n || '').replace(/[^a-zA-Z0-9_\-. ]/g, '').slice(0, 12).trim().toUpperCase();
    this.set('operator_name', clean || 'OPERATOR');
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
  stat(key, defaultVal) { return (this.stats())[key] ?? defaultVal; },
  addStat(key, n=1) {
    const s = this.stats();
    s[key] = (s[key] || 0) + n;
    this.set('stats', s);
  },
  setStat(key, val) {
    const s = this.stats();
    s[key] = val;
    this.set('stats', s);
  },

  // ── Run history (last 5 runs) ──
  runHistory()      { return this.get('run_history', []); },
  addRunHistory(entry) {
    const h = this.runHistory();
    h.unshift(entry);
    h.splice(5);
    this.set('run_history', h);
  },

  // ── Achievements ──
  ach(id)           { return this.get('ach_' + id, false); },
  unlockAch(id)     { this.set('ach_' + id, true); },
};
