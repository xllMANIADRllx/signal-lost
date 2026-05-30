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
    // Try immediately — works in Electron (autoplayPolicy set in main.js).
    _menuAudioResume();
    // Browser/standalone fallback: any click finalises the gesture requirement.
    this.input.once('pointerdown', _menuAudioResume);
    this.input.once('pointerup',   _menuAudioResume);

    // ── First-run operator name prompt (clean save → ask once) ──
    try {
      const _opName = (typeof Save.operatorName === 'function') ? Save.operatorName() : '';
      if (!_opName) {
        // Defer slightly so MenuScene visual is up first
        setTimeout(() => this._showOperatorNamePrompt(), 200);
      }
    } catch {}

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const pid  = '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    const DIV  = W / 2 - 20;

    // ── Click to enable audio prompt — only shown if audio is still suspended
    //    (e.g. browser standalone mode without Electron's autoplay flag) ──
    if (!Snd.ctx || Snd.ctx.state !== 'running') {
      const clickPrompt = this.add.text(W / 2, H - 22, '[ CLICK ANYWHERE TO ENABLE AUDIO ]', {
        fontFamily: mono, fontSize: '10px', color: '#224433', letterSpacing: 2
      }).setOrigin(0.5).setDepth(50);
      this._clickPromptTween = this.tweens.add({ targets: clickPrompt, alpha: { from: 1, to: 0.3 }, duration: 800, yoyo: true, repeat: -1 });
      this.input.once('pointerdown', () => { try { clickPrompt.destroy(); } catch {} });
    }

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

    // ── Phase 2F: world-state stage drives grid color ──
    const _ws = (typeof WorldState !== 'undefined') ? WorldState.stage() : 0;
    const _gridCol = (typeof WORLD_GRID_COLORS !== 'undefined' && WORLD_GRID_COLORS[_ws] != null) ? WORLD_GRID_COLORS[_ws] : 0x00cc66;
    this._worldGridCol = _gridCol;

    // Static hex grid base (very faint)
    const hg = this.add.graphics().setAlpha(0.04).setDepth(0);
    hg.lineStyle(1, _gridCol, 1);
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
      scene._titlePulseTween = scene.tweens.add({ targets: title, alpha: { from: 1, to: 0.82 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
     { label: 'ARCHETYPE', val: (function(){
         try {
           const id = (typeof Save.equippedArchetype === 'function') ? Save.equippedArchetype() : 'reflector';
           const a = (typeof ARCHETYPES !== 'undefined') ? ARCHETYPES.find(x => x.id === id) : null;
           return a ? a.name : 'REFLECTOR';
         } catch { return 'REFLECTOR'; }
       })(), col: '#00ffcc', x: LP + 130 },
    ].forEach(s => {
      this.add.text(s.x, 142, s.label, { fontFamily: mono, fontSize: '10px', color: '#336644' }).setOrigin(0.5).setDepth(5);
      this.add.text(s.x, 158, s.val,   { fontFamily: orb,  fontSize: '13px', fontStyle: '700', color: s.col }).setOrigin(0.5).setDepth(5);
    });
    this.add.rectangle(LP, 174, DIV - 40, 1, 0x1a3322, 0.4).setOrigin(0.5, 0).setDepth(5);

    // ── ASCENSION strip — only shown after first wave-20 clear ──
    // Placed below stats divider as a single horizontal 25-dot row to avoid
    // overlapping the stats row above or the CONTAINMENT_LOG below.
    let _ascStripBottom = 178;
    try {
      const ascMax = Save.get('ascension_max', 0);
      if (ascMax > 0) {
        const STRIP_Y = 192;
        const DOT = 10, GAP = 2, COUNT = 25;
        const STRIP_W = COUNT * (DOT + GAP) - GAP;
        const STRIP_X = LP - STRIP_W / 2 - 30;
        this.add.text(STRIP_X, STRIP_Y - 14, '// ASCENSION', {
          fontFamily: mono, fontSize: '10px', color: '#aa8833', letterSpacing: 2
        }).setOrigin(0, 0).setDepth(5);
        for (let i = 0; i < COUNT; i++) {
          const unlocked = (i + 1) <= ascMax;
          const dx = STRIP_X + i * (DOT + GAP);
          const dot = this.add.rectangle(dx, STRIP_Y, DOT, DOT,
            unlocked ? 0xffd700 : 0x000000, unlocked ? 0.9 : 0.2)
            .setOrigin(0, 0).setStrokeStyle(1, 0xffd700, unlocked ? 0.95 : 0.3).setDepth(5);
          dot.setAngle(45);
        }
        const ascCur = Math.min(Save.get('ascension', 0), ascMax);
        this.add.text(STRIP_X + STRIP_W + 14, STRIP_Y - 2, `A${ascCur}`, {
          fontFamily: orb, fontSize: '14px', fontStyle: '900', color: '#ffd700'
        }).setOrigin(0, 0.5).setDepth(5);
        this.add.text(STRIP_X + STRIP_W + 14, STRIP_Y + 12, `MAX ${ascMax}/25`, {
          fontFamily: mono, fontSize: '9px', color: '#aa8833'
        }).setOrigin(0, 0.5).setDepth(5);
        _ascStripBottom = STRIP_Y + DOT + 8;
      }
    } catch (e) {}

    // Spawn grid pulses periodically (ambient background — kept)
    this._pulseEvent = this.time.addEvent({ delay: 800, repeat: -1, callback: () => this._spawnPulse() });

    // ══════════════════════════════════
    // CONTAINMENT LOG — live dev-console feed
    // Replaces skin showcase + packet-log scroll. Procedural lines drip in
    // every ~0.4s with random severity, addresses, sectors, etc.
    // ══════════════════════════════════
    const CON_X = DIV + 20;
    const CON_Y = Math.max(206, _ascStripBottom + 6);
    const CON_W = W - DIV - 40;
    const CON_H = H - CON_Y - 40;
    const LINE_H = 14;
    const MAX_LINES = Math.floor((CON_H - 38) / LINE_H);

    // Panel chrome
    this.add.rectangle(CON_X, CON_Y, CON_W, CON_H, 0x000000, 0.55).setOrigin(0, 0).setDepth(3);
    this.add.rectangle(CON_X, CON_Y, CON_W, 1, _gridCol, 0.4).setOrigin(0, 0).setDepth(4);
    this.add.rectangle(CON_X, CON_Y + CON_H, CON_W, 1, _gridCol, 0.4).setOrigin(0, 0).setDepth(4);
    this.add.rectangle(CON_X, CON_Y, 2, CON_H, _gridCol, 0.7).setOrigin(0, 0).setDepth(4);
    this.add.rectangle(CON_X + CON_W - 2, CON_Y, 2, CON_H, _gridCol, 0.7).setOrigin(0, 0).setDepth(4);
    const titleTxt = this.add.text(CON_X + 14, CON_Y + 10, '// CONTAINMENT_LOG', {
      fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#aa8833', letterSpacing: 2,
    }).setDepth(5);
    // Indicator dot — positioned just after the title text, not overlapping
    const liveDot = this.add.circle(CON_X + 14 + titleTxt.width + 12, CON_Y + 15, 3, 0xff4444, 1).setDepth(5);
    this._conLiveTween = this.tweens.add({ targets: liveDot, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(CON_X + 14 + titleTxt.width + 20, CON_Y + 10, 'LIVE', {
      fontFamily: mono, fontSize: '9px', color: '#ff4444',
    }).setDepth(5);
    this.add.text(CON_X + CON_W - 14, CON_Y + 10, 'tail -f /var/log/rogue_ai', {
      fontFamily: mono, fontSize: '9px', color: '#336644',
    }).setOrigin(1, 0).setDepth(5);

    // Clipping mask so long lines can't overflow the console border
    const conMaskGfx = this.add.graphics().setAlpha(0);
    conMaskGfx.fillStyle(0xffffff);
    conMaskGfx.fillRect(CON_X + 2, CON_Y + 30, CON_W - 4, CON_H - 32);
    this._conMask = conMaskGfx.createGeometryMask();

    this._conLines = [];
    this._conTopY = CON_Y + 36;
    this._conMaxLines = MAX_LINES;

    // Procedural content generator
    const rnd  = (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1));
    const hex  = (n) => Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
    const ch   = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const pad  = (n, w) => String(n).padStart(w, '0');
    const flt  = (lo, hi, dec) => (lo + Math.random() * (hi - lo)).toFixed(dec);
    const proc = () => ['SIGNAL_DECAY','PACKET_RELAY','MEMORY_TRAP','FIREWALL_BREACH','GHOST_ECHO','CHAIN_AMPLIFIER','BUBBLE_TRACER','HEAT_VENT','CRT_OVERLAY','VOID_NODE'][rnd(0, 9)];
    const node = () => 'NODE_' + ch() + rnd(1, 9);
    const sec  = () => 'SECTOR_' + pad(rnd(1, 99), 2);

    const TPL = [
      // ERR — red
      () => ({ sev: 'ERR ', c: '#ff4444', t: `0x${hex(8)} — connection lost to ${node()}` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `subprocess ${proc()} crashed: SIGSEGV at 0x${hex(8)}` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `handshake failed with ${sec()} — retry ${rnd(1, 14)}/14` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `unhandled rejection in containment.thread[${rnd(0, 3)}]` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `TypeError: Cannot read 'reflect' of null at warp_bubble.js:${rnd(100, 999)}` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `watchdog timeout — pid=${rnd(1000, 9999)} unresponsive ${rnd(5, 30)}s` }),
      () => ({ sev: 'ERR ', c: '#ff4444', t: `signal_lost.exe refused SIGTERM — escalating to SIGKILL` }),
      // WARN — amber
      () => ({ sev: 'WARN', c: '#ff8800', t: `firewall_breach: ${rnd(1, 99)} attempts blocked from ${node()}` }),
      () => ({ sev: 'WARN', c: '#ff8800', t: `subprocess ${proc()} exceeding heat threshold (${rnd(80, 99)}%)` }),
      () => ({ sev: 'WARN', c: '#ff8800', t: `memory pressure: ${rnd(70, 95)}% — auto-evicting cache` }),
      () => ({ sev: 'WARN', c: '#ff8800', t: `gravity well anomaly in ${sec()} — confidence ${rnd(60, 90)}%` }),
      () => ({ sev: 'WARN', c: '#ff8800', t: `peer audit disagreement: ${rnd(2, 4)}/${rnd(5, 9)} nodes flagged` }),
      () => ({ sev: 'WARN', c: '#ff8800', t: `stack depth approaching limit: ${rnd(900, 1024)}/1024` }),
      // CRIT — bright red, flicker
      () => ({ sev: 'CRIT', c: '#ff2244', t: `containment integrity: ${flt(95, 99, 2)}% — within margin`, flicker: true }),
      () => ({ sev: 'CRIT', c: '#ff2244', t: `KERNEL_PANIC averted — auto-recovery engaged`, flicker: true }),
      () => ({ sev: 'CRIT', c: '#ff2244', t: `rogue process detected: signal_lost.exe pid=${rnd(1000, 9999)}`, flicker: true }),
      () => ({ sev: 'CRIT', c: '#ff2244', t: `warp_bubble integrity compromised — reseeding ${rnd(1, 4)} sectors`, flicker: true }),
      () => ({ sev: 'CRIT', c: '#ff2244', t: `${sec()} containment WALL breached — emergency lockdown`, flicker: true }),
      // NET — cyan
      () => ({ sev: 'NET ', c: '#00aaff', t: `packet drop ${sec()}: ${flt(0, 1, 3)}% — within tolerance` }),
      () => ({ sev: 'NET ', c: '#00aaff', t: `${node()} unresponsive — fallback initiated` }),
      () => ({ sev: 'NET ', c: '#00aaff', t: `route reconverged: ${rnd(8, 32)} hops via ${sec()}` }),
      () => ({ sev: 'NET ', c: '#00aaff', t: `echo_protocol relay handshake — RTT ${rnd(2, 18)}ms` }),
      () => ({ sev: 'NET ', c: '#00aaff', t: `inbound: ${rnd(100, 9999)} pkts/s from ${node()} — flagged` }),
      // SYS — green
      () => ({ sev: 'SYS ', c: '#00cc66', t: `watchdog tick — uptime ${rnd(1, 99)}h ${rnd(0, 59)}m` }),
      () => ({ sev: 'SYS ', c: '#00cc66', t: `Uncaught: RogueProcess.contain() at ${sec().toLowerCase()}:${rnd(100, 999)}` }),
      () => ({ sev: 'SYS ', c: '#00cc66', t: `auto-scaling: spawning ${rnd(2, 8)} additional containment threads` }),
      () => ({ sev: 'SYS ', c: '#00cc66', t: `gc: collected ${rnd(100, 9999)} dead packets — ${rnd(10, 90)}ms` }),
      () => ({ sev: 'SYS ', c: '#00cc66', t: `mutation observed: ${proc()} adapting countermeasures` }),
    ];

    // ── Phase 2F: stage-gated templates unlocked by world progression ──
    // Each entry: { stage: N, fn: () => {sev, c, t, flicker?} }. Filtered per-emission.
    const TPL_STAGED = [
      // Stage 1 (>= 5 boss kills) — DEGRADED
      { stage: 1, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `FIREWALL.SHARD escaped containment at 0x${hex(8)}`, flicker: true }) },
      { stage: 1, fn: () => ({ sev: 'WARN', c: '#ff8800', t: `packet-leak pid=${rnd(1000,9999)} — ${sec()} compromised` }) },
      { stage: 1, fn: () => ({ sev: 'ERR ', c: '#ff4444', t: `boss-signature recurring (n=${rnd(2,9)})` }) },
      { stage: 1, fn: () => ({ sev: 'NET ', c: '#00aaff', t: `ghost-frame intercepted on bus 0x${hex(8)}` }) },
      { stage: 1, fn: () => ({ sev: 'SYS ', c: '#00cc66', t: `archive grows: ${rnd(100,999)} entries · last update ${rnd(1,99)}s` }) },
      { stage: 1, fn: () => ({ sev: 'WARN', c: '#ff8800', t: `unauthorized resurrection thread detected` }) },
      // Stage 2 (>= 20 boss kills) — CORRUPTED
      { stage: 2, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `CORE proximity alert — distance ${rnd(2,12)}m and closing`, flicker: true }) },
      { stage: 2, fn: () => ({ sev: 'ERR ', c: '#ff4444', t: `reality desync ${flt(3,18,2)}% — recalibrating` }) },
      { stage: 2, fn: () => ({ sev: 'NET ', c: '#00aaff', t: `signal originating from INSIDE the firewall` }) },
      { stage: 2, fn: () => ({ sev: 'WARN', c: '#ff8800', t: `memory bleed into ${sec()} — adjacent sectors flagged` }) },
      { stage: 2, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `we are not alone in here`, flicker: true }) },
      { stage: 2, fn: () => ({ sev: 'SYS ', c: '#00cc66', t: `pattern recognized — RETURN` }) },
      // Stage 3 (CORE.BREACH cleared) — BREACHED
      { stage: 3, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `CORE.BREACH RESEALED — leakage rate ${flt(0,4,2)}%`, flicker: true }) },
      { stage: 3, fn: () => ({ sev: 'ERR ', c: '#ff4444', t: `the core remembers you` }) },
      { stage: 3, fn: () => ({ sev: 'NET ', c: '#00aaff', t: `SIGNAL_FORGE active — broadcasting custom protocol` }) },
      { stage: 3, fn: () => ({ sev: 'WARN', c: '#ff8800', t: `child processes detected — counter ${rnd(2,9)}` }) },
      { stage: 3, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `post-breach echo: ${rnd(3,18)} iterations`, flicker: true }) },
      { stage: 3, fn: () => ({ sev: 'SYS ', c: '#00cc66', t: `run #${rnd(2,99)} — they expect you` }) },
      // Stage 4 (Ascension >= 10) — ASCENDED
      { stage: 4, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `ASCENSION TIER ${rnd(10,25)} — recursive run`, flicker: true }) },
      { stage: 4, fn: () => ({ sev: 'ERR ', c: '#ff4444', t: `are you the corruption` }) },
      { stage: 4, fn: () => ({ sev: 'NET ', c: '#00aaff', t: `upstream sender unidentified — auth bypassed` }) },
      { stage: 4, fn: () => ({ sev: 'WARN', c: '#ff8800', t: `pattern-match: self` }) },
      { stage: 4, fn: () => ({ sev: 'CRIT', c: '#ff2244', t: `the loop closes`, flicker: true }) },
      { stage: 4, fn: () => ({ sev: 'SYS ', c: '#00cc66', t: `iteration ${rnd(11,25)}/25` }) },
    ];

    const pushLine = () => {
      // Re-evaluate world stage per emission (cheap — Save reads are O(1)) so the feed reflects
      // progression instantly on return to menu after a CORE.BREACH kill or ascension unlock.
      const _stage = (typeof WorldState !== 'undefined') ? WorldState.stage() : 0;
      const _gated = TPL_STAGED.filter(s => s.stage <= _stage).map(s => s.fn);
      const _pool = TPL.concat(_gated);
      const tpl = _pool[Math.floor(Math.random() * _pool.length)]();
      const ts = `${pad(rnd(0, 23), 2)}:${pad(rnd(0, 59), 2)}:${pad(rnd(0, 59), 2)}`;
      const text = `[${ts}] [${tpl.sev}] ${tpl.t}`;
      this._conLines.forEach(ln => { ln.txt.y += LINE_H; });
      const txt = this.add.text(CON_X + 14, this._conTopY, text, {
        fontFamily: mono, fontSize: '10px', color: tpl.c,
      }).setDepth(5);
      if (this._conMask) txt.setMask(this._conMask);
      if (tpl.flicker) {
        this.tweens.add({ targets: txt, alpha: 0.45, duration: 90, yoyo: true, repeat: 3 });
      }
      this._conLines.unshift({ txt, sev: tpl.sev });
      while (this._conLines.length > this._conMaxLines) {
        const old = this._conLines.pop();
        try { old.txt.destroy(); } catch {}
      }
    };

    // Pre-seed so it doesn't open empty
    for (let i = 0; i < Math.min(this._conMaxLines, 10); i++) pushLine();
    this._conTickEvent = this.time.addEvent({ delay: 400, repeat: -1, callback: pushLine });

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
      card.on('pointerdown',  () => { Snd.init(); try { Snd.play('powerup'); } catch {} this._go(b.m); });
      btnY += BH + BGAP;
    });

    this.add.rectangle(RP + RW / 2, btnY + 4, RW, 1, 0x1a3322, 0.5).setOrigin(0.5, 0).setDepth(5);
    btnY += 14;

    const _forgeUnlocked = (typeof Save.forgeUnlocked === 'function') && Save.forgeUnlocked();
    const SEC = [
      { l: 'DATA_SHOP',       sub: './shop.exe',       c: '#bb88ff', bg: 0x110022, m: 'shop'         },
      { l: 'NETWORK_UPGRADES',sub: './meta.sh',         c: '#aaffdd', bg: 0x001a11, m: 'meta'         },
      { l: 'SYS_CONFIG',      sub: 'vi /etc/config',   c: '#667788', bg: 0x000c11, m: 'settings'     },
      { l: 'MISSION_LOG',     sub: 'cat achievements/', c: '#ffdd44', bg: 0x111000, m: 'achievements' },
      { l: 'SIGNAL_FORGE',    sub: _forgeUnlocked ? './forge.exe' : 'LOCKED — defeat CORE.BREACH', c: '#cc44ff', bg: 0x190a22, m: 'forge', locked: !_forgeUnlocked },
    ];
    const SW = (RW - 10) / 2;
    SEC.forEach((b, i) => {
      const col = parseInt(b.c.replace('#', ''), 16);
      // 5th item spans full width, centred
      const isLast = i === 4;
      const bx  = isLast ? RP : RP + (i % 2) * (SW + 10);
      const bw  = isLast ? RW : SW;
      const by  = btnY + Math.floor(i / 2) * (38 + 6);
      const card = this.add.rectangle(bx, by, bw, 38, b.bg, 0.95).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(5);
      this.add.rectangle(bx, by, bw, 38).setStrokeStyle(1, col, 0.25).setOrigin(0, 0).setDepth(5);
      this.add.rectangle(bx, by, 3, 38, col, 0.5).setOrigin(0, 0).setDepth(5);
      const lbl = this.add.text(bx + 10, by + 8,  b.l,   { fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: b.c }).setDepth(5);
      this.add.text(bx + 10, by + 24, b.sub, { fontFamily: mono, fontSize: '10px', color: '#224433' }).setDepth(5);
      // Locked buttons (e.g. signal_forge before CORE.BREACH kill) — dim look + denied click
      if(b.locked){
        card.setFillStyle(b.bg, 0.6);
        lbl.setColor('#664488');
      }
      card.on('pointerover', () => { if(b.locked){ card.setFillStyle(0x442266, 0.4); } else { card.setFillStyle(col, 0.12); lbl.setColor('#ffffff'); this._spawnButtonPulse(bx, by, bw, 38, col); } });
      card.on('pointerout',  () => { if(b.locked){ card.setFillStyle(b.bg, 0.6); } else { card.setFillStyle(b.bg, 0.95); lbl.setColor(b.c); } });
      card.on('pointerdown', () => {
        Snd.init();
        try{Snd.play('powerup');}catch{}
        if(b.locked){
          this.banner && this.banner.show('SIGNAL_FORGE LOCKED', '#cc44ff', 1400, 'DEFEAT CORE.BREACH ON WAVE 20 TO UNLOCK');
          return;
        }
        this._go(b.m);
      });
    });
    btnY += 3 * (38 + 6) + 12;

    this.add.rectangle(RP + RW / 2, btnY, RW, 1, 0x1a3322, 0.5).setOrigin(0.5, 0).setDepth(5);
    btnY += 12;

    // Difficulty
    this.add.text(RP, btnY, '// DIFFICULTY', { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);
    btnY += 14;
    const diffs = ['packet', 'daemon', 'kernel'];
    const dCols  = { packet: '#00cc66', daemon: '#ffdd00', kernel: '#ff4444' };
    const dDescs = { packet: 'Easy · 0 mut',    daemon: 'Normal · 1 mut',   kernel: 'Hard · 2 mut' };
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
        try { Snd.play('powerup'); } catch {}
        curDiff = d; Settings.set('difficulty', d);
        diffs.forEach(k => {
          const kc = parseInt(dCols[k].replace('#', ''), 16), ka = curDiff === k;
          dBtns[k].bg.setFillStyle(ka ? kc : 0x000000, ka ? 0.22 : 0.8);
          dBtns[k].border.setStrokeStyle(1, kc, ka ? 0.9 : 0.2);
          dBtns[k].bt.setColor(ka ? dCols[k] : '#224433').setFontStyle(ka ? 'bold' : 'normal');
          dBtns[k].ds.setColor(ka ? dCols[k] : '#224433');
        });
        this._showDifficultyModal(d);
      });
    });

    // Leaderboard
    const lbTop = btnY + 36 + 20;
    this.add.rectangle(RP, lbTop, RW, 1, 0x1a3322, 0.4).setOrigin(0, 0).setDepth(5);
    // Header: title + scroll hint + operator-name display
    const _opName = (typeof Save.operatorName === 'function') ? Save.operatorName() : '';
    this.add.text(RP, lbTop + 8, '// TOP_PROCESSES', { fontFamily: mono, fontSize: '10px', color: '#336644' }).setDepth(5);
    if (_opName) {
      this.add.text(RP + RW, lbTop + 8, `OPERATOR: ${_opName}`, { fontFamily: mono, fontSize: '10px', color: '#00aa66' }).setOrigin(1, 0).setDepth(5);
    }
    const lb = Save.lb();
    if (lb.length > 0) {
      // ── Column header (fixed, above scrollable area) ──
      const HEAD_Y = lbTop + 24;
      // Columns: rank · NAME · SCORE · WAVE · ARCH · DIFF · ASC · MODE · DATE
      this.add.text(RP + 4,   HEAD_Y, '#',     { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 22,  HEAD_Y, 'NAME',  { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 110, HEAD_Y, 'SCORE', { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 178, HEAD_Y, 'WAV',   { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 208, HEAD_Y, 'ARCH',  { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 268, HEAD_Y, 'DIF',   { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 296, HEAD_Y, 'ASC',   { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + 326, HEAD_Y, 'MODE',  { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setDepth(5);
      this.add.text(RP + RW - 4, HEAD_Y, 'DATE', { fontFamily: mono, fontSize: '9px', color: '#1a4422', letterSpacing: 1 }).setOrigin(1, 0).setDepth(5);
      this.add.rectangle(RP, HEAD_Y + 12, RW, 1, 0x0d2211, 0.8).setOrigin(0, 0).setDepth(5);

      // ── Scrollable rows ──
      const ROW_H = 18;
      const LIST_TOP = HEAD_Y + 18;
      const LIST_H = Math.max(ROW_H * 5, H - LIST_TOP - 40); // viewport height
      const VISIBLE = Math.floor(LIST_H / ROW_H);

      // Mask rectangle (defines visible window)
      const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
      maskShape.fillRect(RP, LIST_TOP, RW, LIST_H);
      const mask = maskShape.createGeometryMask();

      // Container holds all rows; we shift its y to scroll
      const listC = this.add.container(0, 0).setDepth(5);
      listC.setMask(mask);
      this._lbListContainer = listC;
      this._lbScrollY = 0;
      this._lbMaxScroll = Math.max(0, lb.length * ROW_H - LIST_H);

      const ARCH_SHORT = { reflector:'REF', corruptor:'COR', ghost:'GHO', overclocker:'OVR', fortress:'FRT', storm:'STM', rogue:'ROG', signal_forge:'SFG' };
      const DIFF_LETTER = { packet:'P', daemon:'D', kernel:'K' };
      const MODE_SHORT = { normal:'NRM', daily:'DLY', endless:'END', corrupted:'COR', dev:'SBX' };

      const _ago = (ts) => {
        if (!ts) return '—';
        const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (sec < 60) return sec + 's';
        if (sec < 3600) return Math.floor(sec / 60) + 'm';
        if (sec < 86400) return Math.floor(sec / 3600) + 'h';
        if (sec < 86400 * 7) return Math.floor(sec / 86400) + 'd';
        if (sec < 86400 * 30) return Math.floor(sec / 86400 / 7) + 'w';
        return Math.floor(sec / 86400 / 30) + 'mo';
      };

      lb.forEach((e, i) => {
        const y = LIST_TOP + i * ROW_H;
        const isTop3 = i < 3;
        // Row background — alternating + top-3 highlight
        const bgCol = (i === 0) ? 0x00220a : (i === 1) ? 0x111a08 : (i === 2) ? 0x100808 : (i % 2 === 0 ? 0x050a07 : 0x000503);
        const bgA  = (i === 0) ? 0.85 : 0.5;
        listC.add(this.add.rectangle(RP, y, RW, ROW_H, bgCol, bgA).setOrigin(0, 0));
        // Color ramp: gold/silver/bronze for top 3, dim green for the rest
        const rowCol = i === 0 ? '#ffd700' : i === 1 ? '#cccccc' : i === 2 ? '#cc8844' : i < 8 ? '#88aa66' : '#446644';
        const rankIcon = i === 0 ? '★' : i === 1 ? '✦' : i === 2 ? '◆' : ` ${i + 1}`;
        const nm = ((e.name || 'ANON') + '').slice(0, 10).padEnd(10, ' ');
        const sc = String(e.score || 0).padStart(7, ' ');
        const wv = `W${String(e.wave || 0).padStart(2, '0')}`;
        const ar = ARCH_SHORT[e.archetype] || 'REF';
        const df = DIFF_LETTER[e.diff || e.difficulty || 'daemon'] || 'D';
        const asc = `A${e.ascension || 0}`;
        const md = MODE_SHORT[e.mode] || 'NRM';
        const dt = _ago(e.date);
        // Use individual texts per column so spacing stays tidy regardless of name width
        listC.add(this.add.text(RP + 4,   y + 4, String(rankIcon), { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: rowCol }));
        listC.add(this.add.text(RP + 22,  y + 4, nm,               { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + 110, y + 4, sc,               { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: rowCol }));
        listC.add(this.add.text(RP + 178, y + 4, wv,               { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + 208, y + 4, ar,               { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + 272, y + 4, df,               { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + 296, y + 4, asc,              { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + 326, y + 4, md,               { fontFamily: mono, fontSize: '10px', color: rowCol }));
        listC.add(this.add.text(RP + RW - 4, y + 4, dt,            { fontFamily: mono, fontSize: '10px', color: rowCol }).setOrigin(1, 0));
      });

      // Scroll indicator (right-edge sliver) — only if there's overflow
      if (this._lbMaxScroll > 0) {
        const SCROLL_W = 3;
        const SCROLL_X = RP + RW + 4;
        this.add.rectangle(SCROLL_X, LIST_TOP, SCROLL_W, LIST_H, 0x0a1a0a, 0.6).setOrigin(0, 0).setDepth(6);
        const thumbH = Math.max(20, LIST_H * (LIST_H / (lb.length * ROW_H)));
        this._lbScrollThumb = this.add.rectangle(SCROLL_X, LIST_TOP, SCROLL_W, thumbH, 0x00cc66, 0.85).setOrigin(0, 0).setDepth(7);

        // Wheel handler
        this._lbWheelHandler = (pointer, currentlyOver, dx, dy, dz) => {
          // Only scroll if pointer is inside the leaderboard area
          if (pointer.x < RP || pointer.x > RP + RW + 20) return;
          if (pointer.y < LIST_TOP || pointer.y > LIST_TOP + LIST_H) return;
          this._lbScrollY = Math.max(0, Math.min(this._lbMaxScroll, this._lbScrollY + dy));
          listC.y = -this._lbScrollY;
          // Update thumb position
          const scrollFrac = this._lbScrollY / this._lbMaxScroll;
          this._lbScrollThumb.y = LIST_TOP + scrollFrac * (LIST_H - thumbH);
        };
        this.input.on('wheel', this._lbWheelHandler);
      }
    } else {
      this.add.text(RP + RW / 2, lbTop + 60, 'no runs recorded',          { fontFamily: mono, fontSize: '11px', color: '#2d6644' }).setOrigin(0.5).setDepth(5);
      this.add.text(RP + RW / 2, lbTop + 78, 'initialize a session to begin', { fontFamily: mono, fontSize: '10px', color: '#33cc66' }).setOrigin(0.5).setDepth(5);
    }

    // Bottom ticker
    const tickMsg = 'SIGNAL LOST — ROGUE AI CONTAINMENT PROTOCOL  ·  HOLD MOUSE TO DEPLOY WARP BUBBLE  ·  REFLECT BULLETS  ·  CHAIN REACTIONS MULTIPLY SCORE  ·  EARN DATA SHARDS  ·  ';
    this.add.rectangle(W / 2, H - 12, W, 22, 0x000000, 0.92).setOrigin(0.5).setDepth(5);
    this.add.rectangle(W / 2, H - 23, W, 1, 0x003322, 0.4).setOrigin(0.5).setDepth(5);
    const ticker = this.add.text(W + 100, H - 12, tickMsg, { fontFamily: mono, fontSize: '9px', color: '#2d6644' }).setOrigin(0, 0.5).setDepth(5);
    this._loreTickerTween = this.tweens.add({ targets: ticker, x: -ticker.width - 100, duration: tickMsg.length * 110, repeat: -1, ease: 'Linear' });

    // Quit
    const quitBtn = this.add.text(W - 20, H - 34, '[ QUIT_PROCESS ]', { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: '#aa2233' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(6);
    quitBtn.on('pointerover', () => quitBtn.setColor('#ff2244'));
    quitBtn.on('pointerout',  () => quitBtn.setColor('#aa2233'));
    quitBtn.on('pointerdown', () => {
      try { Snd.play('powerup'); } catch {}
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

    // Kill infinite tweens/events on shutdown to prevent leaks across mounts
    this.events.once('shutdown', () => {
      try { this._loreTickerTween?.stop?.(); }   catch {}
      try { this._clickPromptTween?.stop?.(); }  catch {}
      try { this._titlePulseTween?.stop?.(); }   catch {}
      try { this._pulseEvent?.remove?.(); }      catch {}
      try { this._conTickEvent?.remove?.(); }    catch {}
      try { this._conLiveTween?.stop?.(); }      catch {}
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
      const virusJitter = (Math.random()-0.5)*3; // cache once per draw, not per vertex
      g.fillStyle(sc, 0.85); g.beginPath();
      for(let s=0;s<sides;s++){const a=rot+(Math.PI*2/sides)*s;const isG=s===3;const r=isG?sz+Math.sin(t*15)*sz*0.35:sz;const go=isG?virusJitter:0;s===0?g.moveTo(x+Math.cos(a)*r+go+dx,y+Math.sin(a)*r+dy):g.lineTo(x+Math.cos(a)*r+go+dx,y+Math.sin(a)*r+dy);}
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
    this._frameTick = (this._frameTick || 0) + 1;

    // ── Lore scroll removed — replaced by CONTAINMENT_LOG dev console (event-driven, see create()) ──

    // ── Background FX — redrawn at 20Hz instead of 60Hz (animated pulse is too subtle to need full framerate) ──
    const bg = this._bgGfx;
    if (this._frameTick % 3 === 0) {
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
        p.t += dt * 3; // compensate for 1/3 framerate so pulses still travel at full speed
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

    // ── Ship preview — redrawn at 30Hz (mouse tilt + rotation still feel smooth) ──
    if (this._frameTick % 2 === 0) {
      const sg = this._shipGfx;
      sg.clear();
      this._drawShip(sg, t, this._shipX, this._shipY, this._shipSkin, this._shipColor, 1.6);
    }
  }

  _showOperatorNamePrompt() {
    if (document.getElementById('opNamePrompt')) return;
    const wrap = document.createElement('div');
    wrap.id = 'opNamePrompt';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:"Courier New",monospace;color:#00cc66;';
    wrap.innerHTML = `
      <div style="border:2px solid #00cc66;padding:40px 56px;text-align:center;max-width:680px;background:#020804;box-shadow:0 0 24px rgba(0,255,102,0.18);">
        <div style="font-size:22px;font-weight:bold;letter-spacing:4px;margin-bottom:18px;color:#00ff66;">// IDENTIFY_OPERATOR</div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:6px;color:#88bb99;">first run detected</div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:26px;color:#88bb99;">enter your operator callsign — this will appear on the leaderboard</div>
        <input id="opNameInput" type="text" autocomplete="off" spellcheck="false" maxlength="12" placeholder="callsign..." style="width:300px;padding:12px 16px;background:#000;border:1px solid #00cc66;color:#00ff66;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;letter-spacing:4px;outline:none;text-align:center;text-transform:uppercase;" />
        <div style="font-size:10px;color:#445544;margin-top:14px;letter-spacing:1px;">A-Z 0-9 _ - . SPACE · max 12 chars</div>
        <div style="font-size:10px;color:#445544;margin-top:18px;letter-spacing:2px;">[ ENTER to confirm · ESC to use default "OPERATOR" ]</div>
      </div>
    `;
    document.body.appendChild(wrap);
    const input = document.getElementById('opNameInput');
    setTimeout(() => { try { input.focus(); } catch {} }, 30);
    const _commit = (raw) => {
      try { Save.setOperatorName(raw || 'OPERATOR'); } catch {}
      try { wrap.remove(); } catch {}
      // Refresh menu so the new name shows in the leaderboard header
      try { this.scene.restart(); } catch {}
    };
    const _blockKeys = ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); _commit(input.value); }
      else if (ev.key === 'Escape') { ev.preventDefault(); _commit('OPERATOR'); }
    };
    input.addEventListener('keydown', _blockKeys, true);
    input.addEventListener('keyup',   ev => ev.stopPropagation(), true);
    input.addEventListener('keypress',ev => ev.stopPropagation(), true);
  }

  _showDifficultyModal(diffId) {
    const D = (typeof DIFFICULTY !== 'undefined') ? DIFFICULTY[diffId] : null;
    if (!D) return;
    if (this._diffModalGroup) { try { this._diffModalGroup.destroy(true); } catch {} this._diffModalGroup = null; }
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";
    const colN = parseInt(D.col.replace('#', ''), 16);
    const grp  = this.add.container(0, 0).setDepth(200);
    const dim  = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setInteractive();
    const card = this.add.rectangle(W/2, H/2, 560, 320, 0x020804, 0.97).setStrokeStyle(2, colN, 0.95);
    const accent = this.add.rectangle(W/2 - 280, H/2 - 160, 6, 320, colN, 0.85).setOrigin(0, 0);
    const title = this.add.text(W/2, H/2 - 120, `// DIFFICULTY: ${D.label}`, {
      fontFamily: orb, fontSize: '24px', fontStyle: '900', color: D.col, letterSpacing: 6,
    }).setOrigin(0.5);
    const TAGS = { packet: 'EASY', daemon: 'NORMAL — RECOMMENDED', kernel: 'HARD' };
    const sub = this.add.text(W/2, H/2 - 86, TAGS[diffId] || '', {
      fontFamily: mono, fontSize: '11px', color: D.col, letterSpacing: 3,
    }).setOrigin(0.5);
    const speedPct = Math.round((D.enemySpeedMult - 1) * 100);
    const scorePct = Math.round((D.scoreMulti - 1) * 100);
    const fmt = (n) => (n >= 0 ? '+' + n : String(n)) + '%';
    const modFreqText = !D.waveModFreq ? 'NONE' : `every ${D.waveModFreq} waves`;
    const lines = [
      `> ENEMY SPEED ............ ${fmt(speedPct)}`,
      `> HEAT VENT RATE ......... ${D.heatCoolRate}/sec`,
      `> SNIPER FIRE INTERVAL ... ${D.sniperInterval.toFixed(2)}s`,
      `> SCORE EARNED ........... ${fmt(scorePct)}`,
      `> ENEMY MUTATIONS/RUN .... ${D.mutations}`,
      `> WAVE MODIFIERS ......... ${modFreqText}`,
    ];
    const linesText = this.add.text(W/2 - 240, H/2 - 40, lines.join('\n'), {
      fontFamily: mono, fontSize: '13px', color: '#cce4d4', lineSpacing: 6, letterSpacing: 1,
    });
    const btnBg = this.add.rectangle(W/2, H/2 + 118, 160, 36, 0x001100, 0.95)
      .setStrokeStyle(1, 0x00cc66, 0.85).setInteractive({ useHandCursor: true });
    const btnTx = this.add.text(W/2, H/2 + 118, '[ GOT IT ]', {
      fontFamily: mono, fontSize: '14px', fontStyle: 'bold', color: '#00ff66', letterSpacing: 3,
    }).setOrigin(0.5);
    grp.add([dim, card, accent, title, sub, linesText, btnBg, btnTx]);
    this._diffModalGroup = grp;

    const close = () => { try { Snd.play('powerup'); } catch {} try { grp.destroy(true); } catch {} this._diffModalGroup = null; };
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x002200, 1));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x001100, 0.95));
    btnBg.on('pointerdown', close);
    dim.on('pointerdown',   close);
    if (this.input && this.input.keyboard) {
      this.input.keyboard.once('keydown-ENTER', close);
      this.input.keyboard.once('keydown-ESC',   close);
    }
  }

  _go(m) {
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.scene.sleep('MenuScene');
      if (m === 'shop')          this.scene.launch('ShopScene');
      else if (m === 'codex')         this.scene.launch('CodexScene');
      else if (m === 'settings')      this.scene.launch('SettingsScene', { from: 'menu' });
      else if (m === 'daily')         this.scene.launch('DailyChallengeScene');
      else if (m === 'meta')          this.scene.launch('MetaUpgradeScene');
      else if (m === 'achievements')  this.scene.launch('AchievementsScene');
      else if (m === 'forge')         this.scene.launch('ForgeScene', { from: 'menu' });
      else {
        this.scene.stop('MenuScene');
        if (m === 'normal' || m === 'endless' || m === 'corrupted') this.scene.start('ArchetypeSelectScene', { mode: m });
        else this.scene.start('BootScene', { mode: m });
      }
    });
  }
}
