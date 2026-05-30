// ═══════════════════════════════════════════════════════════
// SHOPSCENE — Redesigned with live animated ship preview
// ═══════════════════════════════════════════════════════════

class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    try { CRT.inGame = false; } catch (e) {}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(260, 0, 0, 0);
    try{Snd.init();Snd.startSceneMusic('shop');}catch(e){}
    this.t = 0;
    this._tab = 'chassis';
    this._tabObjs = { chassis: [], bubble: [], survival: [], combat: [], powers: [] };
    this._previewGraphics = [];
    this._chassisIndex = 0; // current ship index in carousel
    this._ships = Object.values(SHIPS);

    // Background grid
    const bg = this.add.graphics().setAlpha(0.05);
    bg.lineStyle(1, 0x00cc66, 1);
    for (let x = 0; x <= W; x += 80) { bg.moveTo(x, 0); bg.lineTo(x, H); }
    for (let y = 0; y <= H; y += 80) { bg.moveTo(0, y); bg.lineTo(W, y); }
    bg.strokePath();

    // ── Header ──
    this.add.rectangle(W / 2, 0, W, 36, 0x000000, 0.97).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, 36, W, 1, 0xffaa00, 0.5).setOrigin(0.5, 0);
    this.add.text(W / 2, 17, 'DATA_SHOP.EXE', { fontFamily: "'Orbitron',sans-serif", fontSize: '15px', fontStyle: '900', color: '#ffaa00', letterSpacing: 5 }).setOrigin(0.5);
    this.add.text(20, 17, '// PERMANENT UPGRADES', { fontFamily: "'Courier New',monospace", fontSize: '10px', color: '#886633' }).setOrigin(0, 0.5);
    this.shardsT = this.add.text(W - 20, 17, `◈ ${Save.shards()} SHARDS`, { fontFamily: "'Courier New',monospace", fontSize: '14px', fontStyle: 'bold', color: '#ffdd00' }).setOrigin(1, 0.5);

    // ── Left panel ──
    const LP = 200;
    this.add.rectangle(LP, H / 2 + 18, 1, H - 36, 0x332200, 0.5).setOrigin(0.5, 0.5);

    // Wallet block
    this.add.text(LP / 2, 54, '// WALLET', { fontFamily: "'Courier New',monospace", fontSize: '10px', color: '#886633' }).setOrigin(0.5);
    this._walletNum = this.add.text(LP / 2, 86, String(Save.shards()), { fontFamily: "'Orbitron',sans-serif", fontSize: '28px', fontStyle: '900', color: '#ffdd00' }).setOrigin(0.5);
    this.add.text(LP / 2, 110, 'SHARDS', { fontFamily: "'Courier New',monospace", fontSize: '10px', color: '#886633' }).setOrigin(0.5);
    this.add.rectangle(LP / 2, 122, LP - 20, 1, 0x221100, 0.8).setOrigin(0.5);

    // Category buttons
    this.add.text(LP / 2, 134, '// CATEGORY', { fontFamily: "'Courier New',monospace", fontSize: '10px', color: '#886633' }).setOrigin(0.5);
    const _unifyOn = Save.get('archetype_unify_v1', true);
    const CATS = [
      { id: 'chassis',  label: _unifyOn ? 'ARCHETYPE' : 'CHASSIS', sub: _unifyOn ? 'unlock identity' : 'skins & ships', col: '#00ff66', colN: 0x00ff66 },
      { id: 'bubble',   label: 'BUBBLE',   sub: 'reflect & expand', col: '#00aaff', colN: 0x00aaff },
      { id: 'survival', label: 'SURVIVAL', sub: 'heat & shield',    col: '#ff4444', colN: 0xff4444 },
      { id: 'combat',   label: 'COMBAT',   sub: 'chain & score',    col: '#ffdd00', colN: 0xffdd00 },
    ];
    this._catBtns = {};
    CATS.forEach((c, i) => {
      const by = 172 + i * 56; // shifted down so first button doesn't overlap '// CATEGORY' label
      const act = this._tab === c.id;
      const cbg = this.add.rectangle(LP / 2, by, LP - 16, 44, act ? c.colN : 0x000000, act ? 0.18 : 0.8).setInteractive({ useHandCursor: !act });
      const cbdr = this.add.rectangle(LP / 2, by, LP - 16, 44).setStrokeStyle(act ? 2 : 1, c.colN, act ? 0.9 : 0.2);
      const cbar = this.add.rectangle(12, by, 3, 44, c.colN, act ? 0.9 : 0.25).setOrigin(0, 0.5);
      const clbl = this.add.text(LP / 2 - 4, by - 6, c.label, { fontFamily: "'Courier New',monospace", fontSize: '12px', fontStyle: act ? 'bold' : 'normal', color: act ? c.col : '#443300' }).setOrigin(0.5);
      const csub = this.add.text(LP / 2 - 4, by + 8, c.sub, { fontFamily: "'Courier New',monospace", fontSize: '9px', color: act ? c.col : '#332200' }).setOrigin(0.5);
      this._catBtns[c.id] = { bg: cbg, border: cbdr, bar: cbar, lbl: clbl, sub: csub, col: c.col, colN: c.colN };
      cbg.on('pointerover', () => { if (this._tab !== c.id) { cbg.setFillStyle(c.colN, 0.1); clbl.setColor('#ffffff'); } });
      cbg.on('pointerout',  () => { if (this._tab !== c.id) { cbg.setFillStyle(0x000000, 0.8); clbl.setColor('#443300'); } });
      cbg.on('pointerdown', () => { if (this._tab !== c.id) this._switchTab(c.id); });
    });

    // Status message
    this._msgTxt = this.add.text(LP / 2, H - 60, '', { fontFamily: "'Courier New',monospace", fontSize: '9px', color: '#ff4444', wordWrap: { width: LP - 16 }, align: 'center' }).setOrigin(0.5).setDepth(10);

    // Back button
    this.add.rectangle(LP / 2, H - 22, LP - 16, 30, 0x000000, 0.96).setOrigin(0.5).setStrokeStyle(1, 0x332200, 0.6);
    const bk = this.add.text(LP / 2, H - 22, '[ BACK ]', { fontFamily: "'Courier New',monospace", fontSize: '11px', fontStyle: 'bold', color: '#886633' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    bk.on('pointerover', () => bk.setColor('#ffaa00'));
    bk.on('pointerout',  () => bk.setColor('#443300'));
    bk.on('pointerdown', () => {
      try { Snd.play('powerup'); } catch {}
      this.cameras.main.fadeOut(240, 0, 0, 0);
      this.time.delayedCall(240, () => {
        try{Snd.stopSceneMusic();}catch(e){}
        this.scene.stop();
        const ms = this.scene.get('MenuScene');
        if (ms && ms.sys.isSleeping()) this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
      });
    });

    this.add.text(LP + 20, 46, '// AVAILABLE_MODULES', { fontFamily: "'Courier New',monospace", fontSize: '10px', color: '#886633' });

    // Preview graphics layer (always on top of chassis content)
    this._previewGfx = this.add.graphics().setDepth(10);

    // Archetype-unify hook: route initial render through the same gate as _switchTab
    if (Save.get('archetype_unify_v1', true)) this._buildArchetypes();
    else this._buildChassis();
  }

  _switchTab(id) {
    (this._tabObjs[this._tab] || []).forEach(o => {
      try { if (o && o._wheelFn) this.input.off('wheel', o._wheelFn); } catch {}
      try { o && o.destroy(); } catch {}
    });
    this._tabObjs[this._tab] = [];
    this._previewGraphics.forEach(g2 => { try { g2.destroy(); } catch {} });
    this._previewGraphics = [];
    if (this._previewGfx) { this._previewGfx.clear(); }

    this._tab = id;
    Object.entries(this._catBtns).forEach(([tid, tb]) => {
      const act = tid === id;
      tb.bg.setFillStyle(act ? tb.colN : 0x000000, act ? 0.18 : 0.8);
      tb.border.setStrokeStyle(act ? 2 : 1, tb.colN, act ? 0.9 : 0.2);
      tb.bar.setAlpha(act ? 0.9 : 0.25);
      tb.lbl.setColor(act ? tb.col : '#443300').setFontStyle(act ? 'bold' : 'normal');
      tb.sub.setColor(act ? tb.col : '#332200');
      tb.bg.setInteractive({ useHandCursor: !act });
    });
    this._walletNum.setText(String(Save.shards()));

    if (id === 'chassis') {
      // Archetype-unify hook: when enabled, render ARCHETYPES instead of skins
      if (Save.get('archetype_unify_v1', true)) this._buildArchetypes();
      else this._buildChassis();
    }
    else if (id === 'bubble') {
      if (Save.get('archetype_unify_v1', true)) this._buildBubbleGrid();
      else this._buildBubble();
    }
    else if (id === 'survival') {
      if (Save.get('archetype_unify_v1', true)) this._buildSurvivalGrid();
      else this._buildSurvival();
    }
    else if (id === 'combat') {
      if (Save.get('archetype_unify_v1', true)) this._buildCombatGrid();
      else this._buildCombat();
    }
  }

  _reg(tab, obj) {
    if (!this._tabObjs[tab]) this._tabObjs[tab] = [];
    this._tabObjs[tab].push(obj);
    return obj;
  }

  // ── CHASSIS TAB — live animated carousel ──
  _buildChassis() {
    const LP = 200;
    const RX = LP; // right panel starts here
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // Set index to currently equipped ship
    const activeSkin = Save.skin();
    const idx = this._ships.findIndex(s => s.id === activeSkin);
    if (idx >= 0) this._chassisIndex = idx;

    // ── Preview area ──
    const PX = RX + RW / 2;   // preview center x
    const PY = 220;            // preview center y
    const PR = 110;            // preview radius

    // Preview backdrop hex
    const previewBg = this.add.graphics();
    previewBg.lineStyle(1, 0x112211, 0.6);
    previewBg.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      s === 0 ? previewBg.moveTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR)
              : previewBg.lineTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR);
    }
    previewBg.closePath(); previewBg.strokePath();
    previewBg.fillStyle(0x001100, 0.4);
    previewBg.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      s === 0 ? previewBg.moveTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR)
              : previewBg.lineTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR);
    }
    previewBg.closePath(); previewBg.fillPath();
    this._reg('chassis', previewBg);

    // Corner scan lines
    const scanGfx = this.add.graphics();
    scanGfx.lineStyle(1, 0x002200, 0.3);
    for (let i = 0; i < 8; i++) {
      const y = PY - PR + i * (PR * 2 / 8);
      scanGfx.beginPath(); scanGfx.moveTo(PX - PR, y); scanGfx.lineTo(PX + PR, y); scanGfx.strokePath();
    }
    this._reg('chassis', scanGfx);

    // ── Navigation arrows ──
    const arrowY = PY;
    const arrowLX = RX + 40;
    const arrowRX = W - 40;

    const leftArrow = this.add.text(arrowLX, arrowY, '◄', { fontFamily: mono, fontSize: '28px', color: '#224433' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(arrowRX, arrowY, '►', { fontFamily: mono, fontSize: '28px', color: '#224433' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leftArrow.on('pointerover',  () => leftArrow.setColor('#00ff66'));
    leftArrow.on('pointerout',   () => leftArrow.setColor('#224433'));
    rightArrow.on('pointerover', () => rightArrow.setColor('#00ff66'));
    rightArrow.on('pointerout',  () => rightArrow.setColor('#224433'));
    leftArrow.on('pointerdown',  () => { this._chassisIndex = (this._chassisIndex - 1 + this._ships.length) % this._ships.length; this._refreshChassis(); });
    rightArrow.on('pointerdown', () => { this._chassisIndex = (this._chassisIndex + 1) % this._ships.length; this._refreshChassis(); });
    this._reg('chassis', leftArrow);
    this._reg('chassis', rightArrow);

    // ── Ship counter dots ──
    const dotY = PY + PR + 18;
    this._chassisDots = [];
    this._ships.forEach((s, i) => {
      const dx = PX + (i - (this._ships.length - 1) / 2) * 18;
      const dot = this.add.graphics();
      dot.fillStyle(0x224433, 1);
      dot.fillCircle(dx, dotY, 4);
      this._reg('chassis', dot);
      this._chassisDots.push({ gfx: dot, x: dx, y: dotY });
    });

    // ── Ship info texts (refreshed dynamically) ──
    const infoY = PY + PR + 40;

    this._chassisNameTxt = this.add.text(PX, infoY, '', {
      fontFamily: orb, fontSize: '20px', fontStyle: '900', color: '#00ff66', letterSpacing: 4
    }).setOrigin(0.5).setDepth(5);
    this._reg('chassis', this._chassisNameTxt);

    this._chassisPassiveTxt = this.add.text(PX, infoY + 28, '', {
      fontFamily: mono, fontSize: '11px', color: '#886633', letterSpacing: 2
    }).setOrigin(0.5).setDepth(5);
    this._reg('chassis', this._chassisPassiveTxt);

    this._chassisDescTxt = this.add.text(PX, infoY + 50, '', {
      fontFamily: mono, fontSize: '10px', color: '#998866', wordWrap: { width: RW - 120 }, align: 'center'
    }).setOrigin(0.5, 0).setDepth(5);
    this._reg('chassis', this._chassisDescTxt);

    // ── Status line (owned / cost) ──
    this._chassisStatusTxt = this.add.text(PX, H - 90, '', {
      fontFamily: mono, fontSize: '11px', color: '#ffdd00'
    }).setOrigin(0.5).setDepth(5);
    this._reg('chassis', this._chassisStatusTxt);

    // ── Buy/Equip button ──
    const btnY = H - 55;
    const btnBg = this.add.rectangle(PX, btnY, 220, 38, 0x001100, 0.97).setStrokeStyle(2, 0x00ff66, 0.8).setDepth(5).setInteractive({ useHandCursor: true });
    this._chassisBtnBg = btnBg;
    this._chassisBtn = this.add.text(PX, btnY, '[ EQUIP ]', {
      fontFamily: mono, fontSize: '14px', fontStyle: 'bold', color: '#00ff66'
    }).setOrigin(0.5).setDepth(6);
    this._reg('chassis', btnBg);
    this._reg('chassis', this._chassisBtn);

    btnBg.on('pointerover', () => { btnBg.setFillStyle(0x00ff66, 0.15); this._chassisBtn.setColor('#ffffff'); });
    btnBg.on('pointerout',  () => { btnBg.setFillStyle(0x001100, 0.97); this._chassisBtn.setColor(this._chassisBtnCol || '#00ff66'); });
    btnBg.on('pointerdown', () => this._chassisAction());
    this._reg('chassis', btnBg);

    this._refreshChassis();
  }

  _refreshChassis() {
    const s = this._ships[this._chassisIndex];
    const owned = Save.isOwned(s.id) || s.cost === 0;
    const active = Save.skin() === s.id;
    const shipCol = '#' + s.color.toString(16).padStart(6, '0');

    // Update name
    if (this._chassisNameTxt) {
      this._chassisNameTxt.setText(s.name).setColor(shipCol);
    }
    if (this._chassisPassiveTxt) {
      this._chassisPassiveTxt.setText('PASSIVE: ' + (s.passiveName || ''));
    }
    if (this._chassisDescTxt) {
      this._chassisDescTxt.setText(s.desc || '');
    }

    // Update status
    const statusStr = active ? '✓ EQUIPPED' : owned ? 'OWNED — NOT EQUIPPED' : `◈ ${s.cost} SHARDS REQUIRED`;
    const statusCol = active ? '#00ff66' : owned ? '#44aa66' : '#ffdd00';
    if (this._chassisStatusTxt) {
      this._chassisStatusTxt.setText(statusStr).setColor(statusCol);
    }

    // Update button
    const btnLabel = active ? '[ ACTIVE ]' : owned ? '[ EQUIP ]' : `[ BUY  ◈ ${s.cost} ]`;
    const btnCol   = active ? '#224433' : owned ? '#00ff66' : '#ffdd00';
    this._chassisBtnCol = btnCol;
    if (this._chassisBtn) {
      this._chassisBtn.setText(btnLabel).setColor(btnCol);
    }
    if (this._chassisBtnBg) {
      this._chassisBtnBg.setStrokeStyle(2, active ? 0x224433 : s.color, active ? 0.3 : 0.8);
      this._chassisBtnBg.setInteractive({ useHandCursor: !active });
    }

    // Update dots
    if (this._chassisDots) {
      this._chassisDots.forEach((d, i) => {
        d.gfx.clear();
        const col = i === this._chassisIndex ? s.color : 0x224433;
        const alpha = i === this._chassisIndex ? 1 : 0.5;
        d.gfx.fillStyle(col, alpha);
        d.gfx.fillCircle(d.x, d.y, i === this._chassisIndex ? 5 : 3);
      });
    }
  }

  _chassisAction() {
    const s = this._ships[this._chassisIndex];
    const owned = Save.isOwned(s.id) || s.cost === 0;
    const active = Save.skin() === s.id;
    if (active) return;
    if (owned) {
      Save.setSkin(s.id);
      this._msg(`CHASSIS [${s.name}] EQUIPPED`);
      this._refreshChassis();
      this._vfxEquip(s.color, s.name);
    } else {
      if (Save.spendShards(s.cost)) {
        Save.own(s.id);
        Save.setSkin(s.id);
        this._walletNum.setText(String(Save.shards()));
        this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
        this._msg(`CHASSIS [${s.name}] PURCHASED`);
        this._refreshChassis();
        this._vfxEquip(s.color, s.name);
      } else {
        this._msg(`NEED ${s.cost} ◈`);
      }
    }
  }

  _vfxEquip(col, name) {
    try {
      const PX = 200 + (W - 200) / 2;
      const PY = 220;
      const g2 = this.add.graphics().setDepth(20);
      let r = 30, a = 1;
      this.time.addEvent({
        delay: 16, repeat: 30, callback: () => {
          g2.clear(); g2.lineStyle(2, col, a);
          g2.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI / 3) * k;
            if (k === 0) g2.moveTo(PX + Math.cos(ang) * r, PY + Math.sin(ang) * r);
            else g2.lineTo(PX + Math.cos(ang) * r, PY + Math.sin(ang) * r);
          }
          g2.closePath(); g2.strokePath();
          r += 5; a -= 0.033;
        }
      });
      this.time.delayedCall(500, () => g2.destroy());
    } catch (e) {}
  }

  // ══ ARCHETYPES TAB — live carousel preview ════════════
  _buildArchetypes() {
    const LP = 200;
    const RX = LP;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // signal_forge is excluded from shop — it's earned by killing CORE.BREACH, not buyable
    this._archetypes = (typeof ARCHETYPES !== 'undefined') ? ARCHETYPES.filter(a => a.id !== 'signal_forge') : [];
    // Default to index 0; preserve last position across tab switches
    if (this._archetypesIndex == null) this._archetypesIndex = 0;
    this._archetypesAnimT = 0;

    // ── Preview area ──
    const PX = RX + RW / 2;
    const PY = 220;
    const PR = 110;

    // Preview backdrop hex
    const previewBg = this.add.graphics();
    previewBg.lineStyle(1, 0x112211, 0.6);
    previewBg.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      s === 0 ? previewBg.moveTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR)
              : previewBg.lineTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR);
    }
    previewBg.closePath(); previewBg.strokePath();
    previewBg.fillStyle(0x001100, 0.4);
    previewBg.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      s === 0 ? previewBg.moveTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR)
              : previewBg.lineTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR);
    }
    previewBg.closePath(); previewBg.fillPath();
    this._reg('chassis', previewBg);

    // Scan lines inside preview
    const scanGfx = this.add.graphics();
    scanGfx.lineStyle(1, 0x002200, 0.3);
    for (let i = 0; i < 8; i++) {
      const y = PY - PR + i * (PR * 2 / 8);
      scanGfx.beginPath(); scanGfx.moveTo(PX - PR, y); scanGfx.lineTo(PX + PR, y); scanGfx.strokePath();
    }
    this._reg('chassis', scanGfx);

    // Animated preview graphics (cleared+redrawn each frame in update())
    this._archetypesGfx = this.add.graphics().setDepth(2);
    this._archetypesPrevX = PX;
    this._archetypesPrevY = PY;
    this._reg('chassis', this._archetypesGfx);

    // Large glyph in center (Text object, reused via _refreshArchetypes)
    this._archetypesGlyphTxt = this.add.text(PX, PY, '', {
      fontFamily: mono, fontSize: '56px', fontStyle: 'bold', color: '#00ffcc',
    }).setOrigin(0.5).setDepth(3);
    this._reg('chassis', this._archetypesGlyphTxt);

    // ── Navigation arrows — tall side rails (matches BUBBLE/SURVIVAL/COMBAT/POWERS grids) ──
    const ARROW_W = 36;
    const ARROW_H = 480; // covers preview + info + button area
    const arrowCy = 320;
    const accentCol = 0x00ff66;
    const idleCol   = '#446655';
    const hoverCol  = '#aaffcc';

    const lCx = RX + 18 + ARROW_W / 2;
    const lBg = this.add.rectangle(lCx, arrowCy, ARROW_W, ARROW_H, 0x020c06, 0.85)
      .setStrokeStyle(1, accentCol, 0.45)
      .setInteractive({ useHandCursor: true });
    const lAccent = this.add.rectangle(lCx - ARROW_W / 2 + 1.5, arrowCy, 2, ARROW_H, accentCol, 0.85).setOrigin(0.5);
    const lTxt = this.add.text(lCx, arrowCy, '◄', { fontFamily: mono, fontSize: '24px', fontStyle: 'bold', color: idleCol }).setOrigin(0.5);
    lBg.on('pointerover', () => { lBg.setFillStyle(0x0a1a14, 0.92); lBg.setStrokeStyle(2, accentCol, 0.95); lAccent.setFillStyle(accentCol, 1.0); lTxt.setColor(hoverCol); });
    lBg.on('pointerout',  () => { lBg.setFillStyle(0x020c06, 0.85); lBg.setStrokeStyle(1, accentCol, 0.45); lAccent.setFillStyle(accentCol, 0.85); lTxt.setColor(idleCol); });
    lBg.on('pointerdown', () => { this._archetypesIndex = (this._archetypesIndex - 1 + this._archetypes.length) % this._archetypes.length; this._refreshArchetypes(); });

    const rCx = W - 18 - ARROW_W / 2;
    const rBg = this.add.rectangle(rCx, arrowCy, ARROW_W, ARROW_H, 0x020c06, 0.85)
      .setStrokeStyle(1, accentCol, 0.45)
      .setInteractive({ useHandCursor: true });
    const rAccent = this.add.rectangle(rCx + ARROW_W / 2 - 1.5, arrowCy, 2, ARROW_H, accentCol, 0.85).setOrigin(0.5);
    const rTxt = this.add.text(rCx, arrowCy, '►', { fontFamily: mono, fontSize: '24px', fontStyle: 'bold', color: idleCol }).setOrigin(0.5);
    rBg.on('pointerover', () => { rBg.setFillStyle(0x0a1a14, 0.92); rBg.setStrokeStyle(2, accentCol, 0.95); rAccent.setFillStyle(accentCol, 1.0); rTxt.setColor(hoverCol); });
    rBg.on('pointerout',  () => { rBg.setFillStyle(0x020c06, 0.85); rBg.setStrokeStyle(1, accentCol, 0.45); rAccent.setFillStyle(accentCol, 0.85); rTxt.setColor(idleCol); });
    rBg.on('pointerdown', () => { this._archetypesIndex = (this._archetypesIndex + 1) % this._archetypes.length; this._refreshArchetypes(); });

    [lBg, lAccent, lTxt, rBg, rAccent, rTxt].forEach(o => this._reg('chassis', o));

    // ── Counter dots (7 dots) ──
    const dotY = PY + PR + 18;
    const dotGap = 18;
    const dotsStart = PX - ((this._archetypes.length - 1) * dotGap) / 2;
    this._archetypesDots = [];
    this._archetypes.forEach((_a, i) => {
      const d = this.add.circle(dotsStart + i * dotGap, dotY, 4, 0x00ff66, i === this._archetypesIndex ? 0.95 : 0.25);
      this._archetypesDots.push(d);
      this._reg('chassis', d);
    });

    // ── Info text below preview (name / tagline / passive / status) ──
    const infoY = dotY + 36;
    this._archetypesName = this.add.text(PX, infoY, '', {
      fontFamily: orb, fontSize: '28px', fontStyle: '900', color: '#00ffcc', letterSpacing: 4,
    }).setOrigin(0.5);
    this._archetypesTagline = this.add.text(PX, infoY + 36, '', {
      fontFamily: mono, fontSize: '12px', color: '#557788', letterSpacing: 1,
    }).setOrigin(0.5);
    this._archetypesPassiveLbl = this.add.text(PX, infoY + 60, 'PASSIVE', {
      fontFamily: mono, fontSize: '9px', color: '#886633', letterSpacing: 3,
    }).setOrigin(0.5);
    this._archetypesPassive = this.add.text(PX, infoY + 76, '', {
      fontFamily: mono, fontSize: '12px', color: '#aaccaa', wordWrap: { width: RW - 120 }, align: 'center',
    }).setOrigin(0.5);
    this._archetypesStatus = this.add.text(PX, infoY + 130, '', {
      fontFamily: mono, fontSize: '14px', fontStyle: 'bold', color: '#ffdd00',
    }).setOrigin(0.5);
    [this._archetypesName, this._archetypesTagline, this._archetypesPassiveLbl, this._archetypesPassive, this._archetypesStatus].forEach(o => this._reg('chassis', o));

    // ── Action button (PURCHASE — only shown when unowned) ──
    const btnY = infoY + 175;
    this._archetypesBtnBg = this.add.rectangle(PX, btnY, 240, 38, 0x000000, 0.96)
      .setStrokeStyle(1, 0x00ff66, 0.5).setInteractive({ useHandCursor: true });
    this._archetypesBtnTxt = this.add.text(PX, btnY, '', {
      fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: '#00ff66', letterSpacing: 2,
    }).setOrigin(0.5);
    this._archetypesBtnBg.on('pointerover', () => { if (this._archetypesBtnBg._active) this._archetypesBtnBg.setFillStyle(0x002211, 0.96); });
    this._archetypesBtnBg.on('pointerout',  () => { if (this._archetypesBtnBg._active) this._archetypesBtnBg.setFillStyle(0x000000, 0.96); });
    this._archetypesBtnBg.on('pointerdown', () => this._archetypeAction());
    this._reg('chassis', this._archetypesBtnBg);
    this._reg('chassis', this._archetypesBtnTxt);

    this._refreshArchetypes();
  }

  _refreshArchetypes() {
    const arch = this._archetypes[this._archetypesIndex];
    if (!arch) return;
    const colHex = '#' + arch.col.toString(16).padStart(6, '0');
    const owned = Save.ownsArchetype(arch.id);
    const cost = arch.cost || 0;
    const canAfford = Save.shards() >= cost;

    // Glyph
    if (this._archetypesGlyphTxt) {
      this._archetypesGlyphTxt.setText(arch.icon);
      this._archetypesGlyphTxt.setColor(colHex);
    }

    // Info
    if (this._archetypesName)    { this._archetypesName.setText(arch.name).setColor(colHex); }
    if (this._archetypesTagline) { this._archetypesTagline.setText(arch.tagline || ''); }
    if (this._archetypesPassive) { this._archetypesPassive.setText(arch.passive || ''); }

    // Status text below info — shop only shows unlock state (equipping happens in ArchetypeSelectScene)
    if (this._archetypesStatus) {
      if (owned) { this._archetypesStatus.setText('✓ UNLOCKED').setColor('#aaffcc'); }
      else { this._archetypesStatus.setText(`COST: ${cost} ◈`).setColor(canAfford ? '#ffdd00' : '#553322'); }
    }

    // Button visibility — only show PURCHASE when unowned
    if (this._archetypesBtnBg && this._archetypesBtnTxt) {
      if (!owned) {
        this._archetypesBtnBg.setVisible(true).setStrokeStyle(1, canAfford ? 0x00ff66 : 0x553322, 0.6);
        this._archetypesBtnTxt.setVisible(true).setText(`[ PURCHASE — ${cost} ◈ ]`).setColor(canAfford ? '#00ff66' : '#553322');
        this._archetypesBtnBg._active = canAfford;
      } else {
        this._archetypesBtnBg.setVisible(false);
        this._archetypesBtnTxt.setVisible(false);
        this._archetypesBtnBg._active = false;
      }
    }

    // Dot highlight
    if (this._archetypesDots) {
      this._archetypesDots.forEach((d, i) => d.setFillStyle(0x00ff66, i === this._archetypesIndex ? 0.95 : 0.25));
    }
  }

  _archetypeAction() {
    const arch = this._archetypes && this._archetypes[this._archetypesIndex];
    if (!arch) return;
    if (Save.ownsArchetype(arch.id)) return; // shop doesn't equip — that's ArchetypeSelectScene's job
    const cost = arch.cost || 0;
    if (Save.spendShards(cost)) {
      Save.unlockArchetype(arch.id);
      this._walletNum.setText(String(Save.shards()));
      this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
      this._msg && this._msg(`${arch.name} UNLOCKED`);
      this._refreshArchetypes();
    } else {
      this._msg && this._msg('INSUFFICIENT ◈');
    }
  }

  _drawArchetypePreview(g, t) {
    const arch = this._archetypes && this._archetypes[this._archetypesIndex];
    if (!arch) return;
    const x = this._archetypesPrevX;
    const y = this._archetypesPrevY;
    const c = arch.col;

    // Outer rotating ring
    const rotOuter = t * 0.6;
    g.lineStyle(1.5, c, 0.4 + 0.2 * Math.sin(t * 2));
    g.beginPath();
    const ringR = 70;
    for (let s = 0; s < 6; s++) {
      const a = rotOuter + (Math.PI / 3) * s;
      s === 0 ? g.moveTo(x + Math.cos(a) * ringR, y + Math.sin(a) * ringR)
              : g.lineTo(x + Math.cos(a) * ringR, y + Math.sin(a) * ringR);
    }
    g.closePath(); g.strokePath();

    // Inner counter-rotating hex
    const rotInner = -t * 1.2;
    const innerR = 44 + 2 * Math.sin(t * 3);
    g.lineStyle(2, c, 0.85);
    g.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = rotInner + (Math.PI / 3) * s + Math.PI / 6;
      s === 0 ? g.moveTo(x + Math.cos(a) * innerR, y + Math.sin(a) * innerR)
              : g.lineTo(x + Math.cos(a) * innerR, y + Math.sin(a) * innerR);
    }
    g.closePath(); g.strokePath();
    g.fillStyle(c, 0.15);
    g.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = rotInner + (Math.PI / 3) * s + Math.PI / 6;
      s === 0 ? g.moveTo(x + Math.cos(a) * (innerR - 3), y + Math.sin(a) * (innerR - 3))
              : g.lineTo(x + Math.cos(a) * (innerR - 3), y + Math.sin(a) * (innerR - 3));
    }
    g.closePath(); g.fillPath();
  }

  // ══ SHARED 4-UP CAROUSEL GRID BUILDER ══════════════════
  // Used by BUBBLE / SURVIVAL / COMBAT / POWERS tabs when archetype_unify_v1 flag is ON.
  // config = { title, sub, headerCol, animFn, getStatus(item), onAction(item) }
  // getStatus returns { text, color, btnLabel?, btnEnabled? }
  _buildItemGrid(tabId, items, config) {
    const LP = 200;
    const RX = LP;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    if (!this._gridIndex)  this._gridIndex  = {};
    if (!this._gridCards)  this._gridCards  = {};
    if (!this._gridDots)   this._gridDots   = {};
    if (!this._gridConfig) this._gridConfig = {};
    if (this._gridIndex[tabId] == null) this._gridIndex[tabId] = 0;

    const ITEMS_PER_PAGE = 4;
    const pageCount = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    if (this._gridIndex[tabId] >= pageCount) this._gridIndex[tabId] = 0;

    this._gridConfig[tabId] = config;
    this._gridCards[tabId] = [];
    this._gridDots[tabId]  = [];

    // Header
    this._reg(tabId, this.add.text(RX + RW / 2, 50, (config.title || tabId).toUpperCase(), {
      fontFamily: orb, fontSize: '16px', fontStyle: '900', color: config.headerCol || '#00aaff', letterSpacing: 4,
    }).setOrigin(0.5));
    this._reg(tabId, this.add.text(RX + RW / 2, 72, '// ' + (config.sub || ''), {
      fontFamily: mono, fontSize: '10px', color: '#557788', letterSpacing: 1,
    }).setOrigin(0.5));

    // Layout — 4 cards in a horizontal row
    const CARD_W = 230;
    const CARD_H = 360;
    const CARD_GAP = 14;
    const totalW = ITEMS_PER_PAGE * CARD_W + (ITEMS_PER_PAGE - 1) * CARD_GAP;
    const GRID_X = RX + (RW - totalW) / 2;
    const GRID_Y = 110;
    const dotY = GRID_Y + CARD_H + 26;

    // Refresh function — rebuilds cards + dots when paging
    const refreshGrid = () => {
      (this._gridCards[tabId] || []).forEach(c => { try { c.objs.forEach(o => o && o.destroy()); } catch {} });
      (this._gridDots[tabId]  || []).forEach(d => { try { d && d.destroy(); } catch {} });
      this._gridCards[tabId] = [];
      this._gridDots[tabId]  = [];

      const page = this._gridIndex[tabId];
      const startIdx = page * ITEMS_PER_PAGE;

      for (let slot = 0; slot < ITEMS_PER_PAGE; slot++) {
        const itemIdx = startIdx + slot;
        const item = items[itemIdx];
        if (!item) continue;

        const cardX = GRID_X + slot * (CARD_W + CARD_GAP);
        const cardY = GRID_Y;
        const cardCx = cardX + CARD_W / 2;
        const colN = item.colN || 0xffffff;
        const colHex = item.col || '#ffffff';

        // Card bg + accent
        const bg = this.add.rectangle(cardX, cardY, CARD_W, CARD_H, 0x020c06, 0.94)
          .setOrigin(0, 0).setStrokeStyle(1, colN, 0.45);
        const topBar = this.add.rectangle(cardX, cardY, CARD_W, 3, colN, 0.9).setOrigin(0, 0);

        // Name
        const nameTxt = this.add.text(cardCx, cardY + 18, item.name, {
          fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: colHex, letterSpacing: 2,
        }).setOrigin(0.5);

        // Embedded animation Graphics — positioned at card-anim-center, scaled down
        const animCx = cardCx;
        const animCy = cardY + 120;
        const animGfx = this.add.graphics();
        animGfx.setPosition(animCx, animCy);
        animGfx.setScale(0.6);

        // Description
        const descTxt = this.add.text(cardCx, cardY + 220, item.desc || '', {
          fontFamily: mono, fontSize: '10px', color: '#889aa9',
          wordWrap: { width: CARD_W - 24 }, align: 'center',
        }).setOrigin(0.5, 0);

        // Status + optional button
        const status = config.getStatus(item);
        const statusY = cardY + CARD_H - 56;
        const statusTxt = this.add.text(cardCx, statusY, status.text || '', {
          fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: status.color || '#aaffcc',
        }).setOrigin(0.5);

        const objs = [bg, topBar, nameTxt, animGfx, descTxt, statusTxt];

        if (status.btnLabel) {
          const btnY = cardY + CARD_H - 24;
          const btnEnabled = !!status.btnEnabled;
          const btnBg = this.add.rectangle(cardCx, btnY, CARD_W - 24, 30, 0x000000, 0.96)
            .setStrokeStyle(1, btnEnabled ? colN : 0x553322, 0.6)
            .setInteractive({ useHandCursor: btnEnabled });
          const btnTxt = this.add.text(cardCx, btnY, status.btnLabel, {
            fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: btnEnabled ? colHex : '#553322',
          }).setOrigin(0.5);
          btnBg._enabled = btnEnabled;
          btnBg.on('pointerover', () => { if (btnBg._enabled) btnBg.setFillStyle(0x0a1a14, 0.96); });
          btnBg.on('pointerout',  () => { if (btnBg._enabled) btnBg.setFillStyle(0x000000, 0.96); });
          btnBg.on('pointerdown', () => {
            if (!btnBg._enabled) return;
            try { config.onAction(item); } catch (e) { console.error('[shop grid] onAction failed', e); }
            refreshGrid();
            // Sync wallet shards display after purchase
            try {
              this._walletNum.setText(String(Save.shards()));
              this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
            } catch {}
          });
          objs.push(btnBg, btnTxt);
        }

        objs.forEach(o => this._reg(tabId, o));
        this._gridCards[tabId].push({ item, gfx: animGfx, animT: slot * 0.4, cx: 0, cy: 0, objs });
      }

      // Page dots
      const dotGap = 18;
      const dotsStart = RX + RW / 2 - (pageCount - 1) * dotGap / 2;
      for (let p = 0; p < pageCount; p++) {
        const d = this.add.circle(dotsStart + p * dotGap, dotY, 4, 0x00ff66, p === this._gridIndex[tabId] ? 0.95 : 0.25);
        this._reg(tabId, d);
        this._gridDots[tabId].push(d);
      }
    };

    // Page-nav arrows — tall side rails (full-height buttons, matches shop tab style)
    if (pageCount > 1) {
      const ARROW_W = 36;
      const ARROW_H = CARD_H;
      const arrowCy = GRID_Y + CARD_H / 2;
      const accentCol = 0x00ff66;
      const idleCol   = '#446655';
      const hoverCol  = '#aaffcc';

      // ── LEFT RAIL ──
      const lCx = RX + 18 + ARROW_W / 2;
      const lBg = this.add.rectangle(lCx, arrowCy, ARROW_W, ARROW_H, 0x020c06, 0.85)
        .setStrokeStyle(1, accentCol, 0.45)
        .setInteractive({ useHandCursor: true });
      const lAccent = this.add.rectangle(lCx - ARROW_W / 2 + 1.5, arrowCy, 2, ARROW_H, accentCol, 0.85).setOrigin(0.5);
      const lTxt = this.add.text(lCx, arrowCy, '◄', { fontFamily: mono, fontSize: '24px', fontStyle: 'bold', color: idleCol }).setOrigin(0.5);
      lBg.on('pointerover', () => {
        lBg.setFillStyle(0x0a1a14, 0.92);
        lBg.setStrokeStyle(2, accentCol, 0.95);
        lAccent.setFillStyle(accentCol, 1.0);
        lTxt.setColor(hoverCol);
      });
      lBg.on('pointerout', () => {
        lBg.setFillStyle(0x020c06, 0.85);
        lBg.setStrokeStyle(1, accentCol, 0.45);
        lAccent.setFillStyle(accentCol, 0.85);
        lTxt.setColor(idleCol);
      });
      lBg.on('pointerdown', () => { this._gridIndex[tabId] = (this._gridIndex[tabId] - 1 + pageCount) % pageCount; refreshGrid(); });

      // ── RIGHT RAIL ──
      const rCx = W - 18 - ARROW_W / 2;
      const rBg = this.add.rectangle(rCx, arrowCy, ARROW_W, ARROW_H, 0x020c06, 0.85)
        .setStrokeStyle(1, accentCol, 0.45)
        .setInteractive({ useHandCursor: true });
      const rAccent = this.add.rectangle(rCx + ARROW_W / 2 - 1.5, arrowCy, 2, ARROW_H, accentCol, 0.85).setOrigin(0.5);
      const rTxt = this.add.text(rCx, arrowCy, '►', { fontFamily: mono, fontSize: '24px', fontStyle: 'bold', color: idleCol }).setOrigin(0.5);
      rBg.on('pointerover', () => {
        rBg.setFillStyle(0x0a1a14, 0.92);
        rBg.setStrokeStyle(2, accentCol, 0.95);
        rAccent.setFillStyle(accentCol, 1.0);
        rTxt.setColor(hoverCol);
      });
      rBg.on('pointerout', () => {
        rBg.setFillStyle(0x020c06, 0.85);
        rBg.setStrokeStyle(1, accentCol, 0.45);
        rAccent.setFillStyle(accentCol, 0.85);
        rTxt.setColor(idleCol);
      });
      rBg.on('pointerdown', () => { this._gridIndex[tabId] = (this._gridIndex[tabId] + 1) % pageCount; refreshGrid(); });

      [lBg, lAccent, lTxt, rBg, rAccent, rTxt].forEach(o => this._reg(tabId, o));
    }

    refreshGrid();
  }

  // ── BUBBLE GRID WRAPPER (carousel design) ──
  _buildBubbleGrid() {
    const META = [
      { id: 'overclock_chip', name: 'OVERCLOCK_CHIP',   cost: 700, col: '#ff8800', colN: 0xff8800, desc: 'Bubble expands 25% faster permanently',           anim: 'expand'  },
      { id: 'signal_amp',     name: 'SIGNAL_AMPLIFIER', cost: 600, col: '#00ffcc', colN: 0x00ffcc, desc: 'Reflected bullets deal 1.5x damage',              anim: 'reflect' },
      { id: 'kernel_access',  name: 'KERNEL_ACCESS',    cost: 800, col: '#00ff66', colN: 0x00ff66, desc: 'Surge meter fills 50% faster',                    anim: 'surge'   },
      { id: 'data_compress',  name: 'DATA_COMPRESSION', cost: 300, col: '#ffdd00', colN: 0xffdd00, desc: 'Start each run with 1 random free upgrade',       anim: 'cards'   },
      { id: 'heat_vent',      name: 'HEAT_VENT',        cost: 450, col: '#ff8800', colN: 0xff8800, desc: 'Every 5th reflect skips the heat gain',           anim: 'reflect' },
      { id: 'lens_focus',     name: 'LENS_FOCUS',       cost: 600, col: '#ffdd00', colN: 0xffdd00, desc: 'Reflects at full bubble radius deal x2 damage',   anim: 'reflect' },
      { id: 'primed_bubble',  name: 'PRIMED_BUBBLE',    cost: 400, col: '#aaffdd', colN: 0xaaffdd, desc: 'Wave starts with bubble at 40% radius',           anim: 'expand'  },
      { id: 'resonance',      name: 'RESONANCE',        cost: 550, col: '#aa44ff', colN: 0xaa44ff, desc: 'Bubble expand rate +30% on boss waves',           anim: 'expand'  },
    ];
    this._buildItemGrid('bubble', META, {
      title:     'BUBBLE',
      sub:       'reflect & expand',
      headerCol: '#00aaff',
      animFn:    (g, t, anim) => this._drawBubbleAnim(g, t, anim, 0, 0),
      getStatus: (item) => {
        const owned = Save.hasMeta(item.id);
        if (owned) return { text: '✓ INSTALLED', color: '#aaffcc' };
        const canAfford = Save.shards() >= item.cost;
        return {
          text: `${item.cost} ◈`,
          color: canAfford ? '#ffdd00' : '#553322',
          btnLabel: `[ INSTALL — ${item.cost} ◈ ]`,
          btnEnabled: canAfford,
        };
      },
      onAction: (item) => {
        if (Save.spendShards(item.cost)) {
          Save.setMeta(item.id, true);
          this._msg && this._msg(`${item.name} INSTALLED`);
        } else {
          this._msg && this._msg('INSUFFICIENT SHARDS');
        }
      },
    });
  }

  // ── SURVIVAL GRID WRAPPER (carousel design) ──
  _buildSurvivalGrid() {
    const META = [
      { id: 'firewall_seed',  name: 'FIREWALL_SEED',    cost: 500, col: '#00aaff', colN: 0x00aaff, desc: 'Start with shield layer active (2 hits)',     anim: 'shield'   },
      { id: 'redundant_path', name: 'REDUNDANT_PATH',   cost: 900, col: '#aa00ff', colN: 0xaa00ff, desc: 'One free process recovery on death',           anim: 'revive'   },
      { id: 'redundant_buf',  name: 'REDUNDANT_BUFFER', cost: 400, col: '#00aaff', colN: 0x00aaff, desc: '+1 shield hit on top of current tier',         anim: 'stackshield' },
      { id: 'heat_sink',      name: 'HEAT_SINK',        cost: 350, col: '#ff4400', colN: 0xff4400, desc: 'Overheat cooldown is 30% faster',              anim: 'heatsink' },
      { id: 'coolant_loop',   name: 'COOLANT_LOOP',     cost: 450, col: '#ff6600', colN: 0xff6600, desc: 'Bubble heat accumulates 25% slower',           anim: 'heatsink' },
      { id: 'ghost_protocol', name: 'GHOST_PROTOCOL',   cost: 900, col: '#aaaaff', colN: 0xaaaaff, desc: '1s invisibility after overheat',               anim: 'ghost'    },
      { id: 'cooldown_patch', name: 'COOLDOWN_PATCH',   cost: 450, col: '#00ff88', colN: 0x00ff88, desc: 'Overheat lockout 3s to 1.8s',                  anim: 'cooldown' },
      { id: 'regen_patch',    name: 'REGEN_PATCH',      cost: 600, col: '#00ff88', colN: 0x00ff88, desc: 'Restore 1 shield hit per wave clear',          anim: 'regen'    },
      { id: 'dash_patch',     name: 'DASH_PATCH',       cost: 400, col: '#00ff88', colN: 0x00ff88, desc: 'Dash cooldown 1.2s to 0.8s permanently',       anim: 'dash'     },
      { id: 'thermal_bleed',  name: 'THERMAL_BLEED',    cost: 500, col: '#ff4400', colN: 0xff4400, desc: 'Overheat ring damages nearby enemies',         anim: 'heatsink' },
      { id: 'last_stand',     name: 'LAST_STAND',       cost: 500, col: '#ff2244', colN: 0xff2244, desc: 'Bubble expand rate +30% while shield is down', anim: 'shield'   },
      { id: 'kinetic_damper', name: 'KINETIC_DAMPER',   cost: 450, col: '#4488ff', colN: 0x4488ff, desc: 'Dash invincibility duration +0.3s',            anim: 'dash'     },
    ];
    this._buildItemGrid('survival', META, {
      title:     'SURVIVAL',
      sub:       'heat & shield',
      headerCol: '#ff4444',
      animFn:    (g, t, anim) => this._drawSurvivalAnim(g, t, anim, 0, 0),
      getStatus: (item) => {
        const owned = Save.hasMeta(item.id);
        if (owned) return { text: '✓ INSTALLED', color: '#aaffcc' };
        const canAfford = Save.shards() >= item.cost;
        return { text: `${item.cost} ◈`, color: canAfford ? '#ffdd00' : '#553322', btnLabel: `[ INSTALL — ${item.cost} ◈ ]`, btnEnabled: canAfford };
      },
      onAction: (item) => {
        if (Save.spendShards(item.cost)) { Save.setMeta(item.id, true); this._msg && this._msg(`${item.name} INSTALLED`); }
        else this._msg && this._msg('INSUFFICIENT SHARDS');
      },
    });
  }

  // ── COMBAT GRID WRAPPER (carousel design) ──
  _buildCombatGrid() {
    const META = [
      { id: 'data_cache',       name: 'DATA_CACHE',       cost: 450, col: '#ffdd00', colN: 0xffdd00, desc: 'Score multiplier x1.25 on all kills',          anim: 'score'  },
      { id: 'primed_signal',    name: 'PRIMED_SIGNAL',    cost: 650, col: '#ff6600', colN: 0xff6600, desc: 'Signal meter starts 50% full each run',        anim: 'primed' },
      { id: 'packet_router',    name: 'PACKET_ROUTER',    cost: 500, col: '#00cc66', colN: 0x00cc66, desc: 'Ping cooldown reduced 15s to 10s',             anim: 'ping'   },
      { id: 'chain_patch',      name: 'CHAIN_PATCH',      cost: 500, col: '#00ff88', colN: 0x00ff88, desc: 'Chain reaction depth +1 permanently',          anim: 'chain'  },
      { id: 'combo_memory',     name: 'COMBO_MEMORY',     cost: 400, col: '#ff88cc', colN: 0xff88cc, desc: 'Combo timer +0.5s (stacks with SLOW_COMBO)',   anim: 'score'  },
      { id: 'shard_doubler',    name: 'SHARD_DOUBLER',    cost: 600, col: '#ffdd00', colN: 0xffdd00, desc: 'Per-kill shard drops doubled',                 anim: 'score'  },
      { id: 'boss_trace',       name: 'BOSS_TRACE',       cost: 500, col: '#aa44ff', colN: 0xaa44ff, desc: 'Score on boss kills x1.25',                    anim: 'score'  },
      { id: 'perfect_reflect',  name: 'PERFECT_REFLECT',  cost: 700, col: '#00ffcc', colN: 0x00ffcc, desc: 'After reflect-kill, next 2s score x2',         anim: 'chain'  },
      { id: 'fragment_refinery',name: 'FRAGMENT_REFINERY',cost: 500, col: '#ffaa00', colN: 0xffaa00, desc: 'Unlocks shard→fragment conversion (5◈ = 1▲)',  anim: 'score'  },
    ];
    this._buildItemGrid('combat', META, {
      title:     'COMBAT',
      sub:       'chain & score',
      headerCol: '#ffdd00',
      animFn:    (g, t, anim) => this._drawCombatAnim(g, t, anim, 0, 0),
      getStatus: (item) => {
        const owned = Save.hasMeta(item.id);
        if (owned) return { text: '✓ INSTALLED', color: '#aaffcc' };
        const canAfford = Save.shards() >= item.cost;
        return { text: `${item.cost} ◈`, color: canAfford ? '#ffdd00' : '#553322', btnLabel: `[ INSTALL — ${item.cost} ◈ ]`, btnEnabled: canAfford };
      },
      onAction: (item) => {
        if (Save.spendShards(item.cost)) { Save.setMeta(item.id, true); this._msg && this._msg(`${item.name} INSTALLED`); }
        else this._msg && this._msg('INSUFFICIENT SHARDS');
      },
    });
    // Fragment Refinery conversion panel — only shown when owned
    if (Save.hasMeta('fragment_refinery')) {
      const RX = 200;
      const RW = W - RX;
      const cx = RX + RW / 2;
      const py = 110 + 360 + 56;
      const mono = "'Courier New',monospace";
      const lbl = this.add.text(cx - 120, py, '◆ FRAGMENT REFINERY ACTIVE — convert shards', {
        fontFamily: mono, fontSize: '11px', color: '#ffaa00', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const btnBg = this.add.rectangle(cx + 140, py, 160, 26, 0x000000, 0.96)
        .setStrokeStyle(1, 0xffaa00, 0.7).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(cx + 140, py, '[ 5 ◈ → 1 ▲ ]', {
        fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: '#ffaa00',
      }).setOrigin(0.5);
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x1a1100, 0.96));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(0x000000, 0.96));
      btnBg.on('pointerdown', () => {
        if (Save.shards() < 5) { this._msg && this._msg('NEED 5 ◈'); return; }
        Save.spendShards(5);
        Save.addFragments(1);
        try {
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
        } catch {}
        this._msg && this._msg('+1 FRAGMENT');
      });
      [lbl, btnBg, btnTxt].forEach(o => this._reg('combat', o));
    }
  }

  // ── POWERS GRID WRAPPER (carousel design, 3-state: BUY / EQUIP / EQUIPPED) ──
  _buildPowersGrid() {
    const POWERS = [
      { id:'ping',            name:'PING',            cost: 0,    col:'#00ff66', colN:0x00ff66, desc:'Emit hex rings reversing nearby bullets. CD 15s. Default power, free.', anim:'ping'    },
      { id:'emp_burst',       name:'EMP_BURST',       cost: 800,  col:'#ffffff', colN:0xffffff, desc:'Stuns ALL enemies for 4s. Freezes enemy bullets. CD 22s.',              anim:'emp'     },
      { id:'null_zone',       name:'NULL_ZONE',       cost: 1000, col:'#aa00ff', colN:0xaa00ff, desc:'Void node at cursor. Deletes bullets in 130px for 6s. CD 28s.',         anim:'null'    },
      { id:'overclock_surge', name:'OVERCLOCK_SURGE', cost: 1200, col:'#ffdd00', colN:0xffdd00, desc:'Triple bubble speed, zero heat, gold bubble for 4s. CD 35s.',           anim:'surge'   },
      { id:'chain_trigger',   name:'CHAIN_TRIGGER',   cost: 900,  col:'#ff6600', colN:0xff6600, desc:'Detonates ALL reflected bullets. Massive chain. CD 18s.',                anim:'chain'   },
      { id:'ghost_step',      name:'GHOST_STEP',      cost: 700,  col:'#aaaaff', colN:0xaaaaff, desc:'Enemies lose targeting for 3s. They wander randomly. CD 26s.',          anim:'ghost'   },
      { id:'corrupt_wave',    name:'CORRUPT_WAVE',    cost: 1100, col:'#00ff44', colN:0x00ff44, desc:'All enemies within 300px gain +2 corruption. CD 38s.',                  anim:'corrupt' },
      { id:'system_restore',  name:'SYSTEM_RESTORE',  cost: 600,  col:'#00ffcc', colN:0x00ffcc, desc:'Clears overheat. Regenerates shield. Refills 30% surge. 1/wave.',       anim:'restore' },
      { id:'decoy_packet',    name:'DECOY_PACKET',    cost: 750,  col:'#ff8800', colN:0xff8800, desc:'Drop a decoy. All enemies retarget it for 6s. CD 32s.',                 anim:'decoy'   },
    ];
    this._buildItemGrid('powers', POWERS, {
      title:     'POWERS',
      sub:       'active ability',
      headerCol: '#ff8800',
      animFn:    (g, t, anim) => this._drawPowersAnim(g, t, anim, 0, 0),
      getStatus: (item) => {
        const owned = item.cost === 0 || Save.meta('power_' + item.id, false);
        const equipped = Save.get('equipped_power', 'ping') === item.id;
        if (equipped) return { text: '◆ EQUIPPED', color: item.col };
        if (owned)    return { text: '[ EQUIP ]',  color: '#aaffcc', btnLabel: '[ EQUIP ]', btnEnabled: true };
        const canAfford = Save.shards() >= item.cost;
        return { text: `${item.cost} ◈`, color: canAfford ? '#ffdd00' : '#553322', btnLabel: `[ BUY — ${item.cost} ◈ ]`, btnEnabled: canAfford };
      },
      onAction: (item) => {
        const owned = item.cost === 0 || Save.meta('power_' + item.id, false);
        if (owned) {
          Save.set('equipped_power', item.id);
          this._msg && this._msg(`${item.name} EQUIPPED`);
          return;
        }
        if (Save.spendShards(item.cost)) {
          Save.setMeta('power_' + item.id, true);
          Save.set('equipped_power', item.id);
          this._msg && this._msg(`${item.name} ACQUIRED — EQUIPPED`);
        } else {
          this._msg && this._msg('INSUFFICIENT SHARDS');
        }
      },
    });
  }

  // ── Scroll pane helper ──
  _makeScrollPane(tab, contentHeight) {
    const RP = 200, CLIP_TOP = 58, CLIP_BOT = H - 36;
    const viewH = CLIP_BOT - CLIP_TOP;
    const container = this.add.container(0, 0);
    this._reg(tab, container);
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(RP, CLIP_TOP, W - RP - 20, viewH);
    const mask = maskGfx.createGeometryMask();
    maskGfx.setAlpha(0);
    container.setMask(mask);
    this._reg(tab, maskGfx);
    container._scrollY = 0;
    container._maxScroll = Math.max(0, contentHeight - viewH + 10);
    const wheelFn = (pointer, gameObjects, deltaX, deltaY) => {
      container._scrollY = Phaser.Math.Clamp(container._scrollY + deltaY * 0.8, 0, container._maxScroll);
      container.y = -container._scrollY;
    };
    this.input.on('wheel', wheelFn);
    container._wheelFn = wheelFn;
    if (contentHeight > viewH) {
      const sbTrack = this.add.rectangle(W - 8, CLIP_TOP + viewH / 2, 4, viewH, 0x221100, 0.5).setOrigin(0.5);
      this._reg(tab, sbTrack);
      const thumbH = Math.max(30, viewH * (viewH / contentHeight));
      const sbThumb = this.add.rectangle(W - 8, CLIP_TOP + thumbH / 2, 4, thumbH, 0xffaa00, 0.5).setOrigin(0.5);
      this._reg(tab, sbThumb);
      container._sbThumb = sbThumb;
      container._sbTrackTop = CLIP_TOP;
      container._sbViewH = viewH;
      container._sbThumbH = thumbH;
    }
    return container;
  }

  // ── Generic item row builder ──
  _buildItemRow(tab, sc, y, m, RH) {
    const RP = 200, RW = W - RP - 20;
    const mono = "'Courier New',monospace";
    const owned = Save.meta(m.id, false);
    const col = parseInt(m.col.replace('#', ''), 16);
    const rowBg  = this.add.rectangle(RP + RW / 2, y, RW, RH, 0x050200, 0.97).setOrigin(0.5, 0);
    const rowBdr = this.add.rectangle(RP, y, RW, RH).setStrokeStyle(1, col, owned ? 0.25 : 0.35).setOrigin(0, 0);
    const rowBar = this.add.rectangle(RP, y, 4, RH, col, owned ? 0.4 : 0.7).setOrigin(0, 0);
    const rowTop = this.add.rectangle(RP, y, RW, 3, col, owned ? 0.3 : 0.5).setOrigin(0, 0);
    const nameTxt = this.add.text(RP + 18, y + 18, m.name, { fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: owned ? '#336644' : m.col });
    const descTxt = this.add.text(RP + 18, y + 42, m.desc, { fontFamily: mono, fontSize: '11px', color: owned ? '#445533' : '#997755' });
    const costStr = owned ? '✓ INSTALLED' : `◈ ${m.cost}`;
    const costCol = owned ? '#44aa77' : '#ffdd00';
    const btnBg  = this.add.rectangle(RP + RW - 70, y + RH / 2, 120, 34, owned ? 0x001a00 : 0x0a0a0a, 0.95).setOrigin(0.5).setStrokeStyle(1.5, col, owned ? 0.4 : 0.7);
    const btnTxt = this.add.text(RP + RW - 70, y + RH / 2, costStr, { fontFamily: mono, fontSize: '12px', fontStyle: 'bold', color: costCol }).setOrigin(0.5);
    const objs = [rowBg, rowBdr, rowBar, rowTop, nameTxt, descTxt, btnBg, btnTxt];
    objs.forEach(o => { sc.add(o); this._reg(tab, o); });
    if (!owned) {
      rowBg.setInteractive({ useHandCursor: true });
      rowBg.on('pointerover', () => { rowBg.setFillStyle(col, 0.10); btnTxt.setColor('#ffffff'); });
      rowBg.on('pointerout',  () => { rowBg.setFillStyle(0x050200, 0.97); btnTxt.setColor(costCol); });
      rowBg.on('pointerdown', () => {
        if (Save.spendShards(m.cost)) {
          Save.setMeta(m.id, true);
          this._msg(`${m.name} INSTALLED`);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this.time.delayedCall(600, () => this._switchTab(tab));
        } else {
          this._msg('INSUFFICIENT SHARDS');
        }
      });
    }
  }

  _buildBubble() {
    const LP = 200;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // ── Layout: left info panel + right animation preview ──
    const INFO_W = 420;   // left info area width
    const PREV_X = LP + INFO_W + (RW - INFO_W) / 2; // preview center x
    const PREV_Y = H / 2 + 18;

    const META = [
      { id: 'overclock_chip', name: 'OVERCLOCK_CHIP',   cost: 700, col: '#ff8800', colN: 0xff8800, desc: 'Bubble expands 25% faster permanently',          anim: 'expand'   },
      { id: 'signal_amp',     name: 'SIGNAL_AMPLIFIER', cost: 600, col: '#00ffcc', colN: 0x00ffcc, desc: 'Reflected bullets deal 1.5x damage',             anim: 'reflect'  },
      { id: 'kernel_access',  name: 'KERNEL_ACCESS',    cost: 800, col: '#00ff66', colN: 0x00ff66, desc: 'Surge meter fills 50% faster',                   anim: 'surge'    },
      { id: 'data_compress',  name: 'DATA_COMPRESSION', cost: 300, col: '#ffdd00', colN: 0xffdd00, desc: 'Start each run with 1 random free upgrade',      anim: 'cards'    },
      { id: 'heat_vent',      name: 'HEAT_VENT',        cost: 450, col: '#ff8800', colN: 0xff8800, desc: 'Every 5th reflect skips the heat gain',           anim: 'reflect'  },
      { id: 'lens_focus',     name: 'LENS_FOCUS',       cost: 600, col: '#ffdd00', colN: 0xffdd00, desc: 'Reflects at full bubble radius deal x2 damage',   anim: 'reflect'  },
      { id: 'primed_bubble',  name: 'PRIMED_BUBBLE',    cost: 400, col: '#aaffdd', colN: 0xaaffdd, desc: 'Wave starts with bubble at 40% radius',           anim: 'expand'   },
      { id: 'resonance',      name: 'RESONANCE',        cost: 550, col: '#aa44ff', colN: 0xaa44ff, desc: 'Bubble expand rate +30% on boss waves',           anim: 'expand'   },
    ];

    this._bubbleIndex = 0;
    this._bubbleAnimT = 0;
    this._bubbleMeta  = META;

    // ── Left nav panel ──
    const NAV_X = LP + 20;
    const NAV_W = INFO_W - 20;

    META.forEach((m, i) => {
      const by = 80 + i * 130;
      const owned = Save.meta(m.id, false);

      // Row background
      const rowBg = this.add.rectangle(NAV_X + NAV_W / 2, by, NAV_W, 118, 0x050200, 0.97).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      const rowBdr = this.add.rectangle(NAV_X, by, NAV_W, 118).setStrokeStyle(1, m.colN, owned ? 0.25 : 0.35).setOrigin(0, 0);
      const rowBar = this.add.rectangle(NAV_X, by, 4, 118, m.colN, owned ? 0.4 : 0.7).setOrigin(0, 0);
      const rowTop = this.add.rectangle(NAV_X, by, NAV_W, 3, m.colN, owned ? 0.3 : 0.5).setOrigin(0, 0);

      // Name
      const nameTxt = this.add.text(NAV_X + 16, by + 14, m.name, {
        fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: owned ? '#446644' : m.col
      });

      // Cost / installed badge
      const costStr = owned ? '✓ INSTALLED' : `◈ ${m.cost}`;
      const costCol = owned ? '#44aa77' : '#ffdd00';
      const costTxt = this.add.text(NAV_X + NAV_W - 12, by + 16, costStr, {
        fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: costCol
      }).setOrigin(1, 0);

      // Description
      const descTxt = this.add.text(NAV_X + 16, by + 38, m.desc, {
        fontFamily: mono, fontSize: '11px', color: '#998866', wordWrap: { width: NAV_W - 32 }
      });

      // Select indicator
      const selBar = this.add.rectangle(NAV_X + NAV_W - 3, by, 3, 118, m.colN, 0).setOrigin(1, 0);

      [rowBg, rowBdr, rowBar, rowTop, nameTxt, costTxt, descTxt, selBar].forEach(o => this._reg('bubble', o));

      // Hover / select
      rowBg.on('pointerover', () => { rowBg.setFillStyle(m.colN, 0.08); });
      rowBg.on('pointerout',  () => { rowBg.setFillStyle(0x050200, 0.97); });
      rowBg.on('pointerdown', () => {
        if (this._bubbleIndex === i) {
          // Second click = buy/equip
          if (!owned) {
            if (Save.spendShards(m.cost)) {
              Save.setMeta(m.id, true);
              this._msg(`${m.name} INSTALLED`);
              this._walletNum.setText(String(Save.shards()));
              this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
              this.time.delayedCall(600, () => this._switchTab('bubble'));
            } else {
              this._msg('INSUFFICIENT SHARDS');
            }
          }
        } else {
          this._bubbleIndex = i;
          this._bubbleAnimT = 0;
          this._refreshBubbleSelection();
        }
      });

      m._rowBg  = rowBg;
      m._selBar = selBar;
      m._nameTxt = nameTxt;
      m._descTxt = descTxt;
      m._costTxt = costTxt;
    });

    // ── Right preview area ──
    const prevBg = this.add.graphics();
    prevBg.lineStyle(1, 0x112211, 0.4);
    for (let x = LP + INFO_W; x <= W; x += 40) { prevBg.beginPath(); prevBg.moveTo(x, 36); prevBg.lineTo(x, H - 36); prevBg.strokePath(); }
    for (let y = 36; y <= H - 36; y += 40) { prevBg.beginPath(); prevBg.moveTo(LP + INFO_W, y); prevBg.lineTo(W, y); prevBg.strokePath(); }
    this._reg('bubble', prevBg);

    // Preview divider line
    const divider = this.add.rectangle(LP + INFO_W, H / 2, 1, H - 72, 0x332200, 0.5).setOrigin(0.5);
    this._reg('bubble', divider);

    // Preview label
    this._bubbleAnimLabel = this.add.text(PREV_X, 52, 'PREVIEW', {
      fontFamily: mono, fontSize: '9px', color: '#443300', letterSpacing: 3
    }).setOrigin(0.5);
    this._reg('bubble', this._bubbleAnimLabel);

    // Upgrade label in preview
    this._bubblePreviewName = this.add.text(PREV_X, H - 55, '', {
      fontFamily: orb, fontSize: '11px', fontStyle: '900', color: '#00ff66', letterSpacing: 3
    }).setOrigin(0.5).setDepth(5);
    this._reg('bubble', this._bubblePreviewName);

    // Buy button in preview
    const buyBtnBg = this.add.rectangle(PREV_X, H - 25, 200, 30, 0x001100, 0.97).setStrokeStyle(2, 0x00ff66, 0.8).setDepth(5).setInteractive({ useHandCursor: true });
    this._bubbleBuyBg  = buyBtnBg;
    this._bubbleBuyBtn = this.add.text(PREV_X, H - 25, '[ BUY ]', {
      fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: '#00ff66'
    }).setOrigin(0.5).setDepth(6);
    this._reg('bubble', buyBtnBg);
    this._reg('bubble', this._bubbleBuyBtn);

    buyBtnBg.on('pointerover', () => { buyBtnBg.setFillStyle(0x00ff66, 0.15); this._bubbleBuyBtn.setColor('#ffffff'); });
    buyBtnBg.on('pointerout',  () => { buyBtnBg.setFillStyle(0x001100, 0.97); this._bubbleBuyBtn.setColor(this._bubbleBuyCol || '#00ff66'); });
    buyBtnBg.on('pointerdown', () => {
      const m = META[this._bubbleIndex];
      const owned = Save.meta(m.id, false);
      if (!owned) {
        if (Save.spendShards(m.cost)) {
          Save.setMeta(m.id, true);
          this._msg(`${m.name} INSTALLED`);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this.time.delayedCall(600, () => this._switchTab('bubble'));
        } else {
          this._msg('INSUFFICIENT SHARDS');
        }
      }
    });

    // Preview graphics layer
    this._bubbleGfx = this.add.graphics().setDepth(4);
    this._reg('bubble', this._bubbleGfx);
    this._bubblePrevX = PREV_X;
    this._bubblePrevY = PREV_Y;

    this._refreshBubbleSelection();
  }

  _refreshBubbleSelection() {
    const META = this._bubbleMeta;
    if (!META) return;
    const m = META[this._bubbleIndex];
    const owned = Save.meta(m.id, false);

    META.forEach((item, i) => {
      const active = i === this._bubbleIndex;
      if (item._rowBg)   item._rowBg.setFillStyle(active ? item.colN : 0x050200, active ? 0.12 : 0.97);
      if (item._rowBg)   item._rowBg.setStrokeStyle(active ? 2 : 0, item.colN, active ? 0.9 : 0);
      if (item._selBar)  item._selBar.setAlpha(active ? 1 : 0);
      if (item._nameTxt) item._nameTxt.setColor(active ? item.col : (Save.meta(item.id, false) ? '#446644' : item.col));
    });

    if (this._bubblePreviewName) {
      this._bubblePreviewName.setText(m.name).setColor(m.col);
    }

    const btnLabel = owned ? '✓ INSTALLED' : `[ BUY  ◈ ${m.cost} ]`;
    const btnCol   = owned ? '#224433' : m.col;
    this._bubbleBuyCol = btnCol;
    if (this._bubbleBuyBtn) this._bubbleBuyBtn.setText(btnLabel).setColor(btnCol);
    if (this._bubbleBuyBg)  {
      this._bubbleBuyBg.setStrokeStyle(2, m.colN, owned ? 0.2 : 0.8);
      this._bubbleBuyBg.setInteractive({ useHandCursor: !owned });
    }
  }

  _drawBubbleAnim(g, t, anim, cx, cy) {
    const mono = "'Courier New',monospace";

    if (anim === 'expand') {
      // Bubble that expands fast, hits max, pulses, resets
      const cycle = t % 2.0;
      const phase = cycle / 1.5; // 0-1 expand phase
      const R = phase < 1 ? phase * 80 : 80;
      const alpha = phase < 1 ? 0.9 : 0.9 - (cycle - 1.5) / 0.5 * 0.9;
      const heat = Math.min(1, phase * 1.2);
      let r, gg, b;
      if (heat < 0.5) { r = 0; gg = 200; b = 255; }
      else { r = 255; gg = 220; b = 0; }
      const col = (Math.floor(r) << 16) | (Math.floor(gg) << 8) | Math.floor(b);
      const rot = t * 0.3;

      // Outer fill
      g.fillStyle(col, 0.04 * alpha);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)) : g.lineTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)); }
      g.closePath(); g.fillPath();

      // Main hex border
      g.lineStyle(2, col, alpha);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      g.closePath(); g.strokePath();

      // Inner counter-rotating hex
      g.lineStyle(1, col, 0.25 * alpha);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = -rot * 1.5 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6) : g.lineTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6); }
      g.closePath(); g.strokePath();

      // Spinning corner dots
      for (let s = 0; s < 6; s++) { const a = t * 2 + (Math.PI / 3) * s; g.fillStyle(col, 0.85 * alpha); g.fillCircle(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3); }

      // Speed label
      if (phase > 0.1 && phase < 0.9) {
        g.fillStyle(0xff8800, 0.6);
        g.fillRect(cx - 30, cy + R + 8, 60 * phase, 3);
      }

    } else if (anim === 'reflect') {
      // Bullet comes in, hits bubble, reflects faster + brighter
      const cycle = t % 2.5;
      const bubbleR = 55;
      const rot = t * 0.3;

      // Static bubble
      g.lineStyle(2, 0x00ffcc, 0.7);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * bubbleR, cy + Math.sin(a) * bubbleR) : g.lineTo(cx + Math.cos(a) * bubbleR, cy + Math.sin(a) * bubbleR); }
      g.closePath(); g.strokePath();
      g.lineStyle(1, 0x00ffcc, 0.2);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = -rot * 1.5 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * bubbleR * 0.6, cy + Math.sin(a) * bubbleR * 0.6) : g.lineTo(cx + Math.cos(a) * bubbleR * 0.6, cy + Math.sin(a) * bubbleR * 0.6); }
      g.closePath(); g.strokePath();

      if (cycle < 1.0) {
        // Incoming bullet — red, normal speed
        const prog = cycle / 1.0;
        const bx = cx - 100 + prog * 155;
        const by = cy;
        g.fillStyle(0xff4444, 0.9); g.fillCircle(bx, by, 5);
        g.lineStyle(1, 0xff4444, 0.4); g.beginPath(); g.moveTo(bx - 20, by); g.lineTo(bx, by); g.strokePath();

      } else if (cycle < 1.15) {
        // Impact flash
        const f = 1 - (cycle - 1.0) / 0.15;
        g.fillStyle(0xffffff, f * 0.8); g.fillCircle(cx - bubbleR + 10, cy, 12 * f);
        g.lineStyle(3, 0x00ffcc, f); g.strokeCircle(cx, cy, bubbleR + 5 * f);

      } else {
        // Reflected bullet — cyan, faster, brighter trail
        const prog = (cycle - 1.15) / 1.35;
        const bx = cx - bubbleR + 10 - prog * 130;
        const by = cy;
        g.fillStyle(0x00ffcc, 1.0); g.fillCircle(bx, by, 6);
        // Longer brighter trail = more damage
        g.lineStyle(2, 0x00ffcc, 0.7); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 40, by); g.strokePath();
        g.lineStyle(1, 0x00ffcc, 0.3); g.beginPath(); g.moveTo(bx + 40, by); g.lineTo(bx + 70, by); g.strokePath();
        // ×1.5 label
        g.fillStyle(0x00ffcc, Math.min(1, prog * 3) * 0.8);
        // drawn as bright dot cluster
        for (let d = 0; d < 3; d++) { g.fillCircle(bx + 12 + d * 6, by - 12, 2); }
      }

    } else if (anim === 'surge') {
      // Signal meter bar filling up faster than normal
      const cycle = t % 3.0;
      const fillFrac = cycle < 2.0 ? cycle / 2.0 : 1.0;
      const alpha2 = cycle > 2.0 ? 1 - (cycle - 2.0) / 1.0 : 1;

      const barX = cx - 12;
      const barY = cy - 80;
      const barH = 160;
      const barW = 24;

      // Track
      g.fillStyle(0x001100, 0.8); g.fillRect(barX, barY, barW, barH);
      g.lineStyle(1, 0x00ff66, 0.4); g.strokeRect(barX, barY, barW, barH);

      // Fill
      const fillH = barH * fillFrac;
      const fillCol = fillFrac > 0.8 ? 0x00ffaa : 0x00ff66;
      g.fillStyle(fillCol, alpha2 * 0.9);
      g.fillRect(barX + 2, barY + barH - fillH + 2, barW - 4, fillH - 4);

      // Pulse at full
      if (fillFrac >= 1.0) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 12);
        g.lineStyle(2, 0x00ffaa, pulse * alpha2);
        g.strokeRect(barX - 3, barY - 3, barW + 6, barH + 6);
      }

      // Segment lines
      for (let seg = 1; seg < 5; seg++) {
        const sy = barY + barH * (seg / 5);
        g.lineStyle(1, 0x002200, 0.6); g.beginPath(); g.moveTo(barX, sy); g.lineTo(barX + barW, sy); g.strokePath();
      }

      // Label
      g.fillStyle(0x00ff66, 0.5 * alpha2);
      g.fillRect(cx + 20, barY + barH - fillH, 6, fillH);

      // Speed arrows
      const arrowA = 0.4 + 0.4 * Math.sin(t * 4);
      for (let arr = 0; arr < 3; arr++) {
        const ay = barY + barH - fillH - 20 - arr * 12;
        if (ay > barY) {
          g.lineStyle(1, 0x00ff66, arrowA * (1 - arr * 0.25));
          g.beginPath(); g.moveTo(cx - 8, ay); g.lineTo(cx, ay - 6); g.lineTo(cx + 8, ay); g.strokePath();
        }
      }

    } else if (anim === 'cards') {
      // Three upgrade cards, one gets auto-selected randomly
      const cycle = t % 4.0;
      const cards = [
        { icon: '↩', name: 'ECHO',    col: 0x00ffcc },
        { icon: '◈', name: 'SHIELD',  col: 0xffdd00 },
        { icon: '✦', name: 'BURST',   col: 0xff6688 },
      ];
      const selectedCard = Math.floor(cycle / 1.2) % 3;
      const selPhase = (cycle % 1.2) / 1.2;

      cards.forEach((card, ci) => {
        const cx2 = cx + (ci - 1) * 90;
        const cy2 = cy;
        const isSelected = ci === selectedCard;
        const cardW = 70, cardH = 100;
        const pulse = isSelected ? 0.6 + 0.4 * Math.sin(t * 8) : 0;

        // Card bg
        g.fillStyle(isSelected ? card.col : 0x111100, isSelected ? 0.15 : 0.5);
        g.fillRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH);

        // Border
        g.lineStyle(isSelected ? 2 : 1, card.col, isSelected ? 0.9 + pulse * 0.1 : 0.25);
        g.strokeRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH);

        // Top bar
        g.fillStyle(card.col, isSelected ? 0.7 : 0.2);
        g.fillRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, 3);

        // Icon circle
        g.fillStyle(card.col, isSelected ? 0.25 : 0.08);
        g.fillCircle(cx2, cy2 - 15, 22);
        g.lineStyle(1, card.col, isSelected ? 0.8 : 0.3);
        g.strokeCircle(cx2, cy2 - 15, 22);

        // Selected flash
        if (isSelected && selPhase < 0.2) {
          const flashA = (1 - selPhase / 0.2) * 0.4;
          g.fillStyle(card.col, flashA);
          g.fillRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH);
        }

        // Selection indicator
        if (isSelected) {
          g.lineStyle(2, card.col, 0.4 + pulse * 0.4);
          g.strokeRect(cx2 - cardW / 2 - 4, cy2 - cardH / 2 - 4, cardW + 8, cardH + 8);
        }
      });

      // Auto-select cursor arrow
      const selCX = cx + (selectedCard - 1) * 90;
      const arrowPulse = 0.5 + 0.5 * Math.sin(t * 6);
      g.lineStyle(2, 0xffdd00, arrowPulse);
      g.beginPath();
      g.moveTo(selCX - 8, cy + 70);
      g.lineTo(selCX, cy + 60);
      g.lineTo(selCX + 8, cy + 70);
      g.strokePath();
    }
  }

  _buildSurvival() {
    const LP = 200;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const INFO_W = 420;
    const PREV_X = LP + INFO_W + (RW - INFO_W) / 2;
    const PREV_Y = H / 2 + 18;

    const META = [
      { id: 'firewall_seed',  name: 'FIREWALL_SEED',    cost: 500, col: '#00aaff', colN: 0x00aaff, desc: 'Start with shield layer active (2 hits)',    anim: 'shield'   },
      { id: 'redundant_path', name: 'REDUNDANT_PATH',   cost: 900, col: '#aa00ff', colN: 0xaa00ff, desc: 'One free process recovery on death',          anim: 'revive'   },
      { id: 'redundant_buf',  name: 'REDUNDANT_BUFFER', cost: 400, col: '#00aaff', colN: 0x00aaff, desc: '+1 shield hit on top of current tier',         anim: 'stackshield' },
      { id: 'heat_sink',      name: 'HEAT_SINK',        cost: 350, col: '#ff4400', colN: 0xff4400, desc: 'Overheat cooldown is 30% faster',              anim: 'heatsink'  },
      { id: 'coolant_loop',   name: 'COOLANT_LOOP',     cost: 450, col: '#ff6600', colN: 0xff6600, desc: 'Bubble heat accumulates 25% slower',           anim: 'heatsink'  },
      { id: 'ghost_protocol', name: 'GHOST_PROTOCOL',   cost: 900, col: '#aaaaff', colN: 0xaaaaff, desc: '1s invisibility after overheat',               anim: 'ghost'     },
      { id: 'cooldown_patch', name: 'COOLDOWN_PATCH',   cost: 450, col: '#00ff88', colN: 0x00ff88, desc: 'Overheat lockout 3s to 1.8s',                  anim: 'cooldown'  },
      { id: 'regen_patch',    name: 'REGEN_PATCH',      cost: 600, col: '#00ff88', colN: 0x00ff88, desc: 'Restore 1 shield hit per wave clear',           anim: 'regen'     },
      { id: 'dash_patch',     name: 'DASH_PATCH',       cost: 400, col: '#00ff88', colN: 0x00ff88, desc: 'Dash cooldown 1.2s to 0.8s permanently',        anim: 'dash'      },
      { id: 'thermal_bleed',  name: 'THERMAL_BLEED',    cost: 500, col: '#ff4400', colN: 0xff4400, desc: 'Overheat ring damages nearby enemies',          anim: 'heatsink'  },
      { id: 'last_stand',     name: 'LAST_STAND',       cost: 500, col: '#ff2244', colN: 0xff2244, desc: 'Bubble expand rate +30% while shield is down',  anim: 'shield'    },
      { id: 'kinetic_damper', name: 'KINETIC_DAMPER',   cost: 450, col: '#4488ff', colN: 0x4488ff, desc: 'Dash invincibility duration +0.3s',             anim: 'dash'      },
    ];

    this._survivalIndex = 0;
    this._survivalAnimT = 0;
    this._survivalMeta  = META;

    const NAV_X = LP + 20;
    const NAV_W = INFO_W - 20;
    const RH    = 68;
    const GAP   = 6;
    const totalH = META.length * (RH + GAP) + 20;

    const sc = this._makeScrollPane('survival', totalH);

    META.forEach((m, i) => {
      const by = 58 + i * (RH + GAP);
      const owned = Save.meta(m.id, false);

      const rowBg  = this.add.rectangle(NAV_X + NAV_W / 2, by, NAV_W, RH, 0x050200, 0.97).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      const rowBdr = this.add.rectangle(NAV_X, by, NAV_W, RH).setStrokeStyle(1, m.colN, owned ? 0.25 : 0.35).setOrigin(0, 0);
      const rowBar = this.add.rectangle(NAV_X, by, 4, RH, m.colN, owned ? 0.4 : 0.7).setOrigin(0, 0);
      const rowTop = this.add.rectangle(NAV_X, by, NAV_W, 3, m.colN, owned ? 0.3 : 0.5).setOrigin(0, 0);
      const nameTxt = this.add.text(NAV_X + 16, by + 10, m.name, { fontFamily: mono, fontSize: '12px', fontStyle: 'bold', color: owned ? '#446644' : m.col });
      const costTxt = this.add.text(NAV_X + NAV_W - 12, by + 12, owned ? '✓' : `◈ ${m.cost}`, { fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: owned ? '#44aa77' : '#ffdd00' }).setOrigin(1, 0);
      const descTxt = this.add.text(NAV_X + 16, by + 32, m.desc, { fontFamily: mono, fontSize: '10px', color: '#998866', wordWrap: { width: NAV_W - 80 } });
      const selBar  = this.add.rectangle(NAV_X + NAV_W - 3, by, 3, RH, m.colN, 0).setOrigin(1, 0);

      [rowBg, rowBdr, rowBar, rowTop, nameTxt, costTxt, descTxt, selBar].forEach(o => { sc.add(o); this._reg('survival', o); });

      rowBg.on('pointerover', () => rowBg.setFillStyle(m.colN, 0.08));
      rowBg.on('pointerout',  () => rowBg.setFillStyle(0x050200, 0.97));
      rowBg.on('pointerdown', () => {
        if (this._survivalIndex === i) {
          if (!owned) {
            if (Save.spendShards(m.cost)) {
              Save.setMeta(m.id, true);
              this._msg(`${m.name} INSTALLED`);
              this._walletNum.setText(String(Save.shards()));
              this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
              this.time.delayedCall(600, () => this._switchTab('survival'));
            } else { this._msg('INSUFFICIENT SHARDS'); }
          }
        } else {
          this._survivalIndex = i;
          this._survivalAnimT = 0;
          this._refreshSurvivalSelection();
        }
      });

      m._rowBg   = rowBg;
      m._selBar  = selBar;
      m._nameTxt = nameTxt;
      m._costTxt = costTxt;
    });

    // Right preview area
    const prevBg = this.add.graphics();
    prevBg.lineStyle(1, 0x112211, 0.4);
    for (let x = LP + INFO_W; x <= W; x += 40) { prevBg.beginPath(); prevBg.moveTo(x, 36); prevBg.lineTo(x, H - 36); prevBg.strokePath(); }
    for (let y = 36; y <= H - 36; y += 40) { prevBg.beginPath(); prevBg.moveTo(LP + INFO_W, y); prevBg.lineTo(W, y); prevBg.strokePath(); }
    this._reg('survival', prevBg);
    this._reg('survival', this.add.rectangle(LP + INFO_W, H / 2, 1, H - 72, 0x332200, 0.5).setOrigin(0.5));
    this._reg('survival', this.add.text(PREV_X, 52, 'PREVIEW', { fontFamily: mono, fontSize: '9px', color: '#443300', letterSpacing: 3 }).setOrigin(0.5));

    this._survivalPreviewName = this.add.text(PREV_X, H - 55, '', { fontFamily: orb, fontSize: '11px', fontStyle: '900', color: '#00ff88', letterSpacing: 3 }).setOrigin(0.5).setDepth(5);
    this._reg('survival', this._survivalPreviewName);

    const buyBtnBg = this.add.rectangle(PREV_X, H - 25, 200, 30, 0x001100, 0.97).setStrokeStyle(2, 0x00ff88, 0.8).setDepth(5).setInteractive({ useHandCursor: true });
    this._survivalBuyBg  = buyBtnBg;
    this._survivalBuyBtn = this.add.text(PREV_X, H - 25, '[ BUY ]', { fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: '#00ff88' }).setOrigin(0.5).setDepth(6);
    this._reg('survival', buyBtnBg);
    this._reg('survival', this._survivalBuyBtn);

    buyBtnBg.on('pointerover', () => { buyBtnBg.setFillStyle(0x00ff88, 0.15); this._survivalBuyBtn.setColor('#ffffff'); });
    buyBtnBg.on('pointerout',  () => { buyBtnBg.setFillStyle(0x001100, 0.97); this._survivalBuyBtn.setColor(this._survivalBuyCol || '#00ff88'); });
    buyBtnBg.on('pointerdown', () => {
      const m = META[this._survivalIndex];
      if (!Save.meta(m.id, false)) {
        if (Save.spendShards(m.cost)) {
          Save.setMeta(m.id, true);
          this._msg(`${m.name} INSTALLED`);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this.time.delayedCall(600, () => this._switchTab('survival'));
        } else { this._msg('INSUFFICIENT SHARDS'); }
      }
    });

    this._survivalGfx   = this.add.graphics().setDepth(4);
    this._reg('survival', this._survivalGfx);
    this._survivalPrevX = PREV_X;
    this._survivalPrevY = PREV_Y;

    this._refreshSurvivalSelection();
  }

  _refreshSurvivalSelection() {
    const META = this._survivalMeta;
    if (!META) return;
    const m = META[this._survivalIndex];
    const owned = Save.meta(m.id, false);
    META.forEach((item, i) => {
      const active = i === this._survivalIndex;
      if (item._rowBg)  item._rowBg.setFillStyle(active ? item.colN : 0x050200, active ? 0.12 : 0.97);
      if (item._rowBg)  item._rowBg.setStrokeStyle(active ? 2 : 0, item.colN, active ? 0.9 : 0);
      if (item._selBar) item._selBar.setAlpha(active ? 1 : 0);
    });
    if (this._survivalPreviewName) this._survivalPreviewName.setText(m.name).setColor(m.col);
    const btnLabel = owned ? '✓ INSTALLED' : `[ BUY  ◈ ${m.cost} ]`;
    const btnCol   = owned ? '#224433' : m.col;
    this._survivalBuyCol = btnCol;
    if (this._survivalBuyBtn) this._survivalBuyBtn.setText(btnLabel).setColor(btnCol);
    if (this._survivalBuyBg)  this._survivalBuyBg.setStrokeStyle(2, m.colN, owned ? 0.2 : 0.8).setInteractive({ useHandCursor: !owned });
  }

  _drawSurvivalAnim(g, t, anim, cx, cy) {
    const playerR = 12;

    // ── Helper: draw player dot ──
    const drawPlayer = (x, y, col=0x00cc66, a=1) => {
      g.fillStyle(col, 0.1 * a); g.fillCircle(x, y, playerR * 2.5);
      g.fillStyle(col, 0.9 * a);
      g.beginPath();
      for (let s=0;s<6;s++){const ang=(Math.PI/3)*s+(t*0.8);s===0?g.moveTo(x+Math.cos(ang)*playerR,y+Math.sin(ang)*playerR):g.lineTo(x+Math.cos(ang)*playerR,y+Math.sin(ang)*playerR);}
      g.closePath(); g.fillPath();
      g.fillStyle(0xffffff, 0.8*a); g.fillCircle(x, y, 3);
    };

    // ── Helper: draw shield ring ──
    const drawShield = (x, y, hits, col=0x00aaff, a=1) => {
      const r = 36;
      g.lineStyle(1 + hits * 0.5, col, (0.5 + 0.4 * Math.sin(t*7)) * a);
      g.beginPath();
      for (let s=0;s<6;s++){const ang=t+(Math.PI/3)*s;s===0?g.moveTo(x+Math.cos(ang)*r,y+Math.sin(ang)*r):g.lineTo(x+Math.cos(ang)*r,y+Math.sin(ang)*r);}
      g.closePath(); g.strokePath();
      for (let d=0;d<hits;d++){const ang=t*2+(Math.PI/3)*d*2;g.fillStyle(col,0.8*a);g.fillCircle(x+Math.cos(ang)*r,y+Math.sin(ang)*r,3+hits*0.3);}
    };

    if (anim === 'shield') {
      // Shield absorbs a bullet — 2 hit dots shown
      const cycle = t % 3.0;
      drawPlayer(cx, cy);
      drawShield(cx, cy, 2, 0x00aaff);
      if (cycle < 1.2) {
        // Bullet incoming
        const prog = cycle / 1.2;
        const bx = cx - 130 + prog * 100;
        g.fillStyle(0xff4444, 0.9); g.fillCircle(bx, cy, 5);
        g.lineStyle(1, 0xff4444, 0.4); g.beginPath(); g.moveTo(bx-18,cy); g.lineTo(bx,cy); g.strokePath();
      } else if (cycle < 1.4) {
        // Shield absorb flash
        const f = 1 - (cycle-1.2)/0.2;
        g.fillStyle(0x00aaff, f*0.4); g.fillCircle(cx, cy, 50*f);
        g.lineStyle(3, 0x00aaff, f); g.strokeCircle(cx, cy, 36);
        g.lineStyle(2, 0xffffff, f*0.6); g.strokeCircle(cx-30, cy, 8);
      } else {
        // Shield still up, 1 hit dot gone (absorbed)
        drawShield(cx, cy, 1, 0x00aaff);
      }

    } else if (anim === 'revive') {
      // Player dies, revives
      const cycle = t % 3.5;
      if (cycle < 1.0) {
        drawPlayer(cx, cy);
      } else if (cycle < 1.4) {
        // Death flash
        const f = 1 - (cycle-1.0)/0.4;
        drawPlayer(cx, cy, 0xff2244, f);
        g.fillStyle(0xff2244, (1-f)*0.3); g.fillCircle(cx, cy, 60*(1-f));
      } else if (cycle < 2.2) {
        // Dead — show skull/X
        const f = (cycle-1.4)/0.8;
        g.lineStyle(2, 0xff2244, 0.6*f);
        g.beginPath(); g.moveTo(cx-12,cy-12); g.lineTo(cx+12,cy+12); g.strokePath();
        g.beginPath(); g.moveTo(cx+12,cy-12); g.lineTo(cx-12,cy+12); g.strokePath();
      } else {
        // Revive pulse
        const f = (cycle-2.2)/1.3;
        const pulseR = f * 80;
        g.lineStyle(2, 0xaa00ff, (1-f)*0.8); g.strokeCircle(cx, cy, pulseR);
        drawPlayer(cx, cy, 0xaa00ff, Math.min(1, f*3));
      }

    } else if (anim === 'stackshield') {
      // Shield ring with stacked hit dots growing
      const cycle = t % 3.0;
      const hits  = cycle < 1.5 ? 2 : 3; // shows +1 stacking
      const addA  = cycle > 1.3 && cycle < 2.0 ? Math.min(1,(cycle-1.3)/0.4) : (cycle>=2.0?1:0);
      drawPlayer(cx, cy);
      drawShield(cx, cy, 2, 0x00aaff);
      if (addA > 0) {
        // Extra dot appearing
        const ang = t*2 + Math.PI;
        g.fillStyle(0x00aaff, addA*0.9);
        g.fillCircle(cx+Math.cos(ang)*36, cy+Math.sin(ang)*36, 3.3 + 0.3);
        g.lineStyle(1, 0xffffff, addA*0.4);
        g.strokeCircle(cx+Math.cos(ang)*36, cy+Math.sin(ang)*36, 6);
        if (addA > 0.8) {
          g.fillStyle(0x00aaff, 0.2); g.fillCircle(cx, cy, 50*(1-(addA-0.8)/0.2));
        }
      }

    } else if (anim === 'heatsink') {
      // Heat bar fills, cools down fast
      const cycle = t % 3.5;
      const BAR_W = 20, BAR_H = 140;
      const bx = cx - BAR_W/2, by = cy - BAR_H/2;

      // Bar track
      g.fillStyle(0x1a0000, 0.8); g.fillRect(bx, by, BAR_W, BAR_H);
      g.lineStyle(1, 0xff4400, 0.4); g.strokeRect(bx, by, BAR_W, BAR_H);

      let fill;
      if (cycle < 1.5) { fill = cycle/1.5; }          // fills up
      else { fill = Math.max(0, 1-(cycle-1.5)/1.2); }   // cools fast

      const fillH = BAR_H * fill;
      const heatCol = fill > 0.8 ? 0xff2200 : fill > 0.5 ? 0xff6600 : 0xff4400;
      g.fillStyle(heatCol, 0.9); g.fillRect(bx+2, by+BAR_H-fillH+2, BAR_W-4, fillH-4);

      // Overheat marker
      g.lineStyle(1, 0xff0000, 0.7);
      g.beginPath(); g.moveTo(bx-8, by+BAR_H*0.15); g.lineTo(bx+BAR_W+8, by+BAR_H*0.15); g.strokePath();

      // Cool speed arrows (downward)
      if (fill < 0.9 && cycle > 1.5) {
        const arA = 0.5+0.5*Math.sin(t*6);
        for (let arr=0;arr<3;arr++){
          const ay = by+BAR_H-fillH+20+arr*14;
          if(ay < by+BAR_H-10){
            g.lineStyle(1, 0x00ff88, arA*(1-arr*0.3));
            g.beginPath(); g.moveTo(cx-8,ay); g.lineTo(cx,ay+7); g.lineTo(cx+8,ay); g.strokePath();
          }
        }
      }

      // Label
      g.fillStyle(0xff4400, 0.5);
      g.fillRect(cx+20, by, 8, BAR_H);
      g.fillStyle(0x00ff88, 0.5);
      g.fillRect(cx+30, by, 8, BAR_H*0.55); // shorter = faster cooldown

    } else if (anim === 'ghost') {
      // Overheat -> go invisible -> reappear
      const cycle = t % 4.0;
      if (cycle < 0.8) {
        // Normal
        drawPlayer(cx, cy, 0xaaaaff);
        drawShield(cx, cy, 1, 0xaaaaff);
      } else if (cycle < 1.2) {
        // Overheating flash red
        const f = (cycle-0.8)/0.4;
        drawPlayer(cx, cy, Phaser.Display.Color.Interpolate ? 0xaaaaff : 0xff4400, 1);
        g.lineStyle(2, 0xff2200, f*0.8); g.strokeCircle(cx, cy, 30+f*10);
      } else if (cycle < 2.2) {
        // Invisible — faded out, enemies pass through
        const ghostA = 0.15+0.05*Math.sin(t*6);
        drawPlayer(cx, cy, 0xaaaaff, ghostA);
        // Enemy bullet passing through
        const prog = (cycle-1.2)/1.0;
        const bx2 = cx - 80 + prog * 160;
        g.fillStyle(0xff4444, 0.7); g.fillCircle(bx2, cy, 4);
        // Dashed line showing pass-through
        g.lineStyle(1, 0x444444, 0.4);
        g.beginPath(); g.moveTo(bx2-30,cy); g.lineTo(bx2,cy); g.strokePath();
      } else {
        // Reappear
        const f = Math.min(1,(cycle-2.2)/0.5);
        drawPlayer(cx, cy, 0xaaaaff, f);
        g.lineStyle(1, 0xaaaaff, (1-f)*0.6); g.strokeCircle(cx, cy, 40*(1-f));
      }

    } else if (anim === 'cooldown') {
      // Two timers side by side: OLD 3s vs NEW 1.8s
      const cycle = t % 4.0;
      const labels = [{label:'OLD',dur:3.0,col:0xff4444,x:cx-70},{label:'NEW',dur:1.8,col:0x00ff88,x:cx+70}];
      labels.forEach(lb => {
        const r = 32;
        const frac = Math.min(1, cycle/lb.dur);
        // Arc background
        g.lineStyle(4, 0x111111, 0.9); g.beginPath(); g.arc(lb.x,cy,r,0,Math.PI*2); g.strokePath();
        // Arc fill
        g.lineStyle(4, lb.col, 0.8); g.beginPath(); g.arc(lb.x,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*frac); g.strokePath();
        // Center label
        const pct = frac >= 1 ? 'DONE' : `${((1-frac)*lb.dur).toFixed(1)}s`;
        g.fillStyle(lb.col, 0.15); g.fillCircle(lb.x, cy, r-2);
        // Dot at tip
        const tipA = -Math.PI/2+Math.PI*2*frac;
        g.fillStyle(0xffffff, 0.9); g.fillCircle(lb.x+Math.cos(tipA)*r, cy+Math.sin(tipA)*r, 4);
        // Label above
        g.fillStyle(lb.col, 0.6); g.fillRect(lb.x-16, cy-r-20, 32, 14);
        g.fillStyle(0x000000, 1); g.fillRect(lb.x-14, cy-r-18, 28, 10);
        // Done flash
        if (frac >= 1) { const f2=0.5+0.5*Math.sin(t*8); g.lineStyle(2,lb.col,f2); g.strokeCircle(lb.x,cy,r+4); }
      });
      // VS text area
      g.lineStyle(1, 0x332200, 0.5); g.beginPath(); g.moveTo(cx,cy-40); g.lineTo(cx,cy+40); g.strokePath();

    } else if (anim === 'regen') {
      // Shield with missing dot, wave-clear pulse restores it
      const cycle = t % 4.0;
      drawPlayer(cx, cy);
      if (cycle < 2.0) {
        // Shield with 1 hit missing
        drawShield(cx, cy, 1, 0x00ff88);
        // Broken indicator
        const ang = t + Math.PI;
        g.lineStyle(1, 0xff4444, 0.5); g.strokeCircle(cx+Math.cos(ang)*36, cy+Math.sin(ang)*36, 5);
      } else if (cycle < 2.6) {
        // Wave clear pulse
        const f = (cycle-2.0)/0.6;
        drawShield(cx, cy, 1, 0x00ff88);
        g.lineStyle(2, 0x00ff88, (1-f)*0.8); g.strokeCircle(cx, cy, 36+f*50);
        g.lineStyle(1, 0x00ff88, f*0.6); g.strokeCircle(cx, cy, 36);
      } else {
        // Shield restored to 2 hits
        const f = Math.min(1,(cycle-2.6)/0.4);
        drawShield(cx, cy, 1+f, 0x00ff88);
        if (f < 0.8) { g.fillStyle(0x00ff88, (1-f)*0.4); g.fillCircle(cx, cy, 55*(1-f)); }
      }

    } else if (anim === 'dash') {
      // Player dashes left/right, cooldown arc resets quickly
      const cycle = t % 2.0;
      const dashDur = 0.3;
      const cdDur = 0.8; // NEW shorter cooldown

      let px2 = cx, alpha3 = 1;
      let cdFrac = 0;

      if (cycle < dashDur) {
        // Dashing right
        const f = cycle/dashDur;
        px2 = cx - 60 + f*120;
        // Dash trail
        for (let tr=0;tr<5;tr++){
          const ta = 1-(tr/5);
          const tx = px2 - f*120*(tr/5)*0.4;
          g.lineStyle(1, 0x00cc66, ta*0.4);
          g.beginPath();
          for (let s=0;s<6;s++){const ang=(Math.PI/3)*s;s===0?g.moveTo(tx+Math.cos(ang)*playerR*ta,cy+Math.sin(ang)*playerR*ta):g.lineTo(tx+Math.cos(ang)*playerR*ta,cy+Math.sin(ang)*playerR*ta);}
          g.closePath(); g.strokePath();
        }
        cdFrac = 0;
      } else if (cycle < dashDur + cdDur) {
        // Cooldown
        px2 = cx + 60;
        cdFrac = (cycle-dashDur)/cdDur;
      } else if (cycle < dashDur + cdDur + dashDur) {
        // Dash back
        const f = (cycle-dashDur-cdDur)/dashDur;
        px2 = cx + 60 - f*120;
        for (let tr=0;tr<5;tr++){
          const ta = 1-(tr/5);
          const tx = px2 + f*120*(tr/5)*0.4;
          g.lineStyle(1, 0x00cc66, ta*0.4);
          g.beginPath();
          for (let s=0;s<6;s++){const ang=(Math.PI/3)*s;s===0?g.moveTo(tx+Math.cos(ang)*playerR*ta,cy+Math.sin(ang)*playerR*ta):g.lineTo(tx+Math.cos(ang)*playerR*ta,cy+Math.sin(ang)*playerR*ta);}
          g.closePath(); g.strokePath();
        }
        cdFrac = 1;
      } else {
        px2 = cx - 60;
        cdFrac = 1-(cycle-dashDur*2-cdDur)/cdDur;
      }

      // Cooldown arc under player
      const cdR = 20;
      g.lineStyle(3, 0x112211, 0.8); g.beginPath(); g.arc(px2, cy+28, cdR, 0, Math.PI*2); g.strokePath();
      g.lineStyle(3, 0x00ff88, 0.8); g.beginPath(); g.arc(px2, cy+28, cdR, -Math.PI/2, -Math.PI/2+Math.PI*2*cdFrac); g.strokePath();

      drawPlayer(px2, cy, 0x00cc66, alpha3);
    }
  }

  _buildCombat() {
    const LP = 200;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const INFO_W = 420;
    const PREV_X = LP + INFO_W + (RW - INFO_W) / 2;
    const PREV_Y = H / 2 + 18;

    const META = [
      { id: 'data_cache',    name: 'DATA_CACHE',      cost: 450, col: '#ffdd00', colN: 0xffdd00, desc: 'Score multiplier x1.25 on all kills',          anim: 'score'   },
      { id: 'primed_signal', name: 'PRIMED_SIGNAL',   cost: 650, col: '#ff6600', colN: 0xff6600, desc: 'Signal meter starts 50% full each run',         anim: 'primed'  },
      { id: 'packet_router', name: 'PACKET_ROUTER',   cost: 500, col: '#00cc66', colN: 0x00cc66, desc: 'Ping cooldown reduced 15s to 10s',               anim: 'ping'    },
      { id: 'chain_patch',   name: 'CHAIN_PATCH',     cost: 500, col: '#00ff88', colN: 0x00ff88, desc: 'Chain reaction depth +1 permanently',            anim: 'chain'   },
      { id: 'combo_memory',  name: 'COMBO_MEMORY',    cost: 400, col: '#ff88cc', colN: 0xff88cc, desc: 'Combo timer +0.5s (stacks with SLOW_COMBO)',    anim: 'score'   },
      { id: 'shard_doubler', name: 'SHARD_DOUBLER',   cost: 600, col: '#ffdd00', colN: 0xffdd00, desc: 'Per-kill shard drops doubled',                  anim: 'score'   },
      { id: 'boss_trace',    name: 'BOSS_TRACE',      cost: 500, col: '#aa44ff', colN: 0xaa44ff, desc: 'Score on boss kills x1.25',                     anim: 'score'   },
      { id: 'perfect_reflect',name:'PERFECT_REFLECT', cost: 700, col: '#00ffcc', colN: 0x00ffcc, desc: 'After reflect-kill, next 2s score x2',          anim: 'chain'   },
      { id: 'fragment_refinery',name:'FRAGMENT_REFINERY',cost:500,col:'#ffaa00',colN:0xffaa00,desc:'Unlocks shard→fragment conversion (5◈ = 1▲)',anim:'score'},
    ];

    this._combatIndex = 0;
    this._combatAnimT = 0;
    this._combatMeta  = META;

    const NAV_X = LP + 20;
    const NAV_W = INFO_W - 20;
    const RH    = 100;
    const GAP   = 10;

    META.forEach((m, i) => {
      const by = 80 + i * (RH + GAP);
      const owned = Save.meta(m.id, false);

      const rowBg  = this.add.rectangle(NAV_X + NAV_W/2, by, NAV_W, RH, 0x050200, 0.97).setOrigin(0.5,0).setInteractive({useHandCursor:true});
      const rowBdr = this.add.rectangle(NAV_X, by, NAV_W, RH).setStrokeStyle(1, m.colN, owned?0.25:0.35).setOrigin(0,0);
      const rowBar = this.add.rectangle(NAV_X, by, 4, RH, m.colN, owned?0.4:0.7).setOrigin(0,0);
      const rowTop = this.add.rectangle(NAV_X, by, NAV_W, 3, m.colN, owned?0.3:0.5).setOrigin(0,0);
      const nameTxt = this.add.text(NAV_X+16, by+14, m.name, {fontFamily:mono, fontSize:'13px', fontStyle:'bold', color:owned?'#446644':m.col});
      const costTxt = this.add.text(NAV_X+NAV_W-12, by+16, owned?'✓':`◈ ${m.cost}`, {fontFamily:mono, fontSize:'11px', fontStyle:'bold', color:owned?'#44aa77':'#ffdd00'}).setOrigin(1,0);
      const descTxt = this.add.text(NAV_X+16, by+40, m.desc, {fontFamily:mono, fontSize:'11px', color:'#998866', wordWrap:{width:NAV_W-80}});
      const selBar  = this.add.rectangle(NAV_X+NAV_W-3, by, 3, RH, m.colN, 0).setOrigin(1,0);

      [rowBg,rowBdr,rowBar,rowTop,nameTxt,costTxt,descTxt,selBar].forEach(o=>this._reg('combat',o));

      rowBg.on('pointerover', ()=>rowBg.setFillStyle(m.colN,0.08));
      rowBg.on('pointerout',  ()=>rowBg.setFillStyle(0x050200,0.97));
      rowBg.on('pointerdown', ()=>{
        if(this._combatIndex===i){
          if(!owned){
            if(Save.spendShards(m.cost)){
              Save.setMeta(m.id,true);
              this._msg(`${m.name} INSTALLED`);
              this._walletNum.setText(String(Save.shards()));
              this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
              this.time.delayedCall(600,()=>this._switchTab('combat'));
            } else this._msg('INSUFFICIENT SHARDS');
          }
        } else {
          this._combatIndex=i;
          this._combatAnimT=0;
          this._refreshCombatSelection();
        }
      });
      m._rowBg=rowBg; m._selBar=selBar;
    });

    // Right preview area
    const prevBg=this.add.graphics();
    prevBg.lineStyle(1,0x112211,0.4);
    for(let x=LP+INFO_W;x<=W;x+=40){prevBg.beginPath();prevBg.moveTo(x,36);prevBg.lineTo(x,H-36);prevBg.strokePath();}
    for(let y=36;y<=H-36;y+=40){prevBg.beginPath();prevBg.moveTo(LP+INFO_W,y);prevBg.lineTo(W,y);prevBg.strokePath();}
    this._reg('combat',prevBg);
    this._reg('combat',this.add.rectangle(LP+INFO_W,H/2,1,H-72,0x332200,0.5).setOrigin(0.5));
    this._reg('combat',this.add.text(PREV_X,52,'PREVIEW',{fontFamily:mono,fontSize:'9px',color:'#443300',letterSpacing:3}).setOrigin(0.5));

    this._combatPreviewName=this.add.text(PREV_X,H-55,'',{fontFamily:orb,fontSize:'11px',fontStyle:'900',color:'#ffdd00',letterSpacing:3}).setOrigin(0.5).setDepth(5);
    this._reg('combat',this._combatPreviewName);

    const buyBtnBg=this.add.rectangle(PREV_X,H-25,200,30,0x001100,0.97).setStrokeStyle(2,0xffdd00,0.8).setDepth(5).setInteractive({useHandCursor:true});
    this._combatBuyBg=buyBtnBg;
    this._combatBuyBtn=this.add.text(PREV_X,H-25,'[ BUY ]',{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:'#ffdd00'}).setOrigin(0.5).setDepth(6);
    this._reg('combat',buyBtnBg);
    this._reg('combat',this._combatBuyBtn);
    buyBtnBg.on('pointerover',()=>{buyBtnBg.setFillStyle(0xffdd00,0.15);this._combatBuyBtn.setColor('#ffffff');});
    buyBtnBg.on('pointerout', ()=>{buyBtnBg.setFillStyle(0x001100,0.97);this._combatBuyBtn.setColor(this._combatBuyCol||'#ffdd00');});
    buyBtnBg.on('pointerdown',()=>{
      const m=META[this._combatIndex];
      if(!Save.meta(m.id,false)){
        if(Save.spendShards(m.cost)){
          Save.setMeta(m.id,true);
          this._msg(`${m.name} INSTALLED`);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this.time.delayedCall(600,()=>this._switchTab('combat'));
        } else this._msg('INSUFFICIENT SHARDS');
      }
    });

    this._combatGfx=this.add.graphics().setDepth(4);
    this._reg('combat',this._combatGfx);
    this._combatPrevX=PREV_X;
    this._combatPrevY=PREV_Y;

    this._refreshCombatSelection();

    // Fragment Refinery conversion button (only if owned)
    if(Save.hasMeta('fragment_refinery')){
      const cbX=LP+20,cbY=17;
      const cbBtn=this.add.text(cbX,cbY,'[ CONVERT 5◈ → 1▲ ]',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:'#ffaa00'}).setOrigin(0,0.5).setInteractive({useHandCursor:true});
      this._reg('combat',cbBtn);
      cbBtn.on('pointerover',()=>cbBtn.setColor('#ffdd00'));
      cbBtn.on('pointerout',()=>cbBtn.setColor('#ffaa00'));
      cbBtn.on('pointerdown',()=>{
        if(Save.shards()>=5){
          Save.addShards(-5);
          Save.addFragments(1);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this._msg('+1 FRAGMENT');
        } else {
          this._msg('INSUFFICIENT SHARDS');
        }
      });
    }
  }

  _refreshCombatSelection(){
    const META=this._combatMeta;
    if(!META)return;
    const m=META[this._combatIndex];
    const owned=Save.meta(m.id,false);
    META.forEach((item,i)=>{
      const active=i===this._combatIndex;
      if(item._rowBg) item._rowBg.setFillStyle(active?item.colN:0x050200,active?0.12:0.97);
      if(item._rowBg) item._rowBg.setStrokeStyle(active?2:0,item.colN,active?0.9:0);
      if(item._selBar)item._selBar.setAlpha(active?1:0);
    });
    if(this._combatPreviewName)this._combatPreviewName.setText(m.name).setColor(m.col);
    const btnLabel=owned?'✓ INSTALLED':`[ BUY  ◈ ${m.cost} ]`;
    const btnCol=owned?'#224433':m.col;
    this._combatBuyCol=btnCol;
    if(this._combatBuyBtn)this._combatBuyBtn.setText(btnLabel).setColor(btnCol);
    if(this._combatBuyBg) this._combatBuyBg.setStrokeStyle(2,m.colN,owned?0.2:0.8).setInteractive({useHandCursor:!owned});
  }

  _drawCombatAnim(g,t,anim,cx,cy){

    if(anim==='score'){
      // Two kills side by side — normal vs x1.25 boosted
      const cycle=t%3.0;
      const killPhase=cycle<1.5?cycle/1.5:0;
      const popA=killPhase>0.1?Math.min(1,(killPhase-0.1)/0.2):0;
      const floatY=killPhase>0.1?(killPhase-0.1)*60:0;

      // Left: normal kill
      const lx=cx-80, rx=cx+80;

      // Enemy dots
      [lx,rx].forEach((ex,ei)=>{
        if(killPhase<0.5){
          g.fillStyle(0xff4444,0.8);
          g.beginPath();
          for(let s=0;s<4;s++){const a=(Math.PI/2)*s+t;g.lineTo(ex+Math.cos(a)*14,cy+Math.sin(a)*14);}
          g.closePath();g.fillPath();
        } else {
          // Explosion
          const ef=Math.min(1,(killPhase-0.5)/0.3);
          g.lineStyle(1,0xff4444,(1-ef)*0.8);g.strokeCircle(ex,cy,14+ef*20);
        }
      });

      // Score pops
      if(popA>0){
        const lScore=100, rScore=125;
        const lCol=0xffdd00, rCol=0xffd700;

        // Normal score
        g.fillStyle(lCol,popA*0.9);
        g.fillRect(lx-22,cy-floatY-16,44,20);
        g.fillStyle(0x000000,1);g.fillRect(lx-20,cy-floatY-14,40,16);
        g.fillStyle(lCol,popA);
        // Score bar representation
        g.fillRect(lx-18,cy-floatY-10,36*(lScore/125),8);

        // Boosted score — bigger, brighter
        const pulse=0.8+0.2*Math.sin(t*8);
        g.fillStyle(rCol,popA*pulse);
        g.fillRect(rx-28,cy-floatY-20,56,26);
        g.fillStyle(0x000000,1);g.fillRect(rx-26,cy-floatY-18,52,22);
        g.fillStyle(rCol,popA*pulse);
        g.fillRect(rx-24,cy-floatY-14,48*(rScore/125),14);

        // x1.25 label glow
        g.lineStyle(1,rCol,popA*0.6);g.strokeRect(rx-28,cy-floatY-20,56,26);
      }

      // Labels
      g.fillStyle(0xffdd00,0.4);g.fillRect(lx-25,cy+30,50,14);
      g.fillStyle(0x000000,1);g.fillRect(lx-23,cy+32,46,10);
      g.fillStyle(0xffdd00,0.35);g.fillRect(lx-21,cy+33,42,8);

      g.fillStyle(0xffd700,0.7);g.fillRect(rx-30,cy+30,60,14);
      g.fillStyle(0x000000,1);g.fillRect(rx-28,cy+32,56,10);
      g.fillStyle(0xffd700,0.65);g.fillRect(rx-26,cy+33,52,8);

      // Divider
      g.lineStyle(1,0x332200,0.5);g.beginPath();g.moveTo(cx,cy-60);g.lineTo(cx,cy+50);g.strokePath();

    } else if(anim==='primed'){
      // Surge meter jumps to 50% at run start instead of empty
      const cycle=t%4.0;
      const BAR_W=24,BAR_H=150;
      const bx=cx-BAR_W/2,by=cy-BAR_H/2;

      g.fillStyle(0x0a0400,0.9);g.fillRect(bx,by,BAR_W,BAR_H);
      g.lineStyle(1,0xff6600,0.4);g.strokeRect(bx,by,BAR_W,BAR_H);

      // 50% marker line
      g.lineStyle(1,0xff6600,0.6);
      g.beginPath();g.moveTo(bx-10,by+BAR_H*0.5);g.lineTo(bx+BAR_W+10,by+BAR_H*0.5);g.strokePath();

      let fillFrac=0;
      if(cycle<0.3){
        // Empty at start
        fillFrac=0;
      } else if(cycle<0.8){
        // Jump to 50%
        fillFrac=Math.min(0.5,(cycle-0.3)/0.5*0.5);
      } else if(cycle<2.5){
        fillFrac=0.5;
        // Pulse at 50%
        const pulse=0.5+0.5*Math.sin(t*6);
        g.lineStyle(2,0xff6600,pulse*0.6);g.strokeRect(bx-3,by-3,BAR_W+6,BAR_H+6);
      } else if(cycle<3.5){
        // Continue filling normally
        fillFrac=0.5+(cycle-2.5)/1.0*0.5;
      } else {
        fillFrac=1;
        const pulse=0.5+0.5*Math.sin(t*8);
        g.lineStyle(2,0xff8800,pulse);g.strokeRect(bx-3,by-3,BAR_W+6,BAR_H+6);
      }

      const fillH=BAR_H*fillFrac;
      g.fillStyle(0xff6600,0.9);g.fillRect(bx+2,by+BAR_H-fillH+2,BAR_W-4,fillH-4);

      // Segment lines
      for(let seg=1;seg<5;seg++){
        const sy=by+BAR_H*(seg/5);
        g.lineStyle(1,0x331100,0.6);g.beginPath();g.moveTo(bx,sy);g.lineTo(bx+BAR_W,sy);g.strokePath();
      }

      // Head start arrow
      if(cycle>0.3&&cycle<2.5){
        const arA=0.5+0.5*Math.sin(t*5);
        g.lineStyle(2,0xff6600,arA);
        g.beginPath();g.moveTo(bx+BAR_W+12,by+BAR_H*0.5+10);g.lineTo(bx+BAR_W+22,by+BAR_H*0.5);g.lineTo(bx+BAR_W+12,by+BAR_H*0.5-10);g.strokePath();
      }

    } else if(anim==='ping'){
      // Two ping cooldown arcs: OLD 15s vs NEW 10s
      const cycle=t%4.5;
      const pairs=[
        {label:'OLD',dur:15,displayDur:3.0,col:0xff4444,x:cx-70},
        {label:'NEW',dur:10,displayDur:2.0,col:0x00cc66,x:cx+70},
      ];
      pairs.forEach(lb=>{
        const r=34;
        const frac=Math.min(1,cycle/lb.displayDur);
        g.lineStyle(5,0x111111,0.9);g.beginPath();g.arc(lb.x,cy,r,0,Math.PI*2);g.strokePath();
        g.lineStyle(5,lb.col,0.8);g.beginPath();g.arc(lb.x,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*frac);g.strokePath();
        g.fillStyle(lb.col,0.1);g.fillCircle(lb.x,cy,r-2);
        // Tip dot
        const tipA=-Math.PI/2+Math.PI*2*frac;
        g.fillStyle(0xffffff,0.9);g.fillCircle(lb.x+Math.cos(tipA)*r,cy+Math.sin(tipA)*r,4);
        // Done pulse
        if(frac>=1){const f2=0.5+0.5*Math.sin(t*8);g.lineStyle(2,lb.col,f2);g.strokeCircle(lb.x,cy,r+5);}
        // Time label
        const secs=lb.dur;
        g.fillStyle(lb.col,0.5);g.fillRect(lb.x-16,cy-r-22,32,16);
        g.fillStyle(0x000000,1);g.fillRect(lb.x-14,cy-r-20,28,12);
        g.fillStyle(lb.col,0.8);g.fillRect(lb.x-12,cy-r-18,24*(frac),8);
      });
      g.lineStyle(1,0x332200,0.5);g.beginPath();g.moveTo(cx,cy-50);g.lineTo(cx,cy+50);g.strokePath();

    } else if(anim==='chain'){
      // Chain reaction — bullet reflects, kills cascade, counter increments
      const cycle=t%4.0;
      const enemies=[
        {x:cx+80,  y:cy-40},
        {x:cx+130, y:cy+10},
        {x:cx+90,  y:cy+55},
        {x:cx+40,  y:cy+70}, // extra chain kill
      ];
      const chainDepth=4; // with patch = +1

      // Player dot
      g.fillStyle(0x00ff88,0.1);g.fillCircle(cx-70,cy,20);
      g.fillStyle(0x00ff88,0.85);
      g.beginPath();
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s+t*0.8;s===0?g.moveTo(cx-70+Math.cos(a)*12,cy+Math.sin(a)*12):g.lineTo(cx-70+Math.cos(a)*12,cy+Math.sin(a)*12);}
      g.closePath();g.fillPath();
      g.fillStyle(0xffffff,0.8);g.fillCircle(cx-70,cy,3);

      // Bubble
      const bR=30+Math.sin(t*2)*3;
      g.lineStyle(1.5,0x00ffcc,0.6);
      g.beginPath();
      for(let s=0;s<6;s++){const a=t*0.3+(Math.PI/3)*s;s===0?g.moveTo(cx-70+Math.cos(a)*bR,cy+Math.sin(a)*bR):g.lineTo(cx-70+Math.cos(a)*bR,cy+Math.sin(a)*bR);}
      g.closePath();g.strokePath();

      // Bullet travel and chain kills
      enemies.forEach((e,ei)=>{
        const killTime=0.4+ei*0.6;
        const isExtra=ei===3;
        const eAlpha=cycle>killTime+0.3?0:(cycle>killTime?1-(cycle-killTime)/0.3:1);

        // Enemy shape
        if(eAlpha>0){
          g.fillStyle(isExtra?0xff8800:0xff4444,eAlpha*0.8);
          g.beginPath();
          for(let s=0;s<3;s++){const a=(Math.PI*2/3)*s+t;s===0?g.moveTo(e.x+Math.cos(a)*12,e.y+Math.sin(a)*12):g.lineTo(e.x+Math.cos(a)*12,e.y+Math.sin(a)*12);}
          g.closePath();g.fillPath();
          if(isExtra){
            g.lineStyle(1,0xff8800,0.5);g.strokeRect(e.x-14,e.y-8,8,16); // +1 indicator
          }
        }

        // Kill explosion
        if(cycle>killTime&&cycle<killTime+0.4){
          const ef=(cycle-killTime)/0.4;
          g.lineStyle(1.5,isExtra?0xff8800:0xff4444,(1-ef)*0.9);
          g.strokeCircle(e.x,e.y,12+ef*25);
          // Chain line to next
          if(ei<enemies.length-1){
            const ne=enemies[ei+1];
            g.lineStyle(1,0x00ffcc,ef*0.6);
            g.beginPath();g.moveTo(e.x,e.y);g.lineTo(ne.x,ne.y);g.strokePath();
          }
        }
      });

      // Reflected bullet
      if(cycle<1.0){
        const prog=cycle/1.0;
        const bx2=cx-40+prog*120;
        const byy=cy-40*prog;
        g.fillStyle(0x00ffcc,0.9);g.fillCircle(bx2,byy,5);
        g.lineStyle(1.5,0x00ffcc,0.5);g.beginPath();g.moveTo(bx2-20,byy+8);g.lineTo(bx2,byy);g.strokePath();
      }

      // Chain counter
      const chainCount=Math.min(chainDepth,Math.floor(cycle/0.6)+1);
      g.lineStyle(1,0x00ff88,0.4);g.strokeRect(cx-65,cy+85,130,22);
      g.fillStyle(0x00ff88,0.15);g.fillRect(cx-65,cy+85,130,22);
      for(let c=0;c<chainDepth;c++){
        const active=c<chainCount;
        const isNewDot=c===chainDepth-1;
        const dotX=cx-55+c*30;
        g.fillStyle(isNewDot?0xff8800:0x00ff88,active?0.9:0.2);
        g.fillCircle(dotX,cy+96,active?6:4);
        if(isNewDot&&active){
          g.lineStyle(1,0xff8800,0.5+0.5*Math.sin(t*8));
          g.strokeCircle(dotX,cy+96,9);
        }
      }
    }
  }

  _buildPowers() {
    const LP = 200;
    const RW = W - LP;
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const INFO_W = 420;
    const PREV_X = LP + INFO_W + (RW - INFO_W) / 2;
    const PREV_Y = H / 2 + 18;
    const equippedPower = Save.get('equipped_power','ping')||'ping';

    const ALL_POWERS = [
      { id:'ping',           name:'PING',            icon:'⬡', col:'#00ff66', colN:0x00ff66, cost:0,    cd:'15s',    desc:'Emit hex rings reversing nearby bullets. Default power, free forever.', anim:'ping'    },
      { id:'emp_burst',      name:'EMP_BURST',        icon:'⚡', col:'#ffffff', colN:0xffffff, cost:800,  cd:'22s',    desc:'Stuns ALL enemies for 4 seconds. Freezes enemy bullets in place.',       anim:'emp'     },
      { id:'null_zone',      name:'NULL_ZONE',         icon:'◯', col:'#aa00ff', colN:0xaa00ff, cost:1000, cd:'28s',    desc:'Void node at cursor. Deletes all bullets in 130px radius for 6s.',       anim:'null'    },
      { id:'overclock_surge',name:'OVERCLOCK_SURGE',  icon:'⚙', col:'#ffdd00', colN:0xffdd00, cost:1200, cd:'35s',    desc:'Triple bubble speed, zero heat, gold bubble for 4s.',                    anim:'surge'   },
      { id:'chain_trigger',  name:'CHAIN_TRIGGER',    icon:'∞', col:'#ff6600', colN:0xff6600, cost:900,  cd:'18s',    desc:'Instantly detonates ALL reflected bullets. Massive chain potential.',    anim:'chain'   },
      { id:'ghost_step',     name:'GHOST_STEP',        icon:'~', col:'#aaaaff', colN:0xaaaaff, cost:700,  cd:'26s',    desc:'Enemies lose targeting for 3s. They wander randomly.',                   anim:'ghost'   },
      { id:'corrupt_wave',   name:'CORRUPT_WAVE',      icon:'☣', col:'#00ff44', colN:0x00ff44, cost:1100, cd:'38s',    desc:'Corruption wave — all enemies within 300px gain +2 corruption.',        anim:'corrupt' },
      { id:'system_restore', name:'SYSTEM_RESTORE',   icon:'↺', col:'#00ffcc', colN:0x00ffcc, cost:600,  cd:'1/wave', desc:'Clears overheat. Regenerates shield. Refills 30% surge meter.',           anim:'restore' },
      { id:'decoy_packet',   name:'DECOY_PACKET',      icon:'◈', col:'#ff8800', colN:0xff8800, cost:750,  cd:'32s',    desc:'Drop a decoy. All enemies retarget it for 6s.',                          anim:'decoy'   },
    ];

    this._powersIndex = ALL_POWERS.findIndex(p=>p.id===equippedPower)||0;
    this._powersAnimT = 0;
    this._powersMeta  = ALL_POWERS;

    const NAV_X = LP + 20;
    const NAV_W = INFO_W - 20;
    const RH    = 60;
    const GAP   = 5;
    const totalH = ALL_POWERS.length * (RH + GAP) + 20;
    const sc = this._makeScrollPane('powers', totalH);

    ALL_POWERS.forEach((p, i) => {
      const by = 58 + i * (RH + GAP);
      const owned    = p.cost === 0 || Save.meta('power_' + p.id, false);
      const equipped = equippedPower === p.id;

      const rowBg  = this.add.rectangle(NAV_X+NAV_W/2, by, NAV_W, RH, equipped?p.colN:0x050200, equipped?0.12:0.97).setOrigin(0.5,0).setInteractive({useHandCursor:true});
      const rowBdr = this.add.rectangle(NAV_X, by, NAV_W, RH).setStrokeStyle(equipped?2:1, p.colN, equipped?0.9:0.3).setOrigin(0,0);
      const rowBar = this.add.rectangle(NAV_X, by, 4, RH, p.colN, equipped?0.9:0.5).setOrigin(0,0);
      const rowTop = this.add.rectangle(NAV_X, by, NAV_W, 3, p.colN, equipped?0.7:0.3).setOrigin(0,0);

      // Icon
      const iconBg = this.add.graphics();
      iconBg.fillStyle(p.colN, 0.1); iconBg.fillCircle(NAV_X+22, by+RH/2, 18);
      iconBg.lineStyle(1, p.colN, 0.5); iconBg.strokeCircle(NAV_X+22, by+RH/2, 18);
      const iconT = this.add.text(NAV_X+22, by+RH/2, p.icon, {fontFamily:mono, fontSize:'16px', color:p.col}).setOrigin(0.5);

      const nameTxt = this.add.text(NAV_X+50, by+8, p.name, {fontFamily:mono, fontSize:'12px', fontStyle:'bold', color:equipped?p.col:owned?p.col:p.col}).setAlpha(owned||equipped?1:0.7);
      const cdTxt   = this.add.text(NAV_X+50+p.name.length*7+8, by+10, `CD:${p.cd}`, {fontFamily:mono, fontSize:'8px', color:'#886633'});
      const descTxt = this.add.text(NAV_X+50, by+30, p.desc, {fontFamily:mono, fontSize:'9px', color:'#998866', wordWrap:{width:NAV_W-150}});

      const statusStr = equipped?'[ EQUIPPED ]':owned?'[ EQUIP ]':`◈ ${p.cost}`;
      const statusCol = equipped?p.col:owned?'#00cc44':'#ffdd00';
      const btnTxt = this.add.text(NAV_X+NAV_W-12, by+RH/2, statusStr, {fontFamily:mono, fontSize:'10px', fontStyle:'bold', color:statusCol}).setOrigin(1,0.5);
      const selBar = this.add.rectangle(NAV_X+NAV_W-3, by, 3, RH, p.colN, equipped?1:0).setOrigin(1,0);

      [rowBg,rowBdr,rowBar,rowTop,iconBg,iconT,nameTxt,cdTxt,descTxt,btnTxt,selBar].forEach(o=>{sc.add(o);this._reg('powers',o);});

      rowBg.on('pointerover', ()=>rowBg.setFillStyle(p.colN, 0.1));
      rowBg.on('pointerout',  ()=>rowBg.setFillStyle(equipped?p.colN:0x050200, equipped?0.12:0.97));
      rowBg.on('pointerdown', ()=>{
        if(this._powersIndex===i){
          // Second click = buy or equip
          if(!owned){
            if(Save.spendShards(p.cost)){
              Save.setMeta('power_'+p.id,true);
              Save.set('equipped_power',p.id);
              this._walletNum.setText(String(Save.shards()));
              this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
              this._msg(`${p.name} PURCHASED & EQUIPPED`);
              this.time.delayedCall(600,()=>this._switchTab('powers'));
            } else this._msg(`NEED ${p.cost} ◈`);
          } else if(!equipped){
            Save.set('equipped_power',p.id);
            this._msg(`${p.name} EQUIPPED`);
            this.time.delayedCall(400,()=>this._switchTab('powers'));
          }
        } else {
          this._powersIndex=i;
          this._powersAnimT=0;
          this._refreshPowersSelection();
        }
      });

      p._rowBg=rowBg; p._selBar=selBar; p._btnTxt=btnTxt;
    });

    // Right preview area
    const prevBg=this.add.graphics();
    prevBg.lineStyle(1,0x112211,0.4);
    for(let x=LP+INFO_W;x<=W;x+=40){prevBg.beginPath();prevBg.moveTo(x,36);prevBg.lineTo(x,H-36);prevBg.strokePath();}
    for(let y=36;y<=H-36;y+=40){prevBg.beginPath();prevBg.moveTo(LP+INFO_W,y);prevBg.lineTo(W,y);prevBg.strokePath();}
    this._reg('powers',prevBg);
    this._reg('powers',this.add.rectangle(LP+INFO_W,H/2,1,H-72,0x332200,0.5).setOrigin(0.5));
    this._reg('powers',this.add.text(PREV_X,52,'PREVIEW',{fontFamily:mono,fontSize:'9px',color:'#443300',letterSpacing:3}).setOrigin(0.5));

    this._powersPreviewName=this.add.text(PREV_X,H-55,'',{fontFamily:orb,fontSize:'11px',fontStyle:'900',color:'#00ff66',letterSpacing:3}).setOrigin(0.5).setDepth(5);
    this._reg('powers',this._powersPreviewName);

    const buyBtnBg=this.add.rectangle(PREV_X,H-25,220,30,0x001100,0.97).setStrokeStyle(2,0x00ff66,0.8).setDepth(5).setInteractive({useHandCursor:true});
    this._powersBuyBg=buyBtnBg;
    this._powersBuyBtn=this.add.text(PREV_X,H-25,'[ EQUIP ]',{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:'#00ff66'}).setOrigin(0.5).setDepth(6);
    this._reg('powers',buyBtnBg);
    this._reg('powers',this._powersBuyBtn);
    buyBtnBg.on('pointerover',()=>{buyBtnBg.setFillStyle(0x00ff66,0.15);this._powersBuyBtn.setColor('#ffffff');});
    buyBtnBg.on('pointerout', ()=>{buyBtnBg.setFillStyle(0x001100,0.97);this._powersBuyBtn.setColor(this._powersBuyCol||'#00ff66');});
    buyBtnBg.on('pointerdown',()=>{
      const p=ALL_POWERS[this._powersIndex];
      const owned=p.cost===0||Save.meta('power_'+p.id,false);
      const equipped=Save.get('equipped_power','ping')===p.id;
      if(!owned){
        if(Save.spendShards(p.cost)){
          Save.setMeta('power_'+p.id,true);
          Save.set('equipped_power',p.id);
          this._walletNum.setText(String(Save.shards()));
          this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
          this._msg(`${p.name} PURCHASED & EQUIPPED`);
          this.time.delayedCall(600,()=>this._switchTab('powers'));
        } else this._msg(`NEED ${p.cost} ◈`);
      } else if(!equipped){
        Save.set('equipped_power',p.id);
        this._msg(`${p.name} EQUIPPED`);
        this.time.delayedCall(400,()=>this._switchTab('powers'));
      }
    });

    this._powersGfx=this.add.graphics().setDepth(4);
    this._reg('powers',this._powersGfx);
    this._powersPrevX=PREV_X;
    this._powersPrevY=PREV_Y;

    this._refreshPowersSelection();
  }

  _refreshPowersSelection(){
    const META=this._powersMeta;
    if(!META)return;
    const p=META[this._powersIndex];
    const owned=p.cost===0||Save.meta('power_'+p.id,false);
    const equipped=Save.get('equipped_power','ping')===p.id;
    META.forEach((item,i)=>{
      const active=i===this._powersIndex;
      const eq=Save.get('equipped_power','ping')===item.id;
      if(item._rowBg) item._rowBg.setFillStyle(active?item.colN:(eq?item.colN:0x050200),active?0.18:(eq?0.10:0.97));
      if(item._rowBg) item._rowBg.setStrokeStyle(active?2:(eq?1:0),item.colN,active?0.9:(eq?0.6:0));
      if(item._selBar)item._selBar.setAlpha(active?1:(eq?0.5:0));
    });
    if(this._powersPreviewName)this._powersPreviewName.setText(p.name).setColor(p.col);
    const btnLabel=equipped?'[ EQUIPPED ]':owned?`[ EQUIP ]`:`[ BUY  ◈ ${p.cost} ]`;
    const btnCol=equipped?'#224433':owned?p.col:'#ffdd00';
    this._powersBuyCol=btnCol;
    if(this._powersBuyBtn)this._powersBuyBtn.setText(btnLabel).setColor(btnCol);
    if(this._powersBuyBg) this._powersBuyBg.setStrokeStyle(2,p.colN,equipped?0.2:0.8).setInteractive({useHandCursor:!equipped});
  }

  _drawPowersAnim(g,t,anim,cx,cy){
    const drawHex=(x,y,r,col,a,rot2=0)=>{
      g.lineStyle(1.5,col,a);g.beginPath();
      for(let s=0;s<6;s++){const ang=rot2+(Math.PI/3)*s;s===0?g.moveTo(x+Math.cos(ang)*r,y+Math.sin(ang)*r):g.lineTo(x+Math.cos(ang)*r,y+Math.sin(ang)*r);}
      g.closePath();g.strokePath();
    };
    const drawPlayer=(x,y,col=0x00cc66,a=1)=>{
      g.fillStyle(col,0.1*a);g.fillCircle(x,y,24);
      g.fillStyle(col,0.85*a);g.beginPath();
      for(let s=0;s<6;s++){const ang=(Math.PI/3)*s+t*0.8;s===0?g.moveTo(x+Math.cos(ang)*12,y+Math.sin(ang)*12):g.lineTo(x+Math.cos(ang)*12,y+Math.sin(ang)*12);}
      g.closePath();g.fillPath();
      g.fillStyle(0xffffff,0.8*a);g.fillCircle(x,y,3);
    };
    const drawEnemy=(x,y,col=0xff4444,a=1,frozen=false)=>{
      g.fillStyle(col,0.8*a);g.beginPath();
      for(let s=0;s<3;s++){const ang=(Math.PI*2/3)*s+t*(frozen?0:1.2);s===0?g.moveTo(x+Math.cos(ang)*12,y+Math.sin(ang)*12):g.lineTo(x+Math.cos(ang)*12,y+Math.sin(ang)*12);}
      g.closePath();g.fillPath();
      if(frozen){g.lineStyle(1,0x88ddff,0.6*a);g.strokeCircle(x,y,14);}
    };

    if(anim==='ping'){
      // Hex rings expand from player, bullets reverse
      const cycle=t%3.0;
      drawPlayer(cx,cy);
      // Expanding rings
      for(let r=0;r<3;r++){
        const ringT=(cycle+r*0.4)%3.0;
        const ringR=ringT*90;
        const ringA=Math.max(0,1-ringT/2.0)*0.7;
        if(ringA>0)drawHex(cx,cy,ringR,0x00ff66,ringA,t*0.1);
      }
      // Bullet reversing
      const bPhase=cycle/3.0;
      const bx=cycle<1.5?cx-100+bPhase*160:cx+60-(bPhase-0.5)*160;
      const bCol=cycle<1.5?0xff4444:0x00ffcc;
      g.fillStyle(bCol,0.9);g.fillCircle(bx,cy,5);
      g.lineStyle(1,bCol,0.4);
      if(cycle<1.5){g.beginPath();g.moveTo(bx-15,cy);g.lineTo(bx,cy);g.strokePath();}
      else{g.beginPath();g.moveTo(bx,cy);g.lineTo(bx+15,cy);g.strokePath();}

    } else if(anim==='emp'){
      // Lightning flash, enemies freeze
      const cycle=t%3.5;
      const enemies=[{x:cx-80,y:cy-40},{x:cx+70,y:cy+30},{x:cx-50,y:cy+60},{x:cx+60,y:cy-55}];
      drawPlayer(cx,cy);
      if(cycle<0.4){
        // EMP burst
        const f=cycle/0.4;
        g.fillStyle(0xffffff,f*0.3);g.fillCircle(cx,cy,f*120);
        for(let r=0;r<4;r++){g.lineStyle(2,0xffffff,(1-f)*0.8);g.strokeCircle(cx,cy,r*30*f);}
      }
      const frozen=cycle>0.4;
      enemies.forEach(e=>{drawEnemy(e.x,e.y,0xff4444,1,frozen);});
      if(frozen&&cycle<3.0){
        const remT=Math.max(0,(3.0-(cycle-0.4))/3.0);
        const pulse=0.3+0.3*Math.sin(t*4);
        enemies.forEach(e=>{
          g.lineStyle(1,0x88ddff,pulse);g.strokeCircle(e.x,e.y,16+Math.sin(t*3)*2);
          g.fillStyle(0x88ddff,0.15*remT);g.fillCircle(e.x,e.y,16);
        });
      }

    } else if(anim==='null'){
      // Void zone deletes bullets
      const cycle=t%4.0;
      const zoneR=55;
      const pulse=0.5+0.5*Math.sin(t*3);
      // Void zone
      g.fillStyle(0x220033,0.7);g.fillCircle(cx+40,cy,zoneR);
      g.lineStyle(2,0xaa00ff,pulse);g.strokeCircle(cx+40,cy,zoneR);
      // Inner void
      g.fillStyle(0x000000,0.5);g.fillCircle(cx+40,cy,zoneR-8);
      // Rotating delete lines inside
      for(let r=0;r<4;r++){
        const a=t*1.5+(Math.PI/2)*r;
        g.lineStyle(1,0xaa00ff,0.3);
        g.beginPath();g.moveTo(cx+40,cy);g.lineTo(cx+40+Math.cos(a)*(zoneR-10),cy+Math.sin(a)*(zoneR-10));g.strokePath();
      }
      drawPlayer(cx-60,cy);
      // Bullets entering and disappearing
      const bPhase=(cycle%2.0)/2.0;
      const bx2=cx-40+bPhase*120;
      if(bx2<cx+40-zoneR+10){
        g.fillStyle(0xff4444,0.9);g.fillCircle(bx2,cy,5);
      } else if(bx2<cx+40+zoneR-10){
        const dissolve=1-((bx2-(cx+40-zoneR+10))/(zoneR*2-20));
        g.fillStyle(0xff4444,dissolve*0.8);g.fillCircle(bx2,cy,5*dissolve);
        g.fillStyle(0xaa00ff,0.3*(1-dissolve));g.fillCircle(bx2,cy,8*(1-dissolve));
      }

    } else if(anim==='surge'){
      // Bubble expands fast, gold, zero heat
      const cycle=t%2.5;
      const R=cycle<1.5?cycle/1.5*85:85;
      const rot2=t*0.3;
      const pulse=0.5+0.5*Math.sin(t*5);
      const col=0xffd700;
      // Outer fill
      g.fillStyle(col,0.05);g.beginPath();
      for(let s=0;s<6;s++){const a=rot2+(Math.PI/3)*s;s===0?g.moveTo(cx+Math.cos(a)*(R+12),cy+Math.sin(a)*(R+12)):g.lineTo(cx+Math.cos(a)*(R+12),cy+Math.sin(a)*(R+12));}
      g.closePath();g.fillPath();
      // Main hex
      g.lineStyle(2,col,0.9);g.beginPath();
      for(let s=0;s<6;s++){const a=rot2+(Math.PI/3)*s;s===0?g.moveTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R):g.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);}
      g.closePath();g.strokePath();
      // Spinning dots
      for(let s=0;s<6;s++){const a=t*2+(Math.PI/3)*s;g.fillStyle(col,0.85);g.fillCircle(cx+Math.cos(a)*R,cy+Math.sin(a)*R,3);}
      // Heat bar — EMPTY
      const bx=cx+80,barH=100;
      g.fillStyle(0x1a0000,0.8);g.fillRect(bx,cy-barH/2,16,barH);
      g.lineStyle(1,0x00ff88,0.5);g.strokeRect(bx,cy-barH/2,16,barH);
      // Zero heat indicator
      g.lineStyle(2,0x00ff88,pulse);g.beginPath();g.moveTo(bx-6,cy+barH/2-4);g.lineTo(bx+22,cy+barH/2-4);g.strokePath();
      drawPlayer(cx,cy,col);

    } else if(anim==='chain'){
      // All reflected bullets detonate simultaneously
      const cycle=t%3.0;
      drawPlayer(cx-80,cy);
      // Multiple reflected bullets orbiting
      const bullets=[
        {a:0.3, r:60},{a:1.1, r:80},{a:2.0, r:55},{a:2.8, r:75},
      ];
      if(cycle<1.2){
        bullets.forEach(b=>{
          const bx2=cx-80+Math.cos(b.a+t*0.5)*b.r;
          const by2=cy+Math.sin(b.a+t*0.5)*b.r*0.5;
          g.fillStyle(0x00ffcc,0.8);g.fillCircle(bx2,by2,5);
          g.lineStyle(1,0x00ffcc,0.3);g.strokeCircle(cx-80,cy,b.r);
        });
      } else {
        // DETONATE
        const f=(cycle-1.2)/1.8;
        bullets.forEach(b=>{
          const bx2=cx-80+Math.cos(b.a+t*0.5)*b.r;
          const by2=cy+Math.sin(b.a+t*0.5)*b.r*0.5;
          const ef=Math.min(1,f*2);
          g.lineStyle(2,0xff6600,(1-ef)*0.9);g.strokeCircle(bx2,by2,ef*30);
          g.lineStyle(1,0xffdd00,(1-ef)*0.6);g.strokeCircle(bx2,by2,ef*50);
        });
        // Chain cascade
        if(f>0.2){
          const cf=(f-0.2)/0.8;
          for(let c=0;c<3;c++){
            const ex=cx+20+c*40,ey=cy-20+Math.sin(c)*30;
            const ef2=Math.min(1,cf*3-c*0.5);
            if(ef2>0){
              g.lineStyle(1.5,0xff4444,(1-ef2)*0.8);g.strokeCircle(ex,ey,ef2*25);
            }
          }
        }
      }

    } else if(anim==='ghost'){
      // Enemies wander randomly
      const cycle=t%4.0;
      const enemies2=[{x:cx-60,y:cy-40,ox:cx-60,oy:cy-40},{x:cx+50,y:cy+30,ox:cx+50,oy:cy+30},{x:cx-20,y:cy+60,ox:cx-20,oy:cy+60}];
      drawPlayer(cx+60,cy);
      // Player targeting lines — before
      if(cycle<1.0){
        const f=cycle/1.0;
        enemies2.forEach(e=>{
          g.lineStyle(1,0xff4444,0.3*(1-f));
          g.beginPath();g.moveTo(e.x,e.y);g.lineTo(cx+60,cy);g.strokePath();
        });
      }
      // After activation — wander
      if(cycle>1.0){
        const wt=cycle-1.0;
        enemies2.forEach((e,i)=>{
          const wx=e.ox+Math.sin(wt*1.2+i*2.1)*50;
          const wy=e.oy+Math.cos(wt*0.8+i*1.7)*30;
          drawEnemy(wx,wy,0xaaaaff);
          // Dashed wander path
          g.lineStyle(1,0xaaaaff,0.2);
          g.beginPath();g.moveTo(e.ox,e.oy);g.lineTo(wx,wy);g.strokePath();
          // Confused indicator
          const pulse2=0.4+0.4*Math.sin(t*5+i);
          g.lineStyle(1,0xaaaaff,pulse2*0.5);g.strokeCircle(wx,wy,18);
        });
        // Ghost step aura on player
        const ghostA=0.2+0.15*Math.sin(t*4);
        g.lineStyle(1.5,0xaaaaff,ghostA);
        for(let r=0;r<3;r++){g.strokeCircle(cx+60,cy,28+r*10);}
      } else {
        enemies2.forEach(e=>drawEnemy(e.x,e.y));
      }

    } else if(anim==='corrupt'){
      // Green pulse radiates, enemies get corruption counters
      const cycle=t%3.0;
      drawPlayer(cx,cy,0x00ff44);
      const enemies3=[{x:cx-80,y:cy-30},{x:cx+70,y:cy+40},{x:cx+30,y:cy-60}];
      enemies3.forEach(e=>drawEnemy(e.x,e.y));
      // Corruption wave
      if(cycle<1.5){
        const wR=(cycle/1.5)*130;
        const wA=1-cycle/1.5;
        g.lineStyle(2,0x00ff44,wA*0.8);g.strokeCircle(cx,cy,wR);
        g.fillStyle(0x00ff44,wA*0.05);g.fillCircle(cx,cy,wR);
      }
      // Corruption counters on enemies
      if(cycle>0.6){
        const cf=Math.min(1,(cycle-0.6)/0.6);
        enemies3.forEach((e,i)=>{
          const dist=Math.hypot(e.x-cx,e.y-cy);
          if(dist<130){
            const dots=Math.floor(cf*2);
            for(let d=0;d<dots;d++){
              const da=t+(Math.PI*2/3)*d;
              g.fillStyle(0x00ff44,0.9);g.fillCircle(e.x+Math.cos(da)*16,e.y+Math.sin(da)*16,4);
            }
            g.lineStyle(1,0x00ff44,cf*0.5);g.strokeCircle(e.x,e.y,16);
          }
        });
      }

    } else if(anim==='restore'){
      // Heat clears, shield restores, surge refills
      const cycle=t%4.5;
      // Three panels side by side
      const panels=[
        {label:'HEAT',  x:cx-90, col:0xff4400},
        {label:'SHIELD',x:cx,    col:0x00aaff},
        {label:'SURGE', x:cx+90, col:0xff6600},
      ];
      panels.forEach((pan,pi)=>{
        const barH=80;
        // Before
        let fillBefore,fillAfter;
        if(pi===0){fillBefore=1.0;fillAfter=0.0;}       // heat: full -> empty
        else if(pi===1){fillBefore=0.0;fillAfter=1.0;}  // shield: broken -> full
        else{fillBefore=0.2;fillAfter=0.5;}              // surge: low -> 50%

        const restoreT=0.5+pi*0.3;
        const fill=cycle<restoreT?fillBefore:cycle<restoreT+0.5?fillBefore+(fillAfter-fillBefore)*((cycle-restoreT)/0.5):fillAfter;

        g.fillStyle(0x0a0800,0.8);g.fillRect(pan.x-8,cy-barH/2,16,barH);
        g.lineStyle(1,pan.col,0.4);g.strokeRect(pan.x-8,cy-barH/2,16,barH);
        if(fill>0){g.fillStyle(pan.col,0.85);g.fillRect(pan.x-6,cy-barH/2+barH*(1-fill)+2,12,barH*fill-4);}

        // Restore pulse
        if(cycle>restoreT&&cycle<restoreT+0.6){
          const pf=(cycle-restoreT)/0.6;
          g.lineStyle(2,pan.col,(1-pf)*0.8);g.strokeCircle(pan.x,cy,20+pf*30);
        }

        // Label
        g.fillStyle(pan.col,0.3);g.fillRect(pan.x-10,cy+barH/2+6,20,10);
        g.fillStyle(0x000000,1);g.fillRect(pan.x-8,cy+barH/2+8,16,6);
        g.fillStyle(pan.col,0.6);g.fillRect(pan.x-6,cy+barH/2+9,12*(pi===0?1-fill:fill),4);
      });
      // Restore icon in center
      if(cycle>0.5&&cycle<2.5){
        const pulse3=0.5+0.5*Math.sin(t*5);
        g.lineStyle(2,0x00ffcc,pulse3*0.7);g.strokeCircle(cx,cy,45);
      }

    } else if(anim==='decoy'){
      // Decoy drops, enemies redirect
      const cycle=t%4.0;
      drawPlayer(cx-60,cy+20);
      // Decoy node
      const decoyA=cycle>0.5?Math.min(1,(cycle-0.5)/0.4):0;
      if(decoyA>0){
        const dcx=cx+40,dcy=cy-20;
        g.fillStyle(0xff8800,0.15*decoyA);g.fillCircle(dcx,dcy,24);
        g.lineStyle(2,0xff8800,decoyA*(0.6+0.3*Math.sin(t*4)));
        g.beginPath();
        for(let s=0;s<6;s++){const a=t*0.5+(Math.PI/3)*s;s===0?g.moveTo(dcx+Math.cos(a)*18,dcy+Math.sin(a)*18):g.lineTo(dcx+Math.cos(a)*18,dcy+Math.sin(a)*18);}
        g.closePath();g.strokePath();
        g.fillStyle(0xff8800,decoyA*0.8);g.fillCircle(dcx,dcy,4);

        // Enemies targeting decoy
        const enemies4=[{x:cx+90,y:cy-50},{x:cx-30,y:cy-70},{x:cx+80,y:cy+50}];
        enemies4.forEach(e=>{
          drawEnemy(e.x,e.y);
          if(decoyA>0.5){
            g.lineStyle(1,0xff8800,0.4*decoyA);
            g.beginPath();g.moveTo(e.x,e.y);g.lineTo(dcx,dcy);g.strokePath();
          } else {
            // Redirecting
            const rf=decoyA/0.5;
            g.lineStyle(1,0xff4444,0.3*(1-rf));g.beginPath();g.moveTo(e.x,e.y);g.lineTo(cx-60,cy+20);g.strokePath();
            g.lineStyle(1,0xff8800,0.4*rf);g.beginPath();g.moveTo(e.x,e.y);g.lineTo(dcx,dcy);g.strokePath();
          }
        });
      } else {
        // Before decoy — enemies target player
        [{x:cx+90,y:cy-50},{x:cx-30,y:cy-70},{x:cx+80,y:cy+50}].forEach(e=>{
          drawEnemy(e.x,e.y);
          g.lineStyle(1,0xff4444,0.3);g.beginPath();g.moveTo(e.x,e.y);g.lineTo(cx-60,cy+20);g.strokePath();
        });
      }
    }
  }
  update(_, delta) {
    this.t += delta / 1000;

    // Update scrollbar thumbs
    ['bubble', 'survival', 'combat'].forEach(tab => {
      (this._tabObjs[tab] || []).forEach(o => {
        if (o && o._sbThumb && o._maxScroll > 0) {
          const frac = o._scrollY / o._maxScroll;
          const range = o._sbViewH - o._sbThumbH;
          o._sbThumb.y = o._sbTrackTop + o._sbThumbH / 2 + frac * range;
        }
      });
    });

    // Animate powers preview
    if (this._tab === 'powers' && this._powersGfx && this._powersMeta) {
      this._powersAnimT += delta / 1000;
      const p = this._powersMeta[this._powersIndex];
      const g = this._powersGfx;
      g.clear();
      this._drawPowersAnim(g, this._powersAnimT, p.anim, this._powersPrevX, this._powersPrevY);
    }

    // Animate combat preview
    if (this._tab === 'combat' && this._combatGfx && this._combatMeta) {
      this._combatAnimT += delta / 1000;
      const m = this._combatMeta[this._combatIndex];
      const g = this._combatGfx;
      g.clear();
      this._drawCombatAnim(g, this._combatAnimT, m.anim, this._combatPrevX, this._combatPrevY);
    }

    // Animate survival preview
    if (this._tab === 'survival' && this._survivalGfx && this._survivalMeta) {
      this._survivalAnimT += delta / 1000;
      const m = this._survivalMeta[this._survivalIndex];
      const g = this._survivalGfx;
      g.clear();
      this._drawSurvivalAnim(g, this._survivalAnimT, m.anim, this._survivalPrevX, this._survivalPrevY);
    }

    // Animate carousel-grid cards (when flag is on) — uses per-card Graphics
    if (this._gridCards && this._gridCards[this._tab] && this._gridConfig && this._gridConfig[this._tab]) {
      const cfg = this._gridConfig[this._tab];
      const dt = delta / 1000;
      this._gridCards[this._tab].forEach(card => {
        card.animT += dt;
        if (card.gfx && cfg.animFn) {
          card.gfx.clear();
          cfg.animFn(card.gfx, card.animT, card.item.anim);
        }
      });
    }

    // Animate bubble preview (legacy list — only when flag off)
    if (this._tab === 'bubble' && this._bubbleGfx && this._bubbleMeta) {
      this._bubbleAnimT += delta / 1000;
      const m = this._bubbleMeta[this._bubbleIndex];
      const g = this._bubbleGfx;
      g.clear();
      this._drawBubbleAnim(g, this._bubbleAnimT, m.anim, this._bubblePrevX, this._bubblePrevY);
    }

    // Animate archetype carousel preview (when unify is active)
    if (this._tab === 'chassis' && this._archetypesGfx && this._archetypes) {
      this._archetypesAnimT += delta / 1000;
      const g = this._archetypesGfx;
      g.clear();
      this._drawArchetypePreview(g, this._archetypesAnimT);
      return; // skip the old chassis ship animation below
    }

    // Animate chassis preview
    if (this._tab !== 'chassis' || !this._previewGfx) return;
    const s = this._ships[this._chassisIndex];
    if (!s) return;

    const LP = 200;
    const PX = LP + (W - LP) / 2;
    const PY = 220;
    const rot = this.t * 0.8;
    const sc = s.color;
    const owned = Save.isOwned(s.id) || s.cost === 0;
    const alpha = owned ? 1.0 : 0.35;

    const g = this._previewGfx;
    g.clear();

    // Outer glow
    g.fillStyle(sc, (0.08 + 0.04 * Math.sin(this.t * 3)) * alpha);
    g.fillCircle(PX, PY, 60);

    try {
      if (s.id === 'ranger') {
        g.lineStyle(1, sc, 0.2 * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; k === 0 ? g.moveTo(PX + Math.cos(a) * 28, PY + Math.sin(a) * 28) : g.lineTo(PX + Math.cos(a) * 28, PY + Math.sin(a) * 28); }
        g.closePath(); g.strokePath();
        g.fillStyle(sc, 0.9 * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; k === 0 ? g.moveTo(PX + Math.cos(a) * 18, PY + Math.sin(a) * 18) : g.lineTo(PX + Math.cos(a) * 18, PY + Math.sin(a) * 18); }
        g.closePath(); g.fillPath();
        g.lineStyle(1, 0xffffff, 0.2 * alpha);
        for (let k = 0; k < 6; k++) { const a = this.t * -0.5 + (Math.PI / 3) * k; g.beginPath(); g.moveTo(PX, PY); g.lineTo(PX + Math.cos(a) * 11, PY + Math.sin(a) * 11); g.strokePath(); }

      } else if (s.id === 'phantom') {
        const h = 26, w = 13;
        g.fillStyle(sc, 0.85 * alpha);
        g.beginPath(); g.moveTo(PX, PY - h); g.lineTo(PX + w, PY); g.lineTo(PX, PY + h); g.lineTo(PX - w, PY); g.closePath(); g.fillPath();
        g.lineStyle(1.5, sc, 0.5 * alpha);
        g.beginPath(); g.moveTo(PX, PY - h); g.lineTo(PX + w, PY); g.lineTo(PX, PY + h); g.lineTo(PX - w, PY); g.closePath(); g.strokePath();
        const ir = this.t * -1.2;
        g.lineStyle(1, sc, 0.3 * alpha);
        g.beginPath(); g.moveTo(PX + Math.cos(ir) * 10, PY + Math.sin(ir) * 10); g.lineTo(PX + Math.cos(ir + Math.PI / 2) * 7, PY + Math.sin(ir + Math.PI / 2) * 7); g.lineTo(PX + Math.cos(ir + Math.PI) * 10, PY + Math.sin(ir + Math.PI) * 10); g.lineTo(PX + Math.cos(ir + Math.PI * 1.5) * 7, PY + Math.sin(ir + Math.PI * 1.5) * 7); g.closePath(); g.strokePath();

      } else if (s.id === 'inferno') {
        const sr = this.t * 2.2, r1 = 20, r2 = 10;
        g.fillStyle(sc, 0.9 * alpha);
        g.beginPath();
        for (let k = 0; k < 8; k++) { const a = sr + (Math.PI / 4) * k; const r = k % 2 === 0 ? r1 : r2; k === 0 ? g.moveTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r) : g.lineTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r); }
        g.closePath(); g.fillPath();
        g.lineStyle(1.5, 0xff4400, 0.4 * alpha); g.strokeCircle(PX, PY, 28);

      } else if (s.id === 'core') {
        g.lineStyle(3, sc, 0.8 * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; k === 0 ? g.moveTo(PX + Math.cos(a) * 24, PY + Math.sin(a) * 24) : g.lineTo(PX + Math.cos(a) * 24, PY + Math.sin(a) * 24); }
        g.closePath(); g.strokePath();
        g.fillStyle(sc, 0.7 * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot * -0.6 + (Math.PI / 3) * k; k === 0 ? g.moveTo(PX + Math.cos(a) * 13, PY + Math.sin(a) * 13) : g.lineTo(PX + Math.cos(a) * 13, PY + Math.sin(a) * 13); }
        g.closePath(); g.fillPath();
        g.lineStyle(1, sc, 0.35 * alpha);
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; g.beginPath(); g.moveTo(PX + Math.cos(a) * 13, PY + Math.sin(a) * 13); g.lineTo(PX + Math.cos(a) * 24, PY + Math.sin(a) * 24); g.strokePath(); }

      } else if (s.id === 'ghost') {
        const hash = (n) => ((n * 7 + Math.floor(this.t * 8) * 3) % 11) / 11;
        g.fillStyle(sc, (0.55 + 0.2 * Math.sin(this.t * 3)) * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; const jt = 1 + (hash(k) - 0.5) * 0.4; const r = 18 * jt; k === 0 ? g.moveTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r) : g.lineTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r); }
        g.closePath(); g.fillPath();
        g.lineStyle(1, sc, 0.6 * alpha);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = rot + (Math.PI / 3) * k; const jt = 1 + (hash(k + 6) - 0.5) * 0.4; const r = 18 * jt; k === 0 ? g.moveTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r) : g.lineTo(PX + Math.cos(a) * r, PY + Math.sin(a) * r); }
        g.closePath(); g.strokePath();
        g.lineStyle(1.5, sc, 0.25 * alpha); g.strokeCircle(PX, PY, 24);

      } else if (s.id === 'virus') {
        const sides = 7;
        g.fillStyle(sc, 0.85 * alpha);
        g.beginPath();
        for (let k = 0; k < sides; k++) { const a = rot + (Math.PI * 2 / sides) * k; const isG = k === 3; const r = isG ? 18 + Math.sin(this.t * 15) * 5 : 18; const go = isG ? (Math.random() - 0.5) * 4 : 0; k === 0 ? g.moveTo(PX + Math.cos(a) * r + go, PY + Math.sin(a) * r) : g.lineTo(PX + Math.cos(a) * r + go, PY + Math.sin(a) * r); }
        g.closePath(); g.fillPath();
        g.lineStyle(1, 0xff0000, 0.5 * alpha); g.beginPath(); g.moveTo(PX, PY); g.lineTo(PX + Math.cos(rot + 0.8) * 18, PY + Math.sin(rot + 0.8) * 18); g.strokePath();
        g.lineStyle(1, 0x00ff44, 0.4 * alpha); g.beginPath(); g.moveTo(PX, PY); g.lineTo(PX + Math.cos(rot + 2.9) * 15, PY + Math.sin(rot + 2.9) * 15); g.strokePath();
        const ip = 0.15 + 0.1 * Math.sin(this.t * 5); g.lineStyle(1, 0x00ff44, ip * alpha); g.strokeCircle(PX, PY, 26 + Math.sin(this.t * 3) * 3);
      }
    } catch (e) {}

    // Core dot
    const cp = 0.7 + 0.3 * Math.sin(this.t * 6);
    g.fillStyle(0xffffff, cp * alpha);
    g.fillCircle(PX, PY, 3);
  }

  _msg(t) {
    this._msgTxt.setText(`> ${t}`);
    this.time.delayedCall(2500, () => { try { this._msgTxt.setText(''); } catch {} });
  }

  _vfxPatchInstall(cx, cy, col) {
    try {
      const fl = this.add.rectangle(cx, cy, 100, 100, col, 0).setDepth(20);
      this.tweens.add({ targets: fl, alpha: 0.2, duration: 70, yoyo: true, repeat: 2, onComplete: () => fl.destroy() });
    } catch (e) {}
  }
}
