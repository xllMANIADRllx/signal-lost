// ═══════════════════════════════════════════════════════════
// ENEMY SPAWNER — Wave tables, spawn logic, endless mode
// To add a new enemy type: add it to ENEMY_TYPES in enemies.js
// then add it to the wave tables below
// ═══════════════════════════════════════════════════════════

class EnemySpawner {
  constructor(scene) {
    this.scene       = scene;
    this.enemies     = scene.enemies;
    this.mutations   = [];

    // Endless mode state
    this.endlessT           = 0;
    this.endlessPhase       = 0;
    this.endlessScoreMult   = 1;
    this.endlessBossT       = 0;
    this.endlessAutoUpgrT   = 0;
    this.formationT         = 0;
    this.hazardT            = 0;
    this._spawnTimer        = 0;
    this._spawnInterval     = 2.0;
  }

  setMutations(mutations) {
    this.mutations = mutations || [];
  }

  // ── Spawn a single enemy at position ──
  spawnAt(x, y, type) {
    const wave = this.scene.wave || 1;
    const e    = new Enemy(x, y, type, wave, this.mutations);
    this.scene.enemies.push(e);
    return e;
  }

  // ── Spawn enemy from screen edge (adaptive AI) ──
  spawnEdge() {
    if (this.scene.paused || this.scene.bossWave) return;

    // Adaptive AI — spawn opposite side from player's preferred reflect direction
    const history    = this.scene.reflectSideHistory || [];
    const leftCount  = history.filter(s => s === 'left').length;
    const rightCount = history.filter(s => s === 'right').length;
    const adaptBias  = history.length > 8
      ? (leftCount > rightCount ? 'right' : 'left')
      : 'none';

    let x, y;
    if (adaptBias === 'right' && Math.random() < 0.55) {
      x = W + 25; y = Math.random() * H;
    } else if (adaptBias === 'left' && Math.random() < 0.55) {
      x = -25; y = Math.random() * H;
    } else {
      const edge = Math.floor(Math.random() * 4);
      if      (edge === 0) { x = Math.random() * W; y = -25; }
      else if (edge === 1) { x = Math.random() * W; y = H + 25; }
      else if (edge === 2) { x = -25; y = Math.random() * H; }
      else                 { x = W + 25; y = Math.random() * H; }
    }

    const type = this._pickType();
    this.spawnAt(x, y, type);
  }

  // ── Pick enemy type based on current wave ──
  _pickType() {
    const wave          = this.scene.wave || 1;
    const roll          = Math.random();
    const inSector00    = wave >= 6  && wave <= 10;
    const inDeepMemory  = wave >= 11 && wave <= 15;
    const inKernelSpace = wave >= 16 && wave <= 20;

    if (inSector00) {
      if (roll > 0.97) return 'swarm';
      if (roll > 0.90) return 'tank';
      if (roll > 0.78) return 'sniper';
      const driftChance = 0.15 + (wave - 6) * 0.02;
      if (Math.random() < driftChance) return 'drift_packet';
      if (wave >= 7 && Math.random() < 0.12) return 'orbit_node';
      if (wave >= 8 && Math.random() < 0.10) return 'pulsar';
      if (wave >= 9 && Math.random() < 0.12) return 'memory_trap';
      return 'grunt';
    }

    if (inDeepMemory) {
      if (roll > 0.95) return 'tank';
      if (roll > 0.85) return 'sniper';
      if (roll > 0.75) return 'swarm';
      if (Math.random() < 0.20) return 'core_shard';
      if (Math.random() < 0.15) return 'leech';
      if (Math.random() < 0.12) return 'bouncer';
      return 'grunt';
    }

    if (inKernelSpace) {
      if (roll > 0.90) return 'tank';
      if (roll > 0.80) return 'sniper';
      if (Math.random() < 0.25) return 'overload_node';
      if (Math.random() < 0.18) return 'rootkit';
      if (Math.random() < 0.15) return 'phantom';
      return 'grunt';
    }

    // Standard spawn table (waves 1-5)
    if (roll > 0.94) return 'tank';
    if (roll > 0.84) return 'sniper';
    if (roll > 0.74) return 'swarm';
    if (wave >= 3 && roll > 0.65) return 'rootkit';
    if (wave >= 4 && roll > 0.58) return 'bouncer';
    return 'grunt';
  }

  // ── Spawn a formation ──
  spawnFormation() {
    const formations = [
      // V formation
      () => {
        const cx = W / 2, cy = -30;
        for (let i = -2; i <= 2; i++) this.spawnAt(cx + i * 60, cy + Math.abs(i) * 40, 'grunt');
      },
      // Ring
      () => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.spawnAt(W/2 + Math.cos(a) * 400, H/2 + Math.sin(a) * 300, 'swarm');
        }
      },
      // Line
      () => {
        for (let i = 0; i < 5; i++) this.spawnAt(i * (W / 5) + W / 10, -30, 'grunt');
      },
    ];
    formations[Math.floor(Math.random() * formations.length)]();
  }

  // ── Endless mode update ──
  updateEndless(dt) {
    const scene = this.scene;
    this.endlessT += dt;
    this.endlessBossT += dt;
    this.endlessAutoUpgrT += dt;
    this.formationT += dt;
    this.hazardT += dt;
    this._spawnTimer += dt;

    // Phase progression every 60s
    this.endlessPhase = Math.min(4, Math.floor(this.endlessT / 60));

    // Score multiplier grows over time
    this.endlessScoreMult = 1 + this.endlessPhase * 0.5 + (this.endlessT / 300) * 0.5;

    // Spawn interval tightens with phase
    this._spawnInterval = Math.max(0.4, 2.0 - this.endlessPhase * 0.35);

    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this.spawnEdge();
      if (this.endlessPhase >= 1 && Math.random() < 0.3 + this.endlessPhase * 0.1) this.spawnEdge();
      if (scene.waveModifier === 'DENSE' && Math.random() < 0.5) this.spawnEdge();
      if (this.endlessPhase >= 3 && Math.random() < 0.35) this.spawnEdge();
    }

    // Formation every 8s
    if (this.formationT >= 8) { this.formationT = 0; this.spawnFormation(); }

    // Boss every 90s
    if (this.endlessBossT >= 90) {
      this.endlessBossT = 0;
      scene._spawnBossNow && scene._spawnBossNow();
    }
  }
}
