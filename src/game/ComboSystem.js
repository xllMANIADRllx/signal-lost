// ═══════════════════════════════════════════════════════════
// COMBO SYSTEM — Kill combo tracking and scoring
// ═══════════════════════════════════════════════════════════

class ComboSystem {
  constructor() {
    this.combo      = 0;
    this.comboT     = 0;
    this.bestCombo  = 0;
    this.score      = 0;
    this.scoreDisplay = 0; // animated display value
  }

  // ── Called on each kill ──
  onKill(baseScore, upgrades) {
    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;

    // Combo timer — longer with slow_combo meta upgrade
    const comboWindow = Save.hasMeta('slow_combo') ? 4.0 : 3.0;
    this.comboT = comboWindow;

    // Score with multipliers
    const comboMult  = 1 + (this.combo - 1) * 0.1;
    const upgMult    = upgrades ? upgrades.scoreMult : 1;
    const diff       = DIFFICULTY[Settings.get('difficulty')] || DIFFICULTY.daemon;
    const earned     = Math.floor(baseScore * comboMult * upgMult * diff.scoreMulti);
    this.score      += earned;

    return { earned, combo: this.combo };
  }

  // ── Update each frame ──
  update(dt) {
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    // Animate score display
    const diff = this.score - this.scoreDisplay;
    if (Math.abs(diff) > 1) {
      this.scoreDisplay += diff * 0.12;
    } else {
      this.scoreDisplay = this.score;
    }
  }

  // ── Reset for new run ──
  reset() {
    this.combo        = 0;
    this.comboT       = 0;
    this.bestCombo    = 0;
    this.score        = 0;
    this.scoreDisplay = 0;
  }
}
