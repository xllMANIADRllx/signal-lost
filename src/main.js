// ═══════════════════════════════════════════════════════════
// MAIN — Phaser game bootstrap
// ═══════════════════════════════════════════════════════════

new Phaser.Game({
  type:            Phaser.AUTO,
  width:           W,
  height:          H,
  backgroundColor: '#020804',
  antialias:       false,
  roundPixels:     true,
  scene: [
    MenuScene,
    BootScene,
    ArchetypeSelectScene,
    ForgeScene,
    StatsScene,
    AchievementsScene,
    CorruptedBriefingScene,
    MetaUpgradeScene,
    RunSummaryScene,
    GameScene,
    DevOverlay,
    DailyChallengeScene,
    OverclockScene,
    UpgradeScene,
    GameOverScene,
    BossCutsceneScene,
    ShopScene,
    CodexScene,
    SettingsScene,
  ],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target:           45,
    forceSetTimeOut:  false,
    smoothStep:       true,
  },
  callbacks: {
    postBoot: (game) => {
      window.SL = game; // dev hook — exposes game instance for console/MCP debugging
      // Retina-aware CRT init
      CRT.init();

      // ── DOM FPS counter — toggle via console: window._fps.show() / .hide()
      // Works across every scene (Phaser's in-scene counter only runs inside GameScene).
      (function(){
        const el = document.createElement('div');
        el.id = '_fpsHud';
        el.style.cssText = 'position:fixed;top:6px;left:8px;z-index:99999;font-family:"Courier New",monospace;font-size:12px;color:#00ff66;background:rgba(0,0,0,0.65);padding:4px 8px;border:1px solid #00cc66;pointer-events:none;display:none;';
        document.body.appendChild(el);
        let frames=0, last=performance.now(), rafActive=false;
        function tick(){
          frames++;
          const now = performance.now();
          if(now - last >= 500){
            const fps = Math.round((frames * 1000) / (now - last));
            el.textContent = 'FPS: ' + fps;
            frames = 0; last = now;
          }
          if(rafActive) requestAnimationFrame(tick);
        }
        window._fps = {
          show(){ el.style.display='block'; if(!rafActive){ rafActive=true; requestAnimationFrame(tick); } },
          hide(){ el.style.display='none'; rafActive=false; },
        };
      })();

      // ── Dev menu password gate ──
      // First Shift+Tab in a session shows a DOM modal requesting the password.
      // Once entered correctly, window._devUnlocked = true and subsequent
      // Shift+Tab presses open/close DevOverlay directly (no re-prompt).
      // Capture-phase stopPropagation on the input prevents key events from
      // bubbling to Phaser's keyboard manager (which would otherwise trigger
      // scene transitions on ENTER — CorruptedBriefingScene + MetaUpgradeScene).
      const _DEV_PASSWORD = '0144235346Dg1';
      window._devUnlocked = false;

      function _openDevOverlay(){
        const gs = game.scene.getScene('GameScene');
        const gsActive = !!(gs && gs.sys.isActive() && !gs._sandbox);
        if(gsActive) game.scene.pause('GameScene');
        game.scene.run('DevOverlay', {pausedGame: gsActive});
      }

      function _closeDevPasswordPrompt(){
        const el = document.getElementById('devPwPrompt');
        if(el) el.remove();
      }

      function _showDevPasswordPrompt(){
        if(document.getElementById('devPwPrompt')) return;
        const wrap = document.createElement('div');
        wrap.id = 'devPwPrompt';
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:"Courier New",monospace;color:#00cc66;';
        wrap.innerHTML = `
          <div style="border:2px solid #00cc66;padding:40px 56px;text-align:center;max-width:680px;background:#020804;box-shadow:0 0 24px rgba(0,255,102,0.18);">
            <div style="font-size:22px;font-weight:bold;letter-spacing:4px;margin-bottom:18px;color:#00ff66;">// DEV_AUTH_REQUIRED</div>
            <div style="font-size:14px;line-height:1.6;margin-bottom:8px;">Entering dev menu</div>
            <div style="font-size:13px;line-height:1.6;margin-bottom:28px;color:#669988;">if you are not a developer press <span style="color:#ffaa00;">Shift+Tab</span> to go back</div>
            <input id="devPwInput" type="password" autocomplete="off" spellcheck="false" placeholder="enter password..." style="width:380px;padding:12px 16px;background:#000;border:1px solid #00cc66;color:#00ff66;font-family:'Courier New',monospace;font-size:15px;letter-spacing:3px;outline:none;text-align:center;" />
            <div id="devPwErr" style="font-size:11px;color:#ff4444;margin-top:14px;min-height:14px;letter-spacing:1px;"></div>
            <div style="font-size:10px;color:#445544;margin-top:24px;letter-spacing:2px;">[ ENTER to submit · Shift+Tab to cancel ]</div>
          </div>
        `;
        document.body.appendChild(wrap);
        const input = document.getElementById('devPwInput');
        const err = document.getElementById('devPwErr');
        setTimeout(() => { try { input.focus(); } catch {} }, 30);
        // CAPTURE-PHASE stopPropagation on every key event — prevents ENTER
        // from bubbling to Phaser scene listeners (which would otherwise
        // trigger keydown-ENTER on CorruptedBriefingScene / MetaUpgradeScene).
        const _blockKeys = ev => {
          ev.stopPropagation();
          if(ev.key === 'Enter'){
            ev.preventDefault();
            if(input.value === _DEV_PASSWORD){
              window._devUnlocked = true;
              _closeDevPasswordPrompt();
              _openDevOverlay();
            } else {
              err.textContent = '> ACCESS DENIED';
              input.value = '';
              input.style.borderColor = '#ff4444';
              setTimeout(() => { input.style.borderColor = '#00cc66'; }, 600);
            }
          }
        };
        input.addEventListener('keydown', _blockKeys, true);
        input.addEventListener('keyup',   ev => ev.stopPropagation(), true);
        input.addEventListener('keypress',ev => ev.stopPropagation(), true);
      }

      // Global Shift+Tab — open/close DevOverlay (gated by password)
      document.addEventListener('keydown', e => {
        if(e.key === 'Tab' && e.shiftKey){
          e.preventDefault();
          const gs = game.scene.getScene('GameScene');
          // In sandbox: Shift+Tab triggers exit confirm instead
          if(gs && gs.sys.isActive() && gs._sandbox){
            gs._sandboxExitConfirm();
            return;
          }
          // Second Shift+Tab while password prompt is open = cancel
          if(document.getElementById('devPwPrompt')){
            _closeDevPasswordPrompt();
            return;
          }
          if(game.scene.isActive('DevOverlay')){
            const dev = game.scene.getScene('DevOverlay');
            if(dev) dev._close();
          } else if(!window._devUnlocked){
            _showDevPasswordPrompt();
          } else {
            _openDevOverlay();
          }
        }
      });

      try { if (window._bootHide) window._bootHide(); } catch {}

      // Fullscreen handling
      document.addEventListener('fullscreenchange', () => {
        Settings.set('fullscreen', document.fullscreenElement != null);
      });

      const hasVisited = localStorage.getItem('sl_visited');
      if (!hasVisited) {
        localStorage.setItem('sl_visited', '1');
        Settings.set('fullscreen', true);
      }
      if (Settings.get('fullscreen')) {
        try { document.documentElement.requestFullscreen().catch(() => {}); } catch {}
      }
    },
  },
});
