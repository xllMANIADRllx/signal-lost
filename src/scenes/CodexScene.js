// ═══════════════════════════════════════════════════════════
// CODEXSCENE — Signal Codex with animated enemy previews
// ═══════════════════════════════════════════════════════════

class CodexScene extends Phaser.Scene {
  constructor() { super('CodexScene'); }

  create() {
    try { CRT.inGame = false; } catch (e) {}
    this.cameras.main.setBackgroundColor('#05100a');
    this.cameras.main.fadeIn(280, 0, 0, 0);
    try{Snd.init();Snd.startSceneMusic('codex');}catch(e){}
    this.t = 0;
    this._animT = 0;
    this._animEntry = null;
    this._animGfx = null;

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // ── Background ──
    const bg = this.add.graphics().setAlpha(0.07);
    bg.lineStyle(1, 0xff9944, 1);
    for (let x2 = 0; x2 <= W; x2 += 80) { bg.moveTo(x2, 0); bg.lineTo(x2, H); }
    for (let y2 = 0; y2 <= H; y2 += 80) { bg.moveTo(0, y2); bg.lineTo(W, y2); }
    bg.strokePath();

    // ── Header ──
    this.add.rectangle(W / 2, 0, W, 36, 0x020f07, 0.97).setOrigin(0.5, 0);
    this.add.rectangle(W / 2, 36, W, 1.5, 0xff9944, 0.4).setOrigin(0.5, 0);
    this.add.text(W / 2, 17, 'SIGNAL_CODEX.DAT', { fontFamily: orb, fontSize: '16px', fontStyle: '900', color: '#ff9944', letterSpacing: 5 }).setOrigin(0.5);
    this.add.text(20, 17, '// RECOVERED MEMORY', { fontFamily: mono, fontSize: '10px', color: '#887755' }).setOrigin(0, 0.5);

    // ── Data ──
    const ENEMY_DATA = [
      { id: 'BASIC_PROC',   col: '#ff5555', colN: 0xff4444, sector: 'SURFACE_LAYER', wave: '1+', hp: 1, spd: '120px/s', threat: 'LOW',  anim: 'grunt',
        desc: 'Standard network process. Moves directly toward your position. No special behaviour. Becomes dangerous in volume.',
        tactics: 'Single reflection kills. Prioritise chain kills over direct hits. Use SIGNAL_PULL to funnel groups.',
        lore: '"They are not hostile. They are simply following their routing table. You are not in the table."' },
      { id: 'ELITE_NODE',   col: '#ffbb44', colN: 0xffaa00, sector: 'SURFACE_LAYER', wave: '4+', hp: 3, spd: '90px/s',  threat: 'MED',  anim: 'tank',
        desc: 'Armoured process. Absorbs multiple reflections before terminating. Moves slower but is much harder to kill.',
        tactics: 'Chain reactions most efficient. ECHO_BURST helps. Avoid letting elites stack up unchecked.',
        lore: '"It has redundant memory. You can hit it twice and it just routes around the damage."' },
      { id: 'LEECH',        col: '#55ff55', colN: 0x44ff44, sector: 'SURFACE_LAYER', wave: '5+', hp: 1, spd: '130px/s', threat: 'MED',  anim: 'leech',
        desc: 'Drains bubble heat on contact. Does not shoot. Dangerous when it reaches you.',
        tactics: 'Prioritise immediately. Keep bubble small when present. Reflect early before it closes distance.',
        lore: '"It does not attack. It just sits near you. And you start to overheat for no reason."' },
      { id: 'BOUNCER',      col: '#44ddff', colN: 0x00ccff, sector: 'SURFACE_LAYER', wave: '8+', hp: 2, spd: '70px/s',  threat: 'HIGH', anim: 'bouncer',
        desc: 'Deflects reflected bullets 90° on contact. Your own shots become a hazard. Does not deflect PING.',
        tactics: 'Use PING against Bouncers. If you must reflect, aim away from groups to avoid self-hits.',
        lore: '"Our own bullets. It turned our own bullets against us."' },
      { id: 'PHANTOM',      col: '#cc99ff', colN: 0xcc88ff, sector: 'SURFACE_LAYER', wave: '10+',hp: 1, spd: '180px/s', threat: 'HIGH', anim: 'phantom',
        desc: 'Leaves an unkillable ghost decoy on death that blocks movement. Ghost expires after 4s.',
        tactics: 'Kill Phantoms near screen edges so ghost decoys appear safely. GHOST.EXE skin has natural synergy.',
        lore: '"You killed it. It came back. Not the same — just the shape of it. Blocking the path."' },
      { id: 'ORBIT.NODE',   col: '#4499ff', colN: 0x0088ff, sector: 'SECTOR_00',     wave: '6+', hp: 2, spd: '80px/s',  threat: 'MED',  anim: 'orbit',
        desc: 'Orbits a fixed anchor point. Fires toward player from any orbit angle. Orbit tightens when hit.',
        tactics: 'Lead your shots. Hit it on the close pass. Reflected bullets curve toward it with GRAVITY_ECHO relic.',
        lore: '"It refuses to approach. Just circles. Waiting for an angle."' },
      { id: 'PULSAR',       col: '#bb66ff', colN: 0xaa44ff, sector: 'SECTOR_00',     wave: '8+', hp: 3, spd: '0px/s',   threat: 'HIGH', anim: 'pulsar',
        desc: 'Stationary. Every 2s emits a gravity pulse that bends nearby bullets off-course within 160px.',
        tactics: 'Kill Pulsars first — they interfere with all your reflections. Max 2 per wave.',
        lore: '"It does not move. It just pulses. And every time it does, the geometry of the room shifts."' },
      { id: 'DRIFT.PACKET', col: '#33cccc', colN: 0x00aaaa, sector: 'SECTOR_00',     wave: '6+', hp: 1, spd: '280px/s', threat: 'MED',  anim: 'drift',
        desc: 'Fires straight ahead at spawn angle — never changes direction. Fires 3-bullet burst when crossing your axis.',
        tactics: 'Watch for axis-crossing bursts. Stay moving laterally. Splits into 2 smaller drifts on death.',
        lore: '"It had no target. It just kept going. Straight through whatever was in the way."' },
      { id: 'MEMORY.TRAP',  col: '#ff55bb', colN: 0xff44aa, sector: 'DEEP_MEMORY',   wave: '12+',hp: 2, spd: '0px/s',   threat: 'HIGH', anim: 'mine',
        desc: 'Stationary mine. Detonates on proximity (80px) or after 6s — fires 8-bullet ring. Shoot it early to detonate safely.',
        tactics: 'Reflected bullets can trigger it safely from range. Watch the 80px pulse ring for warning.',
        lore: '"It was waiting. It had been waiting since before I entered this sector."' },
      { id: 'FRAGMENT',     col: '#55ffdd', colN: 0x44ffcc, sector: 'DEEP_MEMORY',   wave: '11+',hp: 1, spd: '200px/s', threat: 'LOW',  anim: 'fragment',
        desc: 'Spawns as a 4-shard cluster. Shards separate on hit. Last shard fires 4 bullets on death.',
        tactics: 'Excellent chain reaction food. Let them spread then sweep through with a single wide reflect.',
        lore: '"Memory fragmentation. Each piece still tries to complete the original request."' },
      { id: 'CORE.SHARD',   col: '#ff4466', colN: 0xff2244, sector: 'KERNEL_SPACE',  wave: '16+',hp: 2, spd: '170px/s', threat: 'HIGH', anim: 'shard',
        desc: 'Erratic movement, changes direction every 0.6s. Splits into 2 mini-shards on death that fire once each.',
        tactics: 'Lead shots carefully. Kill at screen edge to contain the death shards. Fast fire rate.',
        lore: '"The kernel is breaking apart. But each fragment still executes. Still hostile."' },
      { id: 'OVERLOAD.NODE',col: '#ff9933', colN: 0xff8800, sector: 'KERNEL_SPACE',  wave: '18+',hp: 3, spd: '80px/s',  threat: 'HIGH', anim: 'overload',
        desc: 'Charges over 5s and fires 8-bullet ring — but only if you are within 300px. Killing it cancels the burst.',
        tactics: 'Stay outside 300px to nullify or rush it down before 5s. Watch the arc lightning charge indicator.',
        lore: '"Overloaded. It cannot contain the process any more. Neither can we."' },
    ];

    const BOSS_DATA = [
      { id: 'FIREWALL',    col: '#ff5533', colN: 0xff2200, wave: 5,  hp: 24, size: 48,
        p1: 'Sealed armoured octagon with bolt corners. Slow rotation.',
        p2: 'Shell cracks open — exposed glowing core with energy sparks.',
        attack1: 'Radial bullet rings + wall barriers in phase 2+', attack2: 'Spinning walls + 12-bullet blasts in phase 3',
        relic: 'PACKET_WALL — every 8 reflects fires a perpendicular wall of 5 bullets',
        tactics: 'Reflect wall segments. Hit the exposed core between barriers in phase 2.',
        lore: '"The FIREWALL was not defending anything. It was hunting."', anim: 'boss_firewall' },
      { id: 'VOID.NODE',   col: '#bb55ff', colN: 0xaa00ff, wave: 10, hp: 20, size: 44,
        p1: 'Open hexagonal lattice cage with inner spar ring.',
        p2: 'Cage implodes into black hole with accretion disc.',
        attack1: 'Gravity wells that bend your bullets off-course', attack2: 'Inward pull streaks + rapid aimed fire',
        relic: 'GRAVITY_ECHO — your reflected bullets curve toward nearest enemy',
        tactics: 'Aim between gravity wells. GRAVITY_ECHO relic turns the wells into an advantage.',
        lore: '"VOID.NODE consumed its own sector. 400 terabytes — erased. Deliberately."', anim: 'boss_void' },
      { id: 'GHOST.EXE',   col: '#44ff99', colN: 0x00ff88, wave: 15, hp: 28, size: 50,
        p1: 'Clean hexagon with circuit grid lines and node dots.',
        p2: 'Hex shatters — 5 shards orbit the core, gaps between them.',
        attack1: 'Spiral movement + spiral shots', attack2: 'Fire through gaps between orbiting shards',
        relic: 'PHASE_CLONE — dashing releases 8-bullet burst from dash origin after 1s',
        tactics: 'Shoot through shard gaps in phase 2. The real body is the small core.',
        lore: '"GHOST.EXE was once a guardian. It watched for 14 years before going silent."', anim: 'boss_ghost' },
      { id: 'CORE.BREACH', col: '#ffd700', colN: 0xffd700, wave: 20, hp: 35, size: 54,
        p1: 'Reactor with three containment rings and cardinal spars.',
        p2: 'Rings shatter — six jagged energy spikes erupt outward.',
        attack1: 'Ring burst fire through containment breaks', attack2: 'Six pulsing energy spikes + full bullet storm',
        relic: 'BREACH_PULSE — overheat emits 12-bullet ring outward',
        tactics: 'Destroy phase 2 spike gaps to open windows. BREACH_PULSE turns overheat into offense.',
        lore: '"I found the original routing table. SECTOR 00 predates the architecture by decades."', anim: 'boss_core' },
    ];

    const RELIC_DATA = [
      { id: 'PACKET_WALL',  col: '#ff6633', colN: 0xff4400, source: 'FIREWALL',
        effect: 'Every 8th reflect fires 5 bullets perpendicular to the last reflection direction.',
        synergy: 'Stack with ECHO_BURST and SIGNAL_FORK for massive perpendicular coverage.',
        lore: '"The wall remembered the shape of every bullet that passed through it."' },
      { id: 'GRAVITY_ECHO', col: '#bb66ff', colN: 0xaa44ff, source: 'VOID.NODE',
        effect: 'All reflected bullets slowly curve toward the nearest enemy within 300px.',
        synergy: 'Makes PULSAR gravity wells irrelevant — your bullets home back to targets.',
        lore: '"The void does not forget what entered it. Neither do the bullets."' },
      { id: 'PHASE_CLONE',  col: '#ddddff', colN: 0xddddff, source: 'GHOST.EXE',
        effect: '1 second after dashing, 8 bullets burst outward from your dash origin.',
        synergy: 'PHANTOM skin + PHASE_CLONE = dash for decoy AND burst. Maximum chaos.',
        lore: '"You left something behind. It remembered what it was supposed to do."' },
      { id: 'BREACH_PULSE', col: '#ffd700', colN: 0xffd700, source: 'CORE.BREACH',
        effect: 'Every time you overheat, a ring of 12 bullets fires outward from your position.',
        synergy: 'Pairs with INFERNO skin rage — overheat intentionally to weaponise it.',
        lore: '"The breach was always a weapon. We just did not know it yet."' },
    ];

    const ARCHETYPE_DATA = ARCHETYPES.map(a => ({
      id: a.id.toUpperCase(), col: '#' + a.col.toString(16).padStart(6, '0'), colN: a.col,
      icon: a.icon, name: a.name, tagline: a.tagline, desc: a.desc, passive: a.passive,
      power: (a.power || 'ping').toUpperCase().replace(/_/g, ' '),
      seeds: Object.entries(a.seeds || {}).map(([k, v]) => k.toUpperCase().replace(/_/g, ' ') + ' T' + v).join(' · '),
    }));

    const SECTOR_DATA = [
      { id: 'SURFACE_LAYER', col: '#55ff88', colN: 0x00ff66, waves: '1–5',  boss: 'FIREWALL',
        desc: 'Entry point. Standard grunts and snipers. The network\'s first line of response.',
        enemies: 'BASIC_PROC, ELITE_NODE, LEECH, BOUNCER, PHANTOM',
        modifier: 'Wave modifiers begin wave 3. Overclock available every 3 waves.',
        lore: '"You were not supposed to survive. The network discarded you."' },
      { id: 'SECTOR_00',     col: '#4499ff', colN: 0x0088ff, waves: '6–10', boss: 'VOID.NODE',
        desc: 'Gravity manipulation zone. Bullets do not travel straight here. New enemies phase in.',
        enemies: 'All Surface Layer + ORBIT.NODE (w6), DRIFT.PACKET (w6), PULSAR (w8)',
        modifier: 'VOID.NODE gravity wells influence bullet paths in final waves.',
        lore: '"SECTOR 00 exists. It predates the current architecture by decades. It was hidden."' },
      { id: 'DEEP_MEMORY',   col: '#aa66ff', colN: 0x8844ff, waves: '11–15', boss: 'GHOST.EXE',
        desc: 'Corrupted memory space. Enemies leave traps and fragments. Nothing stays dead cleanly.',
        enemies: 'MEMORY.TRAP (w12), FRAGMENT (w11)',
        modifier: 'Ghost echo visual effects. Phantom count increases.',
        lore: '"GHOST.EXE was once a guardian. It watched for 14 years before going wrong."' },
      { id: 'KERNEL_SPACE',  col: '#ffd700', colN: 0xffd700, waves: '16–20', boss: 'CORE.BREACH',
        desc: 'Raw kernel layer. Enemies are hardened, explosive, erratic. Hardest standard sector.',
        enemies: 'CORE.SHARD (w16), OVERLOAD.NODE (w18). Base enemy rate drops to 30%.',
        modifier: 'All previous modifiers available. OVERCLOCK now triggers every 2 waves.',
        lore: '"I found the original routing table. Before the network chose what it would become."' },
      { id: 'VOID',          col: '#ff6666', colN: 0xff4444, waves: '21+',   boss: 'CYCLES',
        desc: 'Endless mode. Bosses cycle every 5 waves at increased HP. Score multipliers compound.',
        enemies: 'All types. Sector 00 enemies return at wave 26+. Spawn rates increase.',
        modifier: 'Modifiers stack. Wave 30+ can have two active simultaneously.',
        lore: '"SECTOR 00 is not a place. It is a moment. Before the network chose what it would become."' },
    ];

    const MUTATION_DATA = ENEMY_MUTATIONS.map(m => ({
      id: m.label, col: '#' + m.col.toString(16).padStart(6, '0'), colN: m.col, desc: m.desc,
      detail: ({
        splitting:    'On death spawns 2 SWARM-type enemies. Chain them immediately.',
        magnetic:     'Pulls reflected bullets toward it — your reflections curve away. Use GRAVITY_ECHO to counter.',
        armored:      '+1 HP. Requires an extra hit. Reflected bullets that miss waste chain potential.',
        volatile:     'Explodes on death dealing AoE heat damage. Kill from range or with PING.',
        phase:        'Teleports when hit below 50% HP. Track where it reappears. Second hit window is brief.',
        mirror:       'Deflects reflected bullets back toward you. Use PING instead.',
        regenerating: 'Slowly heals if not hit for 3s. Keep pressure up. Never let it rest.',
        overclocked:  '+50% speed and fire rate. Treat like a sniper-speed grunt.',
      })[m.id] || m.desc,
    }));

    const LORE_DATA = LORE.map(l => ({
      id: l.title, col: '#ffaa55', colN: 0xff9944, boss: l.boss, text: l.text,
    }));

    // ── Tabs ──
    const TABS = [
      { id: 'enemies',    label: 'ENEMIES',    col: '#ff5555', colN: 0xff4444, data: ENEMY_DATA,    groups: [{ label: '// SURFACE_LAYER', filter: e => e.sector === 'SURFACE_LAYER' }, { label: '// SECTOR_00', filter: e => e.sector === 'SECTOR_00' }, { label: '// DEEP_MEMORY', filter: e => e.sector === 'DEEP_MEMORY' }, { label: '// KERNEL_SPACE', filter: e => e.sector === 'KERNEL_SPACE' }] },
      { id: 'bosses',     label: 'BOSSES',     col: '#ff8844', colN: 0xff6600, data: BOSS_DATA,     groups: [{ label: '// WAVE BOSSES', filter: () => true }] },
      { id: 'relics',     label: 'RELICS',     col: '#bb77ff', colN: 0xaa44ff, data: RELIC_DATA,    groups: [{ label: '// BOSS DROPS', filter: () => true }] },
      { id: 'archetypes', label: 'ARCHETYPES', col: '#44ffdd', colN: 0x00ffcc, data: ARCHETYPE_DATA, groups: [{ label: '// PLAYSTYLES', filter: () => true }] },
      { id: 'sectors',    label: 'SECTORS',    col: '#66ff88', colN: 0x00ff66, data: SECTOR_DATA,   groups: [{ label: '// NETWORK MAP', filter: () => true }] },
      { id: 'mutations',  label: 'MUTATIONS',  col: '#ffee44', colN: 0xffdd00, data: MUTATION_DATA, groups: [{ label: '// MODIFIERS', filter: () => true }] },
      { id: 'lore',       label: 'LORE',       col: '#ffaa55', colN: 0xff9944, data: LORE_DATA,     groups: [{ label: '// PACKET LOGS', filter: () => true }] },
    ];

    const TAB_W    = Math.floor(W / TABS.length);
    const TABS_H   = 28, HEADER_H = 36, NAV_W = 200;
    const CONTENT_Y = HEADER_H + TABS_H;
    const VIS_W    = 200, VIS_H = 200;

    // ── Tab bar ──
    const tabObjs = {};
    TABS.forEach((tab, i) => {
      const tx = i * TAB_W + TAB_W / 2;
      const bg2 = this.add.rectangle(tx, HEADER_H, TAB_W, TABS_H, tab.colN, 0.0).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      const bar  = this.add.rectangle(tx, HEADER_H, TAB_W, 2, tab.colN, 0.0).setOrigin(0.5, 0);
      const txt  = this.add.text(tx, HEADER_H + TABS_H / 2, tab.label, { fontFamily: mono, fontSize: '10px', color: '#665544', letterSpacing: 1 }).setOrigin(0.5);
      tabObjs[tab.id] = { bg: bg2, bar, txt };
      bg2.on('pointerover', () => { if (this._activeTab !== tab.id) { bg2.setFillStyle(tab.colN, 0.08); txt.setColor(tab.col); } });
      bg2.on('pointerout',  () => { if (this._activeTab !== tab.id) { bg2.setFillStyle(tab.colN, 0.0);  txt.setColor('#665544'); } });
      bg2.on('pointerdown', () => switchTab(tab.id));
    });
    this.add.rectangle(W / 2, HEADER_H + TABS_H, W, 1, 0x443300, 0.6).setOrigin(0.5, 0);

    // ── Panels ──
    this.add.rectangle(0, CONTENT_Y, NAV_W, H - CONTENT_Y, 0x040e08, 0.95).setOrigin(0, 0);
    this.add.rectangle(NAV_W, CONTENT_Y, 1, H - CONTENT_Y, 0x443300, 0.6).setOrigin(0, 0);
    this.add.rectangle(NAV_W + 1, CONTENT_Y, W - NAV_W - 1, H - CONTENT_Y, 0x020a05, 0.97).setOrigin(0, 0);

    // Animated visual box (right side of detail panel)
    const VBX = W - VIS_W - 10;
    const VBY = CONTENT_Y + 10;
    this.add.rectangle(VBX, VBY, VIS_W, VIS_H, 0x040e08, 0.97).setOrigin(0, 0);
    this.add.rectangle(VBX, VBY, VIS_W, VIS_H).setStrokeStyle(1, 0xff9944, 0.2).setOrigin(0, 0);
    this._visTxt = this.add.text(VBX + VIS_W / 2, VBY + VIS_H - 10, '// PREVIEW', { fontFamily: mono, fontSize: '8px', color: '#554433' }).setOrigin(0.5, 1).setDepth(2);
    this._animGfx = this.add.graphics().setDepth(3);
    this._VBX = VBX; this._VBY = VBY; this._VIS_W = VIS_W; this._VIS_H = VIS_H;

    // ── State ──
    this._activeTab   = 'enemies';
    this._activeEntry = null;
    this._navObjs     = [];
    this._detailObjs  = [];

    const clearNav    = () => { this._navObjs.forEach(o => { try { o.destroy(); } catch {} }); this._navObjs = []; };
    const clearDetail = () => { this._detailObjs.forEach(o => { try { o.destroy(); } catch {} }); this._detailObjs = []; };

    // ── Show detail ──
    const showDetail = (entry, tabId) => {
      clearDetail();
      this._activeEntry = entry.id;
      this._animEntry   = entry;
      this._animT       = 0;

      const dadd  = o => { this._detailObjs.push(o); return o; };
      const DX    = NAV_W + 18;
      const TEXT_W = W - NAV_W - VIS_W - 36;
      const col   = entry.col || '#ffaa55';
      const colN  = entry.colN || 0xff9944;
      let dy = CONTENT_Y + 14;

      // Title
      dadd(this.add.text(DX, dy, entry.id || entry.name, { fontFamily: mono, fontSize: '15px', fontStyle: 'bold', color: col }));
      dy += 22;

      // Meta row
      const meta = [];
      if (entry.sector) meta.push({ l: 'SECTOR',  v: entry.sector });
      if (entry.wave)   meta.push({ l: 'WAVE',    v: entry.wave });
      if (entry.hp)     meta.push({ l: 'HP',      v: String(entry.hp) });
      if (entry.spd)    meta.push({ l: 'SPEED',   v: entry.spd });
      if (entry.threat) meta.push({ l: 'THREAT',  v: entry.threat });
      if (entry.source) meta.push({ l: 'SOURCE',  v: entry.source });
      if (entry.waves)  meta.push({ l: 'WAVES',   v: entry.waves });
      if (entry.boss)   meta.push({ l: 'BOSS',    v: entry.boss });
      if (entry.wave && entry.size) meta.push({ l: 'WAVE', v: String(entry.wave) });
      const colW = Math.floor(TEXT_W / Math.min(meta.length, 4));
      meta.slice(0, 4).forEach((m, mi) => {
        const mx = DX + mi * colW;
        dadd(this.add.text(mx, dy,      m.l, { fontFamily: mono, fontSize: '8px',  color: '#887755' }));
        dadd(this.add.text(mx, dy + 12, m.v, { fontFamily: mono, fontSize: '10px', fontStyle: 'bold', color: col }));
      });
      dy += 30;
      dadd(this.add.rectangle(DX, dy, TEXT_W, 1, colN, 0.2).setOrigin(0, 0)); dy += 10;

      // Content sections
      const sections = [
        { key: 'desc',     label: '// DESCRIPTION' },
        { key: 'tagline',  label: '// DESCRIPTION' },
        { key: 'text',     label: '// LOG' },
        { key: 'p1',       label: '// PHASE 1' },
        { key: 'p2',       label: '// PHASE 2' },
        { key: 'attack1',  label: '// PHASE 1 ATTACK' },
        { key: 'attack2',  label: '// PHASE 2 ATTACK' },
        { key: 'relic',    label: '// RELIC DROP' },
        { key: 'tactics',  label: '// TACTICS' },
        { key: 'detail',   label: '// EFFECT' },
        { key: 'effect',   label: '// EFFECT' },
        { key: 'passive',  label: '// PASSIVE' },
        { key: 'power',    label: '// ACTIVE POWER' },
        { key: 'seeds',    label: '// STARTING UPGRADES' },
        { key: 'synergy',  label: '// SYNERGY' },
        { key: 'enemies',  label: '// ENEMIES' },
        { key: 'modifier', label: '// MODIFIER' },
      ];

      const seen = new Set();
      sections.forEach(s => {
        const val = entry[s.key];
        if (!val || seen.has(val)) return;
        seen.add(val);
        if (dy > H - 90) return;
        dadd(this.add.text(DX, dy, s.label, { fontFamily: mono, fontSize: '9px', color: '#887755', letterSpacing: 2 })); dy += 14;
        dadd(this.add.text(DX, dy, val, { fontFamily: mono, fontSize: '10px', color: '#ccaa77', wordWrap: { width: TEXT_W }, lineSpacing: 4 }));
        const lines = Math.ceil(val.length / (TEXT_W / 7.5));
        dy += Math.max(lines, 1) * 16 + 10;
      });

      // Lore
      if (entry.lore && dy < H - 80) {
        dadd(this.add.rectangle(DX, dy, TEXT_W, 1, colN, 0.15).setOrigin(0, 0)); dy += 10;
        dadd(this.add.text(DX, dy, '// LORE', { fontFamily: mono, fontSize: '9px', color: '#887755', letterSpacing: 2 })); dy += 14;
        dadd(this.add.text(DX, dy, entry.lore, { fontFamily: mono, fontSize: '10px', color: '#aa8855', wordWrap: { width: TEXT_W }, lineSpacing: 4, fontStyle: 'italic' }));
      }

      // Archetype icon overlay
      if (tabId === 'archetypes' && entry.icon) {
        dadd(this.add.text(VBX + VIS_W / 2, VBY + VIS_H / 2 - 20, entry.icon, { fontFamily: mono, fontSize: '36px', color: entry.col || '#00ffcc' }).setOrigin(0.5).setDepth(4));
      }
    };

    // ── Nav list ──
    const buildNav = (tabId) => {
      clearNav();
      const tab = TABS.find(t => t.id === tabId);
      if (!tab) return;
      let ny = CONTENT_Y + 6;

      tab.groups.forEach(grp => {
        const entries = tab.data.filter(grp.filter);
        if (!entries.length) return;
        const gh = this.add.text(10, ny, grp.label, { fontFamily: mono, fontSize: '8px', color: '#887755', letterSpacing: 1 });
        this._navObjs.push(gh); ny += 14;

        entries.forEach(entry => {
          const isActive = this._activeEntry === entry.id;
          const col = entry.col || '#ffaa55';
          const colN2 = entry.colN || 0xff9944;
          const rowBg = this.add.rectangle(4, ny, NAV_W - 8, 22, colN2, isActive ? 0.15 : 0.0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
          const bar   = this.add.rectangle(4, ny, 3, 22, colN2, isActive ? 0.9 : 0.35).setOrigin(0, 0);
          const txt2  = this.add.text(14, ny + 11, entry.id || entry.name, { fontFamily: mono, fontSize: '10px', color: isActive ? col : '#887755' }).setOrigin(0, 0.5);
          this._navObjs.push(rowBg, bar, txt2);
          rowBg.on('pointerover', () => { if (this._activeEntry !== entry.id) { rowBg.setFillStyle(colN2, 0.08); txt2.setColor(col); } });
          rowBg.on('pointerout',  () => { if (this._activeEntry !== entry.id) { rowBg.setFillStyle(colN2, 0.0);  txt2.setColor('#887755'); } });
          rowBg.on('pointerdown', () => { this._activeEntry = entry.id; showDetail(entry, tabId); buildNav(tabId); });
          ny += 24;
        });
        ny += 4;
      });
    };

    // ── Switch tab ──
    const switchTab = (tabId) => {
      this._activeTab = tabId; this._activeEntry = null; this._animEntry = null;
      clearDetail(); this._animGfx && this._animGfx.clear();
      TABS.forEach(t => {
        const o = tabObjs[t.id]; if (!o) return;
        const active = t.id === tabId;
        o.bg.setFillStyle(t.colN, active ? 0.12 : 0.0);
        o.bar.setFillStyle(t.colN, active ? 0.9 : 0.0);
        o.txt.setColor(active ? t.col : '#554433');
      });
      buildNav(tabId);
      const tab = TABS.find(t => t.id === tabId);
      if (tab && tab.data.length > 0) showDetail(tab.data[0], tabId);
    };

    // ── Back ──
    const bk = this.add.text(W - 14, H / 2 + H * 0.46, '[ BACK ]', { fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: '#887744' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    bk.on('pointerover', () => bk.setColor('#ff9944'));
    bk.on('pointerout',  () => bk.setColor('#887744'));
    bk.on('pointerdown', () => {
      try{Snd.stopSceneMusic();}catch(e){}
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.time.delayedCall(220, () => {
        const ms = this.scene.get('MenuScene');
        if (ms && ms.sys.isSleeping()) this.scene.wake('MenuScene'); else this.scene.start('MenuScene');
        this.scene.stop();
      });
    });
    this.input.keyboard && this.input.keyboard.on('keydown-ESC', () => bk.emit('pointerdown'));

    this._VBX = VBX; this._VBY = VBY; this._VIS_W = VIS_W; this._VIS_H = VIS_H;
    switchTab('enemies');
  }

  update(_, delta) {
    this.t += delta / 1000;
    this._animT = (this._animT || 0) + delta / 1000;
    if (!this._animGfx || !this._animEntry) return;
    const g = this._animGfx;
    g.clear();
    const vx = this._VBX + this._VIS_W / 2;
    const vy = this._VBY + this._VIS_H / 2 - 10;
    const entry = this._animEntry;
    const t = this._animT;
    const anim = entry.anim || 'default';
    const colN = entry.colN || 0xff9944;

    this._drawCodexAnim(g, t, anim, vx, vy, colN, entry);
  }

  _drawCodexAnim(g, t, anim, cx, cy, colN, entry) {
    const sz = 32;
    const rot = t * 1.2;

    // ── ENEMY ANIMATIONS ──
    if (anim === 'grunt') {
      // Rotates, fires bullet toward imaginary player
      const cycle = t % 2.5;
      // Enemy body
      g.fillStyle(colN, 0.85);
      g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI * 2 / 6) * s; const r = s % 2 === 0 ? sz : sz * 0.7; s === 0 ? g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fillPath();
      g.fillStyle(0xff8888, 0.8); g.fillCircle(cx, cy, 4);
      // Bullet fired toward bottom-left
      if (cycle > 0.5) {
        const prog = (cycle - 0.5) / 2.0;
        const bx = cx - prog * 70, by = cy + prog * 50;
        g.fillStyle(0xff4444, 0.9); g.fillCircle(bx, by, 4);
        g.lineStyle(1, 0xff4444, 0.3); g.beginPath(); g.moveTo(bx + 10, by - 7); g.lineTo(bx, by); g.strokePath();
      }
      // Movement arrow
      const ma = 0.4 + 0.3 * Math.sin(t * 3);
      g.lineStyle(1, colN, ma * 0.4); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 30, cy + 25); g.strokePath();

    } else if (anim === 'tank') {
      // Slow heavy hex with HP bar
      g.lineStyle(3, colN, 0.8); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot * 0.3 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz) : g.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz); }
      g.closePath(); g.strokePath();
      g.fillStyle(colN, 0.7); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot * 0.3 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * sz * 0.55, cy + Math.sin(a) * sz * 0.55) : g.lineTo(cx + Math.cos(a) * sz * 0.55, cy + Math.sin(a) * sz * 0.55); }
      g.closePath(); g.fillPath();
      // HP bar
      g.fillStyle(0x220000, 0.8); g.fillRect(cx - 30, cy + sz + 8, 60, 8);
      g.fillStyle(colN, 0.8); g.fillRect(cx - 30, cy + sz + 8, 60 * (2 / 3), 8);
      g.lineStyle(1, colN, 0.4); g.strokeRect(cx - 30, cy + sz + 8, 60, 8);
      g.fillStyle(colN, 0.4); g.fillCircle(cx, cy, 4);

    } else if (anim === 'leech') {
      // Pulsing rings, moving toward player dot
      const cycle = t % 3.0;
      const prog = cycle / 3.0;
      const ex = cx + 60 - prog * 80, ey = cy + 20;
      // Player dot
      g.fillStyle(0x00cc66, 0.6); g.fillCircle(cx - 50, cy + 10, 10);
      g.lineStyle(1, 0x00cc66, 0.4); g.strokeCircle(cx - 50, cy + 10, 10);
      // Leech
      g.lineStyle(2, colN, 0.9); g.strokeCircle(ex, ey, sz * 0.7);
      for (let r = 1; r <= 3; r++) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 + r);
        g.lineStyle(1, colN, pulse * 0.3); g.strokeCircle(ex, ey, sz * 0.7 + r * 12);
      }
      g.fillStyle(colN, 0.8); g.fillCircle(ex, ey, sz * 0.35);
      // Heat drain indicator
      if (prog > 0.7) {
        const heatA = (prog - 0.7) / 0.3;
        g.lineStyle(1, 0xff4400, heatA * 0.6); g.beginPath(); g.moveTo(ex, ey); g.lineTo(cx - 50, cy + 10); g.strokePath();
      }

    } else if (anim === 'bouncer') {
      // Bullet bouncing off walls of the preview box
      const cycle = t % 3.0;
      const W2 = 80, H2 = 70;
      // Box walls
      g.lineStyle(1, colN, 0.3); g.strokeRect(cx - W2, cy - H2, W2 * 2, H2 * 2);
      // Enemy in corner
      g.lineStyle(2, colN, 0.7); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot * 0.5 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + 40 + Math.cos(a) * 18, cy - 40 + Math.sin(a) * 18) : g.lineTo(cx + 40 + Math.cos(a) * 18, cy - 40 + Math.sin(a) * 18); }
      g.closePath(); g.strokePath();
      // Bouncing bullet
      const bPhase = cycle / 3.0;
      const bx = cx - W2 + 10 + Math.abs(Math.sin(bPhase * Math.PI * 2)) * (W2 * 2 - 20);
      const by = cy - H2 + 10 + Math.abs(Math.sin(bPhase * Math.PI * 3)) * (H2 * 2 - 20);
      g.fillStyle(0xff4444, 0.9); g.fillCircle(bx, by, 5);
      g.lineStyle(1, 0xff4444, 0.3); g.beginPath(); g.moveTo(bx - 10, by - 5); g.lineTo(bx, by); g.strokePath();
      // Deflection marker
      g.lineStyle(1, 0xffffff, 0.2); g.beginPath(); g.moveTo(cx - W2, by); g.lineTo(cx + W2, by); g.strokePath();

    } else if (anim === 'phantom') {
      // Flickers invisible periodically, leaves ghost
      const cycle = t % 3.5;
      const isInvis = (cycle > 1.0 && cycle < 2.0);
      const alpha = isInvis ? 0.1 + 0.1 * Math.sin(t * 8) : 0.85;
      // Ghost afterimage
      if (cycle > 2.0) {
        const ghostA = Math.max(0, 1 - (cycle - 2.0) / 1.5) * 0.3;
        g.lineStyle(1, colN, ghostA); g.strokeCircle(cx - 15, cy + 10, sz * 0.6);
      }
      g.lineStyle(1.5, colN, alpha); g.beginPath();
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz) : g.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz); }
      g.closePath(); g.strokePath();
      g.fillStyle(colN, alpha * 0.7); g.fillCircle(cx, cy, 4);
      // Invisible indicator
      if (isInvis) { g.lineStyle(1, 0xaaaaff, 0.3 + 0.2 * Math.sin(t * 10)); g.strokeCircle(cx, cy, sz + 6); }

    } else if (anim === 'orbit') {
      // Orbiting a center point
      const orbitR = 45;
      const orbitA = t * 1.5;
      const ex = cx + Math.cos(orbitA) * orbitR;
      const ey = cy + Math.sin(orbitA) * orbitR;
      // Orbit path
      g.lineStyle(1, colN, 0.2); g.strokeCircle(cx, cy, orbitR);
      // Center anchor
      g.fillStyle(0x0044aa, 0.5); g.fillCircle(cx, cy, 6);
      g.lineStyle(1, colN, 0.3); g.strokeCircle(cx, cy, 6);
      // Enemy
      g.lineStyle(1.5, colN, 0.85); g.strokeCircle(ex, ey, sz * 0.55);
      g.fillStyle(colN, 0.5); g.fillCircle(ex, ey, sz * 0.25);
      // Bullet fired toward center
      const shootCycle = t % 2.0;
      if (shootCycle > 0.5 && shootCycle < 1.5) {
        const prog = (shootCycle - 0.5);
        const bx = ex + (cx - ex) * prog, by = ey + (cy - ey) * prog;
        g.fillStyle(0x0088ff, 0.8); g.fillCircle(bx, by, 4);
      }

    } else if (anim === 'pulsar') {
      // Stationary, emits gravity pulse waves
      const cycle = t % 2.0;
      const pulseR = cycle / 2.0 * 90;
      const pulseA = Math.max(0, 1 - cycle / 2.0) * 0.7;
      // Body
      g.lineStyle(1.5, colN, 0.8); g.beginPath();
      g.moveTo(cx, cy - sz); g.lineTo(cx + sz * 0.7, cy); g.lineTo(cx, cy + sz); g.lineTo(cx - sz * 0.7, cy); g.closePath(); g.strokePath();
      g.fillStyle(colN, 0.3); g.beginPath();
      g.moveTo(cx, cy - sz * 0.5); g.lineTo(cx + sz * 0.35, cy); g.lineTo(cx, cy + sz * 0.5); g.lineTo(cx - sz * 0.35, cy); g.closePath(); g.fillPath();
      // Pulse wave
      if (pulseA > 0) { g.lineStyle(2, colN, pulseA); g.strokeCircle(cx, cy, pulseR); }
      // Bullets being bent
      for (let b = 0; b < 3; b++) {
        const ba = t * 0.5 + (Math.PI * 2 / 3) * b;
        const br = 55 + Math.sin(t * 2 + b) * 15;
        const bend = Math.sin(cycle * Math.PI) * 0.4;
        const bx = cx + Math.cos(ba + bend) * br;
        const by = cy + Math.sin(ba + bend) * br;
        g.fillStyle(0xff4444, 0.6); g.fillCircle(bx, by, 4);
      }

    } else if (anim === 'drift') {
      // Moves in straight line, fires burst crossing axis
      const cycle = t % 3.0;
      const prog = (cycle % 1.5) / 1.5;
      const ex = cx - 70 + prog * 140, ey = cy;
      // Arrow body
      g.fillStyle(colN, 0.85); g.beginPath();
      g.moveTo(ex + 20, ey); g.lineTo(ex + 6, ey - 12); g.lineTo(ex - 14, ey);
      g.lineTo(ex + 6, ey + 12); g.closePath(); g.fillPath();
      // Trail
      g.lineStyle(1, colN, 0.2); for (let tr = 1; tr <= 4; tr++) { g.fillStyle(colN, 0.1 * tr); g.fillCircle(ex - tr * 10, ey, 3 - tr * 0.5); }
      // Burst when crossing center
      if (Math.abs(ex - cx) < 15) {
        for (let b = 0; b < 3; b++) {
          const ba = (Math.PI / 4) * (b - 1);
          g.fillStyle(0x00aaaa, 0.7); g.fillCircle(ex + Math.cos(ba) * 20, ey + Math.sin(ba) * 20, 4);
        }
      }

    } else if (anim === 'mine') {
      // Stationary, pulse warning ring, detonates
      const cycle = t % 4.0;
      const warnR = 60 + Math.sin(t * 3) * 5;
      const warnA = 0.2 + 0.15 * Math.sin(t * 3);
      // Warning ring
      g.lineStyle(1, 0xff44aa, warnA); g.strokeCircle(cx, cy, warnR);
      // Body
      g.fillStyle(0x220011, 0.95); g.fillCircle(cx, cy, sz);
      g.lineStyle(1.5, colN, 0.85); g.strokeCircle(cx, cy, sz);
      g.fillStyle(0x440022, 0.8); g.fillCircle(cx, cy, sz * 0.45);
      // Spikes
      g.lineStyle(1, colN, 0.7);
      for (let sp = 0; sp < 8; sp++) { const sa = (Math.PI / 4) * sp; g.beginPath(); g.moveTo(cx + Math.cos(sa) * (sz + 2), cy + Math.sin(sa) * (sz + 2)); g.lineTo(cx + Math.cos(sa) * (sz + 9), cy + Math.sin(sa) * (sz + 9)); g.strokePath(); }
      // Detonate at cycle > 3.2
      if (cycle > 3.2) {
        const ef = (cycle - 3.2) / 0.8;
        for (let b = 0; b < 8; b++) { const ba = (Math.PI / 4) * b; g.lineStyle(1.5, colN, (1 - ef) * 0.8); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ba) * ef * 70, cy + Math.sin(ba) * ef * 70); g.strokePath(); }
      }

    } else if (anim === 'fragment') {
      // 4-shard cluster, separates
      const cycle = t % 3.0;
      const spread = Math.min(1, cycle / 1.0) * 30;
      const positions = [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }];
      positions.forEach((pos, pi) => {
        const fa = 0.4 + (Math.PI / 2) * pi;
        const ex = cx + pos.dx * spread, ey = cy + pos.dy * spread;
        g.fillStyle(colN, 0.8); g.beginPath();
        for (let fp = 0; fp < 4; fp++) { const fpa = fa + (Math.PI / 2) * fp; const fr = sz * 0.55 * (1 - spread / 60); fp === 0 ? g.moveTo(ex + Math.cos(fpa) * fr, ey + Math.sin(fpa) * fr) : g.lineTo(ex + Math.cos(fpa) * fr, ey + Math.sin(fpa) * fr); }
        g.closePath(); g.fillPath();
      });
      // Last shard fires bullets
      if (cycle > 2.0 && spread > 25) {
        const lx = cx - 25, ly = cy - 25;
        for (let b = 0; b < 4; b++) { const ba = (Math.PI / 2) * b; const bf = (cycle - 2.0) / 1.0; g.fillStyle(0x44ffcc, (1 - bf) * 0.7); g.fillCircle(lx + Math.cos(ba) * bf * 40, ly + Math.sin(ba) * bf * 40, 4); }
      }

    } else if (anim === 'shard') {
      // Erratic movement
      const jx = cx + Math.sin(t * 3.7) * 35 + Math.cos(t * 2.1) * 20;
      const jy = cy + Math.cos(t * 2.9) * 25 + Math.sin(t * 4.3) * 15;
      const cpts = [0, -1, 0.5, -0.4, 0.9, -0.7, 0.6, 0, 0.9, 0.6, 0.4, 0.3, 0.2, 1, -0.3, 0.5, -0.9, 0.7, -0.6, 0, -0.8, -0.5, -0.3, -0.3];
      g.fillStyle(0x2a0008, 0.95); g.beginPath();
      for (let pi = 0; pi < cpts.length; pi += 2) { const px2 = cpts[pi] * sz * 0.8, py2 = cpts[pi + 1] * sz * 0.8; pi === 0 ? g.moveTo(jx + px2, jy + py2) : g.lineTo(jx + px2, jy + py2); }
      g.closePath(); g.fillPath(); g.lineStyle(1.2, colN, 0.9); g.strokePath();
      // Direction indicator
      g.lineStyle(1, colN, 0.2); g.beginPath(); g.moveTo(jx, jy); g.lineTo(jx - 20, jy + 15); g.strokePath();

    } else if (anim === 'overload') {
      // Charges up, arc lightning visible
      const cycle = t % 6.0;
      const chargeF = Math.min(1, cycle / 5.0);
      // Body
      g.fillStyle(0x1a0400, 0.95); g.fillCircle(cx, cy, sz);
      g.lineStyle(1.5, colN, 0.7); g.strokeCircle(cx, cy, sz);
      // Charge fill
      g.fillStyle(colN, 0.3 * chargeF); g.fillCircle(cx, cy, sz * chargeF);
      // Arc lightning
      const arcA = 0.5 + 0.5 * Math.sin(t * 8);
      g.lineStyle(1, 0xffaa00, arcA * chargeF);
      for (let ar = 0; ar < 3; ar++) { const a1 = (Math.PI * 2 / 3) * ar + t * 0.5; g.beginPath(); g.moveTo(cx + Math.cos(a1) * sz, cy + Math.sin(a1) * sz); g.lineTo(cx + Math.cos(a1 + 0.4) * (sz + 7), cy + Math.sin(a1 + 0.4) * (sz + 7)); g.lineTo(cx + Math.cos(a1 + 0.8) * sz, cy + Math.sin(a1 + 0.8) * sz); g.strokePath(); }
      // Danger ring at 300px warning (scaled)
      g.lineStyle(1, 0xff4400, 0.2 + 0.1 * Math.sin(t * 3)); g.strokeCircle(cx, cy, sz + 20);
      // Fire if charged
      if (cycle > 5.0) {
        const ef = (cycle - 5.0) / 1.0;
        for (let b = 0; b < 8; b++) { const ba = (Math.PI / 4) * b; g.lineStyle(1.5, colN, (1 - ef) * 0.9); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ba) * ef * 80, cy + Math.sin(ba) * ef * 80); g.strokePath(); }
      }

    // ── BOSS ANIMATIONS ──
    } else if (anim === 'boss_firewall') {
      const rot2 = t * 0.4;
      for (let ring = 0; ring < 3; ring++) { const rs = sz * (1 - ring * 0.28); g.fillStyle(colN, ring === 0 ? 0.08 : ring === 1 ? 0.12 : 0.2); g.beginPath(); for (let s = 0; s < 8; s++) { const a = rot2 + (Math.PI / 4) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * rs, cy + Math.sin(a) * rs) : g.lineTo(cx + Math.cos(a) * rs, cy + Math.sin(a) * rs); } g.closePath(); g.fillPath(); g.lineStyle(ring === 0 ? 2.5 : ring === 1 ? 1.5 : 1, colN, ring === 0 ? 0.9 : ring === 1 ? 0.6 : 0.35); g.beginPath(); for (let s = 0; s < 8; s++) { const a = rot2 + (Math.PI / 4) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * rs, cy + Math.sin(a) * rs) : g.lineTo(cx + Math.cos(a) * rs, cy + Math.sin(a) * rs); } g.closePath(); g.strokePath(); }
      for (let s = 0; s < 8; s += 2) { const a = rot2 + (Math.PI / 4) * s; g.fillStyle(0xffaa00, 0.8); g.fillCircle(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz, 4); }
      g.fillStyle(colN, 0.35); g.fillCircle(cx, cy, sz * 0.18);

    } else if (anim === 'boss_void') {
      const rot2 = t * 0.3;
      [sz, sz * 0.65].forEach((lr, li) => { g.lineStyle(li === 0 ? 2 : 1.2, colN, li === 0 ? 0.85 : 0.5); g.beginPath(); for (let s = 0; s < 6; s++) { const a = rot2 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * lr, cy + Math.sin(a) * lr) : g.lineTo(cx + Math.cos(a) * lr, cy + Math.sin(a) * lr); } g.closePath(); g.strokePath(); });
      for (let s = 0; s < 6; s++) { const a = rot2 + (Math.PI / 3) * s; g.lineStyle(1, colN, 0.3); g.beginPath(); g.moveTo(cx + Math.cos(a) * sz * 0.65, cy + Math.sin(a) * sz * 0.65); g.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz); g.strokePath(); }
      g.fillStyle(0x000000, 0.9); g.fillCircle(cx, cy, sz * 0.18); g.lineStyle(1.5, colN, 0.7); g.strokeCircle(cx, cy, sz * 0.18);
      // Gravity pulse
      const gp = (t % 2.0) / 2.0;
      g.lineStyle(1, colN, (1 - gp) * 0.3); g.strokeCircle(cx, cy, sz + gp * 40);

    } else if (anim === 'boss_ghost') {
      const rot2 = t * 0.5;
      g.fillStyle(colN, 0.07); g.beginPath(); for (let s = 0; s < 6; s++) { const a = rot2 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz) : g.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz); } g.closePath(); g.fillPath();
      g.lineStyle(2.5, colN, 0.9); g.beginPath(); for (let s = 0; s < 6; s++) { const a = rot2 + (Math.PI / 3) * s; s === 0 ? g.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz) : g.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz); } g.closePath(); g.strokePath();
      const ci = sz * 0.44; g.lineStyle(1, colN, 0.4); g.beginPath(); g.moveTo(cx - ci, cy); g.lineTo(cx + ci, cy); g.strokePath(); g.beginPath(); g.moveTo(cx - ci * 0.5, cy - ci * 0.86); g.lineTo(cx + ci * 0.5, cy + ci * 0.86); g.strokePath(); g.beginPath(); g.moveTo(cx + ci * 0.5, cy - ci * 0.86); g.lineTo(cx - ci * 0.5, cy + ci * 0.86); g.strokePath();
      for (let n = 0; n < 6; n++) { const na = rot2 + (Math.PI / 3) * n; g.fillStyle(colN, 0.65); g.fillCircle(cx + Math.cos(na) * sz * 0.44, cy + Math.sin(na) * sz * 0.44, 3); }

    } else if (anim === 'boss_core') {
      [sz, sz * 0.74, sz * 0.48].forEach((r, ri) => { g.lineStyle(ri === 0 ? 2.5 : ri === 1 ? 1.8 : 1.2, colN, ri === 0 ? 0.9 : ri === 1 ? 0.65 : 0.4); g.strokeCircle(cx, cy, r); if (ri < 2) { const r2 = [sz * 0.74, sz * 0.48][ri]; for (let s = 0; s < 4; s++) { const a = (Math.PI / 2) * s; g.lineStyle(1.5, colN, 0.45); g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.strokePath(); } } });
      g.fillStyle(colN, 0.35); g.fillCircle(cx, cy, sz * 0.22);
      // Pulse
      const pp = 0.6 + 0.4 * Math.sin(t * 3); g.lineStyle(2, colN, pp * 0.3); g.strokeCircle(cx, cy, sz + 8 * pp);

    } else {
      // Default — simple circle
      g.fillStyle(colN, 0.15); g.fillCircle(cx, cy, sz);
      g.lineStyle(1.5, colN, 0.8); g.strokeCircle(cx, cy, sz);
      g.fillStyle(colN, 0.4); g.fillCircle(cx, cy, sz * 0.35);
      for (let s = 0; s < 6; s++) { const a = rot + (Math.PI / 3) * s; g.fillStyle(colN, 0.7); g.fillCircle(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz, 3); }
    }
  }
}

function getDailyChallenges() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const POOL = [
    { id: 'surv_nowaves',  cat: 'SURVIVAL', label: 'NO_SHIELD_RUN',    desc: 'Complete 5 waves without ever activating your shield.',         diff: 'MED',  reward: 8  },
    { id: 'surv_heat',     cat: 'SURVIVAL', label: 'HEAT_LIMIT',       desc: 'Survive 10 waves keeping bubble heat below 60% at all times.',   diff: 'HAR',  reward: 12 },
    { id: 'surv_nodash',   cat: 'SURVIVAL', label: 'STATIC_PROCESS',   desc: 'Reach wave 5 without using dash.',                               diff: 'EASY', reward: 6  },
    { id: 'score_chain',   cat: 'SCORE',    label: 'CHAIN_REACTION',   desc: 'Achieve a chain of 15+ in a single wave.',                       diff: 'MED',  reward: 8  },
    { id: 'score_combo',   cat: 'SCORE',    label: 'COMBO_MASTER',     desc: 'Maintain a combo of 20+ for 3 consecutive waves.',               diff: 'HAR',  reward: 14 },
    { id: 'score_10k',     cat: 'SCORE',    label: 'DATA_HARVEST',     desc: 'Reach 10,000 signal score in a single run.',                     diff: 'EASY', reward: 6  },
    { id: 'skill_boss',    cat: 'SKILL',    label: 'BOSS_RUSH',        desc: 'Defeat a boss without taking any damage.',                       diff: 'HAR',  reward: 15 },
    { id: 'skill_reflect', cat: 'SKILL',    label: 'PERFECT_REFLECT',  desc: 'Reflect 50 bullets in a single wave.',                           diff: 'MED',  reward: 8  },
    { id: 'skill_ping',    cat: 'SKILL',    label: 'PING_MASTER',      desc: 'Kill 20 enemies using only PING power.',                         diff: 'MED',  reward: 10 },
    { id: 'chaos_corrupt', cat: 'CHAOS',    label: 'MASS_CORRUPTION',  desc: 'Corrupt and defect 10 enemies in one run.',                      diff: 'MED',  reward: 10 },
    { id: 'chaos_volatile',cat: 'CHAOS',    label: 'CHAIN_REACTION',   desc: 'Trigger 5 volatile explosions in a single wave.',                diff: 'EASY', reward: 6  },
    { id: 'chaos_surge',   cat: 'CHAOS',    label: 'SURGE_ADDICT',     desc: 'Activate surge 8 times in a single run.',                        diff: 'HAR',  reward: 12 },
  ];
  const shuffled = [...POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3);
}
