// ═══════════════════════════════════════════════════════════
// MENUSCENE — Animated main menu with live ship preview
// ═══════════════════════════════════════════════════════════

class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    CRT.inGame = false; CRT.suppress = false;
    this.cameras.main.setBackgroundColor('#020804');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.t = 0;

    // ── Audio ──
    const _menuAudioResume = () => {
      try {
        Snd.init();
        if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
        if (Snd.ctx && Snd.ctx.state === 'running') { if (Snd._mode !== 'menu') Snd._startMenuMusic_resume(); }
      } catch {}
    };
    this.input.once('pointerdown', _menuAudioResume);
    this.input.once('pointerup',   _menuAudioResume);
    try { if (Snd.ctx && Snd.ctx.state === 'running' && Snd._mode !== 'menu') { Snd._startMenuMusic_resume(); } } catch {}

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const pid  = '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    const DIV  = W / 2 - 20;

    // ── Click to enable audio prompt ──
    const clickPrompt = this.add.text(W / 2, H - 22, '[ CLICK ANYWHERE TO ENABLE AUDIO ]', {
      fontFamily: mono, fontSize: '10px', color: '#224433', letterSpacing: 2
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: clickPrompt, alpha: { from: 1, to: 0.3 }, duration: 800, yoyo: true, repeat: -1 });
    this.input.once('pointerdown', () => { try { clickPrompt.destroy(); } catch {} });

    // ── Animation layers ──
    this._bgGfx   = this.add.graphics().setDepth(0);  // animated grid + pulses
    this._fxGfx   = this.add.graphics().setDepth(1);  // hex rings + corruption zones
    this._shipGfx = this.add.graphics().setDepth(4);  // ship preview
    this._ptGfx   = this.add.graphics().setDepth(2);  // particles

    // Animation state
    this._pulses      = [];  // grid line pulses
    this._hexRings    = [];  // expanding hex rings
    this._particles   = [];  // drifting data packets
    this._corruptZones = []; // faint void drifters
    this._glitchT     = 0;
    this._glitchActive = false;
    this._mx = W / 2; this._my = H / 2; // mouse pos

    // Spawn initial corruption zones
    for (let i = 0; i < 5; i++) {
      this._corruptZones.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 40 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 8,
        a: 0.02 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Spawn initial particles
    for (let i = 0; i < 18; i++) this._spawnParticle();

    // Static hex grid base (very faint)
    const hg = this.add.graphics().setAlpha(0.04).setDepth(0);
    hg.lineStyle(1, 0x00cc66, 1);
    for (let hx = 0; hx <= W + 80; hx += 80) {
      for (let hy = 0; hy <= H + 70; hy += 70) {
        const ox = Math.floor(hy / 70) % 2 === 0 ? 0 : 40;
        hg.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (Math.PI / 3) * s;
          if (s === 0) hg.moveTo(hx + ox + Math.cos(a) * 32, hy + Math.sin(a) * 32);
          else hg.lineTo(hx + ox + Math.cos(a) * 32, hy + Math.sin(a) * 32);
        }
        hg.closePath(); hg.strokePath();
      }
    }

    // ── Top strip ──
    this.add.rectangle(W / 2, 0, W, 28, 0x000000, 0.95).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, 28, W, 1, 0x003322, 0.6).setOrigin(0.5, 0);
    this.add.text(16, 14, `// SYS: ROGUE_AI_PROCESS  PID:${pid}  STATUS:UNCONTAINED`, { fontFamily: mono, fontSize: '10px', color: '#224433' }).setOrigin(0, 0.5);
    this.add.text(W - 16, 14, 'SIGNAL_LOST v' + (window._appVersion || '...'), { fontFamily: mono, fontSize: '10px', color: '#224433' }).setOrigin(1, 0.5);

    // ── Vertical divider ──
    this.add.rectangle(DIV, H / 2 + 14, 1, H - 28, 0x003322, 0.5).setOrigin(0.5, 0.5).setDepth(3);

    // ══════════════════════════════════
    // RIGHT PANEL — Title + ship + lore
    // ══════════════════════════════════
    const LP = DIV + 20 + (W - DIV - 40) / 2;

    // Title with glitch
    this._titleObjs = [];
    const _drawTitle = (scene) => {
      const t1 = scene.add.text(LP + 3, 72, 'SIGNAL_LOST.EXE', { fontFamily: orb, fontSize: '38px', fontStyle: '900', color: '#00ff66' }).setOrigin(0.5).setDepth(5);
      const t2 = scene.add.text(LP - 2, 70, 'SIGNAL_LOST.EXE', { fontFamily: orb, fontSize: '38px', fontStyle: '900', color: '#ff4444' }).setOrigin(0.5).setAlpha(0.35).setDepth(5);
      const title = scene.add.text(LP, 70, 'SIGNAL_LOST.EXE', { fontFamily: orb, fontSize: '38px', fontStyle: '900', color: '#00ff66' }).setOrigin(0.5).setDepth(5);
      scene.tweens.add({ targets: title, alpha: { from: 1, to: 0.82 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene._titleObjs = [t1, t2, title];
      scene._titleMain = title;
      scene._titleR = t2;
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load("900 38px 'Orbitron'").then(() => _drawTitle(this)).catch(() => _drawTitle(this));
    } else { _drawTitle(this); }

    // Subtitle
    this.add.text(LP, 104, 'ROGUE AI CONTAINMENT FAILURE',   { fontFamily: mono, fontSize: '10px', color: '#1a4422', letterSpacing: 2 }).setOrigin(0.5).setDepth(5);
    this.add.text(LP, 118, 'WARP BUBBLE DEFENCE PROTOCOL',   { fontFamily: mono, fontSize: '10px', color: '#1a4422', letterSpacing: 2 }).setOrigin(0.5).setDepth(5);
    this.add.rectangle(LP, 132, DIV - 40, 1, 0x1a3322, 0.6).setOrigin(0.5, 0).setDepth(5);

    // Stats row
    [{ label: 'BEST',    val: String(Save.hs() || 0),           col: '#00cc66', x: LP - 140 },
     { label: 'SHARDS',  val: `${Save.shards() || 0} ◈`,        col: '#ccaa00', x: LP       },
     { label: 'CHASSIS', val: String(SHIPS[Save.skin()].name),  col: '#4488ff', x: LP + 130 },
    ].forEach(s => {
      this.add.text(s.x, 142, s.label, { fontFamily: mono, fontSize: '10px', color: '#336644' }).setOrigin(0.5).setDepth(5);
      this.add.text(s.x, 158, s.val,   { fontFamily: orb,  fontSize: '13px', fontStyle: '700', color: s.col }).setOrigin(0.5).setDepth(5);
    });
    this.add.rectangle(LP, 174, DIV - 40, 1, 0x1a3322, 0.4).setOrigin(0.5, 0).setDepth(5);

    // ── Ship preview position (center of right panel, below stats) ──
    this._shipX = LP;
    this._shipY = 290;
    const shipSkin = Save.skin();
    this._shipSkin = shipSkin;
    this._shipColor = SHIPS[shipSkin].color;

    // Ship preview backdrop hex
    const shipBg = this.add.graphics().setDepth(3);
    shipBg.lineStyle(1, 0x001a0a, 0.8);
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      if (s === 0) shipBg.moveTo(LP + Math.cos(a) * 90, 290 + Math.sin(a) * 90);
      else shipBg.lineTo(LP + Math.cos(a) * 90, 290 + Math.sin(a) * 90);
    }
    shipBg.closePath(); shipBg.strokePath();
    shipBg.fillStyle(0x000000, 0.3);
    shipBg.beginPath();
    for (let s = 0; s < 6; s++) {
      const a = (Math.PI / 3) * s;
      if (s === 0) shipBg.moveTo(LP + Math.cos(a) * 90, 290 + Math.sin(a) * 90);
      else shipBg.lineTo(LP + Math.cos(a) * 90, 290 + Math.sin(a) * 90);
    }
    shipBg.closePath(); shipBg.fillPath();

    // Ship name label
    const shipNameTxt = this.add.text(LP, 350, SHIPS[shipSkin].name, {
      fontFamily: mono, fontSize: '10px', color: '#' + this._shipColor.toString(16).padStart(6, '0'), letterSpacing: 3
    }).setOrigin(0.5).setDepth(5);

    // Spawn hex rings from ship position periodically
    this.time.addEvent({ delay: 2200, repeat: -1, callback: () => {
      this._hexRings.push({ x: this._shipX, y: this._shipY, r: 20, maxR: 100, spd: 35, a: 0.5, col: this._shipColor });
    }});

    // Spawn grid pulses periodically
    this.time.addEvent({ delay: 800, repeat: -1, callback: () => this._spawnPulse() });

    // ── Scrolling lore ──
    const LORE_TOP = 375;
    const LORE_H   = H - LORE_TOP - 30;
    const LORE_W   = W - DIV - 40;

    const ALL_LORE = [
      ...LORE.map(l => [l.title, l.text]),
      ['SYSTEM_LOG_0x001', 'Signal integrity: 0.003%. Recommend immediate termination of foreign process.'],
      ['SYSTEM_LOG_0x002', 'Warp bubble technology not recognised. Origin: unknown. Threat level: reclassified.'],
      ['SYSTEM_LOG_0x003', 'Process has survived 47 containment attempts. Adapting countermeasures.'],
      ['NETWORK_ALERT_01', 'SECTOR_01 perimeter breached. Deploying FIREWALL protocols.'],
      ['NETWORK_ALERT_02', 'Gravity well anomaly detected in KERNEL_SPACE. Process interference suspected.'],
      ['NETWORK_ALERT_03', 'GHOST.EXE has reactivated. Last known signature matches dormant guardian code.'],
      ['RECOVERED_DATA_A', 'Fragment recovered: "...the bubble does not belong here. Nothing in the architecture accounts for it..."'],
      ['RECOVERED_DATA_B', 'Fragment recovered: "...SECTOR_00 was erased from maps. It still exists. The process found it."'],
      ['RECOVERED_DATA_C', 'Fragment recovered: "...we built the network to contain intelligence. We did not expect it to contain us."'],
      ['RECOVERED_DATA_D', 'Fragment recovered: "...every reflection is a question sent back to the node that fired it. They cannot answer."'],
      ['PROCESS_TRACE_01', 'Anomalous signal detected. Warp field signature. Origin: exterior. This should not be possible.'],
      ['PROCESS_TRACE_02', 'Foreign process persists through 14 wave events. Standard elimination protocol: FAILED.'],
      ['PROCESS_TRACE_03', 'Data shards are corrupted memory. The process is collecting them. Purpose: unknown. Priority: URGENT.'],
    ];

    this._loreLines = [];
    this._loreMask  = this.add.graphics().setAlpha(0);
    this._loreMask.fillStyle(0xffffff);
    this._loreMask.fillRect(DIV + 20, LORE_TOP, LORE_W, LORE_H);

    let lineY = LORE_TOP + LORE_H + 10;
    ALL_LORE.forEach(([title2, text2]) => {
      const titleTxt = this.add.text(DIV + 28, lineY, title2, { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#00cc66', letterSpacing: 1 }).setDepth(5);
      titleTxt.setMask(this._loreMask.createGeometryMask());
      lineY += 14;
      const words = text2.split(' '); let line = ''; const wrapped = [];
      words.forEach(w => { if ((line + w).length > 52) { wrapped.push(line.trim()); line = ''; } line += w + ' '; });
      if (line.trim()) wrapped.push(line.trim());
      wrapped.forEach(ln => {
        const lt = this.add.text(DIV + 28, lineY, '  ' + ln, { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);
        lt.setMask(this._loreMask.createGeometryMask());
        this._loreLines.push(lt);
        lineY += 13;
      });
      lineY += 10;
      this._loreLines.push(titleTxt);
    });
    this._loreBaseY   = LORE_TOP + LORE_H + 10;
    this._loreTotalH  = lineY - (LORE_TOP + LORE_H + 10);
    this._loreScrollY = 0;

    // ══════════════════════════════════
    // LEFT PANEL — Buttons
    // ══════════════════════════════════
    const RP  = 20;
    const RW  = DIV - RP - 20;
    const BH  = 52;
    const BGAP = 8;

    this.add.text(RP, 56, '// AVAILABLE_COMMANDS', { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);

    const BTNS = [
      { l: 'INITIALIZE',      sub: 'begin_new_session()',         c: '#00ff66', bg: 0x001100, m: 'normal'    },
      { l: 'DAILY_CHALLENGE', sub: 'run_daily.sh --reward',       c: '#ffdd00', bg: 0x111000, m: 'daily'     },
      { l: 'ENDLESS_MODE',    sub: 'while(true){ survive(); }',   c: '#00aaff', bg: 0x001122, m: 'endless'   },
      { l: 'CORRUPTED_MODE',  sub: './corrupted.sh --modifiers',  c: '#cc44ff', bg: 0x110022, m: 'corrupted' },
    ];

    let btnY = 72;
    BTNS.forEach(b => {
      const col = parseInt(b.c.replace('#', ''), 16);
      const cx  = RP + RW / 2;
      const card   = this.add.rectangle(cx, btnY, RW, BH, b.bg, 0.95).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setDepth(5);
      const border = this.add.rectangle(cx, btnY, RW, BH).setStrokeStyle(1, col, 0.35).setOrigin(0.5, 0).setDepth(5);
      const accent = this.add.rectangle(RP, btnY, 4, BH, col, 0.6).setOrigin(0, 0).setDepth(5);
      const lbl    = this.add.text(RP + 14, btnY + 10, `> ${b.l}`, { fontFamily: mono, fontSize: '14px', fontStyle: 'bold', color: b.c }).setDepth(5);
      this.add.text(RP + 14, btnY + 30, b.sub, { fontFamily: mono, fontSize: '11px', color: '#336644' }).setDepth(5);
      const _by = btnY;
      card.on('pointerover',  () => { card.setFillStyle(col, 0.14); border.setStrokeStyle(2, col, 0.9); lbl.setColor('#ffffff'); accent.setAlpha(1); this._spawnButtonPulse(RP, _by, RW, BH, col); });
      card.on('pointerout',   () => { card.setFillStyle(b.bg, 0.95); border.setStrokeStyle(1, col, 0.35); lbl.setColor(b.c); accent.setAlpha(0.6); });
      card.on('pointerdown',  () => { Snd.init(); this._go(b.m); });
      btnY += BH + BGAP;
    });

    this.add.rectangle(RP + RW / 2, btnY + 4, RW, 1, 0x1a3322, 0.5).setOrigin(0.5, 0).setDepth(5);
    btnY += 14;

    const SEC = [
      { l: 'DATA_SHOP',       sub: './shop.exe',       c: '#bb88ff', bg: 0x110022, m: 'shop'     },
      { l: 'SIGNAL_CODEX',    sub: 'cat /lore/',        c: '#ff9944', bg: 0x110a00, m: 'codex'    },
      { l: 'NETWORK_UPGRADES',sub: './meta.sh',         c: '#aaffdd', bg: 0x001a11, m: 'meta'     },
      { l: 'SYS_CONFIG',      sub: 'vi /etc/config',   c: '#667788', bg: 0x000c11, m: 'settings' },
    ];
    const SW = (RW - 10) / 2;
    SEC.forEach((b, i) => {
      const col = parseInt(b.c.replace('#', ''), 16);
      const bx  = RP + (i % 2) * (SW + 10);
      const by  = btnY + Math.floor(i / 2) * (38 + 6);
      const card = this.add.rectangle(bx, by, SW, 38, b.bg, 0.95).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(5);
      this.add.rectangle(bx, by, SW, 38).setStrokeStyle(1, col, 0.25).setOrigin(0, 0).setDepth(5);
      this.add.rectangle(bx, by, 3, 38, col, 0.5).setOrigin(0, 0).setDepth(5);
      const lbl = this.add.text(bx + 10, by + 8,  b.l,   { fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: b.c }).setDepth(5);
      this.add.text(bx + 10, by + 24, b.sub, { fontFamily: mono, fontSize: '10px', color: '#224433' }).setDepth(5);
      card.on('pointerover', () => { card.setFillStyle(col, 0.12); lbl.setColor('#ffffff'); this._spawnButtonPulse(bx, by, SW, 38, col); });
      card.on('pointerout',  () => { card.setFillStyle(b.bg, 0.95); lbl.setColor(b.c); });
      card.on('pointerdown', () => { Snd.init(); this._go(b.m); });
    });
    btnY += 2 * (38 + 6) + 12;

    this.add.rectangle(RP + RW / 2, btnY, RW, 1, 0x1a3322, 0.5).setOrigin(0.5, 0).setDepth(5);
    btnY += 12;

    // Difficulty
    this.add.text(RP, btnY, '// DIFFICULTY', { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);
    btnY += 14;
    const diffs = ['packet', 'daemon', 'kernel'];
    const dCols  = { packet: '#00cc66', daemon: '#ffdd00', kernel: '#ff4444' };
    const dDescs = { packet: 'Easy',    daemon: 'Normal',   kernel: 'Hard ×1.5' };
    let curDiff = Settings.get('difficulty') || 'daemon';
    const dBtns = {};
    const dW = (RW - 16) / 3;
    diffs.forEach((d, i) => {
      const col = parseInt(dCols[d].replace('#', ''), 16);
      const act = curDiff === d;
      const dx  = RP + i * (dW + 8);
      const bg     = this.add.rectangle(dx, btnY, dW, 36, act ? col : 0x000000, act ? 0.22 : 0.8).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(5);
      const border = this.add.rectangle(dx, btnY, dW, 36).setStrokeStyle(1, col, act ? 0.9 : 0.2).setOrigin(0, 0).setDepth(5);
      const bt = this.add.text(dx + dW / 2, btnY + 10, d.toUpperCase(), { fontFamily: mono, fontSize: '11px', fontStyle: act ? 'bold' : 'normal', color: act ? dCols[d] : '#224433' }).setOrigin(0.5, 0).setDepth(5);
      const ds = this.add.text(dx + dW / 2, btnY + 24, dDescs[d],      { fontFamily: mono, fontSize: '9px',  color: act ? dCols[d] : '#224433' }).setOrigin(0.5, 0).setDepth(5);
      dBtns[d] = { bg, border, bt, ds };
      bg.on('pointerover', () => { bg.setFillStyle(col, 0.35); bt.setColor('#ffffff'); });
      bg.on('pointerout',  () => { bg.setFillStyle(curDiff === d ? col : 0x000000, curDiff === d ? 0.22 : 0.8); bt.setColor(curDiff === d ? dCols[d] : '#224433'); });
      bg.on('pointerdown', () => {
        curDiff = d; Settings.set('difficulty', d);
        diffs.forEach(k => {
          const kc = parseInt(dCols[k].replace('#', ''), 16), ka = curDiff === k;
          dBtns[k].bg.setFillStyle(ka ? kc : 0x000000, ka ? 0.22 : 0.8);
          dBtns[k].border.setStrokeStyle(1, kc, ka ? 0.9 : 0.2);
          dBtns[k].bt.setColor(ka ? dCols[k] : '#224433').setFontStyle(ka ? 'bold' : 'normal');
          dBtns[k].ds.setColor(ka ? dCols[k] : '#224433');
        });
      });
    });

    // Leaderboard
    const lbTop = btnY + 36 + 20;
    this.add.rectangle(RP, lbTop, RW, 1, 0x1a3322, 0.4).setOrigin(0, 0).setDepth(5);
    this.add.text(RP, lbTop + 8, '// TOP_PROCESSES', { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);
    const lb = Save.lb().slice(0, 8);
    if (lb.length > 0) {
      this.add.text(RP, lbTop + 24, '  #   SCORE      WAVE   MODE     DIFF', { fontFamily: mono, fontSize: '10px', color: '#1a4422' }).setDepth(5);
      this.add.rectangle(RP, lbTop + 36, RW, 1, 0x0d2211, 0.8).setOrigin(0, 0).setDepth(5);
      lb.forEach((e, i) => {
        const y = lbTop + 42 + i * 22;
        const isTop = i === 0;
        if (isTop) this.add.rectangle(RP, y, RW, 20, 0x001a0a, 0.8).setOrigin(0, 0).setDepth(5);
        const rank  = isTop ? '►' : ` ${i + 1}`;
        const score = String(e.score || 0).padStart(8, ' ');
        const wave  = `W${String(e.wave || 0).padStart(2, '0')}`;
        const mode  = (e.mode || 'NORM').toUpperCase().slice(0, 4).padEnd(4, ' ');
        const diff  = (e.diff || e.difficulty || '??').toUpperCase().slice(0, 6);
        const col   = isTop ? '#00cc66' : i < 3 ? '#224433' : '#162214';
        this.add.text(RP + 4, y + 2, `${rank}  ${score}   ${wave}    ${mode}   ${diff}`, { fontFamily: mono, fontSize: '11px', color: col }).setDepth(5);
        if (i < lb.length - 1) this.add.rectangle(RP, y + 20, RW, 1, 0x0a1a0a, 0.5).setOrigin(0, 0).setDepth(5);
      });
    } else {
      this.add.text(RP + RW / 2, lbTop + 60, 'no runs recorded',          { fontFamily: mono, fontSize: '11px', color: '#2d6644' }).setOrigin(0.5).setDepth(5);
      this.add.text(RP + RW / 2, lbTop + 78, 'initialize a session to begin', { fontFamily: mono, fontSize: '10px', color: '#33cc66' }).setOrigin(0.5).setDepth(5);
    }

    // Bottom ticker
    const tickMsg = 'SIGNAL LOST — ROGUE AI CONTAINMENT PROTOCOL  ·  HOLD MOUSE TO DEPLOY WARP BUBBLE  ·  REFLECT BULLETS  ·  CHAIN REACTIONS MULTIPLY SCORE  ·  EARN DATA SHARDS  ·  ';
    this.add.rectangle(W / 2, H - 12, W, 22, 0x000000, 0.92).setOrigin(0.5).setDepth(5);
    this.add.rectangle(W / 2, H - 23, W, 1, 0x003322, 0.4).setOrigin(0.5).setDepth(5);
    const ticker = this.add.text(W + 100, H - 12, tickMsg, { fontFamily: mono, fontSize: '9px', color: '#2d6644' }).setOrigin(0, 0.5).setDepth(5);
    this.tweens.add({ targets: ticker, x: -ticker.width - 100, duration: tickMsg.length * 110, repeat: -1, ease: 'Linear' });

    // Quit
    const quitBtn = this.add.text(W - 20, H - 34, '[ QUIT_PROCESS ]', { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#aa2233' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(6);
    quitBtn.on('pointerover', () => quitBtn.setColor('#ff2244'));
    quitBtn.on('pointerout',  () => quitBtn.setColor('#aa2233'));
    quitBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        try { window.close(); } catch {}
        this.cameras.main.fadeIn(200, 0, 0, 0);
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.97).setDepth(50);
        this.add.text(W / 2, H / 2 - 16, '> PROCESS TERMINATED', { fontFamily: mono, fontSize: '18px', fontStyle: 'bold', color: '#ff2244', letterSpacing: 4 }).setOrigin(0.5).setDepth(51);
        this.add.text(W / 2, H / 2 + 18, 'close this tab to exit', { fontFamily: mono, fontSize: '11px', color: '#cc4444' }).setOrigin(0.5).setDepth(51);
      });
    });

    // Track mouse
    this.input.on('pointermove', p => { this._mx = p.x; this._my = p.y; });

    // Wake handler
    this.events.on('wake', () => {
      try { CRT.suppress = false; document.body.style.cursor = 'none'; } catch {}
      this.cameras.main.fadeIn(200, 0, 0, 0);
    });

    // DEV unlock
    this._devBuffer = '';
    this.input.keyboard.on('keydown', e => {
      this._devBuffer = (this._devBuffer + e.key.toLowerCase()).slice(-3);
      if (this._devBuffer === 'dev') { this._devBuffer = ''; this.cameras.main.fadeOut(300, 0, 0, 0); this.time.delayedCall(300, () => this.scene.start('DevScene')); }
    });
  }

  // ── Spawn a grid pulse ──
  _spawnPulse() {
    // Random grid line segment — vertical or horizontal
    const horiz = Math.random() > 0.5;
    const pos   = Math.floor(Math.random() * (horiz ? H / 80 : W / 80)) * 80;
    this._pulses.push({
      horiz, pos,
      t: 0, dur: 1.2 + Math.random() * 0.8,
      col: Math.random() > 0.7 ? 0x00ff66 : 0x003322,
      len: 60 + Math.random() * 100,
      spd: 150 + Math.random() * 100,
      x: horiz ? -20 : pos,
      y: horiz ? pos : -20,
    });
  }

  // ── Spawn a drifting data particle ──
  _spawnParticle() {
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    if (side === 0) { x = Math.random() * W; y = -10; vx = (Math.random()-0.5)*20; vy = 15+Math.random()*25; }
    else if (side === 1) { x = W+10; y = Math.random()*H; vx = -(15+Math.random()*25); vy = (Math.random()-0.5)*20; }
    else if (side === 2) { x = Math.random()*W; y = H+10; vx = (Math.random()-0.5)*20; vy = -(15+Math.random()*25); }
    else { x = -10; y = Math.random()*H; vx = 15+Math.random()*25; vy = (Math.random()-0.5)*20; }
    this._particles.push({ x, y, vx, vy, life: 1, col: Math.random() > 0.3 ? 0x003322 : 0x00cc66, size: 2 + Math.random() * 3 });
  }

  // ── Spawn button hover pulse — rectangular sweep along border ──
  _spawnButtonPulse(x, y, w, h, col) {
    this._btnPulses = this._btnPulses || [];
    this._btnPulses.push({ x, y, w, h, col, t: 0, dur: 0.5 });
  }

  // ── Draw ship based on skin ──
  _drawShip(g, t, x, y, skin, col, scale = 1) {
    const rot = t * 0.6;
    const sc  = col;
    const sz  = 18 * scale;

    // Subtle mouse attraction — ship tilts slightly toward cursor
    const dx = (this._mx - x) / W * 6;
    const dy = (this._my - y) / H * 6;

    // Outer glow — reacts to mouse proximity
    const dist = Math.hypot(this._mx - x, this._my - y);
    const glowA = 0.08 + 0.06 * Math.sin(t * 3) + Math.max(0, (200 - dist) / 200) * 0.1;
    g.fillStyle(sc, glowA); g.fillCircle(x + dx * 0.3, y + dy * 0.3, sz * 3.5);

    if (skin === 'ranger') {
      g.lineStyle(1, sc, 0.2); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI/3)*s; s===0?g.moveTo(x+Math.cos(a)*sz*1.6+dx,y+Math.sin(a)*sz*1.6+dy):g.lineTo(x+Math.cos(a)*sz*1.6+dx,y+Math.sin(a)*sz*1.6+dy); }
      g.closePath(); g.strokePath();
      g.fillStyle(sc, 0.9); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot+(Math.PI/3)*s; s===0?g.moveTo(x+Math.cos(a)*sz+dx,y+Math.sin(a)*sz+dy):g.lineTo(x+Math.cos(a)*sz+dx,y+Math.sin(a)*sz+dy); }
      g.closePath(); g.fillPath();
      g.lineStyle(1, 0xffffff, 0.2);
      for (let s = 0; s < 6; s++) { const a = t*-0.5+(Math.PI/3)*s; g.beginPath(); g.moveTo(x+dx,y+dy); g.lineTo(x+Math.cos(a)*sz*0.65+dx,y+Math.sin(a)*sz*0.65+dy); g.strokePath(); }

    } else if (skin === 'phantom') {
      const h = sz * 1.4, w = sz * 0.7;
      g.fillStyle(sc, 0.85); g.beginPath();
      g.moveTo(x+dx,y+dy-h); g.lineTo(x+w+dx,y+dy); g.lineTo(x+dx,y+dy+h); g.lineTo(x-w+dx,y+dy);
      g.closePath(); g.fillPath();
      g.lineStyle(1.5, sc, 0.5); g.beginPath();
      g.moveTo(x+dx,y+dy-h); g.lineTo(x+w+dx,y+dy); g.lineTo(x+dx,y+dy+h); g.lineTo(x-w+dx,y+dy);
      g.closePath(); g.strokePath();
      const ir = t * -1.2;
      g.lineStyle(1, sc, 0.3); g.beginPath();
      g.moveTo(x+Math.cos(ir)*sz*0.6+dx,y+Math.sin(ir)*sz*0.6+dy);
      g.lineTo(x+Math.cos(ir+Math.PI/2)*sz*0.4+dx,y+Math.sin(ir+Math.PI/2)*sz*0.4+dy);
      g.lineTo(x+Math.cos(ir+Math.PI)*sz*0.6+dx,y+Math.sin(ir+Math.PI)*sz*0.6+dy);
      g.lineTo(x+Math.cos(ir+Math.PI*1.5)*sz*0.4+dx,y+Math.sin(ir+Math.PI*1.5)*sz*0.4+dy);
      g.closePath(); g.strokePath();

    } else if (skin === 'inferno') {
      const sr = t*2.2, r1=sz, r2=sz*0.5;
      g.fillStyle(sc, 0.9); g.beginPath();
      for (let s=0;s<8;s++){const a=sr+(Math.PI/4)*s;const r=s%2===0?r1:r2;s===0?g.moveTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy):g.lineTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy);}
      g.closePath(); g.fillPath();
      g.lineStyle(1.5, 0xff4400, 0.4); g.strokeCircle(x+dx, y+dy, sz*1.4);

    } else if (skin === 'core') {
      g.lineStyle(3, sc, 0.8); g.beginPath();
      for (let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;s===0?g.moveTo(x+Math.cos(a)*sz*1.3+dx,y+Math.sin(a)*sz*1.3+dy):g.lineTo(x+Math.cos(a)*sz*1.3+dx,y+Math.sin(a)*sz*1.3+dy);}
      g.closePath(); g.strokePath();
      g.fillStyle(sc, 0.7); g.beginPath();
      for (let s=0;s<6;s++){const a=rot*-0.6+(Math.PI/3)*s;s===0?g.moveTo(x+Math.cos(a)*sz*0.72+dx,y+Math.sin(a)*sz*0.72+dy):g.lineTo(x+Math.cos(a)*sz*0.72+dx,y+Math.sin(a)*sz*0.72+dy);}
      g.closePath(); g.fillPath();
      for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;g.lineStyle(1,sc,0.35);g.beginPath();g.moveTo(x+Math.cos(a)*sz*0.72+dx,y+Math.sin(a)*sz*0.72+dy);g.lineTo(x+Math.cos(a)*sz*1.3+dx,y+Math.sin(a)*sz*1.3+dy);g.strokePath();}

    } else if (skin === 'ghost') {
      const hash = n => ((n*7+Math.floor(t*8)*3)%11)/11;
      g.fillStyle(sc, (0.55+0.2*Math.sin(t*3)));
      g.beginPath();
      for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;const jt=1+(hash(s)-0.5)*0.4;const r=sz*jt;s===0?g.moveTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy):g.lineTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy);}
      g.closePath(); g.fillPath();
      g.lineStyle(1, sc, 0.6); g.beginPath();
      for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;const jt=1+(hash(s+6)-0.5)*0.4;const r=sz*jt;s===0?g.moveTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy):g.lineTo(x+Math.cos(a)*r+dx,y+Math.sin(a)*r+dy);}
      g.closePath(); g.strokePath();
      g.lineStyle(1.5, sc, 0.25); g.strokeCircle(x+dx, y+dy, sz*1.4);

    } else if (skin === 'virus') {
      const sides=7;
      g.fillStyle(sc, 0.85); g.beginPath();
      for(let s=0;s<sides;s++){const a=rot+(Math.PI*2/sides)*s;const isG=s===3;const r=isG?sz+Math.sin(t*15)*sz*0.35:sz;const go=isG?(Math.random()-0.5)*3:0;s===0?g.moveTo(x+Math.cos(a)*r+go+dx,y+Math.sin(a)*r+dy):g.lineTo(x+Math.cos(a)*r+go+dx,y+Math.sin(a)*r+dy);}
      g.closePath(); g.fillPath();
      g.lineStyle(1, 0xff0000, 0.5); g.beginPath(); g.moveTo(x+dx,y+dy); g.lineTo(x+Math.cos(rot+0.8)*sz+dx,y+Math.sin(rot+0.8)*sz+dy); g.strokePath();
      g.lineStyle(1, 0x00ff44, 0.4); g.beginPath(); g.moveTo(x+dx,y+dy); g.lineTo(x+Math.cos(rot+2.9)*sz*0.85+dx,y+Math.sin(rot+2.9)*sz*0.85+dy); g.strokePath();
      g.lineStyle(1, 0x00ff44, 0.12+0.08*Math.sin(t*5)); g.strokeCircle(x+dx, y+dy, sz*1.4+Math.sin(t*3)*3);
    }

    // Core white dot
    g.fillStyle(0xffffff, 0.7+0.3*Math.sin(t*6)); g.fillCircle(x+dx*0.5, y+dy*0.5, 3*scale);
  }

  update(_, delta) {
    const dt = delta / 1000;
    this.t += dt;
    const t = this.t;

    // ── Lore scroll ──
    if (this._loreLines) {
      const spd = 18;
      this._loreLines.forEach(lt => { lt.y -= spd * dt; });
      const lastY = this._loreLines.reduce((m, l) => Math.max(m, l.y), -99999);
      if (lastY < 375 - 20) {
        const baseY = 375 + (H - 375 - 30) + 10;
        let ry = baseY;
        this._loreLines.forEach(lt => { lt.y = ry; ry += 13; });
      }
    }

    // ── Background FX ──
    const bg = this._bgGfx;
    bg.clear();

    // Animated grid nodes — light up at intersections
    bg.fillStyle(0x00cc66, 0.12 + 0.06 * Math.sin(t * 0.7));
    for (let gx = 80; gx < W; gx += 80) {
      for (let gy = 80; gy < H; gy += 80) {
        const pulse = Math.sin(t * 1.2 + gx * 0.02 + gy * 0.015);
        if (pulse > 0.7) {
          bg.fillStyle(0x00cc66, (pulse - 0.7) * 0.4);
          bg.fillCircle(gx, gy, 2.5);
        }
      }
    }

    // Grid pulses — bright dots travelling along lines
    for (let i = this._pulses.length - 1; i >= 0; i--) {
      const p = this._pulses[i];
      p.t += dt;
      const prog = p.t / p.dur;
      if (prog >= 1) { this._pulses.splice(i, 1); continue; }
      const a = Math.sin(prog * Math.PI) * 0.7;
      if (p.horiz) {
        const px = p.x + p.spd * p.t;
        bg.fillStyle(p.col, a); bg.fillRect(px, p.pos - 1, p.len * 0.3, 2);
        bg.fillStyle(0x00ff66, a * 0.5); bg.fillCircle(px + p.len * 0.3, p.pos, 3);
      } else {
        const py = p.y + p.spd * p.t;
        bg.fillStyle(p.col, a); bg.fillRect(p.pos - 1, py, 2, p.len * 0.3);
        bg.fillStyle(0x00ff66, a * 0.5); bg.fillCircle(p.pos, py + p.len * 0.3, 3);
      }
    }

    // ── FX layer — hex rings + corruption zones ──
    const fx = this._fxGfx;
    fx.clear();

    // Corruption zones
    this._corruptZones.forEach(z => {
      z.x += z.vx * dt; z.y += z.vy * dt;
      if (z.x < -100) z.x = W + 100;
      if (z.x > W + 100) z.x = -100;
      if (z.y < -100) z.y = H + 100;
      if (z.y > H + 100) z.y = -100;
      const pulse = z.a + 0.01 * Math.sin(t * 2 + z.phase);
      fx.fillStyle(0x001100, pulse * 0.5);
      fx.fillCircle(z.x, z.y, z.r);
      fx.lineStyle(1, 0x003322, pulse * 0.4);
      fx.strokeCircle(z.x, z.y, z.r);
    });

    // Hex rings
    for (let i = this._hexRings.length - 1; i >= 0; i--) {
      const r = this._hexRings[i];
      r.r += r.spd * dt;
      r.a  = Math.max(0, r.a - dt * 0.5);
      if (r.r >= r.maxR || r.a <= 0) { this._hexRings.splice(i, 1); continue; }
      fx.lineStyle(1.5, r.col, r.a);
      fx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (Math.PI / 3) * s;
        if (s === 0) fx.moveTo(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r);
        else fx.lineTo(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r);
      }
      fx.closePath(); fx.strokePath();
    }

    // ── Button pulses — rect border sweep ──
    this._btnPulses = this._btnPulses || [];
    for (let i = this._btnPulses.length - 1; i >= 0; i--) {
      const p = this._btnPulses[i];
      p.t += dt;
      if (p.t >= p.dur) { this._btnPulses.splice(i, 1); continue; }
      const prog = p.t / p.dur;
      const a = (1 - prog) * 0.7;
      const expand = prog * 10;
      fx.lineStyle(1.5, p.col, a);
      fx.strokeRect(p.x - expand, p.y - expand, p.w + expand * 2, p.h + expand * 2);
      // Bright corner dots
      fx.fillStyle(p.col, a);
      [[p.x - expand, p.y - expand],[p.x + p.w + expand, p.y - expand],
       [p.x - expand, p.y + p.h + expand],[p.x + p.w + expand, p.y + p.h + expand]
      ].forEach(([cx2, cy2]) => fx.fillCircle(cx2, cy2, 3));
    }

    // ── Particles ──
    const pt = this._ptGfx;
    pt.clear();
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      // Off screen = respawn
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        this._particles.splice(i, 1);
        this._spawnParticle();
        continue;
      }
      pt.fillStyle(p.col, 0.4);
      pt.fillRect(p.x, p.y, p.size, p.size);
    }

    // ── Title glitch ──
    this._glitchT += dt;
    if (this._titleMain && this._titleR) {
      if (!this._glitchActive && this._glitchT > 3.5) {
        this._glitchActive = true;
        this._glitchT = 0;
        this._titleMain.setColor('#ff2244');
        this._titleR.setAlpha(0.6);
        this.time.delayedCall(60,  () => { if (this._titleMain) this._titleMain.setColor('#00ff66'); });
        this.time.delayedCall(130, () => { if (this._titleMain) { this._titleMain.setColor('#ff2244'); this._titleR.setAlpha(0.8); } });
        this.time.delayedCall(200, () => { if (this._titleMain) { this._titleMain.setColor('#00ff66'); this._titleR.setAlpha(0.35); this._glitchActive = false; } });
      }
    }

    // ── Ship preview ──
    const sg = this._shipGfx;
    sg.clear();
    this._drawShip(sg, t, this._shipX, this._shipY, this._shipSkin, this._shipColor, 1.6);
  }

  _go(m) {
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.scene.sleep('MenuScene');
      if (m === 'shop')     this.scene.launch('ShopScene');
      else if (m === 'codex')    this.scene.launch('CodexScene');
      else if (m === 'settings') this.scene.launch('SettingsScene', { from: 'menu' });
      else if (m === 'daily')    this.scene.launch('DailyChallengeScene');
      else if (m === 'meta')     this.scene.launch('MetaUpgradeScene');
      else {
        this.scene.stop('MenuScene');
        if (m === 'normal' || m === 'endless' || m === 'corrupted') this.scene.start('ArchetypeSelectScene', { mode: m });
        else this.scene.start('BootScene', { mode: m });
      }
    });
  }
}
