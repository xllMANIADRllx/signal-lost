// ═══════════════════════════════════════════════════════════
// PLAYER — All player state, movement, dash, heat, shield
// Instantiated by GameScene on create()
// ═══════════════════════════════════════════════════════════

class Player {
  constructor(scene, skin) {
    this.scene = scene;

    // ── Position ──
    this.x  = W / 2;
    this.y  = H / 2;
    this.tx = W / 2; // target (cursor) x
    this.ty = H / 2; // target (cursor) y

    // ── Ship config ──
    const shipData   = SHIPS[skin] || SHIPS.ranger;
    this.skin        = skin;
    this.color       = shipData.color;
    this.trailColor  = shipData.trailColor;
    this.passives    = [...(shipData.passives || [])];

    // ── Bubble ──
    this.bubbleRadius   = 0;
    this.bubbleCharge   = 0;
    this.bubbleTier     = 0;
    this.pressing       = false;
    this.fingerDown     = false;

    // ── Heat ──
    this.bubbleHeat       = 0;      // 0–100
    this.bubbleOverheated = false;
    this.bubbleCooldownT  = 0;
    this.parryWindowT     = 0;
    this.freeReflectT     = 0;      // free reflect timer (no heat)

    // ── Dash ──
    this.dashCooldownT  = 0;
    this.isDashing      = false;
    this.dashTargetX    = 0;
    this.dashTargetY    = 0;
    this.dashTrail      = [];
    this.dashActiveT    = 0;

    // ── Shield ──
    this.shield         = 0;
    this.shieldRegenT   = 0;

    // ── Signal / surge ──
    this.signal         = 0;
    this.surgeActive    = false;
    this.surgeT         = 0;
    this.pingCooldownT  = 0;
    this.pingRings      = [];

    // ── INFERNO skin — rage meter ──
    this.rageMeter      = 0;
    this.rageActive     = false;
    this.rageT          = 0;

    // ── PHANTOM skin — decoys ──
    this.phantomDecoys  = [];

    // ── RANGER skin — adaptive routing ──
    this.adaptiveWaves  = 0;

    // ── Visual ──
    this.packetTrace    = [];
    this.invincT        = 0;

    // ── Meta / run state ──
    this.extraLife      = false;

    // Apply passive upgrades from ship
    this._applyPassives();
  }

  _applyPassives() {
    this.passives.forEach(p => {
      if (p === 'shield')        this.shield = Math.max(this.shield, 2);
      if (p === 'reflect_speed') { /* handled in bullet logic */ }
      if (p === 'magnet')        { /* handled in bullet update */ }
    });
  }

  // ── Called each frame ──
  update(dt, upgrades) {
    this._updateMovement(dt, upgrades);
    this._updateDash(dt);
    this._updateHeat(dt, upgrades);
    this._updateSignal(dt);
    this._updateShield(dt, upgrades);
    this._updateTrace();
    this.invincT = Math.max(0, this.invincT - dt);
    this.pingCooldownT = Math.max(0, this.pingCooldownT - dt);
    this.freeReflectT  = Math.max(0, this.freeReflectT  - dt);
  }

  _updateMovement(dt, upgrades) {
    const speed = Settings.get('smooth') ? (upgrades.mouse_sensitivity || 10) : 999;
    this.x += (this.tx - this.x) * Math.min(speed * dt, 1);
    this.y += (this.ty - this.y) * Math.min(speed * dt, 1);
    // Clamp to screen
    this.x = Math.max(20, Math.min(W - 20, this.x));
    this.y = Math.max(20, Math.min(H - 20, this.y));
  }

  _updateDash(dt) {
    this.dashCooldownT = Math.max(0, this.dashCooldownT - dt);
    this.dashActiveT   = Math.max(0, this.dashActiveT   - dt);
    if (this.isDashing) {
      const dx   = this.dashTargetX - this.x;
      const dy   = this.dashTargetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        this.isDashing = false;
        this.x = this.dashTargetX;
        this.y = this.dashTargetY;
      } else {
        const spd = Math.min(dist, 900 * dt);
        this.x += (dx / dist) * spd;
        this.y += (dy / dist) * spd;
      }
      this.dashTrail.push({ x: this.x, y: this.y, a: 1.0 });
      if (this.dashTrail.length > 12) this.dashTrail.shift();
    }
    this.dashTrail.forEach(p => { p.a -= dt * 4; });
    this.dashTrail = this.dashTrail.filter(p => p.a > 0);
  }

  _updateHeat(dt, upgrades) {
    if (this.bubbleOverheated) {
      this.bubbleCooldownT -= dt;
      this.parryWindowT     = Math.max(0, this.parryWindowT - dt);
      const diff     = DIFFICULTY[Settings.get('difficulty')] || DIFFICULTY.daemon;
      const coolRate = diff.heatCoolRate * (upgrades.heat_sink ? 1.2 : 1.0);
      this.bubbleHeat = Math.max(0, this.bubbleHeat - coolRate * dt);
      if (this.bubbleCooldownT <= 0) {
        this.bubbleOverheated = false;
        this.bubbleHeat       = 0;
      }
    } else if (!this.pressing) {
      const diff     = DIFFICULTY[Settings.get('difficulty')] || DIFFICULTY.daemon;
      const coolRate = diff.heatCoolRate * (upgrades.heat_sink ? 1.2 : 1.0);
      this.bubbleHeat = Math.max(0, this.bubbleHeat - coolRate * dt);
    }
  }

  _updateSignal(dt) {
    if (this.surgeActive) {
      this.surgeT -= dt;
      if (this.surgeT <= 0) { this.surgeActive = false; this.signal = 0; }
    }
  }

  _updateShield(dt, upgrades) {
    if (this.shield <= 0 && upgrades.null_shield) {
      this.shieldRegenT += dt;
      if (this.shieldRegenT >= 25) { this.shieldRegenT = 0; this.shield = 1; }
    }
  }

  _updateTrace() {
    this.packetTrace.push({ x: this.x, y: this.y });
    if (this.packetTrace.length > 18) this.packetTrace.shift();
  }

  // ── Dash action ──
  dash(tx, ty, upgrades) {
    const cd = upgrades.dash_patch ? 0.8 : 1.5;
    if (this.dashCooldownT > 0 || this.isDashing) return false;
    this.isDashing     = true;
    this.dashTargetX   = tx;
    this.dashTargetY   = ty;
    this.dashCooldownT = cd;
    this.dashActiveT   = 0.25;
    return true;
  }

  // ── Take a hit — returns true if dead ──
  hit(upgrades) {
    if (this.invincT > 0) return false;
    if (this.shield > 0) {
      this.shield--;
      this.invincT = 0.8;
      Snd.play('shield');
      return false;
    }
    return true; // dead
  }

  // ── Set shield value ──
  setShield(n) {
    this.shield = n;
    this.shieldRegenT = 0;
  }
}
