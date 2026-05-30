// ═══════════════════════════════════════════════════════════
// ENEMY — Base enemy class
// All enemy types are created via EnemySpawner using ENEMY_TYPES data
// ═══════════════════════════════════════════════════════════

class Enemy {
  constructor(x, y, type, wave = 1, mutations = []) {
    const cfg = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;

    this.x       = x;
    this.y       = y;
    this.type    = type;
    this.isBoss  = false;

    // Stats from data — scaled by wave where applicable
    this.hp      = cfg.hp;
    this.maxHp   = cfg.hp;
    this.size    = cfg.size;
    this.color   = cfg.color;
    this.sInt    = cfg.sInt;  // shoot interval
    this.sT      = 0;         // shoot timer

    // Speed — some types scale with wave
    const waveScale = ['fragment','core_shard','overload_node'].includes(type) ? wave * 8 : 0;
    this.spd     = cfg.spd + waveScale;

    // Visual
    this.angle   = 0;
    this.bootT   = 0.4;      // boot materialise timer
    this.visible = true;
    this.revealed = true;

    // State
    this.corrupted    = false;
    this.corruptT     = 0;
    this.defectTimer  = 0;
    this.charging     = false;
    this.chargeT      = 0;
    this._decaySlowT  = 0;
    this._regenT      = 0;
    this._isGhost     = false;

    // ── Apply mutations ──
    this.wave = wave;
    this._mutations = [];
    mutations.forEach(m => this._applyMutation(m));

    // Cache base speed AFTER spawn-time mutations (e.g. overclocked) so
    // signal_decay can apply linearly without compounding each frame.
    this._baseSpd = this.spd;
  }

  _applyMutation(mutation) {
    this._mutations.push(mutation.id);
    switch (mutation.id) {
      case 'magnetic':     break; // handled in bullet update
      case 'phase':        break; // handled in update
      case 'mirror':       break; // handled in bullet reflection
      case 'regenerating': break; // handled in update
    }
  }

  hasMutation(id) {
    return this._mutations.includes(id);
  }

  // ── Take damage — returns true if dead ──
  damage(n = 1) {
    this.hp -= n;
    return this.hp <= 0;
  }

  // ── Per-frame update ──
  update(dt, px, py) {
    // Boot animation
    if (this.bootT > 0) { this.bootT -= dt; return; }

    // Rotation
    this.angle += dt * (this.type === 'swarm' ? 5 : 2);

    // Signal decay — slow over time
    if (this._decaySlowT > 0) {
      this._decaySlowT -= dt;
      const slowFactor = Math.max(0.7, 1 - this._decaySlowT * 0.02);
      this.spd = this._baseSpd * slowFactor;
    }

    // Regenerating mutation
    if (this.hasMutation('regenerating')) {
      this._regenT += dt;
      if (this._regenT >= 3 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this._regenT = 0;
      }
    }
  }
}
