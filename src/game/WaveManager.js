// ═══════════════════════════════════════════════════════════
// WAVE MANAGER — Wave progression, modifiers, enemy counts
// ═══════════════════════════════════════════════════════════

// Wave modifiers — one picked randomly each wave
const WAVE_MODIFIERS = [
  { id: 'DENSE',      label: 'DENSE PACKET',   col: '#ff4444', desc: 'Enemy spawn rate doubled' },
  { id: 'FAST',       label: 'OVERCLOCK',      col: '#ff8800', desc: 'All enemies move 40% faster' },
  { id: 'SHIELD',     label: 'SHIELDED',       col: '#00aaff', desc: 'Enemies absorb one reflect before dying' },
  { id: 'DARK',       label: 'DARK SIGNAL',    col: '#884488', desc: 'Enemies partially invisible' },
  { id: 'MAGNET',     label: 'MAGNETIC FIELD', col: '#00ffcc', desc: 'All bullets slightly pulled inward' },
  { id: null,         label: null,             col: null,      desc: null }, // no modifier
  { id: null,         label: null,             col: null,      desc: null }, // no modifier (weighted)
  { id: null,         label: null,             col: null,      desc: null }, // no modifier (weighted)
];

class WaveManager {
  constructor(scene) {
    this.scene         = scene;
    this.wave          = 0;
    this.maxWave       = 20;
    this.bossWave      = false;
    this.waveModifier  = null;
    this.waveEnemies   = 0;
    this.waveKills     = 0;
    this._spawnTimer   = 0;
    this._spawnInterval = 2.0;
    this._totalToSpawn = 0;
    this._spawned      = 0;
  }

  // ── Start a new wave ──
  startWave() {
    this.wave++;
    this.waveKills   = 0;
    this._spawned    = 0;
    this._spawnTimer = 0;

    // Pick wave modifier (every 2 waves from wave 3)
    if (this.wave >= 3 && this.wave % 2 === 0) {
      const mod = WAVE_MODIFIERS[Math.floor(Math.random() * WAVE_MODIFIERS.length)];
      this.waveModifier = mod.id;
    } else {
      this.waveModifier = null;
    }

    // Enemy count scales with wave
    this._totalToSpawn = this._enemyCount();
    this.bossWave      = this._isBossWave();

    return {
      wave:     this.wave,
      modifier: this.waveModifier,
      isBoss:   this.bossWave,
      count:    this._totalToSpawn,
    };
  }

  // ── Enemy count for this wave ──
  _enemyCount() {
    const base   = 4 + this.wave * 2;
    const bonus  = this.waveModifier === 'DENSE' ? Math.floor(base * 0.5) : 0;
    return base + bonus;
  }

  // ── Boss wave check ──
  _isBossWave() {
    return this.wave % 5 === 0;
  }

  // ── Returns stage index based on wave ──
  stageIndex() {
    if (this.wave >= 16) return 3; // SECTOR_00
    if (this.wave >= 11) return 2; // DEEP_MEMORY
    if (this.wave >= 6)  return 1; // KERNEL_SPACE
    return 0;                       // SURFACE_LAYER
  }

  // ── Called each frame during a wave ──
  update(dt, spawner) {
    if (this.bossWave) return;
    if (this._spawned >= this._totalToSpawn) return;

    this._spawnTimer += dt;
    const interval = this._calcInterval();

    if (this._spawnTimer >= interval) {
      this._spawnTimer = 0;
      spawner.spawnEdge();
      this._spawned++;
    }
  }

  _calcInterval() {
    const base = Math.max(0.5, 2.5 - this.wave * 0.08);
    return this.waveModifier === 'DENSE' ? base * 0.5 : base;
  }

  // ── Check if wave is complete ──
  isComplete(enemies) {
    return (
      this._spawned >= this._totalToSpawn &&
      enemies.filter(e => !e.isBoss).length === 0
    );
  }

  isFinalWave() {
    return this.wave >= this.maxWave;
  }
}
