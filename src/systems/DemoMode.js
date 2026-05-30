// ═══════════════════════════════════════════════════════════
// DEMO MODE — single drop-in runtime patch
// Removing the <script> tag in index.html reverts to full game.
//
// Restrictions applied:
//   • Only INITIALIZE main-menu button works
//   • All 8 archetypes shown; 6 locked behind "DEMO" badge
//   • Difficulty locked to DAEMON
//   • Run ends after FIREWALL boss (wave 5)
// ═══════════════════════════════════════════════════════════
(function(){
  if(typeof window === 'undefined') return;
  window.DEMO_MODE = true;

  const LOCKED_TXT     = 'AVAILABLE IN FULL VERSION';
  const DEMO_TAG       = '— DEMO BUILD —';
  const FULL_LINK      = 'GET THE FULL GAME';
  const ALLOWED_GO     = new Set(['normal']);
  const DEMO_ARCH_IDS  = new Set(['reflector','corruptor']);
  const PRIMARY_LOCKED = new Set(['> DAILY_CHALLENGE','> ENDLESS_MODE','> CORRUPTED_MODE']);
  const SECONDARY_LOCKED = new Set(['DATA_SHOP','NETWORK_UPGRADES','SYS_CONFIG','MISSION_LOG','SIGNAL_FORGE']);
  const DIFF_LOCKED    = new Set(['PACKET','KERNEL']);

  // Helper — place demo watermark in top-right corner so it never overlaps
  // a centered scene title like "SELECT_ARCHETYPE.SH".
  function _addWatermark(scene){
    try {
      const W_ = (typeof W !== 'undefined') ? W : 1280;
      scene.add.text(W_-12, 6, DEMO_TAG, {
        fontFamily:'Courier New', fontSize:'13px', color:'#ffaa00', fontStyle:'bold'
      }).setOrigin(1, 0).setDepth(100);
    } catch {}
  }

  // ── Section 1: MenuScene ──────────────────────────────
  if(typeof MenuScene !== 'undefined'){
    const _origGo = MenuScene.prototype._go;
    MenuScene.prototype._go = function(mode){
      if(!ALLOWED_GO.has(mode)){
        try { this.banner && this.banner.show('DEMO MODE', '#ffaa00', 1800, LOCKED_TXT); } catch {}
        return;
      }
      return _origGo.call(this, mode);
    };

    const _origCreate = MenuScene.prototype.create;
    MenuScene.prototype.create = function(d){
      _origCreate.call(this, d);
      try {
        _addWatermark(this);
        (this.children && this.children.list || []).forEach(o => {
          if(!o || o.type !== 'Text') return;
          if(PRIMARY_LOCKED.has(o.text)){
            o.setColor('#553344');
            o.setText(o.text + ' [DEMO]');
          } else if(SECONDARY_LOCKED.has(o.text)){
            o.setColor('#553344');
            o.setText(o.text + ' [DEMO]');
          } else if(DIFF_LOCKED.has(o.text)){
            o.setAlpha(0.3);
            o.setColor('#553344');
          }
        });
      } catch(e) { console.warn('[DEMO] MenuScene patch:', e); }
    };
  }

  // ── Section 2: Settings difficulty lock ──────────────
  if(typeof Settings !== 'undefined' && typeof Settings.set === 'function'){
    const _origSet = Settings.set.bind(Settings);
    Settings.set = function(key, value){
      if(key === 'difficulty' && value !== 'daemon') return;
      return _origSet(key, value);
    };
    try { _origSet('difficulty', 'daemon'); } catch {}
  }

  // ── Section 3: Save.ownsArchetype — gate to demo set ─
  // Show all 8 cards but only reflector+corruptor are owned/selectable.
  // Existing ArchetypeSelectScene render path dims locked cards and shows
  // a "⚿ LOCKED" badge; we rewrite that badge to "⚿ DEMO" post-render.
  if(typeof Save !== 'undefined' && typeof Save.ownsArchetype === 'function'){
    const _origOwns = Save.ownsArchetype.bind(Save);
    Save.ownsArchetype = function(id){
      if(window.DEMO_MODE) return DEMO_ARCH_IDS.has(id);
      return _origOwns(id);
    };
  }

  // ── Section 4: ArchetypeSelectScene — watermark + badge rewrite ─
  if(typeof ArchetypeSelectScene !== 'undefined'){
    const _orig = ArchetypeSelectScene.prototype.create;
    ArchetypeSelectScene.prototype.create = function(d){
      _orig.call(this, d);
      try {
        _addWatermark(this);
        (this.children && this.children.list || []).forEach(o => {
          if(!o || o.type !== 'Text') return;
          if(o.text === '⚿ LOCKED'){
            o.setText('⚿ DEMO');
            o.setColor('#ffaa00');
          } else if(typeof o.text === 'string' && o.text.indexOf('UNLOCK IN DATA_SHOP') !== -1){
            o.setText('[ ⚿ DEMO — AVAILABLE IN FULL VERSION ]');
            o.setColor('#ffaa00');
          }
        });
      } catch(e) { console.warn('[DEMO] ArchetypeSelectScene patch:', e); }
    };
  }

  // ── Section 5: GameScene — full-screen demo-end overlay
  // After the wave-5 boss fight + relic + upgrade pick conclude, the engine
  // calls _startWave to begin wave 6. We intercept there: skip wave 6 entirely,
  // pause the scene, and draw a full-screen modal that waits for input before
  // routing to MenuScene. Skipping _origStartWave is safe because we pause
  // everything and route away before any downstream code reads wave-6 state.
  function _showDemoEndOverlay(scene){
    const W_ = (typeof W !== 'undefined') ? W : 1280;
    const H_ = (typeof H !== 'undefined') ? H : 720;
    const D = 9990;
    scene.add.rectangle(W_/2, H_/2, W_, H_, 0x000000, 0.94).setDepth(D);
    scene.add.rectangle(W_/2, H_/2, W_-80, H_-160).setStrokeStyle(2, 0xffaa00, 0.85).setDepth(D+1);
    scene.add.rectangle(W_/2, H_/2, W_-100, H_-180).setStrokeStyle(1, 0xffaa00, 0.35).setDepth(D+1);
    scene.add.text(W_/2, H_/2 - 80, 'THANK YOU FOR PLAYING', {
      fontFamily:"'Orbitron',sans-serif", fontSize:'30px', fontStyle:'900', color:'#ffaa00', letterSpacing:4
    }).setOrigin(0.5).setDepth(D+2);
    scene.add.text(W_/2, H_/2 - 40, 'THE DEMO', {
      fontFamily:"'Orbitron',sans-serif", fontSize:'30px', fontStyle:'900', color:'#ffaa00', letterSpacing:4
    }).setOrigin(0.5).setDepth(D+2);
    scene.add.text(W_/2, H_/2 + 10, FULL_LINK, {
      fontFamily:"'Courier New',monospace", fontSize:'18px', color:'#ffd166', letterSpacing:2
    }).setOrigin(0.5).setDepth(D+2);
    scene.add.text(W_/2, H_/2 + 50, 'you defeated FIREWALL on wave ' + (scene.wave || 5), {
      fontFamily:"'Courier New',monospace", fontSize:'13px', color:'#888888'
    }).setOrigin(0.5).setDepth(D+2);
    const prompt = scene.add.text(W_/2, H_/2 + 120, '[ PRESS ANY KEY OR CLICK TO RETURN TO MENU ]', {
      fontFamily:"'Courier New',monospace", fontSize:'14px', fontStyle:'bold', color:'#00cc66', letterSpacing:1
    }).setOrigin(0.5).setDepth(D+2);
    try {
      scene.tweens.add({targets: prompt, alpha:{from:1, to:0.3}, duration:800, yoyo:true, repeat:-1});
    } catch {}

    let _routed = false;
    const _goMenu = () => {
      if(_routed) return; _routed = true;
      try { scene.scene.start('MenuScene'); } catch {}
    };
    scene.input.once('pointerdown', _goMenu);
    try { scene.input.keyboard && scene.input.keyboard.once('keydown', _goMenu); } catch {}
  }

  if(typeof GameScene !== 'undefined'){
    const _origStartWave = GameScene.prototype._startWave;
    if(typeof _origStartWave === 'function'){
      GameScene.prototype._startWave = function(){
        if(this.wave === 5 && !this._demoEnded){
          this._demoEnded = true;
          // Pause gameplay so no enemies spawn / move under the overlay
          try { this.paused = true; } catch {}
          try { this._dead = true; } catch {}
          try { if(this.spawner && this.spawner.stop) this.spawner.stop(); } catch {}
          try { if(this.physics && this.physics.pause) this.physics.pause(); } catch {}
          _showDemoEndOverlay(this);
          return;  // never start wave 6
        }
        return _origStartWave.call(this);
      };
    }
  }

  // ── Section 6: RunSummaryScene — demo footer ─────────
  if(typeof RunSummaryScene !== 'undefined'){
    const _origRS = RunSummaryScene.prototype.create;
    RunSummaryScene.prototype.create = function(d){
      _origRS.call(this, d);
      try {
        const W_ = (typeof W !== 'undefined') ? W : 1280;
        const H_ = (typeof H !== 'undefined') ? H : 720;
        this.add.text(W_/2, H_-26, '— DEMO BUILD — ' + FULL_LINK + ' —',
          {fontFamily:'Courier New', fontSize:'14px', color:'#ffaa00', fontStyle:'bold'})
          .setOrigin(0.5).setDepth(100);
      } catch {}
    };
  }

  try { console.log('[DEMO MODE] active — restrictions applied'); } catch {}
})();
