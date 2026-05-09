// ═══════════════════════════════════════════════════════════
// UPGRADE MANAGER — Tracks and applies all in-run upgrades
// Single source of truth for what's active this run
// ═══════════════════════════════════════════════════════════

class UpgradeManager {
  constructor() {
    // Upgrade levels — all start at 0
    this.levels = {};
    Object.keys(UPGRADES).forEach(id => { this.levels[id] = 0; });

    // Derived values — recalculated when upgrades change
    this._dirty = true;
    this._cache = {};
  }

  // ── Install an upgrade ──
  install(id) {
    if (!UPGRADES[id]) return false;
    const maxTier = 4;
    if ((this.levels[id] || 0) >= maxTier) return false;
    this.levels[id] = (this.levels[id] || 0) + 1;
    this._dirty = true;
    return true;
  }

  // ── Seed from archetype ──
  seed(seeds) {
    Object.entries(seeds || {}).forEach(([id, tier]) => {
      this.levels[id] = Math.max(this.levels[id] || 0, tier);
    });
    this._dirty = true;
  }

  // ── Apply meta upgrade effects at run start ──
  applyMeta() {
    if (Save.hasMeta('overclock_chip')) this.install('overclock_burst');
    if (Save.hasMeta('ghost_protocol')) this.install('ghost_trace');
  }

  // ── Get current tier of an upgrade ──
  tier(id) { return this.levels[id] || 0; }

  // ── Check if upgrade is active ──
  has(id) { return (this.levels[id] || 0) > 0; }

  // ── Derived stat: bubble max radius ──
  get bubbleMaxRadius() { return 55 + this.tier('bubble_size') * 15; }

  // ── Derived stat: bubble expansion speed ──
  get bubbleExpandSpeed() { return 180 + this.tier('bubble_speed') * 70; }

  // ── Derived stat: reflect speed multiplier ──
  get reflectSpeedMult() { return 1 + this.tier('reflect_speed') * 0.5; }

  // ── Derived stat: score multiplier ──
  get scoreMult() { return 1 + this.tier('score_boost') * 0.5; }

  // ── Derived stat: chain depth ──
  get chainDepth() { return 5 + this.tier('chain_amplifier'); }

  // ── Derived stat: enemy slow ──
  get enemySlowMult() {
    const t = this.tier('slow');
    return t > 0 ? 1 - t * 0.25 : 1;
  }

  // ── Derived stat: magnet active ──
  get magnetActive() { return this.has('magnet'); }

  // ── Derived stat: multishot vectors ──
  get multishotCount() { return this.tier('multishot') > 0 ? 3 : 1; }

  // ── Derived stat: ping rings ──
  get pingRings() { return this.has('signal_fork') ? 2 : 1; }

  // ── Derived stat: has extra card slot ──
  get extraCard() { return Save.hasMeta('kernel_access'); }

  // ── Serialise for passing between scenes ──
  toData() {
    return { ...this.levels };
  }

  // ── Restore from saved data ──
  fromData(data) {
    Object.entries(data || {}).forEach(([id, tier]) => {
      this.levels[id] = tier;
    });
    this._dirty = true;
  }
}
