// ═══════════════════════════════════════════════════════════
// BANNER MANAGER — Sliding notification banners in-game
// Slide in from top of play area, stack downward, auto-dismiss
// ═══════════════════════════════════════════════════════════

class BannerManager {
  constructor(scene) {
    this.scene  = scene;
    this._items = [];
    this._LP    = 130;   // left panel width
    this._RP    = 130;   // right panel width
    this._BW    = W - this._LP - this._RP;
    this._BX    = this._LP;
    this._PH    = 42;    // banner height
    this._GAP   = 4;
    this._MAX   = 4;
    this._startY = 6;
  }

  show(text, color = '#00cc66', duration = 1800, sub = '') {
    if (!this.scene || !this.scene.add) return;
    const col = parseInt(color.replace('#', ''), 16);
    const { _BX: BX, _BW: BW, _PH: PH, _GAP: GAP } = this;

    // Parse type tag and main message from "TYPE: message" format
    const colonIdx = text.indexOf(': ');
    const typeTag  = colonIdx > 0 ? `[ ${text.slice(0, colonIdx)} ]` : '[ SYS ]';
    const mainMsg  = colonIdx > 0 ? text.slice(colonIdx + 2) : text;

    // Shift existing banners down
    this._items.forEach(p => {
      p.targetY += PH + GAP;
      this.scene.tweens.add({ targets: p.objs, y: `+=${PH + GAP}`, duration: 120, ease: 'Power2.Out' });
    });

    const y = this._startY - (PH + GAP);

    // Background — dark green tint matching game palette
    const bg    = this.scene.add.rectangle(BX, y, BW, PH, 0x020c06, 0.94).setOrigin(0, 0).setDepth(100);
    // Left accent bar (3px, full height) — signature game-card style
    const lbar  = this.scene.add.rectangle(BX, y, 3, PH, col, 1.0).setOrigin(0, 0).setDepth(102);
    // Subtle top line
    const tline = this.scene.add.rectangle(BX + 3, y, BW - 3, 1, col, 0.2).setOrigin(0, 0).setDepth(101);
    // Subtle bottom line
    const bline = this.scene.add.rectangle(BX + 3, y + PH - 1, BW - 3, 1, col, 0.12).setOrigin(0, 0).setDepth(101);
    // Type tag — dimmer, small
    const tag   = this.scene.add.text(BX + 14, y + 6, typeTag, {
      fontFamily: "'Courier New',monospace", fontSize: '8px', color, letterSpacing: 1,
    }).setDepth(102).setAlpha(0.55);
    // Main message — starts empty for typewriter
    const msg   = this.scene.add.text(BX + 14, y + 18, '', {
      fontFamily: "'Courier New',monospace", fontSize: '13px', fontStyle: 'bold', color, letterSpacing: 1,
    }).setDepth(102);
    // Sub text
    const subT  = sub ? this.scene.add.text(BX + 14, y + 33, sub, {
      fontFamily: "'Courier New',monospace", fontSize: '9px', color: '#3d6650', letterSpacing: 0,
    }).setDepth(102) : null;

    const objs = [bg, lbar, tline, bline, tag, msg];
    if (subT) objs.push(subT);

    // Slide down into view
    this.scene.tweens.add({ targets: objs, y: `+=${PH + GAP}`, duration: 155, ease: 'Power3.Out' });

    const item = { objs, targetY: this._startY, col };
    this._items.unshift(item);

    // Cull overflow
    while (this._items.length > this._MAX) {
      const old = this._items.pop();
      old.objs.forEach(o => { try { o && o.destroy(); } catch {} });
    }

    // Typewriter reveal — only for shorter messages to keep it snappy
    if (mainMsg.length <= 32) {
      let revealed = 0;
      this.scene.time.delayedCall(140, () => {
        if (!msg || !msg.active) return;
        this.scene.time.addEvent({
          delay: 26, repeat: mainMsg.length - 1,
          callback: () => {
            if (!msg || !msg.active) return;
            revealed++;
            msg.setText(mainMsg.slice(0, revealed));
          },
        });
      });
    } else {
      this.scene.time.delayedCall(90, () => { if (msg && msg.active) msg.setText(mainMsg); });
    }

    // Slide back up and dismiss
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: objs, y: `-=${PH + GAP + 4}`, alpha: 0, duration: 155, ease: 'Power2.In',
        onComplete: () => {
          objs.forEach(o => { try { o && o.destroy(); } catch {} });
          const idx = this._items.indexOf(item);
          if (idx >= 0) this._items.splice(idx, 1);
          let ty = this._startY;
          this._items.forEach(p => {
            const delta = ty - p.targetY;
            p.targetY = ty;
            if (Math.abs(delta) > 0.5) {
              this.scene.tweens.add({ targets: p.objs, y: `+=${delta}`, duration: 120, ease: 'Power2.Out' });
            }
            ty += PH + GAP;
          });
        },
      });
    });
  }

  // ─── TOAST — slim slide-in from top-right (achievements, side notifs) ───
  toast(text, color = '#ffdd00', duration = 2000) {
    if (!this.scene || !this.scene.add) return;
    const col = parseInt(color.replace('#', ''), 16);
    const PAD = 12, TH = 26;
    const txt = this.scene.add.text(0, 0, text, {
      fontFamily: "'Courier New',monospace", fontSize: '11px', fontStyle: 'bold', color, letterSpacing: 1,
    }).setDepth(102);
    const tw = txt.width + PAD * 2;
    const startX = W + 10;
    const targetX = W - tw - 16;
    this._toasts = this._toasts || [];
    const stackY = 80 + this._toasts.length * (TH + 4);
    const bg = this.scene.add.rectangle(startX, stackY, tw, TH, 0x020c06, 0.94).setOrigin(0, 0).setDepth(100)
      .setStrokeStyle(1, col, 0.85);
    const accent = this.scene.add.rectangle(startX, stackY, 3, TH, col, 1).setOrigin(0, 0).setDepth(101);
    txt.setPosition(startX + PAD, stackY + 7);
    const objs = [bg, accent, txt];
    const item = { objs };
    this._toasts.push(item);
    this.scene.tweens.add({ targets: objs, x: `-=${startX - targetX}`, duration: 220, ease: 'Power3.Out' });
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: objs, x: `+=${tw + 60}`, alpha: 0, duration: 240, ease: 'Power2.In',
        onComplete: () => {
          objs.forEach(o => { try { o && o.destroy(); } catch {} });
          const idx = this._toasts.indexOf(item);
          if (idx >= 0) this._toasts.splice(idx, 1);
          // Re-stack remaining toasts upward
          this._toasts.forEach((it, i) => {
            const newY = 80 + i * (TH + 4);
            this.scene.tweens.add({ targets: it.objs, y: newY, duration: 160, ease: 'Power2.Out' });
          });
        },
      });
    });
  }

  // ─── MINI — slim top-center one-line banner. Stacks downward, max 3 visible. ───
  // Deduplicates back-to-back identical text so spammy events don't crowd the stack.
  mini(text, color = '#88ccaa', duration = 1500) {
    if (!this.scene || !this.scene.add) return;
    this._minis = this._minis || [];
    const MAX = 3, ROW_H = 24, BASE_Y = 24;
    // Dedupe — if the latest mini has the same text and is still fading-in/holding, just extend it
    const last = this._minis[this._minis.length - 1];
    if (last && last.text === text && last.killEvt) {
      try { last.killEvt.remove(false); } catch {}
      last.killEvt = this.scene.time.delayedCall(duration, () => this._fadeMini(last));
      return;
    }
    // Cap: drop oldest when full
    if (this._minis.length >= MAX) {
      const drop = this._minis.shift();
      this._fadeMini(drop, true);
    }
    const col = parseInt(color.replace('#', ''), 16);
    const yPos = BASE_Y + this._minis.length * ROW_H;
    const txt = this.scene.add.text(W / 2, yPos, text, {
      fontFamily: "'Courier New',monospace", fontSize: '12px', fontStyle: 'bold', color, letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(102).setAlpha(0);
    const tw = txt.width + 28;
    const bg = this.scene.add.rectangle(W / 2, yPos, tw, 22, 0x020c06, 0.88).setOrigin(0.5, 0.5).setDepth(100)
      .setStrokeStyle(1, col, 0.75).setAlpha(0);
    const objs = [bg, txt];
    const item = { objs, text, killEvt: null };
    this._minis.push(item);
    this.scene.tweens.add({ targets: objs, alpha: 1, duration: 150 });
    item.killEvt = this.scene.time.delayedCall(duration, () => this._fadeMini(item));
  }

  _fadeMini(item, fast) {
    if (!item || !item.objs) return;
    try { if (item.killEvt) item.killEvt.remove(false); } catch {}
    item.killEvt = null;
    this.scene.tweens.add({
      targets: item.objs, alpha: 0, duration: fast ? 120 : 220,
      onComplete: () => {
        item.objs.forEach(o => { try { o && o.destroy(); } catch {} });
        if (!this._minis) return;
        const idx = this._minis.indexOf(item);
        if (idx >= 0) this._minis.splice(idx, 1);
        // Re-stack remaining
        const BASE_Y = 24, ROW_H = 24;
        this._minis.forEach((it, i) => {
          const targetY = BASE_Y + i * ROW_H;
          this.scene.tweens.add({ targets: it.objs, y: targetY, duration: 160, ease: 'Power2.Out' });
        });
      },
    });
  }

  update() {}

  clear() {
    this._items.forEach(p => p.objs.forEach(o => { try { o && o.destroy(); } catch {} }));
    this._items = [];
    if (this._toasts) {
      this._toasts.forEach(it => it.objs.forEach(o => { try { o && o.destroy(); } catch {} }));
      this._toasts = [];
    }
    if (this._minis) {
      this._minis.forEach(it => {
        try { if (it.killEvt) it.killEvt.remove(false); } catch {}
        try { it.objs.forEach(o => o && o.destroy()); } catch {}
      });
      this._minis = [];
    }
  }
}
