// ═══════════════════════════════════════════════════════════
// SHARDS — Single source of truth for player shard currency
// Loaded BEFORE save.js. Save.shards()/addShards()/spendShards()
// delegate to this module so every mutation is funneled here.
//
// Persistence: localStorage 'sl_shards' (compatible with old saves).
//
// Dev usage (browser console):
//   Shards.DEBUG_LOG = true;   // log every change
//   Shards.get();              // current balance
//   Shards.add(500, 'cheat');  // manual add
//   Shards.set(0);             // manual reset
// ═══════════════════════════════════════════════════════════

const Shards = {

  // ── Core API ──
  get() {
    try { return JSON.parse(localStorage.getItem('sl_shards')) || 0; }
    catch { return 0; }
  },

  add(n, reason) {
    if (typeof n !== 'number' || !isFinite(n)) return this.get();
    const before = this.get();
    const after = Math.max(0, before + n);
    try { localStorage.setItem('sl_shards', JSON.stringify(after)); } catch {}
    if (this.DEBUG_LOG) console.log(`[Shards] +${n} (${reason || 'unspecified'}): ${before} → ${after}`);
    return after;
  },

  spend(n, reason) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return false;
    const before = this.get();
    if (before < n) {
      if (this.DEBUG_LOG) console.log(`[Shards] DENIED spend ${n} (${reason || 'unspecified'}): only ${before} available`);
      return false;
    }
    const after = before - n;
    try { localStorage.setItem('sl_shards', JSON.stringify(after)); } catch {}
    if (this.DEBUG_LOG) console.log(`[Shards] -${n} (${reason || 'unspecified'}): ${before} → ${after}`);
    return true;
  },

  set(n, reason) {
    if (typeof n !== 'number' || !isFinite(n)) return this.get();
    const before = this.get();
    const after = Math.max(0, Math.floor(n));
    try { localStorage.setItem('sl_shards', JSON.stringify(after)); } catch {}
    if (this.DEBUG_LOG) console.log(`[Shards] SET ${after} (${reason || 'unspecified'}): ${before} → ${after}`);
    return after;
  },

  reset() { return this.set(0, 'reset'); },

  // ── Dev convenience ──
  DEBUG_LOG: false,
};

if (typeof window !== 'undefined') window.Shards = Shards;
