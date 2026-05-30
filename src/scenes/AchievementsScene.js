// ═══════════════════════════════════════════════════════════
// ACHIEVEMENTSSCENE
// ═══════════════════════════════════════════════════════════

const ACHIEVEMENTS = [
  { id:'first_run',   icon:'▶', col:0x00cc66,  name:'SIGNAL_TRANSMITTED',   desc:'Complete your first run.' },
  { id:'first_boss',  icon:'⬡', col:0xff2244,  name:'PROCESS_ELIMINATED',   desc:'Defeat a boss.' },
  { id:'bossbuster',  icon:'✦', col:0xff4400,  name:'SYSTEM_PURGED',        desc:'Accumulate 4 boss kills.' },
  { id:'century',     icon:'◈', col:0x00ffcc,  name:'CENTURY_MARK',         desc:'100 lifetime kills.' },
  { id:'slaughter',   icon:'⚡', col:0xff8800,  name:'PROCESS_ELIMINATOR',   desc:'500 lifetime kills.' },
  { id:'reflector',   icon:'↩', col:0x00aaff,  name:'SIGNAL_REFLECTOR',     desc:'100 lifetime reflects.' },
  { id:'veteran',     icon:'⊞', col:0xffdd00,  name:'NETWORK_VETERAN',      desc:'Complete 10 runs.' },
  { id:'hoarder',     icon:'◆', col:0xaaffdd,  name:'DATA_HOARDER',         desc:'Collect 50 total fragments.' },
  { id:'wave20',      icon:'≋', col:0xaa44ff,  name:'DEEP_NETWORK_REACHED', desc:'Reach wave 20 in any run.' },
  { id:'survivor',    icon:'∞', col:0xff2200,  name:'ENDLESS_SURVIVOR',     desc:'Reach phase 4 in Endless mode.' },
  { id:'maxtier',     icon:'▲', col:0xffd700,  name:'TIER_MAX_REACHED',     desc:'Upgrade any module to tier 4.' },
  { id:'synergist',   icon:'⚙', col:0xff44ff,  name:'DUAL_SYNERGY',         desc:'Activate 2 synergies at once.' },
  { id:'deathless',   icon:'◌', col:0x44ff88,  name:'DEATHLESS_SIGNAL',     desc:'Survive 5 waves without dying.' },
  { id:'highscore',   icon:'▣', col:0xffaa00,  name:'SIGNAL_PEAK',          desc:'Score 10,000 in a single run.' },
];

class AchievementsScene extends Phaser.Scene {
  constructor() { super('AchievementsScene'); }

  create() {
    try { CRT.inGame = false; } catch(e) {}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // Background grid
    const bg = this.add.graphics().setAlpha(0.05);
    bg.lineStyle(1, 0x00cc66, 1);
    for (let x = 0; x <= W; x += 80) { bg.moveTo(x,0); bg.lineTo(x,H); }
    for (let y = 0; y <= H; y += 80) { bg.moveTo(0,y); bg.lineTo(W,y); }
    bg.strokePath();

    // Header
    this.add.rectangle(W/2, 0, W, 48, 0x000000, 0.97).setOrigin(0.5, 0);
    this.add.rectangle(W/2, 48, W, 2, 0xffdd00, 0.6).setOrigin(0.5, 0);
    this.add.text(W/2, 22, 'MISSION_LOG.SH', {
      fontFamily: orb, fontSize: '18px', fontStyle: '900', color: '#ffdd00', letterSpacing: 6
    }).setOrigin(0.5);

    // Stats row
    const st = Save.stats();
    const unlocked = ACHIEVEMENTS.filter(a => Save.ach(a.id)).length;
    this.add.text(W/2, 38, `${unlocked} / ${ACHIEVEMENTS.length} UNLOCKED  ·  ${st.runs||0} RUNS  ·  ${st.kills||0} KILLS  ·  ${st.reflects||0} REFLECTS`, {
      fontFamily: mono, fontSize: '9px', color: '#336644', letterSpacing: 1
    }).setOrigin(0.5);

    // Achievement grid — 2 columns
    const COL = 2;
    const CW  = (W - 60) / COL;
    const CH  = 64;
    const GAP = 8;
    const STARTX = 20;
    const STARTY = 62;

    ACHIEVEMENTS.forEach((ach, i) => {
      const col = Math.floor(i / Math.ceil(ACHIEVEMENTS.length / COL));
      const row = i % Math.ceil(ACHIEVEMENTS.length / COL);
      const x   = STARTX + col * (CW + 20);
      const y   = STARTY + row * (CH + GAP);
      const done = Save.ach(ach.id);
      const c    = done ? ach.col : 0x1a2a1a;
      const cS   = '#' + (done ? ach.col : 0x2a3a2a).toString(16).padStart(6, '0');
      const textC = done ? ('#' + ach.col.toString(16).padStart(6,'0')) : '#224433';
      const nameC = done ? ('#' + ach.col.toString(16).padStart(6,'0')) : '#2d5533';

      // Card bg
      this.add.rectangle(x, y, CW, CH, done ? ach.col : 0x020a04, done ? 0.09 : 0.8)
        .setOrigin(0, 0);
      this.add.rectangle(x, y, CW, CH).setStrokeStyle(1, c, done ? 0.5 : 0.15).setOrigin(0, 0);
      // Side accent bar
      this.add.rectangle(x, y, 4, CH, c, done ? 0.85 : 0.2).setOrigin(0, 0);

      // Icon circle
      const ig = this.add.graphics();
      ig.fillStyle(c, done ? 0.15 : 0.05); ig.fillCircle(x + 26, y + CH/2, 20);
      ig.lineStyle(1.5, c, done ? 0.7 : 0.15); ig.strokeCircle(x + 26, y + CH/2, 20);
      this.add.text(x + 26, y + CH/2, ach.icon, {
        fontFamily: mono, fontSize: '16px', color: done ? ('#' + ach.col.toString(16).padStart(6,'0')) : '#224433'
      }).setOrigin(0.5);

      // Name
      this.add.text(x + 54, y + 14, ach.name, {
        fontFamily: mono, fontSize: '11px', fontStyle: 'bold', color: nameC, letterSpacing: 1
      });
      // Desc
      this.add.text(x + 54, y + 32, done ? ach.desc : '??? LOCKED ???', {
        fontFamily: mono, fontSize: '10px', color: textC
      });
      // Status
      if (done) {
        this.add.text(x + CW - 8, y + CH - 14, '✓ COMPLETE', {
          fontFamily: mono, fontSize: '9px', color: '#' + ach.col.toString(16).padStart(6,'0')
        }).setOrigin(1, 0);
      }
    });

    // Close button
    const closeBg = this.add.rectangle(W/2, H - 24, 220, 30, 0x000000, 0.95)
      .setStrokeStyle(1, 0xffdd00, 0.5).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(W/2, H - 24, '[ CLOSE ]', {
      fontFamily: mono, fontSize: '12px', fontStyle: 'bold', color: '#996600'
    }).setOrigin(0.5);
    const _close = () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.stop('AchievementsScene');
        const ms = this.scene.get('MenuScene');
        if (ms && ms.sys.isSleeping()) this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
      });
    };
    closeBg.on('pointerover',  () => { closeBg.setStrokeStyle(1, 0xffdd00, 1); closeTxt.setColor('#ffdd00'); });
    closeBg.on('pointerout',   () => { closeBg.setStrokeStyle(1, 0xffdd00, 0.5); closeTxt.setColor('#996600'); });
    closeBg.on('pointerdown',  _close);
    this.input.keyboard.once('keydown-ESC', _close);
  }
}
