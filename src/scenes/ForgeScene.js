// ═══════════════════════════════════════════════════════════
// FORGESCENE — Custom archetype builder for SIGNAL_FORGE
// Player picks: passive (1 of 6 skin behaviors), power (1 of 9),
// icon glyph (1 of 16), color (1 of 10). First forge free,
// re-forge costs 50 shards. Unlocked by killing CORE.BREACH.
// ═══════════════════════════════════════════════════════════

class ForgeScene extends Phaser.Scene {
  constructor(){ super('ForgeScene'); }

  // Convert a 24-bit color int to "#rrggbb" string
  _hex(c){ return '#' + (c >>> 0).toString(16).padStart(6, '0'); }
  // Build a slightly desaturated muted variant for non-selected text
  _mute(c){
    const r=(c>>16)&0xff,g=(c>>8)&0xff,b=c&0xff;
    return ((Math.floor(r*0.6))<<16)|((Math.floor(g*0.6))<<8)|Math.floor(b*0.6);
  }

  create(d){
    try{ CRT.inGame=false; }catch(e){}
    this._data = d || {};
    this.cameras.main.setBackgroundColor('#020a04');
    this.cameras.main.fadeIn(280, 0, 0, 0);

    // Phaser reuses scene class instances across start/stop, so class fields
    // outlive the GameObjects they reference. Null them all so the `if(!x)`
    // guards in render methods recreate fresh objects on every re-entry.
    this._previewHex = null;
    this._previewGlyph = null;
    this._previewLabel = null;
    this._previewName = null;
    this._previewPassive = null;
    this._previewPower = null;
    this._themedPreviewLabel = null;
    this._themedPreviewName = null;
    this._themedDivider = null;
    this._themedHeaderLine = null;
    this._themedTitle = null;
    this._themedGridGfx = null;
    this._themedColLabels = [];
    this._themedCommitDivider = null;
    this._passiveCards = null;
    this._powerCards = null;
    this._iconCards = null;
    this._colorSwatches = null;
    this._commitBg = null;
    this._commitTxt = null;
    this._backBg = null;
    this._backTxt = null;
    this._costTxt = null;
    this._balanceTxt = null;

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // ── Sources ──
    this._PASSIVES = [
      { id:'ranger',  name:'ADAPTIVE',  desc:'Bubble speed +5% per wave (max +50%). Clean baseline.' },
      { id:'phantom', name:'PHANTOM',   desc:'Dash deploys a decoy. Enemies lock on the ghost for 2s.' },
      { id:'inferno', name:'INFERNO',   desc:'Rage state at 80%+ heat: reflect ×1.5. Burn risk.' },
      { id:'core',    name:'FORTRESS',  desc:'Bigger shield (start with 3 hits). Bubble DoT boost.' },
      { id:'ghost',   name:'GHOST',     desc:'Reflect echoes + damaging dash trail. Phase aggression.' },
      { id:'virus',   name:'VIRUS',     desc:'Infection spreads on kill. Defection chains the network.' },
    ];
    this._POWERS = [
      { id:'ping',            name:'PING',            desc:'Hex rings reverse nearby bullets. CD 15s.' },
      { id:'emp_burst',       name:'EMP_BURST',       desc:'Stuns ALL enemies 4s + freezes bullets. CD 22s.' },
      { id:'null_zone',       name:'NULL_ZONE',       desc:'Void node at cursor, deletes bullets 6s. CD 28s.' },
      { id:'overclock_surge', name:'OVERCLOCK_SURGE', desc:'Triple bubble speed, zero heat, 4s. CD 35s.' },
      { id:'chain_trigger',   name:'CHAIN_TRIGGER',   desc:'Detonate ALL reflected bullets. CD 18s.' },
      { id:'ghost_step',      name:'GHOST_STEP',      desc:'Enemies lose targeting for 3s. CD 26s.' },
      { id:'corrupt_wave',    name:'CORRUPT_WAVE',    desc:'+2 corruption to enemies in 300px. CD 38s.' },
      { id:'system_restore',  name:'SYSTEM_RESTORE',  desc:'Clear heat, regen shield. 1/wave.' },
      { id:'decoy_packet',    name:'DECOY_PACKET',    desc:'Drop decoy, enemies retarget 6s. CD 32s.' },
    ];
    this._ICONS = ['↩','☣','◌','⚡','⬡','✦','◈','◇','⬢','⬣','⌬','⎔','⏣','⌖','◆','✶'];
    // 10 colors — mirror the existing archetype palette so the player has familiar choices
    this._COLORS = [
      0xcc44ff, // default forge purple
      0x00ffcc, // reflector cyan
      0x00ff88, // corruptor green
      0x8888ff, // ghost blue
      0xff6600, // overclocker orange
      0xffdd00, // fortress yellow
      0xff4488, // storm pink
      0xff2266, // rogue red
      0xffffff, // white
      0xaaffdd, // mint
    ];

    // ── Initial draft = saved config (with sensible defaults) ──
    const savedCfg = (typeof Save.forgeConfig==='function') ? Save.forgeConfig() : null;
    this._initialCfg = savedCfg;
    this._draft = savedCfg
      ? { passive: savedCfg.passive, power: savedCfg.power, icon: savedCfg.icon, color: (savedCfg.color != null ? savedCfg.color : 0xcc44ff) }
      : { passive: 'ranger', power: 'ping', icon: '◆', color: 0xcc44ff };

    // ── Themed-object refs (populated by render methods, updated by _applyTheme) ──
    this._themedHeaderLine = null;
    this._themedTitle = null;
    this._themedDivider = null;
    this._themedGridGfx = null;
    this._themedColLabels = [];   // column headers
    this._themedPreviewLabel = null;
    this._themedPreviewName = null;

    // ── Background grid ──
    this._themedGridGfx = this.add.graphics();
    this._drawGrid();

    // ── Header ──
    this.add.rectangle(W/2, 0, W, 42, 0x000000, 0.97).setOrigin(0.5, 0);
    this._themedHeaderLine = this.add.rectangle(W/2, 42, W, 2, this._draft.color, 0.7).setOrigin(0.5, 0);
    this._themedTitle = this.add.text(W/2, 20, 'SIGNAL_FORGE.SH', {
      fontFamily: orb, fontSize:'20px', fontStyle:'900', color: this._hex(this._draft.color), letterSpacing: 6
    }).setOrigin(0.5);

    // ── Preview row ──
    this._renderPreview();

    // ── Color strip (below preview) ──
    this._renderColorRow();

    // ── Three columns (pushed down to accommodate color strip) ──
    this._renderPassiveColumn();
    this._renderPowerColumn();
    this._renderIconColumn();

    // ── Commit bar ──
    this._renderCommitBar();

    // ── ESC / BACK ──
    this.input.keyboard && this.input.keyboard.on('keydown-ESC', () => this._exit());
  }

  // ─────────────────────────────────────────────────────
  // Background grid — re-drawable on theme change
  // ─────────────────────────────────────────────────────
  _drawGrid(){
    const g = this._themedGridGfx;
    g.clear();
    g.lineStyle(1, this._draft.color, 0.06);
    g.beginPath();
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();
  }

  // ─────────────────────────────────────────────────────
  // Preview row (top): big hex with current icon + names
  // ─────────────────────────────────────────────────────
  _renderPreview(){
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const PY = 78;

    if(!this._previewHex) this._previewHex = this.add.graphics();
    this._drawPreviewHex(PY);

    // Icon glyph
    if(!this._previewGlyph){
      this._previewGlyph = this.add.text(120, PY, this._draft.icon, {
        fontFamily: mono, fontSize:'28px', fontStyle:'bold', color: this._hex(this._draft.color), stroke:'#000', strokeThickness:2
      }).setOrigin(0.5);
    } else {
      this._previewGlyph.setText(this._draft.icon).setColor(this._hex(this._draft.color));
    }

    if(!this._previewLabel){
      this._themedPreviewLabel = this.add.text(170, PY-22, 'CURRENT BUILD', {
        fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), letterSpacing:3
      });
      this._previewLabel = this._themedPreviewLabel;
      this._themedPreviewName = this.add.text(170, PY-6, 'SIGNAL_FORGE', {
        fontFamily: orb, fontSize:'14px', fontStyle:'900', color: this._hex(this._draft.color), letterSpacing:2
      });
      this._previewName = this._themedPreviewName;
      this._previewPassive = this.add.text(170, PY+14, '', {
        fontFamily: mono, fontSize:'11px', color: this._hex(this._mute(this._draft.color))
      });
      this._previewPower = this.add.text(170, PY+30, '', {
        fontFamily: mono, fontSize:'11px', color: this._hex(this._mute(this._draft.color))
      });
    }
    const pass = this._PASSIVES.find(p=>p.id===this._draft.passive);
    const pow  = this._POWERS.find(p=>p.id===this._draft.power);
    this._previewPassive.setText('PASSIVE: ' + (pass?pass.name:'—'));
    this._previewPower.setText('POWER:   ' + (pow?pow.name:'—'));

    if(!this._themedDivider){
      this._themedDivider = this.add.rectangle(W/2, 120, W-40, 1, this._draft.color, 0.6).setOrigin(0.5);
    }
  }

  _drawPreviewHex(PY){
    const hex = this._previewHex;
    hex.clear();
    const hx = 120, hy = PY, hr = 30, col = this._draft.color;
    hex.lineStyle(2, col, 0.95);
    hex.beginPath();
    for(let s=0;s<6;s++){
      const a = (Math.PI/3)*s + Math.PI/6;
      const x = hx + Math.cos(a)*hr, y = hy + Math.sin(a)*hr;
      if(s===0) hex.moveTo(x,y); else hex.lineTo(x,y);
    }
    hex.closePath(); hex.strokePath();
    hex.fillStyle(col, 0.2);
    hex.beginPath();
    for(let s=0;s<6;s++){
      const a = (Math.PI/3)*s + Math.PI/6;
      const x = hx + Math.cos(a)*(hr-2), y = hy + Math.sin(a)*(hr-2);
      if(s===0) hex.moveTo(x,y); else hex.lineTo(x,y);
    }
    hex.closePath(); hex.fillPath();
  }

  // ─────────────────────────────────────────────────────
  // Color row — horizontal strip of color swatches below preview
  // ─────────────────────────────────────────────────────
  _renderColorRow(){
    const mono = "'Courier New',monospace";
    const LABEL = this.add.text(20, 132, '// COLOR', { fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), letterSpacing:3 });
    this._themedColLabels.push(LABEL);

    const SW = 36; // swatch size
    const GAP = 8;
    const ROW_W = this._COLORS.length * SW + (this._COLORS.length-1) * GAP;
    const ROW_X = W/2 - ROW_W/2;
    const ROW_Y = 148;

    this._colorSwatches = {};
    this._COLORS.forEach((col, i) => {
      const cx = ROW_X + i * (SW + GAP);
      const swatch = this.add.rectangle(cx, ROW_Y, SW, SW, col, 0.9).setOrigin(0, 0)
        .setStrokeStyle(1, 0x000000, 0.6).setInteractive({useHandCursor:true});
      this._colorSwatches[col] = { swatch };
      swatch.on('pointerover', () => { if(this._draft.color !== col){ swatch.setStrokeStyle(2, 0xffffff, 0.7);} });
      swatch.on('pointerout',  () => { if(this._draft.color !== col){ swatch.setStrokeStyle(1, 0x000000, 0.6);} });
      swatch.on('pointerdown', () => this._setDraft('color', col));
    });
    this._refreshColorSelection();
  }

  _refreshColorSelection(){
    Object.entries(this._colorSwatches).forEach(([k, c]) => {
      const col = Number(k);
      const sel = col === this._draft.color;
      c.swatch.setStrokeStyle(sel ? 3 : 1, sel ? 0xffffff : 0x000000, sel ? 1 : 0.6);
      c.swatch.setScale(sel ? 1.12 : 1);
    });
  }

  // ─────────────────────────────────────────────────────
  // Column 1: PASSIVE
  // ─────────────────────────────────────────────────────
  _renderPassiveColumn(){
    const mono = "'Courier New',monospace";
    const COL_X = 20, COL_W = 400;
    const HEADER = this.add.text(COL_X, 198, '// PASSIVE', { fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), letterSpacing:3 });
    this._themedColLabels.push(HEADER);

    this._passiveCards = {};
    this._PASSIVES.forEach((p, i) => {
      const y = 218 + i*64;
      const card = this.add.rectangle(COL_X, y, COL_W, 56, 0x020a04, 0.95).setOrigin(0,0)
        .setStrokeStyle(1, this._draft.color, 0.4).setInteractive({useHandCursor:true});
      const bar = this.add.rectangle(COL_X, y, 4, 56, this._draft.color, 0.6).setOrigin(0,0);
      const name = this.add.text(COL_X+16, y+8, p.name, {
        fontFamily: "'Orbitron',sans-serif", fontSize:'13px', fontStyle:'900', color: this._hex(this._draft.color)
      });
      const desc = this.add.text(COL_X+16, y+26, p.desc, {
        fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), wordWrap:{width: COL_W-30}
      });
      this._passiveCards[p.id] = { card, bar, name, desc };
      card.on('pointerover', () => { if(this._draft.passive !== p.id){ card.setFillStyle(this._draft.color, 0.10); card.setStrokeStyle(1, this._draft.color, 0.75);} });
      card.on('pointerout',  () => { if(this._draft.passive !== p.id){ card.setFillStyle(0x020a04, 0.95); card.setStrokeStyle(1, this._draft.color, 0.4);} });
      card.on('pointerdown', () => this._setDraft('passive', p.id));
    });
    this._refreshPassiveSelection();
  }

  _refreshPassiveSelection(){
    Object.entries(this._passiveCards).forEach(([id, c]) => {
      const sel = id === this._draft.passive;
      c.card.setFillStyle(sel ? this._draft.color : 0x020a04, sel ? 0.14 : 0.95);
      c.card.setStrokeStyle(sel ? 2 : 1, this._draft.color, sel ? 0.9 : 0.4);
      c.bar.setFillStyle(this._draft.color, 1);
      c.bar.setAlpha(sel ? 1 : 0.6);
      c.name.setColor(this._hex(this._draft.color));
      c.desc.setColor(this._hex(this._mute(this._draft.color)));
    });
  }

  // ─────────────────────────────────────────────────────
  // Column 2: POWER
  // ─────────────────────────────────────────────────────
  _renderPowerColumn(){
    const mono = "'Courier New',monospace";
    const COL_X = 440, COL_W = 400;
    const HEADER = this.add.text(COL_X, 198, '// POWER', { fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), letterSpacing:3 });
    this._themedColLabels.push(HEADER);

    this._powerCards = {};
    this._POWERS.forEach((p, i) => {
      const y = 218 + i*44;
      const card = this.add.rectangle(COL_X, y, COL_W, 40, 0x020a04, 0.95).setOrigin(0,0)
        .setStrokeStyle(1, this._draft.color, 0.4).setInteractive({useHandCursor:true});
      const bar = this.add.rectangle(COL_X, y, 4, 40, this._draft.color, 0.6).setOrigin(0,0);
      const name = this.add.text(COL_X+16, y+5, p.name, {
        fontFamily: "'Orbitron',sans-serif", fontSize:'12px', fontStyle:'900', color: this._hex(this._draft.color)
      });
      const desc = this.add.text(COL_X+16, y+21, p.desc, {
        fontFamily: mono, fontSize:'9px', color: this._hex(this._mute(this._draft.color)), wordWrap:{width: COL_W-30}
      });
      this._powerCards[p.id] = { card, bar, name, desc };
      card.on('pointerover', () => { if(this._draft.power !== p.id){ card.setFillStyle(this._draft.color, 0.10); card.setStrokeStyle(1, this._draft.color, 0.75);} });
      card.on('pointerout',  () => { if(this._draft.power !== p.id){ card.setFillStyle(0x020a04, 0.95); card.setStrokeStyle(1, this._draft.color, 0.4);} });
      card.on('pointerdown', () => this._setDraft('power', p.id));
    });
    this._refreshPowerSelection();
  }

  _refreshPowerSelection(){
    Object.entries(this._powerCards).forEach(([id, c]) => {
      const sel = id === this._draft.power;
      c.card.setFillStyle(sel ? this._draft.color : 0x020a04, sel ? 0.14 : 0.95);
      c.card.setStrokeStyle(sel ? 2 : 1, this._draft.color, sel ? 0.9 : 0.4);
      c.bar.setFillStyle(this._draft.color, 1);
      c.bar.setAlpha(sel ? 1 : 0.6);
      c.name.setColor(this._hex(this._draft.color));
      c.desc.setColor(this._hex(this._mute(this._draft.color)));
    });
  }

  // ─────────────────────────────────────────────────────
  // Column 3: ICON (16 glyphs, 4x4)
  // ─────────────────────────────────────────────────────
  _renderIconColumn(){
    const mono = "'Courier New',monospace";
    const COL_X = 860, COL_W = 400;
    const HEADER = this.add.text(COL_X, 198, '// ICON', { fontFamily: mono, fontSize:'10px', color: this._hex(this._mute(this._draft.color)), letterSpacing:3 });
    this._themedColLabels.push(HEADER);

    const CELL = 82;
    const GAP = 4;
    const GRID_W = 4*CELL + 3*GAP;
    const GRID_X = COL_X + (COL_W - GRID_W) / 2;
    const GRID_Y = 218;

    this._iconCards = {};
    this._ICONS.forEach((glyph, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const cx = GRID_X + col*(CELL+GAP);
      const cy = GRID_Y + row*(CELL+GAP);
      const card = this.add.rectangle(cx, cy, CELL, CELL, 0x020a04, 0.95).setOrigin(0,0)
        .setStrokeStyle(1, this._draft.color, 0.4).setInteractive({useHandCursor:true});
      const txt = this.add.text(cx + CELL/2, cy + CELL/2, glyph, {
        fontFamily: mono, fontSize:'30px', fontStyle:'bold', color: this._hex(this._draft.color)
      }).setOrigin(0.5);
      this._iconCards[glyph] = { card, txt };
      card.on('pointerover', () => { if(this._draft.icon !== glyph){ card.setFillStyle(this._draft.color, 0.10); card.setStrokeStyle(1, this._draft.color, 0.75);} });
      card.on('pointerout',  () => { if(this._draft.icon !== glyph){ card.setFillStyle(0x020a04, 0.95); card.setStrokeStyle(1, this._draft.color, 0.4);} });
      card.on('pointerdown', () => this._setDraft('icon', glyph));
    });
    this._refreshIconSelection();
  }

  _refreshIconSelection(){
    Object.entries(this._iconCards).forEach(([glyph, c]) => {
      const sel = glyph === this._draft.icon;
      c.card.setFillStyle(sel ? this._draft.color : 0x020a04, sel ? 0.18 : 0.95);
      c.card.setStrokeStyle(sel ? 2 : 1, this._draft.color, sel ? 0.9 : 0.4);
      c.txt.setColor(this._hex(this._draft.color));
    });
  }

  // ─────────────────────────────────────────────────────
  // Commit bar — COMMIT + BACK + balance/cost
  // ─────────────────────────────────────────────────────
  _renderCommitBar(){
    const mono = "'Courier New',monospace";
    const Y_BAR = H - 50;
    this._themedCommitDivider = this.add.rectangle(W/2, Y_BAR-22, W-40, 1, this._draft.color, 0.6).setOrigin(0.5);

    // BACK button — sized to match COMMIT (280×40) and same purple aesthetic
    this._backBg = this.add.rectangle(W/2 - 320, Y_BAR, 280, 40, 0x000000, 0.95).setStrokeStyle(2, this._draft.color, 0.85).setInteractive({useHandCursor:true});
    this._backTxt = this.add.text(W/2 - 320, Y_BAR, '[ ← BACK ]', {
      fontFamily: mono, fontSize:'13px', fontStyle:'bold', color: this._hex(this._draft.color)
    }).setOrigin(0.5);
    this._backBg.on('pointerover', () => this._backBg.setFillStyle(this._draft.color, 0.14));
    this._backBg.on('pointerout',  () => this._backBg.setFillStyle(0x000000, 0.95));
    this._backBg.on('pointerdown', () => { try { Snd.play('powerup'); } catch {} this._exit(); });

    // COMMIT button (center)
    this._commitBg = this.add.rectangle(W/2, Y_BAR, 280, 40, 0x000000, 0.95).setStrokeStyle(2, this._draft.color, 0.85).setInteractive({useHandCursor:true});
    this._commitTxt = this.add.text(W/2, Y_BAR, '[ ⚙ COMMIT FORGE ]', {
      fontFamily: mono, fontSize:'13px', fontStyle:'bold', color: this._hex(this._draft.color)
    }).setOrigin(0.5);
    this._commitBg.on('pointerover', () => { if(this._commitEnabled) this._commitBg.setFillStyle(this._draft.color, 0.14); });
    this._commitBg.on('pointerout',  () => this._commitBg.setFillStyle(0x000000, 0.95));
    this._commitBg.on('pointerdown', () => this._commit());

    // Cost label (between COMMIT and the right side)
    this._costTxt = this.add.text(W/2 + 180, Y_BAR - 8, '', {
      fontFamily: mono, fontSize:'12px', fontStyle:'bold', color: this._hex(this._draft.color)
    }).setOrigin(0, 0.5);
    // Balance label
    this._balanceTxt = this.add.text(W/2 + 180, Y_BAR + 8, '', {
      fontFamily: mono, fontSize:'11px', color:'#aaaa44'
    }).setOrigin(0, 0.5);

    this._refreshCommitBar();
  }

  // Computes which class of change is dirty + the corresponding cost.
  // First forge → free. Re-forge: cosmetic-only (icon/color) = 50, mechanical (passive/power) = 300.
  _resolveCost(){
    const usedForge = (typeof Save.forgeUsed === 'function') && Save.forgeUsed();
    const cfg = this._initialCfg;
    if(!cfg){
      return { tier: 'first', cost: 0, dirty: true, mech: false, cosm: false };
    }
    const passiveChanged = cfg.passive !== this._draft.passive;
    const powerChanged   = cfg.power   !== this._draft.power;
    const iconChanged    = cfg.icon    !== this._draft.icon;
    const colorChanged   = (cfg.color != null ? cfg.color : 0xcc44ff) !== this._draft.color;
    const mech = passiveChanged || powerChanged;
    const cosm = iconChanged || colorChanged;
    if(mech) return { tier: 'mechanical', cost: 300, dirty: true, mech: true, cosm };
    if(cosm) return { tier: 'cosmetic',   cost: 50,  dirty: true, mech: false, cosm: true };
    return { tier: 'none', cost: 0, dirty: false, mech: false, cosm: false };
  }

  _refreshCommitBar(){
    const balance = Save.shards();
    const res = this._resolveCost();
    this._currentCost = res.cost; // captured for _commit()
    const canAfford = balance >= res.cost;

    this._balanceTxt.setText(`BALANCE: ${balance} ◈`);
    if(res.tier === 'first'){
      this._costTxt.setText('FORGE COST: FREE');
      this._costTxt.setColor('#aaffaa');
    } else if(res.tier === 'cosmetic'){
      this._costTxt.setText('RE-FORGE (cosmetic): 50 ◈');
      this._costTxt.setColor(canAfford ? this._hex(this._draft.color) : '#ff4444');
    } else if(res.tier === 'mechanical'){
      this._costTxt.setText('RE-FORGE (mechanical): 300 ◈');
      this._costTxt.setColor(canAfford ? this._hex(this._draft.color) : '#ff4444');
    } else {
      // 'none'
      this._costTxt.setText('NO CHANGES');
      this._costTxt.setColor('#664488');
    }

    this._commitEnabled = canAfford && res.dirty;
    if(!this._commitEnabled){
      if(!res.dirty){
        this._commitTxt.setText('[ NO CHANGES TO COMMIT ]').setColor('#664488');
        this._commitBg.setStrokeStyle(2, 0x664488, 0.6);
      } else {
        this._commitTxt.setText(`[ INSUFFICIENT SHARDS — ${res.cost} ◈ ]`).setColor('#ff4444');
        this._commitBg.setStrokeStyle(2, 0xff4444, 0.7);
      }
    } else {
      let label;
      if(res.tier === 'first')      label = '[ ⚙ COMMIT FORGE ]';
      else if(res.tier === 'cosmetic')   label = '[ ⚙ RE-FORGE (cosmetic) — 50 ◈ ]';
      else                          label = '[ ⚙ RE-FORGE (mechanical) — 300 ◈ ]';
      this._commitTxt.setText(label).setColor(this._hex(this._draft.color));
      this._commitBg.setStrokeStyle(2, this._draft.color, 0.85);
    }
  }

  // ─────────────────────────────────────────────────────
  // Apply theme: re-stroke / re-color every themed element
  // ─────────────────────────────────────────────────────
  _applyTheme(){
    const col = this._draft.color;
    const colStr = this._hex(col);
    const muteStr = this._hex(this._mute(col));

    // Background grid
    this._drawGrid();

    // Header line + title
    if(this._themedHeaderLine) this._themedHeaderLine.setFillStyle(col, 0.7);
    if(this._themedTitle) this._themedTitle.setColor(colStr);

    // Preview hex + glyph + labels
    this._drawPreviewHex(78);
    if(this._previewGlyph) this._previewGlyph.setColor(colStr);
    if(this._themedPreviewLabel) this._themedPreviewLabel.setColor(muteStr);
    if(this._themedPreviewName)  this._themedPreviewName.setColor(colStr);
    if(this._previewPassive) this._previewPassive.setColor(muteStr);
    if(this._previewPower)   this._previewPower.setColor(muteStr);

    // Divider beneath preview
    if(this._themedDivider) this._themedDivider.setFillStyle(col, 0.6);

    // Column header labels
    this._themedColLabels.forEach(t => t && t.setColor(muteStr));

    // Cards
    this._refreshPassiveSelection();
    this._refreshPowerSelection();
    this._refreshIconSelection();

    // Color swatch row (selected ring)
    this._refreshColorSelection();

    // Back button (always themed) + commit bar (themed when enabled, refresh handles it)
    if(this._backBg) this._backBg.setStrokeStyle(2, col, 0.85);
    if(this._backTxt) this._backTxt.setColor(colStr);
    if(this._themedCommitDivider) this._themedCommitDivider.setFillStyle(col, 0.6);
    this._refreshCommitBar();
  }

  // ─────────────────────────────────────────────────────
  // State setters
  // ─────────────────────────────────────────────────────
  _setDraft(key, value){
    if(this._draft[key] === value) return;
    this._draft[key] = value;
    if(key === 'passive') this._refreshPassiveSelection();
    if(key === 'power')   this._refreshPowerSelection();
    if(key === 'icon')    this._refreshIconSelection();
    if(key === 'color')   this._applyTheme();
    this._renderPreview(); // update preview row text + hex
    this._refreshCommitBar();
    try{ Snd.play('click'); }catch{}
  }

  _commit(){
    if(!this._commitEnabled) return;
    const cost = this._currentCost || 0;
    if(cost > 0){
      const ok = Save.spendShards(cost);
      if(!ok){ this._refreshCommitBar(); return; }
    }
    Save.setForgeConfig({ ...this._draft });
    Save.set('forge_used', true);
    try{ Save.setEquippedArchetype('signal_forge'); }catch{}
    try{ Snd.play('powerup'); }catch{}
    try{
      const fx = this.add.rectangle(W/2, H/2, W, H, this._draft.color, 0).setDepth(100);
      this.tweens.add({targets: fx, alpha:{from:0.22, to:0}, duration: 320, ease:'Power2', onComplete:()=>fx.destroy()});
    }catch{}
    this.time.delayedCall(180, () => this._exit());
  }

  _exit(){
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(220, () => {
      this.scene.stop('ForgeScene');
      if(this._data.from === 'menu'){
        const ms = this.scene.get('MenuScene');
        if(ms && ms.sys.isSleeping()) this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
        return;
      }
      const as = this.scene.get('ArchetypeSelectScene');
      if(as && as.sys.isSleeping()) this.scene.wake('ArchetypeSelectScene');
      else this.scene.start('ArchetypeSelectScene', this._data.returnPayload || {});
    });
  }
}
