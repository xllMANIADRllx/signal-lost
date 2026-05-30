// ═══════════════════════════════════════════════════════════
// METAUPGRADESCENE — Network Upgrades with animated previews
// ═══════════════════════════════════════════════════════════

class MetaUpgradeScene extends Phaser.Scene {
  constructor() { super('MetaUpgradeScene'); }

  create() {
    try { CRT.inGame = false; } catch (e) {}
    this.cameras.main.setBackgroundColor('#020c05');
    this.cameras.main.fadeIn(260, 0, 0, 0);
    try{Snd.init();Snd.startSceneMusic('network');}catch(e){}
    this.t = 0;

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // ── Layout ──
    const HDR_H  = 44;
    const FTR_H  = 56;
    const SB_W   = 310;
    const PREV_W = W - SB_W;
    const PREV_X = SB_W + PREV_W / 2;

    // ── Background ──
    const bg = this.add.graphics().setAlpha(0.05);
    bg.lineStyle(1, 0x00ff66, 1);
    for (let x = 0; x <= W; x += 80) { bg.moveTo(x, 0); bg.lineTo(x, H); }
    for (let y = 0; y <= H; y += 80) { bg.moveTo(0, y); bg.lineTo(W, y); }
    bg.strokePath();

    // ── Header ──
    this.add.rectangle(W / 2, 0, W, HDR_H, 0x000000, 0.97).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, HDR_H, W, 1.5, 0x00ff66, 0.6).setOrigin(0.5, 0);
    this.add.text(20, HDR_H / 2, 'NETWORK_UPGRADES.SH', { fontFamily: orb, fontSize: '16px', fontStyle: '900', color: '#00ff66', letterSpacing: 5 }).setOrigin(0, 0.5);
    this.add.text(W / 2, HDR_H / 2, '// PERMANENT — PERSIST ACROSS ALL RUNS', { fontFamily: mono, fontSize: '10px', color: '#336644', letterSpacing: 1 }).setOrigin(0.5);
    this._fragTxt = this.add.text(W - 20, HDR_H / 2, '', { fontFamily: mono, fontSize: '13px', fontStyle: 'bold', color: '#00ff88', letterSpacing: 2 }).setOrigin(1, 0.5);

    // ── Sidebar ──
    this.add.rectangle(0, HDR_H, SB_W, H - HDR_H - FTR_H, 0x000000, 0.88).setOrigin(0, 0);
    this.add.rectangle(SB_W, HDR_H, 1, H - HDR_H - FTR_H, 0x0a2818, 1).setOrigin(0, 0);

    // ── Right panel ──
    this.add.rectangle(SB_W, HDR_H, PREV_W, H - HDR_H - FTR_H, 0x010a03, 1).setOrigin(0, 0);

    // Right panel divider (info/preview split)
    const INFO_H = 280;
    this.add.rectangle(SB_W, HDR_H + INFO_H, PREV_W, 1, 0x0a2818, 0.8).setOrigin(0, 0);

    // Preview bg grid
    const prevBg = this.add.graphics().setAlpha(0.08);
    prevBg.lineStyle(1, 0x00ff66, 1);
    for (let x = SB_W; x <= W; x += 40) { prevBg.moveTo(x, HDR_H + INFO_H); prevBg.lineTo(x, H - FTR_H); }
    for (let y = HDR_H + INFO_H; y <= H - FTR_H; y += 40) { prevBg.moveTo(SB_W, y); prevBg.lineTo(W, y); }
    prevBg.strokePath();

    // Preview label
    this._previewLabel = this.add.text(PREV_X, HDR_H + INFO_H + 12, 'PREVIEW', {
      fontFamily: mono, fontSize: '9px', color: '#224433', letterSpacing: 4
    }).setOrigin(0.5).setDepth(2);

    // Preview graphics
    this._previewGfx = this.add.graphics().setDepth(3);

    // ── Footer ──
    this.add.rectangle(W / 2, H - FTR_H, W, FTR_H, 0x010a03, 0.98).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, H - FTR_H, W, 1, 0x0a2818, 1).setOrigin(0.5, 0);

    this._promptTxt = this.add.text(158, H - FTR_H / 2, '', { fontFamily: mono, fontSize: '11px', color: '#00ff66', letterSpacing: 1 }).setOrigin(0, 0.5);
    this._cursorBlock = this.add.rectangle(0, H - FTR_H / 2, 7, 13, 0x00ff66, 1).setOrigin(0, 0.5);
    this.tweens.add({ targets: this._cursorBlock, alpha: { from: 1, to: 0 }, duration: 500, yoyo: true, repeat: -1, ease: 'Step' });

    // Back button — far left of footer
    const backBg  = this.add.rectangle(8, H - FTR_H / 2, 140, 32, 0x000000, 0.9).setStrokeStyle(1, 0x0a2818, 1).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const backTxt = this.add.text(8 + 70, H - FTR_H / 2, '[ ESC — BACK ]', { fontFamily: mono, fontSize: '11px', color: '#447755', letterSpacing: 1 }).setOrigin(0.5);
    backBg.on('pointerover', () => { backBg.setStrokeStyle(1, 0x00ff66, 1); backTxt.setColor('#00ff88'); });
    backBg.on('pointerout',  () => { backBg.setStrokeStyle(1, 0x0a2818, 1); backTxt.setColor('#447755'); });
    backBg.on('pointerdown', () => { try { Snd.play('powerup'); } catch {} this._goBack(); });

    // Install button
    this._installBg  = this.add.rectangle(W - 24, H - FTR_H / 2, 180, 34, 0x000000, 0.9).setStrokeStyle(1, 0x0a3318, 1).setOrigin(1, 0.5).setInteractive({ useHandCursor: false }).setAlpha(0.4);
    this._installTxt = this.add.text(W - 24 - 90, H - FTR_H / 2, '[ INSTALL ]', { fontFamily: mono, fontSize: '11px', color: '#00ff66', letterSpacing: 2 }).setOrigin(0.5).setAlpha(0.4);

    // ── Upgrade data ──
    const UPGRADE_ANIMS = {
      start_shield:    'start_shield',
      slow_combo:      'slow_combo',
      heat_sink:       'heat_sink',
      primed_signal:   'primed_signal',
      overclock_chip:  'overclock_chip',
      redundant_buf:   'redundant_buf',
      signal_amp:      'signal_amp',
      data_compress:   'data_compress',
      packet_router:   'packet_router',
      ghost_protocol:  'ghost_protocol',
      redundant_path:  'redundant_path',
      kernel_access:   'kernel_access',
    };

    const PARENTS = {
      start_shield: [], slow_combo: [], heat_sink: [], primed_signal: [], overclock_chip: [],
      redundant_buf:   ['start_shield', 'slow_combo'],
      signal_amp:      ['slow_combo', 'heat_sink'],
      data_compress:   ['heat_sink', 'primed_signal'],
      packet_router:   ['primed_signal', 'overclock_chip'],
      ghost_protocol:  ['data_compress', 'packet_router'],
      redundant_path:  ['redundant_buf'],
      kernel_access:   ['signal_amp', 'data_compress'],
    };
    const CHILDREN = {};
    Object.entries(PARENTS).forEach(([id, pars]) => {
      pars.forEach(p => { if (!CHILDREN[p]) CHILDREN[p] = []; CHILDREN[p].push(id); });
    });

    const TIERS = [
      { label: 'TIER 1 — ENTRY',    ids: ['start_shield', 'slow_combo', 'heat_sink', 'primed_signal', 'overclock_chip'] },
      { label: 'TIER 2 — ADVANCED', ids: ['redundant_buf', 'signal_amp', 'data_compress', 'packet_router', 'ghost_protocol'] },
      { label: 'TIER 3 — CORE',     ids: ['redundant_path', 'kernel_access'] },
    ];

    const SYNERGIES = {
      start_shield:   'Stacks with REDUNDANT_BUFFER and CORE skin. Pairs with null_zone power.',
      slow_combo:     'STORM passive (every 5th reflect = bonus bullet): longer window = more combos.',
      heat_sink:      'OVERCLOCKER archetype: safe high-heat playstyle without overheat risk.',
      primed_signal:  'STORM archetype: surge-ready on wave 1 for immediate EMP burst.',
      overclock_chip: 'OVERCLOCKER archetype: seeds overclock_burst:1 already — combined = T2 from wave 1.',
      redundant_buf:  'CORE skin: +1 hits stacks on 3-hit passive = 4 hits at run start.',
      signal_amp:     'REFLECTOR archetype: chain kill damage ×1.5 per hit. STORM bonus bullets also get amp.',
      data_compress:  'Universal — 25% more shards per run compounds over time.',
      packet_router:  'Any run using PING as active power benefits directly. Ping every 10s instead of 15s.',
      ghost_protocol: 'GHOST archetype: seeds ghost_trace:2 already — combined = T3 from wave 1.',
      redundant_path: 'FORTRESS archetype: extra life on top of high shield = near-unkillable early game.',
      kernel_access:  'Every upgrade screen offers 4 cards instead of 3. Compounds with all archetypes.',
    };

    const metaMap = {};
    META_UPGRADES.forEach(u => metaMap[u.id] = u);

    const buildPkgs = () => {
      const pkgs = [];
      TIERS.forEach(tier => {
        tier.ids.forEach(id => {
          const meta = metaMap[id]; if (!meta) return;
          const owned      = Save.hasMeta(id);
          const parentOwned = (PARENTS[id] || []).length === 0 || (PARENTS[id] || []).every(p => Save.hasMeta(p));
          const canAfford  = !owned && parentOwned && Save.fragments() >= meta.cost;
          const available  = !owned && parentOwned;
          pkgs.push({ id, meta, owned, available, canAfford, tier: tier.label, parents: PARENTS[id] || [], children: CHILDREN[id] || [], anim: UPGRADE_ANIMS[id] });
        });
      });
      return pkgs;
    };

    // ── Sidebar list ──
    this._listObjs  = [];
    this._selected  = null;
    this._pkgs      = [];
    this._currentAnim = null;

    const renderList = () => {
      this._listObjs.forEach(o => { try { o.destroy(); } catch {} });
      this._listObjs = [];
      this._pkgs = buildPkgs();
      const add2 = o => { this._listObjs.push(o); return o; };

      let ly = HDR_H + 8;
      let lastTier = '';

      this._pkgs.forEach((pkg) => {
        if (pkg.tier !== lastTier) {
          lastTier = pkg.tier;
          add2(this.add.rectangle(0, ly, SB_W, 1, 0x0a2818, 0.6).setOrigin(0, 0));
          add2(this.add.text(12, ly + 6, `// ${pkg.tier}`, { fontFamily: mono, fontSize: '9px', color: '#336644', letterSpacing: 2 }));
          ly += 22;
        }

        const ROW_H  = 38;
        const isActive = this._selected === pkg.id;
        const col    = pkg.owned ? 0x00ff66 : pkg.available ? 0x00cc66 : 0x224422;
        const colS   = '#' + col.toString(16).padStart(6, '0');

        const rowBg = add2(this.add.rectangle(0, ly, SB_W, ROW_H, isActive ? 0x071a0f : 0x000000, isActive ? 1 : 0).setOrigin(0, 0));
        if (isActive) add2(this.add.rectangle(0, ly, 3, ROW_H, 0x00ff66, 1).setOrigin(0, 0));

        // Status icon
        const dotCol = pkg.owned ? 0x00ff66 : pkg.available ? 0x00cc66 : 0x1a3322;
        add2(this.add.circle(20, ly + ROW_H / 2, 7, 0x040e06));
        add2(this.add.circle(20, ly + ROW_H / 2, 7).setStrokeStyle(1, dotCol, pkg.owned ? 1 : pkg.available ? 0.7 : 0.3));
        add2(this.add.text(20, ly + ROW_H / 2, pkg.owned ? '✓' : pkg.available ? '◆' : '✕', { fontFamily: mono, fontSize: '8px', color: colS }).setOrigin(0.5));

        // Name
        const nameCol = pkg.owned ? '#66cc88' : pkg.available ? '#99ddaa' : '#335544';
        add2(this.add.text(38, ly + ROW_H / 2 - 8, pkg.meta.label, { fontFamily: mono, fontSize: '10px', letterSpacing: 1, color: nameCol }).setOrigin(0, 0.5));

        // Desc preview
        const shortDesc = pkg.meta.desc.length > 36 ? pkg.meta.desc.slice(0, 34) + '…' : pkg.meta.desc;
        add2(this.add.text(38, ly + ROW_H / 2 + 7, shortDesc, { fontFamily: mono, fontSize: '8px', color: '#336644' }).setOrigin(0, 0.5));

        // Cost
        const costStr = pkg.owned ? 'INSTALLED' : pkg.available ? `◆ ${pkg.meta.cost}` : 'LOCKED';
        const costCol = pkg.owned ? '#336644' : pkg.canAfford ? '#00cc66' : pkg.available ? '#446644' : '#223322';
        add2(this.add.text(SB_W - 10, ly + ROW_H / 2, costStr, { fontFamily: mono, fontSize: '9px', color: costCol, letterSpacing: 1 }).setOrigin(1, 0.5));

        add2(this.add.rectangle(0, ly + ROW_H, SB_W, 1, 0x040c05, 1).setOrigin(0, 0));

        const hit = add2(this.add.rectangle(0, ly, SB_W, ROW_H, 0x000000, 0).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
        hit.on('pointerover', () => { if (this._selected !== pkg.id) rowBg.setFillStyle(0x040e06, 1); });
        hit.on('pointerout',  () => { if (this._selected !== pkg.id) rowBg.setFillStyle(0x000000, 0); });
        hit.on('pointerdown', () => { this._selected = pkg.id; this._animT = 0; renderList(); showDetail(pkg); });

        ly += ROW_H + 1;
      });
    };

    // ── Detail panel ──
    this._detailObjs = [];
    this._animT      = 0;

    const showDetail = (pkg) => {
      this._detailObjs.forEach(o => { try { o.destroy(); } catch {} });
      this._detailObjs = [];
      this._currentAnim = pkg.available ? pkg.anim : null;
      this._animT = 0;

      const dadd = o => { this._detailObjs.push(o); return o; };
      const DX = SB_W + 24;
      const DW = PREV_W - 48;
      let dy = HDR_H + 14;

      // Update prompt
      const cmd = pkg.owned ? `status ${pkg.id}` : pkg.available ? `install ${pkg.id}` : `info ${pkg.id}`;
      this._promptTxt.setText(`root@signal_lost:~/network$ ${cmd}`);
      this._cursorBlock.setX(this._promptTxt.x + this._promptTxt.width + 4);

      // Install button
      if (pkg.canAfford) {
        this._installBg.setAlpha(1).setStrokeStyle(1, 0x0a3318, 1).setInteractive({ useHandCursor: true });
        this._installTxt.setAlpha(1).setText(`[ INSTALL  ◆ ${pkg.meta.cost} ]`);
        this._installBg.removeAllListeners();
        this._installBg.on('pointerover', () => { this._installBg.setFillStyle(0x071a0f, 1).setStrokeStyle(1, 0x00ff66, 1); this._installTxt.setColor('#ffffff'); });
        this._installBg.on('pointerout',  () => { this._installBg.setFillStyle(0x000000, 0.9).setStrokeStyle(1, 0x0a3318, 1); this._installTxt.setColor('#00ff66'); });
        this._installBg.on('pointerdown', () => doInstall(pkg));
      } else {
        this._installBg.setAlpha(0.3).setInteractive({ useHandCursor: false });
        this._installTxt.setAlpha(0.3).setText(pkg.owned ? '[ INSTALLED ]' : '[ LOCKED ]');
        this._installBg.removeAllListeners();
      }

      // Upgrade name
      const ac = '#' + pkg.meta.col.toString(16).padStart(6, '0');
      dadd(this.add.text(DX, dy, pkg.meta.label, { fontFamily: orb, fontSize: '18px', fontStyle: '900', color: ac, letterSpacing: 3 }));
      dy += 26;

      // Tier + permanent badge
      dadd(this.add.text(DX, dy, `// ${pkg.tier}`, { fontFamily: mono, fontSize: '9px', color: '#447755', letterSpacing: 3 }));
      const badge = dadd(this.add.text(DX + DW, dy + 1, '[ PERMANENT ]', { fontFamily: mono, fontSize: '9px', fontStyle: 'bold', color: ac, letterSpacing: 2 }).setOrigin(1, 0));
      dy += 20;

      // Stat boxes
      const stats = [
        { l: 'COST',    v: pkg.owned ? 'INSTALLED' : `◆ ${pkg.meta.cost}`,                                               c: pkg.owned ? '#336644' : pkg.canAfford ? '#00ff88' : '#448866' },
        { l: 'STATUS',  v: pkg.owned ? 'INSTALLED' : pkg.available ? 'AVAILABLE' : 'LOCKED',                              c: pkg.owned ? '#00ff88' : pkg.available ? '#88ddaa' : '#447755' },
        { l: 'REQUIRES',v: pkg.parents.length ? pkg.parents.map(p => p.toUpperCase().replace(/_/g, '-')).join(', ') : 'NONE', c: pkg.parents.every(p => Save.hasMeta(p)) ? '#00ff88' : '#cc8833' },
        { l: 'UNLOCKS', v: pkg.children.length ? pkg.children.map(p => p.toUpperCase().replace(/_/g, '-')).join(', ') : 'NONE', c: '#558866' },
      ];
      const SBW = Math.floor(DW / 4) - 4;
      stats.forEach((s, i) => {
        const sx = DX + i * (SBW + 5);
        dadd(this.add.rectangle(sx, dy, SBW, 44, 0x040e06, 1).setOrigin(0, 0).setStrokeStyle(1, 0x0a2010, 1));
        dadd(this.add.text(sx + 8, dy + 7,  s.l, { fontFamily: mono, fontSize: '8px',  color: '#447755', letterSpacing: 2 }));
        dadd(this.add.text(sx + 8, dy + 23, s.v, { fontFamily: mono, fontSize: '9px',  color: s.c,       letterSpacing: 1, wordWrap: { width: SBW - 16 } }));
      });
      dy += 54;

      // Description
      dadd(this.add.rectangle(DX, dy, DW, 1, 0x0a2818, 0.6).setOrigin(0, 0)); dy += 10;
      dadd(this.add.text(DX, dy, pkg.meta.desc, { fontFamily: mono, fontSize: '11px', color: '#99ccaa', wordWrap: { width: DW }, lineSpacing: 3 }));
      dy += 36;

      // Synergy
      const syn = SYNERGIES[pkg.id];
      if (syn && dy < HDR_H + INFO_H - 30) {
        dadd(this.add.text(DX, dy, 'SYNERGY  //  ' + syn, { fontFamily: mono, fontSize: '10px', color: '#558866', wordWrap: { width: DW }, lineSpacing: 2 }));
        dy += 30;
      }

      // Status message
      if (pkg.owned) {
        dadd(this.add.text(DX, HDR_H + INFO_H - 22, '✓ Installed — effect active from next run', { fontFamily: mono, fontSize: '10px', color: '#336644' }));
      } else if (!pkg.available) {
        const missing = pkg.parents.filter(p => !Save.hasMeta(p));
        dadd(this.add.text(DX, HDR_H + INFO_H - 22, `[LOCKED]  requires: ${missing.map(p => p.toUpperCase().replace(/_/g,'-')).join(', ')}`, { fontFamily: mono, fontSize: '10px', color: '#664422' }));
      } else if (!pkg.canAfford) {
        dadd(this.add.text(DX, HDR_H + INFO_H - 22, `[WARN]  need ◆ ${pkg.meta.cost}, have ◆ ${Save.fragments()}`, { fontFamily: mono, fontSize: '10px', color: '#886622' }));
      }
    };

    const doInstall = (pkg) => {
      if (!Save.spendFragments(pkg.meta.cost)) return;
      try { Snd.init(); Snd.play('install'); } catch {}
      Save.setMeta(pkg.id, true);
      try { if (Settings.get('shake')) this.cameras.main.flash(180, (pkg.meta.col >> 16) & 0xff, (pkg.meta.col >> 8) & 0xff, pkg.meta.col & 0xff, 0.15); } catch {}
      this._fragTxt.setText(`◆ ${Save.fragments()} FRAGMENTS`);
      this.time.delayedCall(600, () => {
        renderList();
        const newPkg = buildPkgs().find(p => p.id === pkg.id);
        if (newPkg) showDetail(newPkg);
      });
    };

    // ── Keyboard ──
    this.input.keyboard && this.input.keyboard.on('keydown-ESC',   () => this._goBack());
    this.input.keyboard && this.input.keyboard.on('keydown-DOWN',  () => {
      const pkgs = buildPkgs(); const idx = pkgs.findIndex(p => p.id === this._selected);
      const next = pkgs[Math.min(idx + 1, pkgs.length - 1)];
      if (next) { this._selected = next.id; this._animT = 0; renderList(); showDetail(next); }
    });
    this.input.keyboard && this.input.keyboard.on('keydown-UP', () => {
      const pkgs = buildPkgs(); const idx = pkgs.findIndex(p => p.id === this._selected);
      const prev = pkgs[Math.max(idx - 1, 0)];
      if (prev) { this._selected = prev.id; this._animT = 0; renderList(); showDetail(prev); }
    });
    this.input.keyboard && this.input.keyboard.on('keydown-ENTER', () => {
      const pkg = buildPkgs().find(p => p.id === this._selected);
      if (pkg && pkg.canAfford) doInstall(pkg);
    });

    // ── Init ──
    this._fragTxt.setText(`◆ ${Save.fragments()} FRAGMENTS`);
    this._promptTxt.setText('root@signal_lost:~/network$ _');
    this._cursorBlock.setX(this._promptTxt.x + this._promptTxt.width + 4);
    this._INFO_H = INFO_H;
    this._HDR_H  = HDR_H;
    this._FTR_H  = FTR_H;
    this._SB_W   = SB_W;
    this._PREV_X = PREV_X;
    this._PREV_Y = HDR_H + INFO_H + (H - HDR_H - FTR_H - INFO_H) / 2;

    renderList();
    const firstAvail = buildPkgs().find(p => p.available && !p.owned) || buildPkgs()[0];
    if (firstAvail) { this._selected = firstAvail.id; renderList(); showDetail(firstAvail); }
  }

  update(_, delta) {
    this.t += delta / 1000;
    this._animT = (this._animT || 0) + delta / 1000;
    if (!this._previewGfx || !this._currentAnim) return;
    const g   = this._previewGfx;
    const cx  = this._PREV_X;
    const cy  = this._PREV_Y;
    g.clear();
    this._drawMetaAnim(g, this._animT, this._currentAnim, cx, cy);
  }

  _drawMetaAnim(g, t, anim, cx, cy) {
    const drawHex = (x, y, r, col, a, rot = 0) => {
      g.lineStyle(1.5, col, a); g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r) : g.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); }
      g.closePath(); g.strokePath();
    };
    const drawPlayer = (x, y, col = 0x00cc66, a = 1) => {
      g.fillStyle(col, 0.1 * a); g.fillCircle(x, y, 22);
      g.fillStyle(col, 0.85 * a); g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = (Math.PI / 3) * s + t * 0.8; s === 0 ? g.moveTo(x + Math.cos(ang) * 12, y + Math.sin(ang) * 12) : g.lineTo(x + Math.cos(ang) * 12, y + Math.sin(ang) * 12); }
      g.closePath(); g.fillPath();
      g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(x, y, 3);
    };
    const drawShield = (x, y, hits, col = 0x00aaff, a = 1) => {
      const r = 34; const pulse = 0.5 + 0.4 * Math.sin(t * 7);
      g.lineStyle(1 + hits * 0.5, col, pulse * a);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = t + (Math.PI / 3) * s; s === 0 ? g.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r) : g.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); }
      g.closePath(); g.strokePath();
      for (let d = 0; d < hits; d++) { const ang = t * 2 + (Math.PI / 3) * d * 2; g.fillStyle(col, 0.8 * a); g.fillCircle(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 3 + hits * 0.3); }
    };

    if (anim === 'start_shield') {
      // Shield ring appears at run start instantly
      const cycle = t % 3.0;
      drawPlayer(cx, cy);
      if (cycle < 0.5) {
        const f = cycle / 0.5;
        drawShield(cx, cy, 1, 0x00aaff, f);
        g.lineStyle(2, 0x00aaff, (1 - f) * 0.6); g.strokeCircle(cx, cy, 60 * f);
      } else {
        drawShield(cx, cy, 1, 0x00aaff);
      }
      // "RUN START" label
      if (cycle < 0.5) {
        const f = cycle / 0.5;
        g.fillStyle(0x00aaff, f * 0.4); g.fillRect(cx - 50, cy - 55, 100, 18);
        g.fillStyle(0x000000, 1); g.fillRect(cx - 48, cy - 53, 96, 14);
        g.fillStyle(0x00aaff, f * 0.8); g.fillRect(cx - 46, cy - 51, 92 * f, 10);
      }

    } else if (anim === 'slow_combo') {
      // Combo timer bar lasting longer
      const cycle = t % 5.0;
      drawPlayer(cx, cy);
      // Normal timer (shorter)
      const normalDur = 3.0, slowDur = 4.2;
      const BAR_W = 80, BAR_H = 12;
      // Normal bar
      const nFrac = cycle < normalDur ? 1 - cycle / normalDur : 0;
      g.fillStyle(0x220000, 0.8); g.fillRect(cx - BAR_W / 2, cy - 50, BAR_W, BAR_H);
      g.fillStyle(0xff4444, 0.7); g.fillRect(cx - BAR_W / 2, cy - 50, BAR_W * nFrac, BAR_H);
      g.lineStyle(1, 0xff4444, 0.4); g.strokeRect(cx - BAR_W / 2, cy - 50, BAR_W, BAR_H);
      // Slow bar
      const sFrac = cycle < slowDur ? 1 - cycle / slowDur : 0;
      g.fillStyle(0x002200, 0.8); g.fillRect(cx - BAR_W / 2, cy - 32, BAR_W, BAR_H);
      g.fillStyle(0x00ff88, 0.7); g.fillRect(cx - BAR_W / 2, cy - 32, BAR_W * sFrac, BAR_H);
      g.lineStyle(1, 0x00ff88, 0.5); g.strokeRect(cx - BAR_W / 2, cy - 32, BAR_W, BAR_H);
      // Labels
      g.fillStyle(0xff4444, 0.5); g.fillRect(cx + BAR_W / 2 + 6, cy - 50, 28, BAR_H);
      g.fillStyle(0x000000, 1); g.fillRect(cx + BAR_W / 2 + 8, cy - 48, 24, 8);
      g.fillStyle(0xff4444, 0.6); g.fillRect(cx + BAR_W / 2 + 9, cy - 47, 22, 6);
      g.fillStyle(0x00ff88, 0.5); g.fillRect(cx + BAR_W / 2 + 6, cy - 32, 28, BAR_H);
      g.fillStyle(0x000000, 1); g.fillRect(cx + BAR_W / 2 + 8, cy - 30, 24, 8);
      g.fillStyle(0x00ff88, 0.6); g.fillRect(cx + BAR_W / 2 + 9, cy - 29, 22, 6);
      // Combo count
      const comboCount = Math.min(15, Math.floor(cycle * 3));
      g.fillStyle(comboCount > 10 ? 0xffd700 : comboCount > 5 ? 0xff6600 : 0xffdd00, 0.7);
      g.fillRect(cx - 20, cy + 25, 40, 20);
      g.fillStyle(0x000000, 1); g.fillRect(cx - 18, cy + 27, 36, 16);
      g.fillStyle(comboCount > 10 ? 0xffd700 : 0xffdd00, 0.8);
      const comboBar = 34 * (comboCount / 15);
      g.fillRect(cx - 17, cy + 28, comboBar, 14);

    } else if (anim === 'heat_sink') {
      // Heat cools faster
      const cycle = t % 3.5;
      const BAR_W = 20, BAR_H = 120;
      const bx = cx - BAR_W / 2, by = cy - BAR_H / 2;
      let fill = cycle < 1.5 ? cycle / 1.5 : Math.max(0, 1 - (cycle - 1.5) / 1.2);
      g.fillStyle(0x1a0000, 0.8); g.fillRect(bx, by, BAR_W, BAR_H);
      g.lineStyle(1, 0xff4400, 0.4); g.strokeRect(bx, by, BAR_W, BAR_H);
      const heatCol = fill > 0.8 ? 0xff2200 : fill > 0.5 ? 0xff6600 : 0xff4400;
      if (fill > 0) { g.fillStyle(heatCol, 0.9); g.fillRect(bx + 2, by + BAR_H - BAR_H * fill + 2, BAR_W - 4, BAR_H * fill - 4); }
      // Overheat marker
      g.lineStyle(1, 0xff0000, 0.6); g.beginPath(); g.moveTo(bx - 8, by + BAR_H * 0.15); g.lineTo(bx + BAR_W + 8, by + BAR_H * 0.15); g.strokePath();
      // Fast cool arrows
      if (fill < 0.9 && cycle > 1.5) {
        const arA = 0.5 + 0.5 * Math.sin(t * 6);
        for (let arr = 0; arr < 3; arr++) {
          const ay = by + BAR_H - BAR_H * fill + 20 + arr * 14;
          if (ay < by + BAR_H - 10) { g.lineStyle(1, 0x00ff88, arA * (1 - arr * 0.3)); g.beginPath(); g.moveTo(cx - 8, ay); g.lineTo(cx, ay + 7); g.lineTo(cx + 8, ay); g.strokePath(); }
        }
      }
      drawPlayer(cx + 70, cy);

    } else if (anim === 'primed_signal') {
      // Surge meter jumps to 50%
      const cycle = t % 4.0;
      const BAR_W = 20, BAR_H = 130;
      const bx = cx - BAR_W / 2, by = cy - BAR_H / 2;
      let fill = cycle < 0.3 ? 0 : cycle < 0.7 ? Math.min(0.5, (cycle - 0.3) / 0.4 * 0.5) : cycle < 2.5 ? 0.5 : Math.min(1, 0.5 + (cycle - 2.5) / 1.5 * 0.5);
      g.fillStyle(0x0a0400, 0.8); g.fillRect(bx, by, BAR_W, BAR_H);
      g.lineStyle(1, 0xff6600, 0.4); g.strokeRect(bx, by, BAR_W, BAR_H);
      // 50% marker
      g.lineStyle(1, 0xff6600, 0.6); g.beginPath(); g.moveTo(bx - 10, by + BAR_H * 0.5); g.lineTo(bx + BAR_W + 10, by + BAR_H * 0.5); g.strokePath();
      if (fill > 0) { g.fillStyle(0xff6600, 0.9); g.fillRect(bx + 2, by + BAR_H - BAR_H * fill + 2, BAR_W - 4, BAR_H * fill - 4); }
      for (let seg = 1; seg < 5; seg++) { const sy = by + BAR_H * (seg / 5); g.lineStyle(1, 0x331100, 0.5); g.beginPath(); g.moveTo(bx, sy); g.lineTo(bx + BAR_W, sy); g.strokePath(); }
      if (cycle > 0.3 && cycle < 2.5) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        g.lineStyle(2, 0xff6600, pulse * 0.7); g.strokeRect(bx - 3, by - 3, BAR_W + 6, BAR_H + 6);
        const arA = 0.5 + 0.5 * Math.sin(t * 5);
        g.lineStyle(2, 0xff6600, arA); g.beginPath(); g.moveTo(bx + BAR_W + 14, by + BAR_H * 0.5 + 10); g.lineTo(bx + BAR_W + 24, by + BAR_H * 0.5); g.lineTo(bx + BAR_W + 14, by + BAR_H * 0.5 - 10); g.strokePath();
      }

    } else if (anim === 'overclock_chip') {
      // Bubble expands fast with gold tint
      const cycle = t % 2.2;
      const R = cycle < 1.6 ? (cycle / 1.6) * 80 : 80;
      const a = cycle < 1.6 ? 0.9 : 0.9 - ((cycle - 1.6) / 0.6) * 0.9;
      const rot = t * 0.3;
      g.fillStyle(0xffd700, 0.04 * a); g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(ang) * (R + 12), cy + Math.sin(ang) * (R + 12)) : g.lineTo(cx + Math.cos(ang) * (R + 12), cy + Math.sin(ang) * (R + 12)); }
      g.closePath(); g.fillPath();
      g.lineStyle(2, 0xffd700, a * 0.9); g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R) : g.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); }
      g.closePath(); g.strokePath();
      g.lineStyle(1, 0xffd700, 0.25 * a); g.beginPath();
      for (let s = 0; s < 6; s++) { const ang = -rot * 1.5 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(ang) * R * 0.6, cy + Math.sin(ang) * R * 0.6) : g.lineTo(cx + Math.cos(ang) * R * 0.6, cy + Math.sin(ang) * R * 0.6); }
      g.closePath(); g.strokePath();
      for (let s = 0; s < 6; s++) { const ang = t * 2.5 + (Math.PI / 3) * s; g.fillStyle(0xffd700, 0.85 * a); g.fillCircle(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 3); }
      drawPlayer(cx, cy, 0xffd700);

    } else if (anim === 'redundant_buf') {
      // Shield dot count increases
      const cycle = t % 3.0;
      drawPlayer(cx, cy);
      const hits = cycle < 1.5 ? 2 : 3;
      drawShield(cx, cy, 2, 0x00aaff);
      if (cycle > 1.3 && cycle < 2.2) {
        const addA = Math.min(1, (cycle - 1.3) / 0.4);
        const ang = t * 2 + Math.PI;
        g.fillStyle(0x00aaff, addA * 0.9); g.fillCircle(cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 34, 3.5);
        g.lineStyle(1, 0xffffff, addA * 0.5); g.strokeCircle(cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 34, 7);
        if (addA > 0.7) { g.fillStyle(0x00aaff, 0.2 * (1 - (addA - 0.7) / 0.3)); g.fillCircle(cx, cy, 55); }
      }

    } else if (anim === 'signal_amp') {
      // Reflected bullet leaves damage trail, second enemy dies
      const cycle = t % 3.0;
      drawPlayer(cx - 60, cy);
      drawHex(cx - 60, cy, 32, 0x00ffcc, 0.6, t * 0.3);
      // Enemies
      const e1x = cx + 50, e1y = cy - 20;
      const e2x = cx + 100, e2y = cy + 30;
      if (cycle < 1.5) {
        // Both alive
        g.fillStyle(0xff4444, 0.8); g.beginPath(); for (let s = 0; s < 3; s++) { const ang = (Math.PI * 2 / 3) * s + t; s === 0 ? g.moveTo(e1x + Math.cos(ang) * 12, e1y + Math.sin(ang) * 12) : g.lineTo(e1x + Math.cos(ang) * 12, e1y + Math.sin(ang) * 12); } g.closePath(); g.fillPath();
        g.fillStyle(0xff4444, 0.8); g.beginPath(); for (let s = 0; s < 3; s++) { const ang = (Math.PI * 2 / 3) * s + t; s === 0 ? g.moveTo(e2x + Math.cos(ang) * 12, e2y + Math.sin(ang) * 12) : g.lineTo(e2x + Math.cos(ang) * 12, e2y + Math.sin(ang) * 12); } g.closePath(); g.fillPath();
        // Incoming bullet
        const prog = cycle / 1.5;
        const bx = cx - 30 + prog * 80;
        g.fillStyle(0x00ffcc, 1.0); g.fillCircle(bx, cy - 20 * prog, 5);
        // Trail = damage (brighter/longer than normal)
        for (let tr = 1; tr < 5; tr++) { const ta = 1 - tr / 5; g.lineStyle(2, 0x00ffcc, ta * 0.6); g.beginPath(); g.moveTo(bx - tr * 12, cy - 20 * (prog - tr * 0.05)); g.lineTo(bx - (tr - 1) * 12, cy - 20 * (prog - (tr - 1) * 0.05)); g.strokePath(); }
      } else {
        // e1 explodes, bullet continues to e2
        const f = (cycle - 1.5) / 1.5;
        g.lineStyle(1.5, 0xff4444, (1 - f) * 0.8); g.strokeCircle(e1x, e1y, 12 + f * 25);
        if (f < 0.7) {
          g.fillStyle(0xff4444, 0.8); g.beginPath(); for (let s = 0; s < 3; s++) { const ang = (Math.PI * 2 / 3) * s + t; s === 0 ? g.moveTo(e2x + Math.cos(ang) * 12, e2y + Math.sin(ang) * 12) : g.lineTo(e2x + Math.cos(ang) * 12, e2y + Math.sin(ang) * 12); } g.closePath(); g.fillPath();
          const bx = e1x + f / 0.7 * (e2x - e1x);
          const by = e1y + f / 0.7 * (e2y - e1y);
          g.fillStyle(0x00ffcc, 1.0); g.fillCircle(bx, by, 5);
          g.lineStyle(2, 0x00ffcc, 0.5); g.beginPath(); g.moveTo(e1x, e1y); g.lineTo(bx, by); g.strokePath();
        } else {
          g.lineStyle(1.5, 0xff4444, (1 - f) * 0.8); g.strokeCircle(e2x, e2y, 12 + (f - 0.7) / 0.3 * 25);
        }
      }

    } else if (anim === 'data_compress') {
      // Shard counter ticks higher per kill
      const cycle = t % 3.0;
      drawPlayer(cx - 50, cy);
      // Enemy
      const ex = cx + 40, ey = cy;
      if (cycle < 1.0) {
        g.fillStyle(0xff4444, 0.8); g.beginPath(); for (let s = 0; s < 3; s++) { const ang = (Math.PI * 2 / 3) * s + t; s === 0 ? g.moveTo(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12) : g.lineTo(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12); } g.closePath(); g.fillPath();
      } else {
        const ef = Math.min(1, (cycle - 1.0) / 0.4);
        g.lineStyle(1.5, 0xff4444, (1 - ef) * 0.8); g.strokeCircle(ex, ey, 12 + ef * 22);
        // Shard pop — boosted
        if (ef > 0.2) {
          const popA = Math.min(1, (ef - 0.2) / 0.3);
          const floatY = (cycle - 1.4) * 40;
          const shardCount = 4; // more shards = data_compress
          for (let s = 0; s < shardCount; s++) {
            const sx = ex - 30 + s * 20;
            g.fillStyle(0xffdd00, popA * 0.9); g.fillRect(sx, ey - 8 - floatY, 14, 14);
            g.fillStyle(0x000000, 1); g.fillRect(sx + 2, ey - 6 - floatY, 10, 10);
            g.fillStyle(0xffdd00, popA); g.fillRect(sx + 3, ey - 5 - floatY, 8, 8);
          }
          // +25% indicator
          g.fillStyle(0xffdd00, popA * 0.5); g.fillRect(ex - 20, ey - floatY - 30, 40, 14);
          g.fillStyle(0x000000, 1); g.fillRect(ex - 18, ey - floatY - 28, 36, 10);
          g.fillStyle(0xffdd00, popA * 0.8); g.fillRect(ex - 16, ey - floatY - 27, 32 * 1.25, 8);
        }
      }

    } else if (anim === 'packet_router') {
      // Ping cooldown arcs: OLD 15s vs NEW 10s
      const cycle = t % 4.5;
      const pairs = [
        { label: 'OLD', dur: 15, displayDur: 3.5, col: 0xff4444, x: cx - 65 },
        { label: 'NEW', dur: 10, displayDur: 2.3, col: 0x00cc66, x: cx + 65 },
      ];
      pairs.forEach(lb => {
        const r = 32;
        const frac = Math.min(1, cycle / lb.displayDur);
        g.lineStyle(5, 0x111111, 0.9); g.beginPath(); g.arc(lb.x, cy, r, 0, Math.PI * 2); g.strokePath();
        g.lineStyle(5, lb.col, 0.8); g.beginPath(); g.arc(lb.x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.strokePath();
        g.fillStyle(lb.col, 0.1); g.fillCircle(lb.x, cy, r - 2);
        const tipA = -Math.PI / 2 + Math.PI * 2 * frac;
        g.fillStyle(0xffffff, 0.9); g.fillCircle(lb.x + Math.cos(tipA) * r, cy + Math.sin(tipA) * r, 4);
        if (frac >= 1) { const f2 = 0.5 + 0.5 * Math.sin(t * 8); g.lineStyle(2, lb.col, f2); g.strokeCircle(lb.x, cy, r + 5); }
        g.fillStyle(lb.col, 0.4); g.fillRect(lb.x - 18, cy - r - 22, 36, 16);
        g.fillStyle(0x000000, 1); g.fillRect(lb.x - 16, cy - r - 20, 32, 12);
        g.fillStyle(lb.col, 0.7); g.fillRect(lb.x - 14, cy - r - 18, 28 * frac, 8);
      });
      g.lineStyle(1, 0x332200, 0.5); g.beginPath(); g.moveTo(cx, cy - 50); g.lineTo(cx, cy + 50); g.strokePath();

    } else if (anim === 'ghost_protocol') {
      // Overheat → go invisible → reappear
      const cycle = t % 4.0;
      if (cycle < 0.8) { drawPlayer(cx, cy, 0xaaaaff); drawShield(cx, cy, 1, 0xaaaaff); }
      else if (cycle < 1.2) {
        const f = (cycle - 0.8) / 0.4;
        drawPlayer(cx, cy, 0xaaaaff, 1);
        g.lineStyle(2, 0xff2200, f * 0.8); g.strokeCircle(cx, cy, 30 + f * 10);
      } else if (cycle < 2.5) {
        const ghostA = 0.12 + 0.05 * Math.sin(t * 6);
        drawPlayer(cx, cy, 0xaaaaff, ghostA);
        // Enemy bullet passes through
        const prog = (cycle - 1.2) / 1.3;
        const bx = cx - 80 + prog * 160;
        g.fillStyle(0xff4444, 0.7); g.fillCircle(bx, cy, 4);
        g.lineStyle(1, 0x444444, 0.4); g.beginPath(); g.moveTo(bx - 25, cy); g.lineTo(bx, cy); g.strokePath();
      } else {
        const f = Math.min(1, (cycle - 2.5) / 0.5);
        drawPlayer(cx, cy, 0xaaaaff, f);
        g.lineStyle(1, 0xaaaaff, (1 - f) * 0.6); g.strokeCircle(cx, cy, 40 * (1 - f));
      }

    } else if (anim === 'redundant_path') {
      // Die → revive pulse
      const cycle = t % 4.0;
      if (cycle < 1.0) { drawPlayer(cx, cy); }
      else if (cycle < 1.5) {
        const f = 1 - (cycle - 1.0) / 0.5;
        drawPlayer(cx, cy, 0xff2244, f);
        g.fillStyle(0xff2244, (1 - f) * 0.2); g.fillCircle(cx, cy, 60 * (1 - f));
      } else if (cycle < 2.3) {
        g.lineStyle(2, 0xff2244, 0.6);
        g.beginPath(); g.moveTo(cx - 12, cy - 12); g.lineTo(cx + 12, cy + 12); g.strokePath();
        g.beginPath(); g.moveTo(cx + 12, cy - 12); g.lineTo(cx - 12, cy + 12); g.strokePath();
      } else {
        const f = Math.min(1, (cycle - 2.3) / 0.8);
        const pulseR = f * 80;
        g.lineStyle(2, 0xaa00ff, (1 - f) * 0.8); g.strokeCircle(cx, cy, pulseR);
        drawPlayer(cx, cy, 0xaa00ff, Math.min(1, f * 3));
        drawShield(cx, cy, 2, 0xaa00ff, Math.min(1, (f - 0.3) * 2));
      }

    } else if (anim === 'kernel_access') {
      // 4 upgrade cards instead of 3
      const cycle = t % 4.5;
      const cards = [
        { icon: '↩', col: 0x00ffcc }, { icon: '◈', col: 0xffdd00 },
        { icon: '✦', col: 0xff6688 }, { icon: '∞', col: 0xff6600 }, // 4th card — extra!
      ];
      const selectedCard = Math.floor(cycle / 1.0) % 4;
      cards.forEach((card, ci) => {
        const isExtra = ci === 3;
        const total = 4; const spacing = 80;
        const cx2 = cx + (ci - (total - 1) / 2) * spacing;
        const cy2 = cy;
        const isSelected = ci === selectedCard;
        const cardW = 62, cardH = 90;
        const pulse = isSelected ? 0.5 + 0.4 * Math.sin(t * 8) : 0;
        g.fillStyle(isSelected ? card.col : isExtra ? 0x221100 : 0x111100, isSelected ? 0.15 : 0.5);
        g.fillRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH);
        g.lineStyle(isExtra ? (isSelected ? 2 : 1.5) : (isSelected ? 2 : 1), card.col, isSelected ? 0.9 + pulse * 0.1 : isExtra ? 0.5 : 0.25);
        g.strokeRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH);
        g.fillStyle(card.col, isSelected ? 0.7 : isExtra ? 0.4 : 0.2);
        g.fillRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, 3);
        g.fillStyle(card.col, isSelected ? 0.25 : 0.08); g.fillCircle(cx2, cy2 - 12, 18);
        g.lineStyle(1, card.col, isSelected ? 0.8 : 0.3); g.strokeCircle(cx2, cy2 - 12, 18);
        if (isExtra) {
          // NEW badge on 4th card
          g.fillStyle(0xff8800, 0.6); g.fillRect(cx2 - 14, cy2 - cardH / 2 + 8, 28, 12);
          g.fillStyle(0x000000, 1); g.fillRect(cx2 - 12, cy2 - cardH / 2 + 10, 24, 8);
          g.fillStyle(0xff8800, 0.8); g.fillRect(cx2 - 10, cy2 - cardH / 2 + 11, 20, 6);
        }
        if (isSelected) {
          const selPulse = 0.4 + pulse * 0.4;
          g.lineStyle(2, card.col, selPulse); g.strokeRect(cx2 - cardW / 2 - 4, cy2 - cardH / 2 - 4, cardW + 8, cardH + 8);
        }
      });
    }
  }

  _goBack() {
    try{Snd.stopSceneMusic();}catch(e){}
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(220, () => {
      this.scene.stop('MetaUpgradeScene');
      const ms = this.scene.get('MenuScene');
      if (ms && ms.sys.isSleeping()) this.scene.wake('MenuScene');
      else this.scene.start('MenuScene');
    });
  }
}
