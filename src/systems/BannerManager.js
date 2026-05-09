// ═══════════════════════════════════════════════════════════
// BANNER MANAGER — Sliding notification banners in-game
// Banners slide in from top, stack downward, auto-dismiss
// ═══════════════════════════════════════════════════════════

class BannerManager {
  constructor(scene) {
    this.scene  = scene;
    this._items = [];
    this._LP    = 130;
    this._RP    = 130;
    this._BW    = W - this._LP - this._RP;
    this._BX    = this._LP;
    this._PH    = 46;
    this._GAP   = 3;
    this._MAX   = 4;
    this._startY = 8;
  }

  show(text, color = '#00cc66', duration = 1800, sub = '') {
    if (!this.scene || !this.scene.add) return;
    const col      = parseInt(color.replace('#', ''), 16);
    const { _BX: BX, _BW: BW, _PH: PH, _GAP: GAP } = this;
    const colonIdx = text.indexOf(': ');
    const typeTag  = colonIdx > 0 ? text.slice(0, colonIdx) : 'SYS';
    const mainMsg  = colonIdx > 0 ? text.slice(colonIdx + 2) : text;

    // Shift existing banners down
    this._items.forEach(p => {
      p.targetY += PH + GAP;
      this.scene.tweens.add({ targets: p.objs, y: `+=${PH + GAP}`, duration: 130, ease: 'Power2.Out' });
    });

    // Build banner above screen
    const y    = this._startY - (PH + GAP);
    const bg   = this.scene.add.rectangle(BX, y, BW, PH, 0x000000, 0.97).setOrigin(0, 0).setDepth(100);
    const tbar = this.scene.add.rectangle(BX, y, BW, 2, col, 0.95).setOrigin(0, 0).setDepth(101);
    const bbar = this.scene.add.rectangle(BX, y + PH, BW, 1, col, 0.2).setOrigin(0, 0).setDepth(101);
    const tag  = this.scene.add.text(BX + 12, y + 6, typeTag, { fontFamily: "'Courier New',monospace", fontSize: '8px', color, letterSpacing: 1 }).setDepth(102);
    const msg  = this.scene.add.text(BX + 12, y + 17, mainMsg, { fontFamily: "'Courier New',monospace", fontSize: '12px', fontStyle: 'bold', color, letterSpacing: 1 }).setDepth(102);
    const subT = sub ? this.scene.add.text(BX + 12, y + 32, sub, { fontFamily: "'Courier New',monospace", fontSize: '9px', color: '#335544' }).setDepth(102) : null;
    const timeT = this.scene.add.text(BX + BW - 12, y + 6, '', { fontFamily: "'Courier New',monospace", fontSize: '8px', color: '#556655' }).setOrigin(1, 0).setDepth(102);
    const objs = [bg, tbar, bbar, tag, msg, timeT];
    if (subT) objs.push(subT);

    // Slide down into view
    this.scene.tweens.add({ targets: objs, y: `+=${PH + GAP}`, duration: 200, ease: 'Power3.Out' });

    const item = { objs, targetY: this._startY, col };
    this._items.unshift(item);

    // Cull overflow
    while (this._items.length > this._MAX) {
      const old = this._items.pop();
      old.objs.forEach(o => { try { o && o.destroy(); } catch {} });
    }

    // Slide back up after duration
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: objs, y: `-=${PH + GAP + 4}`, alpha: 0, duration: 180, ease: 'Power2.In',
        onComplete: () => {
          objs.forEach(o => { try { o && o.destroy(); } catch {} });
          const idx = this._items.indexOf(item);
          if (idx >= 0) this._items.splice(idx, 1);
          let ty = this._startY;
          [...this._items].reverse().forEach(p => {
            p.targetY = ty;
            this.scene.tweens.add({ targets: p.objs, y: ty - (PH + GAP), duration: 130, ease: 'Power2.Out' });
            ty += PH + GAP;
          });
        },
      });
    });
  }

  update() {
    // Position updates handled by tweens
  }

  clear() {
    this._items.forEach(p => p.objs.forEach(o => { try { o && o.destroy(); } catch {} }));
    this._items = [];
  }
}
