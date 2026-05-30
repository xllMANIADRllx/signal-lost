// ═══════════════════════════════════════════════════════════
// GAMESCENE
// ═══════════════════════════════════════════════════════════

class GameScene extends Phaser.Scene{
  constructor(){super('GameScene');}

  shutdown(){
    try{
      // Stop all time events first
      if(this.time)this.time.removeAllEvents();
      if(this.tweens)this.tweens.killAll();
      // Clear arrays
      this.particles=[];this.bullets=[];this.enemies=[];this.fragParts=[];
      this.shockRings=[];this.pingRings=[];this.powerups=[];this.hazards=[];
      this.dashTrail=[];this.packetTrace=[];this.nullZones=[];this._ghostEchoes=[];
      // Clear all graphics synchronously — setTimeout caused race with Phaser's
      // own scene-stop teardown (cleared destroyed graphics → null renderer canvas)
      const gfxList=[this.gfxMain,this.gfxFx,this.gfxFx2,this.gfxHazard,this.gfxHud,this.gfxBg];
      gfxList.forEach(g=>{ if(g){ try{g.clear();}catch{} } });
      if(this._backtickListener){window.removeEventListener('keydown',this._backtickListener);this._backtickListener=null;}
      this._lastTrailDecay=null; // reset wall-clock dashTrail decay so re-entry doesn't apply a huge dt
      // Kill new dash tween + trail emission event so they don't fire post-shutdown
      try { if(this._dashTween) this._dashTween.stop(); } catch {}
      try { if(this._dashTrailEvt) this._dashTrailEvt.remove(false); } catch {}
      this._dashTween = null;
      this._dashTrailEvt = null;
      this._dashing = false;
      this._dashCdT = 0;
      // Stop all time events
      if(this.time)this.time.removeAllEvents();
      // Stop tweens
      if(this.tweens)this.tweens.killAll();
    }catch(e){}
  }

  _showTerminating(onDone){
    // Full screen terminal "terminating" overlay — hides the freeze
    const overlay=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(200);
    overlay.setAlpha(0);this.tweens.add({targets:overlay,alpha:1,duration:180});

    const lines=[
      {t:0,   txt:'> TERMINATE_PROCESS — SIGNAL LOST',      col:'#ff2244'},
      {t:120, txt:'> KILLING ALL CHILD PROCESSES...',        col:'#ff4444'},
      {t:260, txt:'> FLUSHING MEMORY BUFFERS...',            col:'#882222'},
      {t:400, txt:'> WRITING CORE DUMP...',                  col:'#662222'},
      {t:520, txt:'> CLEARING WARP FIELD ARRAY...',          col:'#441111'},
      {t:640, txt:'> PROCESS TERMINATED — EXIT CODE 0',      col:'#ff2244'},
    ];

    lines.forEach((l,i)=>{
      this.time.delayedCall(l.t,()=>{
        const y=H/2-60+i*22;
        const txt=this.add.text(W/2,y,l.txt,{
          fontFamily:"'Courier New',monospace",fontSize:'13px',color:l.col
        }).setOrigin(0.5).setDepth(201).setAlpha(0);
        this.tweens.add({targets:txt,alpha:1,duration:60});
        if(i===0)CRT&&CRT.glitch&&CRT.glitch(0.5);
      });
    });

    // After lines finish, call onDone
    this.time.delayedCall(900,onDone);
  }

  _goToMenu(){
    try{this._endRun&&this._endRun();}catch{}
    try{Snd._startMenuMusic_resume();}catch{}
    this.shutdown();
    this.cameras.main.fadeOut(280,0,0,0);
    setTimeout(()=>{
      try{
        this.scene.setVisible(false,'GameScene');
        const ms=this.game.scene.getScene('MenuScene');
        if(ms&&ms.sys.isSleeping()){this.scene.wake('MenuScene');}
        else{this.scene.start('MenuScene');}
        setTimeout(()=>{
          try{this.scene.stop('GameScene');}catch{}
          try{this.scene.stop('GameOverScene');}catch{}
          try{this.scene.stop('UpgradeScene');}catch{}
          try{this.scene.stop('OverclockScene');}catch{}
        },300);
      }catch(e){try{this.scene.start('MenuScene');}catch{}}
    },290);
  }

  init(d){
    this.mode=d&&d.mode||'normal';
    this.debugData=d&&d.debugWave?d:null; // restore state if debug mode
    this._initData=d||{}; // store full data for archetype seeds etc
    // Snapshot, don't reference — ascension mutates these fields per-run and
    // a shared reference would contaminate Daily/Sandbox runs in the same session.
    this.diff={...DIFFICULTY[Settings.get('difficulty')||'daemon']};
  }

  create(){
    // Restore CRT in case we're coming from GameOverScene (which sets suppress=true)
    try{ CRT.suppress = false; CRT.inGame = true; }catch{}
    // Guarantee audio is initialized regardless of entry path (sandbox restart,
    // DevOverlay direct launch, etc. could bypass MenuScene's audio resume).
    try { Snd.init(); if(Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); } catch {}
    // Boss families mapped to lore indices. Each first-kill unlocks one entry.
    this._BOSS_LORE={
      FIREWALL:0,VOID:1,GHOST:2,CORE:3
    };
    // Wave milestones: unlock lore + grant shard bonus at thresholds
    this._WAVE_MILESTONES={5:4,10:5,15:6,20:7};

    Snd.init();
    this._dead=false;
    this.t=0;
    this._bgHexes=[]; // I9 — foreground hex-fragment ambient particles
    // Target position (where cursor is)
    this.tx=W/2;this.ty=H/2;
    // Actual player position (smoothly follows)
    this.px=W/2;this.py=H/2;
    this.pressing=false;this.fingerDown=false;
    this.bubbleRadius=0;this.bubbleCharge=0;this.bubbleTier=0;
    this.signal=0;this.surgeActive=false;this.surgeT=0;
    this.pingCooldownT=0;   // signal ping cooldown
    this.pingRings=[];      // expanding hex rings from ping
    // Heat system
    this.bubbleHeat=0;           // 0-100
    this.bubbleOverheated=false;
    this.bubbleCooldownT=0;      // cooldown timer after overheat
    this.parryWindowT=0;         // 0.5s parry window after overheat
    // Dash (rebuilt — tween-based; single state field)
    this._dashing=false;          // true while dash tween is active
    this._dashCdT=0;              // cooldown remaining
    this._dashTween=null;         // active tween ref
    this._dashTrailEvt=null;      // trail emission event
    this.dashTrail=[];            // visual afterimages (still rendered)
    this.glitchSplit=0;       // RGB split duration on player
    this.packetTrace=[];      // recent movement path points
    this.sysLogLines=[];      // terminal feed lines
    this.sysLogT=0;           // log scroll timer
    this.bootEnemies=[];      // enemies in boot-sequence materializing
    this.shockRings=[];       // chain shockwave rings
    this.fragParts=[];        // shape death fragments
    this.movTrail=[];         // data fragmentation movement trail
    this._ghostTraceT=0;      // ghost_trace damage tick timer
    this._statsOpen=false;     // stats overlay flag
    this._devOpen=false;       // dev overlay flag
    this._sandbox=false;       // sandbox mode — no auto spawns
    this._devTab=0;            // active dev tab index
    this._devGodMode=false;    // god mode flag
    this.bossRelics=[];        // relics dropped by bosses
    this._packetWallCount=0;   // PACKET_WALL relic counter
    this._gravEchoActive=[];   // GRAVITY_ECHO orbiting bullets
    this._phaseCloneT=0;       // PHASE_CLONE timer
    this._dmgFlashT=0;         // player hit-flash timer
    this.corruptZones=[];     // drifting corruption zones
    this.scoreDisplay=0;      // animated score display
    this.chargeIndicators=[]; // bullet charge-up dots
    // (dashActiveT removed — new dash uses tween duration as single source of truth)
    this.enemies=[];this.bullets=[];this.particles=[];this.powerups=[];
    this.hazards=[];this.trail=[];this.gridNodes=[];this.nodes=[];
    this.memSectors=[];   // locked grid squares that block bullets
    this.score=0;this.shards=0;this.combo=0;this.comboT=0;
    this.totalKills=0;        // lifetime kills this run
    this.waveModifier=null;   // current wave modifier
    this.endlessT=0;          // endless mode timer (seconds survived)
    this.endlessPhase=0;      // current endless phase 0-4
    this.endlessAutoUpgrT=0;  // auto-upgrade timer
    this.endlessBossT=0;      // next boss timer
    this.endlessScoreMult=1;  // grows over time
    this.rapidKillT=0;        // rapid kill window timer
    this.rapidKillCount=0;    // kills in current window
    this.freeReflectT=0;      // free reflect window (no heat)
    this.overclockBurst=false; // compat
    this._burstReady=false;   // actual overclock burst ready flag
    this.phantomDecoys=[];    // phantom skin dash decoys
    this.stackOverflowT=0;    // active overflow timer
    this.stackNextAt=50;      // next overflow trigger kill count
    this.memDumpT=0;          // memory dump cooldown
    this.memDumpActive=false; // is dump currently showing
    this.memDumpTimer=0;
    this.chainCount=0;this.bestChain=0;this.timeAlive=0;this._rollbackUsed=false;
    // ── Daily challenge tracking ──
    this._died=false;
    this._dashUses=0;
    this._maxHeat=0;
    this._usedShield=false;
    this._monoWave=false;
    this._comboTime15=0;       // seconds spent at combo >=15
    this._perfectWave3=true;   // assume perfect until damage taken on wave 3
    this._totalReflects=0;
    this._bestPing=0;
    this._totalCorrupted=0;
    this._maxDefected=0;
    this._pingUsedOnBoss=false;
    this._bossNoP=true;        // assume no ping on boss until proven
    this._killStreak5=false;
    this._powerUsed=false;
    this._upgSelected=0;       // count upgrades selected
    this._maxCombo=0;
    this._waveModCount=0;
    this._bossUnder60=false;
    this._bossNoDamage    = false;
    this._surgeFires      = 0;
    this._volatileExplosions = 0;
    this._waveBestReflects = 0;
    this._waveReflects    = 0;
    this._bossStartT=0;
    this._coreDistortT=0;
    this.wave=0;this.kills=0;this.killsNeeded=9999;
    this._tutOnline=false;this._tutStep=0;this._tutBullet=null;
    this.bossWave=false;
      try{Snd.stopBossMusic();}catch{}this.paused=false;this.spawnT=0;
    this.scoreMulti=1;this.shieldActive=false;this.shieldHits=0;this.shieldMaxHits=0;this.shieldRegenT=0;this.extraLife=false;this.invincT=0;
    this.upgradesList=[];this.synergies=[];this.formationT=0;this.hazardT=0;
    this.loreUnlocked=[];
    this.upg={bubble_size:0,bubble_speed:0,reflect_speed:0,shield:0,magnet:0,multishot:0,slow:0,score_boost:0,bubble_armor:0,signal_fork:0,packet_cache:0,null_shield:0,echo_protocol:0,corrupt_data:0,ghost_trace:0,overclock_burst:0,signal_decay:0,firewall_breach:0,chain_amplifier:0};

    const ship=SHIPS[Save.skin()];
    this.shipColor=ship.color;this.trailColor=ship.trailColor;
    this.activeSkin=Save.skin();
    // ── Archetype seeds ──
    const _seeds=(this._initData&&this._initData.archetypeSeeds)||(this.debugData&&this.debugData.archetypeSeeds)||{};
    Object.entries(_seeds).forEach(([k,v])=>{this.upg[k]=(this.upg[k]||0)+v;});
    const _arcPower=(this._initData&&this._initData.archetypePower)||(this.debugData&&this.debugData.archetypePower)||null;
    if(_arcPower)Save.set('equipped_power',_arcPower);
    this.activePower=Save.get('equipped_power','ping')||'ping';
    this._archetype=(this._initData&&this._initData.archetype)||(this.debugData&&this.debugData.archetype)||null;
    try{Save.set('last_run_archetype',JSON.stringify({archetype:this._archetype,archetypeSeeds:this._initData?.archetypeSeeds,archetypePower:this._initData?.archetypePower}));}catch{}
    // Persist archetype run data so REINITIALISE can restore it
    if(this._initData&&this._initData.archetypeSeeds){
      Save.set('last_run_archetype',JSON.stringify({
        archetype:this._initData.archetype,
        archetypeSeeds:this._initData.archetypeSeeds,
        archetypePower:this._initData.archetypePower,
        mode:this._initData.mode||this.mode,
      }));
    }
    this._challengeId=(this._initData&&this._initData.challengeId)||null;
    this._sandbox=(this._initData&&this._initData.sandbox)||false;
    this._sbObjs=null; // always clear on scene restart so _initSandboxHUD recreates on re-entry
    // _archetype and _challengeId set above from _initData
    // ── Skin passive: CORE — 2-hit shield ──
    if(this.activeSkin==='core'){const extra=Save.meta('redundant_buf',false)?1:0;this._setShield(3+extra);}
    // ── Skin passive: RANGER — adaptive routing tracker ──
    this.rangerSpeedBonus=0; // resets each run, builds per wave
    // ── Skin passive: INFERNO — rage meter ──
    this.rageMeter=0;
    this.rageActive=false;
    this.rageT=0;
    this._ghostEchoes=[];
    ship.passives.forEach(p=>this.upg[p]=(this.upg[p]||0)+1);
    if(Save.meta('start_shield',false)){const extra=Save.meta('redundant_buf',false)?1:0;this._setShield(2+extra);}
    if(Save.meta('start_score',false))this.scoreMulti*=1.25;
    // ── Meta upgrade effects ──
    if(Save.hasMeta('redundant_buf')||Save.hasMeta('start_shield')){const hits=Save.hasMeta('redundant_buf')?2:1;this._setShield((this.shieldHits||0)+hits);}
    if(Save.hasMeta('redundant_path'))this.extraLife=true;
    if(Save.hasMeta('overclock_chip'))this.upg.overclock_burst=(this.upg.overclock_burst||0)+1;
    if(Save.hasMeta('ghost_protocol'))this.upg.ghost_trace=(this.upg.ghost_trace||0)+1;
    if(Save.hasMeta('slow_combo'))this._slowComboMeta=true;
    // ── New shop patches ──
    if(Save.hasMeta('cooldown_patch'))this._bubbleCooldownOverride=1.8;
    if(Save.hasMeta('dash_patch'))this._dashCooldownOverride=0.8;
    this._regenPatch=Save.hasMeta('regen_patch');
    this._chainPatchBonus=Save.hasMeta('chain_patch')?1:0;
    if(Save.hasMeta('firewall_seed'))this._setShield(Math.max(this.shieldHits,2));
    if(Save.hasMeta('data_cache'))this.scoreMulti*=1.25;
    this._comboTimerBonus=Save.hasMeta('combo_memory')?0.5:0;
    this._heatSinkMult=Save.hasMeta('heat_sink')?1.2:1.0;
    this._heatGainMult=Save.hasMeta('coolant_loop')?0.75:1.0; // COOLANT_LOOP slows heat ACCUMULATION (distinct from _heatSinkMult which speeds COOLING)
    this._signalGainMult=Save.hasMeta('kernel_access')?1.5:1.0; // shop KERNEL_ACCESS patch: surge fills 50% faster
    this._heatVentMeta=Save.hasMeta('heat_vent');
    this._heatVentCount=0;
    this._lensFocusMeta=Save.hasMeta('lens_focus');
    this._primedBubbleMeta=Save.hasMeta('primed_bubble');
    this._resonanceMeta=Save.hasMeta('resonance');
    this._thermalBleedMeta=Save.hasMeta('thermal_bleed');
    this._lastStandMeta=Save.hasMeta('last_stand');
    this._dashInvincBonus=Save.hasMeta('kinetic_damper')?0.3:0;
    this._shardMulti=Save.hasMeta('shard_doubler')?2:1;
    this._bossScoreMulti=Save.hasMeta('boss_trace')?1.25:1;
    this._perfectReflectMeta=Save.hasMeta('perfect_reflect');
    this._perfectReflectUntil=0;

    // ── ASCENSION — per-run modifier state ──
    this._ascensionLevel = (this._initData && Number.isInteger(this._initData.ascension)) ? this._initData.ascension : 0;
    this._killsNeededBonus = 0;
    this._bulletDmgMult = 1;
    this._overheatPctMult = 0;     // additive: 0.10 means -10% threshold
    this._powerCdMult = 1;
    this._eliteChanceBonus = 0;    // additive percentage
    this._bossPhaseBonus = 0;      // +1 per row that adds it
    this._bossHpMult = 1;
    this._startWaveModRoll = false;
    this._applyAscension();
    this._applyArchetypeMastery();

    // ── SIDE OBJECTIVES — counters + draw pool ──
    this._chainReactions = 0;
    this._wavesNoOverheat = 0;
    this._powerUsesTotal = 0;
    this._sideObjResults = [];

    // ── POWER FX state — signature VFX per activation ──
    this._powerSlowT     = 0;     // brief 30% timescale after dramatic powers
    this._lightningBolts = [];    // EMP burst + chain trigger jagged lines
    this._decoyOutlines  = [];    // fading rectangular outlines around decoys
    this._overclockSparks = null; // {t, dur} — orbiting sparks while active
    try{
      const N = this._ascensionLevel || 0;
      const count = N >= 15 ? 4 : N >= 5 ? 3 : 2;
      this._sideObjectives = (typeof drawSideObjectives === 'function') ? drawSideObjectives(count) : [];
    }catch{ this._sideObjectives = []; }

    this.STAGES=[
      {name:'SURFACE_LAYER', label:'01', grid:0x001a0a, bg:'#020804', accent:0x00cc66,
       bgStyle:'traces'},   // data pulses on circuit traces
      {name:'KERNEL_SPACE',  label:'02', grid:0x1a0800, bg:'#080200', accent:0xff6600,
       bgStyle:'circuit'},  // amber circuit board, heat distortion
      {name:'DEEP_MEMORY',   label:'03', grid:0x0d0022, bg:'#050010', accent:0xaa44ff,
       bgStyle:'glitch'},   // purple glitch scanlines, pixel noise
      {name:'SECTOR_00',     label:'04', grid:0x1a1600, bg:'#0a0800', accent:0xffd700,
       bgStyle:'fractal'},  // gold rotating crystal geometry
    ];
    this.stage=0;
    this.gfxGrid=this.add.graphics();
    this.gfxBgDepth=this.add.graphics();  // circuit board — above grid
    this.gfxHazard=this.add.graphics();
    this.gfxBubble=this.add.graphics();
    this.gfxMain=this.add.graphics();
    this.gfxUi=this.add.graphics();
    this.gfxHud=this.add.graphics().setDepth(11);
    this.gfxVignette=this.add.graphics(); // danger vignette
    this.gfxCursor=this.add.graphics().setDepth(200); // custom cursor
    this.gfxFx2=this.add.graphics().setDepth(15); // extra fx layer

    this._buildGridNodes();
    this._buildUI();
    this._initBgLayers();
    this._initCorruptZones();
    this._setupInput();

    this.banner=new BannerManager(this);

    this.events.on('resume',(_,d)=>{
      if(!d)return;
      // Always clean up any wave clear overlay objects and restore camera
      if(this._waveClearObjs){
        this._waveClearObjs.forEach(o=>{try{o&&o.destroy();}catch{}});
        this._waveClearObjs=null;
      }
      this.cameras.main.resetFX();
      this.cameras.main.fadeIn(500,0,0,0);
      if('upgrade' in d){
        this._applyUpgrade(d.upgrade);
        if(d.overclocked)this._applyOverclock();
        this._startWave();
      }
      CRT.inGame=true; // restore cursor on resume
    try{Snd.startGameMusic();}catch{}
      if(d.bossReady){
        const _bossN=(Math.floor(this.wave/5)-1)%4+1;
        try{Snd.startBossMusic(_bossN);}catch{}
        this._spawnBossNow();
      }
      if(d.fromSettings){
        this.paused=false;this._drawPauseOverlay(false);
        if(window._hudRebuildNeeded){
          window._hudRebuildNeeded=false;
          // Preserve run state and restart scene with it
          this.scene.restart({
            mode:this.mode,
            debugWave:this.wave,
            debugScore:this.score,
            debugUpgrades:this.upg,
            hudRebuilt:true,
          });
        }
      }
    });

    CRT.inGame=true;
    try{Snd.startGameMusic();}catch{}
    this.cameras.main.fadeIn(550,0,0,0);
    // Apply difficulty multipliers
    try{
      const d2=this.diff||DIFFICULTY.daemon;
      const routerOwned=Save.meta('packet_router',false);
    this.pingBaseCD=(d2===DIFFICULTY.packet?12:d2===DIFFICULTY.kernel?18:15)-(routerOwned?5:0);
    }catch(e){console.error('[DIFFICULTY INIT]',e);}
    // Debug mode: restore wave/score/upgrades
    if(this.debugData){
      try{
        const dd=this.debugData;
        this.wave=dd.debugWave-1; // _startWave will increment
        this.score=dd.debugScore||0;
        this.scoreDisplay=this.score;
        if(dd.debugUpgrades)Object.assign(this.upg,dd.debugUpgrades);
        this.banner.show('DEBUG: WAVE RESTORED','#ffaa00',1500);
        this._sysLog('[DEBUG] PROCESS STATE RESTORED FROM CORE DUMP');
      }catch(e){console.error('[DEBUG RESTORE]',e);}
    }
    // Carry over rollback flag so it can't be used again this run
    if(this.debugData&&this.debugData.rollbackUsed)this._rollbackUsed=true;
    // Pick run mutations — count scales by difficulty (PACKET=0, DAEMON=1, KERNEL=2)
    const _mutCount = (this.diff && typeof this.diff.mutations === 'number') ? this.diff.mutations : 1;
    this._runMutations = _pickRunMutations(_mutCount);
    // Mutation reveal — slides down from top, matches banner style (skipped in sandbox)
    if(!this._sandbox&&this._runMutations&&this._runMutations.length>0){
      const LP=130, RP=130;
      const BW=W-LP-RP, BX=LP; // same span as banners
      const PH=58, GAP=4;
      const panels=[];

      const ov=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(60);
      this.tweens.add({targets:ov,alpha:0.65,duration:280});

      this._runMutations.forEach((m,i)=>{
        const col=m.col;
        const mc='#'+col.toString(16).padStart(6,'0');
        const targetY=8+i*(PH+GAP);
        const startAbove=targetY-(PH+GAP+4);
        const bg  =this.scene?this.add.rectangle(BX,startAbove,BW,PH,0x000000,0.97).setOrigin(0,0).setDepth(62):null;
        if(!bg)return;
        const tbar=this.add.rectangle(BX,startAbove,BW,2,col,0.95).setOrigin(0,0).setDepth(63);
        const bbar=this.add.rectangle(BX,startAbove+PH,BW,1,col,0.2).setOrigin(0,0).setDepth(63);
        const tag =this.add.text(BX+14,startAbove+7,'PROCESS_MODIFIER',{fontFamily:"'Courier New',monospace",fontSize:'8px',color:mc,letterSpacing:2}).setDepth(64);
        const name=this.add.text(BX+14,startAbove+18,m.label,{fontFamily:"'Courier New',monospace",fontSize:'14px',fontStyle:'bold',color:mc,letterSpacing:1}).setDepth(64);
        const desc=this.add.text(BX+14,startAbove+36,m.desc,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#557755'}).setDepth(64);
        const objs=[bg,tbar,bbar,tag,name,desc];
        this.time.delayedCall(i*200,()=>{
          this.tweens.add({targets:objs,y:`+=${PH+GAP+4}`,duration:220,ease:'Power3.Out'});
        });
        panels.push(...objs);
      });

      const promptY=8+this._runMutations.length*(PH+GAP)+8;
      const prompt=this.add.text(W/2,promptY,'[ CLICK OR PRESS ANY KEY TO CONTINUE ]',{
        fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#336644',letterSpacing:2
      }).setOrigin(0.5,0).setDepth(64).setAlpha(0);
      this.time.delayedCall(this._runMutations.length*200+200,()=>{
        this.tweens.add({targets:prompt,alpha:1,duration:200});
        this.tweens.add({targets:prompt,alpha:0.15,duration:500,yoyo:true,repeat:-1});
      });
      panels.push(prompt);

      const dismiss=()=>{
        this.input.off('pointerdown',dismiss);
        this.input.keyboard&&this.input.keyboard.off('keydown',dismiss);
        this.tweens.add({targets:panels,y:'-=70',alpha:0,duration:200,ease:'Power2.In',
          onComplete:()=>{
            panels.forEach(o=>{try{o.destroy();}catch{}});
            this.tweens.add({targets:ov,alpha:0,duration:180,onComplete:()=>{try{ov.destroy();}catch{}}});
            this._startWave();
          }
        });
      };
      this.time.delayedCall(this._runMutations.length*200+400,()=>{
        this.input.once('pointerdown',dismiss);
        this.input.keyboard&&this.input.keyboard.once('keydown',dismiss);
      });
    } else {
      // Defer by one tick so any deferred create() work (e.g. tutorial UI at L843+) is in place.
      this.time.delayedCall(0,()=>this._startWave());
    }
  }

  // ─── GRID ────────────────────────────────────────────────
  _buildGridNodes(){
    const cols=W/80+1,rows=H/80+1;
    for(let xi=0;xi<cols;xi++)for(let yi=0;yi<rows;yi++)this.gridNodes.push({x:xi*80,y:yi*80,ox:xi*80,oy:yi*80,vx:0,vy:0});
  }
  _pushGrid(cx,cy,force){
    this.gridNodes.forEach(n=>{const dx=n.ox-cx,dy=n.oy-cy,d=Math.sqrt(dx*dx+dy*dy);if(d<220&&d>0){const f=force*(1-d/220)/d;n.vx+=dx*f;n.vy+=dy*f;}});
  }
  _updateGrid(dt){this.gridNodes.forEach(n=>{n.vx+=(n.ox-n.x)*9*dt;n.vy+=(n.oy-n.y)*9*dt;n.vx*=0.83;n.vy*=0.83;n.x+=n.vx*dt;n.y+=n.vy*dt;});}
  _drawGrid(){
    const st=this.STAGES[this.stage];
    if(this.memDumpActive){
      this.cameras.main.setBackgroundColor('#030f03');
    } else {
      this.cameras.main.setBackgroundColor(st.bg);
    }
    this.gfxGrid.clear();
    // I4 — modifier palette tint: thin overlay in modifier accent colour
    if(this.waveModifier&&this.waveModifier!=='NONE'&&!this.memDumpActive){
      const _MC_I4={FAST:0xff9900,DENSE:0xff4400,ARMORED:0xff2244,VOLATILE:0xaa44ff,DARK:0x4488ff,OVERLOAD:0xffdd44,FRAGILE:0xff88aa,MINIBOSS:0xffaa00,ENCORE:0x00ffcc,SURGE:0xff44ff,BOUNTY:0x44ffaa,FRACTURED:0xffaa44};
      const _mcol=_MC_I4[this.waveModifier];
      if(_mcol!=null && this.gfxBgDepth){
        this.gfxBgDepth.fillStyle(_mcol,0.06);
        this.gfxBgDepth.fillRect(0,0,W,H);
      }
    }
    const gridCol=this.memDumpActive?0x003300:st.grid;
    const gridAlpha=this.memDumpActive?0.9:1;
    this.gfxGrid.lineStyle(1,gridCol,gridAlpha);
    const cols=W/80+1,rows=H/80+1;
    this.gfxGrid.beginPath();
    for(let xi=0;xi<cols;xi++)for(let yi=0;yi<rows-1;yi++){const a=this.gridNodes[xi*rows+yi],b=this.gridNodes[xi*rows+yi+1];if(a&&b){this.gfxGrid.moveTo(a.x,a.y);this.gfxGrid.lineTo(b.x,b.y);}}
    for(let yi=0;yi<rows;yi++)for(let xi=0;xi<cols-1;xi++){const a=this.gridNodes[xi*rows+yi],b=this.gridNodes[(xi+1)*rows+yi];if(a&&b){this.gfxGrid.moveTo(a.x,a.y);this.gfxGrid.lineTo(b.x,b.y);}}
    this.gfxGrid.strokePath(); // one path for entire grid
    for(let y=0;y<H;y+=4){this.gfxGrid.fillStyle(0x000000,0.018);this.gfxGrid.fillRect(0,y,W,2);}

    // ── Feature 16: Memory sectors — locked grid squares ──
    if(this.memSectors){
      this.memSectors.forEach(ms=>{
        if(ms.hitFlash>0)ms.hitFlash-=0.016;
        const flash=ms.hitFlash>0;
        // Dark fill
        this.gfxGrid.fillStyle(flash?0x00ff44:0x000000,flash?0.4:0.7);
        this.gfxGrid.fillRect(ms.x,ms.y,ms.w,ms.h);
        // Green border — "LOCKED" cell
        const ba=0.3+0.2*Math.sin(this.t*2+ms.x*0.01);
        this.gfxGrid.lineStyle(1,flash?0x00ff44:0x00aa44,flash?0.9:ba);
        this.gfxGrid.strokeRect(ms.x,ms.y,ms.w,ms.h);
        // Corner brackets
        const cs=8;
        this.gfxGrid.lineStyle(1.5,0x00cc44,flash?1:ba*1.5);
        [[ms.x,ms.y],[ms.x+ms.w,ms.y],[ms.x,ms.y+ms.h],[ms.x+ms.w,ms.y+ms.h]].forEach(([cx,cy],ci)=>{
          const sx=ci%2===0?1:-1,sy=ci<2?1:-1;
          this.gfxGrid.beginPath();
          this.gfxGrid.moveTo(cx,cy+sy*cs);this.gfxGrid.lineTo(cx,cy);this.gfxGrid.lineTo(cx+sx*cs,cy);
          this.gfxGrid.strokePath();
        });
        // Center lock symbol — X
        this.gfxGrid.lineStyle(1,0x003322,ba*0.8);
        this.gfxGrid.beginPath();this.gfxGrid.moveTo(ms.x+ms.w*0.3,ms.y+ms.h*0.3);this.gfxGrid.lineTo(ms.x+ms.w*0.7,ms.y+ms.h*0.7);this.gfxGrid.strokePath();
        this.gfxGrid.beginPath();this.gfxGrid.moveTo(ms.x+ms.w*0.7,ms.y+ms.h*0.3);this.gfxGrid.lineTo(ms.x+ms.w*0.3,ms.y+ms.h*0.7);this.gfxGrid.strokePath();
      });
    }

    // ── Dynamic grid lighting ──
    // Player tints nearby intersections cyan
    const px=this.px,py=this.py;
    for(let xi=0;xi<cols;xi++){
      for(let yi=0;yi<rows;yi++){
        const n=this.gridNodes[xi*rows+yi];if(!n)continue;
        const d=Math.hypot(n.x-px,n.y-py);
        if(d<120){
          this.gfxGrid.fillStyle(st.accent,0.12*(1-d/120));
          this.gfxGrid.fillCircle(n.x,n.y,3);
        }
      }
    }
    // Enemies tint nearby intersections their color
    this.enemies.forEach(e=>{
      const eRange=90;
      for(let xi=0;xi<cols;xi++){
        for(let yi=0;yi<rows;yi++){
          const n=this.gridNodes[xi*rows+yi];if(!n)continue;
          const d=Math.hypot(n.x-e.x,n.y-e.y);
          if(d<eRange){
            this.gfxGrid.fillStyle(e.color,0.1*(1-d/eRange));
            this.gfxGrid.fillCircle(n.x,n.y,2.5);
          }
        }
      }
    });

    // ── Per-sector background style ──
    if(this._bgGeom&&!this.memDumpActive){
      const g=this._bgGeom;
      const gfx=this.gfxGrid;
      const t=this.circuitT||0;
      const accent=st.accent;

      if(g.style==='traces'){
        // SURFACE_LAYER: sparse data pulses on circuit traces
        g.traces.forEach(p=>{
          const ex=p.horiz?p.x+p.len:p.x;
          const ey=p.horiz?p.y:p.y+p.len;
          // Dim trace line
          gfx.lineStyle(p.bright?1:0.7,accent,p.bright?0.18:0.07);
          gfx.beginPath();
          gfx.moveTo(p.x,p.y);gfx.lineTo(ex,ey);gfx.strokePath();
          // Junction dot
          gfx.fillStyle(accent,p.bright?0.5:0.18);
          gfx.fillRect(p.x-2,p.y-2,4,4);
          // Travelling pulse dot
          const px2=p.x+(ex-p.x)*p.phase;
          const py2=p.y+(ey-p.y)*p.phase;
          gfx.fillStyle(accent,p.bright?0.9:0.5);
          gfx.fillCircle(px2,py2,p.bright?2.5:1.8);
        });
      }

      if(g.style==='circuit'){
        // KERNEL_SPACE: amber circuit board + heat distortion waves
        g.traces.forEach(p=>{
          const ex=p.horiz?p.x+p.len:p.x;
          const ey=p.horiz?p.y:p.y+p.len;
          gfx.lineStyle(p.bright?1.5:0.8,accent,p.bright?0.22:0.09);
          gfx.beginPath();
          gfx.moveTo(p.x,p.y);gfx.lineTo(ex,ey);gfx.strokePath();
          gfx.fillStyle(accent,p.bright?0.6:0.2);
          gfx.fillRect(p.x-2,p.y-2,4,4);
          // Bright pulse dot
          const px2=p.x+(ex-p.x)*p.phase;
          const py2=p.y+(ey-p.y)*p.phase;
          gfx.fillStyle(p.bright?0xffaa44:accent,p.bright?1.0:0.55);
          gfx.fillCircle(px2,py2,p.bright?3:2);
          if(p.bright){
            // Glow halo
            gfx.fillStyle(accent,0.2);
            gfx.fillCircle(px2,py2,6);
          }
        });
        // Heat distortion — 3 slow wavy lines drifting across screen
        for(let i=0;i<3;i++){
          const yw=H*0.25+i*H*0.25;
          gfx.lineStyle(1,accent,0.05);
          gfx.beginPath(); // heat wave path
          for(let x=0;x<=W;x+=10){
            const yo=Math.sin(x*0.035+t*1.1+i*1.5)*5;
            x===0?gfx.moveTo(x,yw+yo):gfx.lineTo(x,yw+yo);
          }
          gfx.strokePath();
        }
      }

      if(g.style==='glitch'){
        // DEEP_MEMORY: glitch scanlines + pixel noise + RGB ghost stripes
        g.glitchLines.forEach(l=>{
          const a=l.a*(0.5+0.5*Math.sin(l.t*4));
          gfx.fillStyle(0xaaaaff,a);
          gfx.fillRect(l.x,l.y,l.w,1.5);
        });
        g.traces.forEach(p=>{
          const v=0.5+0.5*Math.sin(p.blink);
          if(v>0.4){gfx.fillStyle(accent,p.a*v);gfx.fillCircle(p.x,p.y,p.r);}
        });
        // RGB ghost stripes — corrupted old sector data bleeding through
        [[0xff4444,H*0.22],[0x4444ff,H*0.5],[0x44ff44,H*0.78]].forEach(([c,yw])=>{
          const yo=Math.sin(t*0.25)*12;
          gfx.lineStyle(1,c,0.04);
          gfx.beginPath();
          gfx.moveTo(0,yw+yo);gfx.lineTo(W,yw+yo);gfx.strokePath();
        });
      }

      if(g.style==='fractal'){
        // SECTOR_00: rotating crystalline geometry
        g.fractalNodes.forEach(fn=>{
          const pulse=0.7+0.3*Math.sin(t*1.5+fn.rot);
          gfx.lineStyle(1,accent,fn.a*pulse);
          // Outer polygon
          gfx.beginPath();
          for(let s=0;s<fn.sides;s++){
            const a=fn.rot+(Math.PI*2/fn.sides)*s;
            s===0?gfx.moveTo(fn.x+Math.cos(a)*fn.r,fn.y+Math.sin(a)*fn.r)
                 :gfx.lineTo(fn.x+Math.cos(a)*fn.r,fn.y+Math.sin(a)*fn.r);
          }
          gfx.closePath();gfx.strokePath();
          // Inner polygon (counter-rotate, half size)
          gfx.lineStyle(1,accent,fn.a*0.4*pulse);
          gfx.beginPath();
          for(let s=0;s<fn.sides;s++){
            const a=-fn.rot+(Math.PI*2/fn.sides)*s;
            s===0?gfx.moveTo(fn.x+Math.cos(a)*fn.r*0.5,fn.y+Math.sin(a)*fn.r*0.5)
                 :gfx.lineTo(fn.x+Math.cos(a)*fn.r*0.5,fn.y+Math.sin(a)*fn.r*0.5);
          }
          gfx.closePath();gfx.strokePath();
        });
        // Connecting lines between nearby nodes
        for(let i=0;i<g.fractalNodes.length-1;i++){
          const a=g.fractalNodes[i],b2=g.fractalNodes[i+1];
          const d=Math.hypot(a.x-b2.x,a.y-b2.y);
          if(d<220){
            gfx.lineStyle(1,accent,0.05*(1-d/220));
            gfx.beginPath();
            gfx.moveTo(a.x,a.y);gfx.lineTo(b2.x,b2.y);gfx.strokePath();
          }
        }
      }
    }

    // ── I9 — foreground hex-fragment ambient particles ──
    if(!this.memDumpActive){
      const _hxStage=this.STAGES[this.stage];
      const _hxAcc=_hxStage&&_hxStage.accent!=null?_hxStage.accent:0x00ff88;
      const _hxDt=Math.min((this.game.loop.delta||16)/1000,0.05);
      if(!this._bgHexes)this._bgHexes=[];
      // Spawn (5% chance per frame, capped at 18)
      if(this._bgHexes.length<18 && Math.random()<0.05){
        this._bgHexes.push({
          x:Math.random()*W,
          y:Math.random()*H,
          vx:(Math.random()-0.5)*40,
          vy:-(10+Math.random()*20),
          life:4,
          color:_hxAcc,
          rot:Math.random()*Math.PI*2,
          rotSpd:(Math.random()-0.5)*1.5,
        });
      }
      const _hxg=this.gfxBgDepth;
      for(let _hi=this._bgHexes.length-1;_hi>=0;_hi--){
        const _h=this._bgHexes[_hi];
        _h.life-=_hxDt;
        if(_h.life<=0){this._bgHexes.splice(_hi,1);continue;}
        _h.x+=_h.vx*_hxDt; _h.y+=_h.vy*_hxDt; _h.rot+=_h.rotSpd*_hxDt;
        const _alpha=Math.max(0,Math.min(1,_h.life/4))*0.5;
        _hxg.lineStyle(1,_h.color,_alpha);
        _hxg.beginPath();
        for(let _s=0;_s<6;_s++){
          const _ha=_h.rot+(Math.PI/3)*_s;
          const _hx=_h.x+Math.cos(_ha)*6, _hy=_h.y+Math.sin(_ha)*6;
          _s===0?_hxg.moveTo(_hx,_hy):_hxg.lineTo(_hx,_hy);
        }
        _hxg.closePath();_hxg.strokePath();
      }
    }
  }

  // ─── UI ──────────────────────────────────────────────────
  _buildUI(){
    const HS=Settings.get('hud_scale')||1.0;
    const LP=130, RP=130;
    const mono="'Courier New',monospace";
    const orb="'Orbitron',sans-serif";
    const PX=22; // left padding inside panels

    // ── LEFT PANEL ──
    this.add.rectangle(0,H/2,LP,H,0x000000,0.88).setOrigin(0,0.5).setDepth(8);
    this.add.rectangle(0,0,3,H,0x00ffff,0.9).setOrigin(0,0).setDepth(9);
    this.add.rectangle(LP,0,1,H,0x003322,1).setOrigin(0,0).setDepth(9);

    const lbl=(x,y,t,c)=>this.add.text(x,y,t,{fontFamily:mono,fontSize:'9px',color:c,letterSpacing:1}).setDepth(10);
    const val=(x,y,t,c,sz)=>this.add.text(x,y,t,{fontFamily:orb,fontSize:sz||'24px',fontStyle:'bold',color:c}).setDepth(10);
    const div=(y,tint)=>this.add.rectangle(PX,y,LP-PX-8,1,tint||0x003322,1).setOrigin(0,0).setDepth(9);

    lbl(PX,16,'SIGNAL','#00ffff');
    this.txtScore=val(PX,28,'','#00ffff','21px');
    div(58,0x00ffff);

    lbl(PX,64,'WAVE','#00ff66');
    this.txtWave=val(PX,76,'','#00ff66','21px');
    div(106,0x00ff66);

    lbl(PX,112,'KILLS','#ccff00');
    this.txtKills=val(PX,124,'','#ccff00','18px');
    div(150,0xccff00);

    // OLD MOD stub removed — replaced by persistent _buildWaveModWidget under PILOT.
    // Keep field stubs so any external references / DARK-mode HUD code at _updateHUD
    // don't crash. (Actual MOD update logic in _updateHUD also gated by stub null-check.)
    this.txtModTag = null;
    this._modSubTxt = null;
    this._modPillGfx = null;
    this.bgModTag = null;
    this._modTagAccent = null;

    // #17 Fragment count in HUD — persistent meta currency
    div(155,0xaaffdd);
    lbl(PX,161,'FRAGS','#aaffdd');
    this._txtFrags=this.add.text(PX,196,'◆ 0',{fontFamily:mono,fontSize:'10px',color:'#aaffdd'}).setDepth(10);

    // PILOT terminal widget — left HUD, below FRAGS (uses ship color, tweens auto-clean via shutdown)
    this._buildPilotWidget();

    // WAVE MODIFIER widget — under PILOT (persistent display, replaces transient banner)
    this._buildWaveModWidget();

    // MINI BANNER — small alert zone under wave-mod widget (replaces center banners for non-headline events)
    this._buildMiniBanner();

    this.txtStage=this.add.text(0,-100,'',{fontFamily:mono,fontSize:'9px',color:'#224433'}).setDepth(10);
    this.bannerScore=this.add.rectangle(0,0,1,1,0x000000,0).setDepth(7);
    this.bannerCombo=this.add.rectangle(0,0,1,1,0x000000,0).setDepth(7);
    this.bannerShield=this.add.rectangle(0,0,1,1,0x000000,0).setDepth(7);

    // Kill feed — left panel bottom
    this._killFeedLines=[];this._killFeedObjs=[];
    for(let i=0;i<5;i++){
      const kf=this.add.text(W-RP+10,H-28-i*14,'',{fontFamily:mono,fontSize:'9px',color:'#00ff88'}).setOrigin(0,1).setDepth(10).setAlpha(0);
      this._killFeedObjs.push(kf);
    }

    // ── RIGHT PANEL ──
    this.add.rectangle(W,H/2,RP,H,0x000000,0.88).setOrigin(1,0.5).setDepth(8);
    this.add.rectangle(W-3,0,3,H,0xffdd00,0.7).setOrigin(0,0).setDepth(9);
    this.add.rectangle(W-RP,0,1,H,0x332200,1).setOrigin(0,0).setDepth(9);

    // Bar labels — 3 bars centered: x= W-112, W-86, W-60
    const BY=18, BH=120, BW2=16;
    this._vHeatX=W-112; this._vWarpX=W-86; this._vSurgeX=W-60;
    this._vBarY=BY; this._vBarH=BH; this._vBarW=BW2;
    // Labels centered above each bar
    this.add.text(W-112+BW2/2,BY-13,'HEAT', {fontFamily:mono,fontSize:'8px',color:'#ff6600'}).setOrigin(0.5,0).setDepth(10);
    this.add.text(W-86+BW2/2, BY-13,'WARP', {fontFamily:mono,fontSize:'8px',color:'#22aaff'}).setOrigin(0.5,0).setDepth(10);
    this.add.text(W-60+BW2/2, BY-13,'SURGE',{fontFamily:mono,fontSize:'8px',color:'#cc44ff'}).setOrigin(0.5,0).setDepth(10);

    const rdiv=(y,tint)=>this.add.rectangle(W-RP+8,y,RP-16,1,tint||0x332200,1).setOrigin(0,0).setDepth(9);
    rdiv(BY+BH+12,0x332200);
    lbl(W-RP+PX-14,BY+BH+18,'COMBO','#ffdd00');
    this.txtCombo=val(W-RP+PX-14,BY+BH+30,'','#ffdd00','26px');

    rdiv(BY+BH+68,0x332200);
    lbl(W-RP+PX-14,BY+BH+76,'SHIELD','#ff44cc');
    this.txtShield=this.add.text(W-RP+PX-14,BY+BH+90,'',{fontFamily:mono,fontSize:'14px',color:'#ff44cc'}).setDepth(10);

    // ── SHARDS stat row — persistent counter (replaces transient wave-clear banner) ──
    rdiv(BY+BH+108,0x332200);
    lbl(W-RP+PX-14,BY+BH+114,'SHARDS','#ccaa00');
    this.txtShards=this.add.text(W-RP+PX-14,BY+BH+126,'0 ◈',{fontFamily:mono,fontSize:'18px',fontStyle:'bold',color:'#ccaa00'}).setDepth(10);
    this._shardFlashX = W - RP + PX - 14;
    this._shardFlashY = BY + BH + 130;

    rdiv(BY+BH+150,0x332200);
    lbl(W-RP+PX-14,BY+BH+158,'◎ PING', '#33ccaa');
    lbl(W-RP+PX-14,BY+BH+182,'⬡ DASH', '#ff3355');

    // ── SIDE OBJECTIVES HUD (top of right panel, under dash label) ──
    this._sideObjHudTxt = [];
    if(this._sideObjectives && this._sideObjectives.length){
      lbl(W-RP+PX-14, BY+BH+212, '// OBJECTIVES', '#ffd700');
      for(let i=0;i<this._sideObjectives.length;i++){
        const t = this.add.text(W-RP+PX-14, BY+BH+228+i*16, '', {
          fontFamily: mono, fontSize:'10px', color:'#ccaa44', wordWrap:{width:120}
        }).setDepth(10);
        this._sideObjHudTxt.push(t);
      }
      this._refreshSideObjHud();
      // Refresh every 0.5s
      this._sideObjEvent = this.time.addEvent({
        delay: 500, repeat: -1,
        callback: () => this._refreshSideObjHud(),
      });
    }

    // System log — right panel bottom
    this._logTxtObjs=[];
    for(let i=0;i<4;i++){
      const lt=this.add.text(W-10,H-14-i*13,'',{fontFamily:mono,fontSize:'8px',color:'#336644'}).setOrigin(1,1).setDepth(10);
      this._logTxtObjs.push(lt);
    }

    // ── PLAY AREA ──
    this.txtSurge=this.add.text(W/2,H-46,'',{fontFamily:mono,fontSize:'10px',color:'#00ffff',letterSpacing:2}).setOrigin(0.5,0).setDepth(10);
    this.bannerBoss=this.add.rectangle(W/2,H-52,320,20,0x1a0000,0.92).setOrigin(0.5,0.5).setDepth(9).setVisible(false);
    this.txtBossName=this.add.text(W/2,H-52,'',{fontFamily:orb,fontSize:`${Math.round(12*HS)}px`,fontStyle:'700',color:'#ff2244',letterSpacing:4}).setOrigin(0.5).setDepth(10);

    // CHAIN counter UI removed — distracted from bullet-hell action.
    // chainCount/bestChain are still tracked for score multi + end-of-run summary.
    this._chainBg = null;
    this.txtChain = null;

    this._tutTipBg=this.add.rectangle(W/2,H/2+140,640,52,0x000000,0).setDepth(55).setAlpha(0);
    this._tutTipBg.setStrokeStyle(1,0x00ffcc,0);
    this._tutTipTxt=this.add.text(W/2,H/2+140,'',{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:'#00ffcc',letterSpacing:1,align:'center'}).setOrigin(0.5).setDepth(56).setAlpha(0);
    this._tutSkipBg=this.add.rectangle(W/2,H-22,160,24,0x000000,0.85).setDepth(56).setAlpha(0).setInteractive({useHandCursor:true});
    this._tutSkipTxt=this.add.text(W/2,H-22,'[ SKIP TUTORIAL ]',{fontFamily:mono,fontSize:'10px',color:'#336644'}).setOrigin(0.5).setDepth(57).setAlpha(0);
    this._tutSkipBg.on('pointerdown',()=>this._tutDismissAll());
    this._tutSkipBg.on('pointerover',()=>this._tutSkipTxt.setColor('#00ffcc'));
    this._tutSkipBg.on('pointerout', ()=>this._tutSkipTxt.setColor('#336644'));

    const pb=this.add.text(W-RP-10,10,'II',{fontFamily:'Rajdhani',fontSize:'13px',color:'#445566'}).setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(12);
    pb.on('pointerover',()=>pb.setColor('#00ff66'));pb.on('pointerout',()=>pb.setColor('#445566'));pb.on('pointerdown',()=>this._togglePause());

    // Pre-create lazily-referenced text objects to avoid setColor null-canvas on first use
    this.txtActivePower=this.add.text(W/2,H-74,'',{fontFamily:mono,fontSize:'9px',color:'#ffdd00'}).setOrigin(0.5).setDepth(12).setVisible(false);
  }

  _initBgLayers(){
    this.circuitT=0;
    this._bgGeom=null;      // pre-generated geometry for current sector
    this._generateBgGeom(0); // generate for sector 0 on start
  }

  _generateBgGeom(stageIdx){
    const st=this.STAGES[stageIdx]||this.STAGES[0];
    const geom={style:st.bgStyle,accent:st.accent,traces:[],glitchLines:[],fractalNodes:[]};
    if(st.bgStyle==='traces'||st.bgStyle==='circuit'){
      // 40 random H/V trace segments on 80px grid
      for(let i=0;i<40;i++){
        const gx=Math.floor(Math.random()*(W/80))*80;
        const gy=Math.floor(Math.random()*(H/80))*80;
        const horiz=Math.random()<0.5;
        const len=(1+Math.floor(Math.random()*5))*80;
        geom.traces.push({x:gx,y:gy,len,horiz,
          phase:Math.random(),spd:0.3+Math.random()*0.5,
          bright:Math.random()<0.25});
      }
    }
    if(st.bgStyle==='glitch'){
      for(let i=0;i<22;i++){
        geom.glitchLines.push({
          y:Math.random()*H,
          x:Math.random()*W,
          w:40+Math.random()*350,
          a:0.02+Math.random()*0.06,
          spd:(Math.random()-0.5)*18,
          t:Math.random()*5
        });
      }
      // Pixel noise clusters
      for(let i=0;i<55;i++){
        geom.traces.push({
          x:Math.random()*W,y:Math.random()*H,
          r:1+Math.random()*2,a:0.08+Math.random()*0.25,
          blink:Math.random()*Math.PI*2,blinkSpd:2+Math.random()*6
        });
      }
    }
    if(st.bgStyle==='fractal'){
      for(let i=0;i<14;i++){
        geom.fractalNodes.push({
          x:100+Math.random()*(W-200),
          y:60+Math.random()*(H-120),
          r:28+Math.random()*70,
          rot:Math.random()*Math.PI,
          rotSpd:(Math.random()-0.5)*0.25,
          sides:4+Math.floor(Math.random()*4),
          a:0.07+Math.random()*0.1
        });
      }
    }
    this._bgGeom=geom;
  }

  _initCorruptZones(){
    for(let i=0;i<4;i++){
      this.corruptZones.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*15,vy:(Math.random()-0.5)*15,rx:80+Math.random()*120,ry:50+Math.random()*80,a:0.12+Math.random()*0.1,rot:Math.random()*Math.PI});
    }
  }

  // ─── INPUT ───────────────────────────────────────────────
  _setupInput(){
    this._dashing=false;
    this._dashCdT=0;
    try{ if(this._dashTween) this._dashTween.stop(); }catch{}
    try{ if(this._dashTrailEvt) this._dashTrailEvt.remove(false); }catch{}
    this._dashTween=null;
    this._dashTrailEvt=null;
    this.dashTrail=[];
    this.glitchSplit=0;       // RGB split duration on player
    this.packetTrace=[];      // recent movement path points
    this.sysLogLines=[];      // terminal feed lines
    this.sysLogT=0;           // log scroll timer
    this.bootEnemies=[];      // enemies in boot-sequence materializing
    this.shockRings=[];       // chain shockwave rings
    this.fragParts=[];        // shape death fragments
    this.movTrail=[];         // data fragmentation movement trail
    this._ghostTraceT=0;      // ghost_trace damage tick timer
    this._statsOpen=false;     // stats overlay flag
    this._devOpen=false;       // dev overlay flag
    this._devTab=0;            // active dev tab index
    this._devGodMode=false;    // god mode flag
    this.bossRelics=[];        // relics dropped by bosses
    this._packetWallCount=0;   // PACKET_WALL relic counter
    this._gravEchoActive=[];   // GRAVITY_ECHO orbiting bullets
    this._phaseCloneT=0;       // PHASE_CLONE timer
    this._dmgFlashT=0;         // player hit-flash timer
    this.corruptZones=[];     // drifting corruption zones
    this.scoreDisplay=0;      // animated score display
    this.chargeIndicators=[]; // bullet charge-up dots
    // Note: _sandbox intentionally NOT reset here — set from _initData in create()

    this.input.on('pointerdown',p=>{
      if(this._sandbox&&(p.x<130||p.x>W-130))return; // ignore side-panel clicks in sandbox
      this.fingerDown=true;
      const dist=Math.hypot(p.x-this.px,p.y-this.py);
      // Far click → dash. Internal handler does its own dist check + cooldown gate.
      if(dist>160 && this._startDash(p.x,p.y)){
        // Dash started — don't update tx/ty here; tween onComplete will snap them.
      } else {
        this.tx=p.x;this.ty=p.y;
        if(!this.bubbleOverheated)this.pressing=true;
      }
    });
    this.input.on('pointermove',p=>{
      if(this._sandbox&&(p.x<130||p.x>W-130))return;
      if(p.isDown && !this._dashing){this.tx=p.x;this.ty=p.y;}
    });
    this.input.on('pointerup',()=>{
      this.pressing=false;
      this.fingerDown=false;
    });
    // ESC disabled — use TAB for the combined menu
    this.input.keyboard&&this.input.keyboard.on('keydown-SPACE',()=>this._activateActivePower());
    this.input.keyboard&&this.input.keyboard.on('keydown-R',()=>{if(this.signal>=1&&!this.surgeActive)this._activateSurge();});
    if(this.input.keyboard){
      this.input.keyboard.removeListener('keydown-TAB');
      this.input.keyboard.on('keydown-TAB',(e)=>{try{e.preventDefault();}catch{}this._openStats();});
    }
  }


  // ─── PAUSE ───────────────────────────────────────────────
  _pauseObjs=[];
  _togglePause(){
    if(this._dead)return;
    this.paused=!this.paused;
    this._drawPauseOverlay(this.paused);
  }
  _drawPauseOverlay(show){
    // Pause overlay now merged into _openStats (TAB menu)
    // This stub is kept so existing cb:()=>this._drawPauseOverlay(false) calls don't error
    this._pauseObjs=this._pauseObjs||[];
    this._pauseObjs.forEach(o=>o&&o.destroy());this._pauseObjs=[];
    if(!show)return;
    // Redirect to combined menu
    this._openStats();
  }

  // ─── DASH (rebuilt from scratch) ─────────────────────────
  // Tween-based, single state field, atomic cleanup. Returns true if dash actually started.
  _startDash(targetX, targetY){
    if(this._dashing) return false;
    if(this._dashCdT > 0) return false;
    if(this._dead || this.paused) return false;
    const tx = Phaser.Math.Clamp(targetX, 150, W-150);
    const ty = Phaser.Math.Clamp(targetY, 30,  H-60);
    const dist = Math.hypot(tx - this.px, ty - this.py);
    if(dist < 160) return false; // far-click only

    this._dashing = true;
    this._dashUses = (this._dashUses || 0) + 1;
    this.invincT = 0.5 + (this._dashInvincBonus || 0);
    this._dashCdT = (this._dashCooldownOverride || 1.2) * (this._evoDashReduce || 1);

    // PHASE_CLONE relic — schedule burst at origin
    const originX = this.px, originY = this.py;
    if(this.bossRelics && this.bossRelics.find(r => r.id === 'PHASE_CLONE')){
      this._phaseCloneOrigin = { x: originX, y: originY };
      this._phaseCloneT = 1.0;
    }

    // Trail emission — 6 evenly-spaced hex afterimages across the dash duration.
    const dur = Math.min(0.18, dist / 1800); // cap at 180ms; effective speed ~1800 px/s
    this._dashTrailEvt = this.time.addEvent({
      delay: Math.max(1, (dur * 1000) / 6), repeat: 5,
      callback: () => {
        if(!this._dashing) return;
        this.dashTrail.push({ x: this.px, y: this.py, a: 1 });
        if(this.activeSkin === 'ghost'){
          this._ghostDashTrail = this._ghostDashTrail || [];
          this._ghostDashTrail.push({ x: this.px, y: this.py, life: 0.8, maxLife: 0.8 });
        }
      }
    });

    // Position tween — Phaser interpolates atomically; onComplete is single source of truth for "ended".
    this._dashTween = this.tweens.add({
      targets: this,
      px: tx, py: ty,
      duration: dur * 1000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._dashing = false;
        this._dashTween = null;
        try { if(this._dashTrailEvt) this._dashTrailEvt.remove(false); } catch {}
        this._dashTrailEvt = null;
        // Snap tx/ty to live pointer position so player keeps moving toward cursor (fix for "stuck after dash")
        const p = this.input && this.input.activePointer;
        if(this.fingerDown && p && p.isDown){
          this.tx = Phaser.Math.Clamp(p.x, 150, W-150);
          this.ty = Phaser.Math.Clamp(p.y, 30,  H-60);
        } else {
          this.tx = this.px; this.ty = this.py;
        }
        // Arrival particle burst (restored — confirmed not duplicate culprit)
        this._spawnParticles(this.px, this.py, this.shipColor, 12);
        // PHANTOM passive: spawn decoy at dash origin
        if(this.activeSkin === 'phantom'){
          this.phantomDecoys = this.phantomDecoys || [];
          this.phantomDecoys.push({ x: originX, y: originY, life: 2.0, maxLife: 2.0 });
          this.banner && this.banner.mini('PHASE_SHIFT', '#cc88ff', 800);
        }
      }
    });

    Snd.play('reflect');
    CRT.glitch(0.08);
    return true;
  }

  _activateActivePower(){
    try{
      if(this._dead||this.paused)return;
      this._powerUsed=true;
      const power=this.activePower||'ping';
      if(power==='ping'){this._logPowerUse('ping');return this._activatePing();}
      if(this.activePowerCD>0){this._sysLog(`[POWER] ${power.toUpperCase()} — CD ${this.activePowerCD.toFixed(1)}s`);return;}
      this._logPowerUse(power);
      this._triggerShopPower(power);
    }catch(e){console.error('[ACTIVE POWER]',e);}
  }

  // SIDE_OBJ + POWER_MASTERY: centralised power-use tracker
  _logPowerUse(power){
    this._powerUsesTotal=(this._powerUsesTotal||0)+1;
    try{ Save.addStat('power_uses_'+power, 1); }catch{}
  }

  // SIDE_OBJ: refresh HUD lines with live progress (driven by 0.5s timer)
  _refreshSideObjHud(){
    if(!this._sideObjectives || !this._sideObjHudTxt) return;
    const sd = {
      wave:this.wave, totalReflects:this._totalReflects||0,
      killStreak5:this._killStreak5||0, totalCorrupted:this._totalCorrupted||0,
      usedShield:!!this._usedShield, perfectWave3:this.wave>=3&&this._perfectWave3,
      bossNoDamage:!!this._bossNoDamage, maxCombo:this._maxCombo||0,
      surgeFires:this._surgeFires||0, volatileExplosions:this._volatileExplosions||0,
      chainReactions:this._chainReactions||0, wavesNoOverheat:this._wavesNoOverheat||0,
      powerUsesTotal:this._powerUsesTotal||0,
    };
    this._sideObjectives.forEach((o, i) => {
      const t = this._sideObjHudTxt[i]; if(!t) return;
      let done = false;
      try{ done = !!o.check(sd); }catch{}
      // Surface a simple progress hint per objective (best-effort — predicate doesn't expose progress)
      const prefix = done ? '☑' : '▢';
      const col = done ? '#aaffaa' : '#ccaa44';
      t.setText(`${prefix} ${o.label}`).setColor(col);
    });
  }

  _triggerShopPower(power){
    try{
      const POWERS={
        emp_burst:       {cd:22, duration:4},
        null_zone:       {cd:28, duration:6},
        overclock_surge: {cd:35, duration:4},
        chain_trigger:   {cd:18, duration:0},
        ghost_step:      {cd:26, duration:3},
        corrupt_wave:    {cd:38, duration:0},
        system_restore:  {cd:0,  duration:0, uses:1},
        decoy_packet:    {cd:32, duration:6},
      };
      const baseCfg=POWERS[power];if(!baseCfg)return;
      // Snapshot — must NOT mutate the shared POWERS const. Phase 2E variants mutate `cfg` per-cast.
      const cfg={...baseCfg};
      if(typeof applyPowerVariants==='function') applyPowerVariants(power, cfg);
      // Apply ascension global CD mult (separate from per-power variant CD reduction)
      if(cfg.cdMult) cfg.cd = (cfg.cd||0) * cfg.cdMult;

      // Check one-use powers (Phase 2B mastery T3 grants +1 use via _sysRestoreExtraUses)
      if(power==='system_restore'){
        if(this._sysRestoreUsesLeft == null){
          this._sysRestoreUsesLeft = 1 + (this._sysRestoreExtraUses || 0);
        }
        if(this._sysRestoreUsesLeft <= 0){this._sysLog('[POWER] SYSTEM_RESTORE — ALREADY USED THIS WAVE');return;}
        this._sysRestoreUsesLeft -= 1;
        this._sysRestoreUsed = this._sysRestoreUsesLeft <= 0; // back-compat flag
      } else {
        this.activePowerCD=cfg.cd*(this._powerCdMult||1);
      }

      // Signature activation FX — particles, rings, lightning, slowmo
      try { this._playPowerFX(power); } catch {}

      switch(power){
        case 'emp_burst':
          // Stun all enemies + freeze bullets
          this.empActive=true;this.empT=cfg.duration;
          this.enemies.forEach(e=>{if(!e.isBoss){e.stunned=true;e.stunT=cfg.duration;e._origColor=e.color;e.color=0xffffff;}});
          this.bullets.forEach(b=>{if(!b.reflected){b.frozen=true;b.frozenT=cfg.duration;}});
          this.banner.mini(`EMP_BURST · ${cfg.duration}s STUN`,'#ffffff',1100);
          this._spawnShockRing(this.px,this.py,0xffffff,W/2);
          if(Settings.get('shake'))this.cameras.main.flash(200,255,255,255,0.2);
          CRT.glitch(0.4);
          break;

        case 'null_zone':
          // Place void node at cursor (Phase 2E: radius + dmgPerSec from mastery)
          const nzR=cfg.radius||130;
          const nz={x:this.tx,y:this.ty,life:cfg.duration,maxLife:cfg.duration,r:nzR,dmgPerSec:cfg.dmgPerSec||0};
          this.nullZones.push(nz);
          this.banner.mini(`NULL_ZONE · ${nzR}px · ${cfg.duration}s`,'#aa55ff',1000);
          this._sysLog(`[NULL_ZONE] DEPLOYED AT ${Math.round(this.tx)},${Math.round(this.ty)}`);
          break;

        case 'overclock_surge':
          // Triple bubble speed, zero heat, gold bubble
          this.activePowerActive=true;this.activePowerT=cfg.duration;
          this.bubbleHeat=0;
          this.banner.mini('OVERCLOCK_SURGE','#ffdd00',1100);
          CRT.glitch(0.3);
          break;

        case 'chain_trigger':
          // Detonate all reflected bullets
          let triggered=0;
          this.bullets.forEach(b=>{
            if(b.reflected){triggered++;this._chainExplosion(b.x,b.y,b.col||0x00ffcc,0);}
          });
          this.bullets=this.bullets.filter(b=>!b.reflected);
          this.banner.mini(`CHAIN_TRIGGER · ${triggered} detonations`,'#ff6600',1000);
          if(Settings.get('shake'))this.cameras.main.flash(150,255,100,0,0.2);
          break;

        case 'ghost_step':
          this.ghostStepActive=true;this.activePowerT=cfg.duration;
          this.banner.mini(`GHOST_STEP · ${cfg.duration}s CLOAK`,'#aaaaff',1000);
          break;

        case 'corrupt_wave':
          // +N corruption to all enemies in R px (Phase 2E: radius + corruptionAdd from mastery)
          const cwR=cfg.radius||300, cwAdd=cfg.corruptionAdd||2;
          let corrupted=0;
          this.enemies.forEach(e=>{
            if(e.isBoss||e.defected)return;
            const d=Math.hypot(e.x-this.px,e.y-this.py);
            if(d<cwR){
              if(!e.corruptions)e.corruptions=0;
              e.corruptions+=cwAdd;corrupted++;this._totalCorrupted++;
              const thresh=this.upg.corrupt_data>0?2:3;
              if(e.corruptions>=thresh&&!e.defected){
                e.defected=true;e.color=this.shipColor;e.defectT=6;this._maxDefected++;
              }
              this._spawnParticles(e.x,e.y,0x00ff44,6);
            }
          });
          this._spawnShockRing(this.px,this.py,0x00ff44,cwR);
          this.banner.mini(`CORRUPT_WAVE · ${corrupted} infected`,'#00ff44',1000);
          break;

        case 'system_restore':
          this.bubbleOverheated=false;this.bubbleCooldownT=0;this.bubbleHeat=0;
          const sr_hits=(this.upg.shield>=4?5:this.upg.shield>=3?4:this.upg.shield>=2?3:2) + (cfg.shieldBonus||0);
          this._setShield(sr_hits);
          this.signal=Math.min(1,this.signal+0.3);
          if(cfg.invincSec) this.invincT = Math.max(this.invincT||0, cfg.invincSec); // T3: brief invuln
          this.banner.mini('SYSTEM_RESTORE','#00ffcc',1200);
          CRT.glitch(0.15);
          break;

        case 'decoy_packet':
          this.decoyPos={x:this.px,y:this.py,life:cfg.duration,maxLife:cfg.duration,aoeBlast:!!cfg.aoeBlast};
          this.banner.mini(`DECOY_PACKET · ${cfg.duration}s`,'#ff8800',1000);
          this._sysLog('[DECOY] HONEYPOT ACTIVE — PROCESS REDIRECTED');
          break;
      }
    }catch(e){console.error('[TRIGGER POWER]',e);}
  }

  _activatePing(){
    try{
      if(this._dead||this.paused)return;
      if(this.pingCooldownT>0){
        this._sysLog(`[PING] COOLDOWN — ${this.pingCooldownT.toFixed(1)}s REMAINING`);
        return;
      }
      // Signature ping FX (sonar burst)
      try { this._fxPing(); } catch {}
      // Phase 2E: power mastery variants applied to local pingCfg
      const pingCfg = { cdMult: 1, radiusMult: 1, revealBullets: false };
      if(typeof applyPowerVariants === 'function') applyPowerVariants('ping', pingCfg);
      let cd=this.pingBaseCD * (pingCfg.cdMult||1);
      if(Save.hasMeta('packet_router'))cd*=0.67;
      this.pingCooldownT=cd;
      const pingR = 200 * (pingCfg.radiusMult||1);
      const pingMaxR = 200 * (pingCfg.radiusMult||1);

      // Emit hex rings (2 if SIGNAL_FORK upgrade)
      const ringCount=this.upg.signal_fork>0?2:1;
      for(let r=0;r<ringCount;r++){
        this.pingRings.push({x:this.px,y:this.py,radius:10,maxRadius:pingMaxR,spd:380,alpha:0.9,delayT:r*0.35,active:r===0});
      }

      // Reverse all nearby bullets immediately (first ring)
      let reversed=0;
      this.bullets.forEach(b=>{
        if(b.reflected)return;
        const d=Math.hypot(b.x-this.px,b.y-this.py);
        if(d<pingR){b.vx=-b.vx;b.vy=-b.vy;b.reflected=true;b.col=0x00ffcc;reversed++;}
      });
      // SIGNAL_FORK second ring reverses additional bullets 0.35s later
      if(this.upg.signal_fork>0){
        this.time.delayedCall(350,()=>{
          if(this._dead)return;
          this.bullets.forEach(b=>{
            if(b.reflected)return;
            const d=Math.hypot(b.x-this.px,b.y-this.py);
            if(d<220){b.vx=-b.vx;b.vy=-b.vy;b.reflected=true;b.col=0x00ffcc;}
          });
        });
      }

      if(reversed>0){
        this._sysLog(`[PING] ICMP_ECHO_REQUEST — ${reversed} packet${reversed>1?'s':''} reversed`);
        // ping_master upgrade removed — no daily check
      }

      // Visual + audio
      if(Settings.get('shake'))this.cameras.main.flash(150,0,200,150,0.15);
      CRT.glitch(0.12);
      Snd.play('surge');
      Voice.say('signal ping');
      if(reversed>this._bestPing)this._bestPing=reversed;
      if(this.bossWave)this._pingUsedOnBoss=true;
      this.banner.mini(`PING · ${reversed} reversed`,'#00ffcc',800);
    }catch(err){console.error('[PING ERROR]',err);}
  }

  _activateSurge(){
    this.signal=0;this.surgeActive=true;this.surgeT=5;this._surgeFires++;
    Snd.play('surge');CRT.glitch(0.5);Voice.say('signal surge activated');
    this.banner.mini('SURGE · DOUBLE BUBBLE','#00ffcc',1400);
  }


  _updateEndless(dt){
    try{
      this.endlessT+=dt;
      const t=this.endlessT;
      const diff=this.diff||DIFFICULTY.daemon;

      // Score multiplier grows every 30s
      this.endlessScoreMult=1+Math.floor(t/30)*0.25;
      this.scoreMulti=this.endlessScoreMult;

      // Phase transitions
      const newPhase=t<60?0:t<120?1:t<180?2:t<240?3:4;
      if(newPhase>this.endlessPhase){
        this.endlessPhase=newPhase;
        const msgs=['NETWORK ADAPTING — THREAT LEVEL RISING','HOSTILE PROCESSES MULTIPLYING','CONTAINMENT BREACH — SECTOR COMPROMISED','CRITICAL FAILURE — ALL SYSTEMS HOSTILE','TOTAL SYSTEM CORRUPTION'];
        const cols=['#ff8800','#ff6600','#ff4400','#ff2200','#ff0000'];
        if(Settings.get('shake'))this.cameras.main.flash(300,(255),(newPhase*40),(0),0.15);
        // Personal best milestone comparison
        const pbKey=`endless_pb_phase_${newPhase}`;
        const prevBest=Save.get(pbKey,null);
        const mins=Math.floor(t/60),secs=Math.floor(t%60);
        const timeStr=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        if(prevBest===null||t<prevBest){
          Save.set(pbKey,Math.round(t));
          this.banner.show(`PHASE_${newPhase+1}: ${msgs[newPhase]}`,cols[newPhase],2500,`NEW BEST — ${timeStr}`);
        } else {
          const pm=Math.floor(prevBest/60),ps=Math.floor(prevBest%60);
          const pbStr=`${String(pm).padStart(2,'0')}:${String(ps).padStart(2,'0')}`;
          this.banner.show(`PHASE_${newPhase+1}: ${msgs[newPhase]}`,cols[newPhase],2000,`PB: ${pbStr}`);
        }
        this._sysLog(`[SYS] ENDLESS PHASE ${newPhase+1} — ${msgs[newPhase]}`);
      }

      // Spawn rate based on phase and difficulty
      this.spawnT+=dt;
      const baseIv=diff===DIFFICULTY.packet?1.2:diff===DIFFICULTY.kernel?0.55:0.8;
      const phaseSpd=[1,0.8,0.65,0.5,0.38][this.endlessPhase];
      const iv=Math.max(baseIv*phaseSpd,0.2);
      if(this.spawnT>=iv){
        this.spawnT=0;
        this._spawnEndlessEnemy();
        // Multi-spawn increases with phase or DENSE modifier
        if(this.endlessPhase>=1&&Math.random()<0.3+this.endlessPhase*0.1)this._spawnEndlessEnemy();
        if(this.waveModifier==='DENSE'&&Math.random()<0.5)this._spawnEndlessEnemy();
        if(this.endlessPhase>=3&&Math.random()<0.35)this._spawnEndlessEnemy();
      }

      // Formations every 8s
      this.formationT+=dt;if(this.formationT>=8){this.formationT=0;this._spawnFormation();}
      this.hazardT+=dt;if(this.hazardT>=10){this.hazardT=0;this._spawnHazard();}

      // Auto-inject upgrade every 45s
      this.endlessAutoUpgrT+=dt;
      if(this.endlessAutoUpgrT>=45){
        this.endlessAutoUpgrT=0;
        this._endlessAutoUpgrade();
      }

      // Boss spawns: first at 150s, then every 90s
      this.endlessBossT+=dt;
      const bossInterval=t<150?150:90;
      if(this.endlessBossT>=bossInterval&&!this.bossWave){
        this.endlessBossT=0;
        this._spawnEndlessBoss();
      }

      // Update endless HUD
      const mins=Math.floor(t/60);const secs=Math.floor(t%60);
      const timeStr=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      if(this.txtWave)this.txtWave.setText(`[ ENDLESS — ${timeStr} — ×${this.endlessScoreMult.toFixed(2)} ]`);
      if(this.txtKills)this.txtKills.setText(`TERM: ${this.totalKills} ◈`);

    }catch(e){console.error('[ENDLESS UPDATE]',e);}
  }

  _spawnEndlessEnemy(){
    try{
      const t=this.endlessT||0;
      const phase=this.endlessPhase||0;
      const r=Math.random();
      // Enemy type distribution shifts with phase. Bestiary unlocks gradually
      // so deep endless runs reveal every type (was previously capped at 6).
      let type='grunt';
      if(phase>=1&&r>0.65)type='sniper';
      if(phase>=1&&r>0.80)type='swarm';
      if(phase>=2&&r>0.87)type='tank';
      if(phase>=2&&r>0.90&&r<=0.92)type='leech';
      if(phase>=2&&r>0.94&&r<=0.95)type='bouncer';
      if(phase>=2&&r>0.97)type='phantom';
      if(phase>=3&&r>0.93&&r<=0.94)type='rootkit';
      if(phase>=4&&r>0.85&&r<=0.87)type='orbit_node';
      if(phase>=4&&r>0.98)type='drift_packet';
      if(phase>=5&&r>0.91&&r<=0.92)type='fragment';
      if(phase>=5&&r>0.95&&r<=0.96)type='core_shard';
      if(phase>=6&&r>0.93&&r<=0.94)type='overload_node';
      // Speed boost per phase
      const phaseMult=1+phase*0.12;
      const adaptBias=this.reflectSideHistory&&this.reflectSideHistory.length>8?
        (this.reflectSideHistory.filter(s=>s==='left').length>this.reflectSideHistory.filter(s=>s==='right').length?'right':'left'):'none';
      const edge=Math.floor(Math.random()*4);
      let x,y;
      if(adaptBias==='right'&&Math.random()<0.55){x=W+25;y=Math.random()*H;}
      else if(adaptBias==='left'&&Math.random()<0.55){x=-25;y=Math.random()*H;}
      else{
        if(edge===0){x=Math.random()*W;y=-25;}
        else if(edge===1){x=Math.random()*W;y=H+25;}
        else if(edge===2){x=-25;y=Math.random()*H;}
        else{x=W+25;y=Math.random()*H;}
      }
      const slow=this.upg.slow>0?Math.pow(0.75,this.upg.slow):1;
      const C={
        grunt:        {hp:1,size:14,spd:Math.min((160+t*0.3)*slow,280),  color:0xff3232,sInt:1.8},
        sniper:       {hp:1,size:10,spd:(120+t*0.15)*slow,               color:0xff8800,sInt:(this.diff||DIFFICULTY.daemon).sniperInterval},
        tank:         {hp:3+Math.floor(phase),size:24,spd:(90+t*0.1)*slow, color:0xaa0000,sInt:2.5},
        swarm:        {hp:1,size:8, spd:(220+t*0.4)*slow,                color:0xff00aa,sInt:99},
        rootkit:      {hp:1,size:11,spd:(100+t*0.2)*slow,                color:0x00ff88,sInt:2.2},
        phantom:      {hp:1,size:11,spd:(180+t*0.35)*slow,               color:0xcc88ff,sInt:1.8},
        leech:        {hp:1,size:12,spd:(130+t*0.18)*slow,               color:0x44ff44,sInt:99},
        bouncer:      {hp:2,size:18,spd:(70+t*0.08)*slow,                color:0x00ccff,sInt:2.0},
        orbit_node:   {hp:2,size:13,spd:(80+t*0.12)*slow,                color:0x0088ff,sInt:1.6},
        drift_packet: {hp:1,size:10,spd:(280+t*0.3)*slow,                color:0x00aaaa,sInt:99},
        fragment:     {hp:1,size:10,spd:(200+t*0.25)*slow,               color:0x44ffcc,sInt:99},
        core_shard:   {hp:2,size:13,spd:(170+t*0.2)*slow,                color:0xff2244,sInt:99},
        overload_node:{hp:3,size:15,spd:(80+t*0.1)*slow,                 color:0xff8800,sInt:99},
      };
      const c=C[type]||C.grunt;
      const dm=(this.diff||DIFFICULTY.daemon).enemySpeedMult;
      const _spdCap=(window.DEV&&typeof window.DEV.enemySpeedCap==='number')?window.DEV.enemySpeedCap:200;
      const finalSpd=Math.min(c.spd*dm*phaseMult,_spdCap);
      this.enemies.push({x,y,hp:c.hp,maxHp:c.hp,size:c.size,spd:finalSpd,color:c.color,
        sInt:c.sInt,sT:Math.random()*c.sInt,type,isBoss:false,angle:0,bootT:0.4,visible:true,revealed:true});
    }catch(e){console.error('[ENDLESS SPAWN]',e);}
  }

  _spawnEndlessBoss(){
    try{
      this.bossWave=true;
    const _bossNum1=(Math.floor(this.wave/5)-1)%4+1;
    try{Snd.startBossMusic(_bossNum1);}catch{}
      const def=this._getBossDef();
      const li=LORE.findIndex(l=>l.boss===def.name||l.boss===def.baseName);
      this.banner.show(`BOSS_INCOMING: ${def.name}`,'#ff2244',2000,'DEFEND POSITION');
      this.time.delayedCall(800,()=>{
        this._spawnBossNow();
        this.bossWave=false; // allow normal spawns alongside boss in endless
      });
    }catch(e){console.error('[ENDLESS BOSS]',e);}
  }

  _endlessAutoUpgrade(){
    try{
      const allUpgs=['bubble_size','bubble_speed','reflect_speed','shield','magnet','multishot','slow','score_boost',
        'signal_fork','packet_cache','null_shield','echo_protocol','corrupt_data','ghost_trace','overclock_burst','signal_decay','chain_amplifier'];
      const available=allUpgs.filter(id=>(this.upg[id]||0)<4);
      if(available.length===0)return;
      const id=available[Math.floor(Math.random()*available.length)];
      this._applyUpgrade(id);
      const upgName=id.replace(/_/g,' ').toUpperCase();
      this.banner.show(`AUTO_INJECT: ${upgName}`,'#00ffcc',1500,'MODULE INSTALLED');
      this._sysLog(`[AUTO] MODULE ${upgName} INJECTED`);
    }catch(e){console.error('[AUTO UPGRADE]',e);}
  }

  _triggerStackOverflow(){
    try{
      this.stackOverflowT=5; // 5 second event
      this.scoreMulti*=2;
      this.banner.show('STACK_OVERFLOW: LIMIT EXCEEDED','#ffdd00',2000,'DOUBLE SCORE — ALL KILLS DROP SHARDS');
      this._sysLog('[OVERFLOW] STACK LIMIT EXCEEDED — SCORE ×2 FOR 5s');
      if(Settings.get('shake'))this.cameras.main.flash(300,255,220,0,0.2);
      CRT.glitch(0.4);
      Snd.play('powerup');
      Voice.say('stack overflow');
    }catch(e){console.error('[STACK OVERFLOW ERROR]',e);}
  }

  _triggerMemDump(){
    try{
      this.memDumpActive=true;
      this.memDumpTimer=2.0; // 2 second inversion
      this._sysLog('[MEMDUMP] MEMORY DUMP INITIATED — GRID INVERTED');
      if(Settings.get('shake'))this.cameras.main.flash(200,255,255,255,0.15);
    }catch(e){console.error('[MEMDUMP ERROR]',e);}
  }

  _applyOverclock(){
    // Boost all enemy speeds by 60%, increase spawn rate cap
    this.enemies.forEach(e=>{if(!e.isBoss)e.spd*=1.6;});
    this.overclocked=true;
    this.scoreMulti*=3;
    this.banner.show('SECTOR_OVERCLOCK: SCORE MULTIPLIER ×3','#00ff44',2000,'HIGH RISK MODE ACTIVE');
    CRT.glitch(0.5);
    Voice.say('sector overclocked');
  }

  _applyUpgrade(id){
    if(id)this._upgSelected++;
    if(!id)return;
    this.upgradesList.push(id);
    this.upg[id]=(this.upg[id]||0)+1;
    if(id==='shield'){
      // Shield tier determines hit count
      const tier=this.upg.shield; // already incremented
      const hits=tier>=4?5:tier>=3?4:tier>=2?3:2;
      const extra=Save.meta('redundant_buf',false)?1:0;
      this._setShield(hits+extra);
    }
    if(id==='score_boost'){this.scoreMulti+=0.5;this.banner&&this.banner.show('SCORE_BOOST: INSTALLED','#ffdd00',1200,`×${this.scoreMulti.toFixed(1)} score multiplier active`);}
    if(id==='slow')this.enemies.forEach(e=>{if(!e.isBoss)e.spd*=0.75;});
    if(id==='signal_fork')this.pingBaseCD=Math.max(10,this.pingBaseCD-1); // slightly tighter cd too
    if(id==='null_shield'){
      // Cancel existing event so an upgraded tier gets the faster delay
      if(this._nullShieldEvent){this._nullShieldEvent.remove(false);this._nullShieldEvent=null;}
      this._nullShieldActive=true;
      const nsTier=this.upg.null_shield||1;
      const nsDelay=nsTier>=4?12000:nsTier>=3?17000:nsTier>=2?21000:25000;
      this._nullShieldEvent=this.time.addEvent({delay:nsDelay,loop:true,callback:()=>{
        if(!this.shieldActive){const tier=this.upg.shield||1;const hits=tier>=4?5:tier>=3?4:tier>=2?3:2;const extra=Save.meta('redundant_buf',false)?1:0;this._setShield(hits+extra);this._sysLog(`[NULL_SHIELD] REGEN — DELAY ${nsDelay/1000}s`);}
      }});
    }
    if(id==='chain_amplifier'){/* depth check in _chainExplosion */}
    if(id==='bubble_armor'){/* handled in bubble heat and DoT calculations */}
    if(id==='firewall_breach'){/* checked in memory sector collision */}
    this._checkSyn();
  }

  _checkSyn(){
    const s=[];
    if(this.upg.magnet>0&&this.upg.multishot>0)s.push('STORM');
    if(this.upg.bubble_size>=3&&this.upg.bubble_speed>=3)s.push('SINGULARITY');
    if(this.upg.reflect_speed>=3&&this.upg.score_boost>=2)s.push('OVERCLOCK');
    // New synergies
    if(this.upg.null_shield>0&&this.upg.ghost_trace>0)s.push('GHOST_PROTOCOL');    // kills restore shield
    if(this.upg.chain_amplifier>0&&this.upg.signal_fork>0)s.push('OVERLOAD_CHAIN'); // chains fork
    if(this.upg.null_shield>=2&&this.upg.shield>=2)s.push('REDUNDANT_CORE');        // shield floor=1
    const prevNames=new Set(this.synergies);this.synergies=s;
    const _newSyn=s.filter(n=>!prevNames.has(n));
    if(_newSyn.length>0) this._hitStop(80,0x00ffcc); // I10 — synergy unlock hit-stop
    _newSyn.forEach(n=>this._showSynergyUnlock(n));
  }

  _showSynergyUnlock(name){
    try{
      const DESC={
        STORM:'MULTISHOT + MAGNET — enemies pulled into your fire',
        SINGULARITY:'MAX BUBBLE — gravitational collapse on every reflect',
        OVERCLOCK:'REFLECT SPEED + SCORE — all kills score ×1.5',
        GHOST_PROTOCOL:'NULL SHIELD + GHOST TRACE — kills regenerate shield',
        OVERLOAD_CHAIN:'CHAIN AMP + SIGNAL FORK — chains fork bullets',
        REDUNDANT_CORE:'DUAL SHIELD — shield minimum held at 1 hit',
      };
      const g=this.add.graphics().setDepth(50);
      const W2=W,H2=H;
      // Full-screen colour sweep
      g.fillStyle(0xffd700,0);g.fillRect(0,0,W2,H2);
      this.tweens.add({targets:g,alpha:1,duration:0,onComplete:()=>{
        g.fillStyle(0xffd700,0.12);g.fillRect(0,0,W2,H2);
        this.time.delayedCall(300,()=>{g.clear();g.fillStyle(0x000000,0);this.tweens.add({targets:g,alpha:0,duration:400,onComplete:()=>g.destroy()});});
      }});
      // Horizontal scan bar sweeping down
      const bar=this.add.rectangle(W2/2,-4,W2,4,0xffd700,0.9).setDepth(51);
      this.tweens.add({targets:bar,y:H2+4,duration:320,ease:'Power2.In',onComplete:()=>bar.destroy()});
      // Central panel
      const pw=480,ph=100,px2=W2/2,py2=H2/2-10;
      // Use scaleX tween instead of width tween — rectangle.width tween anchors to left edge,
      // causing the panel to drift right of its origin. scaleX respects origin (0.5,0.5).
      const panel=this.add.rectangle(px2,py2,pw,ph,0x000000,0.96).setDepth(52).setScale(0,1);
      this.add.rectangle(px2,py2-ph/2,pw,2,0xffd700,0.9).setOrigin(0.5,0).setDepth(53).setAlpha(0).setName('synBar');
      this.tweens.add({targets:panel,scaleX:1,duration:180,ease:'Power3.Out'});
      const label=this.add.text(px2,py2-18,'SYNERGY UNLOCKED',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886600',letterSpacing:4}).setOrigin(0.5).setDepth(54).setAlpha(0);
      const nameT=this.add.text(px2,py2+4,name,{fontFamily:"'Orbitron',sans-serif",fontSize:'22px',fontStyle:'900',color:'#ffd700',letterSpacing:3}).setOrigin(0.5).setDepth(54).setAlpha(0);
      const descT=this.add.text(px2,py2+30,DESC[name]||'NEW EFFECT ACTIVE',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886600',align:'center'}).setOrigin(0.5).setDepth(54).setAlpha(0);
      this.time.delayedCall(160,()=>{
        [label,nameT,descT].forEach(t=>this.tweens.add({targets:t,alpha:1,duration:160}));
        CRT.glitch(0.4);
        this.time.delayedCall(2200,()=>{
          [panel,label,nameT,descT].forEach(t=>this.tweens.add({targets:t,alpha:0,duration:300,onComplete:()=>t.destroy()}));
        });
      });
      this._sysLog(`[SYN] ${name} ACTIVATED`);
    }catch(e){}
  }

  _startWave(){
    // SIDE_OBJ: increment "waves without overheat" counter if previous wave finished cleanly
    if(this.wave > 0 && !this.bubbleOverheated){
      this._wavesNoOverheat = (this._wavesNoOverheat || 0) + 1;
    } else if(this.bubbleOverheated){
      this._wavesNoOverheat = 0; // streak broken
    }
    // Feeder wave detection: wave before boss (4, 9, 14, etc.)
    const isFeederWave = (this.wave % 5 === 4) && this.wave > 0;
    this._feederWave = isFeederWave;
    if(isFeederWave){
      if(this.banner) this.banner.mini('COMBO_FEED · x3 gain','#ffaa00',1000);
    }
    // Reset core distortion each wave (safety)
    if(this.wave===0)this._coreDistortT=0;
    this._waveReflects=0;
    // PRIMED_BUBBLE meta: start wave with bubble at 40% of max radius
    if(this._primedBubbleMeta){
      const _maxR=(this.surgeActive?150:80)+Math.min((this.upg&&this.upg.bubble_size)||0,3)*15;
      this.bubbleRadius=Math.max(this.bubbleRadius,_maxR*0.4);
    }
    // PRIMED_SIGNAL meta: start wave 1 with combo pre-loaded
    if(this.wave===0&&Save.hasMeta('primed_signal')){
      this.time.delayedCall(200,()=>{
        this.signal=0.5;
        this.banner&&this.banner.show('META_INIT: PRIMED_SIGNAL ACTIVE','#aaffdd',900,'Signal meter 50% pre-loaded');
      });
    }
    if(this._waveStarting)return; // prevent double call
    this._waveStarting=true;
    this.time.delayedCall(100,()=>{this._waveStarting=false;});
    // ── Tutorial gate — wave 0 first-ever run gets a no-enemy target tutorial ──
    // When tutorial finishes (or is skipped), _finishTutorial calls _startWave again
    // with tutorial_done=true so this branch is skipped and the real wave 1 begins.
    if(this.wave===0 && !this._tutOnline && !Save.get('tutorial_done')){
      this._startTutorial();
      return;
    }
    // Subtle wave-start sting (skip boss waves — they have their own boss sound)
    if(!this.bossWave && this.wave > 0){ try { Snd.play('modifier'); } catch {} }
    this.banner.clear();
    this._tutActive=false;  // legacy tip flow disabled — replaced by tutorial wave 0
    if(this.wave===1)Save.set('tutorial_done',true);
    this.wave++;this.kills=0;this.overclocked=false;
    this.rapidKillT=0;this.rapidKillCount=0;
    this._sysRestoreUsed=false; // reset system restore for new wave
    this._sysRestoreUsesLeft = 1 + (this._sysRestoreExtraUses || 0); // Phase 2B mastery T3 grants extra uses
    if(this._nullShieldEvent){this._nullShieldEvent.remove(false);this._nullShieldEvent=null;}
    this._nullShieldActive=false; // reset every wave so null_shield can re-register
    // Pick wave modifier — every wave in cursed mode, every 2nd wave otherwise
    const corruptedMode=this.mode==='corrupted';
    // Wave-modifier roll cadence is now difficulty-gated (PACKET=never, DAEMON=every 4, KERNEL=every 2).
    // Pool dropped FAST/VOLATILE/FRACTURED — those overlapped with per-enemy mutation effects.
    const _wmFreq = (this.diff && this.diff.waveModFreq) || 0;
    const _shouldRollMod = _wmFreq > 0 && this.wave >= 2 && (corruptedMode || this.wave % _wmFreq === 0);
    if(_shouldRollMod){
      // Use pre-rolled modifier from wave preview if available, otherwise roll now
      const modPool=corruptedMode
        ?['DENSE','DARK','OVERLOAD','FRAGILE','MINIBOSS','ENCORE','SURGE','BOUNTY']
        :['DENSE','OVERLOAD','SURGE','BOUNTY','NONE','NONE'];
      this.waveModifier=this._nextWaveMod||modPool[Math.floor(Math.random()*modPool.length)];
      this._nextWaveMod=null; // consume it
      if(this.waveModifier!=='NONE'){
        // Wave modifier surfaced persistently via _refreshWaveModWidget (call below).
        // Banner removed — was 2.2s transient, hid info before player could read it.
        this._waveModCount++;
        this._sysLog(`[MODIFIER] ${(this._MOD_LABELS()[this.waveModifier])||this.waveModifier} — WAVE ${this.wave}`);
      } else {this.waveModifier=null;}
      // Refresh persistent wave-mod widget for this new wave
      this._refreshWaveModWidget && this._refreshWaveModWidget();
    } else if(this.wave===1){this.waveModifier=null;} // allow null shield timer on new run
    // ── Feature 16: Regenerate memory sectors each wave ──
    this.memSectors=[];
    if(this.wave>=3){
      const count=Math.min(2+Math.floor(this.wave/3),8);
      for(let i=0;i<count;i++){
        const gx=Math.floor(1+Math.random()*14)*80; // avoid edges
        const gy=Math.floor(1+Math.random()*7)*80;
        this.memSectors.push({x:gx,y:gy,w:80,h:80,life:1});
      }
    }
    this.bossWave=this.wave%5===0;
    if(this.bossWave){this._bossStartT=this.t;this._pingUsedOnBoss=false;this._bossNoDamage=true;}
    this.killsNeeded=this.bossWave?1:10+this.wave*4+(this.mode==='endless'?this.wave*3:0)+(this._killsNeededBonus||0);
    if(this._sandbox){this.bossWave=false;this.killsNeeded=9999;this.spawnT=0;this.paused=false;this.formationT=0;this.hazardT=0;if(!this._sbObjs)this.time.delayedCall(120,()=>this._initSandboxHUD());return;}
    if(this.waveModifier==='BOUNTY'&&!this.bossWave)this.killsNeeded=Math.round(this.killsNeeded*1.3);
    this.spawnT=0;this.paused=false;this.formationT=0;this.hazardT=0;
    this._waveTypes=new Set(); // track enemy types spawned this wave
    this._pulsarCount=0;      // cap pulsars per wave
    this._trapCount=0;        // cap memory traps per wave
    this._overloadCount=0;    // cap overload nodes per wave
    this._trapCount=0;        // cap memory_trap per wave
    this._overloadCount=0;    // cap overload_node per wave
    const prevStage=this.stage;
    this.stage=Math.min(Math.floor((this.wave-1)/5),this.STAGES.length-1);
    const wPid='0x'+Math.floor(this.wave*0x3A+0xF0).toString(16).toUpperCase().padStart(4,'0');
    // txtWave and txtStage updated each frame in _updateHUD
    // RANGER passive: +5% bubble expand per wave survived
    if(this.activeSkin==='ranger')this.rangerSpeedBonus=Math.min(0.5,this.wave*0.05);
    if(this.activeSkin==='ranger'&&this.rangerSpeedBonus>0)this.banner.mini(`RANGER · +${Math.round(this.rangerSpeedBonus*100)}% BUBBLE`,'#00cc66',900);
    Snd.setIntensity(Math.min(this.wave/12,1));
    // #13 Archetype evolution at wave 10
    if(this.wave===10&&this._archetype&&!this._archetypeEvolved){
      this._archetypeEvolved=true;
      this.time.delayedCall(1200,()=>this._doArchetypeEvolution());
    }
    // Stage transition cinematic
    if(this.stage!==prevStage)this._stageTransition();
    if(!this.bossWave){
      const _waveLabel = `WAVE_${String(this.wave).padStart(3,'0')} — ${this.STAGES[this.stage].name.toUpperCase()}`;
      const _waveCol = this.STAGES[this.stage].accent===0x00f5ff?'#00cc66':'#'+this.STAGES[this.stage].accent.toString(16).padStart(6,'0');
      this.banner.mini(_waveLabel, _waveCol, 1200);
    }
    if(this.bossWave){
      this._bossSpawned=false; // reset spawn flag for this boss wave
      this.time.delayedCall(600,()=>{this.scene.pause();const def=this._getBossDef();const li=LORE.findIndex(l=>l.boss===def.name||l.boss===def.baseName);this.scene.launch('BossCutsceneScene',{...def,lore:LORE[li]?.text||'HOSTILE NODE DETECTED'});});
    }
  }

  _applyAscension(){
    // ASCENSION: stack modifier rows 1..N into per-run state + reward multipliers.
    // No-op when level === 0 (default). Mutates this.diff (the per-run SNAPSHOT, NOT the shared DIFFICULTY object).
    const N = this._ascensionLevel || 0;
    if(N <= 0) return;
    if(typeof ASCENSION_MODIFIERS === 'undefined' || typeof ascensionRewardMults === 'undefined') return;

    // Shape the mutation surface as a plain object so modifier closures don't have to know about `this`
    const s = {
      diff: this.diff,
      killsNeededBonus: 0,
      bulletDmgMult: 1,
      overheatPctMult: 0,
      powerCdMult: 1,
      eliteChanceBonus: 0,
      bossPhaseBonus: 0,
      bossHpMult: 1,
      startWaveModRoll: false,
    };
    for(let i = 0; i < N && i < ASCENSION_MODIFIERS.length; i++){
      try{ ASCENSION_MODIFIERS[i].apply(s); }catch(e){ console.error('[ASCENSION] modifier failed', i+1, e); }
    }
    // Commit mutations into per-run fields
    this._killsNeededBonus = s.killsNeededBonus;
    this._bulletDmgMult = s.bulletDmgMult;
    this._overheatPctMult = s.overheatPctMult;
    this._powerCdMult = s.powerCdMult;
    this._eliteChanceBonus = s.eliteChanceBonus;
    this._bossPhaseBonus = s.bossPhaseBonus;
    this._bossHpMult = s.bossHpMult;
    this._startWaveModRoll = s.startWaveModRoll;

    // Reward scaling — multiplied on top of any meta/difficulty multis already set
    const r = ascensionRewardMults(N);
    this.scoreMulti = (this.scoreMulti || 1) * r.score;
    this._shardMulti = (this._shardMulti || 1) * r.shards;

    try{ this._sysLog && this._sysLog(`[ASCENSION] LEVEL ${N} ACTIVE — ${N} modifier${N===1?'':'s'} stacked`); }catch{}
  }

  _applyArchetypeMastery(){
    // Phase 2B: stack mastery-tier bonuses for the active archetype. Tiers derive live from
    // arch_<id>_total_bosses + per-archetype CORE.BREACH flag (set at boss-kill hook).
    if(typeof computeArchetypeTier !== 'function') return;
    const archId = this._archetype || 'reflector';
    const tier = computeArchetypeTier(archId);
    if(tier <= 0) return;
    // Cumulative bonuses, in order of tier ladder:
    if(tier >= 1) this.scoreMulti = (this.scoreMulti || 1) * 1.05;        // T1: +5% score
    if(tier >= 2) this._shardMulti = (this._shardMulti || 1) * 1.10;      // T2: +10% shard pickup
    if(tier >= 3) this._sysRestoreExtraUses = (this._sysRestoreExtraUses || 0) + 1; // T3: +1 starting use on system_restore
    if(tier >= 4) this._bulletDmgMult = (this._bulletDmgMult || 1) * 1.05;          // T4: +5% bullet damage
    if(tier >= 5){                                                                   // T5: +10/+10 capstone
      this.scoreMulti = (this.scoreMulti || 1) * 1.10;
      this._shardMulti = (this._shardMulti || 1) * 1.10;
    }
    try{ this._sysLog && this._sysLog(`[MASTERY] ${archId.toUpperCase()} TIER ${tier} — bonuses applied`); }catch{}
  }

  _doArchetypeEvolution(){
    // #13 Archetype evolution — mid-run passive boost at wave 10
    const EVO={
      reflector:  {label:'DEEP_ECHO',      desc:'Chain depth +2 · Reflect speed +20%',  col:0x00ffcc,
        apply:()=>{this._chainPatchBonus=(this._chainPatchBonus||0)+2;this._evoReflectBoost=1.2;}},
      corruptor:  {label:'VIRAL_SPREAD',   desc:'Defected enemies spread mutation on kill',col:0x00ff88,
        apply:()=>{this._evoViralSpread=true;}},
      ghost:      {label:'PHASE_MASTERY',  desc:'Dash cooldown −30% · Ghost trail ×1.5', col:0x8888ff,
        apply:()=>{this._evoDashReduce=0.7;this._evoGhostTrailBoost=1.5;}},
      overclocker:{label:'THERMAL_LIMIT',  desc:'Heat cap +20 · Overheat burst ring',    col:0xff6600,
        apply:()=>{this._evoHeatCap=120;}},
      fortress:   {label:'IRON_CORE',      desc:'Shield max +1 · Bubble DoT ×1.5',       col:0xffdd00,
        apply:()=>{this.shieldMaxHits++;if(this.shieldHits>0)this.shieldHits=Math.min(this.shieldHits+1,this.shieldMaxHits);this._evoBubbleDotBoost=1.5;}},
      storm:      {label:'STATIC_SURGE',   desc:'Auto-reflect every 4th hit · Bullets +1',col:0xff4488,
        apply:()=>{this._evoStormInterval=4;}},
      rogue:      {label:'GHOST_DATA',     desc:'Score ×1.3 · Fragment drops doubled',   col:0xff2266,
        apply:()=>{this.scoreMulti*=1.3;this._evoFragDouble=true;}},
      signal_forge:{label:'CUSTOM_PROTOCOL',desc:'Score ×1.1 · Forged signal stable',     col:0xcc44ff,
        apply:()=>{this.scoreMulti*=1.1;}},
    };
    const evo=EVO[this._archetype];
    if(!evo)return;
    evo.apply();
    const col=evo.col;
    const hexC='#'+col.toString(16).padStart(6,'0');
    // Dramatic reveal
    try{
      const fl=this.add.rectangle(W/2,H/2,W,H,col,0).setDepth(80);
      this.tweens.add({targets:fl,alpha:{from:0.22,to:0},duration:700,ease:'Power2',onComplete:()=>fl.destroy()});
      const line=this.add.rectangle(W/2,H/2-50,0,4,col,0.9).setDepth(81);
      this.tweens.add({targets:line,width:W*0.7,duration:250,ease:'Power3.Out'});
      const lbl=this.add.text(W/2,H/2-50,'ARCHETYPE_EVOLVED',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:hexC,letterSpacing:4}).setOrigin(0.5).setDepth(82).setAlpha(0);
      this.tweens.add({targets:lbl,alpha:1,duration:200,delay:200});
      const name=this.add.text(W/2,H/2-22,evo.label,{fontFamily:"'Orbitron',sans-serif",fontSize:'26px',fontStyle:'900',color:hexC,letterSpacing:6}).setOrigin(0.5).setDepth(82).setAlpha(0);
      this.tweens.add({targets:name,alpha:{from:0,to:1},duration:300,delay:280});
      const desc=this.add.text(W/2,H/2+18,evo.desc,{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#aaaaaa'}).setOrigin(0.5).setDepth(82).setAlpha(0);
      this.tweens.add({targets:desc,alpha:{from:0,to:0.8},duration:300,delay:350});
      // Dismiss after 2.2s
      this.time.delayedCall(2200,()=>[fl,line,lbl,name,desc].forEach(o=>{try{this.tweens.add({targets:o,alpha:0,duration:300,onComplete:()=>o.destroy()});}catch{}}));
      CRT.glitch(0.5);
      for(let i=0;i<6;i++)this.time.delayedCall(i*60,()=>this._spawnShockRing(W/2,H/2,col,60+i*50));
    }catch(err){console.error('[EVO]',err);}
    this.banner&&this.banner.show(`ARCHETYPE_EVOLVED: ${evo.label}`,hexC,2000,evo.desc);
    this._sysLog(`[EVO] ${this._archetype.toUpperCase()} → ${evo.label}`);
  }

  _stageTransition(){
    const st=this.STAGES[this.stage];
    this._generateBgGeom(this.stage); // regenerate background geometry for new sector
    const col=st.accent;
    const hexCol='#'+col.toString(16).padStart(6,'0');
    // Spawn expanding ripple rings from center
    for(let i=0;i<4;i++){
      this.time.delayedCall(i*120,()=>{
        this.shockRings.push({x:W/2,y:H/2,radius:10+i*30,spd:320,alpha:0.6-i*0.1,col});
      });
    }
    // Flash + overlay
    if(Settings.get('shake'))this.cameras.main.flash(800,(col>>16)&0xff,(col>>8)&0xff,col&0xff,0.15);
    // "ENTERING SECTOR" banner slides across
    const bar=this.add.rectangle(-W/2,H/2,W,60,0x000000,0.9).setDepth(60);
    const txt=this.add.text(-W/2,H/2,`— ENTERING ${st.name} —`,{
      fontFamily:"'Orbitron',sans-serif",fontSize:'22px',fontStyle:'900',
      color:hexCol,letterSpacing:8
    }).setOrigin(0.5).setDepth(61);
    const line1=this.add.rectangle(-W/2,H/2-30,W,2,col,0.6).setDepth(61);
    const line2=this.add.rectangle(-W/2,H/2+30,W,2,col,0.6).setDepth(61);
    [bar,txt,line1,line2].forEach(o=>{
      this.tweens.add({targets:o,x:W/2,duration:500,ease:'Power2'});
      this.tweens.add({targets:o,x:W*1.5,duration:500,delay:1200,ease:'Power2',onComplete:()=>o.destroy()});
    });
    CRT.glitch(0.4);
    // #7 Stage transition sweep — bright scan-line that crosses the screen
    try{
      const sweepLine=this.add.rectangle(0,0,W,4,col,0.9).setDepth(62);
      const glowLine=this.add.rectangle(0,0,W,14,col,0.25).setDepth(61);
      this.tweens.add({targets:[sweepLine,glowLine],y:{from:0,to:H},duration:550,ease:'Power1',
        onComplete:()=>{sweepLine.destroy();glowLine.destroy();}});
      // Secondary fainter sweep delayed
      const sweepLine2=this.add.rectangle(0,0,W,2,0xffffff,0.5).setDepth(62);
      this.tweens.add({targets:sweepLine2,y:{from:0,to:H},duration:550,delay:80,ease:'Power1',
        onComplete:()=>sweepLine2.destroy()});
    }catch{}
    Voice.say(`entering ${st.name.toLowerCase()}`);
  }

  _getBossDef(){
    const B=[
      {name:'FIREWALL',   baseName:'FIREWALL',   color:0xff2200,hp:24,size:48},
      {name:'VOID.NODE',  baseName:'VOID.NODE',  color:0xaa00ff,hp:20,size:44},
      {name:'GHOST.EXE',  baseName:'GHOST.EXE',  color:0x00ff88,hp:28,size:50},
      {name:'CORE.BREACH',baseName:'CORE.BREACH',color:0xffd700,hp:35,size:54},
    ];
    return{...B[(Math.floor(this.wave/5)-1)%B.length]};
  }

  _spawnBossOfType(baseName){
    if(this.enemies.some(e=>e.isBoss))return;
    try{
      const B=[
        {name:'FIREWALL',   baseName:'FIREWALL',   color:0xff2200,hp:24,size:48},
        {name:'VOID.NODE',  baseName:'VOID.NODE',  color:0xaa00ff,hp:20,size:44},
        {name:'GHOST.EXE',  baseName:'GHOST.EXE',  color:0x00ff88,hp:28,size:50},
        {name:'CORE.BREACH',baseName:'CORE.BREACH',color:0xffd700,hp:35,size:54},
      ];
      const def=B.find(b=>b.baseName===baseName);
      if(!def)return;
      const _ascHp=Math.ceil(def.hp*(this._bossHpMult||1));
      const boss={
        x:W/2,y:-120,
        hp:_ascHp,maxHp:_ascHp,size:def.size,color:def.color,
        name:def.name,baseName:def.baseName,isBoss:true,type:'boss',
        spd:0,vx:0,vy:60,angle:0,pT:0,sT:0,
        phase:1,phaseThresholds:[0.6,0.3],encryptedT:0,rageT:0,
        weakAngle:0,weakHit:false,barrierAngle:0,
        gravWells:[],ghostAlpha:1,countdownT:-1,
        entering:true,shootCooldown:0,moveCooldown:0,
        moveTargetX:W/2,moveTargetY:160,
      };
      this.enemies.push(boss);
      this.txtBossName&&this.txtBossName.setText(`◈ ${def.name} ◈`);
      this._pushGrid(W/2,0,120);
      CRT.glitch(0.6);
      if(Settings.get('shake'))this.cameras.main.flash(400,(def.color>>16)&0xff,(def.color>>8)&0xff,def.color&0xff,0.2);
    }catch(e){console.error('[SPAWN BOSS TYPE]',e);}
  }

  _initSandboxHUD(){
    if(this._sbObjs)return;
    this._sbObjs=[];
    this._sandboxNoAI=false;
    const T=o=>{this._sbObjs.push(o);return o;};
    const mono="'Courier New',monospace";

    // Sandbox indicator — top-centre, doesn't cover HUD
    T(this.add.text(W/2,6,'◈ SANDBOX ◈  BACKQUOTE OR BUTTON ◈  SHIFT+TAB TO EXIT',{fontFamily:mono,fontSize:'8px',color:'#1a3322',letterSpacing:2}).setOrigin(0.5,0).setDepth(15));

    // Top-right toggle button that opens the dev panel
    const tbBg = T(this.add.rectangle(W-12,18,170,26,0x001a11,0.92).setOrigin(1,0.5).setDepth(15).setStrokeStyle(1,0x00cc66,0.8).setInteractive({useHandCursor:true}));
    const tbTx = T(this.add.text(W-19,18,'▤ DEV PANEL  [`]',{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#00ff66',letterSpacing:2}).setOrigin(1,0.5).setDepth(16));
    tbBg.on('pointerover',()=>{tbBg.setFillStyle(0x002211,1);tbTx.setColor('#ffffff');});
    tbBg.on('pointerout', ()=>{tbBg.setFillStyle(0x001a11,0.92);tbTx.setColor('#00ff66');});
    tbBg.on('pointerdown',()=>this._toggleSandboxPanel());
    this._sbToggleBtn = tbBg;

    // Backquote key toggles the panel
    if(this.input && this.input.keyboard){
      this._sbPanelKey = this.input.keyboard.on('keydown-BACKTICK', () => this._toggleSandboxPanel());
    }
  }

  _toggleSandboxPanel(){
    if(this._sbPanelOpen) this._closeSandboxPanel();
    else this._openSandboxPanel();
  }

  _openSandboxPanel(){
    if(this._sbPanelOpen) return;
    this._sbPanelOpen = true;
    this.paused = true;
    try { Snd.play('install'); } catch {}
    const mono="'Courier New',monospace";
    const orb="'Orbitron',sans-serif";
    const D = 220;

    this._sbPanelObjs = [];
    const ADD = (o) => { this._sbPanelObjs.push(o); return o; };

    // Disable HUD-layer interactivity so clicks don't bleed past the dim
    try { if(this._sbToggleBtn) this._sbToggleBtn.disableInteractive(); } catch {}

    // Backdrop dims gameplay — bumped to 0.94 so HUD doesn't show through
    const dim = ADD(this.add.rectangle(W/2,H/2,W,H,0x000000,0.94).setDepth(D).setInteractive());
    dim.on('pointerdown',()=>{ /* swallow */ });

    // Centered card 880 × 580
    ADD(this.add.rectangle(W/2,H/2,880,580,0x020804,0.98).setStrokeStyle(2,0x00cc66,0.95).setDepth(D+1));
    ADD(this.add.rectangle(W/2,H/2-280,876,4,0x00cc66,0.85).setDepth(D+2));
    ADD(this.add.text(W/2,H/2-258,'// SANDBOX_DEV_PANEL',{fontFamily:orb,fontSize:'18px',fontStyle:'900',color:'#00ff66',letterSpacing:6}).setOrigin(0.5).setDepth(D+2));
    ADD(this.add.text(W/2,H/2-232,'pause active — game frozen until you close this panel',{fontFamily:mono,fontSize:'10px',color:'#557766',letterSpacing:2}).setOrigin(0.5).setDepth(D+2));

    // ── Three column section headers ──
    const SECTION_Y = H/2 - 200;
    const COL_BASIC = W/2 - 380;
    const COL_SECTOR = W/2 - 100;
    const COL_BOSS = W/2 + 180;
    ADD(this.add.text(COL_BASIC,SECTION_Y,'// BASIC ENEMIES',{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#00ff66',letterSpacing:2}).setDepth(D+2));
    ADD(this.add.text(COL_SECTOR,SECTION_Y,'// SECTOR ENEMIES',{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#ffaa00',letterSpacing:2}).setDepth(D+2));
    ADD(this.add.text(COL_BOSS,SECTION_Y,'// BOSSES',{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#ff4444',letterSpacing:2}).setDepth(D+2));

    // ── Spawn data ──
    const BASIC=[
      ['grunt',       '#ff3232','GRUNT'],
      ['sniper',      '#ff8800','SNIPER'],
      ['tank',        '#aa4444','TANK'],
      ['swarm',       '#ff00aa','SWARM'],
      ['rootkit',     '#00ff88','ROOTKIT'],
      ['leech',       '#44ff44','LEECH'],
      ['bouncer',     '#00ccff','BOUNCER'],
      ['phantom',     '#cc88ff','PHANTOM'],
    ];
    const SECTOR=[
      ['orbit_node',  '#0088ff','ORBIT NODE'],
      ['pulsar',      '#aa44ff','PULSAR'],
      ['drift_packet','#00aaaa','DRIFT PKT'],
      ['memory_trap', '#ff44aa','MEM TRAP'],
      ['fragment',    '#44ffcc','FRAGMENT'],
      ['core_shard',  '#ff2244','CORE SHARD'],
      ['overload_node','#ff8800','OVR NODE'],
    ];
    const BOSSES=[
      ['FIREWALL',    '#ff2200','FIREWALL'   ,true],
      ['VOID.NODE',   '#aa00ff','VOID.NODE'  ,true],
      ['GHOST.EXE',   '#00ff88','GHOST.EXE'  ,true],
      ['CORE.BREACH', '#ffd700','CORE.BREACH',true],
    ];

    const BW=220, BH=24, GAP=4;
    const mkBtn=(px,py,type,col,label,isBoss=false)=>{
      const n=parseInt(col.replace('#',''),16);
      const bg=ADD(this.add.rectangle(px,py,BW,BH,n,0.14).setOrigin(0,0).setDepth(D+2).setInteractive({useHandCursor:true}).setStrokeStyle(1,n,0.5));
      ADD(this.add.rectangle(px,py,3,BH,n,isBoss?1:0.7).setOrigin(0,0).setDepth(D+3));
      ADD(this.add.text(px+10,py+BH/2,label,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:col,letterSpacing:1}).setOrigin(0,0.5).setDepth(D+3));
      if(isBoss) ADD(this.add.text(px+BW-8,py+BH/2,'★',{fontFamily:mono,fontSize:'9px',color:col}).setOrigin(1,0.5).setDepth(D+3));
      bg.on('pointerover',()=>bg.setFillStyle(n,0.32));
      bg.on('pointerout', ()=>bg.setFillStyle(n,0.14));
      bg.on('pointerdown',()=>{
        try { Snd.play('powerup'); } catch {}
        this._closeSandboxPanel();
        this._sandboxSpawn(type,isBoss);
      });
    };

    const SPAWN_Y = SECTION_Y + 20;
    BASIC.forEach((e,i)=>mkBtn(COL_BASIC, SPAWN_Y + i*(BH+GAP), e[0], e[1], e[2]));
    SECTOR.forEach((e,i)=>mkBtn(COL_SECTOR, SPAWN_Y + i*(BH+GAP), e[0], e[1], e[2]));
    BOSSES.forEach((b,i)=>mkBtn(COL_BOSS,  SPAWN_Y + i*(BH+GAP), b[0], b[1], b[2], true));

    // ── Archetype switcher (8 cards) ──
    const ARCH_Y = H/2 + 70;
    ADD(this.add.text(COL_BASIC, ARCH_Y - 18, '// SWITCH ARCHETYPE  (restarts sandbox with new build)', {fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#cc44ff',letterSpacing:2}).setDepth(D+2));
    const archs = (typeof ARCHETYPES !== 'undefined') ? ARCHETYPES : [];
    // Sized to fit 8 cards inside the 880-wide panel: 8 * (92 + 4) - 4 = 764px ≤ ~860px content area
    const AW=92, AH=46, AGAP=4;
    archs.slice(0,8).forEach((a, i)=>{
      const col = (typeof a.col === 'number') ? a.col : 0x00cc66;
      const colS = '#' + col.toString(16).padStart(6,'0');
      const x = COL_BASIC + i * (AW + AGAP);
      const y = ARCH_Y;
      const cur = (a.id === this._archetype);
      const bg = ADD(this.add.rectangle(x, y, AW, AH, col, cur ? 0.30 : 0.10).setOrigin(0,0).setDepth(D+2).setInteractive({useHandCursor:true}).setStrokeStyle(1, col, cur?1:0.4));
      ADD(this.add.rectangle(x, y, 3, AH, col, 1).setOrigin(0,0).setDepth(D+3));
      ADD(this.add.text(x+10, y+8, a.icon||'?', {fontFamily:"'Courier New'",fontSize:'14px',color:colS,fontStyle:'bold'}).setDepth(D+3));
      ADD(this.add.text(x+10, y+26, a.name||a.id, {fontFamily:mono,fontSize:'8px',fontStyle:'bold',color:colS,letterSpacing:1}).setDepth(D+3));
      if(cur) ADD(this.add.text(x+AW-6, y+6, '●', {fontFamily:mono,fontSize:'10px',color:colS}).setOrigin(1,0).setDepth(D+3));
      bg.on('pointerover',()=>bg.setFillStyle(col, 0.40));
      bg.on('pointerout', ()=>bg.setFillStyle(col, cur ? 0.30 : 0.10));
      bg.on('pointerdown',()=>{
        if(a.id === this._archetype){ this._closeSandboxPanel(); return; }
        try { Snd.play('archetype'); } catch {}
        try { Save.set('equipped_archetype', a.id); } catch{}
        try { if(typeof Save.setEquippedArchetype === 'function') Save.setEquippedArchetype(a.id); } catch{}
        try { Save.set('equipped_power', a.power); } catch{}
        this.scene.start('GameScene', { mode:'dev', debugWave:1, debugScore:0, sandbox:true, archetype:a.id, archetypeSeeds:a.seeds||{}, archetypePower:a.power });
      });
    });

    // ── AI toggle + Close + Exit Sandbox row ──
    const ROW_Y = H/2 + 170;
    const aiColInit = this._sandboxNoAI ? 0xff4444 : 0x00ff44;
    const aiTextInit = this._sandboxNoAI ? 'AI: OFF (enemies frozen)' : 'AI: ON (enemies act)';
    const aiBg = ADD(this.add.rectangle(COL_BASIC, ROW_Y, 280, 32, aiColInit, 0.18).setOrigin(0,0).setDepth(D+2).setStrokeStyle(1, aiColInit, 0.8).setInteractive({useHandCursor:true}));
    const aiTx = ADD(this.add.text(COL_BASIC+12, ROW_Y+16, aiTextInit, {fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:this._sandboxNoAI?'#ff8888':'#88ff88',letterSpacing:1}).setOrigin(0,0.5).setDepth(D+3));
    aiBg.on('pointerdown',()=>{
      try { Snd.play('powerup'); } catch {}
      this._sandboxNoAI = !this._sandboxNoAI;
      const c2 = this._sandboxNoAI ? 0xff4444 : 0x00ff44;
      aiBg.setFillStyle(c2, 0.18); aiBg.setStrokeStyle(1, c2, 0.8);
      aiTx.setText(this._sandboxNoAI ? 'AI: OFF (enemies frozen)' : 'AI: ON (enemies act)').setColor(this._sandboxNoAI?'#ff8888':'#88ff88');
    });

    // Close button
    const closeBg = ADD(this.add.rectangle(W/2+90, ROW_Y, 130, 32, 0x001a11, 0.95).setOrigin(0,0).setDepth(D+2).setStrokeStyle(1, 0x00cc66, 0.85).setInteractive({useHandCursor:true}));
    ADD(this.add.text(W/2+155, ROW_Y+16, '[ CLOSE ]', {fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#00ff66',letterSpacing:2}).setOrigin(0.5).setDepth(D+3));
    closeBg.on('pointerover',()=>closeBg.setFillStyle(0x002211, 1));
    closeBg.on('pointerout', ()=>closeBg.setFillStyle(0x001a11, 0.95));
    closeBg.on('pointerdown',()=>this._closeSandboxPanel());

    // Exit Sandbox button
    const exitBg = ADD(this.add.rectangle(W/2+230, ROW_Y, 140, 32, 0x220000, 0.95).setOrigin(0,0).setDepth(D+2).setStrokeStyle(1, 0xff4444, 0.85).setInteractive({useHandCursor:true}));
    ADD(this.add.text(W/2+300, ROW_Y+16, '[ EXIT SANDBOX ]', {fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ff8888',letterSpacing:1}).setOrigin(0.5).setDepth(D+3));
    exitBg.on('pointerover',()=>exitBg.setFillStyle(0x330000, 1));
    exitBg.on('pointerout', ()=>exitBg.setFillStyle(0x220000, 0.95));
    exitBg.on('pointerdown',()=>{
      try { Snd.play('powerup'); } catch {}
      this._closeSandboxPanel();
      this._sandboxExitConfirm();
    });

    // ESC key closes
    if(this.input && this.input.keyboard){
      this.input.keyboard.once('keydown-ESC', () => this._closeSandboxPanel());
    }
  }

  _closeSandboxPanel(){
    if(!this._sbPanelOpen) return;
    this._sbPanelOpen = false;
    this.paused = false;
    try { Snd.play('powerup'); } catch {}
    // Re-enable HUD toggle button
    try { if(this._sbToggleBtn) this._sbToggleBtn.setInteractive({useHandCursor:true}); } catch {}
    if(this._sbPanelObjs){
      this._sbPanelObjs.forEach(o => { try { o.destroy(); } catch {} });
      this._sbPanelObjs = null;
    }
  }

  _refreshSandboxBtns(){
    // Legacy HUD buttons are gone — panel rebuilds fresh on each open. Stub kept
    // so existing _sandboxSpawn delayed-call doesn't NPE.
  }

  _sandboxSpawn(type,isBoss=false){
    if(this.enemies.length>0)return;
    if(isBoss){
      this.bossWave=true;
      this._spawnBossOfType(type);
    } else {
      this._spawnEnemyAt(W/2,H/2-40,type);
    }
    this.time.delayedCall(50,()=>this._refreshSandboxBtns());
  }

  _sandboxExitConfirm(){
    if(this._sbExitOpen)return;
    this._sbExitOpen=true;
    this.paused=true;
    const mono="'Courier New',monospace";
    const D=200;
    const objs=[],T=o=>{objs.push(o);return o;};
    T(this.add.rectangle(W/2,H/2,W,H,0x000000,0.72).setDepth(D));
    T(this.add.rectangle(W/2,H/2,500,130,0x020c06,0.97).setDepth(D+1));
    T(this.add.rectangle(W/2,H/2,500,130).setStrokeStyle(1,0x00ff44,0.45).setDepth(D+1));
    T(this.add.rectangle(W/2,H/2-52,500,2,0x00ff44,0.25).setOrigin(0.5,0).setDepth(D+2));
    T(this.add.text(W/2,H/2-36,'EXIT SANDBOX?',{fontFamily:"'Orbitron',sans-serif",fontSize:'16px',fontStyle:'900',color:'#00ff44',letterSpacing:4}).setOrigin(0.5).setDepth(D+2));
    T(this.add.text(W/2,H/2-12,'Are you sure you want to exit sandbox mode?',{fontFamily:mono,fontSize:'11px',color:'#336644'}).setOrigin(0.5).setDepth(D+2));
    const close=()=>{objs.forEach(o=>{try{o.destroy();}catch{}});this._sbExitOpen=false;this.paused=false;};
    const yesBg=T(this.add.rectangle(W/2-74,H/2+30,130,32,0xff2244,0.15).setDepth(D+2).setInteractive({useHandCursor:true}));
    T(this.add.rectangle(W/2-74,H/2+30,130,32).setStrokeStyle(1,0xff2244,0.7).setDepth(D+2));
    T(this.add.text(W/2-74,H/2+30,'[ YES — EXIT ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ff2244'}).setOrigin(0.5).setDepth(D+3));
    yesBg.on('pointerover',()=>yesBg.setFillStyle(0xff2244,0.28));
    yesBg.on('pointerout', ()=>yesBg.setFillStyle(0xff2244,0.15));
    yesBg.on('pointerdown',()=>{
      close();
      this.cameras.main.fadeOut(220,0,0,0);
      this.time.delayedCall(220,()=>{
        this.scene.stop('GameScene');
        const ms=this.scene.get('MenuScene');
        if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
      });
    });
    const noBg=T(this.add.rectangle(W/2+74,H/2+30,130,32,0x00ff44,0.1).setDepth(D+2).setInteractive({useHandCursor:true}));
    T(this.add.rectangle(W/2+74,H/2+30,130,32).setStrokeStyle(1,0x00cc44,0.5).setDepth(D+2));
    T(this.add.text(W/2+74,H/2+30,'[ NO — STAY ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#00cc44'}).setOrigin(0.5).setDepth(D+3));
    noBg.on('pointerover',()=>noBg.setFillStyle(0x00ff44,0.22));
    noBg.on('pointerout', ()=>noBg.setFillStyle(0x00ff44,0.1));
    noBg.on('pointerdown',close);
  }

  _spawnBossNow(){
    if(this.enemies.some(e=>e.isBoss))return; // guard: don't double-spawn
    try{
      const def=this._getBossDef();
      const _ascHp=Math.ceil(def.hp*(this._bossHpMult||1));
      const boss={
        x:W/2,y:-120,
        hp:_ascHp,maxHp:_ascHp,
        size:def.size,color:def.color,
        name:def.name,baseName:def.baseName,
        isBoss:true,type:'boss',
        // Movement
        spd:0,vx:0,vy:60,
        angle:0,pT:0,sT:0,
        // Phase system
        phase:1,          // 1=normal 2=encrypted 3=rage
        phaseThresholds:[0.6,0.3], // switch at 60% and 30% HP
        encryptedT:0,     // encrypted phase timer
        rageT:0,
        // Unique state per boss
        weakAngle:0,      // rotating weak point angle
        weakHit:false,    // weak point just hit
        barrierAngle:0,   // FIREWALL barrier rotation
        gravWells:[],     // VOID.NODE gravity wells
        ghostAlpha:1,     // GHOST.EXE visibility
        countdownT:-1,    // CORE.BREACH detonation timer
        // Entry animation
        entering:true,
        // Pattern control
        shootCooldown:0,
        moveCooldown:0,
        moveTargetX:W/2,moveTargetY:160,
        // Telegraphs for attack warnings
        _telegraphs:[],
      };
      this.enemies.push(boss);
      this.txtBossName.setText(`◈ ${def.name} ◈`);
      this._pushGrid(W/2,0,120);
      CRT.glitch(0.6);
      if(Settings.get('shake'))this.cameras.main.flash(400,(def.color>>16)&0xff,(def.color>>8)&0xff,def.color&0xff,0.2);
    }catch(e){console.error('[SPAWN BOSS]',e);}
  }

  // ─── ENEMY SPAWNING ──────────────────────────────────────
  _spawnEnemyAt(x,y,type){
    try{
      const C={
        grunt:       {hp:1,size:14,spd:160, color:0xff3232,sInt:1.8},
        sniper:      {hp:1,size:10,spd:120, color:0xff8800,sInt:1.3},
        tank:        {hp:3,size:24,spd:90,  color:0xaa0000,sInt:2.5},
        swarm:       {hp:1,size:8, spd:220, color:0xff00aa,sInt:99},
        rootkit:     {hp:1,size:11,spd:100, color:0x00ff88,sInt:2.2},
        leech:       {hp:1,size:12,spd:130, color:0x44ff44,sInt:99},
        bouncer:     {hp:2,size:18,spd:70,  color:0x00ccff,sInt:2.0},
        phantom:     {hp:1,size:11,spd:180, color:0xcc88ff,sInt:1.8},
        orbit_node:  {hp:2,size:13,spd:80,  color:0x0088ff,sInt:1.6},
        pulsar:      {hp:3,size:16,spd:0,   color:0xaa44ff,sInt:99},
        drift_packet:{hp:1,size:10,spd:280, color:0x00aaaa,sInt:99},
      memory_trap: {hp:2,size:14,spd:0,    color:0xff44aa,sInt:99},
      fragment:    {hp:1,size:11,spd:200+this.wave*10, color:0x44ffcc,sInt:99},
      core_shard:  {hp:2,size:13,spd:170+this.wave*8,  color:0xff2244,sInt:99},
      overload_node:{hp:3,size:15,spd:80+this.wave*4,  color:0xff8800,sInt:99},
    };
      const c=C[type]||C.grunt;
      this.enemies.push({x,y,hp:c.hp,maxHp:c.hp,size:c.size,spd:c.spd,color:c.color,sInt:c.sInt,sT:0,type,isBoss:false,angle:0,bootT:0.4,visible:true,revealed:true});
      this._sysLog(`[DEV] spawned ${type}`);
    }catch(e){console.error('[SPAWN AT]',e);}
  }

  _spawnEnemy(){
    if(this.paused||this.bossWave||this._tutOnline)return; // bossWave + tutorial guard
    // ── FEATURE 6: Adaptive AI — spawn on opposite side from player's preferred reflect side ──
    const history=this.reflectSideHistory||[];
    const leftCount=history.filter(s=>s==='left').length;
    const rightCount=history.filter(s=>s==='right').length;
    // If player mostly reflects from left, spawn more from the right to flank
    const adaptBias=history.length>8?(leftCount>rightCount?'right':'left'):'none';

    const edge=Math.floor(Math.random()*4);
    let x,y;
    if(adaptBias==='right'&&Math.random()<0.55){
      // Force spawn from right side
      x=W+25;y=Math.random()*H;
    } else if(adaptBias==='left'&&Math.random()<0.55){
      x=-25;y=Math.random()*H;
    } else {
      if(edge===0){x=Math.random()*W;y=-25;}
      else if(edge===1){x=Math.random()*W;y=H+25;}
      else if(edge===2){x=-25;y=Math.random()*H;}
      else{x=W+25;y=Math.random()*H;}
    }
    const roll=Math.random();
    let type='grunt';
    const inSector00=this.wave>=6&&this.wave<=10;
    const inDeepMemory=this.wave>=11&&this.wave<=15;
    const inKernelSpace=this.wave>=16&&this.wave<=20;
    const isFeederWave=(this.wave%5===4)&&this.wave>0;

    if(isFeederWave){
      // Feeder waves: only spawn low-threat types and reduce spawn count via HP reduction
      if(roll>0.85)type='swarm';
      else if(roll>0.5)type='rootkit';
      // else: grunt (default)
    } else if(inSector00){
      // ── SECTOR_00 spawn table — gravity theme enemies phase in ──
      // Reduced base types so sector enemies have room
      if(roll>0.78)type='sniper';
      if(roll>0.90)type='tank';
      if(roll>0.97)type='swarm';
      if(roll>0.98)type='rootkit';
      // DRIFT.PACKET — phases in from wave 6
      const driftChance=this.wave>=6?0.15+(this.wave-6)*0.02:0;
      if(Math.random()<driftChance)type='drift_packet';
      // ORBIT.NODE — joins wave 7
      const orbitChance=this.wave>=7?0.12+(this.wave-7)*0.02:0;
      if(Math.random()<orbitChance)type='orbit_node';
      // PULSAR — joins wave 8, capped at 2 per wave
      const pulsarChance=this.wave>=8?0.08:0;
      this._pulsarCount=this._pulsarCount||0;
      if(Math.random()<pulsarChance&&this._pulsarCount<2){type='pulsar';this._pulsarCount++;}
    } else if(inDeepMemory){
      // ── DEEP_MEMORY spawn table (waves 11-15) ──
      if(roll>0.70)type='sniper';
      if(roll>0.85)type='tank';
      if(roll>0.95)type='swarm';
      if(roll>0.97)type='phantom';
      // FRAGMENT — high spawn from wave 11
      const fragChance=0.20+(this.wave-11)*0.03;
      if(Math.random()<fragChance)type='fragment';
      // MEMORY_TRAP — stationary mine, from wave 12, max 3
      if(!this._trapCount)this._trapCount=0;
      const trapChance=this.wave>=12?0.10:0;
      if(Math.random()<trapChance&&this._trapCount<3){type='memory_trap';this._trapCount++;}
    } else if(inKernelSpace){
      // ── KERNEL_SPACE spawn table (waves 16-20) ──
      if(roll>0.65)type='sniper';
      if(roll>0.82)type='tank';
      if(roll>0.94)type='swarm';
      if(roll>0.97)type='phantom';
      // CORE_SHARD — erratic, splits on death, from wave 16
      const shardChance=0.18+(this.wave-16)*0.025;
      if(Math.random()<shardChance)type='core_shard';
      // OVERLOAD_NODE — charger, max 2, from wave 18
      if(!this._overloadCount)this._overloadCount=0;
      const overloadChance=this.wave>=18?0.10:0;
      if(Math.random()<overloadChance&&this._overloadCount<2){type='overload_node';this._overloadCount++;}
    } else {
      // ── Standard spawn table ──
      if(this.wave>=2&&roll>0.72)type='sniper';
      if(this.wave>=4&&roll>0.87)type='tank';
      if(this.wave>=3&&roll>0.96)type='swarm';
      if(this.wave>=6&&roll>0.88&&roll<=0.96)type='rootkit';
      if(this.wave>=6&&roll>0.97)type='rootkit';
      if(this.wave>=5&&roll>0.67&&roll<=0.72)type='leech';
      if(this.wave>=8&&roll>0.83&&roll<=0.87)type='bouncer';
      if(this.wave>=10&&roll>0.94&&roll<=0.96)type='phantom';
    }
    // Cap concurrent snipers — too many feels punishing once they actually shoot
    if(type==='sniper'&&this.enemies.filter(e=>e.type==='sniper').length>=2){
      type='grunt';
    }
    const slow=this.upg.slow>0?Math.pow(0.75,this.upg.slow):1;
    const C={
      grunt:  {hp:1,size:14,spd:Math.min((160+this.wave*5)*slow,220), color:0xff3232,sInt:1.8},
      sniper: {hp:1,size:10,spd:(120+this.wave*3)*slow,              color:0xff8800,sInt:1.0},
      tank:   {hp:3,size:24,spd:(90+this.wave*2)*slow,               color:0xaa0000,sInt:2.5},
      swarm:  {hp:1,size:8, spd:(200+this.wave*7)*slow,              color:0xff00aa,sInt:99},
      rootkit:{hp:1,size:11,spd:(100+this.wave*3)*slow,              color:0x00ff88,sInt:2.2},
      leech:  {hp:1,size:12,spd:(130+this.wave*4)*slow,              color:0x44ff44,sInt:99},  // no shooting, drains heat
      bouncer:{hp:2,size:18,spd:(70+this.wave*2)*slow,               color:0x00ccff,sInt:2.0}, // deflects reflected bullets
      phantom:{hp:1,size:11,spd:(180+this.wave*5)*slow,              color:0xcc88ff,sInt:1.8}, // leaves ghost on death
      // ── SECTOR_00 enemies ──
      orbit_node: {hp:2,size:13,spd:(80+this.wave*5)*slow,             color:0x0088ff,sInt:1.6},
      pulsar:     {hp:3,size:16,spd:0,                                  color:0xaa44ff,sInt:99},  // stationary
      drift_packet:{hp:1,size:10,spd:(280+this.wave*12)*slow,           color:0x00aaaa,sInt:99},  // no shooting — fires burst on axis cross
      // ── DEEP_MEMORY enemies ──
      memory_trap:{hp:2,size:14,spd:0,                                  color:0xff44aa,sInt:99},  // stationary mine
      fragment:   {hp:1,size:10,spd:(200+this.wave*10)*slow,            color:0x44ffcc,sInt:99},  // 4-shard cluster
      // ── KERNEL_SPACE enemies ──
      core_shard:  {hp:2,size:13,spd:(170+this.wave*8)*slow,            color:0xff2244,sInt:99},  // erratic
      overload_node:{hp:3,size:15,spd:(80+this.wave*4)*slow,            color:0xff8800,sInt:99},  // charges, fires ring
    };
    const c=C[type]||C.grunt;
    const oc=this.overclocked?1.6:1.0;
    const modSpd=this.waveModifier==='FAST'?1.4:this.waveModifier==='OVERLOAD'?1.3:this.waveModifier==='FRAGILE'?1.6:this.waveModifier==='SURGE'?1.5:1.0;
    const modHp=this.waveModifier==='ARMORED'?1:0;
    const isForceElite=this.waveModifier==='MINIBOSS';
    const dm=(this.diff||DIFFICULTY.daemon).enemySpeedMult;
    const si=(type==='sniper'?(this.diff||DIFFICULTY.daemon).sniperInterval:c.sInt)*(this.overclocked?0.75:1);
    const isRootkit=type==='rootkit';
    const isElite=isForceElite||(this.wave>=5&&Math.random()<(0.12+(this._eliteChanceBonus||0)));
    const eliteScale=isElite?1.5:1;
    const fragileHp=this.waveModifier==='FRAGILE'?1:0;
    const feederHpMult=(this.wave%5===4)&&this.wave>0?0.5:1;  // Feeder waves: 50% HP for easier kills
    const finalHp=fragileHp||Math.max(1,Math.ceil((c.hp+modHp)*Math.ceil(eliteScale)*feederHpMult));
    this.enemies.push({
      x,y,hp:finalHp,maxHp:finalHp,
      size:c.size*eliteScale,spd:Math.min(c.spd*oc*dm*modSpd*(isElite?1.2:1), (window.DEV&&typeof window.DEV.enemySpeedCap==='number')?window.DEV.enemySpeedCap:200),elite:isElite,
      color:c.color,sInt:si,sT:Math.random()*si,type,
      isBoss:false,angle:0,bootT:0.4,_orbitOff:Math.random()*Math.PI*2,
      // Rootkit specific
      visible:!isRootkit,    // rootkits start invisible
      flashT:0,              // how long they've been flashing
      revealed:false,        // permanently revealed by reflected bullet
    });
    if(this._waveTypes)this._waveTypes.add(type);
    // Apply a run mutation with 35% chance
    if(this._runMutations&&this._runMutations.length>0&&Math.random()<0.35){
      const e=this.enemies[this.enemies.length-1];
      const mut=this._runMutations[Math.floor(Math.random()*this._runMutations.length)];
      e._mut=mut.id;
      e._mutCol=mut.col;
    }
  }

  _spawnFormation(){
    if(this.wave<3||this.bossWave||this._tutOnline)return;
    const r=Math.random();
    if(r<0.3){for(let s=0;s<2;s++){this.enemies.push({x:s===0?-25:W+25,y:H/2+(Math.random()-0.5)*200,hp:1,maxHp:1,size:14,spd:85,color:0xff4444,sInt:3,sT:1,type:'grunt',isBoss:false,angle:0});}}
    else if(r<0.55&&this.wave>=7){for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;this.enemies.push({x:W/2+Math.cos(a)*650,y:H/2+Math.sin(a)*420,hp:1,maxHp:1,size:12,spd:88,color:0xff2288,sInt:2,sT:0.5,type:'grunt',isBoss:false,angle:0});}}
    else if(this.wave>=7){for(let i=0;i<4;i++){this.enemies.push({x:-25,y:120+i*140,hp:2,maxHp:2,size:16,spd:62,color:0xff6600,sInt:2.5,sT:Math.random(),type:'grunt',isBoss:false,angle:0});}}
  }

  _spawnHazard(){
    if(this.wave<4||this._tutOnline)return;
    const r=Math.random();
    if(r<0.4){
      const horiz=Math.random()<0.5;
      // Start position — always on the opposite side from the player
      let startPos;
      if(horiz) startPos=this.py>H/2?-20:H+20; // spawn top if player is bottom, vice versa
      else startPos=this.px>W/2?-20:W+20;       // spawn left if player is right, vice versa
      const goingRight=startPos<0;
      this.hazards.push({
        type:'laser',horiz,
        pos:startPos,
        dir:goingRight?1:-1,
        spd:120+this.wave*4,   // slower — was 190+wave*7
        color:0xff2244,
        warn:true,
        warnT:1.8,             // longer warning — was 0.9
        warnPos:horiz?(goingRight?80:H-80):(goingRight?80:W-80), // show warning at edge player needs to cross
      });
    }
    else if(r<0.7&&this.wave>=6){this.hazards.push({type:'emp',x:Math.random()*W,y:Math.random()*H,r:0,spd:170,maxR:340,color:0xaa00ff,active:true});}
    else if(this.wave>=8){this.hazards.push({type:'void',x:120+Math.random()*(W-240),y:80+Math.random()*(H-160),r:38,color:0x000000,life:8});}
  }

  // ─── CHAIN REACTION HOOK ─────────────────────────────────
  _chainExplosion(x,y,col,depth=0){
    // Cap chain cascade aggressively when surge is active — was nuking entire map
    if(this.surgeActive && depth >= 3) return;
    const maxDepth=5+(this.upg&&this.upg.chain_amplifier?Math.min(this.upg.chain_amplifier,3):0)+(this._chainPatchBonus||0);
    if(depth>=maxDepth)return;
    // SIDE_OBJ: count top-level chain reactions
    if(depth===0) this._chainReactions=(this._chainReactions||0)+1;
    const RADIUS=90+depth*15;
    this._pushGrid(x,y,60);
    this._spawnParticles(x,y,col,12+depth*4);
    this._spawnShockRing(x,y,col,80+depth*40);
    this.cameras.main.shake(120,0.006+depth*0.003);
    // Reflect any enemy bullets in radius
    let reflectedCount=0;
    this.bullets.forEach(b=>{
      if(!b.reflected&&Math.hypot(b.x-x,b.y-y)<RADIUS){
        const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy);
        if(d>0){const spd=Math.hypot(b.vx,b.vy)*1.5;b.vx=(dx/d)*spd;b.vy=(dy/d)*spd;}
        b.reflected=true;b.col=0x00ffff;b.chainBorn=true;
        reflectedCount++;
      }
    });
    // Damage enemies in radius
    for(let i=this.enemies.length-1;i>=0;i--){
      const e=this.enemies[i];
      // Skip enemies that are still in their spawn-grace (bootT > 0)
      if(Math.hypot(e.x-x,e.y-y)<RADIUS&&!e.isBoss&&!(e.bootT>0)){
        e.hp-=1;
        if(e.hp<=0){
          const ex=e.x,ey=e.y,ec=e.color;
          this._killEnemy(e,i,true);
          this.chainCount++;
          this.bestChain=Math.max(this.bestChain,this.chainCount);
          this.time.delayedCall(50,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,depth+1);});
        }
      }
    }
    // OVERLOAD_CHAIN synergy: each chain explosion emits 2 fork bullets
    if(this.synergies&&this.synergies.includes('OVERLOAD_CHAIN')&&depth<3){
      for(let f=0;f<2;f++){
        const fa=(Math.PI*2/2)*f+Math.random()*Math.PI;
        this.bullets.push({x,y,vx:Math.cos(fa)*260,vy:Math.sin(fa)*260,col:0xffdd44,reflected:true,size:5,trail:[]});
      }
    }
    // Chain UI removed — keep the screen-glitch feedback for high-depth chains since
    // that's a tactile cue not a numeric distraction.
    if(this.chainCount>1) CRT.glitch(0.2*depth);
  }

  _toggleDevOverlay_REMOVED(){
    if(this._devOpen){this._closeDevOverlay();return;}
    if(this._statsOpen)return;
    this._devOpen=true;
    this.paused=true;
    const W_=W, H_=H;
    const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";
    const D=95;
    const objs=[], add=o=>{objs.push(o);return o;};
    const tabs=['STATE','SPAWN','UPGRADES','SAVE','AUDIO','TOGGLES'];
    let activeTab=this._devTab||0;
    const TAB_H=28, HEADER_H=38, GODBAR_H=32, LOG_H=58;
    const CONTENT_Y=HEADER_H+GODBAR_H+TAB_H;
    const CONTENT_H=H_-CONTENT_Y-LOG_H;

    // ── Overlay bg ──
    add(this.add.rectangle(W_/2,H_/2,W_,H_,0x000000,0.96).setDepth(D));

    // ── Header ──
    add(this.add.rectangle(W_/2,0,W_,HEADER_H,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W_/2,HEADER_H,W_,1.5,0x00ff44,0.5).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.text(W_/2,13,'DEV_CONSOLE.SH',{fontFamily:orb,fontSize:'14px',fontStyle:'900',color:'#00ff44',letterSpacing:4}).setOrigin(0.5,0).setDepth(D+2));
    add(this.add.text(W_/2,26,`GAME PAUSED — WAVE ${this.wave} — SCORE ${Math.floor(this.score).toLocaleString()} — \` TO CLOSE`,{fontFamily:mono,fontSize:'8px',color:'#224433'}).setOrigin(0.5,0).setDepth(D+2));

    // ── God Mode bar ──
    const godBarY=HEADER_H;
    const godBg=add(this.add.rectangle(W_/2,godBarY,W_,GODBAR_H,0xff4444,this._devGodMode?0.14:0.06).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W_/2,godBarY+GODBAR_H,W_,1,0x1a3322,0.8).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.text(20,godBarY+7,'◆ GOD MODE',{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#ff4444'}).setDepth(D+2));
    add(this.add.text(20,godBarY+20,'player unkillable · no overheat · infinite dash',{fontFamily:mono,fontSize:'8px',color:'#442222'}).setDepth(D+2));
    const godBtn=add(this.add.rectangle(W_-60,godBarY+16,88,22,0x110000,0.97).setOrigin(0.5).setDepth(D+2).setInteractive({useHandCursor:true}));
    add(this.add.rectangle(W_-60,godBarY+16,88,22).setStrokeStyle(1,0xff4444,0.6).setOrigin(0.5).setDepth(D+2));
    const godTxt=add(this.add.text(W_-60,godBarY+16,this._devGodMode?'[ ON ]':'[ OFF ]',{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#ff4444'}).setOrigin(0.5).setDepth(D+3));
    godBtn.on('pointerdown',()=>{
      this._devGodMode=!this._devGodMode;
      godTxt.setText(this._devGodMode?'[ ON ]':'[ OFF ]');
      godBg.setFillStyle(0xff4444,this._devGodMode?0.14:0.06);
      this._devLog(this._devGodMode?'GOD MODE: ON — unkillable':'GOD MODE: OFF');
    });

    // ── Tab bar ──
    const tabY=HEADER_H+GODBAR_H;
    add(this.add.rectangle(W_/2,tabY,W_,TAB_H,0x001100,0.97).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W_/2,tabY+TAB_H,W_,1,0x1a3322,1).setOrigin(0.5,0).setDepth(D+1));
    const TW=Math.floor(W_/tabs.length);
    const tabObjs=[];
    const switchTab=(i)=>{
      activeTab=i; this._devTab=i;
      tabObjs.forEach((t,j)=>{
        t.bg.setFillStyle(0x00ff44,j===i?0.12:0);
        t.bar.setFillStyle(0x00ff44,j===i?0.9:0);
        t.txt.setColor(j===i?'#00ff44':'#336644');
      });
      buildContent();
    };
    tabs.forEach((label,i)=>{
      const tx=i*TW+TW/2;
      const tbg=add(this.add.rectangle(tx,tabY,TW,TAB_H,0x00ff44,i===activeTab?0.12:0).setOrigin(0.5,0).setDepth(D+1).setInteractive({useHandCursor:true}));
      const tbar=add(this.add.rectangle(tx,tabY,TW,2,0x00ff44,i===activeTab?0.9:0).setOrigin(0.5,0).setDepth(D+2));
      const ttxt=add(this.add.text(tx,tabY+TAB_H/2,label,{fontFamily:mono,fontSize:'10px',color:i===activeTab?'#00ff44':'#336644',letterSpacing:1}).setOrigin(0.5).setDepth(D+2));
      tbg.on('pointerdown',()=>switchTab(i));
      tbg.on('pointerover',()=>{if(i!==activeTab)tbg.setFillStyle(0x00ff44,0.06);});
      tbg.on('pointerout', ()=>{if(i!==activeTab)tbg.setFillStyle(0x00ff44,0);});
      tabObjs.push({bg:tbg,bar:tbar,txt:ttxt});
    });

    // ── Log strip ──
    const logY=H_-LOG_H;
    add(this.add.rectangle(W_/2,logY,W_,LOG_H,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W_/2,logY,W_,1,0x003322,1).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.text(10,logY+6,'// LOG',{fontFamily:mono,fontSize:'8px',color:'#224433'}).setDepth(D+2));
    this._devLogObjs=[];
    for(let li=0;li<4;li++){
      this._devLogObjs.push(add(this.add.text(10,logY+17+li*11,'',{fontFamily:mono,fontSize:'9px',color:'#00aa44'}).setDepth(D+2)));
    }
    this._devLogHistory=this._devLogHistory||[];
    this._refreshDevLog();

    // ── Content area ──
    const contentObjs=[];
    const clearContent=()=>{ contentObjs.forEach(o=>{try{o.destroy();}catch{}}); contentObjs.length=0; };
    const cadd=o=>{contentObjs.push(o);objs.push(o);return o;};

    const btn=(x,y,w,label,col,cb)=>{
      col=col||'#00cc44';
      const n=parseInt(col.replace('#',''),16);
      const bg=cadd(this.add.rectangle(x,y,w,20,n,0.08).setOrigin(0,0).setDepth(D+2).setInteractive({useHandCursor:true}));
      cadd(this.add.rectangle(x,y,2,20,n,0.7).setOrigin(0,0).setDepth(D+2));
      const t=cadd(this.add.text(x+8,y+10,`> ${label}`,{fontFamily:mono,fontSize:'10px',color:col}).setOrigin(0,0.5).setDepth(D+3));
      bg.on('pointerover',()=>{bg.setFillStyle(n,0.18);t.setColor('#ffffff');});
      bg.on('pointerout', ()=>{bg.setFillStyle(n,0.08);t.setColor(col);});
      bg.on('pointerdown',()=>{try{cb();}catch(e){this._devLog('[ERR] '+e.message,'#ff4444');}});
      return {bg,t};
    };
    const tog=(x,y,w,label,col,getCb,setCb)=>{
      col=col||'#00cc44';
      const n=parseInt(col.replace('#',''),16);
      const bg=cadd(this.add.rectangle(x,y,w,20,n,0.06).setOrigin(0,0).setDepth(D+2).setInteractive({useHandCursor:true}));
      cadd(this.add.rectangle(x,y,2,20,n,getCb()?0.8:0.3).setOrigin(0,0).setDepth(D+2));
      const t=cadd(this.add.text(x+8,y+10,'',{fontFamily:mono,fontSize:'10px'}).setOrigin(0,0.5).setDepth(D+3));
      const upd=()=>{ const v=getCb(); t.setText(`> ${label}: ${v?'ON':'OFF'}`).setColor(v?col:'#336644'); };
      upd();
      bg.on('pointerdown',()=>{setCb(!getCb());upd();this._devLog(`${label}: ${getCb()?'ON':'OFF'}`,getCb()?col:'#336644');});
      bg.on('pointerover',()=>bg.setFillStyle(n,0.14));
      bg.on('pointerout', ()=>bg.setFillStyle(n,0.06));
      return upd;
    };
    const numRow=(x,y,label,col,getCb,setCb)=>{
      cadd(this.add.text(x,y+12,label,{fontFamily:mono,fontSize:'9px',color:'#445544'}).setOrigin(0,0.5).setDepth(D+2));
      const n=parseInt((col||'#00cc44').replace('#',''),16);
      const valT=cadd(this.add.text(x+120,y+12,'',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:col||'#00cc44'}).setOrigin(0,0.5).setDepth(D+3));
      const upd=()=>valT.setText(String(getCb()));  upd();
      const mkB=(bx,dir)=>{
        const b=cadd(this.add.rectangle(bx,y+10,22,16,0x001a00,1).setOrigin(0.5).setDepth(D+2).setInteractive({useHandCursor:true}));
        cadd(this.add.text(bx,y+10,dir>0?'+':'-',{fontFamily:mono,fontSize:'9px',color:col||'#00cc44'}).setOrigin(0.5).setDepth(D+3));
        b.on('pointerdown',()=>{setCb(getCb()+dir);upd();});
        b.on('pointerover',()=>b.setFillStyle(n,0.3));
        b.on('pointerout',()=>b.setFillStyle(0x001a00,1));
      };
      mkB(x+148,-1); mkB(x+172,1);
    };
    const secHdr=(x,y,w,label)=>{
      cadd(this.add.rectangle(x,y,w,20,0x001a00,1).setOrigin(0,0).setDepth(D+1));
      cadd(this.add.rectangle(x,y,2,20,0x00ff44,0.7).setOrigin(0,0).setDepth(D+1));
      cadd(this.add.text(x+8,y+10,label,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#00ff44'}).setOrigin(0,0.5).setDepth(D+2));
    };

    const CX=[10,450], CW=430, GAP=4;

    const buildContent=()=>{
      clearContent();
      const CY=CONTENT_Y+6;

      if(activeTab===0){ // STATE
        let y=CY;
        secHdr(CX[0],y,CW,'// GAME STATE'); y+=24;
        numRow(CX[0],y,'WAVE','#00cc44',()=>this.wave,(v)=>{this.wave=Math.max(1,v);});  y+=24;
        numRow(CX[0],y,'SCORE','#ffdd00',()=>Math.floor(this.score),(v)=>{this.score=Math.max(0,v);});  y+=24;
        numRow(CX[0],y,'SHARDS','#ccaa00',()=>this.shards,(v)=>{this.shards=Math.max(0,v);});  y+=24;
        btn(CX[0],y,CW,'FORCE WAVE CLEAR','#00ffcc',()=>{window.DEV.forceWaveClear=true;this._devLog('Wave clear queued');}); y+=24+GAP;
        btn(CX[0],y,CW,'SPAWN BOSS NOW','#ff2244',()=>{window.DEV.spawnBoss=true;this._devLog('Boss spawn queued');}); y+=24+GAP;
        btn(CX[0],y,CW,'CLEAR ALL ENEMIES','#ff4444',()=>{window.DEV.clearEnemies=true;this._devLog('Enemies cleared');}); y+=24+GAP;
        btn(CX[0],y,CW,'TRIGGER MEMORY DUMP','#aaffdd',()=>{window.DEV.triggerMemDump=true;this._devLog('Memory dump queued');}); y+=24+GAP;
        btn(CX[0],y,CW,'TRIGGER STACK OVERFLOW','#ffdd00',()=>{window.DEV.triggerOverflow=true;this._devLog('Stack overflow queued');}); y+=24+GAP;
        btn(CX[0],y,CW,'TRIGGER PING (bypass CD)','#00ffcc',()=>{window.DEV.forcePing=true;this._devLog('Ping bypassed');}); y+=24+GAP;
        btn(CX[0],y,CW,'TRIGGER INFERNO RAGE','#ff6600',()=>{window.DEV.forceRage=true;this._devLog('Rage triggered');}); y+=24+GAP;
        btn(CX[0],y,CW,'TEST ALL BANNERS','#ffdd00',()=>{window.DEV.testBanners=true;this._devLog('Banners queued');}); y+=24+GAP;

        let y2=CY;
        secHdr(CX[1],y2,CW,'// FIGHT BOSS DIRECTLY'); y2+=24;
        const bossWaves={FIREWALL:5,'VOID.NODE':10,'GHOST.EXE':15,'CORE.BREACH':20};
        Object.entries(bossWaves).forEach(([name,wave])=>{
          btn(CX[1],y2,CW,`FIGHT ${name}`,'#ff2244',()=>{
            this._closeDevOverlay();
            this.cameras.main.fadeOut(260,0,0,0);
            this.time.delayedCall(260,()=>{this.scene.start('GameScene',{mode:'dev',debugWave:wave-1,debugScore:0});});
          }); y2+=24+GAP;
        });
        y2+=8;
        [1,2,3].forEach(ph=>{
          btn(CX[1],y2,CW,`FORCE BOSS PHASE ${ph}`,'#ff4444',()=>{window.DEV.bossPhase=ph;this._devLog(`Boss phase ${ph} queued`);}); y2+=24+GAP;
        });

      } else if(activeTab===1){ // SPAWN
        let y=CY;
        secHdr(CX[0],y,CW,'// SANDBOX MODE'); y+=24;
        btn(CX[0],y,CW,'LAUNCH EMPTY SANDBOX','#00ff88',()=>{
          this._closeDevOverlay();
          this.cameras.main.fadeOut(220,0,0,0);
          this.time.delayedCall(220,()=>{
            this.scene.start('GameScene',{mode:'dev',debugWave:1,debugScore:0,sandbox:true});
          });
          this._devLog('Sandbox launched — no auto-spawns');
        }); y+=24+GAP;
        y+=4;
        secHdr(CX[0],y,CW,'// SPAWN (center of arena)'); y+=24;
        const allTypes=[
          ['grunt','#ff3232'],['sniper','#ff8800'],['tank','#aa0000'],
          ['swarm','#ff00aa'],['rootkit','#00ff88'],['leech','#44ff44'],
          ['bouncer','#00ccff'],['phantom','#cc88ff'],
          ['orbit_node','#0088ff'],['pulsar','#aa44ff'],['drift_packet','#00aaaa'],
        ];
        allTypes.forEach(([type,col])=>{
          btn(CX[0],y,CW,`SPAWN ${type.toUpperCase().replace('_',' ')}`,col,()=>{
            this._spawnEnemyAt(W/2,H/2-80,type);
            this._devLog(`Spawned: ${type}`);
          }); y+=24+GAP;
        });

        let y2=CY;
        secHdr(CX[1],y2,CW,'// SKIN SELECT'); y2+=24;
        Object.values(SHIPS).forEach(s=>{
          const active=this.activeSkin===s.id;
          btn(CX[1],y2,CW,`${s.name}${active?' (ACTIVE)':''}`,active?'#00ff44':'#224433',()=>{
            Save.setSkin(s.id); if(!Save.isOwned(s.id))Save.own(s.id);
            this._devLog(`Skin: ${s.id}`); buildContent();
          }); y2+=24+GAP;
        });
        y2+=8;
        btn(CX[1],y2,CW,'GIVE ALL RELICS','#aa44ff',()=>{window.DEV.giveAllRelics=true;this._devLog('All relics granted');}); y2+=24+GAP;
        btn(CX[1],y2,CW,'OPEN STATS SCREEN','#00ccff',()=>{this._closeDevOverlay();this._openStats();}); y2+=24+GAP;

      } else if(activeTab===2){ // UPGRADES
        let y=CY;
        secHdr(CX[0],y,CW,'// UPGRADE TOOLS'); y+=24;
        btn(CX[0],y,CW,'GIVE ALL UPGRADES (MAX)','#00ffcc',()=>{window.DEV.allUpgrades=true;this._devLog('All upgrades max');}); y+=24+GAP;
        btn(CX[0],y,CW,'GIVE ALL SHOP PATCHES','#00aaff',()=>{
          ['firewall_seed','redundant_path','data_cache','primed_signal','redundant_buf','overclock_chip','signal_amp','packet_router','heat_sink','ghost_protocol','data_compress','kernel_access'].forEach(id=>Save.setMeta(id,true));
          this._devLog('All shop patches installed');
        }); y+=24+GAP;
        btn(CX[0],y,CW,'RESET RUN UPGRADES','#ff4444',()=>{window.DEV.resetUpgrades=true;this._devLog('Upgrades reset');}); y+=24+GAP;
        y+=8;
        secHdr(CX[0],y,CW,'// CURRENT BUILD'); y+=24;
        const activeUpgs=Object.entries(this.upg||{}).filter(([k,v])=>v>0);
        if(activeUpgs.length===0){
          cadd(this.add.text(CX[0]+8,y+10,'NO MODULES INSTALLED',{fontFamily:mono,fontSize:'10px',color:'#224433'}).setDepth(D+2));
        } else {
          activeUpgs.slice(0,10).forEach(([id,tier])=>{
            cadd(this.add.rectangle(CX[0],y,CW,20,0x001a00,0.5).setOrigin(0,0).setDepth(D+1));
            cadd(this.add.text(CX[0]+8,y+10,`${id.toUpperCase().replace(/_/g,' ')}`,{fontFamily:mono,fontSize:'9px',color:'#00cc66'}).setDepth(D+2));
            cadd(this.add.text(CX[0]+CW-30,y+10,`T${tier}`,{fontFamily:mono,fontSize:'9px',fontStyle:'bold',color:'#00ffcc'}).setOrigin(1,0.5).setDepth(D+2));
            y+=22;
          });
        }

      } else if(activeTab===3){ // SAVE
        let y=CY;
        secHdr(CX[0],y,CW,'// SAVE DATA'); y+=24;
        btn(CX[0],y,CW,'ADD 9999 SHARDS','#ccaa00',()=>{Shards.add(9999,'dev');this._devLog(`Shards: ${Shards.get()}`); buildContent();}); y+=24+GAP;
        btn(CX[0],y,CW,'ADD 100 SHARDS','#aacc66',()=>{Shards.add(100,'dev');this._devLog(`Shards: ${Shards.get()}`); buildContent();}); y+=24+GAP;
        btn(CX[0],y,CW,'RESET SHARDS TO 0','#ff4444',()=>{Shards.reset();this._devLog('Shards reset'); buildContent();}); y+=24+GAP;
        btn(CX[0],y,CW,'ADD 9999 FRAGMENTS','#44ffcc',()=>{Save.addFragments(9999);this._devLog(`Fragments: ${Save.fragments()}`); buildContent();}); y+=24+GAP;
        btn(CX[0],y,CW,'TOGGLE SHARDS DEBUG_LOG','#88ccff',()=>{Shards.DEBUG_LOG=!Shards.DEBUG_LOG;this._devLog(`Shards.DEBUG_LOG = ${Shards.DEBUG_LOG} — see F12 console`);}); y+=24+GAP;
        // ── Progression dev shortcuts ──
        btn(CX[0],y,CW,'UNLOCK ALL ARCHETYPES','#cc44ff',()=>{const ids=(typeof ARCHETYPES!=='undefined')?ARCHETYPES.map(a=>a.id):[];ids.forEach(id=>{if(id!=='signal_forge')Save.set('arch_owned_'+id,true);});Save.set('forge_unlocked',true);this._devLog('All archetypes + SIGNAL_FORGE unlocked');}); y+=24+GAP;
        btn(CX[0],y,CW,'SET ASCENSION_MAX = 25','#ffd700',()=>{Save.set('ascension_max',25);this._devLog('ascension_max = 25');}); y+=24+GAP;
        btn(CX[0],y,CW,'SET CURRENT ARCH MASTERY T5','#cc88ff',()=>{const a=this._archetype||'reflector';Save.setStat&&Save.setStat('arch_'+a+'_total_bosses',100);Save.setMeta&&Save.setMeta('arch_'+a+'_breached',true);this._devLog(`${a} mastery T5 forced`);}); y+=24+GAP;
        btn(CX[0],y,CW,'UNLOCK ALL SKINS','#aa88ff',()=>{Object.keys(SHIPS).forEach(id=>{if(!Save.isOwned(id))Save.own(id);});this._devLog('All skins unlocked');}); y+=24+GAP;
        btn(CX[0],y,CW,'RESET LEADERBOARD','#ff4444',()=>{Save.set('lb','[]');this._devLog('Leaderboard wiped');}); y+=24+GAP;
        btn(CX[0],y,CW,'COMPLETE DAILY CHALLENGES','#ffdd00',()=>{
          const today=new Date().toDateString();
          const ids=DAILY_POOL.map(c=>c.id);
          Save.set('daily_done_'+today,JSON.stringify(ids));
          this._devLog('All daily challenges done');
        }); y+=24+GAP;
        btn(CX[0],y,CW,'EXPORT SAVE (F12 console)','#00aaff',()=>{
          const data={};
          for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))data[k]=localStorage.getItem(k);}
          console.log('[DEV] SAVE EXPORT:',JSON.stringify(data,null,2));
          this._devLog('Save exported to F12 console');
        }); y+=24+GAP;
        btn(CX[0],y,CW,'WIPE ALL SAVE DATA','#ff0000',()=>{
          if(!this._devWipeConfirm){this._devWipeConfirm=true;this._devLog('Click again to confirm!','#ff4444');this.time.delayedCall(3000,()=>{this._devWipeConfirm=false;});}
          else{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));this._devLog('ALL DATA WIPED','#ff0000');}
        }); y+=24+GAP;
        // Shard display
        y+=8;
        cadd(this.add.text(CX[0]+8,y+10,`CURRENT SHARDS: ${Shards.get()} ◈  ·  FRAGMENTS: ${Save.fragments()||0} ✦`,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ffaa00'}).setDepth(D+2));

      } else if(activeTab===4){ // AUDIO
        let y=CY;
        secHdr(CX[0],y,CW,'// AUDIO / VISUAL'); y+=24;
        btn(CX[0],y,CW,'FORCE CRT GLITCH MAX','#aaaaff',()=>{CRT.glitch(2.0);this._devLog('CRT glitch triggered');}); y+=24+GAP;
        btn(CX[0],y,CW,'TEST ALL SOUNDS','#00aaff',()=>{['reflect','shield','surge','powerup','hit','laser','click','emp','void','corrupt','decoy','chain','phase','install','archetype','rage','volatile','boss','kill','death','fragment','modifier','echo_hit','shoot','node'].forEach((s,i)=>this.time.delayedCall(i*350,()=>{try{Snd.play(s);}catch{}}));this._devLog('Playing all 25 sounds...');}); y+=24+GAP;
        btn(CX[0],y,CW,'RESET DEBUG USES','#ff8800',()=>{Save.set('debug_uses',0);this._devLog('Debug uses reset');}); y+=24+GAP;
        y+=8;
        secHdr(CX[0],y,CW,'// SETTINGS TOGGLES'); y+=24;
        tog(CX[0],y,CW,'CRT OVERLAY','#aaaaff',()=>Settings.get('crt'),(v)=>Settings.set('crt',v)); y+=24+GAP;
        tog(CX[0],y,CW,'SCREEN SHAKE','#aaaaff',()=>Settings.get('shake'),(v)=>Settings.set('shake',v)); y+=24+GAP;
        tog(CX[0],y,CW,'VIGNETTE','#aaaaff',()=>Settings.get('vignette'),(v)=>Settings.set('vignette',v)); y+=24+GAP;
        tog(CX[0],y,CW,'VOICE','#aaaaff',()=>Settings.get('voice'),(v)=>Settings.set('voice',v)); y+=24+GAP;

      } else if(activeTab===5){ // TOGGLES
        let y=CY;
        secHdr(CX[0],y,CW,'// DEBUG TOGGLES'); y+=24;
        tog(CX[0],y,CW,'INVINCIBLE','#00ffcc',()=>window.DEV.invincible,(v)=>{window.DEV.invincible=v;}); y+=24+GAP;
        tog(CX[0],y,CW,'ONE HIT KILL','#ff4444',()=>window.DEV.oneHit,(v)=>{window.DEV.oneHit=v;}); y+=24+GAP;
        tog(CX[0],y,CW,'SHOW HITBOXES','#ff8800',()=>window.DEV.showHitboxes,(v)=>{window.DEV.showHitboxes=v;}); y+=24+GAP;
        tog(CX[0],y,CW,'SHOW LABELS','#ffdd00',()=>window.DEV.showLabels,(v)=>{window.DEV.showLabels=v;}); y+=24+GAP;
        tog(CX[0],y,CW,'SHOW FPS','#00aaff',()=>window.DEV.showFPS,(v)=>{window.DEV.showFPS=v;}); y+=24+GAP;
        tog(CX[0],y,CW,'NO PARTICLES','#aa00ff',()=>window.DEV.noParticles,(v)=>{window.DEV.noParticles=v;}); y+=24+GAP;
        y+=8;
        secHdr(CX[0],y,CW,'// CLOSE'); y+=24;
        btn(CX[0],y,CW,'EXIT DEV CONSOLE','#ff4444',()=>this._closeDevOverlay()); y+=24+GAP;
      }
    };
    buildContent();

    // close fn
    this._closeDevOverlay=()=>{
      clearContent();
      objs.forEach(o=>{try{o.destroy();}catch{}});
      this._devOpen=false;
      this._devLogObjs=null;
      this.paused=false;
      this.invincT=Math.max(this.invincT||0,1.5);
      if(this.input&&this.input.keyboard){
        this.input.keyboard.removeListener('keydown-BACKTICK',this._closeDevOverlay);
      }
    };
    this.input&&this.input.keyboard&&this.input.keyboard.once('keydown-BACKTICK',this._closeDevOverlay);
  }

  _devLog(msg,col){
    try{
      this._devLogHistory=this._devLogHistory||[];
      const ts=new Date().toTimeString().slice(0,8);
      this._devLogHistory.unshift({line:`[${ts}] ${msg}`,col:col||'#00cc44'});
      this._devLogHistory=this._devLogHistory.slice(0,4);
      this._refreshDevLog();
    }catch{}
  }

  _refreshDevLog(){
    try{
      if(!this._devLogObjs)return;
      this._devLogObjs.forEach((t,i)=>{
        const e=this._devLogHistory&&this._devLogHistory[i];
        t.setText(e?e.line:'').setColor(e?e.col:'#00cc44');
      });
    }catch{}
  }

    _openStats(){
    if(this._statsOpen)return;
    this._statsOpen=true;
    // Pause the loop but DON'T call _drawPauseOverlay
    this.paused=true;
    const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";
    const objs=[], D=90;
    const add=o=>{objs.push(o);return o;};

    const UPG_META={
      bubble_size:   {name:'RADIUS_EXPAND',   col:'#00aaff',icon:'○'},
      bubble_speed:  {name:'EXPANSION_RATE',  col:'#00ff88',icon:'⟳'},
      reflect_speed: {name:'REFLECT_BOOST',   col:'#ff00ff',icon:'↯'},
      shield:        {name:'SHIELD_LAYER',    col:'#ffdd00',icon:'◈'},
      magnet:        {name:'SIGNAL_PULL',     col:'#00ffff',icon:'⊕'},
      multishot:     {name:'ECHO_BURST',      col:'#ff6688',icon:'✦'},
      slow:          {name:'DECAY_FIELD',     col:'#aa00ff',icon:'≋'},
      score_boost:   {name:'DATA_HARVEST',    col:'#ffaa00',icon:'▲'},
      signal_fork:   {name:'SIGNAL_FORK',     col:'#00ffcc',icon:'⋔'},
      packet_cache:  {name:'PACKET_CACHE',    col:'#66cc88',icon:'▣'},
      null_shield:   {name:'NULL_SHIELD',     col:'#aaffdd',icon:'◯'},
      echo_protocol: {name:'ECHO_PROTOCOL',   col:'#ff88ff',icon:'↩'},
      corrupt_data:  {name:'CORRUPT_DATA',    col:'#ff4444',icon:'⚡'},
      ghost_trace:   {name:'GHOST_TRACE',     col:'#aaaaff',icon:'~'},
      overclock_burst:{name:'OVERCLOCK_BURST',col:'#ff8800',icon:'⚙'},
      signal_decay:  {name:'SIGNAL_DECAY',    col:'#884400',icon:'↓'},
      firewall_breach:{name:'FIREWALL_BREACH',col:'#ff2244',icon:'⊞'},
      chain_amplifier:{name:'CHAIN_AMP',      col:'#ffdd44',icon:'∞'},
    };

    // ── Full dark overlay ──
    add(this.add.rectangle(W/2,H/2,W,H,0x000000,0.93).setDepth(D));
    // Subtle scanlines
    for(let sy=0;sy<H;sy+=4)add(this.add.rectangle(W/2,sy,W,1,0x000000,0.18).setDepth(D));

    // ── Header strip ──
    add(this.add.rectangle(W/2,0,W,46,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W/2,46,W,1.5,0x00ff66,0.5).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.text(W/2,14,'PROCESS SUSPENDED',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#00ff66',letterSpacing:5}).setOrigin(0.5,0).setDepth(D+2));
    const pid='0x'+Math.floor(this.wave*0x3F+0xAA).toString(16).toUpperCase().padStart(4,'0');
    add(this.add.text(W/2,32,`PID ${pid}  ·  SIGNAL ${Math.floor(this.score).toLocaleString()}  ·  WAVE ${this.wave}  ·  UPTIME ${Math.floor(this.t)}s`,{fontFamily:mono,fontSize:'9px',color:'#224433'}).setOrigin(0.5,0).setDepth(D+2));

    // ── BOTTOM command strip ──
    const STRIP_H=60, STRIP_Y=H-STRIP_H;
    add(this.add.rectangle(W/2,STRIP_Y,W,STRIP_H,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1));
    add(this.add.rectangle(W/2,STRIP_Y,W,1.5,0x1a3322,1).setOrigin(0.5,0).setDepth(D+1));

    const cmds=[
      {l:'RESUME_EXECUTION', sub:'continue run',      c:'#00ff66', cN:0x00ff66, cb:()=>close()},
      {l:'SYS_CONFIG',       sub:'settings',           c:'#aa44ff', cN:0xaa44ff, cb:()=>{close(false);this.scene.pause();this.scene.launch('SettingsScene',{from:'pause'});}},
      {l:'TERMINATE_PROCESS',sub:'return to shell',    c:'#ff4444', cN:0xff4444, cb:()=>{close(false);this._showTerminating(()=>this._goToMenu());}},
    ];
    const BW=(W-20)/3, BX=10;
    cmds.forEach((cmd,i)=>{
      const cx=BX+i*(BW+5)+BW/2;
      const bg=add(this.add.rectangle(cx,STRIP_Y+STRIP_H/2,BW,STRIP_H-10,cmd.cN,0.08).setDepth(D+2).setInteractive({useHandCursor:true}));
      add(this.add.rectangle(cx-BW/2,STRIP_Y+5,3,STRIP_H-10,cmd.cN,0.7).setOrigin(0,0).setDepth(D+2));
      const lt=add(this.add.text(cx-BW/2+12,STRIP_Y+14,cmd.l,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:cmd.c}).setDepth(D+3));
      add(this.add.text(cx-BW/2+12,STRIP_Y+32,cmd.sub,{fontFamily:mono,fontSize:'9px',color:'#336644'}).setDepth(D+3));
      bg.on('pointerover',()=>{bg.setFillStyle(cmd.cN,0.18);lt.setColor('#ffffff');});
      bg.on('pointerout', ()=>{bg.setFillStyle(cmd.cN,0.08);lt.setColor(cmd.c);});
      bg.on('pointerdown',()=>cmd.cb());
    });
    add(this.add.text(W/2,STRIP_Y-10,'[ TAB — RESUME ]',{fontFamily:mono,fontSize:'9px',color:'#224433'}).setOrigin(0.5,1).setDepth(D+2));

    // ── MAIN AREA: left col upgrades+relics, right col stats+synergies ──
    const MAIN_Y=54, MAIN_H=STRIP_Y-MAIN_Y-12;
    const LW=W/2-10, RX=W/2+10;

    // ── LEFT: Upgrades ──
    add(this.add.text(20,MAIN_Y+6,'// INSTALLED_MODULES',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2}).setDepth(D+2));
    const activeUpgs=Object.entries(this.upg||{}).filter(([k,v])=>v>0);
    let uy=MAIN_Y+22;
    if(activeUpgs.length===0){
      add(this.add.text(20,uy,'NO MODULES INSTALLED',{fontFamily:mono,fontSize:'11px',color:'#224433'}).setDepth(D+2));
      uy+=24;
    } else {
      const rowH=Math.min(32, Math.floor((MAIN_H*0.55)/Math.max(activeUpgs.length,1)));
      activeUpgs.forEach(([id,tier])=>{
        const meta=UPG_META[id];if(!meta)return;
        const col=parseInt(meta.col.replace('#',''),16);
        add(this.add.rectangle(20,uy,LW-20,rowH,col,0.08).setOrigin(0,0).setDepth(D+1));
        add(this.add.rectangle(20,uy,3,rowH,col,0.7).setOrigin(0,0).setDepth(D+1));
        add(this.add.text(28,uy+rowH/2-7,meta.icon,{fontFamily:mono,fontSize:'13px',color:meta.col}).setDepth(D+2));
        add(this.add.text(48,uy+rowH/2-7,meta.name,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:meta.col}).setDepth(D+2));
        for(let t=0;t<4;t++){
          const px=LW-120+t*20, filled=t<tier;
          add(this.add.rectangle(px,uy+rowH/2-4,15,9,filled?col:0x0a1a0d,filled?0.7:0.8).setOrigin(0,0).setDepth(D+2));
          if(filled)add(this.add.rectangle(px,uy+rowH/2-4,15,9).setStrokeStyle(0.5,col,0.4).setOrigin(0,0).setDepth(D+2));
        }
        add(this.add.text(LW-35,uy+rowH/2,`T${tier}`,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:meta.col}).setOrigin(0,0.5).setDepth(D+2));
        uy+=rowH+2;
      });
    }

    // Relics
    if((this.bossRelics||[]).length>0){
      uy+=4;
      add(this.add.rectangle(20,uy,LW-20,1,0x00ccff,0.2).setOrigin(0,0).setDepth(D+1));uy+=8;
      add(this.add.text(20,uy,'// BOSS_RELICS',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2}).setDepth(D+2));uy+=14;
      this.bossRelics.forEach(r=>{
        const col=r.col||0x00ffcc, colS='#'+col.toString(16).padStart(6,'0');
        add(this.add.rectangle(20,uy,LW-20,30,col,0.10).setOrigin(0,0).setDepth(D+1));
        add(this.add.rectangle(20,uy,3,30,col,0.8).setOrigin(0,0).setDepth(D+1));
        add(this.add.text(28,uy+4,r.icon||'◆',{fontFamily:mono,fontSize:'13px',color:colS}).setDepth(D+2));
        add(this.add.text(48,uy+4,r.name,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:colS}).setDepth(D+2));
        add(this.add.text(48,uy+18,r.desc||'',{fontFamily:mono,fontSize:'8px',color:'#446655'}).setDepth(D+2));
        uy+=34;
      });
    }

    // ── RIGHT: Stats + synergies + modifier ──
    let ry=MAIN_Y+6;
    add(this.add.text(RX,ry,'// RUN_STATS',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2}).setDepth(D+2));ry+=16;
    const stats=[
      ['BEST CHAIN',    `×${this.bestChain||0}`,                                   '#ffdd00'],
      ['BEST COMBO',    `×${this._maxCombo||0}`,                                   '#ff9900'],
      ['TOTAL REFLECTS',String(this._totalReflects||0),                            '#00ffcc'],
      ['SHARDS THIS RUN',`${this.shards||0} ◈`,                                    '#ff9944'],
      ['ACTIVE POWER',  (Save.get('equipped_power','ping')||'ping').toUpperCase().replace(/_/g,' '),'#aaffdd'],
      ['ARCHETYPE',     (this._archetype||'—').toUpperCase(),                      '#00ff88'],
      ['SKIN',          (this.activeSkin||'RANGER').toUpperCase(),                 '#00ff66'],
    ];
    stats.forEach(([label,val,col])=>{
      add(this.add.text(RX,ry,label,{fontFamily:mono,fontSize:'9px',color:'#445544'}).setDepth(D+2));
      add(this.add.text(RX+180,ry,val,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:col}).setOrigin(0,0).setDepth(D+2));
      ry+=20;
    });

    // ── Skin passive row ──
    {
      const skinDefs={
        ranger: {name:'ADAPTIVE_ROUTING', col:'#00cc66',
          state:()=>`+${Math.round((this.rangerSpeedBonus||0)*100)}% BUBBLE SPD  (resets on death)`},
        phantom:{name:'PHASE_SHIFT',      col:'#cc88ff',
          state:()=>`DASH → DECOY FOR 2s  ${(this.phantomDecoys&&this.phantomDecoys.length)?'[ACTIVE]':''}`},
        inferno:{name:'OVERCLOCK_IMMUNITY',col:'#ff6600',
          state:()=>this.rageActive?`RAGE ACTIVE — REFLECT ×3  ${this.rageT?this.rageT.toFixed(1)+'s':''}`:
            `RAGE: ${Math.round(this.rageMeter||0)}/100  (heat→rage, ×3 at max)`},
        core:   {name:'REINFORCED_PACKET',col:'#ffd700',
          state:()=>this.shieldActive?`SHIELD: ${this.shieldHits} HIT${this.shieldHits!==1?'S':''} REMAINING`:
            this.shieldRegenT>0?`REGEN IN ${this.shieldRegenT.toFixed(1)}s`:'SHIELD DOWN'},
        ghost:  {name:'SIGNAL_ECHO',      col:'#ddddff',
          state:()=>`ECHO BULLET 0.4s AFTER EACH REFLECT`},
        virus:  {name:'INFECTION_SPREAD', col:'#44ff66',
          state:()=>`CORRUPT DEATH → NEARBY PULSE`},
      };
      const sid=this.activeSkin||'ranger';
      const sd=skinDefs[sid];
      if(sd){
        ry+=4;
        const colN=parseInt(sd.col.replace('#',''),16);
        add(this.add.rectangle(RX,ry,W/2-20,32,colN,0.10).setOrigin(0,0).setDepth(D+1));
        add(this.add.rectangle(RX,ry,3,32,colN,0.8).setOrigin(0,0).setDepth(D+1));
        add(this.add.text(RX+10,ry+4,`▸ ${sd.name}`,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:sd.col}).setDepth(D+2));
        add(this.add.text(RX+10,ry+18,sd.state(),{fontFamily:mono,fontSize:'9px',color:'#556644'}).setDepth(D+2));
        ry+=36;
      }
    }

    // Synergies
    ry+=6;
    add(this.add.rectangle(RX,ry,W/2-20,1,0xffd700,0.2).setOrigin(0,0).setDepth(D+1));ry+=10;
    add(this.add.text(RX,ry,'// SYNERGIES',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2}).setDepth(D+2));ry+=14;
    const syns=this.synergies||[];
    if(syns.length===0){
      add(this.add.text(RX,ry,'NONE ACTIVE',{fontFamily:mono,fontSize:'11px',color:'#224433'}).setDepth(D+2));ry+=18;
    } else {
      syns.forEach(s=>{
        add(this.add.rectangle(RX,ry,W/2-20,22,0xffd700,0.08).setOrigin(0,0).setDepth(D+1));
        add(this.add.rectangle(RX,ry,3,22,0xffd700,0.7).setOrigin(0,0).setDepth(D+1));
        add(this.add.text(RX+10,ry+3,'⚡ '+s,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ffd700'}).setDepth(D+2));
        ry+=26;
      });
    }

    // Modifier
    if(this.waveModifier&&this.waveModifier!=='NONE'){
      ry+=4;
      const MC={FAST:'#ff8800',DENSE:'#ff4400',ARMORED:'#ff2244',VOLATILE:'#aa44ff',DARK:'#4488ff',OVERLOAD:'#ffdd44',FRAGILE:'#ff88aa',MINIBOSS:'#ffaa00',ENCORE:'#00ffcc',SURGE:'#ff44ff',BOUNTY:'#44ffaa',FRACTURED:'#ffaa44'};
      const HL={FAST:'OVERCLOCK',DENSE:'FLOOD',ARMORED:'HARDENED',VOLATILE:'UNSTABLE',DARK:'BLACKOUT',OVERLOAD:'OVERLOAD',FRAGILE:'FRAGMENTED',MINIBOSS:'ELITE_PROC',ENCORE:'ENCORE',SURGE:'DATA_SURGE',BOUNTY:'BOUNTY_WAVE',FRACTURED:'PROCESS_FRACTURE'};
      const mc=MC[this.waveModifier]||'#ff4444', mcN=parseInt(mc.replace('#',''),16);
      add(this.add.rectangle(RX,ry,W/2-20,26,mcN,0.10).setOrigin(0,0).setDepth(D+1));
      add(this.add.rectangle(RX,ry,3,26,mcN,0.8).setOrigin(0,0).setDepth(D+1));
      add(this.add.text(RX+10,ry+5,'◈ MOD: '+(HL[this.waveModifier]||this.waveModifier),{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:mc}).setDepth(D+2));
      ry+=30;
    }

    // Active run mutations
    if(this._runMutations&&this._runMutations.length>0){
      ry+=4;
      add(this.add.rectangle(RX,ry,W/2-20,1,0xff6600,0.2).setOrigin(0,0).setDepth(D+1));ry+=10;
      add(this.add.text(RX,ry,'// ACTIVE_MUTATIONS',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2}).setDepth(D+2));ry+=14;
      this._runMutations.forEach(mut=>{
        const colS='#'+mut.col.toString(16).padStart(6,'0');
        add(this.add.rectangle(RX,ry,W/2-20,30,mut.col,0.10).setOrigin(0,0).setDepth(D+1));
        add(this.add.rectangle(RX,ry,3,30,mut.col,0.8).setOrigin(0,0).setDepth(D+1));
        add(this.add.text(RX+10,ry+4,`⬡ ${mut.label}`,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:colS}).setDepth(D+2));
        add(this.add.text(RX+10,ry+18,mut.desc,{fontFamily:mono,fontSize:'9px',color:'#446655'}).setDepth(D+2));
        ry+=34;
      });
    }

    // Vertical divider between left and right
    add(this.add.rectangle(W/2,MAIN_Y+MAIN_H/2,1,MAIN_H,0x1a3322,0.8).setDepth(D+1));

    const close=(resume=true)=>{
      objs.forEach(o=>{try{o.destroy();}catch{}});
      this._statsOpen=false;
      this.paused=false;
      if(resume)this.invincT=Math.max(this.invincT||0,1.5);
      this.input.keyboard&&this.input.keyboard.removeListener('keydown-TAB',tabClose);
    };
    const tabClose=(e)=>{try{e.preventDefault();}catch{}close();};
    this.input.keyboard&&this.input.keyboard.once('keydown-TAB',tabClose);
  }

    _spawnBossRelic(boss){
    const RELICS={
      'FIREWALL':   {id:'PACKET_WALL',   name:'PACKET_WALL',   col:0xff4400, icon:'▦', desc:'Every 8 reflects fires a perpendicular wall of bullets'},
      'FIREWALL_II':{id:'PACKET_WALL',   name:'PACKET_WALL',   col:0xff4400, icon:'▦', desc:'Every 8 reflects fires a perpendicular wall of bullets'},
      'VOID.NODE':  {id:'GRAVITY_ECHO',  name:'GRAVITY_ECHO',  col:0xaa44ff, icon:'◎', desc:'Reflected bullets curve toward nearby enemies'},
      'VOID.NODE_II':{id:'GRAVITY_ECHO', name:'GRAVITY_ECHO',  col:0xaa44ff, icon:'◎', desc:'Reflected bullets curve toward nearby enemies'},
      'GHOST.EXE':  {id:'PHASE_CLONE',   name:'PHASE_CLONE',   col:0xddddff, icon:'⬡', desc:'Dashing releases a burst of 8 bullets from your origin'},
      'GHOST.EXE_II':{id:'PHASE_CLONE',  name:'PHASE_CLONE',   col:0xddddff, icon:'⬡', desc:'Dashing releases a burst of 8 bullets from your origin'},
      'CORE.BREACH':{id:'BREACH_PULSE',  name:'BREACH_PULSE',  col:0xffd700, icon:'✦', desc:'Overheat releases a ring of 12 bullets outward'},
      'CORE.BREACH_II':{id:'BREACH_PULSE',name:'BREACH_PULSE', col:0xffd700, icon:'✦', desc:'Overheat releases a ring of 12 bullets outward'},
    };
    const relic=RELICS[boss.baseName||boss.name];
    if(!relic)return;
    // Don't give duplicate relics
    if(this.bossRelics.find(r=>r.id===relic.id))return;
    // Spawn pickup at boss position
    const pickup={
      x:boss.x, y:boss.y,
      ...relic,
      life:12, // auto-despawn after 12s
      pulse:0,
    };
    if(!this._relicPickups)this._relicPickups=[];
    this._relicPickups.push(pickup);
    this.banner&&this.banner.show(`RELIC_DROP: ${relic.name}`,
      '#'+relic.col.toString(16).padStart(6,'0'),2500,relic.desc);
  }

  _showRelicChoice(boss){
    // #12 Boss relic choice — show 2 relics, player picks one
    try{
      const ALL_RELICS=[
        {id:'PACKET_WALL',  name:'PACKET_WALL',  col:0xff4400, icon:'▦', desc:'Every 8 reflects fires a\nperpendicular bullet wall'},
        {id:'GRAVITY_ECHO', name:'GRAVITY_ECHO', col:0xaa44ff, icon:'◎', desc:'Reflected bullets curve\ntoward nearby enemies'},
        {id:'PHASE_CLONE',  name:'PHASE_CLONE',  col:0xddddff, icon:'⬡', desc:'Dashing releases a burst\nof 8 bullets from origin'},
        {id:'BREACH_PULSE', name:'BREACH_PULSE', col:0xffd700, icon:'✦', desc:'Overheat releases a ring\nof 12 bullets outward'},
      ];
      const BOSS_RELIC_MAP={
        'FIREWALL':'PACKET_WALL','FIREWALL_II':'PACKET_WALL',
        'VOID.NODE':'GRAVITY_ECHO','VOID.NODE_II':'GRAVITY_ECHO',
        'GHOST.EXE':'PHASE_CLONE','GHOST.EXE_II':'PHASE_CLONE',
        'CORE.BREACH':'BREACH_PULSE','CORE.BREACH_II':'BREACH_PULSE',
      };
      const mainId=BOSS_RELIC_MAP[boss.baseName||boss.name];
      const mainRelic=ALL_RELICS.find(r=>r.id===mainId);
      if(!mainRelic)return this._spawnBossRelic(boss);
      // Already owns it → fall back to single spawn
      if(this.bossRelics.find(r=>r.id===mainRelic.id))return this._spawnBossRelic(boss);
      // Pick a random second relic the player doesn't own
      const others=ALL_RELICS.filter(r=>r.id!==mainRelic.id&&!this.bossRelics.find(b=>b.id===r.id));
      if(others.length===0)return this._spawnBossRelic(boss);
      const altRelic=others[Math.floor(Math.random()*others.length)];
      const relics=[mainRelic,altRelic];

      const mono="'Courier New',monospace";
      const orb="'Orbitron',sans-serif";
      const objs=[];
      const add=o=>{objs.push(o);return o;};
      const D=70;

      // Block the wave-clear → OverclockScene launch until the player chooses
      this._relicChoicePending=true;

      // Dim overlay
      add(this.add.rectangle(W/2,H/2,W,H,0x000000,0.65).setDepth(D).setInteractive());
      add(this.add.text(W/2,H/2-160,'SELECT RELIC',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#ffd700',letterSpacing:6}).setOrigin(0.5).setDepth(D+1));
      add(this.add.text(W/2,H/2-138,'Choose one — the other is lost',{fontFamily:mono,fontSize:'9px',color:'#336644'}).setOrigin(0.5).setDepth(D+1));

      const CW=220,CH=180,gap=40;
      relics.forEach((r,i)=>{
        const cx=W/2+(i===0?-1:1)*(CW/2+gap/2);
        const cy=H/2-20;
        const rcol=r.col;
        const card=add(this.add.rectangle(cx,cy,CW,CH,0x000000,0.95).setDepth(D+2).setInteractive({useHandCursor:true}));
        card.setStrokeStyle(1.5,rcol,0.7);
        add(this.add.rectangle(cx,cy-CH/2,CW,5,rcol,1).setOrigin(0.5,0).setDepth(D+3));
        add(this.add.text(cx,cy-50,r.icon,{fontFamily:mono,fontSize:'36px',color:'#'+rcol.toString(16).padStart(6,'0')}).setOrigin(0.5).setDepth(D+3));
        add(this.add.text(cx,cy+5,r.name,{fontFamily:orb,fontSize:'13px',fontStyle:'900',color:'#'+rcol.toString(16).padStart(6,'0'),align:'center',wordWrap:{width:CW-20}}).setOrigin(0.5).setDepth(D+3));
        add(this.add.text(cx,cy+38,r.desc,{fontFamily:mono,fontSize:'9px',color:'#44aa66',align:'center',wordWrap:{width:CW-20},lineSpacing:3}).setOrigin(0.5).setDepth(D+3));

        const claim=()=>{
          objs.forEach(o=>{try{o.destroy();}catch{}});
          this.bossRelics.push({...r});
          this.banner&&this.banner.show(`RELIC_ACQUIRED: ${r.name}`,'#'+(r.col).toString(16).padStart(6,'0'),2500,r.desc.replace('\n',' '));
          this._spawnShockRing(boss.x,boss.y,r.col,120);
          Snd.play('powerup');
          this._relicChoicePending=false;
        };
        card.on('pointerover',()=>card.setFillStyle(rcol,0.12));
        card.on('pointerout', ()=>card.setFillStyle(0x000000,0.95));
        card.on('pointerdown',claim);
      });
    }catch(err){console.error('[RELIC_CHOICE]',err);this._spawnBossRelic(boss);}
  }

  _shoot(ex,ey,tx,ty,spd=260,col=0xff3232,isDefected=false,etype=''){
    // Ensure bullets always outpace enemies — floor well above enemy speed cap
    const diffSpeedMult=(this.diff||DIFFICULTY.daemon).enemySpeedMult;
    const _capRef=(window.DEV&&typeof window.DEV.enemySpeedCap==='number')?window.DEV.enemySpeedCap:200;
    const enemyMaxSpd=Math.max(220, _capRef)*diffSpeedMult;
    spd=Math.max(spd,enemyMaxSpd+220); // +220 buffer — bullets are ~2x enemy speed

    // Aim-lead: predict where the player will be when bullet arrives
    const _isAimAtPlayer=Math.abs(tx-this.px)<1&&Math.abs(ty-this.py)<1;
    if(_isAimAtPlayer){
      const _bulletTravelTime=Math.hypot(tx-ex,ty-ey)/spd;
      const _lead=0.6; // 60% lead — uses smoothed velocity so direction-changes don't whip the aim
      const _vx=(this.playerVxSmooth!=null)?this.playerVxSmooth:(this.playerVx||0);
      const _vy=(this.playerVySmooth!=null)?this.playerVySmooth:(this.playerVy||0);
      tx=tx+_vx*_bulletTravelTime*_lead;
      ty=ty+_vy*_bulletTravelTime*_lead;
    }

    // Bullet soft cap — at high enemy density the per-frame O(bullets*enemies)
    // collision loop is the dominant perf cost. Drop new enemy bullets (not
    // reflected ones) when over the cap.
    if(this.bullets.length>=320)return;
    const a=Math.atan2(ty-ey,tx-ex);
    this.bullets.push({x:ex,y:ey,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,col,reflected:false,size:5,trail:[],etype});
  }

  _spawnParticles(x,y,col,n=8){
    this._pushGrid(x,y,35);
    for(let i=0;i<n;i++){const a=Math.PI*2*Math.random(),spd=50+Math.random()*150;this.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:0.55+Math.random()*0.9,col,size:1.5+Math.random()*3.5});}
  }

  // ─── POWER ACTIVATION FX ─────────────────────────────────────────────
  // Each power gets a signature visual. Called from _activatePing and from
  // the top of every _triggerShopPower switch case via _playPowerFX.

  _playPowerFX(power){
    switch(power){
      case 'ping':            this._fxPing(); break;
      case 'emp_burst':       this._fxEmpBurst(); break;
      case 'null_zone':       this._fxNullZone(); break;
      case 'overclock_surge': this._fxOverclockSurge(); break;
      case 'chain_trigger':   this._fxChainTrigger(); break;
      case 'ghost_step':      this._fxGhostStep(); break;
      case 'corrupt_wave':    this._fxCorruptWave(); break;
      case 'system_restore':  this._fxSystemRestore(); break;
      case 'decoy_packet':    this._fxDecoyPacket(); break;
    }
  }

  _fxPing(){
    // Sonar — cyan radial particle burst + 1 large ring, no slowmo
    const px=this.px, py=this.py;
    for(let i=0;i<24;i++){
      const a=(Math.PI*2/24)*i + Math.random()*0.15;
      const spd=180+Math.random()*60;
      this.particles.push({x:px,y:py,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:1.6,col:0x00ffff,size:2+Math.random()*2});
    }
    this._spawnShockRing(px,py,0x00ffff, W*0.8);
    CRT.glitch(0.10);
    try { Snd.play('powerup'); } catch {}
  }

  _fxEmpBurst(){
    const px=this.px, py=this.py;
    this._spawnParticles(px,py,0xffffff,28);
    this._spawnParticles(px,py,0xaaccff,18);
    this._spawnShockRing(px,py,0xffffff, W*0.7);
    this._spawnShockRing(px,py,0xaaccff, W*0.4);
    // 8 lightning bolts radiating outward
    const NUM=8, LEN=300;
    for(let i=0;i<NUM;i++){
      const ang=(Math.PI*2/NUM)*i + Math.random()*0.2;
      this._lightningBolts.push({
        x0:px,y0:py,x1:px+Math.cos(ang)*LEN,y1:py+Math.sin(ang)*LEN,
        jitter:20, life:0.35, t:0, col:0xffffff,
      });
    }
    try{ this.cameras.main.flash(180,255,255,255,true); }catch{}
    CRT.glitch(0.3);
    this._hitStop(50,'#ffffff');
    this._powerSlowT = 0.18;
    try { Snd.play('emp'); } catch {}
  }

  _fxNullZone(){
    // Void implosion at cursor / deploy point — fall back to player if cursor unknown
    const ax = (this.tx != null) ? this.tx : this.px;
    const ay = (this.ty != null) ? this.ty : this.py;
    // Inward spiral particles toward (ax, ay), spawned at ring around it
    for(let i=0;i<30;i++){
      const a=(Math.PI*2/30)*i;
      const r=80+Math.random()*40;
      const sx=ax+Math.cos(a)*r, sy=ay+Math.sin(a)*r;
      const spd=160+Math.random()*40;
      this.particles.push({x:sx,y:sy,vx:Math.cos(a+Math.PI)*spd,vy:Math.sin(a+Math.PI)*spd,life:1,decay:1.4,col:0xaa00ff,size:2+Math.random()*2});
    }
    // Outward small puff at center
    for(let i=0;i<15;i++){
      const a=Math.PI*2*Math.random(), spd=60+Math.random()*80;
      this.particles.push({x:ax,y:ay,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:1.0,col:0x6600cc,size:1.5+Math.random()*2});
    }
    this._spawnShockRing(ax,ay,0xaa00ff, 220);
    try { Snd.play('void'); } catch {}
  }

  _fxOverclockSurge(){
    const px=this.px, py=this.py;
    this._spawnParticles(px,py,0xffd700,30);
    this._spawnParticles(px,py,0xff8800,20);
    this._spawnShockRing(px,py,0xffd700, W*0.5);
    this._spawnShockRing(px,py,0xff8800, W*0.35);
    this._spawnShockRing(px,py,0xffaa00, W*0.2);
    // 1-second orbiting spark trail
    this._overclockSparks = { t: 0, dur: 1.0 };
    try{ this.cameras.main.flash(120,255,200,80,true); }catch{}
    CRT.glitch(0.25);
    this._hitStop(60,'#ffaa00');
    this._powerSlowT = 0.20;
    try { Snd.play('surge'); } catch {}
  }

  _fxChainTrigger(){
    const px=this.px, py=this.py;
    this._spawnParticles(px,py,0xff8800,28);
    this._spawnParticles(px,py,0xffdd00,18);
    // Lightning bolts to the 6 nearest enemies (or random angles if none)
    const candidates = (this.enemies || []).slice().sort((a,b)=>{
      const da=(a.x-px)*(a.x-px)+(a.y-py)*(a.y-py);
      const db=(b.x-px)*(b.x-px)+(b.y-py)*(b.y-py);
      return da-db;
    }).slice(0,6);
    if(candidates.length === 0){
      for(let i=0;i<6;i++){
        const a=Math.PI*2*Math.random();
        this._lightningBolts.push({x0:px,y0:py,x1:px+Math.cos(a)*220,y1:py+Math.sin(a)*220,jitter:14,life:0.30,t:0,col:0xff8800});
      }
    } else {
      for(const e of candidates){
        this._lightningBolts.push({x0:px,y0:py,x1:e.x,y1:e.y,jitter:14,life:0.30,t:0,col:0xff8800});
      }
    }
    try{ this.cameras.main.flash(150,255,140,40,true); }catch{}
    CRT.glitch(0.22);
    this._hitStop(80,'#ff8800');
    this._powerSlowT = 0.15;
    try { Snd.play('chain'); } catch {}
  }

  _fxGhostStep(){
    const px=this.px, py=this.py;
    // Streak particles trailing behind the player's velocity, fading violet→cyan
    const vx = (this.tx != null) ? (this.tx - px) : 0;
    const vy = (this.ty != null) ? (this.ty - py) : 0;
    const mag = Math.hypot(vx,vy) || 1;
    const dx = vx/mag, dy = vy/mag;
    for(let i=0;i<30;i++){
      const off = (i/30)*40;
      const sx = px - dx*off + (Math.random()-0.5)*16;
      const sy = py - dy*off + (Math.random()-0.5)*16;
      const col = (i%2===0) ? 0x88ccff : 0xcc88ff;
      this.particles.push({x:sx,y:sy,vx:dx*-30+(Math.random()-0.5)*40,vy:dy*-30+(Math.random()-0.5)*40,life:1,decay:1.4,col,size:1.5+Math.random()*2});
    }
    this._spawnShockRing(px,py,0xcc88ff, W*0.25);
    try{ this.cameras.main.flash(80,150,200,255,true); }catch{}
    try { Snd.play('phase'); } catch {}
  }

  _fxCorruptWave(){
    const px=this.px, py=this.py;
    // Spiral pattern outward — angle increments with radius
    for(let i=0;i<60;i++){
      const t = i/60;
      const ang = t * Math.PI * 6;
      const spd = 80 + t*160;
      this.particles.push({x:px,y:py,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:1,decay:1.2,col:0x00ff66,size:1.5+Math.random()*2.5});
    }
    try{ this.cameras.main.flash(100,80,255,120,true); }catch{}
    CRT.glitch(0.2);
    this._hitStop(80,'#00ff66');
    this._powerSlowT = 0.18;
    try { Snd.play('corrupt'); } catch {}
  }

  _fxSystemRestore(){
    const px=this.px, py=this.py;
    // Rising particles from below player, cyan→green
    for(let i=0;i<35;i++){
      const sx = px + (Math.random()-0.5)*60;
      const sy = py + 20 + Math.random()*15;
      const col = (i%2===0) ? 0x66ffcc : 0x00ff88;
      this.particles.push({x:sx,y:sy,vx:(Math.random()-0.5)*20,vy:-(80+Math.random()*60),life:1,decay:1.0,col,size:1.8+Math.random()*2});
    }
    this._spawnShockRing(px,py,0x00ffcc, 240);
    this._spawnShockRing(px,py,0x66ff99, 180);
    this._spawnShockRing(px,py,0x00ff88, 120);
    try{ this.cameras.main.flash(200,80,255,180,true); }catch{}
    this._powerSlowT = 0.20;
    try { Snd.play('install'); } catch {}
  }

  _fxDecoyPacket(){
    const ax = (this.tx != null) ? this.tx : this.px;
    const ay = (this.ty != null) ? this.ty : this.py;
    this._spawnParticles(ax,ay,0xcc44ff,18);
    this._spawnParticles(ax,ay,0xff88ff,12);
    this._spawnShockRing(ax,ay,0xcc44ff, 200);
    this._decoyOutlines.push({x:ax, y:ay, w:36, h:36, life:0.6, t:0, col:0xcc44ff});
    CRT.glitch(0.35);
    try { Snd.play('decoy'); } catch {}
  }

  // Render helpers for the two custom FX types (lightning + decoy outlines).
  _renderLightningBolts(g){
    if(!this._lightningBolts || this._lightningBolts.length===0) return;
    for(const b of this._lightningBolts){
      const a = Math.max(0, 1 - (b.t / b.life));
      g.lineStyle(2, b.col, a);
      g.beginPath();
      const SEG = 8;
      for(let s=0;s<=SEG;s++){
        const t = s/SEG;
        const x = b.x0 + (b.x1 - b.x0) * t + (s>0&&s<SEG ? (Math.random()-0.5)*b.jitter : 0);
        const y = b.y0 + (b.y1 - b.y0) * t + (s>0&&s<SEG ? (Math.random()-0.5)*b.jitter : 0);
        if(s===0) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.strokePath();
    }
  }

  _renderDecoyOutlines(g){
    if(!this._decoyOutlines || this._decoyOutlines.length===0) return;
    for(const d of this._decoyOutlines){
      const prog = d.t / d.life;
      const a = Math.max(0, 1 - prog);
      const grow = prog * 14;
      g.lineStyle(1.5, d.col, a*0.85);
      g.strokeRect(d.x - d.w/2 - grow, d.y - d.h/2 - grow, d.w + grow*2, d.h + grow*2);
    }
  }

  _killEnemy(e,i,fromChain=false){
    this._spawnParticles(e.x,e.y,e.color,e.isBoss?26:6);
    // I1 — ASCII decompile death: a few falling monospace glyphs (non-boss only)
    if(!e.isBoss){
      const _glyphs='01<>{}/\\';
      const _n=3+Math.floor(Math.random()*3);
      const _col='#'+(e.color||0x00ff66).toString(16).padStart(6,'0');
      for(let _gi=0;_gi<_n;_gi++){
        const _ch=_glyphs[Math.floor(Math.random()*_glyphs.length)];
        const _ox=(Math.random()-0.5)*18, _oy=(Math.random()-0.5)*10;
        const _txt=this.add.text(e.x+_ox,e.y+_oy,_ch,{fontFamily:"'Courier New',monospace",fontSize:'11px',color:_col}).setOrigin(0.5).setDepth(11);
        const _dy=80+Math.random()*40;
        const _dur=400+Math.random()*200;
        this.tweens.add({targets:_txt,y:_txt.y+_dy,alpha:0,duration:_dur,ease:'Cubic.easeIn',onComplete:()=>_txt.destroy()});
      }
    }
    this._spawnDeathFragments(e);
    this._spawnShockRing(e.x,e.y,e.color,e.isBoss?200:100);
    const pid='0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
    this._sysLog(`[KILL] PROC ${pid} ${e.type.toUpperCase()} TERMINATED`);
    // Kill feed entry
    const typeTag=e.type.substring(0,4).toUpperCase();
    const mutTag=e._mut?`[${e._mut.substring(0,5).toUpperCase()}]`:'';
    const chainTag=fromChain?'×C':e.isBoss?'[BOSS]':e.elite?'[ELITE]':'';
    const feedCol=e.isBoss?'#ff2244':e.elite?'#ffdd00':fromChain?'#00ffcc':e._mut?('#'+(e._mutCol||0x005500).toString(16).padStart(6,'0')):'#005500';
    this._addKillFeed(`${pid} ${typeTag} ${chainTag}${mutTag}`.trim(),feedCol);
    // Mutation death effects
    // PHANTOM: spawn ghost copy on death
    if(e.type==='phantom'&&!e._isGhost){
      const ghost={
        x:e.x,y:e.y,hp:999,maxHp:999, // unkillable
        size:e.size,spd:0,color:e.color,
        sInt:1.4,sT:1.0,type:'phantom',
        isBoss:false,angle:e.angle,bootT:0,
        visible:true,revealed:true,
        _isGhost:true,_ghostLife:3,
        elite:false,
      };
      this.enemies.push(ghost);
      this._sysLog('[PHANTOM] GHOST_COPY SPAWNED — 3s');
    }
    if(Settings.get('shake'))this.cameras.main.shake(e.isBoss?320:60,e.isBoss?0.015:0.004);
    this._pushGrid(e.x,e.y,e.isBoss?90:28);
    const rageMult=this.rageActive&&this.activeSkin==='inferno'?2:1;
    const rogueMult=this._archetype==='rogue'?1.15:1;
    const bossTraceMult=(e.isBoss&&this._bossScoreMulti)?this._bossScoreMulti:1;
    const perfectReflectMult=(this._perfectReflectMeta&&this.t<(this._perfectReflectUntil||0))?2:1;
    const pts=Math.round((e.isBoss?12:1)*this.scoreMulti*(1+this.combo*0.1)*(fromChain?2:1)*(this.synergies.includes('OVERCLOCK')?1.5:1)*(this.surgeActive?1.5:1)*(this.overclocked?3:1)*rageMult*rogueMult*bossTraceMult*perfectReflectMult);
    const diffMult2=(this.diff||DIFFICULTY.daemon).scoreMulti;
    const overflowMult=this.stackOverflowT>0?2:1;
    this.score+=pts*diffMult2*overflowMult;
    const shardDrop=this.stackOverflowT>0?8:(e.isBoss?15:3);
    const overloadMult=this.waveModifier==='OVERLOAD'?2:1;
    const bountyMult=this.waveModifier==='BOUNTY'?2.5:1;
    const shardMult=Save.hasMeta('data_compress')?1.25:1;
    const _shardGain=Math.round(shardDrop*shardMult*overloadMult*bountyMult*(this._shardMulti||1));
    this.shards+=_shardGain;
    // SIDE_OBJ + HUD: batched +N flash via 0.5s accumulator (drops > 0 only)
    if(_shardGain>0) this._flashShardGain(_shardGain, false);
    if(e._killedByReflect&&this._perfectReflectMeta)this._perfectReflectUntil=this.t+2;
    // Fragment drops — persist to Save immediately
    if(e.isBoss){
      if((this.t-(this._bossStartT||0))<60)this._bossUnder60=true;
      Save.addFragments(2);Snd.play('fragment');
      Save.addStat('boss_kills');
      this.miniBanner&&this.miniBanner.show('FRAG +2 ◆','#aaffdd',1400);
      // SIGNAL_FORGE unlock — first CORE.BREACH kill
      if(e.baseName==='CORE.BREACH'&&!Save.get('forge_unlocked',false)){
        Save.set('forge_unlocked',true);
        this.time.delayedCall(1200,()=>{
          this.banner&&this.banner.show('SIGNAL_FORGE UNLOCKED','#cc44ff',2500,'configure in archetype select');
        });
      }
      // ASCENSION unlock — first CORE.BREACH kill at current level N unlocks N+1 (cap 25)
      if(e.baseName==='CORE.BREACH'){
        const curMax = Save.get('ascension_max', 0);
        const newMax = Math.max(curMax, (this._ascensionLevel || 0) + 1);
        if(newMax > curMax && newMax <= (typeof ASCENSION_MAX !== 'undefined' ? ASCENSION_MAX : 25)){
          Save.set('ascension_max', newMax);
          this.time.delayedCall(1800,()=>{
            this.banner&&this.banner.show(`ASCENSION ${newMax} UNLOCKED`,'#ffd700',2500,'select before next run');
          });
        }
        // Phase 2B MASTERY T5 gate: per-archetype CORE.BREACH-cleared flag
        if(this._archetype){
          Save.setMeta('arch_'+this._archetype+'_breached', true);
        }
      }
      // Drop boss relic — offer choice of 2
      this._showRelicChoice(e);
    }
    else if(e.elite&&Math.random()<0.5){Save.addFragments(1);Snd.play('fragment');}
    // SURGE modifier: every kill drops a fragment
    if(this.waveModifier==='SURGE'&&!e.isBoss){Save.addFragments(1);}
    // ROGUE archetype: every non-boss non-chain kill drops a fragment
    if(this._archetype==='rogue'&&!e.isBoss&&!fromChain){Save.addFragments(1);}
    // GHOST_PROTOCOL synergy: kills have 25% chance to restore 1 shield hit when shield is down
    if(this.synergies&&this.synergies.includes('GHOST_PROTOCOL')&&!this.shieldActive&&Math.random()<0.25){
      this._setShield(1);this._sysLog('[GHOST_PROTOCOL] SHIELD REGEN ON KILL');
    }
    this.combo+=this._feederWave?3:1;this.comboT=((Save.meta('slow_combo',false)||this._slowComboMeta)?4.2:3.0)+(this._comboTimerBonus||0);
    this.kills++;
    if(this._tutActive)this._tutHasKilled=true;
    this.totalKills++;
    // Stack overflow every 50 kills
    if(this.totalKills>=this.stackNextAt&&this.stackOverflowT<=0){
      this._triggerStackOverflow();
      this.stackNextAt+=50;
    }
    Snd.play(fromChain?'chain':'kill');
    // Boss lore + death cinematic
    if(e.isBoss){
      const li=LORE.findIndex(l=>l.boss===e.name);
      if(li>=0&&!this.loreUnlocked.includes(li)){this.loreUnlocked.push(li);Save.unlockLore(li);}
      // First-kill boss-family lore unlock
      const _bossKey=(e.baseName||e.name||'').split('.')[0].toUpperCase();
      if(_bossKey&&this._BOSS_LORE[_bossKey]!=null){
        const _loreFlagKey='boss_lore_'+_bossKey;
        if(!Save.meta(_loreFlagKey,false)){
          Save.setMeta(_loreFlagKey,true);
          Save.unlockLore(this._BOSS_LORE[_bossKey]);
          this.miniBanner&&this.miniBanner.show('LORE_FRAGMENT RECOVERED','#aaffdd',1500);
        }
      }
      // Boss death cinematic — extra shock rings, flash, and banner
      const bc=e.color;
      const bcS='#'+bc.toString(16).padStart(6,'0');
      for(let r=0;r<5;r++){
        this.time.delayedCall(r*100,()=>{
          if(this._dead)return;
          this._spawnShockRing(e.x,e.y,bc,100+r*90);
          if(r<3)this._spawnParticles(e.x,e.y,bc,14);
        });
      }
      if(Settings.get('shake')){this.cameras.main.flash(600,(bc>>16)&0xff,(bc>>8)&0xff,bc&0xff,0.35);this.cameras.main.shake(500,0.025);}
      this.time.delayedCall(400,()=>{
        if(this._dead)return;
        this.banner&&this.banner.show(`HOSTILE_NODE_DESTROYED: ${e.name}`,bcS,3500,li>=0?'LORE FRAGMENT RECOVERED':'PROCESS ELIMINATED');
      });
    }
    this.enemies.splice(i,1);
    // Per-type death VFX
    if(!e.isBoss){
      const ex=e.x,ey=e.y,ec=e.color;
      try{
        if(e.type==='sniper'){
          // Sniper: thin line shards radiating outward
          for(let li=0;li<6;li++){const a=(Math.PI/3)*li;this._spawnParticles(ex+Math.cos(a)*12,ey+Math.sin(a)*12,ec,2);}
          this._spawnShockRing(ex,ey,ec,30);
        } else if(e.type==='tank'){
          // Tank: big shockwave + heavy particle burst
          this._spawnShockRing(ex,ey,ec,70);this._spawnShockRing(ex,ey,ec,40);
          this._spawnParticles(ex,ey,ec,18);this._pushGrid(ex,ey,80);
        } else if(e.type==='swarm'){
          // Swarm: tiny tight fizzle
          this._spawnParticles(ex,ey,ec,4);
        } else if(e.type==='pulsar'){
          // Pulsar: expanding double ring
          this._spawnShockRing(ex,ey,ec,90);this._spawnShockRing(ex,ey,0xffffff,50);
          this._spawnParticles(ex,ey,ec,10);
        } else if(e.type==='phantom'){
          // Phantom: ghost echo dissolve
          this._spawnParticles(ex,ey,0xaaaaff,8);
          for(let pi=0;pi<4;pi++){this.time.delayedCall(pi*60,()=>{if(this._dead)return;this._spawnParticles(ex+(Math.random()-0.5)*30,ey+(Math.random()-0.5)*30,0x8888ff,3);});}
        } else if(e.type==='leech'){
          // Leech: sticky splatter cluster
          this._spawnParticles(ex,ey,ec,12);this._spawnParticles(ex,ey,0xaa4400,6);
        } else if(e.type==='drift_packet'){
          // Drift: clean data-burst pop
          this._spawnShockRing(ex,ey,ec,55);this._spawnParticles(ex,ey,ec,7);
        } else {
          // Default grunt
          this._spawnParticles(ex,ey,ec,8);
        }
      }catch(err){}
    }
    // Score pop — escalates with combo
    const popSize=this.combo>20?28:this.combo>10?22:this.combo>5?18:14;
    const popCol=this.combo>20?'#ffd700':this.combo>10?'#ff6600':this.combo>5?'#ffdd00':'#00f5ff';
    const popTxt=this.combo>5?`+${pts} ×${this.combo}`:`+${pts}`;
    const pop=this.add.text(e.x,e.y-20,popTxt,{fontFamily:'Orbitron',fontSize:`${popSize}px`,fontStyle:'700',color:popCol}).setOrigin(0.5).setDepth(15);
    // Big combos get a punch scale
    if(this.combo>5){
      pop.setScale(0.4);
      this.tweens.add({targets:pop,scaleX:1,scaleY:1,duration:120,ease:'Back.Out'});
    }
    const floatDist=this.combo>10?90:60;
    this.tweens.add({targets:pop,y:e.y-floatDist,alpha:0,duration:this.combo>10?900:680,onComplete:()=>pop.destroy()});
    if(!e.isBoss&&Math.random()<0.2)this.powerups.push({x:e.x,y:e.y,type:Math.random()<0.5?'shield':'slow',life:8,col:Math.random()<0.5?0xffdd00:0xaa00ff});
    // VIRUS passive: any kill pulses corruption to nearby
    if(this.activeSkin==='virus'){
      this.enemies.forEach(nearby=>{
        if(nearby===e||nearby.defected||nearby.isBoss)return;
        if(Math.hypot(nearby.x-e.x,nearby.y-e.y)<120){
          if(!nearby.corruptions)nearby.corruptions=0;
          nearby.corruptions++;
          this._spawnParticles(nearby.x,nearby.y,0x00ff44,4);
        }
      });
    }
    // CORE regen timer created in _startWave
    if(this._sandbox)this._refreshSandboxBtns();
  }

  _setShield(hits){
    this.shieldHits=hits;
    this.shieldMaxHits=hits;
    this.shieldActive=hits>0;
    this._sysLog(`[SHIELD] FIREWALL ACTIVE — ${hits} HIT CAPACITY`);
  }

  _hitShield(){
    if(this._sandbox)return; // sandbox: ignore shield damage so glitch-split/feedback don't fire
    // Called when a hit lands on active shield
    this._usedShield=true;
    if(this.wave===3)this._perfectWave3=false;
    if(this.bossWave===true)this._bossNoDamage=false;
    this._dmgFlashT=0.12;
    this.shieldHits=Math.max(this.synergies&&this.synergies.includes('REDUNDANT_CORE')?1:0,this.shieldHits-1);
    this.shieldActive=this.shieldHits>0;
    this.invincT=0.4;
    this.glitchSplit=0.06;
    Snd.play('shield');
    if(Settings.get('shake'))this.cameras.main.flash(120,255,220,0,0.15);
    if(this.shieldHits<=0){
      // Shield broke — heavy feedback
      this._sysLog('[SHIELD] FIREWALL BREACHED');
      try{this.cameras.main.flash(280,255,0,0,0.55);this.cameras.main.shake(320,0.02);}catch{}
      // Tier 4: bullet reversal on break
      if(this.upg.shield>=4){
        this.bullets.forEach(b=>{
          if(!b.reflected&&Math.hypot(b.x-this.px,b.y-this.py)<120){
            b.vx=-b.vx;b.vy=-b.vy;b.reflected=true;b.col=0xffdd00;
          }
        });
        this._spawnShockRing(this.px,this.py,0xffdd00,120);
        this.banner.mini('FIREWALL BREACH · shield counter','#ffdd00',900);
      }
      // Start regen timer
      const regenTime=this.upg.shield>=4?8:this.upg.shield>=3?12:this.upg.shield>=2?20:this.activeSkin==='core'?20:0;
      if(regenTime>0){
        this.shieldRegenT=regenTime;
      }
    } else {
      this._sysLog(`[SHIELD] HIT ABSORBED — ${this.shieldHits}/${this.shieldMaxHits} REMAINING`);
    }
  }

  _die(){
    if(this._tutActive)Save.set('tutorial_done',true); // seen it once — enough
    if(this._dead)return;
    if(this.wave===3)this._perfectWave3=false;
    if(this.bossWave===true)this._bossNoDamage=false;
    if(this._devGodMode)return; // god mode
    if(this.activeSkin==='ranger')this.rangerSpeedBonus=0; // RANGER resets on death
    if(this._sandbox){this._sysLog('[SANDBOX] invincible');return;}
    if(window.DEV&&window.DEV.invincible){this._sysLog("[DEV] INVINCIBLE — death blocked");return;}
    if(this.extraLife){this.extraLife=false;this._setShield(2);this.invincT=2.0;try{this.cameras.main.flash(200,255,255,0);}catch{}Voice.say('redundant path activated');this._spawnParticles(this.px,this.py,0xffdd00,14);return;}
    this._dmgFlashT=0.28;
    this._dead=true;this._died=true;
    try{this._spawnParticles(this.px,this.py,this.shipColor,24);}catch{}
    try{if(Settings.get('shake')){this.cameras.main.flash(350,255,30,30);this.cameras.main.shake(380,0.03);}}catch{}
    CRT.glitch(1.2);Snd.play('death');Voice.say('connection lost');
    this._endRun();
    const _summaryData={score:this.score,wave:this.wave,mode:this.mode,shards:this.shards,upgrades:this.upg,bestChain:this.bestChain,timeAlive:this.timeAlive,deathCause:this._deathCause||'UNKNOWN',rollbackUsed:this._rollbackUsed,stage:this.stage,archetype:this._archetype,kills:this.totalKills,reflected:this._totalReflects,maxCombo:this._maxCombo,bestPing:this._bestPing,totalCorrupted:this._totalCorrupted,died:this._died,waveModCount:this._waveModCount,ascension:this._ascensionLevel||0,sideObjResults:this._sideObjResults||[]};
    this.time.delayedCall(900,()=>{
      this.scene.start('RunSummaryScene',_summaryData);
    });
  }

  _overheat(){
    if(this._devGodMode)return; // god mode
    this.bubbleOverheated=true;
    this.bubbleRadius=0;
    // BREACH_PULSE relic: emit ring on overheat
    if(this.bossRelics&&this.bossRelics.find(r=>r.id==='BREACH_PULSE')){
      for(let a=0;a<12;a++){
        const ang=(Math.PI/6)*a;
        this.bullets.push({x:this.px,y:this.py,vx:Math.cos(ang)*320,vy:Math.sin(ang)*320,
          col:0xffd700,reflected:true,size:6,trail:[]});
      }
      this._spawnShockRing(this.px,this.py,0xffd700,180);
    }
    this.bubbleCooldownT=this._bubbleCooldownOverride||3.0;0;
    this.parryWindowT=0.5;
    this._parryConsumed=false;
    this.pressing=false;
    // Shockwave particles outward
    for(let i=0;i<20;i++){
      const a=(Math.PI*2/20)*i;
      const spd=120+Math.random()*80;
      this.particles.push({x:this.px,y:this.py,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:1.2,col:0xff4400,size:3+Math.random()*3});
    }
    if(Settings.get('shake'))this.cameras.main.shake(300,0.02);
    if(Settings.get('shake'))this.cameras.main.flash(200,255,80,0);
    CRT.glitch(0.6);
    Snd.play('death');
    this.banner.mini('OVERHEAT · 3s COOLDOWN','#ff4400',1100);
    this._sysLog('[WARN] WARP CORE THERMAL LIMIT EXCEEDED');
    Voice.say('bubble overheated');
  }

  _waveClearSequence(){
    try { Snd.play('powerup'); } catch {}
    if(this._waveTypes&&this._waveTypes.size===1)this._monoWave=true;
    if(this._regenPatch&&this.shieldHits<(this.upg.shield||0)*2)this._setShield(this.shieldHits+1);
    const waveClearBonus=Math.round((10+this.wave*2)*(Save.hasMeta('data_compress')?1.25:1));
    this.shards+=waveClearBonus;
    // Wave-clear shard banner removed — surfaced via persistent SHARDS widget + immediate +N flash
    this.time.delayedCall(400,()=>this._flashShardGain(waveClearBonus, true));
    // Wave milestone: lore + shard bonus at thresholds
    if(this._WAVE_MILESTONES[this.wave]){
      const _msKey='wave_milestone_'+this.wave;
      if(!Save.meta(_msKey,false)){
        Save.setMeta(_msKey,true);
        Save.unlockLore(this._WAVE_MILESTONES[this.wave]);
        Save.addShards(50);
        this.miniBanner&&this.miniBanner.show('MILESTONE: WAVE '+this.wave+' (+50 ◈)','#ffd700',2000);
      }
    }
    const stageCol=this.STAGES[this.stage].accent;
    const hexCol='#'+stageCol.toString(16).padStart(6,'0');
    this._waveClearObjs=[];
    const T=(o)=>{this._waveClearObjs.push(o);return o;};
    const mono="'Courier New',monospace";

    // Burst bullets outward
    this.bullets.forEach(b=>{b.reflected=true;b.col=stageCol;b.vx*=2;b.vy*=2;});
    this._pushGrid(W/2,H/2,200);
    if(Settings.get('shake'))this.cameras.main.flash(300,(stageCol>>16)&0xff,(stageCol>>8)&0xff,stageCol&0xff,0.15);

    // Dark overlay — lighter so game world stays readable behind it
    const ov=T(this.add.rectangle(W/2,H/2,W,H,0x000000,0.75).setDepth(50).setAlpha(0));
    this.tweens.add({targets:ov,alpha:1,duration:220,ease:'Power2'});

    // Scan line sweep top → bottom
    const scan=T(this.add.rectangle(W/2,0,W,2,stageCol,0.7).setDepth(56));
    this.tweens.add({targets:scan,y:H,duration:300,ease:'Linear',delay:40,
      onComplete:()=>{try{scan.setAlpha(0);}catch{}}});

    // Top accent bar
    const topBar=T(this.add.rectangle(W/2,-2,W,2,stageCol,0.8).setDepth(52));
    this.tweens.add({targets:topBar,y:0,duration:200,ease:'Power3.Out'});

    // Hero headline
    const heroTxt=T(this.add.text(W/2,-70,`WAVE_${String(this.wave).padStart(3,'0')} — TERMINATED`,{
      fontFamily:mono,fontSize:'26px',fontStyle:'bold',color:hexCol,letterSpacing:5
    }).setOrigin(0.5,0.5).setDepth(55).setAlpha(0));
    this.tweens.add({targets:heroTxt,y:H/2-72,alpha:1,duration:260,ease:'Power3.Out',delay:70});

    // Thin divider below headline
    const divLine=T(this.add.rectangle(W/2,H/2-50,380,1,stageCol,0.35).setDepth(55).setAlpha(0));
    this.tweens.add({targets:divLine,alpha:1,duration:200,delay:280});

    // Two-column stat grid
    const stats=[
      {label:'SIGNAL_STRENGTH', value:this.score.toLocaleString(), col:'#00cc66'},
      {label:'PROCESSES_KILLED', value:String(this.kills),          col:'#00cc66'},
      {label:'DATA_SHARDS',      value:`${this.shards} ◈`,          col:'#ccaa00'},
      {label:'SECTOR',           value:this.STAGES[this.stage].name.toUpperCase(), col:hexCol},
    ];
    stats.forEach((s,i)=>{
      const col=i%2, row=Math.floor(i/2);
      const sx=W/2+(col===0?-185:15), sy=H/2-26+row*44;
      const lb=T(this.add.text(sx,sy,s.label,{
        fontFamily:mono,fontSize:'8px',color:'#336644',letterSpacing:2
      }).setAlpha(0).setDepth(55));
      const vl=T(this.add.text(sx,sy+13,s.value,{
        fontFamily:mono,fontSize:'15px',fontStyle:'bold',color:s.col,letterSpacing:1
      }).setAlpha(0).setDepth(55));
      this.tweens.add({targets:[lb,vl],alpha:1,duration:150,delay:340+i*85});
    });

    // Bottom accent bar
    const botBar=T(this.add.rectangle(W/2,H+2,W,2,stageCol,0.5).setDepth(52));
    this.tweens.add({targets:botBar,y:H,duration:200,ease:'Power3.Out'});

    // Next wave prompt — fades in and blinks
    const nextTxt=T(this.add.text(W/2,H+20,`INITIATING WAVE_${String(this.wave+1).padStart(3,'0')} — AWAITING MODULE SELECTION`,{
      fontFamily:mono,fontSize:'9px',color:'#224433',letterSpacing:2
    }).setOrigin(0.5,0.5).setDepth(54).setAlpha(0));
    this.time.delayedCall(620,()=>{
      this.tweens.add({targets:nextTxt,y:H-13,alpha:0.5,duration:240,ease:'Power2.Out'});
      this.tweens.add({targets:nextTxt,alpha:0.12,duration:550,yoyo:true,repeat:-1,delay:320});
    });

    // Particle burst
    for(let i=0;i<18;i++){const a=(Math.PI*2/18)*i,spd=60+Math.random()*100;this.particles.push({x:this.px,y:this.py,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:0.6,col:stageCol,size:2+Math.random()*3});}

    // Fade all objects then launch upgrade scene
    this.time.delayedCall(2100,()=>{
      if(this._waveClearObjs){
        this._waveClearObjs.forEach(o=>{
          if(o&&o.alpha>0)try{this.tweens.add({targets:o,alpha:0,duration:200});}catch{}
        });
      }
    });
    const _launchOverclock=()=>{
      // If a boss-relic choice is still open, wait for the player to pick.
      if(this._relicChoicePending){
        this.time.delayedCall(200,_launchOverclock);
        return;
      }
      this.scene.pause();
      const corruptedMode=this.mode==='corrupted';
      const nextWave=this.wave+1;
      let nextWaveMod=null;
      const _wmFreqNext = (this.diff && this.diff.waveModFreq) || 0;
      if(_wmFreqNext>0 && !this.bossWave && nextWave>=2 && (corruptedMode||nextWave%_wmFreqNext===0)){
        const mPool=corruptedMode
          ?['DENSE','DARK','OVERLOAD','FRAGILE','MINIBOSS','ENCORE','SURGE','BOUNTY']
          :['DENSE','OVERLOAD','SURGE','BOUNTY','NONE','NONE'];
        nextWaveMod=mPool[Math.floor(Math.random()*mPool.length)]||null;
        if(nextWaveMod==='NONE')nextWaveMod=null;
        this._nextWaveMod=nextWaveMod;
      }
      this.scene.launch('OverclockScene',{wave:this.wave,score:this.score,shards:this.shards,upgrades:this.upg,encoreMode:this.waveModifier==='ENCORE',nextWaveMod});
    };
    this.time.delayedCall(2400,_launchOverclock);

    Snd.play('powerup');
    Voice.say(`wave ${this.wave} cleared`);
  }

  _drawCursor(){
    // Cursor is drawn by CRT overlay (works in all scenes)
    // Only draw dash-ready indicator ring in-game
    this.gfxCursor.clear();
    const mx=this.input.activePointer.x;
    const my=this.input.activePointer.y;
    const dist=Math.hypot(mx-this.px,my-this.py);
    const dashReady=this._dashCdT<=0;
    if(dashReady&&dist>160){
      const pulse=0.4+0.3*Math.sin(this.t*5);
      this.gfxCursor.lineStyle(1,0x00f5ff,pulse);
      this.gfxCursor.strokeCircle(mx,my,16);
      // Small arrow pointing back to player
      const ang=Math.atan2(this.py-my,this.px-mx);
      this.gfxCursor.lineStyle(2,0x00f5ff,pulse*0.8);
      this.gfxCursor.moveTo(mx+Math.cos(ang)*17,my+Math.sin(ang)*17);
      this.gfxCursor.lineTo(mx+Math.cos(ang)*24,my+Math.sin(ang)*24);
      this.gfxCursor.strokePath();
    }
  }

  _drawVignette(){
    this.gfxVignette.clear();
    // Heat warning vignette only — not enemy proximity (that was annoying)
    const heatDanger=this.bubbleHeat>70?(this.bubbleHeat-70)/30:0;
    const surgeReady=this.signal>=1?1:0;
    if(heatDanger>0.05||surgeReady>0){
      const edgeCol=surgeReady?0x00ffcc:0xff4400;
      const edgeA=(surgeReady?0.06:heatDanger*0.12)*(0.7+0.3*Math.sin(this.t*6));
      const edgW=60;
      this.gfxVignette.fillStyle(edgeCol,edgeA);
      this.gfxVignette.fillRect(0,0,edgW,H);
      this.gfxVignette.fillRect(W-edgW,0,edgW,H);
      this.gfxVignette.fillRect(0,0,W,edgW);
      this.gfxVignette.fillRect(0,H-edgW,W,edgW);
    }
  }

  _triggerMemLeak(){
    if(this.memLeakActive>0)return;
    this.memLeakActive=3.5;
    this._sysLog('[ERR] MEMORY SECTOR CORRUPTED — PATCHING...');
    // Flash the grid white briefly then invert colours
    this.cameras.main.flash(200,200,255,200,0.12);
    // Spawn glitch bars across screen
    for(let i=0;i<5;i++){
      const bar=this.add.rectangle(W/2,Math.random()*H,W,2+Math.random()*8,0xffffff,0.15).setDepth(48);
      this.tweens.add({targets:bar,alpha:0,x:W/2+(Math.random()-0.5)*40,duration:200+Math.random()*600,onComplete:()=>bar.destroy()});
    }
    // Invert grid colour temporarily
    this.time.delayedCall(3500,()=>{this._sysLog('[OK] SECTOR PATCHED');});
    CRT.glitch(0.5);
  }

  _sysLog(msg){
    const ts=`[${String(Math.floor(this.t*100)%10000).padStart(4,'0')}]`;
    this.sysLogLines.unshift(ts+' '+msg);
    if(this.sysLogLines.length>6)this.sysLogLines.pop();
  }

  _addKillFeed(msg,col){
    if(!this._killFeedLines)return;
    this._killFeedLines.unshift({msg,col,a:1.0});
    if(this._killFeedLines.length>5)this._killFeedLines.pop();
  }

  _endRun(){
    if(this._endRunCalled)return;this._endRunCalled=true;
    Save.saveHs(this.score);Save.addShards(this.shards);
    Save.addLb({
      score: this.score || 0,
      wave: this.wave || 0,
      mode: this.mode || 'normal',
      name: (typeof Save.operatorName === 'function' ? Save.operatorName() : '') || 'OPERATOR',
      archetype: this._archetype || 'reflector',
      diff: (typeof Settings !== 'undefined' && Settings.get('difficulty')) || 'daemon',
      ascension: this._ascensionLevel || 0,
      kills: this.totalKills || 0,
      reflects: this._totalReflects || 0,
      died: !!this._died,
      date: Date.now(),
    });
    // Lifetime stats
    Save.addStat('runs');
    Save.addStat('kills',this.totalKills||0);
    Save.addStat('reflects',this._totalReflects||0);
    // Run history (last 5)
    Save.addRunHistory({
      score:this.score||0,wave:this.wave||0,mode:this.mode||'normal',
      archetype:this._archetype||null,kills:this.totalKills||0,
      reflects:this._totalReflects||0,synergies:(this.synergies||[]).slice(),
      died:!!this._died,date:Date.now(),
    });
    // Archetype mastery: accumulate per-archetype stats
    const _ak = this._archetype || 'default';
    Save.addStat('arch_'+_ak+'_runs', 1);
    Save.addStat('arch_'+_ak+'_total_kills', this.totalKills || 0);
    Save.addStat('arch_'+_ak+'_total_bosses', Save.stat('boss_kills', 0) - (Save.stat('arch_'+_ak+'_total_bosses', 0) || 0));
    const _bw = Save.stat('arch_'+_ak+'_best_wave', 0);
    if(this.wave > _bw) Save.setStat('arch_'+_ak+'_best_wave', this.wave);
    const _bs = Save.stat('arch_'+_ak+'_best_score', 0);
    if(this.score > _bs) Save.setStat('arch_'+_ak+'_best_score', this.score);
    // Mastery milestone: wave 10 with each archetype unlocks a cosmetic flag
    if(this.wave >= 10 && !Save.hasMeta('arch_mastery_'+_ak)){
      Save.setMeta('arch_mastery_'+_ak, true);
      if(this.banner) this.banner.show('MASTERY: '+_ak.toUpperCase(),'#ffaa00',1500,'cosmetic unlocked');
    }
    // Check achievements
    this._checkAchievements();
    // Daily challenge completion check
    if(this.mode==='daily'&&this._challengeId){
      try{
        const challenges=getDailyChallenges();
        const ch=challenges.find(c=>c.id===this._challengeId);
        if(ch&&ch.check){
          const today=new Date();
          const todayKey='daily_done_'+today.toDateString();
          let doneToday=[];
          try{doneToday=JSON.parse(Save.get(todayKey)||'[]');}catch{}
          if(!doneToday.includes(ch.id)){
            const checkData={
              wave:this.wave,score:this.score,shards:this.shards,kills:this.totalKills,
              died:this._died,dashUses:this._dashUses,maxHeat:this._maxHeat,
              usedShield:this._usedShield,monoWave:this._monoWave,
              bestChain:this.bestChain,comboTime:this._comboTime15,
              perfectWave3:this.wave>=3&&this._perfectWave3,
              totalReflects:this._totalReflects,bestPing:this._bestPing,
              totalCorrupted:this._totalCorrupted,maxDefected:this._maxDefected,
              bossNoP:!this._pingUsedOnBoss,killStreak5:this._killStreak5,
              noPowerRun:!this._powerUsed,noUpgRun:this._upgSelected===0,
              maxCombo:this._maxCombo,waveModCount:this._waveModCount,
              bossUnder60:this._bossUnder60,
              bossNoDamage:this._bossNoDamage,
              surgeFires:this._surgeFires,
              volatileExplosions:this._volatileExplosions,
              waveBestReflects:this._waveBestReflects,
              // SIDE_OBJ additions
              chainReactions:this._chainReactions||0,
              wavesNoOverheat:this._wavesNoOverheat||0,
              powerUsesTotal:this._powerUsesTotal||0,
            };
            if(ch.check(checkData)){
              doneToday.push(ch.id);
              Save.set(todayKey,JSON.stringify(doneToday));
              Save.addShards(ch.reward);
              try{this.miniBanner&&this.miniBanner.show(`DAILY: ${ch.label} +${ch.reward}◈`,'#ffdd00',2200);}catch{}
            }
          }
        }
      }catch(err){console.warn('[daily check err]',err);}
    }

    // SIDE OBJECTIVES — check + claim (all modes)
    if(this._sideObjectives && this._sideObjectives.length){
      try{
        const sd = {
          wave:this.wave,score:this.score,shards:this.shards,kills:this.totalKills,
          died:this._died,usedShield:this._usedShield,
          bestChain:this.bestChain,
          perfectWave3:this.wave>=3&&this._perfectWave3,
          totalReflects:this._totalReflects,
          totalCorrupted:this._totalCorrupted,maxDefected:this._maxDefected,
          killStreak5:this._killStreak5,
          maxCombo:this._maxCombo,
          bossNoDamage:this._bossNoDamage,
          surgeFires:this._surgeFires,
          volatileExplosions:this._volatileExplosions,
          chainReactions:this._chainReactions||0,
          wavesNoOverheat:this._wavesNoOverheat||0,
          powerUsesTotal:this._powerUsesTotal||0,
        };
        const N = this._ascensionLevel || 0;
        const rewardMult = 1 + 0.04 * N;
        this._sideObjResults = [];
        this._sideObjectives.forEach(o => {
          try{
            if(o.check(sd)){
              const reward = Math.round(o.reward * rewardMult);
              Save.addShards(reward);
              Save.addStat('side_obj_completed', 1);
              this._sideObjResults.push({id:o.id, label:o.label, reward, cat:o.cat});
            }
          }catch(e){ console.warn('[side obj check err]', o.id, e); }
        });
      }catch(err){ console.warn('[side obj check err]', err); }
    }
  }

  _checkAchievements(){
    try{
      const st=Save.stats();
      const ach=(id,label,sub)=>{
        if(Save.ach(id))return;
        Save.unlockAch(id);
        try{this.time.delayedCall(800,()=>{
          if(this._dead)return;
          this.banner&&this.banner.toast(`★ ${label}`,'#ffdd00',2400);
        });}catch{}
      };
      if((st.runs||0)>=1)                   ach('first_run','SIGNAL_TRANSMITTED','First run complete');
      if((st.boss_kills||0)>=1)             ach('first_boss','PROCESS_ELIMINATED','First boss killed');
      if((st.boss_kills||0)>=4)             ach('bossbuster','SYSTEM_PURGED','4 total boss kills');
      if((st.kills||0)>=100)                ach('century','CENTURY_MARK','100 lifetime kills');
      if((st.kills||0)>=500)                ach('slaughter','PROCESS_ELIMINATOR','500 lifetime kills');
      if((st.reflects||0)>=100)             ach('reflector','SIGNAL_REFLECTOR','100 lifetime reflects');
      if((st.runs||0)>=10)                  ach('veteran','NETWORK_VETERAN','10 runs completed');
      if((st.total_fragments||0)>=50)        ach('hoarder','DATA_HOARDER','50 fragments collected');
      if(this.wave>=20)                     ach('wave20','DEEP_NETWORK_REACHED','Wave 20 reached');
      if(this.mode==='endless'&&(this.endlessPhase||0)>=3) ach('survivor','ENDLESS_SURVIVOR','Reached endless phase 4');
      if(Object.values(this.upg||{}).some(v=>v>=4))  ach('maxtier','TIER_MAX_REACHED','Any upgrade to tier 4');
      if((this.synergies||[]).length>=2)    ach('synergist','DUAL_SYNERGY','2 synergies active simultaneously');
      if(!this._died&&(this.wave||0)>=5)    ach('deathless','DEATHLESS_SIGNAL','Survive 5 waves without dying');
      if((this.totalKills||0)>0&&!this._died&&(this.score||0)>=10000) ach('highscore','SIGNAL_PEAK','10000 score in one run');
    }catch(e){}
  }

  // ─── MAIN UPDATE ─────────────────────────────────────────
  update(_,delta){
    if(this._dead||this.paused||this._devOpen)return;
    // #10 Boss phase beat freeze — slow dt while freeze active
    if(this._beatFreezeT>0){this._beatFreezeT=Math.max(0,this._beatFreezeT-Math.min(delta/1000,0.05));}
    let dtRaw=Math.min(delta/1000,0.05);
    // I10 — hit-stop: decay the freeze timer using realtime, then zero out gameplay dt for this tick
    if(this._hitStopT>0){
      this._hitStopT=Math.max(0,this._hitStopT-dtRaw);
      // tiny advance for t (animations keep ticking subtly) but no gameplay
      this.t+=dtRaw*0.05;
      this._render(); this._updateHUD(); this._drawCursor(); this._drawVignette();
      return;
    }
    const dt = (this._beatFreezeT > 0) ? dtRaw * 0.12
             : (this._powerSlowT  > 0) ? dtRaw * 0.30
             : dtRaw;
    if (this._powerSlowT > 0) this._powerSlowT = Math.max(0, this._powerSlowT - dtRaw);
    this.t+=dt;this.comboT-=dt;if(this.comboT<=0)this.combo=0;
    if(this.combo>=15)this._comboTime15+=dt;
    if(this.invincT>0)this.invincT-=dt;
    if(this._dmgFlashT>0)this._dmgFlashT=Math.max(0,this._dmgFlashT-dt);
    if(this.empActive){this.empT-=dt;if(this.empT<=0){this.empActive=false;this.empT=0;}}
    if(this._dashCdT>0) this._dashCdT = Math.max(0, this._dashCdT - dt);

    // ── Relic pickup collision ──
    if(this._relicPickups&&this._relicPickups.length>0){
      this._relicPickups.forEach(p=>{
        p.life-=dt; p.pulse+=dt;
        if(Math.hypot(this.px-p.x,this.py-p.y)<36){
          this.bossRelics.push({id:p.id,name:p.name,col:p.col,icon:p.icon,desc:p.desc});
          this.banner&&this.banner.show(`RELIC_ACQUIRED: ${p.name}`,
            '#'+p.col.toString(16).padStart(6,'0'),2500,p.desc);
          this._spawnShockRing(p.x,p.y,p.col,120);
          Snd.play('powerup');
          p.life=-1;
        }
      });
      this._relicPickups=this._relicPickups.filter(p=>p.life>0);
    }

    // ── Relic: GRAVITY_ECHO — curve reflected bullets toward enemies ──
    if(this.bossRelics.find(r=>r.id==='GRAVITY_ECHO')){
      this.bullets.forEach(b=>{
        if(!b.reflected)return;
        let nearest=null,nd=9999;
        this.enemies.forEach(e=>{const d=Math.hypot(b.x-e.x,b.y-e.y);if(d<nd){nd=d;nearest=e;}});
        if(nearest&&nd<300){const pull=30;const dx=(nearest.x-b.x)/nd;const dy=(nearest.y-b.y)/nd;b.vx+=dx*pull*dt;b.vy+=dy*pull*dt;}
      });
    }

    // ── Relic: PACKET_WALL — every 8 reflects fire perpendicular wall ──
    // (counter incremented in reflect block, effect fires there)

    // ── Relic: PHASE_CLONE — dash origin burst (timer-based) ──
    if(this._phaseCloneT>0){
      this._phaseCloneT-=dt;
      if(this._phaseCloneT<=0&&this._phaseCloneOrigin&&this.bossRelics.find(r=>r.id==='PHASE_CLONE')){
        const {x,y}=this._phaseCloneOrigin;
        for(let a=0;a<8;a++){
          const ang=(Math.PI/4)*a;
          this.bullets.push({x,y,vx:Math.cos(ang)*300,vy:Math.sin(ang)*300,
            col:0xddddff,reflected:true,size:5,trail:[]});
        }
        this._spawnParticles(x,y,0xddddff,12);
        this._phaseCloneOrigin=null;
      }
    }
    if(this.surgeActive){this.surgeT-=dt;if(this.surgeT<=0)this.surgeActive=false;}

    // ── Player movement ── Dash is handled by Phaser tween in _startDash;
    // we just skip the smooth-follow while it's running so the tween owns px/py.
    if(!this._dashing && this.fingerDown){
      const speed=Settings.get('smooth')?10:99;
      this.px=Phaser.Math.Linear(this.px,this.tx,speed*dt);
      this.py=Phaser.Math.Linear(this.py,this.ty,speed*dt);
    }
    // Playfield bounds — exclude HUD margins (left/right columns, top/bottom bands)
    this.px=Phaser.Math.Clamp(this.px,150,W-150);
    this.py=Phaser.Math.Clamp(this.py,30,H-60);

    // Track player velocity for aim-leading (raw + EMA-smoothed over ~0.25s)
    this.playerVx=(this.px-(this._prevPxLast||this.px))/Math.max(dt,0.001);
    this.playerVy=(this.py-(this._prevPyLast||this.py))/Math.max(dt,0.001);
    this.playerVx=Math.max(-2000,Math.min(2000,this.playerVx));
    this.playerVy=Math.max(-2000,Math.min(2000,this.playerVy));
    const _velAlpha=Math.min(1,dt/0.25);
    this.playerVxSmooth=(this.playerVxSmooth||0)+(this.playerVx-(this.playerVxSmooth||0))*_velAlpha;
    this.playerVySmooth=(this.playerVySmooth||0)+(this.playerVy-(this.playerVySmooth||0))*_velAlpha;
    this._prevPxLast=this.px;
    this._prevPyLast=this.py;

    // Data fragmentation movement trail — visible hex fragments
    if(this.fingerDown&&!this._dashing){
      const spd=Math.hypot(this.px-this.tx,this.py-this.ty);
      if(spd>3&&Math.random()<0.5){
        this.movTrail.push({
          x:this.px+(Math.random()-0.5)*8,
          y:this.py+(Math.random()-0.5)*8,
          a:0.7,decay:1.8,
          size:1.5+Math.random()*2.5,
          rot:Math.random()*Math.PI,
          sides:3
        });
      }
    }
    for(let i=this.movTrail.length-1;i>=0;i--){
      this.movTrail[i].a-=this.movTrail[i].decay*(delta/1000);
      if(this.movTrail[i].a<=0)this.movTrail.splice(i,1);
    }

    // Packet trace — store movement history
    if(!this._traceT)this._traceT=0;
    this._traceT+=delta/1000;
    if(this._traceT>0.08){
      this._traceT=0;
      this.packetTrace.push({x:this.px,y:this.py,a:0.5});
      const gtMax=this.upg.ghost_trace>=3?60:this.upg.ghost_trace>=2?45:35;
    if(this.packetTrace.length>gtMax)this.packetTrace.shift();
    }
    this.packetTrace.forEach(p=>p.a=Math.max(0,p.a-0.015));

    // GHOST skin: ghost dash echo — damage enemies in trail
    if(this._ghostDashTrail && this._ghostDashTrail.length > 0){
      for(let i = this._ghostDashTrail.length - 1; i >= 0; i--){
        const ge2 = this._ghostDashTrail[i];
        ge2.life -= dt;
        if(ge2.life <= 0){ this._ghostDashTrail.splice(i, 1); continue; }
        // Damage nearby enemies once per echo (use _hit flag)
        if(!ge2._hit){
          ge2._hit = true;
          for(let j = this.enemies.length - 1; j >= 0; j--){
            const en = this.enemies[j];
            if(en.isBoss) continue;
            if(Math.hypot(en.x - ge2.x, en.y - ge2.y) < 22){
              en.hp -= 1;
              Snd.play('echo_hit');
              this._spawnParticles(ge2.x, ge2.y, 0xaaaaff, 4);
              if(en.hp <= 0) this._killEnemy(en, j, false);
            }
          }
        }
      }
    }

    // ── ENDLESS MODE: timeline-based, no waves ──
    if(this.mode==='endless'&&!this._dead&&!this.paused){
      this._updateEndless(dt);
    }

    // Spawning — faster rates, difficulty scaled, multi-spawn in late waves
    // Soft enemy-count cap: prevents runaway accumulation when player can't kill
    // fast enough (manifests as "enemies stop moving" — really a perf cliff from
    // O(n*m) enemy/bullet loops at high counts).
    const _ENEMY_SOFT_CAP = this.waveModifier==='DENSE' ? 70 : 55;
    // Total-spawn gate: stop spawning once already-killed + currently-alive
    // meets the wave quota. Prevents the wave from spawning 3× the displayed
    // kill target when the player kills slowly.
    const _waveQuotaReached = (this.kills + this.enemies.length) >= this.killsNeeded;
    if(!this._sandbox&&!this.bossWave&&!_waveQuotaReached&&this.mode!=='endless'&&!this._tutOnline){
      this.spawnT+=dt;
      const diff=this.diff||DIFFICULTY.daemon;
      // Base interval: PACKET=1.4s, DAEMON=1.0s, KERNEL=0.7s, scales with wave
      const baseIv=diff===DIFFICULTY.packet?1.4:diff===DIFFICULTY.kernel?0.7:1.0;
      const iv=Math.max(baseIv-this.wave*0.04,diff===DIFFICULTY.kernel?0.25:0.3);
      if(this.spawnT>=iv&&this.enemies.length<_ENEMY_SOFT_CAP){
        this.spawnT=0;
        this._spawnEnemy();
        // Multi-spawn in later waves or DENSE modifier — also gated by cap + quota
        const _quotaNow = () => (this.kills + this.enemies.length) >= this.killsNeeded;
        if(!_quotaNow()&&this.enemies.length<_ENEMY_SOFT_CAP&&((this.wave>=6&&diff!==DIFFICULTY.packet&&Math.random()<0.35)||this.waveModifier==='DENSE'))this._spawnEnemy();
        // Wave 10+: sometimes 3 at once
        if(!_quotaNow()&&this.enemies.length<_ENEMY_SOFT_CAP&&this.wave>=10&&Math.random()<0.25)this._spawnEnemy();
      }
      // More frequent formations — only fire if quota still has headroom for the whole formation
      this.formationT+=dt;const formIv=diff===DIFFICULTY.kernel?6:diff===DIFFICULTY.packet?12:9;
      if(this.formationT>=formIv && (this.kills + this.enemies.length + 5) <= this.killsNeeded){this.formationT=0;this._spawnFormation();}
      this.hazardT+=dt;if(this.hazardT>=9){this.hazardT=0;this._spawnHazard();}
    }

    // Wave clear (not in endless)
    // NOTE: do NOT call this._endRun() here — that's reserved for actual end of
    // run (death / shutdown). Calling it on every wave clear sets _endRunCalled
    // and short-circuits the real Save.addShards / saveHs / addLb writes when
    // the player eventually dies, losing all post-wave-1 progress.
    if(!this._sandbox&&this.mode!=='endless'&&this.kills>=this.killsNeeded&&this.enemies.length===0&&!this.paused&&!this._dead){
      this.paused=true;this.chainCount=0;
      this._waveClearSequence();
      return;
    }

    // ── Parry window timer ──
    if(this.parryWindowT>0)this.parryWindowT-=dt;
    // (dash cooldown decay moved to top of update at L3626)

    // ── Bubble cooldown after overheat ──
    if(this.bubbleCooldownT>0){
      this.bubbleCooldownT-=dt;
      if(this.bubbleCooldownT<=0){
        this.bubbleOverheated=false;
        this.bubbleHeat=0;
        this.banner.mini('WARP_BUBBLE · ONLINE','#00f5ff',800);
      }
    }
    // THERMAL_BLEED meta: overheat ring damages nearby enemies while overheated
    if(this.bubbleOverheated&&this._thermalBleedMeta){
      const tbR=70;
      for(let k=this.enemies.length-1;k>=0;k--){
        const e=this.enemies[k];
        if(e._isGhost===true||e.defected)continue;
        if(Math.hypot(e.x-this.px,e.y-this.py)<=tbR+e.size){
          e.hp-=30*dt;
          if(e.hp<=0){this._spawnParticles(e.x,e.y,0xff4400,6);this._killEnemy(e,k,false);}
        }
      }
    }

    // ── Bubble sizing + heat ──
    const maxR=(this.surgeActive?150:80)+Math.min(this.upg.bubble_size,3)*15;
    const rangerBoost=this.activeSkin==='ranger'?(this.rangerSpeedBonus||0)*200:0;
    const growS=(this.surgeActive?400:260)+this.upg.bubble_speed*80+rangerBoost;

    if(!this.lastReflectT)this.lastReflectT=0;
    this.lastReflectT+=dt;

    // PACKET_CACHE: track rapid kills
    if(!this.rapidKillT)this.rapidKillT=0;
    if(!this.rapidKillCount)this.rapidKillCount=0;
    if(!this.freeReflectT)this.freeReflectT=0;
    this.rapidKillT+=dt;
    if(this.rapidKillT>3){this.rapidKillT=0;this.rapidKillCount=0;}
    if(this.freeReflectT>0)this.freeReflectT-=dt;

    // SIGNAL_DECAY: age enemies
    if(this.upg&&this.upg.signal_decay>0){
      this.enemies.forEach(e=>{
        if(e.isBoss||e.defected)return;
        if(!e.aliveT)e.aliveT=0;
        e.aliveT+=dt;
        const slowPct=Math.min(0.30,e.aliveT*0.02);
        e.spd=Math.max(e.spd*(1-slowPct*dt*0.01),20); // gentle decay
      });
    }

    // OVERCLOCK_BURST: track if bubble was just deployed
    if(this.pressing&&this.bubbleRadius<5)this.bubbleJustDeployed=true;
    if(!this.pressing)this.bubbleJustDeployed=false;

    // PARRY WINDOW: if just overheated and player presses again within 0.5s, re-deploy at 40%
    if(this.bubbleOverheated && this.parryWindowT > 0 && this.fingerDown && !this._parryConsumed){
      this._parryConsumed = true;
      this.bubbleOverheated = false;
      this.bubbleHeat = 0;
      this.bubbleCooldownT = 0;
      this.bubbleRadius = Math.max(this.bubbleRadius, (this.surgeActive?150:80)*0.4);
      this.parryWindowT = 0;
      if(this.banner) this.banner.mini('PARRY','#00ffcc',700);
      try{ Snd.play('reflect'); }catch(e){}
    }

    if(this.pressing&&!this.bubbleOverheated){
      const distortMult=this._coreDistortT>0?(0.4+0.6*Math.abs(Math.sin(this.t*3))):1;
      const resMult=(this._resonanceMeta&&this.bossWave)?1.3:1;
      const lastStandMult=(this._lastStandMeta&&(this.shieldHits||0)===0)?1.3:1;
      this.bubbleRadius=Math.min(this.bubbleRadius+growS*dt*distortMult*resMult*lastStandMult,maxR);
      // Heat ONLY builds from reflections now — no passive gain
      // But if not hit for 1.5s while holding, start cooling (venting)
      const coolRate=(this.lastReflectT>1.5?20:0)*(this._heatSinkMult||1);
      this.bubbleHeat=Math.max(0,this.bubbleHeat-coolRate*dt);
    } else {
      const wasExpanded=this.bubbleRadius>10;
      this.bubbleRadius=Math.max(this.bubbleRadius-(this.synergies.includes('SINGULARITY')?50:300)*dt,0);
      // Set burst ready only once when bubble fully collapses
      if(wasExpanded&&this.bubbleRadius<=0&&this.upg.overclock_burst>0&&!this._burstReady){this._burstReady=true;}
      // Difficulty-based cool rate
      const hcr=(this.diff||DIFFICULTY.daemon).heatCoolRate*(this._heatSinkMult||1);
      this.bubbleHeat=Math.max(0,this.bubbleHeat-hcr*dt);
    }

    // Overheat trigger (INFERNO bypasses with rage meter)
    // Bubble armor extends overheat threshold
    this._armorThresh=((this.upg.bubble_armor>=4?122:this.upg.bubble_armor>=3?118:this.upg.bubble_armor>=2?115:this.upg.bubble_armor>=1?112:100)+(this._evoHeatCap?20:0))*(1-(this._overheatPctMult||0));
    if(this.bubbleHeat>=this._armorThresh&&!this.bubbleOverheated){
      if(this.activeSkin==='inferno'){
        this.bubbleHeat=0; // reset heat, fill rage
        this.rageMeter=Math.min(100,this.rageMeter+25);
        if(this.rageMeter>=100){
          this.rageMeter=0;this.rageActive=true;this.rageT=4;
          this._rageShockT=0; // shockwave spawn timer
          Snd.play('rage');
          this.banner.mini('INFERNO RAGE · 4s','#ff6600',1400);
          if(Settings.get('shake'))this.cameras.main.flash(300,255,80,0,0.25);
          if(Settings.get('shake'))this.cameras.main.shake(280,0.018);
          CRT.glitch(0.5);
          for(let ri=0;ri<3;ri++)this._spawnShockRing(this.px,this.py,0xff4400,160+ri*50);
          this._spawnParticles(this.px,this.py,0xff6600,20);
        }
      } else {
        this._overheat();
      }
    }
    // Rage timer + effects
    if(this.rageActive){
      this.rageT-=dt;
      // Spawn shockwaves every 0.5s
      if(!this._rageShockT)this._rageShockT=0;
      this._rageShockT+=dt;
      if(this._rageShockT>=0.5){
        this._rageShockT=0;
        this._spawnShockRing(this.px,this.py,0xff4400,180);
        this._spawnParticles(this.px,this.py,0xff4400,6);
        // AoE damage — kill nearby enemies
        for(let ri=this.enemies.length-1;ri>=0;ri--){
          const re=this.enemies[ri];
          if(re.isBoss)continue;
          if(re.bootT>0)continue;
          if(Math.hypot(re.x-this.px,re.y-this.py)<80){
            re.hp-=1;
            if(re.hp<=0){this._killEnemy(re,ri,false);}
          }
        }
      }
      if(this.rageT<=0){
        this.rageActive=false;this.rageMeter=0;this._rageShockT=0;
        this.banner.mini('INFERNO RAGE END','#ff4400',800);
      }
    }

    this.bubbleCharge=this.bubbleRadius/maxR;
    this.bubbleTier=this.bubbleCharge>0.66?2:this.bubbleCharge>0.33?1:0;
    if(!this.surgeActive)this.signal=Math.max(0,this.signal-0.008*dt);

    // Animate score display
    this.scoreDisplay=Phaser.Math.Linear(this.scoreDisplay,this.score,8*dt);

    // Memory leak zone timer
    if(!this.memLeakT)this.memLeakT=0;
    this.memLeakT+=dt;

    // Grid memory cell flicker — random cells briefly show hex values
    if(!this.gridFlickers)this.gridFlickers=[];
    if(Math.random()<0.04){
      const gx=Math.floor(Math.random()*(W/80))*80+40;
      const gy=Math.floor(Math.random()*(H/80))*80+40;
      const val='0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
      this.gridFlickers.push({x:gx,y:gy,val,life:0.6,maxLife:0.6});
    }
    for(let i=this.gridFlickers.length-1;i>=0;i--){
      const f=this.gridFlickers[i];f.life-=dt;
      if(f.life<=0){this.gridFlickers.splice(i,1);continue;}
      const a=(f.life/f.maxLife)*0.25;
      this.gfxBgDepth.fillStyle(0x003322,a*0.5);
      this.gfxBgDepth.fillRect(f.x-38,f.y-10,76,20);
      // Draw value as small green line-art (approximate with filled rects)
      this.gfxBgDepth.fillStyle(0x00cc66,a*2);
      this.gfxBgDepth.fillRect(f.x-34,f.y-3,f.val.length*5,2);
    }
    if(this.memLeakT>18+Math.random()*10){
      this.memLeakT=0;
    if(!this.firewallCells)this.firewallCells=[];
    if(!this.firewallT)this.firewallT=0;
    this.firewallT+=dt;
    if(this.firewallT>6){
      this.firewallT=0;
      // Spawn 2-3 firewall cells on random grid squares
      for(let i=0;i<2+Math.floor(Math.random()*2);i++){
        const gx=Math.floor(Math.random()*(W/80))*80+40;
        const gy=Math.floor(Math.random()*(H/80))*80+40;
        this.firewallCells.push({x:gx,y:gy,life:4,maxLife:4});
      }
      this._sysLog('[SYS] FIREWALL QUARANTINE INITIATED');
    }
    for(let i=this.firewallCells.length-1;i>=0;i--){
      this.firewallCells[i].life-=dt;
      if(this.firewallCells[i].life<=0)this.firewallCells.splice(i,1);
    }
      this._triggerMemLeak();
    }
    if(this.memLeakActive){this.memLeakActive-=dt;if(this.memLeakActive<0)this.memLeakActive=0;}

    // Phantom decoy life tick
    if(this.phantomDecoys){this.phantomDecoys.forEach(d=>{d.life-=dt;});this.phantomDecoys=this.phantomDecoys.filter(d=>d.life>0);}

    // Active power timers — sandbox keeps power CD at zero so the bar stays full
    if(this._sandbox) this.activePowerCD = 0;
    else if(this.activePowerCD>0) this.activePowerCD = Math.max(0,this.activePowerCD-dt);
    if(this.activePowerT>0){
      this.activePowerT-=dt;
      if(this.activePowerT<=0){
        this.activePowerActive=false;
        this.ghostStepActive=false;
      }
    }
    // EMP frozen bullet tick
    this.bullets&&this.bullets.forEach(b=>{
      if(b.frozen){b.frozenT-=dt;if(b.frozenT<=0){b.frozen=false;delete b.frozenT;}}
    });
    // NULL_ZONE: delete bullets inside (Phase 2E T3: optional dmgPerSec to enemies inside)
    if(this.nullZones){
      for(let i=this.nullZones.length-1;i>=0;i--){
        const nz=this.nullZones[i];nz.life-=dt;
        if(nz.life<=0){this.nullZones.splice(i,1);continue;}
        for(let j=this.bullets.length-1;j>=0;j--){
          const b=this.bullets[j];
          if(!b.reflected&&Math.hypot(b.x-nz.x,b.y-nz.y)<nz.r){this.bullets.splice(j,1);}
        }
        if(nz.dmgPerSec>0){
          for(let j=this.enemies.length-1;j>=0;j--){
            const e=this.enemies[j];
            if(e.isBoss||e._isGhost)continue;
            if(Math.hypot(e.x-nz.x,e.y-nz.y)<nz.r){
              e.hp -= nz.dmgPerSec*dt;
              if(e.hp<=0){ const ex=e.x,ey=e.y,ec=e.color; this._killEnemy(e,j,false); this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);}); }
            }
          }
        }
      }
    }
    // DECOY: enemies target decoy instead of player (Phase 2E T3: aoeBlast on expire)
    if(this.decoyPos){
      this.decoyPos.life-=dt;
      if(this.decoyPos.life<=0){
        if(this.decoyPos.aoeBlast){
          // Trigger AOE — radial blast that damages nearby enemies (mirrors corrupt_wave pattern)
          const bx=this.decoyPos.x, by=this.decoyPos.y, BR=180;
          this._spawnShockRing(bx,by,0xff8800,BR);
          for(let i=this.enemies.length-1;i>=0;i--){
            const e=this.enemies[i]; if(e.isBoss||e._isGhost)continue;
            if(Math.hypot(e.x-bx,e.y-by)<BR){
              e.hp -= 2;
              this._spawnParticles(e.x,e.y,0xff8800,4);
              if(e.hp<=0){ const ex=e.x,ey=e.y,ec=e.color; this._killEnemy(e,i,false); this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);}); }
            }
          }
        }
        this.decoyPos=null;
      }
    }
    if(this.activePower==='overclock_surge'&&this.activePowerActive){
      this.bubbleHeat=0;
    }

    // Ghost echo processing
    if(this._ghostEchoes){
      for(let i=this._ghostEchoes.length-1;i>=0;i--){
        const ge=this._ghostEchoes[i];ge.t-=dt;
        if(ge.t<=0){this.bullets.push({x:ge.x,y:ge.y,vx:ge.vx,vy:ge.vy,col:0xaaaaff,reflected:true,size:4,ghost:true,critical:ge.critical||false,trail:[]});this._ghostEchoes.splice(i,1);}
      }
    }

    // ── DEV flag processing ──
    try{
      if(window.DEV){
        if(window.DEV.clearEnemies){window.DEV.clearEnemies=false;this.enemies=[];this._sysLog('[DEV] enemies cleared');}
        if(window.DEV.forceWaveClear){window.DEV.forceWaveClear=false;this.kills=this.killsNeeded;this._sysLog('[DEV] wave clear forced');}
        if(window.DEV.triggerMemDump){window.DEV.triggerMemDump=false;this._triggerMemDump();}
        if(window.DEV.triggerOverflow){window.DEV.triggerOverflow=false;this._triggerStackOverflow();}
        if(window.DEV.forcePing){window.DEV.forcePing=false;this.pingCooldownT=0;this._activatePing();}
        if(window.DEV.forceRage){window.DEV.forceRage=false;this.rageMeter=100;this.rageActive=true;this.rageT=3;this.banner.show('DEV: RAGE FORCED','#ff6600',800);}
        if(window.DEV.spawnEnemy){const t=window.DEV.spawnEnemy;window.DEV.spawnEnemy=null;this._spawnEnemyAt(W/2,H/2,t);}
        if(window.DEV.spawnBoss){window.DEV.spawnBoss=false;this.bossWave=true;this._spawnBossNow();}
        if(window.DEV.allUpgrades){window.DEV.allUpgrades=false;['bubble_size','bubble_speed','reflect_speed','shield','magnet','multishot','slow','score_boost','signal_fork','packet_cache','null_shield','echo_protocol','corrupt_data','ghost_trace','overclock_burst','signal_decay','firewall_breach','chain_amplifier'].forEach(id=>{this.upg[id]=3;});this._sysLog('[DEV] all upgrades maxed');}
        if(window.DEV.resetUpgrades){window.DEV.resetUpgrades=false;Object.keys(this.upg).forEach(k=>{this.upg[k]=0;});this._sysLog('[DEV] upgrades reset');}
        if(window.DEV.bossPhase){const ph=window.DEV.bossPhase;window.DEV.bossPhase=null;const boss=this.enemies.find(e=>e.isBoss);if(boss){boss.phase=ph;this._sysLog('[DEV] boss phase: '+ph);}}
        if(window.DEV.testBanners){window.DEV.testBanners=false;['TEST: BANNER_1','TEST: BANNER_2 LONGER TEXT','TEST: BANNER_3'].forEach((m,i)=>this.time.delayedCall(i*1200,()=>this.banner.show(m,'#00ff44',1000,'sub text here')));}
        if(window.DEV.giveAllRelics){window.DEV.giveAllRelics=false;
          this.bossRelics=[
            {id:'PACKET_WALL',  name:'PACKET_WALL',  col:0xff4400,icon:'▦',desc:'Every 8 reflects fires a perpendicular wall of bullets'},
            {id:'GRAVITY_ECHO', name:'GRAVITY_ECHO', col:0xaa44ff,icon:'◎',desc:'Reflected bullets curve toward nearby enemies'},
            {id:'PHASE_CLONE',  name:'PHASE_CLONE',  col:0xddddff,icon:'⬡',desc:'Dashing releases a burst of 8 bullets from your origin'},
            {id:'BREACH_PULSE', name:'BREACH_PULSE', col:0xffd700,icon:'✦',desc:'Overheat releases a ring of 12 bullets outward'},
          ];
          this.banner&&this.banner.show('DEV: ALL_RELICS GRANTED','#aa44ff',1500,'4 boss relics active');
          this._sysLog('[DEV] all relics granted');
        }
        if(window.DEV.openStats){window.DEV.openStats=false;this._openStats();}
      }
    }catch(e){console.error('[DEV FLAGS]',e);}

    this._updateBgLayers(dt);

    // Rapid kill cache timer
    if(this.rapidKillT>0){
      this.rapidKillT-=dt;
      if(this.rapidKillT<=0){this.rapidKillT=0;this.rapidKillCount=0;} // window expired, reset count
    }
    if(this.freeReflectT>0)this.freeReflectT=Math.max(0,this.freeReflectT-dt);

    // Shield regen timer
    if(this.shieldRegenT>0&&!this.shieldActive){
      this.shieldRegenT-=dt;
      if(this.shieldRegenT<=0){
        this.shieldRegenT=0;
        const hits=this.upg.shield>=4?5:this.upg.shield>=3?4:this.upg.shield>=2?3:2;
        this._setShield(hits);
      }
    }

    // Stack overflow countdown
    if(this.stackOverflowT>0){
      this.stackOverflowT-=dt;
      if(this.stackOverflowT<=0){
        this.scoreMulti/=2; // restore
        this._sysLog('[OVERFLOW] STACK RESTORED — SCORE NORMAL');
      }
    }

    // Memory dump event (wave 5+, random interval 30-60s)
    if(this.wave>=5&&!this.memDumpActive){
      this.memDumpT+=dt;
      const interval=30+Math.random()*30;
      if(this.memDumpT>interval){this.memDumpT=0;this._triggerMemDump();}
    }
    if(this.memDumpActive){
      this.memDumpTimer-=dt;
      if(this.memDumpTimer<=0){this.memDumpActive=false;}
    }
    this._updateEnemies(dt);
    this._updateBullets(dt);
    this._updateParticles(dt);
    this._updatePowerups(dt);
    this._updateHazards(dt);
    this._updateGrid(dt);
    this._updateShockRings(dt);
    this._updatePingRings(dt);
    // POWER FX state decay
    if(this._lightningBolts && this._lightningBolts.length){
      for(let i=this._lightningBolts.length-1;i>=0;i--){
        const b=this._lightningBolts[i]; b.t+=dt;
        if(b.t>=b.life) this._lightningBolts.splice(i,1);
      }
    }
    if(this._decoyOutlines && this._decoyOutlines.length){
      for(let i=this._decoyOutlines.length-1;i>=0;i--){
        const d=this._decoyOutlines[i]; d.t+=dt;
        if(d.t>=d.life) this._decoyOutlines.splice(i,1);
      }
    }
    if(this._overclockSparks){
      this._overclockSparks.t += dt;
      if(this._overclockSparks.t >= this._overclockSparks.dur){
        this._overclockSparks = null;
      } else {
        // emit 2 orbiting sparks per frame around the player
        for(let k=0;k<2;k++){
          const ang = this.t*4 + k*Math.PI;
          const r = 26 + Math.sin(this.t*8)*4;
          const sx = this.px + Math.cos(ang)*r, sy = this.py + Math.sin(ang)*r;
          const tang = ang + Math.PI/2;
          this.particles.push({x:sx,y:sy,vx:Math.cos(tang)*60,vy:Math.sin(tang)*60,life:1,decay:1.6,col:0xffd700,size:1.8+Math.random()*1.4});
        }
      }
    }
    this._updateFragments(dt);
    this._updateCorruptZones(dt);
    this._render();
    this._updateHUD();
    this._drawCursor();
    this._drawVignette();
    if(this._tutOnline||this._tutActive)this._updateTutorial(dt);
  }

  // ─── TUTORIAL WAVE 0 ───────────────────────────────────────
  // Three sequential target zones teach MOVE → DASH → REFLECT.
  // Triggered by _startWave when wave===0 && !tutorial_done.

  _startTutorial(){
    this._tutOnline=true;
    this._tutStep=0;
    this._tutTargetX=0;
    this._tutTargetY=0;
    this._tutBullet=null;
    this._tutStepT=0;
    this._tutColor=0x00ffcc;
    this._advanceTutorialStep();
  }

  _advanceTutorialStep(){
    this._tutStep++;
    this._tutStepT=0;
    if(this._tutBullet){
      const idx=this.bullets.indexOf(this._tutBullet);
      if(idx>=0)this.bullets.splice(idx,1);
      this._tutBullet=null;
    }
    if(this._tutStep===1){
      // MOVE target
      const ang=Math.random()*Math.PI*2;
      this._tutTargetX=Math.max(220,Math.min(W-220,this.px+Math.cos(ang)*230));
      this._tutTargetY=Math.max(90,Math.min(H-110,this.py+Math.sin(ang)*230));
      this._tutColor=0x00ffcc;
      this._showTutorialPrompt('// MOVE','your ship follows the cursor — guide it into the marker');
    } else if(this._tutStep===2){
      // DASH target (far so single-click drag won't reach it)
      const ang=Math.random()*Math.PI*2;
      this._tutTargetX=Math.max(220,Math.min(W-220,this.px+Math.cos(ang)*420));
      this._tutTargetY=Math.max(90,Math.min(H-110,this.py+Math.sin(ang)*420));
      this._tutColor=0xffaa00;
      this._showTutorialPrompt('// DASH','click far away to dash — brief invincibility on arrival');
    } else if(this._tutStep===3){
      // REFLECT — slow bullet from offscreen toward player
      this._tutColor=0x00ff66;
      this._showTutorialPrompt('// REFLECT','HOLD mouse to expand your bubble — release to send bullets back');
      this._spawnTutorialBullet();
    } else {
      this._finishTutorial();
    }
  }

  _spawnTutorialBullet(){
    const ang=Math.random()*Math.PI*2;
    const startX=this.px+Math.cos(ang)*420;
    const startY=this.py+Math.sin(ang)*420;
    const dx=this.px-startX, dy=this.py-startY;
    const dist=Math.hypot(dx,dy)||1;
    const spd=60;
    this._tutBullet={x:startX,y:startY,vx:(dx/dist)*spd,vy:(dy/dist)*spd,col:0xff6644,reflected:false,size:5,trail:[],etype:'grunt'};
    this.bullets.push(this._tutBullet);
  }

  _showTutorialPrompt(big,sub){
    // Tutorial UI may not be created yet on first call — retry next tick.
    if(!this._tutTipTxt||!this._tutTipBg){
      this.time.delayedCall(50,()=>this._showTutorialPrompt(big,sub));
      return;
    }
    this._tutTipTxt.setText(big+'\n'+sub);
    const colHex='#'+(this._tutColor||0x00ffcc).toString(16).padStart(6,'0');
    try { this._tutTipTxt.setColor(colHex); } catch {}
    this._tutTipBg.setStrokeStyle(1,this._tutColor||0x00ffcc,0.6);
    this.tweens.killTweensOf(this._tutTipTxt);
    this.tweens.killTweensOf(this._tutTipBg);
    this._tutTipTxt.setAlpha(0);
    this._tutTipBg.setAlpha(0);
    if(this._tutSkipBg)this._tutSkipBg.setAlpha(0.9);
    if(this._tutSkipTxt)this._tutSkipTxt.setAlpha(0.8);
    this.tweens.add({targets:[this._tutTipTxt,this._tutTipBg],alpha:1,duration:300});
  }

  _finishTutorial(){
    Save.set('tutorial_done',true);
    this._tutOnline=false;
    this._tutActive=false;
    this._tutStep=0;
    if(this._tutBullet){
      const idx=this.bullets.indexOf(this._tutBullet);
      if(idx>=0)this.bullets.splice(idx,1);
      this._tutBullet=null;
    }
    if(this._tutTipTxt){
      this.tweens.add({targets:[this._tutTipTxt,this._tutTipBg,this._tutSkipBg,this._tutSkipTxt],alpha:0,duration:300});
    }
    // Start the actual wave 1 (tutorial_done is now true so gate is skipped)
    this._startWave();
  }

  // Legacy alias — skip button at create() time still calls _tutDismissAll
  _tutDismissAll(){ this._finishTutorial(); }

  _updateTutorial(dt){
    if(!this._tutOnline)return;
    this._tutStepT=(this._tutStepT||0)+dt;
    const t=this.t;
    if(this._tutStep===1||this._tutStep===2){
      const tx=this._tutTargetX, ty=this._tutTargetY;
      const pulse=1+0.15*Math.sin(t*6);
      const alpha=0.55+0.4*Math.sin(t*4);
      this.gfxUi.lineStyle(2,this._tutColor,alpha);
      this.gfxUi.strokeCircle(tx,ty,40*pulse);
      this.gfxUi.lineStyle(1,this._tutColor,alpha*0.45);
      this.gfxUi.strokeCircle(tx,ty,62*pulse);
      this.gfxUi.fillStyle(this._tutColor,0.18);
      this.gfxUi.fillCircle(tx,ty,30);
      // Inner pulse dot
      this.gfxUi.fillStyle(this._tutColor,0.85);
      this.gfxUi.fillCircle(tx,ty,3+1.5*Math.sin(t*8));
      const dist=Math.hypot(this.px-tx,this.py-ty);
      if(dist<38)this._advanceTutorialStep();
    } else if(this._tutStep===3){
      if(!this._tutBullet){this._advanceTutorialStep();return;}
      if(this._tutBullet.reflected){
        // Reflected — let the bullet finish its flight before clearing
        this._tutBullet=null;
        this._advanceTutorialStep();
        return;
      }
      const b=this._tutBullet;
      if(b.x<-50||b.x>W+50||b.y<-50||b.y>H+50){
        const idx=this.bullets.indexOf(b);
        if(idx>=0)this.bullets.splice(idx,1);
        this._spawnTutorialBullet();
      }
    }
  }

  _updateBgLayers(dt){
    if(!this.circuitT)this.circuitT=0;
    this.circuitT+=dt;
    if(!this._bgGeom)return;
    const g=this._bgGeom;
    const t=this.circuitT;
    if(g.style==='traces'||g.style==='circuit'){
      g.traces.forEach(p=>{p.phase=(p.phase+dt*p.spd)%1;});
    }
    if(g.style==='glitch'){
      g.glitchLines.forEach(l=>{
        l.x+=l.spd*dt;
        if(l.x>W+400)l.x=-400;
        if(l.x<-400)l.x=W+400;
        l.t+=dt;
      });
      g.traces.forEach(p=>{p.blink+=dt*p.blinkSpd;});
    }
    if(g.style==='fractal'){
      g.fractalNodes.forEach(fn=>{fn.rot+=fn.rotSpd*dt;});
    }
  }

  _updateShockRings(dt){
    for(let i=this.shockRings.length-1;i>=0;i--){
      const r=this.shockRings[i];
      r.radius+=r.spd*dt;r.alpha-=dt*1.8;
      if(r.alpha<=0)this.shockRings.splice(i,1);
    }
  }

  _updatePingRings(dt){
    try{
      const prevPingCD=this.pingCooldownT;
      // Sandbox: ping CD always zero so bar stays full
      if(this._sandbox) this.pingCooldownT = 0;
      else if(this.pingCooldownT>0) this.pingCooldownT=Math.max(0,this.pingCooldownT-dt);
      if(prevPingCD>0&&this.pingCooldownT===0)this._powerReadyPulseT=1;
      const prevPowerCD=this.activePowerCD;
      if(this.activePowerCD>0&&prevPowerCD>0&&this.activePowerCD===0)this._powerReadyPulseT=1;
      for(let i=this.pingRings.length-1;i>=0;i--){
        const r=this.pingRings[i];
        if(!r.active){r.delayT-=dt;if(r.delayT<=0)r.active=true;continue;}
        r.radius+=r.spd*dt;
        r.alpha=0.9*(1-r.radius/r.maxRadius);
        if(r.radius>=r.maxRadius)this.pingRings.splice(i,1);
      }
    }catch(err){console.error('[PING UPDATE ERROR]',err);}
  }

  _updateFragments(dt){
    for(let i=this.fragParts.length-1;i>=0;i--){
      const f=this.fragParts[i];
      f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.88;f.vy*=0.88;
      f.rot+=f.rotSpd*dt;f.life-=dt*1.4;
      if(f.life<=0)this.fragParts.splice(i,1);
    }
  }

  _updateCorruptZones(dt){
    this.corruptZones.forEach(z=>{
      z.x+=z.vx*dt;z.y+=z.vy*dt;z.rot+=dt*0.05;
      if(z.x<-150)z.x=W+150;if(z.x>W+150)z.x=-150;
      if(z.y<-100)z.y=H+100;if(z.y>H+100)z.y=-100;
    });
  }

  _spawnDeathFragments(e){
    const x=e.x,y=e.y,col=e.color,sz=e.size;
    const type=e.type||'grunt';

    if(type==='grunt'){
      // Hex shards fly outward — 6 pieces
      for(let i=0;i<6;i++){
        const a=(Math.PI/3)*i+Math.random()*0.4;
        const spd=80+Math.random()*120;
        this.fragParts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:a,rotSpd:(Math.random()-0.5)*10,life:1,size:sz*0.45+Math.random()*sz*0.25,
          col,sides:6});
      }
      // Central flash
      this.fragParts.push({x,y,vx:0,vy:-20,rot:0,rotSpd:0,life:0.4,size:sz*0.8,col:0xffffff,sides:6});

    }else if(type==='sniper'){
      // Eye goes dark: 1 large piece collapses inward + 4 thin shards
      for(let i=0;i<4;i++){
        const a=(Math.PI/2)*i;const spd=100+Math.random()*80;
        this.fragParts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:a,rotSpd:6,life:0.8,size:sz*0.5,col,sides:4});
      }
      // Dark eye implode — center black piece
      this.fragParts.push({x,y,vx:0,vy:0,rot:0,rotSpd:0,life:0.5,size:sz*0.6,col:0x000000,sides:3});
      // Orange flash
      this.fragParts.push({x,y,vx:0,vy:0,rot:0,rotSpd:0,life:0.25,size:sz*1.2,col:0xff8800,sides:6});
      this._spawnParticles(x,y,0xff8800,8);

    }else if(type==='tank'){
      // Armor plates separate (6 large pieces) then core explodes
      for(let i=0;i<6;i++){
        const a=(Math.PI/3)*i+Math.random()*0.3;
        const spd=60+Math.random()*100;
        // Armor plate fragments — larger, slower
        this.fragParts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:a,rotSpd:(Math.random()-0.5)*5,life:1.2,size:sz*0.55+Math.random()*sz*0.2,
          col,sides:6});
      }
      // Core explosion — delayed bright burst
      this.time.delayedCall(120,()=>{
        this._spawnShockRing(x,y,0xff4444,140);
        this._spawnParticles(x,y,0xff2200,12);
        for(let i=0;i<8;i++){
          const a=(Math.PI/4)*i;
          this.fragParts.push({x,y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,
            rot:a,rotSpd:8,life:0.6,size:sz*0.25,col:0xff4444,sides:3});
        }
      });

    }else if(type==='swarm'){
      // Splits into 3 tiny sparks flying in different directions
      for(let i=0;i<5;i++){
        const a=Math.random()*Math.PI*2,spd=120+Math.random()*160;
        this.fragParts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:a,rotSpd:12,life:0.5+Math.random()*0.3,size:sz*0.35,col,sides:3});
      }
      // Bright flash
      this.fragParts.push({x,y,vx:0,vy:0,rot:0,rotSpd:0,life:0.18,size:sz*1.4,col:0xff88ff,sides:3});

    }else if(type==='rootkit'){
      // Glitches violently then static burst — flicker then disappear
      for(let i=0;i<8;i++){
        const a=Math.random()*Math.PI*2,spd=40+Math.random()*90;
        // Thin rectangular fragments like static noise
        this.fragParts.push({x:x+(Math.random()-0.5)*sz,y:y+(Math.random()-0.5)*sz,
          vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:Math.random()*Math.PI,rotSpd:(Math.random()-0.5)*15,
          life:0.4+Math.random()*0.4,size:sz*0.2+Math.random()*sz*0.3,
          col:Math.random()<0.5?col:0xffffff,sides:4});
      }
      // Green static burst
      this._spawnParticles(x,y,0x00ff88,10);
      this._spawnShockRing(x,y,0x00ff88,80);

    }else{
      // Default: generic fragments
      const n=6;
      for(let i=0;i<n;i++){
        const a=(Math.PI*2/n)*i+Math.random()*0.5,spd=60+Math.random()*100;
        this.fragParts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          rot:Math.random()*Math.PI,rotSpd:(Math.random()-0.5)*8,
          life:1,size:sz*0.4+Math.random()*sz*0.3,col,sides:n});
      }
    }

    // Elite: extra gold ring burst
    if(e.elite){
      this._spawnShockRing(x,y,0xffd700,180);
      this._spawnParticles(x,y,0xffd700,14);
      for(let i=0;i<5;i++){
        const a=(Math.PI*2/5)*i;
        this.fragParts.push({x,y,vx:Math.cos(a)*160,vy:Math.sin(a)*160,
          rot:a,rotSpd:6,life:0.7,size:sz*0.5,col:0xffd700,sides:6});
      }
    }
  }

  _spawnShockRing(x,y,col,spd=120){
    this.shockRings.push({x,y,radius:8,spd,alpha:0.7,col});
    this.shockRings.push({x,y,radius:4,spd:spd*0.6,alpha:0.4,col});
  }

  _updateEnemies(dt){
    for(let i=this.enemies.length-1;i>=0;i--){
      const e=this.enemies[i];
      if(e.isBoss){this._updateBoss(e,i,dt);continue;}
      if(this._sandbox&&this._sandboxNoAI){
        // AI off — still process collision with player but skip movement/shooting
        if(Math.hypot(e.x-this.px,e.y-this.py)<e.size+16){this._deathCause='ENEMY_CONTACT';this._die();return;}
        continue;
      }
      // Ghost step / phantom decoy targeting
      const tx=(this.decoyPos&&!e.isBoss)?this.decoyPos.x:this.px;
      const ty=(this.decoyPos&&!e.isBoss)?this.decoyPos.y:this.py;
      let targetX=tx,targetY=ty;
      if(this.ghostStepActive){
        // Ghost step: enemies wander randomly, don't target player
        targetX=e.x+(Math.random()-0.5)*200;targetY=e.y+(Math.random()-0.5)*200;
      } else if(this.decoyPos){
        const dDist=Math.hypot(this.decoyPos.x-e.x,this.decoyPos.y-e.y);
        if(dDist<400){targetX=this.decoyPos.x;targetY=this.decoyPos.y;}
      } else if(this.activeSkin==='phantom'&&this.phantomDecoys&&this.phantomDecoys.length>0){
        const dec=this.phantomDecoys[0];
        const dDist=Math.hypot(dec.x-e.x,dec.y-e.y);
        if(dDist<300){targetX=dec.x;targetY=dec.y;}
      }
      const dx=targetX-e.x,dy=targetY-e.y;
      const dist=Math.hypot(dx,dy)||1;

      let moveSpd=e.spd;
      if(e.type==='sniper'){
        // Snipers orbit at ~320px distance — always moving laterally
        const idealDist=320;
        const radial=(dist-idealDist)/idealDist; // positive = too close, negative = too far
        const tangentX=-dy/dist;const tangentY=dx/dist; // perpendicular direction
        const orbitSpd=e.spd*0.85;
        const approachSpd=e.spd*Math.abs(radial)*1.5;
        e.x+=(tangentX*orbitSpd - (dx/dist)*approachSpd*Math.sign(radial))*dt;
        e.y+=(tangentY*orbitSpd - (dy/dist)*approachSpd*Math.sign(radial))*dt;
        // Clamp to canvas bounds with 40px margin to keep visible and dodgeable
        e.x=Math.max(150,Math.min(W-150,e.x));
        e.y=Math.max(30,Math.min(H-60,e.y));
      } else if(e.type==='tank'){
        const slow=dist<200?0.5:1;
        const inSector=this.memSectors&&this.memSectors.some(ms=>e.x>ms.x&&e.x<ms.x+ms.w&&e.y>ms.y&&e.y<ms.y+ms.h);
        const fbTier=this.upg.firewall_breach||0;
        const sectorSlow=inSector?(fbTier>=2?0:fbTier===1?0.1:0.25):1; // tier1=strong slow, tier2+=full block
        if(!e.isBoss){if(!e._aliveT)e._aliveT=0;e._aliveT+=dt;}
        const decaySlow=this.upg.signal_decay>0&&!e.isBoss?Math.max(0.7,1-e._aliveT*0.02*this.upg.signal_decay):1;
        const ba2=this.upg.bubble_armor||0;
        const bubSlowMult2=(e._bubbleSlow&&ba2>=1)?(ba2>=4?0.5:ba2>=3?0.65:ba2>=2?0.75:0.85):1;
        e.x+=(dx/dist)*e.spd*slow*sectorSlow*decaySlow*bubSlowMult2*dt;
        e.y+=(dy/dist)*e.spd*slow*sectorSlow*decaySlow*bubSlowMult2*dt;
      } else {
        const pull=dist>500?1.7:dist>300?1.3:1.0;
        const ba3=this.upg.bubble_armor||0;
        const bubSlowMult3=(e._bubbleSlow&&ba3>=1)?(ba3>=4?0.5:ba3>=3?0.65:ba3>=2?0.75:0.85):1;
        e.x+=(dx/dist)*e.spd*pull*bubSlowMult3*dt;
        e.y+=(dy/dist)*e.spd*pull*bubSlowMult3*dt;
      }

      // Store motion trail
      if(!e.trail)e.trail=[];
      // ── New enemy type per-frame effects ──
      // ── SECTOR_00 ENEMY BEHAVIOURS ──
      if(e.type==='orbit_node'){
        // Orbits a fixed anchor point, fires toward player
        if(!e._orbitAnchor){e._orbitAnchor={x:Phaser.Math.Clamp(W/4+Math.random()*W/2,160,W-160),y:Phaser.Math.Clamp(100+Math.random()*(H-280),100,H-180)};e._orbitAngle=Math.random()*Math.PI*2;e._orbitR=60+Math.random()*40;}
        e._orbitAngle+=dt*(0.8+this.wave*0.04);
        e.x=e._orbitAnchor.x+Math.cos(e._orbitAngle)*e._orbitR;
        e.y=e._orbitAnchor.y+Math.sin(e._orbitAngle)*e._orbitR;
        // Keep anchor on screen
        e._orbitAnchor.x=Phaser.Math.Clamp(e._orbitAnchor.x,80,W-80);
        e._orbitAnchor.y=Phaser.Math.Clamp(e._orbitAnchor.y,80,H-80);
      }
      if(e.type==='pulsar'){
        // Clamp to visible area on first frame (spawn position may be off-screen edge)
        if(!e._pulsarT){
          e.x=Phaser.Math.Clamp(e.x,80,W-80);
          e.y=Phaser.Math.Clamp(e.y,80,H-80);
        }
        // Stationary — pulse gravity ring every 2s
        if(!e._pulsarT)e._pulsarT=1.5+Math.random();
        e._pulsarT-=dt;
        if(e._pulsarT<=0){
          e._pulsarT=2.0;
          // Bend nearby bullets
          this.bullets.forEach(b=>{
            if(b.reflected)return;
            const dx=b.x-e.x, dy=b.y-e.y, d=Math.hypot(dx,dy);
            if(d<160&&d>0){
              const pull=120/Math.max(d,20);
              b.vx-=(dx/d)*pull;
              b.vy-=(dy/d)*pull;
            }
          });
          // Visual ring
          this._spawnShockRing(e.x,e.y,0xaa44ff,160);
          e._pulseFlash=0.3;
        }
        if(e._pulseFlash>0)e._pulseFlash-=dt*3;
      }
      if(e.type==='drift_packet'){
        // Straight-line drift — fires burst when crossing player axis
        if(!e._driftDir){
          const dx=this.px-e.x, dy=this.py-e.y, d=Math.hypot(dx,dy)||1;
          e._driftDir={x:dx/d,y:dy/d};
          e._driftFired=false;
        }
        e.x+=e._driftDir.x*e.spd*dt;
        e.y+=e._driftDir.y*e.spd*dt;
        // Fire burst when near player's X or Y axis
        if(!e._driftFired){
          const nearX=Math.abs(e.x-this.px)<30;
          const nearY=Math.abs(e.y-this.py)<30;
          if(nearX||nearY){
            e._driftFired=true;
            for(let a=0;a<3;a++){
              const ang=Math.atan2(this.py-e.y,this.px-e.x)+(a-1)*0.3;
              this.bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*220,vy:Math.sin(ang)*220,col:0x00aaaa,reflected:false,size:5,trail:[]});
            }
          }
        }
      }
      if(e.type==='leech'){
        // LEECH: pursue player and overload bubble heat on contact
        const ldx=this.px-e.x,ldy=this.py-e.y,ld=Math.hypot(ldx,ldy);
        if(ld>1){e.x+=ldx/ld*e.spd*dt;e.y+=ldy/ld*e.spd*dt;}
        // Inject heat when within bubble radius (pushes player toward overheat)
        if(ld<this.bubbleRadius+e.size+4){
          this.bubbleHeat=Math.min(this._armorThresh||100,this.bubbleHeat+11*dt*(this._heatGainMult||1));
          e._clinging=true;
          // Pulse glow
          if(!e._clingPulse)e._clingPulse=0;
          e._clingPulse+=dt*8;
        } else {e._clinging=false;}
      }
      if(e.type==='bouncer'&&e._bounceFlash>0)e._bounceFlash=Math.max(0,e._bounceFlash-dt*4);
      if(e.type==='memory_trap'){e._trapTimer=Math.max(0,(e._trapTimer||6)-dt);}
      if(e.type==='phantom'&&e._isGhost){
        // Ghost copy — count down life, fire slow shots
        if(!e._ghostLife)e._ghostLife=3;
        e._ghostLife-=dt;
        if(e._ghostLife<=0){this.enemies.splice(i,1);continue;}
        e.sT-=dt;
        if(e.sT<=0){
          e.sT=e.sInt;
          this._shoot(e.x,e.y,this.px,this.py,90,e.color,false,'phantom');
        }
      }
      // ── Mutation per-frame effects ──
      if(e._mut){
        if(e._mut==='magnetic'&&this.bullets){
          this.bullets.forEach(b=>{
            if(!b.reflected)return;
            const dx2=e.x-b.x,dy2=e.y-b.y,d2=Math.hypot(dx2,dy2);
            if(d2<160&&d2>0){b.vx+=(dx2/d2)*55*dt;b.vy+=(dy2/d2)*55*dt;}
          });
        }
        if(e._mut==='mirror'&&this.bullets){
          this.bullets.forEach(b=>{
            if(!b.reflected||b._mirrorBounced)return;
            const d2=Math.hypot(e.x-b.x,e.y-b.y);
            if(d2<36){b.vx=-b.vx;b.vy=-b.vy;b.reflected=false;b._mirrorBounced=true;b.col=0xff4444;}
          });
        }
        if(e._mut==='regenerating'){
          if(!e._regenNoHitT)e._regenNoHitT=0;
          e._regenNoHitT+=dt;
          if(e._regenNoHitT>3){e.hp=Math.min(e.maxHp,e.hp+0.4*dt);}
        }
        if(e._mut==='phase'&&!e._phaseCooling&&e.hp<=e.maxHp*0.5){
          e._phaseCooling=true;
          const ang=Math.random()*Math.PI*2;
          e.x=Phaser.Math.Clamp(this.px+Math.cos(ang)*280,60,W-60);
          e.y=Phaser.Math.Clamp(this.py+Math.sin(ang)*280,60,H-60);
          this._spawnParticles(e.x,e.y,e._mutCol||0x88ffff,6);
        }
      }
      e.trail.push({x:e.x,y:e.y});
      if(e.trail.length>8)e.trail.shift();

      e.angle+=dt*(e.type==='swarm'?5:2);

      // ── Stun system ──
      if(e.stunned){
        e.stunT-=dt;
        e.color=Math.sin(this.t*12)>0?0xffffff:(e._origColor||0xff3232);
        // Reset sniper charge on stun
        if(e.type==='sniper'){e.charging=false;e.chargeT=0;}
        if(e.stunT<=0){
          e.stunned=false;
          e.color=e._origColor||0xff3232;
          this._spawnParticles(e.x,e.y,0xffffff,4);
        } else {
          e.angle+=dt*1.5;
          continue;
        }
      }

      // ── FEATURE 4: Defected enemy behavior ──
      if(e.defected){
        e.defectT-=dt;
        if(e.defectT<=0){
          // Defect timer expired — die
          const ex=e.x,ey=e.y,ec=e.color;
          this._killEnemy(e,i,false);
          this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);});
          continue;
        }
        // Attack nearest non-defected enemy instead of player
        let nearestFoe=null,nearestDist=9999;
        this.enemies.forEach(f=>{
          if(f===e||f.defected)return;
          const fd=Math.hypot(f.x-e.x,f.y-e.y);
          if(fd<nearestDist){nearestDist=fd;nearestFoe=f;}
        });
        if(nearestFoe){
          // Move toward nearest enemy
          const fdx=nearestFoe.x-e.x,fdy=nearestFoe.y-e.y;
          const fd=Math.hypot(fdx,fdy)||1;
          e.x+=fdx/fd*e.spd*1.3*dt;e.y+=fdy/fd*e.spd*1.3*dt;
          // Shoot at nearest enemy
          e.sT+=dt;
          if(e.sT>=e.sInt*0.5){
            e.sT=0;
            this._shoot(e.x,e.y,nearestFoe.x,nearestFoe.y,380,e.color,true);
          }
          // Contact damage to enemy
          if(nearestDist<e.size+nearestFoe.size+5){
            nearestFoe.hp-=0.5;
            if(nearestFoe.hp<=0){
              const ex=nearestFoe.x,ey=nearestFoe.y,ec=nearestFoe.color;
              const fi=this.enemies.indexOf(nearestFoe);
              if(fi>-1){this._killEnemy(nearestFoe,fi,false);if(fi<i)i--;this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);});}
            }
          }
        } else {
          // No foes left — orbit player
          const da=Math.atan2(this.py-e.y,this.px-e.x)+Math.PI/2;
          e.x+=Math.cos(da)*e.spd*dt;e.y+=Math.sin(da)*e.spd*dt;
        }
        // Don't run normal movement/shoot code
      }

      if(!e.defected){
      // ── Bubble DoT — scales with bubble_armor tier ──
      if(this.bubbleRadius>10&&dist<this.bubbleRadius&&!e.isBoss){
        const ba=this.upg.bubble_armor||0;
        const dotInterval=ba>=3?0.4:ba>=2?0.6:ba>=1?0.6:0.8;
        const dotDmg=(ba>=4?3:ba>=2?2:1)*(this.surgeActive?2:1);
        if(!e.dotT)e.dotT=0;
        e.dotT+=dt;
        if(e.dotT>=dotInterval){
          e.dotT=0;e.hp-=dotDmg;e._bubbleSlow=true;
          this._spawnParticles(e.x,e.y,ba>=2?0xff6600:0x00ffcc,Math.min(ba+2,6));
          if(ba>=3){if(!e._dotCorruptT)e._dotCorruptT=0;e._dotCorruptT+=dotInterval;if(e._dotCorruptT>=(ba>=4?1.5:2.0)){e._dotCorruptT=0;if(!e.corruptions)e.corruptions=0;e.corruptions++;const ct=this.upg.corrupt_data>0?2:3;if(e.corruptions>=ct&&!e.defected){e.defected=true;e.color=this.shipColor;e.defectT=6;this._maxDefected++;}}}

          if(e.hp<=0){const ex=e.x,ey=e.y,ec=e.color;if(ba>=4)this._chainExplosion(ex,ey,0x00ffcc,0);this._killEnemy(e,i,false);this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);});continue;}
        } else if(!this.pressing||this.bubbleRadius<=10){e.dotT=0;e._bubbleSlow=false;e._dotCorruptT=0;}
      } else {
        e.dotT=0; // reset if enemy leaves bubble
      }
      if(!e.stunned&&e.type!=='sniper')e.sT+=dt; // snipers use chargeT, stunned skip
      // SNIPER: charge-and-fire cycle (drives the targeting laser render at L5239)
      if(e.type==='sniper'&&!e.stunned){
        if(!e.charging){
          e.sT=(e.sT||0)+dt;
          if(e.sT>=e.sInt){e.charging=true;e.chargeT=0;e.sT=0;}
        } else {
          e.chargeT=(e.chargeT||0)+dt;
          if(e.chargeT>=0.5){
            this._shoot(e.x,e.y,this.px,this.py,540,0xff8800,false,'sniper');
            e.charging=false;e.chargeT=0;
          }
        }
      }
      // Charge-up countdown for enemies that are charging
      if(e._chargeUp){e._chargeUp.t-=dt;}
      // Fire when sT triggers — but only if not charging, or charge completed
      if(e.sT>=e.sInt&&e.type!=='sniper'&&!e.stunned){
        // Start charge for grunt/tank, or fire immediately for others
        if((e.type==='grunt'||e.type==='tank')&&!e._chargeUp){
          const chargeDur={grunt:0.4,tank:0.6}[e.type]||0.45;
          const chargeCol={grunt:0xffff00,tank:0xff2244}[e.type]||0xffdd00;
          e._chargeUp={t:chargeDur,max:chargeDur,color:chargeCol};
        } else if(!e._chargeUp||e._chargeUp.t<=0){
          // Charge complete or not charging — fire now
          e.sT=0;
          e._chargeUp=null;
          if(e.type==='rootkit'&&!e.revealed){
            // Reveal first (0.5s warning), then fire 2-bullet burst, then hide
            e.visible=true;
            e.flashT=0.8;
            // Pre-compute predicted target for aim-lead (bullet speed 380)
            const _bulletSpd=380;
            const _tt=Math.hypot(this.px-e.x,this.py-e.y)/_bulletSpd;
            const _lead=0.6;
            const _vx=(this.playerVxSmooth!=null)?this.playerVxSmooth:(this.playerVx||0);
            const _vy=(this.playerVySmooth!=null)?this.playerVySmooth:(this.playerVy||0);
            const _tx=this.px+_vx*_tt*_lead;
            const _ty=this.py+_vy*_tt*_lead;
            const baseBa=Math.atan2(_ty-e.y,_tx-e.x);
            for(let b=0;b<2;b++){
              const a=baseBa+(b-0.5)*0.4;
              this.time.delayedCall(500+b*60,()=>{
                if(!this._dead)this._shoot(e.x,e.y,e.x+Math.cos(a)*100,e.y+Math.sin(a)*100,_bulletSpd,0x00ff88,false,'rootkit');
              });
            }
            this.time.delayedCall(750,()=>{if(!e.revealed)e.visible=false;});
          } else if(e.type==='tank'){
            // Apply prediction to target, then offset bullets around predicted point
            const _bulletSpd=260;
            const _tt=Math.hypot(this.px-e.x,this.py-e.y)/_bulletSpd;
            const _lead=0.6;
            const _vx=(this.playerVxSmooth!=null)?this.playerVxSmooth:(this.playerVx||0);
            const _vy=(this.playerVySmooth!=null)?this.playerVySmooth:(this.playerVy||0);
            const _tx=this.px+_vx*_tt*_lead;
            const _ty=this.py+_vy*_tt*_lead;
            const ba=Math.atan2(_ty-e.y,_tx-e.x);
            for(let s=-1;s<=1;s++)this._shoot(e.x,e.y,e.x+Math.cos(ba+s*0.3)*100,e.y+Math.sin(ba+s*0.3)*100,_bulletSpd,0xff3232,false,'tank');
          } else if(e.type==='sniper'){
            this._shoot(e.x,e.y,this.px,this.py,420,0xff8800,false,'sniper');
          } else if(e.type!=='rootkit'){
            this._shoot(e.x,e.y,this.px,this.py,340,0xff3232,false,e.type||'');
          }
        }
      }
      // Rootkit flash timer
      if(e.type==='rootkit'&&e.flashT>0){e.flashT-=dt;if(e.flashT<=0&&!e.revealed)e.visible=false;}

      if(dist<e.size+18&&this.invincT<=0){
        // ── Electricity arcs at high combo ──
    if(this.combo>=5){
      const arcCount=this.combo>=20?8:this.combo>=10?5:3;
      const arcLen=this.combo>=20?60:this.combo>=10?40:25;
      const arcCol=this.combo>=20?0xffd700:this.combo>=10?0xff6600:0xffdd00;
      const arcAlpha=0.4+0.3*Math.sin(this.t*8);
      for(let a=0;a<arcCount;a++){
        const baseAng=(Math.PI*2/arcCount)*a+this.t*3;
        const startR=22;
        let cx=this.px+Math.cos(baseAng)*startR;
        let cy=this.py+Math.sin(baseAng)*startR;
        this.gfxMain.lineStyle(1,arcCol,arcAlpha);
        this.gfxMain.beginPath();this.gfxMain.moveTo(cx,cy);
        const segs=4;
        for(let s=0;s<segs;s++){
          cx+=Math.cos(baseAng)*(arcLen/segs)+(Math.random()-0.5)*12;
          cy+=Math.sin(baseAng)*(arcLen/segs)+(Math.random()-0.5)*12;
          this.gfxMain.lineTo(cx,cy);
        }
        this.gfxMain.strokePath();
      }
    }

    if(this._sandbox){/* sandbox: enemy stays, player invincible */}
        else if(this.shieldActive){this._hitShield();this.enemies.splice(i,1);this._spawnParticles(e.x,e.y,0xffdd00,10);}
        else{this._die();return;}
      }
      // Ghost trace: trail damages enemies
      const gtLen=this.upg.ghost_trace>=3?20:this.upg.ghost_trace>=2?12:6;
      if(this.upg.ghost_trace>0&&this.packetTrace&&!e.defected){
        try{
          for(const tr of this.packetTrace){
            if((tr.a||0)>0.25&&Math.hypot(e.x-tr.x,e.y-tr.y)<16){
              if(!e.traceHitT)e.traceHitT=0;
              e.traceHitT+=dt;
              if(e.traceHitT>=1){e.traceHitT=0;e.hp-=1;if(e.hp<=0){const ex=e.x,ey=e.y,ec=e.color;this._killEnemy(e,i,false);this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);});}}
              break;
            }
          }
        }catch(err){console.error('[GHOST_TRACE]',err);}
      }
      } // end if(!e.defected)

      // ── Off-playfield silent cull — enemies stuck in HUD region (where bubble can't reach)
      // for >4s get spliced WITHOUT incrementing kills/score/shards. Bosses + defected exempt.
      if(!e.isBoss && !e.defected){
        const inPlayfield = e.x >= 150 && e.x <= W-150 && e.y >= 30 && e.y <= H-60;
        if(inPlayfield){
          e._offFieldT = 0;
        } else {
          e._offFieldT = (e._offFieldT || 0) + dt;
          if(e._offFieldT >= 4){
            this.enemies.splice(i, 1);
            continue;
          }
        }
      }
      // ── FEATURE 6: Adaptive AI — track reflect side, bias spawn ──
      if(e.x<-350||e.x>W+350||e.y<-350||e.y>H+350)this.enemies.splice(i,1);
    }
  }

  _updateBoss(boss,idx,dt){
    try{
      boss.pT+=dt;boss.sT+=dt;
      const t=this.t;
      if(this._sandbox&&this._sandboxNoAI){
        // AI off — stop movement and shooting, still allow phase transitions via HP
        if(Math.hypot(boss.x-this.px,boss.y-this.py)<boss.size+16){this._deathCause='BOSS_CONTACT';this._die();return;}
        return;
      }
      const spd=boss.phase===3?110:boss.phase===2?75:85;

      // ── ENTRY animation — distinct per boss ──
      if(boss.entering){
        boss.entryT=(boss.entryT||0)+dt;
        if(boss.baseName==='FIREWALL'){
          // Fast slam — drops quickly, leaves scanline streak
          boss.y+=220*dt;
          if(boss.entryT<0.3){
            // Scanline streaks during entry
            for(let s=0;s<2;s++){
              this.particles.push({x:boss.x+(Math.random()-0.5)*boss.size,y:boss.y+boss.size,
                vx:(Math.random()-0.5)*20,vy:80+Math.random()*60,
                life:0.4,decay:2.5,col:boss.color,size:2+Math.random()*3});
            }
          }
          if(boss.y>=150){
            boss.y=150;boss.entering=false;
            if(Settings.get('shake'))this.cameras.main.shake(250,0.025);
            this._spawnShockRing(boss.x,boss.y,boss.color,200);
          }
        } else if(boss.baseName==='VOID.NODE'){
          // Flicker teleport — blinks in 3 times
          boss.entryT=(boss.entryT||0);
          const blinks=[0.2,0.5,0.8];
          const visible=blinks.some(b=>Math.abs(boss.entryT-b)<0.08);
          boss._entryVisible=visible||boss.entryT>1.0;
          if(!boss._entryVisible){boss.x=W/2+(Math.random()-0.5)*60;boss.y=80+Math.random()*80;}
          if(blinks.some(b=>Math.abs(boss.entryT-b)<0.02))CRT.glitch(0.2);
          if(boss.entryT>=1.2){
            boss.x=W/2;boss.y=150;boss.entering=false;boss._entryVisible=true;
            this._spawnParticles(boss.x,boss.y,boss.color,20);
          }
        } else if(boss.baseName==='GHOST.EXE'){
          // Slow fade-in — appears from nothing
          boss.y=150;
          boss.ghostAlpha=Math.min(1,boss.entryT/1.5);
          if(boss.entryT>=1.5){boss.entering=false;boss.ghostAlpha=1;}
        } else if(boss.baseName==='CORE.BREACH'){
          // Heavy slam with distortion
          boss.y=Math.max(150,-200+boss.entryT*1200);
          if(boss.y>=150){
            boss.y=150;boss.entering=false;
            if(Settings.get('shake'))this.cameras.main.shake(400,0.035);
            if(Settings.get('shake'))this.cameras.main.flash(300,(boss.color>>16)&0xff,(boss.color>>8)&0xff,boss.color&0xff,0.25);
            for(let i=0;i<3;i++)this._spawnShockRing(boss.x,boss.y,boss.color,180+i*60);
          }
        } else {
          // Default
          boss.y+=60*dt;
          if(boss.y>=150){boss.y=150;boss.entering=false;}
        }
        if(boss.entering){boss.moveTargetX=W/2;boss.moveTargetY=160;return;}
      }

      // ── Phase transitions ──
      const hpFrac=boss.hp/boss.maxHp;
      if(boss.phase===1&&hpFrac<boss.phaseThresholds[0]){
        boss.phase=2;boss.encryptedT=5; // 5s encrypted
        this.banner.mini(`${boss.name} · PHASE 2`,'#ff8800',1400);
        CRT.glitch(0.5);
        this._spawnParticles(boss.x,boss.y,boss.color,30);
        if(Settings.get('shake'))this.cameras.main.shake(400,0.015);
        this._sysLog(`[BOSS] ${boss.name} ENTERED ENCRYPTED PHASE`);
        this._bossPhaseTransitionBeat(boss,2);
      }
      if(boss.phase===2&&hpFrac<boss.phaseThresholds[1]){
        boss.phase=3;boss.encryptedT=0;
        this._hitStop(100,0xff2244); // I10 — phase 3 entry hit-stop
        Snd.play('phase');
        this.banner.mini(`${boss.name} · RAGE MODE`,'#ff2244',1400);
        CRT.glitch(0.8);
        this._spawnParticles(boss.x,boss.y,boss.color,50);
        if(Settings.get('shake'))this.cameras.main.shake(600,0.025);
        this._sysLog(`[BOSS] ${boss.name} RAGE MODE ACTIVATED`);
        this._bossPhaseTransitionBeat(boss,3);
      }

      // Encrypted phase timer
      if(boss.encryptedT>0){boss.encryptedT=Math.max(0,boss.encryptedT-dt);}

      // ── Rotating weak point ──
      const wpSpeed=boss.phase===3?2.8:boss.phase===2?1.8:1.2;
      boss.weakAngle=(boss.weakAngle||0)+wpSpeed*dt;
      boss.weakHit=false;

      // ── Boss-specific movement + shooting ──
      boss.shootCooldown=Math.max(0,boss.shootCooldown-dt);
      boss.moveCooldown=Math.max(0,boss.moveCooldown-dt);
      const fireRate=boss.phase===3?0.45:boss.phase===2?0.7:0.9;

      if(boss.baseName==='FIREWALL'){
        this._updateFirewall(boss,dt,spd,fireRate);
      } else if(boss.baseName==='VOID.NODE'){
        this._updateVoidNode(boss,dt,spd,fireRate);
      } else if(boss.baseName==='GHOST.EXE'){
        this._updateGhostExe(boss,dt,spd,fireRate);
      } else if(boss.baseName==='CORE.BREACH'){
        this._updateCoreBreach(boss,dt,spd,fireRate);
      }

      // Contact damage
      if(Math.hypot(boss.x-this.px,boss.y-this.py)<boss.size+16){this._deathCause='BOSS_CONTACT';this._die();return;}

    }catch(e){console.error('[UPDATE BOSS]',e);}
  }

  _bossPhaseTransitionBeat(boss,newPhase){
    // #10 Brief freeze + radial burst when boss enters a new phase
    const col=newPhase===3?0xff2244:0xff8800;
    // Freeze game time briefly
    this._beatFreezeT=(this._beatFreezeT||0)+0.32;
    // Big shockwave from boss
    this._spawnShockRing(boss.x,boss.y,col,boss.size*2.5);
    this.time.delayedCall(80,()=>this._spawnShockRing(boss.x,boss.y,col,boss.size*1.5));
    this.time.delayedCall(160,()=>this._spawnShockRing(boss.x,boss.y,0xffffff,boss.size));
    // White flash overlay
    try{
      const fl=this.add.rectangle(W/2,H/2,W,H,0xffffff,0).setDepth(80);
      this.tweens.add({targets:fl,alpha:{from:newPhase===3?0.45:0.25,to:0},duration:380,ease:'Power2',
        onComplete:()=>fl.destroy()});
    }catch{}
    // Phase label pop
    try{
      const lbl=newPhase===3?'⚠ RAGE MODE':'⚡ PHASE 2';
      const hexC=newPhase===3?'#ff2244':'#ff8800';
      const pt=this.add.text(boss.x,boss.y-boss.size-20,lbl,{
        fontFamily:"'Orbitron',sans-serif",fontSize:'18px',fontStyle:'900',color:hexC
      }).setOrigin(0.5).setDepth(70);
      this.tweens.add({targets:pt,y:boss.y-boss.size-60,alpha:0,duration:900,ease:'Power2',
        onComplete:()=>pt.destroy()});
    }catch{}
  }

  _updateFirewall(boss,dt,spd,fireRate){
    // FIREWALL.SYS — perimeter defence daemon
    //  P1 PERIMETER SCAN   — horizontal patrol, telegraphed sweep beams + aimed 3-bursts
    //  P2 PARTITION        — recenters, raises horizontal energy walls with sliding gaps
    //  P3 CASCADE BREACH   — erratic, dual partitions + diagonal beams + dense spreads
    if(!boss.partitions)boss.partitions=[];
    if(!boss.scanBeams)boss.scanBeams=[];
    if(!boss._fwActionT)boss._fwActionT=0;
    boss._fwActionT+=dt;

    // ── Movement ──
    if(boss.phase===1){
      // Slow horizontal patrol along upper third
      if(boss._fwPatrolDir===undefined)boss._fwPatrolDir=1;
      boss.x+=boss._fwPatrolDir*70*dt;
      if(boss.x>W-160){boss._fwPatrolDir=-1;}
      else if(boss.x<160){boss._fwPatrolDir=1;}
      boss.y=130+Math.sin(boss.pT*0.8)*14;
    } else if(boss.phase===2){
      // Anchor near center, gentle bob
      const tx=W/2, ty=170;
      boss.x+=(tx-boss.x)*Math.min(1,dt*1.6);
      boss.y+=(ty-boss.y)*Math.min(1,dt*1.6)+Math.sin(boss.pT*1.5)*0.3;
      // ── Wall-segment mechanic: spawn 4 destructible segments on first phase-2 tick ──
      // Core takes 0 damage while any segment is alive (redirect handled at hit site).
      if(!boss._fwSegments){
        const baseAng = Math.random()*Math.PI*2;
        boss._fwSegments = [];
        for(let i=0; i<4; i++){
          boss._fwSegments.push({
            hp: 6, maxHp: 6,
            angle: baseAng + (Math.PI*2/4)*i,
            shootCD: 1.6 + Math.random()*0.8,
          });
        }
        boss._fwRespawnPending = false;
        boss._fwRespawnT = 0;
        if(this.banner) this.banner.mini('WALL_SEG ACTIVE · BREAK SEGMENTS','#ff8800',1800);
      }
    } else {
      // Erratic warps every ~1.2s to a new quadrant
      if(boss._fwWarpT===undefined)boss._fwWarpT=1.2;
      boss._fwWarpT-=dt;
      if(boss._fwWarpT<=0){
        boss._fwWarpT=1.0+Math.random()*0.6;
        const tx=180+Math.random()*(W-360);
        const ty=110+Math.random()*120;
        this._spawnParticles(boss.x,boss.y,boss.color,10);
        boss.x=tx;boss.y=ty;
        this._spawnParticles(boss.x,boss.y,0xffaa00,12);
        CRT.glitch(0.18);
      }
    }

    // ── Update active partitions ──
    this._fwUpdatePartitions(boss,dt);
    // ── Update active scan beams ──
    this._fwUpdateScanBeams(boss,dt);

    // ── Wall-segment lifecycle (phase 2 only; cleared on entering phase 3) ──
    if(boss.phase===2 && boss._fwSegments){
      const orbitSpd = 0.75;
      let aliveCount = 0;
      boss._fwSegments.forEach(seg => {
        seg.angle += dt * orbitSpd;
        if(seg.hp > 0){
          aliveCount++;
          seg.shootCD -= dt;
          if(seg.shootCD <= 0){
            seg.shootCD = 2.0 + Math.random()*0.8;
            const sx = boss.x + Math.cos(seg.angle) * boss.size * 0.95;
            const sy = boss.y + Math.sin(seg.angle) * boss.size * 0.95;
            this._shoot(sx, sy, this.px, this.py, 180, 0xff4422);
          }
        }
      });
      if(aliveCount === 0 && !boss._fwRespawnPending){
        boss._fwRespawnPending = true;
        boss._fwRespawnT = 6.0; // 6s exposure window before regen
        if(this.banner) this.banner.mini('CORE EXPOSED · 6s WINDOW','#ff8800',1500);
      }
      if(boss._fwRespawnPending){
        boss._fwRespawnT -= dt;
        if(boss._fwRespawnT <= 0){
          boss._fwRespawnPending = false;
          // Revive 2 segments at random positions
          const baseAng = Math.random()*Math.PI*2;
          let revived = 0;
          for(let i=0; i<boss._fwSegments.length && revived < 2; i++){
            if(boss._fwSegments[i].hp <= 0){
              boss._fwSegments[i].hp = 5;
              boss._fwSegments[i].maxHp = 5;
              boss._fwSegments[i].angle = baseAng + revived * Math.PI;
              boss._fwSegments[i].shootCD = 1.5 + Math.random();
              revived++;
            }
          }
          if(revived > 0 && this.banner) this.banner.mini('WALL_SEG REGEN','#ff8800',1100);
          this._spawnParticles(boss.x, boss.y, 0xff4422, 24);
        }
      }
    }
    // Clear segments outside phase 2
    if(boss.phase !== 2 && boss._fwSegments){
      boss._fwSegments = null;
      boss._fwRespawnPending = false;
    }

    // ── Per-phase attack scheduling ──
    if(boss.phase===1){
      // Scan beam every ~4s, 3-burst between
      if(!boss._fwBeamT)boss._fwBeamT=2.0;
      boss._fwBeamT-=dt;
      if(boss._fwBeamT<=0){
        boss._fwBeamT=3.8+Math.random()*0.8;
        // Alternate horizontal / vertical
        const horiz=Math.random()<0.6;
        if(horiz){
          const y=110+Math.random()*(H-220);
          this._fwSpawnScanBeam(boss,0,y,W,y,1.2,0.8);
        } else {
          const x=200+Math.random()*(W-400);
          this._fwSpawnScanBeam(boss,x,0,x,H,1.2,0.8);
        }
      }
      // Aimed 3-burst
      if(boss.shootCooldown<=0){
        boss.shootCooldown=fireRate+0.2;
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        Snd.play('shoot');
        for(let s=-1;s<=1;s++){
          this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+s*0.18)*100,boss.y+Math.sin(ba+s*0.18)*100,210,boss.color);
        }
      }
    } else if(boss.phase===2){
      // Partition cycle: deploy a wall every ~4.5s, max 3 active
      if(!boss._fwPartT)boss._fwPartT=1.5;
      boss._fwPartT-=dt;
      if(boss._fwPartT<=0&&boss.partitions.length<3){
        boss._fwPartT=4.2+Math.random()*0.8;
        // Choose a Y in lower half playfield (avoid top HUD + boss)
        const y=Math.max(260,Math.min(H-90,260+Math.random()*(H-360)));
        // Gap starts at random x, slides direction random
        const gapW=140;
        const gapX=80+Math.random()*(W-160-gapW);
        const gapVel=(Math.random()<0.5?1:-1)*60;
        this._fwSpawnPartition(boss,y,gapX,gapW,gapVel,8.0);
      }
      // Aimed bullets through gaps every fireRate*1.4
      if(boss.shootCooldown<=0){
        boss.shootCooldown=fireRate*1.5;
        Snd.play('shoot');
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        this._shoot(boss.x,boss.y,this.px,this.py,200,boss.color);
        this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+0.4)*100,boss.y+Math.sin(ba+0.4)*100,180,boss.color);
        this._shoot(boss.x,boss.y,boss.x+Math.cos(ba-0.4)*100,boss.y+Math.sin(ba-0.4)*100,180,boss.color);
      }
    } else {
      // Phase 3: dual partitions max, frequent diagonal beams, dense aimed spreads
      if(!boss._fwPartT)boss._fwPartT=1.2;
      boss._fwPartT-=dt;
      if(boss._fwPartT<=0&&boss.partitions.length<2){
        boss._fwPartT=5.5;
        const y=Math.max(280,Math.min(H-100,260+Math.random()*(H-360)));
        const gapW=160;
        const gapX=80+Math.random()*(W-160-gapW);
        const gapVel=(Math.random()<0.5?1:-1)*90;
        this._fwSpawnPartition(boss,y,gapX,gapW,gapVel,6.0);
      }
      if(!boss._fwBeamT)boss._fwBeamT=1.5;
      boss._fwBeamT-=dt;
      if(boss._fwBeamT<=0){
        boss._fwBeamT=2.4+Math.random()*0.6;
        // Diagonal: pivot around boss, project across screen
        const ang=(Math.random()-0.5)*Math.PI*0.7+Math.PI*0.5;
        const reach=900;
        const cx=boss.x,cy=boss.y;
        this._fwSpawnScanBeam(boss,cx-Math.cos(ang)*reach,cy-Math.sin(ang)*reach,
                                   cx+Math.cos(ang)*reach,cy+Math.sin(ang)*reach,0.9,0.6);
      }
      // Rage spread
      if(boss.shootCooldown<=0){
        boss.shootCooldown=fireRate*0.7;
        Snd.play('shoot');
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        for(let s=-2;s<=2;s++){
          this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+s*0.14)*100,boss.y+Math.sin(ba+s*0.14)*100,260,boss.color);
        }
        // Radial flare every 3rd cycle
        boss._fwRageBurst=(boss._fwRageBurst||0)+1;
        if(boss._fwRageBurst>=3){
          boss._fwRageBurst=0;
          for(let a=0;a<10;a++){
            const ang=(Math.PI*2/10)*a+boss.pT*0.7;
            this.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*180,vy:Math.sin(ang)*180,
              col:0xff8800,reflected:false,size:6,trail:[]});
          }
        }
      }
    }
  }

  _fwSpawnPartition(boss,y,gapX,gapW,gapVel,life){
    boss.partitions.push({
      y,gapX,gapW,gapVel,life,maxLife:life,
      built:0, // 0→1 build-up animation
    });
    if(this.banner)this.banner.mini('PARTITION · mind the gap','#ff6600',900);
    this._sysLog&&this._sysLog('[FIREWALL] partition deployed');
    Snd.play('shoot');
  }

  _fwUpdatePartitions(boss,dt){
    if(!boss.partitions||!boss.partitions.length)return;
    const yPlayer=this.py,xPlayer=this.px;
    for(let i=boss.partitions.length-1;i>=0;i--){
      const p=boss.partitions[i];
      p.life-=dt;
      p.built=Math.min(1,p.built+dt*1.7); // build-up over ~0.6s as telegraph
      // Slide gap
      p.gapX+=p.gapVel*dt;
      if(p.gapX<60){p.gapX=60;p.gapVel=Math.abs(p.gapVel);}
      else if(p.gapX>W-60-p.gapW){p.gapX=W-60-p.gapW;p.gapVel=-Math.abs(p.gapVel);}
      // Player collision: only when wall fully built and player is within wall band
      if(p.built>=1&&this.invincT<=0&&!this._dead){
        const inBand=Math.abs(yPlayer-p.y)<9;
        const inGap=xPlayer>=p.gapX&&xPlayer<=p.gapX+p.gapW;
        if(inBand&&!inGap){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();}
          else{this._deathCause='FIREWALL_WALL';this._die();return;}
        }
      }
      if(p.life<=0){
        // Dissolve burst
        for(let s=0;s<8;s++){
          this.particles.push({x:Math.random()*W,y:p.y,vx:(Math.random()-0.5)*40,vy:(Math.random()-0.5)*40,
            life:0.6,decay:1.4,col:0xff6600,size:2+Math.random()*2});
        }
        boss.partitions.splice(i,1);
      }
    }
  }

  _fwSpawnScanBeam(boss,x1,y1,x2,y2,teleDur,fireDur){
    boss.scanBeams.push({x1,y1,x2,y2,t:0,teleDur,fireDur,phase:'tele'});
    if(this._sysLog)this._sysLog('[FIREWALL] scan beam locked');
  }

  _fwUpdateScanBeams(boss,dt){
    if(!boss.scanBeams||!boss.scanBeams.length)return;
    const px=this.px,py=this.py;
    for(let i=boss.scanBeams.length-1;i>=0;i--){
      const b=boss.scanBeams[i];
      b.t+=dt;
      if(b.phase==='tele'&&b.t>=b.teleDur){
        b.phase='fire';b.t=0;
        Snd.play('shoot');
        if(Settings.get('shake'))this.cameras.main.shake(120,0.008);
      } else if(b.phase==='fire'&&b.t>=b.fireDur){
        boss.scanBeams.splice(i,1);
        continue;
      }
      // Damage check during fire phase: player within 8px of line segment
      if(b.phase==='fire'&&this.invincT<=0&&!this._dead){
        const vx=b.x2-b.x1, vy=b.y2-b.y1;
        const lenSq=vx*vx+vy*vy;
        const tn=Math.max(0,Math.min(1,((px-b.x1)*vx+(py-b.y1)*vy)/lenSq));
        const cx=b.x1+vx*tn, cy=b.y1+vy*tn;
        const d=Math.hypot(px-cx,py-cy);
        if(d<10){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();}
          else{this._deathCause='FIREWALL_BEAM';this._die();return;}
        }
      }
    }
  }

  _updateVoidNode(boss,dt,spd,fireRate){
    // VOID.NODE — null-data singularity
    //  P1 EVENT HORIZON  — anchor, lethal pulsing void disk + radial void pulses + boss-gravity drift
    //  P2 GRAVITY RING   — 6 orbiting mini-singularities bend bullets; ring contracts periodically
    //  P3 NULL RIFT      — 3 attendant null-zones delete bullets; cluster on boss every ~5s
    if(!boss.voidDisk)boss.voidDisk={r:40,phase:0};
    if(!boss.gravityRing)boss.gravityRing={nodes:null,rotSpd:0.6,contractT:6,contracted:false,contractDur:0};
    if(!boss.nullZones)boss.nullZones=null;
    if(!boss.expRings)boss.expRings=[];

    // ── Movement ──
    if(boss.phase===1){
      // Anchor near center, gentle drift
      const tx=W/2, ty=185;
      boss.x+=(tx-boss.x)*Math.min(1,dt*1.4)+Math.sin(boss.pT*0.9)*8*dt;
      boss.y+=(ty-boss.y)*Math.min(1,dt*1.4)+Math.cos(boss.pT*1.1)*5*dt;
    } else if(boss.phase===2){
      // Slow drift in figure-8 to keep the ring traversable
      boss.x=W/2+Math.sin(boss.pT*0.45)*180;
      boss.y=200+Math.cos(boss.pT*0.65)*40;
    } else {
      // Lazy drift, repositions on cluster events
      if(boss._vnDriftT===undefined){boss._vnDriftT=2.5;boss._vnTx=boss.x;boss._vnTy=boss.y;}
      boss._vnDriftT-=dt;
      if(boss._vnDriftT<=0){
        boss._vnDriftT=2.0+Math.random();
        boss._vnTx=180+Math.random()*(W-360);
        boss._vnTy=130+Math.random()*150;
      }
      boss.x+=(boss._vnTx-boss.x)*Math.min(1,dt*0.9);
      boss.y+=(boss._vnTy-boss.y)*Math.min(1,dt*0.9);
    }

    // ── P1: Event horizon disk ──
    boss.voidDisk.phase+=dt;
    const diskMax=boss.phase===1?90:boss.phase===2?60:70;
    const diskMin=boss.phase===1?55:boss.phase===2?35:45;
    boss.voidDisk.r=diskMin+(diskMax-diskMin)*0.5*(1+Math.sin(boss.voidDisk.phase*1.2));
    // Damage: player inside disk
    if(!this._dead&&this.invincT<=0){
      const dPlayer=Math.hypot(this.px-boss.x,this.py-boss.y);
      if(dPlayer<boss.voidDisk.r-6){
        if(this._sandbox){/* no-op */}
        else if(this.shieldActive){this._hitShield();}
        else{this._deathCause='VOID_HORIZON';this._die();return;}
      }
    }
    // Boss-as-gravity: in P1, slow drift of nearby bullets toward boss center (subtle, ~30 pull at r<240)
    if(boss.phase===1){
      this.bullets.forEach(b=>{
        const d=Math.hypot(b.x-boss.x,b.y-boss.y);
        if(d<240&&d>boss.voidDisk.r+10){
          const pull=b.reflected?15:35;
          b.vx+=(boss.x-b.x)/d*pull*dt;
          b.vy+=(boss.y-b.y)/d*pull*dt;
        }
      });
    }

    // ── P1: Void pulses (slow radial bullets) ──
    if(boss.phase===1){
      if(boss._vnPulseT===undefined)boss._vnPulseT=2.2;
      boss._vnPulseT-=dt;
      if(boss._vnPulseT<=0){
        boss._vnPulseT=3.2;
        Snd.play('shoot');
        for(let a=0;a<14;a++){
          const ang=(Math.PI*2/14)*a+boss.pT*0.4;
          this.bullets.push({x:boss.x+Math.cos(ang)*(boss.voidDisk.r+12),y:boss.y+Math.sin(ang)*(boss.voidDisk.r+12),
            vx:Math.cos(ang)*95,vy:Math.sin(ang)*95,col:0x8800ff,reflected:false,size:5,trail:[]});
        }
      }
    }

    // ── P2: Gravity ring (6 orbiting mini-singularities) ──
    if(boss.phase===2){
      if(!boss.gravityRing.nodes){
        boss.gravityRing.nodes=[];
        for(let i=0;i<6;i++)boss.gravityRing.nodes.push({baseAngle:(Math.PI*2/6)*i});
      }
      // Contract cycle
      boss.gravityRing.contractT-=dt;
      if(boss.gravityRing.contractDur>0){
        boss.gravityRing.contractDur-=dt;
        if(boss.gravityRing.contractDur<=0)boss.gravityRing.contracted=false;
      }
      if(boss.gravityRing.contractT<=0){
        boss.gravityRing.contractT=6.5;
        boss.gravityRing.contracted=true;
        boss.gravityRing.contractDur=1.5;
        if(this.banner)this.banner.mini('VOID · RING CONTRACTING','#aa00ff',900);
      }
      const targetR=boss.gravityRing.contracted?40:120;
      if(boss._vnRingR===undefined)boss._vnRingR=120;
      boss._vnRingR+=(targetR-boss._vnRingR)*Math.min(1,dt*3);
      // Per-node gravity pull on bullets + lethal contact for player
      boss.gravityRing.nodes.forEach(n=>{
        const ang=n.baseAngle+this.t*boss.gravityRing.rotSpd;
        n.x=boss.x+Math.cos(ang)*boss._vnRingR;
        n.y=boss.y+Math.sin(ang)*boss._vnRingR;
        this.bullets.forEach(b=>{
          const d=Math.hypot(b.x-n.x,b.y-n.y);
          if(d<70&&d>1){
            const pull=b.reflected?45:70;
            b.vx+=(n.x-b.x)/d*pull*dt;
            b.vy+=(n.y-b.y)/d*pull*dt;
          }
          // Singularity eats bullets that get too close
          if(d<14){
            const idx=this.bullets.indexOf(b);
            if(idx>=0)this.bullets.splice(idx,1);
            this._spawnParticles(n.x,n.y,0x8800ff,4);
          }
        });
        // Player damage on contact with a singularity
        if(!this._dead&&this.invincT<=0&&Math.hypot(this.px-n.x,this.py-n.y)<14){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();}
          else{this._deathCause='VOID_RING';this._die();return;}
        }
      });
    } else {
      boss.gravityRing.nodes=null;
      boss._vnRingR=undefined;
      boss.gravityRing.contractT=6.5;
      boss.gravityRing.contracted=false;
    }

    // ── P3: Null rift attendants ──
    if(boss.phase===3){
      if(!boss.nullZones){
        boss.nullZones=[];
        for(let i=0;i<3;i++){
          const ang=(Math.PI*2/3)*i;
          boss.nullZones.push({angle:ang,orbitR:160,life:99,r:50});
        }
        boss._vnClusterT=5;
        boss._vnClustering=false;
      }
      boss._vnClusterT-=dt;
      if(boss._vnClusterT<=0&&!boss._vnClustering){
        boss._vnClustering=true;boss._vnClusterDur=2.0;
        if(this.banner)this.banner.mini('NULL_RIFT · CORE EXPOSED','#ff44ff',900);
      }
      if(boss._vnClustering){
        boss._vnClusterDur-=dt;
        if(boss._vnClusterDur<=0){
          boss._vnClustering=false;
          boss._vnClusterT=5.5+Math.random();
        }
      }
      const targetR=boss._vnClustering?20:160;
      boss.nullZones.forEach((nz,i)=>{
        nz.angle+=dt*0.45;
        nz.orbitR+=(targetR-nz.orbitR)*Math.min(1,dt*1.8);
        nz.x=boss.x+Math.cos(nz.angle)*nz.orbitR;
        nz.y=boss.y+Math.sin(nz.angle)*nz.orbitR;
        // Delete bullets in zone
        for(let bi=this.bullets.length-1;bi>=0;bi--){
          const b=this.bullets[bi];
          if(Math.hypot(b.x-nz.x,b.y-nz.y)<nz.r){
            this._spawnParticles(b.x,b.y,0xff44ff,3);
            this.bullets.splice(bi,1);
          }
        }
        // Lethal player contact
        if(!this._dead&&this.invincT<=0&&Math.hypot(this.px-nz.x,this.py-nz.y)<nz.r-8){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();}
          else{this._deathCause='VOID_NULLRIFT';this._die();return;}
        }
      });
    } else {
      boss.nullZones=null;
    }

    // ── Per-phase shooting ──
    if(boss.shootCooldown<=0){
      boss.shootCooldown=fireRate;
      if(!boss._telegraphs)boss._telegraphs=[];
      const ba=Math.atan2(this.py-boss.y,this.px-boss.x);

      if(boss.phase===1){
        // Slow aimed drift-bullets that bend through boss gravity
        boss._telegraphs.push({angle:ba,startT:this.t,duration:0.35,color:0x6600ff});
        Snd.play('shoot');
        for(let s=-1;s<=1;s++){
          const ang=ba+s*0.18;
          this.bullets.push({x:boss.x+Math.cos(ang)*(boss.voidDisk.r+15),
            y:boss.y+Math.sin(ang)*(boss.voidDisk.r+15),
            vx:Math.cos(ang)*155,vy:Math.sin(ang)*155,
            col:0xaa44ff,reflected:false,size:5,trail:[]});
        }
      } else if(boss.phase===2){
        // Aimed shots through ring gaps — slower so the ring matters
        boss._telegraphs.push({angle:ba,startT:this.t,duration:0.4,color:0xaa00ff});
        Snd.play('shoot');
        const _lead=0.6;
        const _tt=Math.hypot(this.px-boss.x,this.py-boss.y)/180;
        const tX=this.px+(this.playerVx||0)*_tt*_lead;
        const tY=this.py+(this.playerVy||0)*_tt*_lead;
        const aBoss=Math.atan2(tY-boss.y,tX-boss.x);
        for(let s=-1;s<=1;s++){
          this._shoot(boss.x,boss.y,boss.x+Math.cos(aBoss+s*0.12)*100,boss.y+Math.sin(aBoss+s*0.12)*100,180,0x9933ff,false,'void_ring');
        }
      } else {
        // P3: spawn expanding ring pattern (concentric bullets at increasing radii from boss outward)
        boss.shootCooldown=fireRate*1.4;
        Snd.play('shoot');
        const ringSize=14;
        const gapAng=Math.atan2(this.py-boss.y,this.px-boss.x); // gap roughly opposite the player
        for(let a=0;a<ringSize;a++){
          const ang=(Math.PI*2/ringSize)*a;
          // Skip a 2-bullet gap near the player direction — only narrow! to keep pressure
          const dAng=Math.abs(((ang-gapAng+Math.PI*3)%(Math.PI*2))-Math.PI);
          if(dAng<0.35)continue;
          this.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*200,vy:Math.sin(ang)*200,
            col:0xff44ff,reflected:false,size:5,trail:[]});
        }
        // Plus one aimed shot — keeps the player from camping the gap
        this._shoot(boss.x,boss.y,this.px,this.py,260,0xff44ff,false,'void_aim');
      }
    }
  }

  _updateGhostExe(boss,dt,spd,fireRate){
    // GHOST.EXE — corrupted process specter
    //  P1 SIGNAL DECAY  — phase-in/out rhythm, aimed shots when visible, phantom afterimages while invisible
    //  P2 SPLIT PROCESS — 3 clones (1 real); real stutters every ~3s; reflect on decoy = punish burst
    //  P3 PHASE WALK    — slow walking pursuit, lethal ghost-step trail, anti-camp shade bullet
    if(!boss.afterimages)boss.afterimages=[];
    if(!boss.ghostSteps)boss.ghostSteps=[];

    boss.angle+=dt*(boss.phase===3?1.2:0.55);

    // ── P1: phase-in/out ──
    if(boss.phase===1){
      if(boss._geCycleT===undefined){boss._geCycleT=0;boss._geVisible=true;}
      boss._geCycleT+=dt;
      const visDur=1.5,hidDur=0.6;
      if(boss._geVisible&&boss._geCycleT>=visDur){
        boss._geVisible=false;boss._geCycleT=0;
        // Drop one afterimage on transition
        boss.afterimages.push({x:boss.x,y:boss.y,life:0.9,maxLife:0.9});
      } else if(!boss._geVisible&&boss._geCycleT>=hidDur){
        boss._geVisible=true;boss._geCycleT=0;
        // Reposition slightly when re-appearing
        boss.x+=(Math.random()-0.5)*180;
        boss.y+=(Math.random()-0.5)*70;
        boss.x=Phaser.Math.Clamp(boss.x,150,W-150);
        boss.y=Phaser.Math.Clamp(boss.y,90,280);
        this._spawnParticles(boss.x,boss.y,boss.color,8);
      }
      boss.ghostAlpha=boss._geVisible?(0.55+0.3*Math.sin(this.t*4)):0.08;
      // Slow drift while invisible
      if(!boss._geVisible){
        boss.x+=Math.cos(boss.angle)*40*dt;
        boss.y+=Math.sin(boss.angle*0.7)*20*dt;
      }
    } else if(boss.phase===2){
      boss.ghostAlpha=0.7;
      // Slow drift around the playfield center
      const spiralR=120;
      boss.x=W/2+Math.cos(boss.angle)*spiralR;
      boss.y=190+Math.sin(boss.angle*1.1)*70;
      // Real-boss stutter tell every ~3s
      if(boss._stutterT===undefined)boss._stutterT=2.6;
      boss._stutterT-=dt;
      if(boss._stutterDur>0){
        boss._stutterDur-=dt;
        // Apply temporary visual jitter to boss only — render branch reads boss._stutterDur
        if(boss._stutterDur<=0)boss._stutterDur=0;
      }
      if(boss._stutterT<=0){
        boss._stutterT=2.8+Math.random()*0.5;
        boss._stutterDur=0.35;
        boss._stutterDx=(Math.random()-0.5)*16;
        boss._stutterDy=(Math.random()-0.5)*10;
      }
    } else {
      // P3: walking pursuit
      boss.ghostAlpha=0.18+0.06*Math.sin(this.t*5);
      // Move toward player at slow speed
      const dxp=this.px-boss.x, dyp=this.py-boss.y, dp=Math.hypot(dxp,dyp)||1;
      const walkSpd=82;
      boss.x+=(dxp/dp)*walkSpd*dt;
      boss.y+=(dyp/dp)*walkSpd*dt;
      boss.x=Phaser.Math.Clamp(boss.x,80,W-80);
      boss.y=Phaser.Math.Clamp(boss.y,60,H-80);
      // Drop ghost-step every 0.15s
      if(boss._stepT===undefined)boss._stepT=0;
      boss._stepT-=dt;
      if(boss._stepT<=0){
        boss._stepT=0.15;
        boss.ghostSteps.push({x:boss.x,y:boss.y,life:5,maxLife:5});
      }
      // Anti-camp: track player stillness
      if(boss._campLastPx===undefined){boss._campLastPx=this.px;boss._campLastPy=this.py;boss._campStillT=0;}
      const moved=Math.hypot(this.px-boss._campLastPx,this.py-boss._campLastPy);
      if(moved<3)boss._campStillT+=dt;
      else {boss._campStillT=0;boss._campLastPx=this.px;boss._campLastPy=this.py;}
      if(boss._campStillT>=1.5){
        boss._campStillT=0;
        // Spawn shade bullet at player position with low speed, homing handled via velocity below
        if(this.banner)this.banner.mini('GHOST · SHADE LOCKED','#aaffcc',700);
        this.bullets.push({x:this.px+(Math.random()-0.5)*60,y:this.py-80,
          vx:0,vy:140,col:0xaaffcc,reflected:false,size:6,trail:[],isShade:true,shadeT:3.5});
      }
    }

    // ── Update afterimage decay ──
    for(let i=boss.afterimages.length-1;i>=0;i--){
      boss.afterimages[i].life-=dt;
      if(boss.afterimages[i].life<=0)boss.afterimages.splice(i,1);
    }

    // ── Update ghost-step trail (player damage + decay) ──
    if(boss.phase===3){
      for(let i=boss.ghostSteps.length-1;i>=0;i--){
        const gs=boss.ghostSteps[i];
        gs.life-=dt;
        if(gs.life<=0){boss.ghostSteps.splice(i,1);continue;}
        // Damage on contact (small radius)
        if(!this._dead&&this.invincT<=0&&Math.hypot(this.px-gs.x,this.py-gs.y)<13){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();boss.ghostSteps.splice(i,1);}
          else{this._deathCause='GHOST_TRAIL';this._die();return;}
        }
      }
    } else {
      boss.ghostSteps.length=0;
    }

    // ── Shade-bullet homing (P3 special) ──
    this.bullets.forEach(b=>{
      if(!b.isShade)return;
      b.shadeT-=dt;
      if(b.shadeT<=0){b.isShade=false;return;}
      // Mild homing toward player
      const dxh=this.px-b.x, dyh=this.py-b.y, dh=Math.hypot(dxh,dyh)||1;
      b.vx+=(dxh/dh)*80*dt;
      b.vy+=(dyh/dh)*80*dt;
      // Speed cap so it stays threatening but not unfair
      const sp=Math.hypot(b.vx,b.vy);
      if(sp>180){b.vx*=180/sp;b.vy*=180/sp;}
    });

    // ── P2: maintain decoys + collision (decoy hits = punish, real hit = damage) ──
    if(boss.phase===2){
      if(!boss.clones){
        // Spawn 2 decoys at clamped positions; track real-boss identity via boss.x/y itself
        boss.clones=[
          {x:Phaser.Math.Clamp(boss.x-220+Math.random()*40,150,W-150),y:Phaser.Math.Clamp(boss.y-30+Math.random()*60,90,280),angle:Math.random()*Math.PI*2,shootCD:0.7+Math.random()*0.4,respawnFlash:0},
          {x:Phaser.Math.Clamp(boss.x+220+Math.random()*40,150,W-150),y:Phaser.Math.Clamp(boss.y-30+Math.random()*60,90,280),angle:Math.random()*Math.PI*2,shootCD:0.9+Math.random()*0.4,respawnFlash:0},
        ];
        if(this.banner)this.banner.mini('SPLIT PROCESS · spot the stutter','#aaffcc',1500);
      }
      // Drift decoys
      boss.clones.forEach(c=>{
        c.angle+=dt*0.7;
        c.x=Phaser.Math.Clamp(c.x+Math.cos(c.angle)*45*dt,140,W-140);
        c.y=Phaser.Math.Clamp(c.y+Math.sin(c.angle)*30*dt,90,280);
        c.shootCD-=dt;
        if(c.respawnFlash>0)c.respawnFlash-=dt;
        if(c.shootCD<=0){
          c.shootCD=1.6+Math.random()*0.4;
          // Decoys fire normal-looking aimed bullets (so player can't tell by attack)
          this._shoot(c.x,c.y,this.px,this.py,180,boss.color);
        }
      });
      // Reflected-bullet collisions on decoys: punish
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        if(!b.reflected)continue;
        for(let ci=0;ci<boss.clones.length;ci++){
          const c=boss.clones[ci];
          if(Math.hypot(b.x-c.x,b.y-c.y)<boss.size+5){
            // Punish: 4 aimed ghost bullets at player
            this._spawnParticles(c.x,c.y,0x66ff99,12);
            for(let s=-1.5;s<=1.5;s+=1){
              const ang=Math.atan2(this.py-c.y,this.px-c.x)+s*0.18;
              this.bullets.push({x:c.x,y:c.y,vx:Math.cos(ang)*200,vy:Math.sin(ang)*200,col:0x66ff99,reflected:false,size:5,trail:[]});
            }
            // Respawn decoy at random spot
            c.x=140+Math.random()*(W-280);
            c.y=90+Math.random()*(W>1000?180:160);
            c.respawnFlash=0.5;
            this._spawnParticles(c.x,c.y,0xaaffcc,10);
            // Remove the reflected bullet (it "passed through" the decoy)
            this.bullets.splice(i,1);
            if(this.banner)this.banner.mini('DECOY HIT · punish burst','#ffaa44',700);
            break;
          }
        }
      }
    } else {
      boss.clones=null;
    }

    // ── Per-phase shooting ──
    if(boss.shootCooldown<=0){
      if(!boss._telegraphs)boss._telegraphs=[];
      if(boss.phase===1){
        boss.shootCooldown=fireRate;
        if(boss._geVisible){
          // Pre-shot flare 0.3s telegraph
          const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
          boss._telegraphs.push({angle:ba,startT:this.t,duration:0.3,color:0xaaffcc});
          Snd.play('shoot');
          // 5-bullet aimed spread
          for(let s=-2;s<=2;s++){
            this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+s*0.16)*100,boss.y+Math.sin(ba+s*0.16)*100,200,boss.color);
          }
        } else if(boss.afterimages.length>0){
          // While invisible, fake bullets emit from afterimages (decoy shots)
          const ai=boss.afterimages[boss.afterimages.length-1];
          for(let a=0;a<3;a++){
            const ang=Math.random()*Math.PI*2;
            this.bullets.push({x:ai.x,y:ai.y,vx:Math.cos(ang)*120,vy:Math.sin(ang)*120,
              col:0x66cc99,reflected:false,size:4,trail:[],isDecoy:true,decoyLife:1.0});
          }
        }
      } else if(boss.phase===2){
        boss.shootCooldown=fireRate*0.9;
        // Real boss fires same pattern as decoys (180 aimed)
        this._shoot(boss.x,boss.y,this.px,this.py,180,boss.color);
      } else {
        // P3: signal flare burst — reveals position briefly
        boss.shootCooldown=fireRate*1.3;
        Snd.play('shoot');
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        boss._telegraphs.push({angle:ba,startT:this.t,duration:0.25,color:0xaaffcc});
        // Brief reveal flare — temporarily boost ghostAlpha
        boss.ghostAlpha=0.85;
        for(let a=0;a<7;a++){
          const ang=(Math.PI*2/7)*a+boss.angle;
          this.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*210,vy:Math.sin(ang)*210,
            col:0xaaffcc,reflected:false,size:5,trail:[]});
        }
        // Plus aimed
        this._shoot(boss.x,boss.y,this.px,this.py,240,boss.color);
      }
    }

    // ── Decoy bullet lifetime ──
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i];
      if(b.isDecoy&&b.decoyLife!==undefined){
        b.decoyLife-=dt;
        if(b.decoyLife<=0){
          this._spawnParticles(b.x,b.y,0x66cc99,3);
          this.bullets.splice(i,1);
        }
      }
    }
  }

  _updateCoreBreach(boss,dt,spd,fireRate){
    // CORE.BREACH — runaway thermal reactor
    //  P1 CONTAINMENT WARNING  — slow rotation, heat-plume cones, 8 leak fragments (reflect to chip off)
    //  P2 OVERHEAT CASCADE     — expanding ring waves with sliding gaps, irradiated zones in their wake
    //  P3 MELTDOWN             — rotating plasma jets + ground fissures + 15s detonation countdown
    if(!boss.leakFrags)boss.leakFrags=null;
    if(!boss.heatPlumes)boss.heatPlumes=[];
    if(!boss.heatRings)boss.heatRings=[];
    if(!boss.irradZones)boss.irradZones=[];
    if(!boss.fissures)boss.fissures=[];

    // ── Movement ──
    if(boss.phase===1){
      // Anchor near center, slow rotation
      const tx=W/2, ty=200;
      boss.x+=(tx-boss.x)*Math.min(1,dt*1.2);
      boss.y+=(ty-boss.y)*Math.min(1,dt*1.2);
      boss.angle+=dt*0.35;
    } else if(boss.phase===2){
      // Slow drift in a small circle so rings emit from varied positions
      boss.x=W/2+Math.cos(boss.pT*0.5)*120;
      boss.y=200+Math.sin(boss.pT*0.7)*55;
      boss.angle+=dt*0.6;
    } else {
      // P3: erratic short hops
      if(boss._cbHopT===undefined){boss._cbHopT=2.0;boss._cbTx=boss.x;boss._cbTy=boss.y;}
      boss._cbHopT-=dt;
      if(boss._cbHopT<=0){
        boss._cbHopT=2.4+Math.random();
        boss._cbTx=200+Math.random()*(W-400);
        boss._cbTy=130+Math.random()*120;
      }
      boss.x+=(boss._cbTx-boss.x)*Math.min(1,dt*1.4);
      boss.y+=(boss._cbTy-boss.y)*Math.min(1,dt*1.4);
      boss.angle+=dt*1.2;
    }

    // ── P1: Leak fragments ──
    if(boss.phase===1){
      if(!boss.leakFrags){
        boss.leakFrags=[];
        for(let i=0;i<8;i++)boss.leakFrags.push({baseAngle:(Math.PI*2/8)*i,r:boss.size+22,shootCD:1.0+Math.random()*0.8,destroyed:false,flashT:0});
      }
      boss.leakFrags.forEach(f=>{
        if(f.destroyed)return;
        const ang=f.baseAngle+boss.angle*1.2;
        f.x=boss.x+Math.cos(ang)*f.r;
        f.y=boss.y+Math.sin(ang)*f.r;
        if(f.flashT>0)f.flashT-=dt;
        f.shootCD-=dt;
        if(f.shootCD<=0){
          f.shootCD=2.0+Math.random()*0.7;
          // Drip a slow fire bullet outward
          const dirAng=ang;
          this.bullets.push({x:f.x,y:f.y,vx:Math.cos(dirAng)*120,vy:Math.sin(dirAng)*120,
            col:0xff8800,reflected:false,size:5,trail:[],isFireDrip:true});
        }
      });
      // Reflected bullets chip leak fragments off
      for(let bi=this.bullets.length-1;bi>=0;bi--){
        const b=this.bullets[bi];
        if(!b.reflected)continue;
        for(const f of boss.leakFrags){
          if(f.destroyed)continue;
          if(Math.hypot(b.x-f.x,b.y-f.y)<14){
            f.destroyed=true;f.flashT=0.4;
            this._spawnParticles(f.x,f.y,0xff8800,12);
            this._spawnShockRing(f.x,f.y,0xff8800,80);
            // Reflected bullet keeps going — pass through. Slight damage to boss for satisfaction
            boss.hp=Math.max(0,boss.hp-0.5);
            if(this.banner)this.banner.show('LEAK FRAG DESTROYED','#ff8800',500);
            break;
          }
        }
      }
    } else {
      boss.leakFrags=null;
    }

    // ── P1: Heat plumes (telegraphed cone beams) ──
    if(boss.phase===1){
      if(boss._plumeT===undefined)boss._plumeT=2.5;
      boss._plumeT-=dt;
      if(boss._plumeT<=0){
        boss._plumeT=4.5;
        const count=4+Math.floor(Math.random()*3);
        const baseOff=Math.random()*Math.PI*2;
        for(let p=0;p<count;p++){
          const ang=baseOff+(Math.PI*2/count)*p;
          boss.heatPlumes.push({angle:ang,t:0,teleDur:1.0,fireDur:0.7,phase:'tele',width:0.32,length:520});
        }
        if(this.banner)this.banner.mini('CORE · VENTING','#ff8800',900);
      }
    }
    // Update plume lifetime + damage
    for(let i=boss.heatPlumes.length-1;i>=0;i--){
      const pl=boss.heatPlumes[i];
      pl.t+=dt;
      if(pl.phase==='tele'&&pl.t>=pl.teleDur){pl.phase='fire';pl.t=0;Snd.play('shoot');}
      else if(pl.phase==='fire'&&pl.t>=pl.fireDur){boss.heatPlumes.splice(i,1);continue;}
      if(pl.phase==='fire'&&!this._dead&&this.invincT<=0){
        // Damage check: player within cone
        const pdx=this.px-boss.x, pdy=this.py-boss.y;
        const pd=Math.hypot(pdx,pdy);
        if(pd<pl.length){
          const angToPlayer=Math.atan2(pdy,pdx);
          let diff=angToPlayer-pl.angle;
          while(diff>Math.PI)diff-=Math.PI*2;
          while(diff<-Math.PI)diff+=Math.PI*2;
          if(Math.abs(diff)<pl.width){
            if(this._sandbox){/* no-op */}
            else if(this.shieldActive){this._hitShield();}
            else{this._deathCause='CORE_PLUME';this._die();return;}
          }
        }
      }
    }

    // ── P2: Heat rings ──
    if(boss.phase===2){
      if(boss._ringT===undefined)boss._ringT=1.0;
      boss._ringT-=dt;
      if(boss._ringT<=0&&boss.heatRings.length<3){
        boss._ringT=2.5;
        const gapAng=Math.random()*Math.PI*2;
        boss.heatRings.push({cx:boss.x,cy:boss.y,r:30,maxR:520,vR:120,gap:gapAng,gapW:0.55,gapVel:0.4*(Math.random()<0.5?1:-1)});
        Snd.play('shoot');
        if(this.banner)this.banner.mini('CORE · HEAT WAVE','#ff4400',700);
      }
    }
    for(let i=boss.heatRings.length-1;i>=0;i--){
      const r=boss.heatRings[i];
      r.r+=r.vR*dt;
      r.gap+=r.gapVel*dt;
      // Damage: player on the ring perimeter and outside the gap
      if(!this._dead&&this.invincT<=0){
        const pd=Math.hypot(this.px-r.cx,this.py-r.cy);
        if(Math.abs(pd-r.r)<9){
          const pAng=Math.atan2(this.py-r.cy,this.px-r.cx);
          let diff=pAng-r.gap;
          while(diff>Math.PI)diff-=Math.PI*2;
          while(diff<-Math.PI)diff+=Math.PI*2;
          if(Math.abs(diff)>r.gapW){
            if(this._sandbox){/* no-op */}
            else if(this.shieldActive){this._hitShield();}
            else{this._deathCause='CORE_RING';this._die();return;}
          }
        }
      }
      if(r.r>=r.maxR){
        // Ring done — leave irradiated zones along its final perimeter (sample 6 points outside the gap)
        for(let s=0;s<8;s++){
          const ang=(Math.PI*2/8)*s;
          let diff=ang-r.gap;
          while(diff>Math.PI)diff-=Math.PI*2;
          while(diff<-Math.PI)diff+=Math.PI*2;
          if(Math.abs(diff)>r.gapW){
            const zx=Phaser.Math.Clamp(r.cx+Math.cos(ang)*r.r*0.6,60,W-60);
            const zy=Phaser.Math.Clamp(r.cy+Math.sin(ang)*r.r*0.6,60,H-60);
            boss.irradZones.push({x:zx,y:zy,r:28,life:3,maxLife:3});
          }
        }
        boss.heatRings.splice(i,1);
      }
    }
    // Update irradiated zones
    for(let i=boss.irradZones.length-1;i>=0;i--){
      const z=boss.irradZones[i];
      z.life-=dt;
      if(z.life<=0){boss.irradZones.splice(i,1);continue;}
      if(!this._dead&&this.invincT<=0&&Math.hypot(this.px-z.x,this.py-z.y)<z.r){
        if(this._sandbox){/* no-op */}
        else if(this.shieldActive){this._hitShield();boss.irradZones.splice(i,1);}
        else{this._deathCause='CORE_IRRAD';this._die();return;}
      }
    }

    // ── P3: Fissures ──
    if(boss.phase===3){
      if(boss._fissureT===undefined)boss._fissureT=1.0;
      boss._fissureT-=dt;
      if(boss._fissureT<=0){
        boss._fissureT=1.4+Math.random()*0.5;
        // Spawn a fissure at random spot (preferred near player to keep pressure)
        const nearPlayer=Math.random()<0.55;
        const fx=nearPlayer?Phaser.Math.Clamp(this.px+(Math.random()-0.5)*180,80,W-80):(120+Math.random()*(W-240));
        const fy=Phaser.Math.Clamp(this.py+(Math.random()-0.5)*120,90,H-100);
        boss.fissures.push({x:fx,y:fy,w:90,t:0,teleDur:1.0,fireDur:0.5,phase:'tele'});
      }
    }
    for(let i=boss.fissures.length-1;i>=0;i--){
      const f=boss.fissures[i];
      f.t+=dt;
      if(f.phase==='tele'&&f.t>=f.teleDur){f.phase='fire';f.t=0;Snd.play('shoot');}
      else if(f.phase==='fire'&&f.t>=f.fireDur){boss.fissures.splice(i,1);continue;}
      // Damage during fire
      if(f.phase==='fire'&&!this._dead&&this.invincT<=0){
        if(Math.abs(this.px-f.x)<f.w/2&&this.py>30&&this.py<H-30){
          if(this._sandbox){/* no-op */}
          else if(this.shieldActive){this._hitShield();boss.fissures.splice(i,1);}
          else{this._deathCause='CORE_FISSURE';this._die();return;}
        }
      }
    }

    // ── P3: Detonation countdown ──
    if(boss.phase===3&&boss.countdownT<0){
      boss.countdownT=15;
      this.banner.show('CORE.BREACH: MELTDOWN — 15s','#ff2244',2000,'KILL BEFORE DETONATION');
      this._sysLog('[BREACH] MELTDOWN COUNTDOWN: 15s');
    }
    if(boss.countdownT>=0){
      boss.countdownT-=dt;
      if(boss.countdownT<=0){
        boss.countdownT=-1;
        // Detonation — massive AoE
        for(let a=0;a<24;a++){
          const ang=(Math.PI*2/24)*a;
          this.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*240,vy:Math.sin(ang)*240,col:0xffd700,reflected:false,size:8,trail:[]});
        }
        if(Settings.get('shake'))this.cameras.main.shake(600,0.03);
        CRT.glitch(0.8);
        this._sysLog('[BREACH] DETONATION — ENERGY WAVE RELEASED');
        this.banner.show('CORE.BREACH: DETONATED','#ff2244',1200);
      }
    }

    // ── Per-phase shooting ──
    if(boss.shootCooldown<=0){
      if(!boss._telegraphs)boss._telegraphs=[];
      if(boss.phase===1){
        boss.shootCooldown=fireRate*1.4;
        // Aimed 3-burst between plumes (mild — main pressure is plumes + leaks)
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        Snd.play('shoot');
        for(let s=-1;s<=1;s++){
          this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+s*0.16)*100,boss.y+Math.sin(ba+s*0.16)*100,210,boss.color);
        }
      } else if(boss.phase===2){
        boss.shootCooldown=fireRate*1.1;
        // Light aimed pressure — rings are the main mechanic
        const ba=Math.atan2(this.py-boss.y,this.px-boss.x);
        this._shoot(boss.x,boss.y,this.px,this.py,240,boss.color);
        // Brief invuln window: only fire single shot, no spread, when heat ring is mid-radius (boss "shielded")
        const midRingActive=boss.heatRings.some(r=>r.r>80&&r.r<260);
        if(!midRingActive){
          for(let s=-1;s<=1;s+=2){
            this._shoot(boss.x,boss.y,boss.x+Math.cos(ba+s*0.22)*100,boss.y+Math.sin(ba+s*0.22)*100,240,boss.color);
          }
        }
      } else {
        // P3: 8 rotating plasma jets (dense)
        boss.shootCooldown=fireRate*0.55;
        Snd.play('shoot');
        const jets=8;
        const base=boss.angle*1.6;
        for(let a=0;a<jets;a++){
          const ang=base+(Math.PI*2/jets)*a;
          this.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*240,vy:Math.sin(ang)*240,col:0xffd700,reflected:false,size:6,trail:[]});
        }
        // Aimed kicker
        this._shoot(boss.x,boss.y,this.px,this.py,280,boss.color);
      }
    }

    // P2 invuln: heat haze shielding when a mid-radius ring is around the boss
    if(boss.phase===2){
      const sheilded=boss.heatRings.some(r=>r.r>40&&r.r<160);
      boss._hazeInvuln=sheilded;
    } else {
      boss._hazeInvuln=false;
    }
  }

  _updateBullets(dt){
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i];
      b.trail.push({x:b.x,y:b.y});if(b.trail.length>10)b.trail.shift();
      // Magnet
      if(this.upg.magnet>0&&!b.reflected&&this.bubbleRadius>5){const dx=this.px-b.x,dy=this.py-b.y,d=Math.hypot(dx,dy);if(d<this.bubbleRadius*2.8){b.vx+=(dx/d)*95*dt;b.vy+=(dy/d)*95*dt;}}
      // Storm homing
      if(b.reflected&&this.synergies.includes('STORM')&&this.enemies.length>0){const ne=this.enemies.reduce((best,e)=>{const d=Math.hypot(b.x-e.x,b.y-e.y);return d<best.d?{e,d}:best},{e:null,d:99999});if(ne.e){const dx=ne.e.x-b.x,dy=ne.e.y-b.y,d=Math.hypot(dx,dy);b.vx+=(dx/d)*130*dt;b.vy+=(dy/d)*130*dt;}}
      if(b.frozen){continue;}// EMP freeze
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      // ── Feature 16: Memory sector bullet blocking ──
      if(this.memSectors&&!b.reflected){
        for(const ms of this.memSectors){
          if(b.x>ms.x&&b.x<ms.x+ms.w&&b.y>ms.y&&b.y<ms.y+ms.h){
            // Bullet blocked — absorbed by sector
            this._spawnParticles(b.x,b.y,0x00ff44,3);
            if(i<this.bullets.length)this.bullets.splice(i,1);
            // Sector flashes on hit
            ms.hitFlash=0.3;
            break;
          }
        }
      }
      // Reflection
      // Parry window — 0.5s ghost bubble after overheat
      if(this.parryWindowT>0&&!b.reflected){
        const dx=b.x-this.px,dy=b.y-this.py,d=Math.hypot(dx,dy);
        if(d<120){
          const nx=dx/d,ny=dy/d;const spd=Math.hypot(b.vx,b.vy)*2.0; // parry = 2x speed
          b.vx=nx*spd;b.vy=ny*spd;b.reflected=true;b.col=0xff8800;
          this._spawnParticles(b.x,b.y,0xff6600,6);
          Snd.play('chain'); // distinct sound for parry
        }
      }

      if(this.bubbleRadius>5&&!b.reflected){
        const dx=b.x-this.px,dy=b.y-this.py,d=Math.hypot(dx,dy);
        if(d<this.bubbleRadius){
          // Pure 180° reverse — bullet retraces its incoming trajectory
          const _vMag=Math.hypot(b.vx,b.vy)||1;
          const rnx=-b.vx/_vMag,rny=-b.vy/_vMag;
          const isCrit=this.upg.overclock_burst>0&&this._burstReady;
          if(isCrit)this._burstReady=false; // consume burst
          const rageBoost=this.rageActive?2.0:0; // INFERNO rage = reflect ×3
          // Perfect reflect: bullet caught within 22px of player centre
          const isPerfect=d<22&&!isCrit;
          const perfectMult=isPerfect?1.5:1;
          const spd=Math.hypot(b.vx,b.vy)*(1.4+this.upg.reflect_speed*0.5+(this.surgeActive?0.6:0)+(isCrit?0.8:0)+(isPerfect?0.5:0)+rageBoost)*perfectMult*(this._evoReflectBoost||1);
          if(isCrit){b.critical=true;this._spawnParticles(b.x,b.y,0xff8800,8);}
          // BUGFIX: count ALL reflects, not just perfect ones (label "BULLETS REFLECTED" implied total)
          this._totalReflects++;this._waveReflects++;
          if(this._waveReflects>this._waveBestReflects)this._waveBestReflects=this._waveReflects;
          if(isPerfect){
            b.critical=true;b.perfect=true;
            this._spawnParticles(b.x,b.y,0xffffff,10);
            this._spawnShockRing(b.x,b.y,0xffffff,80);
            if(!this._perfectReflectStreak)this._perfectReflectStreak=0;
            this._perfectReflectStreak++;
            if(this._perfectReflectStreak>=(this._bestPerfectStreak||0))this._bestPerfectStreak=this._perfectReflectStreak;
            const streakCol=this._perfectReflectStreak>=5?'#ffd700':this._perfectReflectStreak>=3?'#ff8800':'#ffffff';
            const popT=this.add.text(b.x,b.y-20,this._perfectReflectStreak>=3?`✦ PERFECT ×${this._perfectReflectStreak}`:'✦ PERFECT',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:streakCol}).setOrigin(0.5).setDepth(15);
            this.tweens.add({targets:popT,y:b.y-60,alpha:0,duration:700,onComplete:()=>popT.destroy()});
          } else {
            this._perfectReflectStreak=0;
          }
          // I5 — reflect impact sparks: directional cone of particles along bullet's incoming back-vector
          {
            const _refA=Math.atan2(-b.vy,-b.vx);
            const _spread=Math.PI*0.4;
            for(let _si=0;_si<8;_si++){
              const _sa=_refA+(Math.random()-0.5)*_spread;
              const _ssp=80+Math.random()*60;
              this.particles.push({x:b.x,y:b.y,vx:Math.cos(_sa)*_ssp,vy:Math.sin(_sa)*_ssp,life:1,decay:1.8+Math.random()*0.6,col:0x00ffcc,size:1.5+Math.random()*2});
            }
          }
          b.vx=rnx*spd;b.vy=rny*spd;b.reflected=true;b.col=isPerfect?0xffffff:this.bubbleTier===2?0x00ffff:this.bubbleTier===1?0x00ff88:0x00bbff;
          // Track reflect side for adaptive AI (#6)
          if(!this.reflectSideHistory)this.reflectSideHistory=[];
          this.reflectSideHistory.push(b.x<this.px?'left':'right');
          if(this.reflectSideHistory.length>20)this.reflectSideHistory.shift();
          // Each reflection adds heat (unless free reflect active)
          // HEAT_VENT meta: every 5th reflect skips the heat add
          this._heatVentCount=(this._heatVentCount||0)+1;
          const heatVentSkip=this._heatVentMeta&&(this._heatVentCount%5===0);
          if(this.freeReflectT<=0&&!heatVentSkip){
            const heatAdd=this.upg.bubble_armor>=4?8:11; // tier 4 reduces heat per reflect
            this.bubbleHeat=Math.min(this._armorThresh||100,this.bubbleHeat+heatAdd*(this._heatGainMult||1));
          }
          // PACKET_CACHE: every Nth reflect = free reflect window
          if(this.upg.packet_cache>0){
            if(!this._packetReflectCount)this._packetReflectCount=0;
            this._packetReflectCount++;
            const pcThresh = this.upg.packet_cache>=3?4 : this.upg.packet_cache>=2?6 : 8;
            const pcDur    = this.upg.packet_cache>=3?4 : 3;
            if(this._packetReflectCount>=pcThresh){
              this.freeReflectT=Math.max(this.freeReflectT||0, pcDur);
              this._packetReflectCount=0;
              this._killStreak5=true; // keep this flag set for daily-challenge predicates
              if(this.banner) this.banner.show('FREE_REFLECT','#00ffcc',600);
            }
          }
          // LENS_FOCUS meta: tag bullet for ×2 damage if reflected at near-max bubble radius
          if(this._lensFocusMeta){
            const _maxR=(this.surgeActive?150:80)+Math.min(this.upg.bubble_size,3)*15;
            if(this.bubbleRadius>=_maxR-1)b.lensFocus=true;
          }
          this.lastReflectT=0;
          this._spawnParticles(b.x,b.y,0x00f5ff,5);Snd.play('reflect');
          this._spawnShockRing(b.x,b.y,0x00ffff,160);
          this.signal=Math.min(1,this.signal+0.18*(this._signalGainMult||1));
          if(this.upg.multishot>0&&!b._echoDone&&!this.surgeActive){b._echoDone=true;const _ec=this.upg.multishot>=2?2:1;const _angs=_ec===1?[0.36]:[-0.36,0.36];_angs.forEach(sa_off=>{const sa=Math.atan2(rny,rnx)+sa_off;this.bullets.push({x:b.x,y:b.y,vx:Math.cos(sa)*spd*0.75,vy:Math.sin(sa)*spd*0.75,col:0x00ff88,reflected:true,size:4,trail:[]});});}
          // GHOST passive: queue echo bullet
          if(this.activeSkin==='ghost'){
            if(!this._ghostEchoes)this._ghostEchoes=[];
            this._ghostEchoes.push({x:b.x,y:b.y,vx:rnx*spd*0.5,vy:rny*spd*0.5,t:0.4,critical:b.critical||false});
          }
          // VIRUS passive: infection spread handled in _killEnemy
        }
      }
      // Hit enemies
      if(b.reflected){
        let hit=false;
        for(let j=this.enemies.length-1;j>=0;j--){
          const e=this.enemies[j];
          if(Math.hypot(b.x-e.x,b.y-e.y)<e.size+5){
            if(e._isGhost===true)continue;
            // CORE.BREACH: heat-haze invuln during mid-radius heat ring (P2)
            if(e._hazeInvuln){
              // Bullet deflects off the haze instead of damaging
              const ra=Math.atan2(b.y-e.y,b.x-e.x);
              const sp=Math.hypot(b.vx,b.vy);
              b.vx=Math.cos(ra)*sp;b.vy=Math.sin(ra)*sp;
              this._spawnParticles(b.x,b.y,0xff8800,4);
              continue;
            }
            // BOUNCER deflects reflected bullets at 90°
            if(e.type==='bouncer'&&b.reflected){
              const ang=Math.atan2(b.vy,b.vx)+Math.PI/2*(Math.random()<0.5?1:-1);
              const spd2=Math.hypot(b.vx,b.vy);
              b.vx=Math.cos(ang)*spd2;b.vy=Math.sin(ang)*spd2;
              b.reflected=false; // now an enemy bullet again
              b.col=0x00ccff;
              this._spawnParticles(e.x,e.y,0x00ccff,4);
              // Visual bounce — briefly show impact
              if(!e._bounceFlash)e._bounceFlash=0;
              e._bounceFlash=0.15;
              continue; // don't damage
            }
            const ampMult=(b.reflected&&Save.meta('signal_amp',false))?1.5:1;
            const stunMult=(e.stunned&&b.reflected)?2:1;
            const critMult=(b.critical)?2:1;
            const lensMult=(b.lensFocus)?2:1;
            const dmg=Math.ceil((window.DEV&&window.DEV.oneHit)?999:critMult*ampMult*stunMult*lensMult*(this._bulletDmgMult||1));
            // FIREWALL segment redirect — core takes 0 damage while any wall segment is alive.
            if(e.isBoss && e.baseName==='FIREWALL' && e._fwSegments){
              const aliveSegs = e._fwSegments.filter(s => s.hp > 0);
              if(aliveSegs.length > 0){
                let nearest = null, minDist = Infinity;
                for(const seg of aliveSegs){
                  const sx = e.x + Math.cos(seg.angle) * e.size * 0.95;
                  const sy = e.y + Math.sin(seg.angle) * e.size * 0.95;
                  const d = Math.hypot(b.x - sx, b.y - sy);
                  if(d < minDist){ minDist = d; nearest = seg; }
                }
                if(nearest){
                  nearest.hp -= dmg;
                  const sx = e.x + Math.cos(nearest.angle) * e.size * 0.95;
                  const sy = e.y + Math.sin(nearest.angle) * e.size * 0.95;
                  this._spawnParticles(sx, sy, 0xff4422, Math.min(dmg+4, 10));
                  if(nearest.hp <= 0){
                    this._spawnParticles(sx, sy, 0xff8800, 22);
                    this._spawnShockRing(sx, sy, 0xff4422, 80);
                    try { Snd.play('hit'); } catch {}
                  }
                  if(i<this.bullets.length) this.bullets.splice(i,1);
                  hit = true; break;
                }
              }
            }
            e.hp-=dmg;
            if(e._mut==='regenerating')e._regenNoHitT=0; // reset regen on hit
            this._spawnParticles(b.x,b.y,0x00ffff,Math.min(dmg+3,10));
            // Rootkit permanently revealed by reflected bullet
            if(e.type==='rootkit'&&!e.revealed){
              e.revealed=true;e.visible=true;
              this._sysLog('[ROOTKIT] PROCESS EXPOSED — STEALTH DISABLED');
              this.banner.show('ROOTKIT EXPOSED','#00ff88',800);
            }
            // ── FEATURE 4: Process corruption ──
            if(!e.isBoss&&!e.defected){
              if(!e.corruptions)e.corruptions=0;
              e.corruptions++;
              const corruptThresh=this.upg.corrupt_data>0?2:3;
              if(e.corruptions>=corruptThresh){
                // Enemy defects — switches sides
                e.defected=true;
                e.color=this.shipColor; // glow player color
                e.defectT=6; // 6 seconds before dying
                this._maxDefected++;
                this._sysLog(`[CORRUPT] PROC ${e.pid||'0xFFFF'} DEFECTED — FRIENDLY`);
                this.banner.show('PROCESS CORRUPTED — DEFECTING','#00cc66',1000);
                this._spawnParticles(e.x,e.y,this.shipColor,12);
                CRT.glitch(0.2);
              }
            }
            if(i<this.bullets.length)this.bullets.splice(i,1);
            if(e.hp<=0){
              const ex=e.x,ey=e.y,ec=e.color;
              e._killedByReflect=true;
              this._killEnemy(e,j,false);
              this.time.delayedCall(30,()=>{if(this._dead)return;this._chainExplosion(ex,ey,ec,0);});
            }
            hit=true;break;
          }
        }
        if(hit)continue;
      }
      // Hit player
      if(!b.reflected&&Math.hypot(b.x-this.px,b.y-this.py)<20&&this.invincT<=0){
        if(this._sandbox){if(i<this.bullets.length)this.bullets.splice(i,1);continue;}
        if(this.shieldActive){this._hitShield();if(i<this.bullets.length)this.bullets.splice(i,1);continue;}
        this._die();return;
      }
      // Void
      this.hazards.filter(h=>h.type==='void').forEach(h=>{if(i<this.bullets.length&&Math.hypot(b.x-h.x,b.y-h.y)<h.r)this.bullets.splice(i,1);});
      // Echo protocol: bounce reflected bullets (tier 2+ allows second bounce)
      const echoMax=this.upg.echo_protocol>=3?3:this.upg.echo_protocol>=2?2:1;
      if(this.upg.echo_protocol>0&&b.reflected&&(b.bounceCount||0)<echoMax){
        if(!b.bounceCount)b.bounceCount=0;
        if(b.x<0){b.x=2;b.vx=Math.abs(b.vx);b.bounceCount++;b.bounced=true;}
        else if(b.x>W){b.x=W-2;b.vx=-Math.abs(b.vx);b.bounceCount++;b.bounced=true;}
        if(b.y<0){b.y=2;b.vy=Math.abs(b.vy);b.bounceCount++;b.bounced=true;}
        else if(b.y>H){b.y=H-2;b.vy=-Math.abs(b.vy);b.bounceCount++;b.bounced=true;}
      }
      // Reflected bullet lifetime — prevent echo-bounce screen-clutter
      if(b.reflected){
        b.reflectAge=(b.reflectAge||0)+dt;
        if(b.reflectAge>=4){
          this._spawnParticles(b.x,b.y,b.col||0x00ffcc,5);
          if(i<this.bullets.length)this.bullets.splice(i,1);
          continue;
        }
      }
      if(b.x<-100||b.x>W+100||b.y<-100||b.y>H+100){if(i<this.bullets.length)this.bullets.splice(i,1);}
    }
  }

  _updateParticles(dt){if(this.particles.length>200)this.particles.splice(0,this.particles.length-200);for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.91;p.vy*=0.91;p.life-=p.decay*dt;if(p.life<=0)this.particles.splice(i,1);}}

  _updatePowerups(dt){
    for(let i=this.powerups.length-1;i>=0;i--){
      const pu=this.powerups[i];pu.life-=dt;
      if(Math.hypot(pu.x-this.px,pu.y-this.py)<28){
        if(pu.type==='shield'&&Save.skin()!=='inferno'){const tier=this.upg.shield||0;const hits=Math.max(2,tier>=4?5:tier>=3?4:tier>=2?3:2);const extra=Save.meta('redundant_buf',false)?1:0;this._setShield(this.shieldHits>0?this.shieldHits+1:hits+extra);Snd.play('shield');}
        if(pu.type==='slow')this.enemies.forEach(e=>{if(!e.isBoss)e.spd*=0.6;});
        Snd.play('powerup');this._spawnParticles(pu.x,pu.y,pu.col,10);this.powerups.splice(i,1);
      }else if(pu.life<=0)this.powerups.splice(i,1);
    }
  }

  _updateHazards(dt){
    this.gfxHazard.clear();
    for(let i=this.hazards.length-1;i>=0;i--){
      const h=this.hazards[i];
      if(h.type==='laser'){
        if(h.warn){
          h.warnT-=dt;
          const p=0.3+0.5*Math.sin(this.t*10);
          // Show warning stripe at the edge the laser will come from
          const wp=h.warnPos||0;
          // Draw warning line at spawn edge
          this.gfxHazard.lineStyle(2,0xff2244,p*0.8);
          if(h.horiz){
            this.gfxHazard.beginPath();this.gfxHazard.moveTo(0,wp);this.gfxHazard.lineTo(W,wp);
          } else {
            this.gfxHazard.beginPath();this.gfxHazard.moveTo(wp,0);this.gfxHazard.lineTo(wp,H);
          }
          this.gfxHazard.strokePath();
          // "LASER" warning text via gfx — draw a small warning arrow
          this.gfxHazard.fillStyle(0xff2244,p*0.6);
          if(h.horiz){
            const arrowY=h.dir>0?20:H-20;
            this.gfxHazard.fillTriangle(W/2-10,arrowY+(h.dir>0?-8:8),W/2+10,arrowY+(h.dir>0?-8:8),W/2,arrowY+(h.dir>0?8:-8));
          } else {
            const arrowX=h.dir>0?20:W-20;
            this.gfxHazard.fillTriangle(arrowX+(h.dir>0?-8:8),H/2-10,arrowX+(h.dir>0?-8:8),H/2+10,arrowX+(h.dir>0?8:-8),H/2);
          }
          if(h.warnT<=0)h.warn=false;
        } else {
          h.pos+=h.spd*(h.dir||1)*dt;
          // Draw laser beam
          this.gfxHazard.lineStyle(4,h.color,0.95);
          if(h.horiz){this.gfxHazard.beginPath();this.gfxHazard.moveTo(0,h.pos);this.gfxHazard.lineTo(W,h.pos);}
          else{this.gfxHazard.beginPath();this.gfxHazard.moveTo(h.pos,0);this.gfxHazard.lineTo(h.pos,H);}
          this.gfxHazard.strokePath();
          // Glow
          this.gfxHazard.lineStyle(20,h.color,0.08);
          if(h.horiz){this.gfxHazard.beginPath();this.gfxHazard.moveTo(0,h.pos);this.gfxHazard.lineTo(W,h.pos);}
          else{this.gfxHazard.beginPath();this.gfxHazard.moveTo(h.pos,0);this.gfxHazard.lineTo(h.pos,H);}
          this.gfxHazard.strokePath();

          // Hit check — invincT from dash also evades laser
          const hit=(h.horiz?Math.abs(h.pos-this.py)<12:Math.abs(h.pos-this.px)<12)&&this.invincT<=0;
          if(hit){
            if(this.shieldActive){this._hitShield();this.hazards.splice(i,1);}
            else{this._die();return;}
          }

          // ── Stun enemies hit by red hazard line ──
          if(h.color===0xff2244||h.color===0xff0000){
            this.enemies.forEach(e=>{
              if(e.isBoss||e.stunned)return;
              const eHit=h.horiz?Math.abs(h.pos-e.y)<e.size+8:Math.abs(h.pos-e.x)<e.size+8;
              if(eHit){
                e.stunned=true;e.stunT=3.0;
                e._origColor=e.color;
                e.color=0xffffff;
                this._spawnParticles(e.x,e.y,0xffffff,8);
                this._sysLog('[STUN] PROCESS STUNNED BY FIREWALL SWEEP');
              }
            });
          }

          // Cull when off screen
          const gone=h.dir>0?(h.horiz?h.pos>H+30:h.pos>W+30):(h.horiz?h.pos<-30:h.pos<-30);
          if(gone)this.hazards.splice(i,1);
        }
      }else if(h.type==='emp'){
        h.r+=h.spd*dt;const alpha=0.7*(1-h.r/h.maxR);
        this.gfxHazard.lineStyle(3,h.color,alpha);this.gfxHazard.strokeCircle(h.x,h.y,h.r);
        this.gfxHazard.lineStyle(10,h.color,alpha*0.12);this.gfxHazard.strokeCircle(h.x,h.y,h.r);
        if(Math.abs(Math.hypot(this.px-h.x,this.py-h.y)-h.r)<22&&h.r<h.maxR){this.bubbleRadius=Math.max(0,this.bubbleRadius-55);CRT.glitch(0.2);}
        if(h.r>=h.maxR)this.hazards.splice(i,1);
      }else if(h.type==='void'){
        h.life-=dt;if(h.life<=0){this.hazards.splice(i,1);continue;}
        const p=0.4+0.4*Math.sin(this.t*3);
        this.gfxHazard.fillStyle(0x000000,0.9);this.gfxHazard.fillCircle(h.x,h.y,h.r);
        this.gfxHazard.lineStyle(2,0x220033,p);this.gfxHazard.strokeCircle(h.x,h.y,h.r);
        this.gfxHazard.lineStyle(1,0x110022,0.4);this.gfxHazard.strokeCircle(h.x,h.y,h.r*1.5);
      }
    }
  }

  // ─── RENDER ──────────────────────────────────────────────
  _drawEnemy(g,e){
    const x=e.x,y=e.y,a=e.angle,sz=e.size;
    const pulse=0.08+0.06*Math.sin(this.t*3+x*0.01);
    const hpF=e.maxHp>1?e.hp/e.maxHp:1;

    // Enemy silhouette shadow
    if(!e.isBoss&&!e._isGhost&&!e.invisible&&!e.defected){
      const _shOffX=2,_shOffY=3;
      g.fillStyle(0x000000,0.35);
      g.fillCircle(x+_shOffX,y+_shOffY,(sz||14)+1);
    }

    // ── Mutation ring indicator ──
    if(e._mut&&!e.stunned){
      const mc=e._mutCol||0xffffff;
      const mPulse=0.4+0.35*Math.sin(this.t*5+x*0.02);
      g.lineStyle(1.5,mc,mPulse);
      g.beginPath();
      g.arc(x,y,sz+5,0,Math.PI*2);
      g.strokePath();
      // Small label dot at top
      g.fillStyle(mc,0.9);
      g.fillCircle(x,y-sz-7,2.5);
    }

    // ── Corruption visual state ──
    const corrLvl=e.corruptions||0;
    const corrColor=corrLvl>=2?Phaser.Display.Color.Interpolate.ColorWithColor(
      {r:(e._origColor>>16)&0xff,g:(e._origColor>>8)&0xff,b:e._origColor&0xff},
      {r:0,g:255,b:68},corrLvl>=2?2:1,corrLvl
    ):null;

    // ── Elite glow ──
    if(e.elite){
      const eg=0.1+0.07*Math.sin(this.t*4);
      g.fillStyle(0xffd700,eg);g.fillCircle(x,y,sz*3.2);
      g.lineStyle(1.5,0xffd700,0.4+0.2*Math.sin(this.t*3));g.strokeCircle(x,y,sz*2.8);
    }

    // ── Stunned overlay — non-blocking arc-flash so the enemy body still reads ──
    // Was: full opaque white circle + early return (looked like the player ship to
    // playtesters, especially with multiple stunned enemies on screen at once).
    if(e.stunned){
      const sp=0.5+0.5*Math.sin(this.t*14);
      g.lineStyle(1.5,0xffffff,0.55+0.35*sp);
      g.strokeCircle(x,y,sz+5);
      for(let s=0;s<6;s++){
        const aS=(Math.PI/3)*s+this.t*1.2;
        g.lineStyle(1,0xffffff,0.6*sp);
        g.beginPath();
        g.moveTo(x+Math.cos(aS)*(sz+9),y+Math.sin(aS)*(sz+9));
        g.lineTo(x+Math.cos(aS+0.2)*(sz+9),y+Math.sin(aS+0.2)*(sz+9));
        g.strokePath();
      }
    }

    // Outer glow
    const glowCol=e.defected?this.shipColor:e.color;
    g.fillStyle(glowCol,pulse);g.fillCircle(x,y,sz*2.2);

    // Bubble DoT indicator — cyan hex ring when inside bubble
    const distToPlayer=Math.hypot(x-this.px,y-this.py);
    if(this.bubbleRadius>10&&distToPlayer<this.bubbleRadius){
      const ba=this.upg.bubble_armor||0;
      const dotCol=ba>=3?0xff6600:ba>=1?0xff9900:0x00ffcc;
      const dp=0.35+0.3*Math.sin(this.t*8+(e.dotT||0)*5);
      g.lineStyle(1.5,dotCol,dp);
      g.beginPath();
      for(let s=0;s<6;s++){const pa=(Math.PI/3)*s;if(s===0)g.moveTo(x+Math.cos(pa)*(sz+5),y+Math.sin(pa)*(sz+5));else g.lineTo(x+Math.cos(pa)*(sz+5),y+Math.sin(pa)*(sz+5));}
      g.closePath();g.strokePath();
    }

    // Corruption glitch overlay
    if(corrLvl>=1&&!e.defected){
      const cf=Math.sin(this.t*15+x)>0.5;
      if(cf){
        g.lineStyle(1,0x00ff44,0.3+corrLvl*0.15);
        for(let i=0;i<corrLvl+1;i++){
          const cx2=x+(Math.random()-0.5)*sz*2,cy2=y+(Math.random()-0.5)*sz*2;
          g.moveTo(cx2-4,cy2);g.lineTo(cx2+4,cy2);g.strokePath();
        }
      }
    }

    if(e.type==='grunt'){
      // HP-based color shift: red→orange→yellow
      const hpCol=hpF>0.66?0xff3232:hpF>0.33?0xff7722:0xffdd00;
      const drawCol=e.defected?this.shipColor:hpCol;

      // Outer jagged ring — fragments as HP drops
      g.lineStyle(1,drawCol,0.3);
      g.beginPath();
      for(let s=0;s<8;s++){
        const pa=a+(Math.PI*2/8)*s;
        const fragOff=hpF<0.5?Math.sin(this.t*8+s)*sz*0.3*(1-hpF):0;
        const jitter=s%2===0?sz*1.3:sz*0.85;
        if(s===0)g.moveTo(x+Math.cos(pa)*(jitter+fragOff),y+Math.sin(pa)*(jitter+fragOff));
        else g.lineTo(x+Math.cos(pa)*(jitter+fragOff),y+Math.sin(pa)*(jitter+fragOff));
      }
      g.closePath();g.strokePath();
      // Inner body
      g.fillStyle(drawCol,0.85);
      g.beginPath();
      for(let s=0;s<6;s++){
        const pa=a+(Math.PI*2/6)*s;
        const jitter=s%2===0?sz:sz*0.7;
        if(s===0)g.moveTo(x+Math.cos(pa)*jitter,y+Math.sin(pa)*jitter);
        else g.lineTo(x+Math.cos(pa)*jitter,y+Math.sin(pa)*jitter);
      }
      g.closePath();g.fillPath();
      // Crack lines — more as HP drops
      const cracks=hpF<0.33?3:hpF<0.66?2:1;
      g.lineStyle(1,0xff0000,0.5);
      for(let c=0;c<cracks;c++){const ca=a+c*(Math.PI/3*2);g.moveTo(x,y);g.lineTo(x+Math.cos(ca)*sz*0.9,y+Math.sin(ca)*sz*0.9);g.strokePath();}
      // Core — pulses brighter at low HP
      g.fillStyle(0xff8888,hpF<0.33?0.99:0.7);g.fillCircle(x,y,hpF<0.33?4:3);

    }else if(e.type==='sniper'){
      // Black elongated diamond, orange targeting eye
      const drawCol=e.defected?this.shipColor:e.color;
      const d=sz;
      // Outer diamond — pitch black fill
      g.fillStyle(0x000000,0.95);
      g.beginPath();g.moveTo(x,y-d*1.4);g.lineTo(x+d*0.7,y);g.lineTo(x,y+d*1.4);g.lineTo(x-d*0.7,y);g.closePath();g.fillPath();
      g.lineStyle(1.5,drawCol,0.8);
      g.beginPath();g.moveTo(x,y-d*1.4);g.lineTo(x+d*0.7,y);g.lineTo(x,y+d*1.4);g.lineTo(x-d*0.7,y);g.closePath();g.strokePath();

      // Targeting eye — glows brighter when charging
      const eyeGlow=e.charging?0.5+0.5*Math.min((e.chargeT||0)/0.5,1):0.3+0.2*Math.sin(this.t*3);
      g.fillStyle(0xff8800,eyeGlow);g.fillCircle(x,y,3.5);
      g.fillStyle(0xffffff,eyeGlow*0.5);g.fillCircle(x,y,1.5);

      // Laser sight when charging — dashed target-lock telegraph
      if(e.charging&&e.chargeT>0.2){
        const la=Math.atan2(this.py-y,this.px-x);
        const chargeF=Math.min((e.chargeT||0)/0.5,1);
        // Cast to screen edge along firing ray
        const REACH = 1400;
        const cosA = Math.cos(la), sinA = Math.sin(la);
        const ex = x + cosA * REACH, ey = y + sinA * REACH;
        // Color ramps yellow → orange → red as charge nears fire
        const gC = Math.round(170 - chargeF * 150);
        const col = (255 << 16) | (gC << 8);
        // Outer glow (thick, very faint)
        g.lineStyle(4, col, 0.05 + chargeF * 0.10);
        g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
        // Dashed core line — segments along the ray
        const SEGS = 22;
        const DASH = 14, GAP = 10;
        for (let s = 0; s < SEGS; s++){
          const d0 = s * (DASH + GAP);
          const d1 = d0 + DASH;
          if (d0 > REACH) break;
          const sx = x + cosA * d0,   sy = y + sinA * d0;
          const xx = x + cosA * Math.min(d1, REACH), yy = y + sinA * Math.min(d1, REACH);
          g.lineStyle(1.5, col, 0.20 + chargeF * 0.45);
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(xx, yy); g.strokePath();
        }
        // Endpoint reticle on player when charge > 0.6 — four L-brackets that close in
        if (chargeF > 0.6){
          const rt = 14 + (1 - chargeF) * 10;
          const a = 0.4 + chargeF * 0.55;
          g.lineStyle(1.5, col, a);
          const px = this.px, py = this.py;
          [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx, sy]) => {
            g.beginPath();
            g.moveTo(px + sx * rt, py + sy * (rt - 6));
            g.lineTo(px + sx * rt, py + sy * rt);
            g.lineTo(px + sx * (rt - 6), py + sy * rt);
            g.strokePath();
          });
        }
      }
      // Targeting arms
      g.lineStyle(1,drawCol,0.3);
      const ta=Math.atan2(this.py-y,this.px-x);
      g.moveTo(x-Math.cos(ta)*sz*2,y-Math.sin(ta)*sz*2);g.lineTo(x-Math.cos(ta)*sz*0.9,y-Math.sin(ta)*sz*0.9);g.strokePath();

    }else if(e.type==='tank'){
      // Armored heavy — cracks show HP loss
      const drawCol=e.defected?this.shipColor:e.color;
      const coreExposed=hpF<0.35;
      // Outer armor hex — cracks at each HP lost
      g.lineStyle(coreExposed?1:3,drawCol,coreExposed?0.3:0.7);
      g.beginPath();
      for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;if(s===0)g.moveTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);else g.lineTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);}
      g.closePath();g.strokePath();
      // HP-based crack lines on armor
      const maxCracks=e.maxHp;
      const cracksShown=e.maxHp-e.hp;
      for(let c=0;c<cracksShown;c++){
        const ca=a+(Math.PI/maxCracks)*c*2;
        g.lineStyle(1,0xff0000,0.6);
        g.moveTo(x+Math.cos(ca)*sz*0.5,y+Math.sin(ca)*sz*0.5);
        g.lineTo(x+Math.cos(ca)*sz,y+Math.sin(ca)*sz);g.strokePath();
      }
      // Inner hex — glows red when exposed
      g.fillStyle(coreExposed?0xff2200:drawCol,coreExposed?0.9:0.75);
      g.beginPath();
      for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;if(s===0)g.moveTo(x+Math.cos(pa)*sz*0.55,y+Math.sin(pa)*sz*0.55);else g.lineTo(x+Math.cos(pa)*sz*0.55,y+Math.sin(pa)*sz*0.55);}
      g.closePath();g.fillPath();
      // HP arc
      if(e.maxHp>1){
        g.lineStyle(2,drawCol,0.9);g.beginPath();g.arc(x,y,sz+7,-Math.PI/2,-Math.PI/2+Math.PI*2*hpF);g.strokePath();
        g.lineStyle(1,drawCol,0.2);g.beginPath();g.arc(x,y,sz+7,-Math.PI/2,-Math.PI/2+Math.PI*2);g.strokePath();
      }
      g.fillStyle(coreExposed?0xff6600:0xff4444,0.9);g.fillCircle(x,y,coreExposed?5:4);

    }else if(e.type==='swarm'){
      // Fast needle with motion trail ring when orbiting
      const drawCol=e.defected?this.shipColor:e.color;
      const dx2=this.px-x,dy2=this.py-y;
      const moveAngle=Math.atan2(dy2,dx2);
      // Motion blur trail
      for(let l=1;l<=4;l++){
        g.fillStyle(drawCol,0.12*(5-l));
        g.beginPath();
        const trailX=x-Math.cos(moveAngle)*l*sz*0.55;
        const trailY=y-Math.sin(moveAngle)*l*sz*0.55;
        g.moveTo(trailX+Math.cos(moveAngle)*sz*0.9,trailY+Math.sin(moveAngle)*sz*0.9);
        g.lineTo(trailX+Math.cos(moveAngle+2.4)*sz*0.4,trailY+Math.sin(moveAngle+2.4)*sz*0.4);
        g.lineTo(trailX+Math.cos(moveAngle-2.4)*sz*0.4,trailY+Math.sin(moveAngle-2.4)*sz*0.4);
        g.closePath();g.fillPath();
      }
      // Main body
      g.fillStyle(drawCol,0.95);
      g.beginPath();
      g.moveTo(x+Math.cos(moveAngle)*sz*1.5,y+Math.sin(moveAngle)*sz*1.5);
      g.lineTo(x+Math.cos(moveAngle+2.4)*sz*0.6,y+Math.sin(moveAngle+2.4)*sz*0.6);
      g.lineTo(x+Math.cos(moveAngle-2.4)*sz*0.6,y+Math.sin(moveAngle-2.4)*sz*0.6);
      g.closePath();g.fillPath();

    }else if(e.type==='leech'){
      const lc=e.color;
      // Worm-like body: concentric ovals that pulse
      const lp=0.5+0.5*Math.sin(this.t*6+x*0.05);
      // Brighter when clinging
      const clingMod=e._clinging?1.5:1;
      g.lineStyle(2,lc,Math.min(1,(0.7+0.3*lp)*clingMod));
      g.strokeCircle(x,y,sz);
      g.lineStyle(1,lc,0.4);
      g.strokeCircle(x,y,sz*1.5);
      g.fillStyle(lc,0.8);g.fillCircle(x,y,sz*0.5);
      // Tendril lines toward player when clinging
      if(e._clinging){
        const ta=Math.atan2(this.py-y,this.px-x);
        for(let tl=0;tl<3;tl++){
          const tOff=(tl-1)*0.4;
          const tLen=sz*2+Math.sin(this.t*8+tl)*sz;
          g.lineStyle(1,lc,0.6+0.3*Math.sin(this.t*10+tl));
          g.beginPath();
          g.moveTo(x+Math.cos(ta+tOff)*sz,y+Math.sin(ta+tOff)*sz);
          g.lineTo(x+Math.cos(ta+tOff)*tLen,y+Math.sin(ta+tOff)*tLen);
          g.strokePath();
        }
      }

    }else if(e.type==='bouncer'){
      const bc=e._bounceFlash>0?0xffffff:e.color;
      const ba=e._bounceFlash>0?1:0.8;
      // Hexagonal armored body
      g.lineStyle(3,bc,ba);
      g.beginPath();
      for(let s=0;s<6;s++){
        const pa=a+(Math.PI/3)*s;
        if(s===0)g.moveTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);
        else g.lineTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);
      }
      g.closePath();g.strokePath();
      // Chevron deflect symbol
      g.lineStyle(2,bc,ba);
      g.beginPath();g.moveTo(x-sz*0.5,y+sz*0.25);g.lineTo(x,y-sz*0.3);g.lineTo(x+sz*0.5,y+sz*0.25);g.strokePath();
      g.beginPath();g.moveTo(x-sz*0.3,y+sz*0.55);g.lineTo(x,y);g.lineTo(x+sz*0.3,y+sz*0.55);g.strokePath();
      // HP indicator dots
      for(let h=0;h<e.maxHp;h++){
        g.fillStyle(h<e.hp?bc:0x002233,h<e.hp?0.9:0.3);
        g.fillCircle(x-((e.maxHp-1)*5)+h*10,y+sz+8,3);
      }

    }else if(e.type==='phantom'&&e._isGhost){
      // Ghost copy — dashed outline, fading
      const gLife=e._ghostLife||0;
      const ga=Math.min(1,gLife/1.5)*0.6;
      const flicker=Math.sin(this.t*12)>0;
      if(!flicker)return;
      g.lineStyle(1,e.color,ga);
      // Dashed hex
      for(let s=0;s<6;s++){
        if(s%2===0)continue; // skip alternate segments = dashed
        const pa=a+(Math.PI/3)*s,pb=a+(Math.PI/3)*(s+1);
        g.beginPath();g.moveTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);g.lineTo(x+Math.cos(pb)*sz,y+Math.sin(pb)*sz);g.strokePath();
      }
      g.fillStyle(e.color,ga*0.3);g.fillCircle(x,y,sz*0.8);
      g.fillStyle(e.color,ga*0.8);g.fillCircle(x,y,3);
      return; // skip further draw passes

    }else if(e.type==='phantom'&&!e._isGhost){
      // Live phantom — fast, slight motion trail blur
      const pp=0.6+0.4*Math.sin(this.t*8);
      g.lineStyle(1.5,e.color,0.85);
      g.beginPath();
      for(let s=0;s<6;s++){
        const pa=a+(Math.PI/3)*s;
        if(s===0)g.moveTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);
        else g.lineTo(x+Math.cos(pa)*sz,y+Math.sin(pa)*sz);
      }
      g.closePath();g.strokePath();
      // Ghost after-image
      g.lineStyle(1,e.color,0.2);
      g.strokeCircle(x-Math.cos(e.angle)*6,y-Math.sin(e.angle)*6,sz*0.8);
      g.fillStyle(e.color,0.7);g.fillCircle(x,y,3);

    }else if(e.type==='rootkit'){
      const alpha=e.revealed?1:(e.flashT>0?0.7+0.3*Math.sin(this.t*20):0);
      if(alpha<=0)return;
      const drawCol=e.defected?this.shipColor:e.color;
      // Static/noise texture — rapid color flicker
      const flicker=Math.sin(this.t*30+x*0.1)>0.3;
      // Outer glitch ring
      g.lineStyle(1,drawCol,alpha*0.35*(flicker?1:0.5));g.strokeCircle(x,y,sz*1.5);
      // Diamond body
      g.fillStyle(flicker?drawCol:0x003311,alpha*0.8);
      g.beginPath();g.moveTo(x,y-sz);g.lineTo(x+sz*0.65,y);g.lineTo(x,y+sz);g.lineTo(x-sz*0.65,y);g.closePath();g.fillPath();
      g.lineStyle(1.5,drawCol,alpha*0.9);
      g.beginPath();g.moveTo(x,y-sz);g.lineTo(x+sz*0.65,y);g.lineTo(x,y+sz);g.lineTo(x-sz*0.65,y);g.closePath();g.strokePath();
      // Glitch scan lines
      g.lineStyle(1,drawCol,alpha*0.4);
      for(let gl=0;gl<3;gl++){const gy2=y-sz*0.5+gl*sz*0.5;g.moveTo(x-sz*0.5,gy2);g.lineTo(x+sz*0.5,gy2);g.strokePath();}
      // Faint footprint when cloaked (very faint outline behind position)
      if(!e.revealed&&e.flashT<=0){
        g.lineStyle(0.5,drawCol,0.08);
        g.beginPath();g.moveTo(x,y-sz);g.lineTo(x+sz*0.65,y);g.lineTo(x,y+sz);g.lineTo(x-sz*0.65,y);g.closePath();g.strokePath();
      }
      // WARNING marker when revealed
      if(e.revealed){
        g.lineStyle(1.5,0xff0000,0.9);
        g.beginPath();g.moveTo(x,y-sz);g.lineTo(x+sz*0.65,y);g.lineTo(x,y+sz);g.lineTo(x-sz*0.65,y);g.closePath();g.strokePath();
        g.fillStyle(0xff0000,0.15+0.1*Math.sin(this.t*6));g.fillCircle(x,y,sz*1.8);
      }
      g.fillStyle(0xffffff,alpha*0.9);g.fillCircle(x,y,2);
    }

    // Elite crown indicator
    if(e.elite){
      g.fillStyle(0xffd700,0.9);
      const cr=sz+10;
      for(let p=0;p<3;p++){const pa=-Math.PI/2+(p-1)*0.5;g.fillTriangle(x+Math.cos(pa)*cr-3,y+Math.sin(pa)*cr+4,x+Math.cos(pa)*cr+3,y+Math.sin(pa)*cr+4,x+Math.cos(pa)*cr,y+Math.sin(pa)*cr-4);}
    }


    // ── SECTOR_00 enemies ──
    if(e.type==='orbit_node'){
      const oc=e.color;
      g.lineStyle(1.5,oc,0.85);
      g.strokeCircle(x,y,e.size);
      g.fillStyle(oc,0.5);
      g.fillCircle(x,y,e.size*0.45);
      // Three orbiting dots
      for(let od=0;od<3;od++){
        const oa=(this.t*2+(od*Math.PI*2/3));
        g.fillStyle(oc,0.5+od*0.15);
        g.fillCircle(x+Math.cos(oa)*(e.size+6),y+Math.sin(oa)*(e.size+6),3);
      }
      g.lineStyle(0.5,oc,0.2);g.strokeCircle(x,y,e.size+8);
    } else if(e.type==='pulsar'){
      const pc=e.color;
      const pf=e._pulseFlash||0;
      const dc=pf>0?0xffffff:pc;
      const ps=e.size+pf*6;
      g.lineStyle(1.5,dc,0.8+pf*0.2);
      g.beginPath();
      g.moveTo(x,y-ps);g.lineTo(x+ps*0.7,y);g.lineTo(x,y+ps);g.lineTo(x-ps*0.7,y);
      g.closePath();g.strokePath();
      g.fillStyle(pc,0.3+pf*0.3);
      g.beginPath();
      g.moveTo(x,y-ps*0.5);g.lineTo(x+ps*0.35,y);g.lineTo(x,y+ps*0.5);g.lineTo(x-ps*0.35,y);
      g.closePath();g.fillPath();
      if(pf>0){g.lineStyle(1,pc,pf*0.5);g.strokeCircle(x,y,e.size*2.5);}
    } else if(e.type==='drift_packet'){
      const dc=e.color;
      const ang=e._driftDir?Math.atan2(e._driftDir.y,e._driftDir.x):0;
      const tip=e.size+4, wing=e.size*0.55, body=e.size;
      g.fillStyle(dc,0.85);
      g.beginPath();
      g.moveTo(x+Math.cos(ang)*tip, y+Math.sin(ang)*tip);
      g.lineTo(x+Math.cos(ang+2.4)*wing, y+Math.sin(ang+2.4)*wing);
      g.lineTo(x-Math.cos(ang)*body*0.5, y-Math.sin(ang)*body*0.5);
      g.lineTo(x+Math.cos(ang-2.4)*wing, y+Math.sin(ang-2.4)*wing);
      g.closePath();g.fillPath();
      g.lineStyle(1,dc,0.3);
      for(let td=1;td<=3;td++){g.strokeCircle(x-Math.cos(ang)*td*8,y-Math.sin(ang)*td*8,2-td*0.3);}
    // ── DEEP_MEMORY enemies ──
    } else if(e.type==='memory_trap'){
      const tc=e.color;
      const pt=e._pulseT||0;
      g.fillStyle(0x220011,0.95);g.fillCircle(x,y,e.size);
      g.lineStyle(1.5,tc,0.85);g.strokeCircle(x,y,e.size);
      g.fillStyle(0x440022,0.8);g.fillCircle(x,y,e.size*0.45);
      g.lineStyle(1,tc,0.7);
      for(let sp=0;sp<8;sp++){
        const sa=(Math.PI/4)*sp;
        g.moveTo(x+Math.cos(sa)*(e.size+2),y+Math.sin(sa)*(e.size+2));
        g.lineTo(x+Math.cos(sa)*(e.size+8),y+Math.sin(sa)*(e.size+8));
      }
      g.strokePath();
      const pr=(e._trapTimer||6)/6;
      g.lineStyle(0.5,tc,0.2+0.2*(1-pr));g.strokeCircle(x,y,80);
      g.lineStyle(1,tc,0.4*(1-pr)+0.2);g.strokeCircle(x,y,30+Math.sin(pt*4)*6);
    } else if(e.type==='fragment'){
      const fc=e.color;
      const fa=e._orbitOff||0;
      g.fillStyle(fc,0.8);
      g.beginPath();
      for(let fp=0;fp<4;fp++){
        const fpa=fa+(Math.PI*2/4)*fp;
        const fr=e.size*(0.7+0.4*(fp%2===0?1:0));
        fp===0?g.moveTo(x+Math.cos(fpa)*fr,y+Math.sin(fpa)*fr):g.lineTo(x+Math.cos(fpa)*fr,y+Math.sin(fpa)*fr);
      }
      g.closePath();g.fillPath();
      g.lineStyle(1,fc,0.9);g.strokePath();
    // ── KERNEL_SPACE enemies ──
    } else if(e.type==='core_shard'){
      const cc=e.color;
      const ca=e._dir?Math.atan2(e._dir.y,e._dir.x):0;
      g.fillStyle(0x2a0008,0.95);
      const cpts=[0,-1, 0.5,-0.4, 0.9,-0.7, 0.6,0, 0.9,0.6, 0.4,0.3, 0.2,1, -0.3,0.5, -0.9,0.7, -0.6,0, -0.8,-0.5, -0.3,-0.3];
      g.beginPath();
      for(let pi=0;pi<cpts.length;pi+=2){
        const px2=cpts[pi]*e.size, py2=cpts[pi+1]*e.size;
        const rx=px2*Math.cos(ca)-py2*Math.sin(ca)+x;
        const ry=px2*Math.sin(ca)+py2*Math.cos(ca)+y;
        pi===0?g.moveTo(rx,ry):g.lineTo(rx,ry);
      }
      g.closePath();g.fillPath();
      g.lineStyle(1.2,cc,0.9);g.strokePath();
      if(e._isMini){g.lineStyle(0.8,cc,0.5);g.strokeCircle(x,y,e.size+4);}
    } else if(e.type==='overload_node'){
      const oc=e.color;
      const charge=Math.min((e._chargeT||0)/5.0,1.0);
      g.fillStyle(0x1a0400,0.95);g.fillCircle(x,y,e.size);
      g.lineStyle(1.5,oc,0.4+charge*0.5);g.strokeCircle(x,y,e.size);
      g.fillStyle(oc,charge*0.5);g.fillCircle(x,y,e.size*charge);
      if(charge>0.2){
        g.lineStyle(1,0xffaa00,charge*0.8);
        for(let ar=0;ar<3;ar++){
          const a1=(this.t*3+ar*2.1)%(Math.PI*2);
          const a2=a1+0.8+charge*0.4;
          g.beginPath();
          g.moveTo(x+Math.cos(a1)*e.size,y+Math.sin(a1)*e.size);
          g.lineTo(x+Math.cos(a1+0.4)*(e.size+6*charge),y+Math.sin(a1+0.4)*(e.size+6*charge));
          g.lineTo(x+Math.cos(a2)*e.size,y+Math.sin(a2)*e.size);
          g.strokePath();
        }
      }
      if(charge>0.75){g.lineStyle(0.5,oc,charge-0.7);g.strokeCircle(x,y,300);}
    }

    // Defected green circuit traces
    if(e.defected){
      g.lineStyle(1,0x00ff44,0.5);
      for(let s=0;s<4;s++){const da=a+(Math.PI/2)*s;g.moveTo(x,y);g.lineTo(x+Math.cos(da)*sz*0.8,y+Math.sin(da)*sz*0.8);g.strokePath();}
      // I7 — wobbling cyan network thread linking defected ally to the player
      const _tdx=this.px-x, _tdy=this.py-y;
      const _tlen=Math.hypot(_tdx,_tdy);
      if(_tlen>4){
        const _mx=(x+this.px)/2, _my=(y+this.py)/2;
        const _perpx=-_tdy/_tlen, _perpy=_tdx/_tlen;
        const _wob=6*Math.sin(this.t*6 + x*0.05);
        const _cx=_mx+_perpx*_wob, _cy=_my+_perpy*_wob;
        g.lineStyle(1,0x00ff88,0.4);
        g.beginPath();
        g.moveTo(x,y);g.lineTo(_cx,_cy);g.lineTo(this.px,this.py);
        g.strokePath();
      }
    }
    // ── Charge-up telegraph ring ──
    if(e._chargeUp){
      const progress=1-(e._chargeUp.t/e._chargeUp.max);
      const alpha=0.4+0.4*Math.sin(this.t*18);
      // Shrinking ring as charge completes
      const r=(sz||14)*(1.0+0.6*(1-progress));
      g.lineStyle(2,e._chargeUp.color,alpha);
      g.strokeCircle(x,y,r);
      // Three pulsing dots around the enemy
      for(let i=0;i<3;i++){
        const a=this.t*4+i*(Math.PI*2/3);
        g.fillStyle(e._chargeUp.color,0.6);
        g.fillCircle(x+Math.cos(a)*(sz+8),y+Math.sin(a)*(sz+8),2);
      }
    }
  }



  _drawBoss(g,e){
    try{
      const x=e.x,y=e.y,sz=e.size,t=this.t;
      const phase=e.phase||1;
      const hpF=e.hp/e.maxHp;
      const col=e.color;
      const rp=0.4+0.3*Math.sin(t*4);

      // Phase 2 flicker
      if(phase===2){const fl=0.4+0.4*Math.sin(t*18);if(Math.random()<0.05)return;g.lineStyle(2,0xffaa00,fl*0.8);g.strokeCircle(x,y,sz+6);}

      // Ghost visibility
      const visAlpha=(e.baseName==='GHOST.EXE')?(e.ghostAlpha||1):1;

      // ── Outer aura ──
      const aCol=phase===3?0xff0000:phase===2?0xffaa00:col;
      g.fillStyle(aCol,0.05+0.03*Math.sin(t*1.5));g.fillCircle(x,y,sz*3.5);
      g.lineStyle(1,aCol,0.12);g.strokeCircle(x,y,sz*3.5);
      if(phase===3){// rage: extra pulsing aura
        g.lineStyle(2,aCol,0.25+0.2*Math.sin(t*8));g.strokeCircle(x,y,sz*2.5+Math.sin(t*6)*12);
      }

      // ── Boss body per type ──
      if(e.baseName==='FIREWALL'){
        // FIREWALL.SYS — rotating wall-segment fortress
        //  Central hex core with hot orange/red palette + 4 orbiting wall segments
        //  Segments orbit at sz*0.95 radius (just inside the boss bounding circle)
        //  Phase 2: segments become destructible damage gates (mechanic in _updateFirewall)
        //  Phase 3: rotation speeds up, segments tint blood-red, core flares
        const segs = e._fwSegments;
        const segsAlive = segs ? segs.filter(s => s && s.hp > 0).length : 0;
        const allDown = segs && segs.length > 0 && segsAlive === 0;
        const rotSpd = phase===3 ? 1.1 : phase===2 ? 0.75 : 0.5;
        const orbitT = this.t * rotSpd;
        const coreR = sz * 0.55;
        const corePulse = 1 + 0.05 * Math.sin(this.t * 4.5);
        const orbitR = sz * 0.95;
        const segCount = segs ? segs.length : 4;
        const segW = 13, segH = 38;

        // ── Outer faint aura ring ──
        g.lineStyle(1, 0xff2244, visAlpha * 0.18);
        g.strokeCircle(x, y, sz * 1.15);

        // ── Core (rendered first, segments overlay) ──
        const coreCol = phase===3 ? 0xff4422 : 0xff2244;
        const coreStrokeCol = 0xff8800;
        // Core hex
        const cr = coreR * corePulse;
        g.fillStyle(coreCol, visAlpha * (allDown ? 0.85 : 0.55));
        g.beginPath();
        for(let h=0; h<6; h++){
          const ha = (Math.PI/3)*h + this.t*0.3;
          const hx = x + Math.cos(ha)*cr, hy = y + Math.sin(ha)*cr;
          if(h===0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
        }
        g.closePath(); g.fillPath();
        g.lineStyle(2, coreStrokeCol, visAlpha * 0.9);
        g.beginPath();
        for(let h=0; h<6; h++){
          const ha = (Math.PI/3)*h + this.t*0.3;
          const hx = x + Math.cos(ha)*cr, hy = y + Math.sin(ha)*cr;
          if(h===0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
        }
        g.closePath(); g.strokePath();
        // Inner pulse dot
        const innerA = 0.7 + 0.3*Math.sin(this.t*5);
        g.fillStyle(0xffdd88, visAlpha * innerA);
        g.fillCircle(x, y, cr*0.32);
        // "Damage immune" warning ring when segments alive in phase 2+
        if(phase>=2 && !allDown && segsAlive > 0){
          const wf = 0.5 + 0.5*Math.sin(this.t*8);
          g.lineStyle(1.5, 0xff2244, visAlpha * 0.55 * wf);
          g.strokeCircle(x, y, cr + 6 + wf*2);
        }

        // ── 4 wall segments orbiting ──
        for(let i=0; i<segCount; i++){
          const seg = segs ? segs[i] : null;
          const baseAng = orbitT + (Math.PI*2/segCount) * i;
          // Use seg.angle if mechanic stores it; otherwise just orbitAng
          const segAng = seg && seg.angle != null ? seg.angle : baseAng;
          const sx = x + Math.cos(segAng) * orbitR;
          const sy = y + Math.sin(segAng) * orbitR;
          const dead = seg && seg.hp <= 0;
          // Tangent direction for segment orientation (perpendicular to radius)
          const tAng = segAng + Math.PI/2;
          const cs = Math.cos(tAng), sn = Math.sin(tAng);
          // Segment is a rectangle aligned tangent to orbit (segW along tangent, segH across)
          const halfW = segW/2, halfH = segH/2;
          const cornersS = [[-halfW,-halfH],[halfW,-halfH],[halfW,halfH],[-halfW,halfH]];
          const segCol = dead ? 0x442222 : (phase===3 ? 0xff2200 : 0xff4422);
          const segAlpha = dead ? 0.18 : visAlpha * (0.55 + 0.15*Math.sin(this.t*3+i));
          // Filled body
          g.fillStyle(segCol, segAlpha * 0.6);
          g.beginPath();
          cornersS.forEach((c, ci) => {
            const wx = sx + c[0]*cs - c[1]*sn;
            const wy = sy + c[0]*sn + c[1]*cs;
            if(ci===0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
          });
          g.closePath(); g.fillPath();
          // Stroke
          g.lineStyle(1.5, segCol, segAlpha * 1.05);
          g.beginPath();
          cornersS.forEach((c, ci) => {
            const wx = sx + c[0]*cs - c[1]*sn;
            const wy = sy + c[0]*sn + c[1]*cs;
            if(ci===0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
          });
          g.closePath(); g.strokePath();
          // Internal scanline glyph stream — 4 short horizontal lines across segment height
          if(!dead){
            const scrollOff = (this.t * 30) % (segH/4);
            for(let li=0; li<5; li++){
              const ly = -halfH + (li * segH/4) - scrollOff;
              if(ly < -halfH || ly > halfH) continue;
              const x1 = -halfW*0.7, x2 = halfW*0.7;
              const wax = sx + x1*cs - ly*sn, way = sy + x1*sn + ly*cs;
              const wbx = sx + x2*cs - ly*sn, wby = sy + x2*sn + ly*cs;
              g.lineStyle(1, 0xff8800, segAlpha * 0.7);
              g.beginPath(); g.moveTo(wax, way); g.lineTo(wbx, wby); g.strokePath();
            }
          }
          // HP pip — chunky bar above segment when alive in mechanic-active phases
          if(seg && seg.hp > 0 && seg.maxHp > 0 && phase >= 2){
            const hpRatio = Math.max(0, Math.min(1, seg.hp / seg.maxHp));
            const pipR = orbitR + 16;
            const pipX = x + Math.cos(segAng) * pipR;
            const pipY = y + Math.sin(segAng) * pipR;
            // Background + border
            g.fillStyle(0x110000, 0.95);
            g.fillRect(pipX - 14, pipY - 3, 28, 6);
            g.lineStyle(1, 0x441111, 0.8);
            g.strokeRect(pipX - 14, pipY - 3, 28, 6);
            // Fill — color shifts red→yellow as HP drops
            const fillCol = hpRatio > 0.5 ? 0xff8844 : hpRatio > 0.25 ? 0xffaa22 : 0xff2200;
            g.fillStyle(fillCol, 1);
            g.fillRect(pipX - 13, pipY - 2, 26*hpRatio, 4);
          }
        }

        // Phase-3 core flare jets when all segments down
        if(phase>=3 && allDown){
          for(let j=0; j<6; j++){
            const ja = (Math.PI*2/6)*j + this.t*1.8;
            const jr = cr + 4 + 12*Math.abs(Math.sin(this.t*4+j));
            g.fillStyle(j%2===0 ? 0xff4400 : 0xff8800, visAlpha * 0.4);
            g.beginPath();
            g.moveTo(x + Math.cos(ja)*cr, y + Math.sin(ja)*cr);
            g.lineTo(x + Math.cos(ja+0.18)*jr, y + Math.sin(ja+0.18)*jr);
            g.lineTo(x + Math.cos(ja-0.18)*jr, y + Math.sin(ja-0.18)*jr);
            g.closePath(); g.fillPath();
          }
        }
        // ── FIREWALL hazards: partitions + scan beams ──
        if(e.partitions&&e.partitions.length){
          e.partitions.forEach(p=>{
            const lifeF=Math.max(0,p.life/p.maxLife);
            const build=p.built;
            // Warning tint while building
            const a=Math.min(0.85,0.55+0.35*Math.sin(t*5))*build;
            const main=phase===3?0xff2244:0xff6600;
            // Left segment
            g.fillStyle(main,a*0.32);
            g.fillRect(0,p.y-4,p.gapX,8);
            g.lineStyle(2,main,a*0.95);
            g.beginPath();g.moveTo(0,p.y);g.lineTo(p.gapX,p.y);g.strokePath();
            g.lineStyle(1,0xffaa00,a*0.6);
            g.beginPath();g.moveTo(0,p.y-3);g.lineTo(p.gapX,p.y-3);g.strokePath();
            g.beginPath();g.moveTo(0,p.y+3);g.lineTo(p.gapX,p.y+3);g.strokePath();
            // Right segment
            g.fillStyle(main,a*0.32);
            g.fillRect(p.gapX+p.gapW,p.y-4,W-(p.gapX+p.gapW),8);
            g.lineStyle(2,main,a*0.95);
            g.beginPath();g.moveTo(p.gapX+p.gapW,p.y);g.lineTo(W,p.y);g.strokePath();
            g.lineStyle(1,0xffaa00,a*0.6);
            g.beginPath();g.moveTo(p.gapX+p.gapW,p.y-3);g.lineTo(W,p.y-3);g.strokePath();
            g.beginPath();g.moveTo(p.gapX+p.gapW,p.y+3);g.lineTo(W,p.y+3);g.strokePath();
            // Gap markers
            g.lineStyle(2,0x00ffcc,0.7);
            g.beginPath();g.moveTo(p.gapX,p.y-10);g.lineTo(p.gapX,p.y+10);g.strokePath();
            g.beginPath();g.moveTo(p.gapX+p.gapW,p.y-10);g.lineTo(p.gapX+p.gapW,p.y+10);g.strokePath();
            // Life-low fade
            if(lifeF<0.25){
              g.lineStyle(1,main,a*0.4);
              g.beginPath();g.moveTo(0,p.y);g.lineTo(W,p.y);g.strokePath();
            }
          });
        }
        if(e.scanBeams&&e.scanBeams.length){
          e.scanBeams.forEach(b=>{
            if(b.phase==='tele'){
              const prog=Math.min(1,b.t/b.teleDur);
              const dash=0.4+0.6*Math.sin(t*16);
              g.lineStyle(1.5,0xffaa00,0.55*dash);
              // Dashed line — fake via short segments
              const dx=b.x2-b.x1, dy=b.y2-b.y1, L=Math.hypot(dx,dy);
              const nx=dx/L,ny=dy/L;
              const seg=14;
              for(let s=0;s<L;s+=seg*2){
                g.beginPath();
                g.moveTo(b.x1+nx*s,b.y1+ny*s);
                g.lineTo(b.x1+nx*Math.min(s+seg,L),b.y1+ny*Math.min(s+seg,L));
                g.strokePath();
              }
              // Endpoint reticles
              g.lineStyle(2,0xffaa00,0.6+0.4*Math.sin(t*8));
              g.strokeCircle(b.x1,b.y1,6+prog*4);
              g.strokeCircle(b.x2,b.y2,6+prog*4);
            } else {
              // Fire — bright beam
              const fadeIn=Math.min(1,b.t/0.08);
              const fadeOut=Math.min(1,(b.fireDur-b.t)/0.15);
              const aBeam=Math.min(fadeIn,fadeOut);
              const main=phase===3?0xff2244:0xff4400;
              g.lineStyle(10,main,0.18*aBeam);
              g.beginPath();g.moveTo(b.x1,b.y1);g.lineTo(b.x2,b.y2);g.strokePath();
              g.lineStyle(5,0xff6600,0.55*aBeam);
              g.beginPath();g.moveTo(b.x1,b.y1);g.lineTo(b.x2,b.y2);g.strokePath();
              g.lineStyle(2,0xffffff,0.9*aBeam);
              g.beginPath();g.moveTo(b.x1,b.y1);g.lineTo(b.x2,b.y2);g.strokePath();
            }
          });
        }
      }else if(e.baseName==='VOID.NODE'){
        // VOID.NODE — null-data singularity
        //  P1: event horizon disk + accretion arcs
        //  P2: gravity ring (6 orbiting micro-singularities)
        //  P3: null rift (3 attendant null-zones)

        // Event horizon (P1) / inner disk (all phases)
        const diskR=(e.voidDisk&&e.voidDisk.r)||60;
        // Outer glow falloff
        for(let g_i=3;g_i>=0;g_i--){
          const gr=diskR*(1+g_i*0.25);
          g.fillStyle(0xaa00ff,(0.06-g_i*0.012)*visAlpha);
          g.fillCircle(x,y,gr);
        }
        // Event horizon ring — pulsing
        const horizPulse=0.6+0.4*Math.sin(t*3);
        g.lineStyle(2.5,0xcc44ff,visAlpha*0.85*horizPulse);
        g.strokeCircle(x,y,diskR);
        g.lineStyle(1,0xff66ff,visAlpha*0.5*horizPulse);
        g.strokeCircle(x,y,diskR-4);
        // Lethal core
        g.fillStyle(0x000000,visAlpha*0.95);g.fillCircle(x,y,diskR*0.55);
        g.lineStyle(1.5,0xff44ff,visAlpha*0.6);g.strokeCircle(x,y,diskR*0.55);
        // Accretion swirl (filaments)
        const filaments=phase===3?10:phase===2?7:6;
        for(let f=0;f<filaments;f++){
          const fa=(Math.PI*2/filaments)*f+t*0.6;
          const r1=diskR*0.62,r2=diskR*1.0;
          g.lineStyle(1,0xff66ff,visAlpha*(0.25+0.25*Math.sin(t*4+f)));
          g.beginPath();
          for(let p=0;p<=8;p++){
            const t01=p/8;
            const rr=r1+t01*(r2-r1);
            const aa=fa+t01*0.6;
            g[p===0?'moveTo':'lineTo'](x+Math.cos(aa)*rr,y+Math.sin(aa)*rr);
          }
          g.strokePath();
        }
        // Phase 1: hex lattice cage retained as outer framing
        if(phase===1){
          [sz*1.1,sz*0.78].forEach((lr,li)=>{
            g.lineStyle(li===0?1.5:1,col,visAlpha*(li===0?0.4:0.25));
            g.beginPath();
            for(let s=0;s<6;s++){const a=(Math.PI/3)*s+e.angle*0.1;s===0?g.moveTo(x+Math.cos(a)*lr,y+Math.sin(a)*lr):g.lineTo(x+Math.cos(a)*lr,y+Math.sin(a)*lr);}
            g.closePath();g.strokePath();
          });
        }
        // Phase 3: jagged spike crown around horizon — sense of rupture
        if(phase===3){
          for(let s=0;s<8;s++){
            const a=(Math.PI*2/8)*s+t*0.4;
            const r1=diskR+6,r2=diskR+18+8*Math.sin(t*5+s);
            g.lineStyle(1.5,0xff44ff,visAlpha*(0.5+0.3*Math.sin(t*6+s)));
            g.beginPath();
            g.moveTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);
            g.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);
            g.strokePath();
          }
        }

        // ── P2 gravity ring nodes ──
        if(e.gravityRing&&e.gravityRing.nodes){
          e.gravityRing.nodes.forEach(n=>{
            // Tether to center
            g.lineStyle(1,0x6600ff,visAlpha*0.18);
            g.beginPath();g.moveTo(x,y);g.lineTo(n.x,n.y);g.strokePath();
            // Mini singularity halo
            const np=0.6+0.4*Math.sin(t*5+n.baseAngle*2);
            g.fillStyle(0x6600ff,visAlpha*0.18*np);
            g.fillCircle(n.x,n.y,28);
            g.lineStyle(1.5,0xaa44ff,visAlpha*0.85*np);
            g.strokeCircle(n.x,n.y,18);
            g.fillStyle(0x000000,visAlpha*0.9);
            g.fillCircle(n.x,n.y,10);
            g.lineStyle(1,0xff66ff,visAlpha*0.55);
            g.strokeCircle(n.x,n.y,10);
          });
          // Contracted state — extra warning ring
          if(e.gravityRing.contracted){
            g.lineStyle(2,0xff44ff,visAlpha*(0.4+0.3*Math.sin(t*10)));
            g.strokeCircle(x,y,(e._vnRingR||40)+10);
          }
        }

        // ── P3 null-zone attendants ──
        if(e.nullZones&&e.nullZones.length){
          e.nullZones.forEach(nz=>{
            // Outer warning halo
            const np=0.55+0.45*Math.sin(t*4+nz.angle);
            g.fillStyle(0x440044,visAlpha*0.45*np);
            g.fillCircle(nz.x,nz.y,nz.r);
            g.lineStyle(2,0xff44ff,visAlpha*0.85);
            g.strokeCircle(nz.x,nz.y,nz.r);
            g.lineStyle(1,0xff88ff,visAlpha*0.4);
            g.strokeCircle(nz.x,nz.y,nz.r+6);
            // Inner "void" black
            g.fillStyle(0x000000,visAlpha);
            g.fillCircle(nz.x,nz.y,nz.r*0.7);
            // Tether to boss
            g.lineStyle(1,0xff44ff,visAlpha*0.2);
            g.beginPath();g.moveTo(x,y);g.lineTo(nz.x,nz.y);g.strokePath();
            // Glyph particles (orbiting digits)
            for(let gi=0;gi<3;gi++){
              const ga=t*1.2+gi*2.094+nz.angle;
              const gr=nz.r*0.85;
              g.fillStyle(0xff66ff,visAlpha*0.6);
              g.fillCircle(nz.x+Math.cos(ga)*gr,nz.y+Math.sin(ga)*gr,2);
            }
          });
        }
      }else if(e.baseName==='GHOST.EXE'){
        // GHOST.EXE — layered spectral hex stack with rotating shells + skull glyph
        const gA=e.ghostAlpha||1;
        // Three-shell rotation
        const _drawGhostBody=(bx,by,bAlpha,jitterX,jitterY)=>{
          const dx=bx+(jitterX||0), dy=by+(jitterY||0);
          const ragged = phase===3;
          // Berserk red flash on inner shell in phase 3 when HP < 35%
          const berserk = phase===3 && hpF < 0.35;
          // Three shell radii — outer/middle/inner
          const radii = [sz*0.95, sz*0.72, sz*0.5];
          const rotSpeeds = [0.4, -0.6, 0.9];
          const shellCols = [0x8844ff, 0x44ddff, berserk ? 0xff4444 : 0xffffff];
          const shellAlphas = [0.5, 0.6, 0.85];
          const shellWidths = [1.5, 1.5, 1.0];
          for(let sh=0; sh<3; sh++){
            let r = radii[sh];
            // Ragged jitter when phase 3
            if(ragged) r *= 0.85 + 0.18*Math.sin(this.t*3+sh*1.4);
            const baseAng = this.t * rotSpeeds[sh];
            const col2 = shellCols[sh];
            let a2 = shellAlphas[sh] * bAlpha;
            if(sh===2 && berserk) a2 *= 0.6 + 0.4*Math.sin(this.t*8);
            // Filled hex (very low fill for layering)
            g.fillStyle(col2, a2 * 0.08);
            g.beginPath();
            for(let h=0; h<6; h++){
              const ha = (Math.PI/3)*h + baseAng;
              const hx = dx + Math.cos(ha)*r, hy = dy + Math.sin(ha)*r;
              if(h===0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
            }
            g.closePath(); g.fillPath();
            // Stroke
            g.lineStyle(shellWidths[sh], col2, a2);
            g.beginPath();
            for(let h=0; h<6; h++){
              const ha = (Math.PI/3)*h + baseAng;
              const hx = dx + Math.cos(ha)*r, hy = dy + Math.sin(ha)*r;
              if(h===0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
            }
            g.closePath(); g.strokePath();
            // Scanline tears on outer shell in phase 3
            if(ragged && sh===0){
              for(let li=-2; li<=2; li++){
                const ly = dy + li * (r/4);
                const tearOff = Math.sin(this.t*8+li)*4;
                g.lineStyle(1, col2, a2 * 0.35);
                g.beginPath();
                g.moveTo(dx - r*0.55 + tearOff, ly);
                g.lineTo(dx + r*0.55 + tearOff, ly);
                g.strokePath();
              }
            }
          }
          // Skull glyph (eyes + slim mouth) — slight jitter ±0.5px
          const gjx = (Math.random()-0.5) * 1.0;
          const gjy = (Math.random()-0.5) * 1.0;
          const cx = dx + gjx, cy = dy + gjy;
          // Eye dots
          const eyeY = cy - sz*0.06;
          const eyeR = sz*0.07;
          const eyeOff = sz*0.13;
          const eyeCol = berserk ? 0xff4444 : 0x44ddff;
          g.fillStyle(eyeCol, bAlpha * 0.95);
          g.fillCircle(cx - eyeOff, eyeY, eyeR);
          g.fillCircle(cx + eyeOff, eyeY, eyeR);
          // Inner pupil
          g.fillStyle(0x000000, bAlpha * 0.85);
          g.fillCircle(cx - eyeOff, eyeY, eyeR*0.45);
          g.fillCircle(cx + eyeOff, eyeY, eyeR*0.45);
          // Mouth — short horizontal line with 3 vertical pips (teeth)
          const mouthY = cy + sz*0.13;
          const mouthW = sz*0.18;
          g.lineStyle(1.2, eyeCol, bAlpha*0.85);
          g.beginPath();
          g.moveTo(cx - mouthW, mouthY);
          g.lineTo(cx + mouthW, mouthY);
          g.strokePath();
          for(let m=-1; m<=1; m++){
            g.beginPath();
            g.moveTo(cx + m*mouthW*0.55, mouthY);
            g.lineTo(cx + m*mouthW*0.55, mouthY + sz*0.06);
            g.strokePath();
          }
          // Persistent afterimage trail — register current pos every 60ms for trail render
        };
        // Maintain a self-trail on the boss entity (not on decoys)
        if(!e._ghostTrail) e._ghostTrail = [];
        e._ghostTrailT = (e._ghostTrailT || 0) + 0.016;
        if(e._ghostTrailT >= 0.06){
          e._ghostTrailT = 0;
          e._ghostTrail.push({x:x, y:y, life:1});
          if(e._ghostTrail.length > 6) e._ghostTrail.shift();
        }
        // Decay alpha each frame
        e._ghostTrail.forEach(p => { p.life = Math.max(0, p.life - 0.02); });
        e._ghostTrail = e._ghostTrail.filter(p => p.life > 0);
        // Render trail as fading outer hex outlines BEFORE the boss body
        e._ghostTrail.forEach(p => {
          g.lineStyle(1, 0x8844ff, p.life * 0.3 * gA);
          g.beginPath();
          for(let h=0; h<6; h++){
            const ha = (Math.PI/3)*h + this.t*0.4;
            const hx = p.x + Math.cos(ha)*sz*0.95, hy = p.y + Math.sin(ha)*sz*0.95;
            if(h===0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
          }
          g.closePath(); g.strokePath();
        });

        // ── P1: afterimages render behind boss ──
        if(phase===1&&e.afterimages){
          e.afterimages.forEach(ai=>{
            const aiA=Math.max(0,ai.life/ai.maxLife)*0.4;
            _drawGhostBody(ai.x,ai.y,aiA,0,0);
          });
        }

        if(phase===2&&e.clones){
          // Decoy clones — identical body draw
          e.clones.forEach(c=>{
            const dAlpha=0.7+(c.respawnFlash>0?0.3*Math.sin(t*30):0);
            _drawGhostBody(c.x,c.y,dAlpha,0,0);
            // Respawn flash overlay
            if(c.respawnFlash>0){
              g.lineStyle(2,0xffaa44,c.respawnFlash*2);
              g.strokeCircle(c.x,c.y,sz+8);
            }
          });
          // Real boss — apply stutter jitter (the tell)
          const sjx=(e._stutterDur>0?e._stutterDx:0);
          const sjy=(e._stutterDur>0?e._stutterDy:0);
          _drawGhostBody(x,y,gA,sjx,sjy);
          // While stuttering, draw subtle dual-image
          if(e._stutterDur>0){
            _drawGhostBody(x,y,gA*0.35,-sjx*0.5,-sjy*0.5);
          }
        } else {
          // Main boss body (P1 visible or P3)
          _drawGhostBody(x,y,gA,0,0);
        }

        // ── P3: ghost-step trail render ──
        if(phase===3&&e.ghostSteps){
          e.ghostSteps.forEach(gs=>{
            const gf=gs.life/gs.maxLife;
            // Pixel-cluster glyph
            const stepCol=0xaaffcc;
            g.fillStyle(stepCol,gf*0.35);
            g.fillCircle(gs.x,gs.y,12);
            g.lineStyle(1,stepCol,gf*0.7);
            g.strokeCircle(gs.x,gs.y,11);
            // Mini glyph at center
            g.fillStyle(0xffffff,gf*0.4);
            g.fillCircle(gs.x,gs.y,2);
          });
          // Heading indicator — line from latest step to boss
          if(e.ghostSteps.length>0){
            const last=e.ghostSteps[e.ghostSteps.length-1];
            g.lineStyle(1,0xaaffcc,gA*0.3);
            g.beginPath();g.moveTo(last.x,last.y);g.lineTo(x,y);g.strokePath();
          }
        }
      }else if(e.baseName==='CORE.BREACH'){
        // CORE.BREACH — runaway thermal reactor
        //  P1: containment rings + leak fragments + heat plume cones
        //  P2: meltdown shell + expanding heat rings + irradiated zones + haze invuln visual
        //  P3: cracked core + plasma jets + ground fissures + detonation countdown ring

        // Heat-haze distortion ring (always)
        const hazePulse=0.4+0.3*Math.sin(t*2.5);
        g.lineStyle(2,0xff8800,visAlpha*0.18*hazePulse);
        g.strokeCircle(x,y,sz*1.5);
        g.lineStyle(1,0xff8800,visAlpha*0.12);
        g.strokeCircle(x,y,sz*1.7);

        if(phase===1){
          [sz,sz*0.74,sz*0.48].forEach((r,ri)=>{
            g.lineStyle(ri===0?2.5:ri===1?1.8:1.2,col,visAlpha*(ri===0?0.9:ri===1?0.65:0.4));
            g.strokeCircle(x,y,r);
            if(ri<2){
              for(let s=0;s<4;s++){
                const a=(Math.PI/2)*s+e.angle*0.2;
                g.lineStyle(1.5,col,visAlpha*0.45);
                const r2=[sz,sz*0.74,sz*0.48][ri+1];
                g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
                g.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);
                g.strokePath();
              }
            }
          });
          g.fillStyle(col,0.35);g.fillCircle(x,y,sz*0.22);
          g.fillStyle(0xffffff,0.18);g.fillCircle(x,y,sz*0.1);
        } else if(phase===2){
          // Meltdown shell with stress fractures + heat-haze shield ring when invuln
          const ba=t*0.7;
          [[sz,0.8],[sz*0.74,0.55]].forEach(([r,al])=>{
            g.lineStyle(2,col,visAlpha*al);
            g.beginPath();g.arc(x,y,r,ba+0.5,ba+Math.PI*1.2);g.strokePath();
            g.beginPath();g.arc(x,y,r,ba+Math.PI*1.5,ba+Math.PI*1.85);g.strokePath();
          });
          for(let s=0;s<6;s++){
            const sa=(Math.PI/3)*s+e.angle*0.45;
            const slen=sz*(0.88+0.28*Math.sin(t*2.8+s));
            const sc2=s%2===0?col:0xff8800;
            g.fillStyle(sc2,visAlpha*0.78);
            g.beginPath();
            g.moveTo(x+Math.cos(sa)*sz*0.28,y+Math.sin(sa)*sz*0.28);
            g.lineTo(x+Math.cos(sa-0.2)*sz*0.52,y+Math.sin(sa-0.2)*sz*0.52);
            g.lineTo(x+Math.cos(sa)*slen,y+Math.sin(sa)*slen);
            g.lineTo(x+Math.cos(sa+0.2)*sz*0.52,y+Math.sin(sa+0.2)*sz*0.52);
            g.closePath();g.fillPath();
          }
          g.fillStyle(col,0.6);g.fillCircle(x,y,sz*0.28);
          g.fillStyle(0xff8800,0.45);g.fillCircle(x,y,sz*0.17);
          g.fillStyle(0xffffff,0.35);g.fillCircle(x,y,sz*0.07);
          g.lineStyle(2,col,visAlpha*0.9);g.strokeCircle(x,y,sz*0.28);
          // Haze shield visual
          if(e._hazeInvuln){
            const sp=0.5+0.5*Math.sin(t*8);
            g.lineStyle(3,0xff8800,visAlpha*0.6*sp);
            g.strokeCircle(x,y,sz+10);
            g.lineStyle(1.5,0xffaa44,visAlpha*0.45*sp);
            g.strokeCircle(x,y,sz+18);
          }
        } else {
          // P3: cracked open core — exposed white-hot center, jagged shell
          const flicker=0.55+0.45*Math.sin(t*9);
          // Jagged outer shell (broken)
          g.lineStyle(2,col,visAlpha*0.85*flicker);
          g.beginPath();
          for(let s=0;s<10;s++){
            const a=(Math.PI*2/10)*s+e.angle*0.6;
            const r=sz*(0.72+0.22*Math.sin(t*4+s));
            s===0?g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r):g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
          }
          g.closePath();g.strokePath();
          // White-hot core
          g.fillStyle(0xffffff,visAlpha*0.7);g.fillCircle(x,y,sz*0.32);
          g.fillStyle(0xffdd44,visAlpha*0.55);g.fillCircle(x,y,sz*0.45);
          g.fillStyle(0xff8800,visAlpha*0.25);g.fillCircle(x,y,sz*0.62);
          // Plasma arcs
          for(let s=0;s<8;s++){
            const sa=e.angle*1.6+(Math.PI*2/8)*s;
            const r1=sz*0.35, r2=sz*(0.7+0.15*Math.sin(t*5+s));
            g.lineStyle(2,0xffdd44,visAlpha*0.75);
            g.beginPath();g.moveTo(x+Math.cos(sa)*r1,y+Math.sin(sa)*r1);g.lineTo(x+Math.cos(sa)*r2,y+Math.sin(sa)*r2);g.strokePath();
          }
          // Detonation countdown ring (visible while counting)
          if(e.countdownT>0){
            const tFrac=e.countdownT/15;
            const ringPulse=0.5+0.5*Math.sin(t*(6+12*(1-tFrac)));
            g.lineStyle(3,0xff2244,visAlpha*(0.6+0.4*ringPulse));
            g.beginPath();g.arc(x,y,sz+28,-Math.PI/2,-Math.PI/2+Math.PI*2*tFrac);g.strokePath();
          }
        }

        // ── Leak fragments (P1) ──
        if(e.leakFrags){
          e.leakFrags.forEach(f=>{
            if(f.destroyed){
              if(f.flashT>0){
                g.lineStyle(1.5,0xff4400,f.flashT*2);
                g.strokeCircle(f.x||x,f.y||y,12);
              }
              return;
            }
            const fp=0.6+0.4*Math.sin(t*4+f.baseAngle*3);
            // Tether to boss
            g.lineStyle(1,0xff8800,visAlpha*0.3);
            g.beginPath();g.moveTo(x,y);g.lineTo(f.x,f.y);g.strokePath();
            // Fragment body
            g.fillStyle(0xff4400,visAlpha*0.5*fp);
            g.fillCircle(f.x,f.y,8);
            g.lineStyle(1.5,0xffaa00,visAlpha*0.85);
            g.strokeCircle(f.x,f.y,9);
            g.fillStyle(0xffffff,visAlpha*0.6*fp);
            g.fillCircle(f.x,f.y,3);
          });
        }

        // ── Heat plumes (P1) ──
        if(e.heatPlumes&&e.heatPlumes.length){
          e.heatPlumes.forEach(pl=>{
            if(pl.phase==='tele'){
              const prog=Math.min(1,pl.t/pl.teleDur);
              const a=0.35+0.35*Math.sin(t*16);
              // Dashed cone outline
              g.lineStyle(1.5,0xffaa00,a);
              const cosL=Math.cos(pl.angle-pl.width), sinL=Math.sin(pl.angle-pl.width);
              const cosR=Math.cos(pl.angle+pl.width), sinR=Math.sin(pl.angle+pl.width);
              const reach=pl.length*prog;
              g.beginPath();g.moveTo(x,y);g.lineTo(x+cosL*reach,y+sinL*reach);g.strokePath();
              g.beginPath();g.moveTo(x,y);g.lineTo(x+cosR*reach,y+sinR*reach);g.strokePath();
              // Filling fan
              g.fillStyle(0xff6600,0.08*prog);
              g.beginPath();g.moveTo(x,y);
              for(let s=-4;s<=4;s++){
                const aa=pl.angle+(s/4)*pl.width;
                g.lineTo(x+Math.cos(aa)*reach,y+Math.sin(aa)*reach);
              }
              g.closePath();g.fillPath();
            } else {
              // Fire — bright cone
              const fadeIn=Math.min(1,pl.t/0.05);
              const fadeOut=Math.min(1,(pl.fireDur-pl.t)/0.12);
              const aF=Math.min(fadeIn,fadeOut);
              // Outer fan glow
              g.fillStyle(0xff4400,0.32*aF);
              g.beginPath();g.moveTo(x,y);
              for(let s=-6;s<=6;s++){
                const aa=pl.angle+(s/6)*pl.width;
                g.lineTo(x+Math.cos(aa)*pl.length,y+Math.sin(aa)*pl.length);
              }
              g.closePath();g.fillPath();
              // Bright spine
              g.lineStyle(4,0xff8800,0.7*aF);
              g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(pl.angle)*pl.length,y+Math.sin(pl.angle)*pl.length);g.strokePath();
              g.lineStyle(1.5,0xffffff,0.85*aF);
              g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(pl.angle)*pl.length,y+Math.sin(pl.angle)*pl.length);g.strokePath();
            }
          });
        }

        // ── Heat rings (P2) ──
        if(e.heatRings&&e.heatRings.length){
          e.heatRings.forEach(r=>{
            const segs=64;
            const colMain=0xff4400;
            // Ring drawn as dashed bullets-segments — visualize ring as a strong line with gap
            g.lineStyle(3.5,colMain,0.85);
            g.beginPath();
            let started=false;
            for(let s=0;s<=segs;s++){
              const ang=(Math.PI*2/segs)*s;
              let diff=ang-r.gap;
              while(diff>Math.PI)diff-=Math.PI*2;
              while(diff<-Math.PI)diff+=Math.PI*2;
              if(Math.abs(diff)<r.gapW){
                if(started){g.strokePath();started=false;}
                continue;
              }
              const sx=r.cx+Math.cos(ang)*r.r, sy=r.cy+Math.sin(ang)*r.r;
              if(!started){g.beginPath();g.moveTo(sx,sy);started=true;}
              else g.lineTo(sx,sy);
            }
            if(started)g.strokePath();
            // Glow underlay
            g.lineStyle(7,colMain,0.18);
            g.beginPath();g.arc(r.cx,r.cy,r.r,r.gap+r.gapW,r.gap+Math.PI*2-r.gapW);g.strokePath();
            // Gap markers
            g.lineStyle(2,0x00ffcc,0.6);
            g.strokeCircle(r.cx+Math.cos(r.gap)*r.r,r.cy+Math.sin(r.gap)*r.r,5);
          });
        }

        // ── Irradiated zones (P2) ──
        if(e.irradZones&&e.irradZones.length){
          e.irradZones.forEach(z=>{
            const zf=z.life/z.maxLife;
            const zp=0.45+0.4*Math.sin(t*5+z.x*0.01);
            g.fillStyle(0xff4400,zf*0.32*zp);
            g.fillCircle(z.x,z.y,z.r);
            g.lineStyle(1.5,0xff8800,zf*0.7);
            g.strokeCircle(z.x,z.y,z.r);
            g.lineStyle(1,0xffaa00,zf*0.45);
            g.strokeCircle(z.x,z.y,z.r*0.65);
            // Ember dots
            for(let ei=0;ei<3;ei++){
              const ea=t*1.3+ei*2.094+z.x*0.05;
              const er=z.r*0.7;
              g.fillStyle(0xffdd44,zf*0.6);
              g.fillCircle(z.x+Math.cos(ea)*er,z.y+Math.sin(ea)*er,1.8);
            }
          });
        }

        // ── Fissures (P3) ──
        if(e.fissures&&e.fissures.length){
          e.fissures.forEach(f=>{
            if(f.phase==='tele'){
              const prog=Math.min(1,f.t/f.teleDur);
              const a=0.35+0.4*Math.sin(t*14);
              // Crack outline
              g.lineStyle(2,0xff2244,a*0.85);
              g.beginPath();
              let lx=f.x;
              g.moveTo(f.x,30);
              for(let s=0;s<10;s++){
                const sy=30+(H-60)*(s/9);
                const jx=f.x+(Math.random()-0.5)*8;
                g.lineTo(jx,sy);
                lx=jx;
              }
              g.strokePath();
              // Width markers
              g.lineStyle(1,0xff2244,a*0.5);
              g.beginPath();g.moveTo(f.x-f.w/2,f.y);g.lineTo(f.x+f.w/2,f.y);g.strokePath();
              // Glow widening
              g.fillStyle(0xff2244,0.08*prog);
              g.fillRect(f.x-f.w/2,30,f.w,H-60);
            } else {
              const fadeIn=Math.min(1,f.t/0.05);
              const fadeOut=Math.min(1,(f.fireDur-f.t)/0.12);
              const aF=Math.min(fadeIn,fadeOut);
              // Vertical flame column
              g.fillStyle(0xff4400,0.45*aF);
              g.fillRect(f.x-f.w/2,30,f.w,H-60);
              g.fillStyle(0xff8800,0.7*aF);
              g.fillRect(f.x-f.w/4,30,f.w/2,H-60);
              g.fillStyle(0xffffff,0.55*aF);
              g.fillRect(f.x-3,30,6,H-60);
              // Embers
              for(let ei=0;ei<6;ei++){
                const ey=30+Math.random()*(H-60);
                g.fillStyle(0xffdd44,0.7*aF);
                g.fillCircle(f.x+(Math.random()-0.5)*f.w*0.7,ey,1.5+Math.random());
              }
            }
          });
        }
      }

      // ── Shared: HP arc ──
      const hpCol=hpF>0.6?col:hpF>0.3?0xffaa00:0xff2244;
      g.lineStyle(4,hpCol,1);
      g.beginPath();g.arc(x,y,sz+18,-Math.PI/2,-Math.PI/2+Math.PI*2*hpF);g.strokePath();
      g.lineStyle(1,hpCol,0.2);
      g.beginPath();g.arc(x,y,sz+18,-Math.PI/2,-Math.PI/2+Math.PI*2);g.strokePath();

      // ── Weak point — rotating glowing hex ──
      const wa=e.weakAngle||0;
      const wpx=x+Math.cos(wa)*(sz+4);
      const wpy=y+Math.sin(wa)*(sz+4);
      const wpPulse=0.6+0.4*Math.sin(t*8);
      g.fillStyle(0xffffff,wpPulse*0.9);g.fillCircle(wpx,wpy,6);
      g.lineStyle(2,0xffffff,wpPulse*0.6);g.strokeCircle(wpx,wpy,10);
      // Weak point hit flash
      if(e.weakHit){g.fillStyle(0xffffff,0.9);g.fillCircle(wpx,wpy,14);}

      // ── Phase indicator ──
      for(let p=0;p<3;p++){
        const pA=p<(phase-1)?1:p===(phase-1)?0.8:0.15;
        const pC=p===0?col:p===1?0xffaa00:0xff2244;
        g.fillStyle(pC,pA);g.fillCircle(x-18+p*18,y+sz+22,4+(p===phase-1?2:0));
      }

      // ── White core dot ──
      g.fillStyle(0xffffff,0.9);g.fillCircle(x,y,5);

      // ── Telegraphs ──
      if(e._telegraphs&&e._telegraphs.length){
        for(let i=e._telegraphs.length-1;i>=0;i--){
          const tg=e._telegraphs[i];
          const elapsed=this.t-tg.startT;
          if(elapsed>=tg.duration){e._telegraphs.splice(i,1);continue;}
          const progress=elapsed/tg.duration;
          const alpha=0.3+0.4*Math.sin(elapsed*14);
          const len=600*progress;
          const tx=x+Math.cos(tg.angle)*len;
          const ty=y+Math.sin(tg.angle)*len;
          g.lineStyle(2,tg.color,alpha);
          g.beginPath();
          g.moveTo(x,y);
          g.lineTo(tx,ty);
          g.strokePath();
        }
      }
    }catch(err){console.error('[DRAW BOSS]',err);}
  }

  _render(){
    this.gfxBubble.clear();this.gfxMain.clear();this.gfxUi.clear();
    // ── DEV hitbox overlay ──
    if(window.DEV&&window.DEV.showHitboxes){
      try{
        this.gfxUi.lineStyle(1,0x00ff44,0.7);this.gfxUi.strokeCircle(this.px,this.py,20); // player
        this.gfxUi.lineStyle(1,0x00ffcc,0.5);if(this.bubbleRadius>2)this.gfxUi.strokeCircle(this.px,this.py,this.bubbleRadius); // bubble
        this.enemies.forEach(e=>{this.gfxUi.lineStyle(1,0xff4444,0.6);this.gfxUi.strokeCircle(e.x,e.y,e.size+5);});
        this.bullets.forEach(b=>{this.gfxUi.fillStyle(b.reflected?0x00ffcc:0xff4444,0.4);this.gfxUi.fillCircle(b.x,b.y,b.size||5);});
      }catch(e){}
    }
    // ── DEV enemy labels ──
    if(window.DEV&&window.DEV.showLabels){
      try{
        this.enemies.forEach(e=>{
          const lns=[
            `${e.type} HP:${e.hp.toFixed(1)}`,
            `crp:${e.corruptions||0} def:${e.defected?'Y':'N'}`,
            `spd:${Math.round(e.spd)} sT:${(e.sT||0).toFixed(1)}`,
          ];
          lns.forEach((l,i)=>{
            this.gfxUi.fillStyle(0x000000,0.7);this.gfxUi.fillRect(e.x-40,e.y-e.size-38+i*12,80,11);
          });
        });
        // FPS counter
        if(window.DEV.showFPS){
          this.gfxUi.fillStyle(0x000000,0.8);this.gfxUi.fillRect(W-80,36,78,16);
        }
      }catch(e){}
    }
    this.gfxFx2.clear();this.gfxBgDepth.clear();
    this._drawGrid(); // redraw grid + circuit board every frame

    // #2 Run mutation env tint — subtle corner vignette in mutation color
    if(this._runMutations&&this._runMutations.length>0){
      const mc=this._runMutations[0].col||0x00ff88;
      const ma=0.025+0.012*Math.sin(this.t*1.8);
      this.gfxBgDepth.fillStyle(mc,ma);
      this.gfxBgDepth.fillRect(0,0,W,H);
    }


    // ── Firewall quarantine cells ──
    if(this.firewallCells){
      this.firewallCells.forEach(fc=>{
        const p=fc.life/fc.maxLife;
        const pulse=0.3+0.25*Math.sin(this.t*8);
        this.gfxBgDepth.fillStyle(0xff0000,(1-p)*0.18*pulse);
        this.gfxBgDepth.fillRect(fc.x-40,fc.y-40,80,80);
        this.gfxBgDepth.lineStyle(1,0xff2244,p*0.5*pulse);
        this.gfxBgDepth.strokeRect(fc.x-40,fc.y-40,80,80);
        // Lock symbol — X in centre
        this.gfxBgDepth.lineStyle(1,0xff2244,p*0.4);
        this.gfxBgDepth.moveTo(fc.x-10,fc.y-10);this.gfxBgDepth.lineTo(fc.x+10,fc.y+10);this.gfxBgDepth.strokePath();
        this.gfxBgDepth.moveTo(fc.x+10,fc.y-10);this.gfxBgDepth.lineTo(fc.x-10,fc.y+10);this.gfxBgDepth.strokePath();
      });
    }

    // ── Data corruption zones — more visible ──
    this.corruptZones.forEach(z=>{
      // Dark fill
      this.gfxBgDepth.fillStyle(0x000000,0.35);
      this.gfxBgDepth.beginPath();
      for(let s=0;s<16;s++){const a=(Math.PI*2/16)*s+z.rot;this.gfxBgDepth.lineTo(z.x+Math.cos(a)*z.rx,z.y+Math.sin(a)*z.ry);}
      this.gfxBgDepth.closePath();this.gfxBgDepth.fillPath();
      // Glitchy scanlines inside zone
      const steps=Math.floor(z.ry/6);
      for(let s=-steps;s<steps;s++){
        const ly=z.y+s*6;const scanA=Math.sin(this.t*3+s*0.8)*0.08;
        if(Math.abs(scanA)<0.01)continue;
        this.gfxBgDepth.lineStyle(1,0x220033,Math.abs(scanA));
        const hw=Math.sqrt(Math.max(0,z.rx*z.rx*(1-(s*6/z.ry)**2)));
        this.gfxBgDepth.moveTo(z.x-hw,ly);this.gfxBgDepth.lineTo(z.x+hw,ly);
        this.gfxBgDepth.strokePath();
      }
      // Pulsing border
      const bp=0.15+0.1*Math.sin(this.t*2+z.rot);
      this.gfxBgDepth.lineStyle(1,0x440066,bp);
      this.gfxBgDepth.beginPath();
      for(let s=0;s<16;s++){const a=(Math.PI*2/16)*s+z.rot;this.gfxBgDepth.lineTo(z.x+Math.cos(a)*z.rx,z.y+Math.sin(a)*z.ry);}
      this.gfxBgDepth.closePath();this.gfxBgDepth.strokePath();
    });

    // ── Shockwave rings ──
    this.shockRings.forEach(r=>{
      this.gfxFx2.lineStyle(2,r.col,r.alpha);this.gfxFx2.strokeCircle(r.x,r.y,r.radius);
      this.gfxFx2.lineStyle(6,r.col,r.alpha*0.15);this.gfxFx2.strokeCircle(r.x,r.y,r.radius);
    });

    // ── Power-activation FX: lightning bolts + decoy outlines ──
    this._renderLightningBolts(this.gfxFx2);
    this._renderDecoyOutlines(this.gfxFx2);

    // ── NULL_ZONE voids ──
    if(this.nullZones){
      this.nullZones.forEach(nz=>{
        const la=(nz.life/nz.maxLife);
        this.gfxFx2.fillStyle(0x000000,0.7);this.gfxFx2.fillCircle(nz.x,nz.y,nz.r);
        this.gfxFx2.lineStyle(2,0x660066,la*0.8);this.gfxFx2.strokeCircle(nz.x,nz.y,nz.r);
        this.gfxFx2.lineStyle(1,0x330033,la*0.4);this.gfxFx2.strokeCircle(nz.x,nz.y,nz.r*1.15);
        // Rotating ring
        for(let s=0;s<6;s++){const a=this.t*1.5+(Math.PI/3)*s;this.gfxFx2.fillStyle(0xaa00ff,la*0.5);this.gfxFx2.fillCircle(nz.x+Math.cos(a)*nz.r,nz.y+Math.sin(a)*nz.r,3);}
      });
    }
    // ── DECOY render ──
    if(this.decoyPos){
      const dp=this.decoyPos;const da=(dp.life/dp.maxLife);
      const dblink=Math.sin(this.t*8)>0;
      this.gfxFx2.fillStyle(this.shipColor,da*0.4*( dblink?1:0.3));this.gfxFx2.fillCircle(dp.x,dp.y,14);
      this.gfxFx2.lineStyle(2,this.shipColor,da*0.8*(dblink?1:0.4));
      this.gfxFx2.beginPath();for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)this.gfxFx2.moveTo(dp.x+Math.cos(a)*16,dp.y+Math.sin(a)*16);else this.gfxFx2.lineTo(dp.x+Math.cos(a)*16,dp.y+Math.sin(a)*16);}
      this.gfxFx2.closePath();this.gfxFx2.strokePath();
    }

    // ── Ping hex rings ──
    try{
      this.pingRings.forEach(r=>{
        if(!r.active)return;
        this.gfxFx2.lineStyle(2,0x00ffcc,r.alpha);
        this.gfxFx2.beginPath();
        for(let s=0;s<6;s++){
          const a=(Math.PI/3)*s;
          if(s===0)this.gfxFx2.moveTo(r.x+Math.cos(a)*r.radius,r.y+Math.sin(a)*r.radius);
          else this.gfxFx2.lineTo(r.x+Math.cos(a)*r.radius,r.y+Math.sin(a)*r.radius);
        }
        this.gfxFx2.closePath();this.gfxFx2.strokePath();
        // Outer glow hex
        this.gfxFx2.lineStyle(8,0x00ffcc,r.alpha*0.1);
        this.gfxFx2.beginPath();
        for(let s=0;s<6;s++){
          const a=(Math.PI/3)*s;
          if(s===0)this.gfxFx2.moveTo(r.x+Math.cos(a)*r.radius,r.y+Math.sin(a)*r.radius);
          else this.gfxFx2.lineTo(r.x+Math.cos(a)*r.radius,r.y+Math.sin(a)*r.radius);
        }
        this.gfxFx2.closePath();this.gfxFx2.strokePath();
      });
    }catch(err){console.error('[PING RENDER ERROR]',err);}

    // ── Death fragments ──
    this.fragParts.forEach(f=>{
      this.gfxFx2.fillStyle(f.col,f.life*0.9);
      const s=f.size*f.life;const n=f.sides||3;
      this.gfxFx2.beginPath();
      for(let i=0;i<n;i++){const a=f.rot+(Math.PI*2/n)*i;if(i===0)this.gfxFx2.moveTo(f.x+Math.cos(a)*s,f.y+Math.sin(a)*s);else this.gfxFx2.lineTo(f.x+Math.cos(a)*s,f.y+Math.sin(a)*s);}
      this.gfxFx2.closePath();this.gfxFx2.fillPath();
    });

    // ── Data fragmentation movement trail ──
    // #14 Skin-reactive trail visuals
    const _skin=this.activeSkin||'ranger';
    this.movTrail.forEach(t=>{
      if(_skin==='ghost'){
        // Ghost: hollow fading rings instead of shapes
        this.gfxFx2.lineStyle(1.5,this.shipColor,t.a*0.5);
        this.gfxFx2.strokeCircle(t.x,t.y,t.size*t.a*1.4);
        this.gfxFx2.lineStyle(0.5,this.shipColor,t.a*0.2);
        this.gfxFx2.strokeCircle(t.x,t.y,t.size*t.a*2.2);
      } else if(_skin==='inferno'){
        // Inferno: fiery ember dots in red/orange
        const iCol=t.a>0.4?0xff4400:0xff8800;
        this.gfxFx2.fillStyle(iCol,t.a*0.7);
        this.gfxFx2.fillCircle(t.x,t.y,t.size*t.a*0.9);
      } else if(_skin==='phantom'){
        // Phantom: diamond afterimages
        const ps=t.size*t.a*0.8;
        this.gfxFx2.fillStyle(this.shipColor,t.a*0.3);
        this.gfxFx2.beginPath();
        this.gfxFx2.moveTo(t.x,t.y-ps);this.gfxFx2.lineTo(t.x+ps*0.6,t.y);
        this.gfxFx2.lineTo(t.x,t.y+ps);this.gfxFx2.lineTo(t.x-ps*0.6,t.y);
        this.gfxFx2.closePath();this.gfxFx2.fillPath();
      } else {
        // Default data fragment shapes
        this.gfxFx2.fillStyle(this.shipColor,t.a*0.55);
        this.gfxFx2.lineStyle(1,this.shipColor,t.a*0.8);
        const s=t.size*t.a;
        this.gfxFx2.beginPath();
        for(let i=0;i<t.sides;i++){
          const a=t.rot+(Math.PI*2/t.sides)*i;
          if(i===0)this.gfxFx2.moveTo(t.x+Math.cos(a)*s,t.y+Math.sin(a)*s);
          else this.gfxFx2.lineTo(t.x+Math.cos(a)*s,t.y+Math.sin(a)*s);
        }
        this.gfxFx2.closePath();this.gfxFx2.fillPath();this.gfxFx2.strokePath();
      }
    });
    // #14 Phantom skin — flicker effect (intermittent alpha pulse on ship core)
    if(_skin==='phantom'){
      if(!this._phantomFlickerT)this._phantomFlickerT=0;
      this._phantomFlickerT+=0.016;
      if(Math.sin(this._phantomFlickerT*7)*Math.sin(this._phantomFlickerT*13)<-0.7){
        this.gfxFx2.fillStyle(0x8888ff,0.12);
        this.gfxFx2.fillCircle(this.px,this.py,22);
      }
    }
    // #14 Inferno skin — ember particles when moving fast
    if(_skin==='inferno'&&this.fingerDown){
      const ms=Math.hypot(this.px-this.tx,this.py-this.ty);
      if(ms>5&&Math.random()<0.35){
        this.particles.push({x:this.px+(Math.random()-0.5)*10,y:this.py+(Math.random()-0.5)*10,
          vx:(Math.random()-0.5)*60,vy:-20-Math.random()*60,life:0.8,decay:1.8,col:Math.random()<0.5?0xff4400:0xff8800,size:2});
      }
    }

    // Power-ups
    this.powerups.forEach(pu=>{const p=0.35+0.4*Math.sin(this.t*5);this.gfxUi.lineStyle(2,pu.col,p);this.gfxUi.strokeCircle(pu.x,pu.y,16);this.gfxUi.fillStyle(pu.col,0.2);this.gfxUi.fillCircle(pu.x,pu.y,11);this.gfxUi.fillStyle(pu.col,0.85);this.gfxUi.fillCircle(pu.x,pu.y,4);});

    // Particles
    this.particles.forEach(p=>{this.gfxUi.fillStyle(p.col,p.life*0.85);this.gfxUi.fillCircle(p.x,p.y,p.size*p.life);});

    // Bullet trails + bullets
    this.bullets.forEach(b=>{
      // Binary digit trail (data stream effect)
      b.trail.forEach((tr,i)=>{
        const a=(i/b.trail.length)*0.35;
        if(i%2===0){
          this.gfxMain.fillStyle(b.col,a*0.6);
          this.gfxMain.fillRect(tr.x-1,tr.y-2,2,4); // tiny binary dash
        } else {
          this.gfxMain.fillStyle(b.col,a*0.4);
          this.gfxMain.fillCircle(tr.x,tr.y,b.size*(i/b.trail.length)*0.6);
        }
      });
      // Convergence hint — if bullet heading toward player, show faint line
      if(!b.reflected){
        const toBullet=Math.hypot(b.x-this.px,b.y-this.py);
        const dotProd=(b.vx*(this.px-b.x)+b.vy*(this.py-b.y));
        if(dotProd>0&&toBullet<200){
          const threat=1-toBullet/200;
          this.gfxMain.lineStyle(1,b.col,threat*0.12);
          this.gfxMain.moveTo(b.x,b.y);this.gfxMain.lineTo(this.px,this.py);
          this.gfxMain.strokePath();
        }
      }
      // Bullet trail glow halo
      const _gR=(b.size||4)*2.5;
      this.gfxMain.fillStyle(b.col,0.12);
      this.gfxMain.fillCircle(b.x,b.y,_gR);
      // #8 Bullet personality — per-enemy-type shapes
      this.gfxMain.fillStyle(b.col,b.reflected?0.4:0.15);this.gfxMain.fillCircle(b.x,b.y,b.size*2.8);
      const et=b.etype||'';
      if(et==='sniper'){
        // Elongated needle along velocity direction
        const ang=Math.atan2(b.vy,b.vx);
        const len=b.size*3.5,hw=b.size*0.7;
        this.gfxMain.fillStyle(b.col,1);
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(b.x+Math.cos(ang)*len,b.y+Math.sin(ang)*len);
        this.gfxMain.lineTo(b.x+Math.cos(ang+Math.PI/2)*hw,b.y+Math.sin(ang+Math.PI/2)*hw);
        this.gfxMain.lineTo(b.x-Math.cos(ang)*len*0.5,b.y-Math.sin(ang)*len*0.5);
        this.gfxMain.lineTo(b.x+Math.cos(ang-Math.PI/2)*hw,b.y+Math.sin(ang-Math.PI/2)*hw);
        this.gfxMain.closePath();this.gfxMain.fillPath();
      } else if(et==='tank'){
        // Chunky square + outer shockwave ring
        const s=b.size*1.4;
        this.gfxMain.fillStyle(b.col,1);
        this.gfxMain.fillRect(b.x-s,b.y-s,s*2,s*2);
        this.gfxMain.lineStyle(1,b.col,0.4);
        this.gfxMain.strokeCircle(b.x,b.y,b.size*2.2);
      } else if(et==='rootkit'){
        // Jittery blue square with inner glyph-suggestion
        const jx=(Math.random()-0.5)*0.6, jy=(Math.random()-0.5)*0.6;
        const s=b.size*1.2;
        this.gfxMain.fillStyle(b.col,1);
        this.gfxMain.fillRect(b.x-s+jx,b.y-s+jy,s*2,s*2);
        this.gfxMain.fillStyle(0x000000,0.45);
        this.gfxMain.fillRect(b.x-s*0.55+jx,b.y-s*0.55+jy,s*0.5,s*0.5);
        this.gfxMain.fillRect(b.x+s*0.05+jx,b.y+s*0.05+jy,s*0.5,s*0.5);
      } else if(et==='phantom'){
        // Translucent cyan wisp — small circle + outer halo
        this.gfxMain.fillStyle(b.col,0.5);this.gfxMain.fillCircle(b.x,b.y,b.size*0.9);
        this.gfxMain.lineStyle(1.5,b.col,0.4);this.gfxMain.strokeCircle(b.x,b.y,b.size*1.6);
      } else if(et==='swarm'||et==='pulsar'){
        // Tiny fast dot + 3-frame comma-trail behind
        b._trailPts=b._trailPts||[];
        b._trailPts.push({x:b.x,y:b.y});
        if(b._trailPts.length>4)b._trailPts.shift();
        for(let i=0;i<b._trailPts.length-1;i++){
          const tp=b._trailPts[i];
          const k=(i+1)/b._trailPts.length;
          this.gfxMain.fillStyle(b.col,k*0.55);
          this.gfxMain.fillCircle(tp.x,tp.y,b.size*0.5*(k*0.7+0.3));
        }
        this.gfxMain.fillStyle(b.col,1);this.gfxMain.fillCircle(b.x,b.y,b.size*0.8);
      } else if(et==='leech'){
        // Pulsing orb + sine-wavy tail
        const pulse=b.size*(0.9+0.25*Math.sin(this.t*8+b.x*0.02));
        b._trailPts=b._trailPts||[];
        b._trailPts.push({x:b.x,y:b.y});
        if(b._trailPts.length>8)b._trailPts.shift();
        const ang=Math.atan2(b.vy,b.vx);
        const px=Math.cos(ang+Math.PI/2),py=Math.sin(ang+Math.PI/2);
        for(let i=0;i<b._trailPts.length;i++){
          const tp=b._trailPts[i];
          const k=i/b._trailPts.length;
          const wave=Math.sin(this.t*10+i*0.8)*3*(1-k);
          this.gfxMain.fillStyle(b.col,k*0.5);
          this.gfxMain.fillCircle(tp.x+px*wave,tp.y+py*wave,b.size*0.4*k);
        }
        this.gfxMain.fillStyle(b.col,1);this.gfxMain.fillCircle(b.x,b.y,pulse);
      } else if(et==='bouncer'){
        // Rotating triangle — rotation tied to position/time
        const rot=this.t*4+b.x*0.005;
        const rs=b.size*1.5;
        this.gfxMain.fillStyle(b.col,1);
        this.gfxMain.beginPath();
        for(let i=0;i<3;i++){
          const a=rot+(Math.PI*2/3)*i;
          const tx=b.x+Math.cos(a)*rs,ty=b.y+Math.sin(a)*rs;
          if(i===0)this.gfxMain.moveTo(tx,ty);else this.gfxMain.lineTo(tx,ty);
        }
        this.gfxMain.closePath();this.gfxMain.fillPath();
      } else if(et==='grunt'){
        // Diamond — rotated square
        const s=b.size*0.95;
        this.gfxMain.fillStyle(b.col,1);
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(b.x,b.y-s);
        this.gfxMain.lineTo(b.x+s,b.y);
        this.gfxMain.lineTo(b.x,b.y+s);
        this.gfxMain.lineTo(b.x-s,b.y);
        this.gfxMain.closePath();this.gfxMain.fillPath();
      } else if(et==='boss'){
        // Saturated halo'd orb
        this.gfxMain.fillStyle(b.col,0.3);this.gfxMain.fillCircle(b.x,b.y,b.size*2.2);
        this.gfxMain.fillStyle(b.col,1);this.gfxMain.fillCircle(b.x,b.y,b.size*1.1);
      } else {
        this.gfxMain.fillStyle(b.col,1);this.gfxMain.fillCircle(b.x,b.y,b.size);
      }
    });

    // Enemy motion trails + boot sequence
    this.enemies.forEach(e=>{
      // Boot sequence — wireframe materialise effect
      if(e.bootT>0){
        e.bootT-=0.016;
        const prog=Math.max(0,1-e.bootT/0.4);
        // Wireframe outline that fills in
        this.gfxMain.lineStyle(1,e.color,0.4+prog*0.5);
        this.gfxMain.strokeCircle(e.x,e.y,e.size*(1.2+0.3*(1-prog)));
        // Scan lines across enemy
        for(let s=-3;s<=3;s++){
          const sy=e.y+s*(e.size/3);const hw=Math.sqrt(Math.max(0,e.size*e.size-(s*e.size/3)**2));
          this.gfxMain.lineStyle(1,e.color,prog*0.6*(0.3+0.3*Math.sin(this.t*20+s)));
          this.gfxMain.beginPath();this.gfxMain.moveTo(e.x-hw,sy);this.gfxMain.lineTo(e.x+hw,sy);this.gfxMain.strokePath();
        }
        // Binary digits spawning around it
        if(Math.random()<0.3){
          const a=Math.random()*Math.PI*2;const r=e.size*1.5;
          this.particles.push({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r,vx:0,vy:0,life:0.3,decay:3,col:e.color,size:2});
        }
        if(prog>=1)e.bootT=0;
      }
    });

    // Enemy motion trails
    this.enemies.forEach(e=>{
      if(e.trail&&e.trail.length>1){
        e.trail.forEach((pt,i)=>{
          const a=(i/e.trail.length)*0.25;
          const s=(i/e.trail.length)*e.size*0.6;
          this.gfxMain.fillStyle(e.color,a);
          this.gfxMain.fillCircle(pt.x,pt.y,s);
        });
        // Sniper background tracking thread — very faint, subtle dashed segments
        // so it reads as "watching" rather than a competing aim line.
        if(e.type==='sniper'){
          const dx=this.px-e.x,dy=this.py-e.y,d=Math.hypot(dx,dy)||1;
          const ux=dx/d, uy=dy/d;
          const segs = 8;
          for(let s=0;s<segs;s++){
            const t0 = s/segs, t1 = (s+0.45)/segs;
            this.gfxMain.lineStyle(1, 0xff8800, 0.08);
            this.gfxMain.beginPath();
            this.gfxMain.moveTo(e.x + ux*d*t0, e.y + uy*d*t0);
            this.gfxMain.lineTo(e.x + ux*d*t1, e.y + uy*d*t1);
            this.gfxMain.strokePath();
          }
        }
      }
    });

    // Enemy PIDs floating above
    this.enemies.forEach(e=>{
      if(!e.pid)e.pid='0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
      if(!e.isBoss&&e.bootT<=0){
        this.gfxUi.fillStyle(e.color,0.4);
        // Draw mini text as small dots (can't use text in graphics - skip, labels handled by Phaser text pooling)
      }
    });

    // Enemy process ID labels
    this.enemies.forEach(e=>{
      if(e.isBoss||e.bootT>0.05)return;
      if(e.type==='rootkit'&&!e.visible)return;
      if(!e.pid)e.pid='0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
      const labelA=0.35+0.15*Math.sin(this.t*3+e.x*0.01);
      // Draw as small pixel-rect above enemy (no Phaser text in graphics, use 3px dots pattern)
      // Instead: tiny colored bracket indicator
      this.gfxUi.lineStyle(1,e.color,labelA*0.6);
      this.gfxUi.beginPath();
      this.gfxUi.moveTo(e.x-8,e.y-e.size-8);
      this.gfxUi.lineTo(e.x+8,e.y-e.size-8);
      this.gfxUi.strokePath();
    });

    // Enemies — unique shapes
    this.enemies.forEach(e=>{
      if(e.isBoss){this._drawBoss(this.gfxMain,e);return;}
      // Rootkit: only draw if visible or revealed
      if(e.type==='rootkit'&&!e.visible&&!e.revealed)return;
      // Rootkit glitch shimmer while flashing
      if(e.type==='rootkit'&&e.visible&&!e.revealed){
        const gOff=(Math.random()-0.5)*4;
        this.gfxMain.fillStyle(0x00ff88,0.15);
        this.gfxMain.fillCircle(e.x+gOff,e.y,e.size*1.8);
      }
      this._drawEnemy(this.gfxMain,e);
      // #2 Mutation badge — pulsing ring + small indicator for mutated enemies
      if(e._mut&&!e.isBoss){
        const mc=e._mutCol||0x00ff88;
        const mp=0.4+0.35*Math.sin(this.t*5+e.x*0.02);
        this.gfxMain.lineStyle(1.5,mc,mp);
        this.gfxMain.strokeCircle(e.x,e.y,e.size+4+2*Math.sin(this.t*6));
        // Small diamond badge above enemy
        const bx=e.x,by=e.y-e.size-10;
        this.gfxMain.fillStyle(mc,0.85);
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(bx,by-5);
        this.gfxMain.lineTo(bx+4,by);
        this.gfxMain.lineTo(bx,by+5);
        this.gfxMain.lineTo(bx-4,by);
        this.gfxMain.closePath();this.gfxMain.fillPath();
      }
    });

    // ── HEX WARP FIELD — tiered visuals ──
    if(this.bubbleRadius>2){
      const h=this.bubbleHeat/100;
      const tier=this.upg.bubble_size||0;
      let col;
      if(h<0.5) col=Phaser.Display.Color.Interpolate.ColorWithColor({r:0,g:200,b:255},{r:255,g:220,b:0},100,h*200);
      else       col=Phaser.Display.Color.Interpolate.ColorWithColor({r:255,g:220,b:0},{r:255,g:30,b:0},100,(h-0.5)*200);
      const hexCol=(col.r<<16)|(col.g<<8)|col.b;
      const R=this.bubbleRadius;
      const rot=this.t*0.3;
      const gb=this.gfxBubble;

      // ── ALL TIERS: outer fill + main hex border ──
      gb.fillStyle(hexCol,0.04+h*0.03);
      gb.beginPath();
      for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*(R+20),this.py+Math.sin(a)*(R+20)):gb.lineTo(this.px+Math.cos(a)*(R+20),this.py+Math.sin(a)*(R+20));}
      gb.closePath();gb.fillPath();

      gb.lineStyle(2,hexCol,0.9);
      gb.beginPath();
      for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R,this.py+Math.sin(a)*R):gb.lineTo(this.px+Math.cos(a)*R,this.py+Math.sin(a)*R);}
      gb.closePath();gb.strokePath();

      // ── ALL TIERS: counter-rotating inner hex ──
      gb.lineStyle(1,hexCol,0.25);
      gb.beginPath();
      for(let s=0;s<6;s++){const a=-rot*1.5+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R*0.6,this.py+Math.sin(a)*R*0.6):gb.lineTo(this.px+Math.cos(a)*R*0.6,this.py+Math.sin(a)*R*0.6);}
      gb.closePath();gb.strokePath();

      // I2 — extra concentric hex rings (only when bubble is meaningfully open)
      if(R>5){
        gb.lineStyle(1,hexCol,0.18);
        gb.beginPath();
        for(let s=0;s<6;s++){const a=this.t*1.7+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R*0.75,this.py+Math.sin(a)*R*0.75):gb.lineTo(this.px+Math.cos(a)*R*0.75,this.py+Math.sin(a)*R*0.75);}
        gb.closePath();gb.strokePath();

        gb.lineStyle(1,hexCol,0.22);
        gb.beginPath();
        for(let s=0;s<6;s++){const a=this.t*-2.3+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R*0.45,this.py+Math.sin(a)*R*0.45):gb.lineTo(this.px+Math.cos(a)*R*0.45,this.py+Math.sin(a)*R*0.45);}
        gb.closePath();gb.strokePath();

        // I2 — edge shimmer pulse along outer perimeter
        const _shimAlpha=0.05+0.15*Math.sin(this.t*12);
        gb.lineStyle(1,hexCol,_shimAlpha);
        gb.beginPath();
        for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R,this.py+Math.sin(a)*R):gb.lineTo(this.px+Math.cos(a)*R,this.py+Math.sin(a)*R);}
        gb.closePath();gb.strokePath();
      }

      // ── TIER 1+: circuit traces from center to corners ──
      if(tier>=1){
        gb.lineStyle(1,hexCol,0.15);
        for(let s=0;s<6;s++){
          const a=rot+(Math.PI/3)*s;
          gb.beginPath();
          gb.moveTo(this.px,this.py);
          gb.lineTo(this.px+Math.cos(a)*R*0.55,this.py+Math.sin(a)*R*0.55);
          gb.strokePath();
        }
      }

      // ── TIER 2+: mid-ring + energy nodes at corners ──
      if(tier>=2){
        gb.lineStyle(1,hexCol,0.22);
        gb.beginPath();
        for(let s=0;s<6;s++){const a=rot*0.7+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*R*0.82,this.py+Math.sin(a)*R*0.82):gb.lineTo(this.px+Math.cos(a)*R*0.82,this.py+Math.sin(a)*R*0.82);}
        gb.closePath();gb.strokePath();
        // Bright nodes at mid-ring vertices
        for(let s=0;s<6;s++){
          const a=rot*0.7+(Math.PI/3)*s;
          gb.fillStyle(hexCol,0.9);
          gb.fillCircle(this.px+Math.cos(a)*R*0.82,this.py+Math.sin(a)*R*0.82,2);
        }
      }

      // ── TIER 3+: outer ghost ring + energy arcs ──
      if(tier>=3){
        const ghostA=0.12+h*0.08;
        gb.lineStyle(1.5,hexCol,ghostA);
        gb.beginPath();
        for(let s=0;s<6;s++){const a=-rot*0.4+(Math.PI/3)*s;s===0?gb.moveTo(this.px+Math.cos(a)*(R+36),this.py+Math.sin(a)*(R+36)):gb.lineTo(this.px+Math.cos(a)*(R+36),this.py+Math.sin(a)*(R+36));}
        gb.closePath();gb.strokePath();
        // Energy arcs: lines connecting every other corner across the hex
        gb.lineStyle(1,hexCol,0.28);
        for(let s=0;s<3;s++){
          const a1=rot+(Math.PI/3)*s*2;
          const a2=rot+(Math.PI/3)*(s*2+2);
          gb.beginPath();
          gb.moveTo(this.px+Math.cos(a1)*R,this.py+Math.sin(a1)*R);
          const mx=this.px+(Math.cos(a1)+Math.cos(a2))*R*0.4;
          const my=this.py+(Math.sin(a1)+Math.sin(a2))*R*0.4;
          gb.lineTo(mx,my);
          gb.lineTo(this.px+Math.cos(a2)*R,this.py+Math.sin(a2)*R);
          gb.strokePath();
        }
      }

      // ── TIER 4: crystal matrix — 12-point ring, spokes, pulsing core ──
      if(tier>=4){
        const crystalPulse=0.6+0.4*Math.sin(this.t*4);
        gb.lineStyle(1,hexCol,0.35*crystalPulse);
        gb.beginPath();
        for(let s=0;s<12;s++){const a=rot*0.25+(Math.PI/6)*s;s===0?gb.moveTo(this.px+Math.cos(a)*(R+12),this.py+Math.sin(a)*(R+12)):gb.lineTo(this.px+Math.cos(a)*(R+12),this.py+Math.sin(a)*(R+12));}
        gb.closePath();gb.strokePath();
        // Spokes to 12-point vertices
        gb.lineStyle(1,hexCol,0.1);
        for(let s=0;s<6;s++){
          const a=rot*0.25+(Math.PI/3)*s;
          gb.beginPath();
          gb.moveTo(this.px,this.py);
          gb.lineTo(this.px+Math.cos(a)*(R+12),this.py+Math.sin(a)*(R+12));
          gb.strokePath();
        }
        // Pulsing core dot
        gb.fillStyle(hexCol,crystalPulse*0.85);
        gb.fillCircle(this.px,this.py,3);
      }

      // ── ALL TIERS: spinning corner dots (speed + size scale with heat/tier) ──
      const dotSpeed=0.8+h*4;
      const dotSize=2+tier*0.5+h*1.5;
      for(let s=0;s<6;s++){
        const a=this.t*dotSpeed+(Math.PI/3)*s;
        gb.fillStyle(hexCol,0.85);
        gb.fillCircle(this.px+Math.cos(a)*R,this.py+Math.sin(a)*R,dotSize);
      }

      // Heat glow at high heat
      if(h>0.7){
        gb.fillStyle(hexCol,(h-0.7)/0.3*0.12);
        gb.fillCircle(this.px,this.py,R*1.1);
      }
    }

    // ── PARRY WINDOW — orange hex ghost ──
    if(this.parryWindowT>0){
      const pA=this.parryWindowT/0.5;
      const pPulse=0.5+0.5*Math.sin(this.t*20);
      const pR=120;
      this.gfxBubble.lineStyle(2,0xff8800,pA*pPulse);
      this.gfxBubble.beginPath();
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)this.gfxBubble.moveTo(this.px+Math.cos(a)*pR,this.py+Math.sin(a)*pR);else this.gfxBubble.lineTo(this.px+Math.cos(a)*pR,this.py+Math.sin(a)*pR);}
      this.gfxBubble.closePath();this.gfxBubble.strokePath();
    }

    // ── OVERHEAT cooldown hex ring ──
    if(this.bubbleOverheated){
      const f=1-(this.bubbleCooldownT/3.0);
      const flicker=0.3+0.3*Math.sin(this.t*12);
      this.gfxBubble.lineStyle(1.5,0xff2200,flicker);
      this.gfxBubble.beginPath();
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)this.gfxBubble.moveTo(this.px+Math.cos(a)*42,this.py+Math.sin(a)*42);else this.gfxBubble.lineTo(this.px+Math.cos(a)*42,this.py+Math.sin(a)*42);}
      this.gfxBubble.closePath();this.gfxBubble.strokePath();
      // Arc progress
      this.gfxBubble.lineStyle(2,0xff4400,0.8);
      this.gfxBubble.beginPath();
      this.gfxBubble.arc(this.px,this.py,48,-Math.PI/2,-Math.PI/2+Math.PI*2*f);
      this.gfxBubble.strokePath();
    }

    // Packet trace path
    if(this.packetTrace.length>2){
      for(let i=1;i<this.packetTrace.length;i++){
        const p=this.packetTrace[i],pp=this.packetTrace[i-1];
        this.gfxMain.lineStyle(1,this.shipColor,p.a*0.2);
        this.gfxMain.beginPath();this.gfxMain.moveTo(pp.x,pp.y);this.gfxMain.lineTo(p.x,p.y);
        this.gfxMain.strokePath();
        if(i%5===0){this.gfxMain.fillStyle(this.shipColor,p.a*0.35);this.gfxMain.fillCircle(p.x,p.y,1.5);}
      }
    }

    // Dash afterimage trail — wall-clock decay + render gate
    // New dash only emits 6 entries per dash via interval (not per-frame), so pile-up is structurally bounded.
    if(this.dashTrail && this.dashTrail.length > 0){
      const _now = (this.game && this.game.loop && this.game.loop.time) || performance.now();
      if(this._lastTrailDecay == null) this._lastTrailDecay = _now;
      const _trailDt = Math.min(0.1, (_now - this._lastTrailDecay) / 1000);
      this._lastTrailDecay = _now;
      for(let i = this.dashTrail.length - 1; i >= 0; i--){
        this.dashTrail[i].a -= _trailDt * 6;
        if(this.dashTrail[i].a <= 0) this.dashTrail.splice(i, 1);
      }
      const _start = Math.max(0, this.dashTrail.length - 8);
      for(let i = _start; i < this.dashTrail.length; i++){
        const t = this.dashTrail[i];
        if(t.a < 0.3) continue;
        this.gfxMain.lineStyle(1, this.shipColor, t.a * 0.6);
        this.gfxMain.beginPath();
        for(let s = 0; s < 6; s++){
          const a = (Math.PI / 3) * s;
          if(s === 0) this.gfxMain.moveTo(t.x + Math.cos(a)*14*t.a, t.y + Math.sin(a)*14*t.a);
          else this.gfxMain.lineTo(t.x + Math.cos(a)*14*t.a, t.y + Math.sin(a)*14*t.a);
        }
        this.gfxMain.closePath();
        this.gfxMain.strokePath();
      }
    }

    // Player trail — small hex fragments
    this.trail.push({x:this.px,y:this.py,l:1});if(this.trail.length>14)this.trail.shift();
    this.trail.forEach(tr=>{
      if(tr.l<0.1)return;
      this.gfxMain.lineStyle(1,this.trailColor,tr.l*0.2);
      this.gfxMain.beginPath();
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(tr.x+Math.cos(a)*6*tr.l,tr.y+Math.sin(a)*6*tr.l);else this.gfxMain.lineTo(tr.x+Math.cos(a)*6*tr.l,tr.y+Math.sin(a)*6*tr.l);}
      this.gfxMain.closePath();this.gfxMain.strokePath();
      tr.l-=0.07;
    });

    // ── RGB glitch split — subtle hit-feedback, not a visible duplicate ──
    if(this.glitchSplit>0){
      this.glitchSplit-=0.016;
      const off=3+Math.random()*3;
      this.gfxMain.fillStyle(0xff0000,0.22);this.gfxMain.fillCircle(this.px-off,this.py,9);
      this.gfxMain.fillStyle(0x0088ff,0.22);this.gfxMain.fillCircle(this.px+off,this.py,9);
    }

    // ── Heat shimmer ──
    if(this.bubbleHeat>60&&!this.bubbleOverheated){
      const hf=(this.bubbleHeat-60)/40;
      for(let r=0;r<3;r++){
        const baseR=26+r*16;
        this.gfxMain.lineStyle(1.5,0xff4400,0.06*hf*(1-r/3));
        this.gfxMain.beginPath();
        for(let s=0;s<12;s++){
          const a=(Math.PI*2/12)*s;
          const wr=baseR+Math.sin(this.t*9+s*0.9)*3*hf;
          if(s===0)this.gfxMain.moveTo(this.px+Math.cos(a)*wr,this.py+Math.sin(a)*wr);
          else this.gfxMain.lineTo(this.px+Math.cos(a)*wr,this.py+Math.sin(a)*wr);
        }
        this.gfxMain.closePath();this.gfxMain.strokePath();
      }
    }

    // ── PLAYER — skin-specific unique shapes ──
    const px=this.px,py=this.py;
    const rot=this.t*0.8;
    const skin=this.activeSkin||'ranger';
    const sc=this.shipColor;

    // Outer glow — combo-reactive
    let gCol=sc,gA=0.1+0.06*Math.sin(this.t*4);
    if(this.combo>=20){gCol=0xffd700;gA=0.35;}
    else if(this.combo>=10){gCol=0xff6600;gA=0.25;}
    else if(this.combo>=5){gCol=0xffdd00;gA=0.18;}
    this.gfxMain.fillStyle(gCol,gA);this.gfxMain.fillCircle(px,py,42);

    // #9 Combo embodiment — player reacts visually at combo milestones
    if(this.combo>=5){
      const cp=this.combo>=20?1:this.combo>=10?0.6:0.3;
      const cRing1=this.combo>=20?0xffd700:this.combo>=10?0xff6600:0xffdd00;
      const ringR=32+8*Math.sin(this.t*(this.combo>=20?8:5));
      this.gfxMain.lineStyle(1+cp,cRing1,0.25+cp*0.35);
      this.gfxMain.strokeCircle(px,py,ringR);
    }
    if(this.combo>=10){
      // Electricity arcs around ship
      const arcCount=this.combo>=20?6:3;
      const arcCol=this.combo>=20?0xffd700:0xff8800;
      for(let a=0;a<arcCount;a++){
        const baseA=this.t*3.5+(Math.PI*2/arcCount)*a;
        const r1=18,r2=28+Math.random()*8;
        const mx=px+Math.cos(baseA+0.4)*((r1+r2)/2)+( Math.random()-0.5)*4;
        const my=py+Math.sin(baseA+0.4)*((r1+r2)/2)+(Math.random()-0.5)*4;
        this.gfxMain.lineStyle(1,arcCol,0.5+0.4*Math.random());
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(px+Math.cos(baseA)*r1,py+Math.sin(baseA)*r1);
        this.gfxMain.lineTo(mx,my);
        this.gfxMain.lineTo(px+Math.cos(baseA+0.8)*r2,py+Math.sin(baseA+0.8)*r2);
        this.gfxMain.strokePath();
      }
    }
    if(this.combo>=20){
      // Outer distortion ring — fast spin, double-ring
      const dr=50+4*Math.sin(this.t*6);
      this.gfxMain.lineStyle(2,0xffd700,0.22+0.15*Math.sin(this.t*7));
      this.gfxMain.strokeCircle(px,py,dr);
      this.gfxMain.lineStyle(1,0xffffff,0.1+0.08*Math.sin(this.t*11));
      this.gfxMain.strokeCircle(px,py,dr+6);
      // Play-area border glow (HUD-contained, not full screen)
      const LP=130,RP=130;
      const bpa=0.18+0.12*Math.sin(this.t*5);
      this.gfxMain.lineStyle(3,0xffd700,bpa);
      this.gfxMain.strokeRect(LP+4,4,W-LP-RP-8,H-8);
      this.gfxMain.lineStyle(1,0xffd700,bpa*0.4);
      this.gfxMain.strokeRect(LP+10,10,W-LP-RP-20,H-20);
    }

    try{
      // Archetype-unify hook: when active, replace skin-specific draws with archetype hex+glyph+flair
      if (this._archetypeRender) {
        this._archetypeRender(px, py, rot);
      } else if(skin==='ranger'){
        // Standard flat-top hexagon with circuit traces
        this.gfxMain.lineStyle(1,sc,0.2);
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*22,py+Math.sin(a)*22);else this.gfxMain.lineTo(px+Math.cos(a)*22,py+Math.sin(a)*22);}
        this.gfxMain.closePath();this.gfxMain.strokePath();
        this.gfxMain.fillStyle(sc,0.9);
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*14,py+Math.sin(a)*14);else this.gfxMain.lineTo(px+Math.cos(a)*14,py+Math.sin(a)*14);}
        this.gfxMain.closePath();this.gfxMain.fillPath();
        // Circuit traces
        this.gfxMain.lineStyle(1,0xffffff,0.2);
        for(let s=0;s<6;s++){const a=this.t*-0.5+(Math.PI/3)*s;this.gfxMain.moveTo(px,py);this.gfxMain.lineTo(px+Math.cos(a)*9,py+Math.sin(a)*9);this.gfxMain.strokePath();}
        // RANGER passive: speed bar arc around ship
        if(this.rangerSpeedBonus>0){
          const rb=this.rangerSpeedBonus/0.5;
          this.gfxMain.lineStyle(1.5,sc,0.4);
          this.gfxMain.beginPath();this.gfxMain.arc(px,py,24,-Math.PI/2,-Math.PI/2+Math.PI*2*rb);this.gfxMain.strokePath();
        }

      }else if(skin==='phantom'){
        // Elongated vertical diamond — tall 4-point shape
        const h=20,w=10;
        this.gfxMain.fillStyle(sc,0.85);
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(px,py-h); // top
        this.gfxMain.lineTo(px+w,py); // right
        this.gfxMain.lineTo(px,py+h); // bottom
        this.gfxMain.lineTo(px-w,py); // left
        this.gfxMain.closePath();this.gfxMain.fillPath();
        this.gfxMain.lineStyle(1.5,sc,0.5);
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(px,py-h);this.gfxMain.lineTo(px+w,py);this.gfxMain.lineTo(px,py+h);this.gfxMain.lineTo(px-w,py);
        this.gfxMain.closePath();this.gfxMain.strokePath();
        // Inner small diamond counter-rotating
        this.gfxMain.lineStyle(1,sc,0.3);
        const ir=this.t*-1.2;
        this.gfxMain.beginPath();
        this.gfxMain.moveTo(px+Math.cos(ir)*8,py+Math.sin(ir)*8);
        this.gfxMain.lineTo(px+Math.cos(ir+Math.PI/2)*5,py+Math.sin(ir+Math.PI/2)*5);
        this.gfxMain.lineTo(px+Math.cos(ir+Math.PI)*8,py+Math.sin(ir+Math.PI)*8);
        this.gfxMain.lineTo(px+Math.cos(ir+Math.PI*1.5)*5,py+Math.sin(ir+Math.PI*1.5)*5);
        this.gfxMain.closePath();this.gfxMain.strokePath();
        // Phantom decoy ghosts (only visible in non-archetype-unify mode — _archetypeRender bypasses this branch)
        if(this.phantomDecoys){this.phantomDecoys.forEach(d=>{
          const da=(d.life/2);
          this.gfxMain.lineStyle(1,sc,da*0.5);
          this.gfxMain.beginPath();this.gfxMain.moveTo(d.x,d.y-h*da);this.gfxMain.lineTo(d.x+w*da,d.y);this.gfxMain.lineTo(d.x,d.y+h*da);this.gfxMain.lineTo(d.x-w*da,d.y);
          this.gfxMain.closePath();this.gfxMain.strokePath();
        });}

      }else if(skin==='inferno'){
        // 8-point aggressive star — fast spin
        const starRot=this.t*2.2;
        const r1=16,r2=8;
        this.gfxMain.fillStyle(sc,0.9);
        this.gfxMain.beginPath();
        for(let s=0;s<8;s++){
          const a=starRot+(Math.PI/4)*s;
          const r=s%2===0?r1:r2;
          if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
          else this.gfxMain.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
        }
        this.gfxMain.closePath();this.gfxMain.fillPath();
        // Rage meter ring
        if(this.rageMeter>0){
          const rf=this.rageMeter/100;
          const rc=this.rageActive?0xff2200:sc;
          this.gfxMain.lineStyle(2,rc,0.7);
          this.gfxMain.beginPath();this.gfxMain.arc(px,py,22,-Math.PI/2,-Math.PI/2+Math.PI*2*rf);this.gfxMain.strokePath();
          if(this.rageActive){
            const rp=0.5+0.5*Math.sin(this.t*12);
            this.gfxMain.lineStyle(3,0xff4400,rp*0.4);this.gfxMain.strokeCircle(px,py,28);
          }
        }

      }else if(skin==='core'){
        // Double concentric hexagon — heavy armored
        // Outer hex
        this.gfxMain.lineStyle(3,sc,0.8);
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){const a=rot+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*20,py+Math.sin(a)*20);else this.gfxMain.lineTo(px+Math.cos(a)*20,py+Math.sin(a)*20);}
        this.gfxMain.closePath();this.gfxMain.strokePath();
        // Inner hex filled
        this.gfxMain.fillStyle(sc,0.7);
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){const a=rot*-0.6+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*11,py+Math.sin(a)*11);else this.gfxMain.lineTo(px+Math.cos(a)*11,py+Math.sin(a)*11);}
        this.gfxMain.closePath();this.gfxMain.fillPath();
        // Armor segments between rings
        this.gfxMain.lineStyle(1,sc,0.35);
        for(let s=0;s<6;s++){
          const a=rot+(Math.PI/3)*s;
          this.gfxMain.moveTo(px+Math.cos(a)*11,py+Math.sin(a)*11);
          this.gfxMain.lineTo(px+Math.cos(a)*20,py+Math.sin(a)*20);
          this.gfxMain.strokePath();
        }
        // Shield hit indicator
        if(!this.shieldActive){
          this.gfxMain.lineStyle(1,0xff4444,0.3+0.2*Math.sin(this.t*4));this.gfxMain.strokeCircle(px,py,24);
        }

      }else if(skin==='ghost'){
        // Flickering irregular hex — vertices offset randomly
        const glitchSeed=Math.floor(this.t*8);
        const hash=(n)=>((n*7+glitchSeed*3)%11)/11;
        this.gfxMain.fillStyle(sc,0.55+0.2*Math.sin(this.t*3));
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){
          const a=rot+(Math.PI/3)*s;
          const jitter=1+(hash(s)-0.5)*0.4; // ±20% size jitter
          const r=14*jitter;
          if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
          else this.gfxMain.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
        }
        this.gfxMain.closePath();this.gfxMain.fillPath();
        this.gfxMain.lineStyle(1,sc,0.6);
        this.gfxMain.beginPath();
        for(let s=0;s<6;s++){
          const a=rot+(Math.PI/3)*s;const jitter=1+(hash(s+6)-0.5)*0.4;const r=14*jitter;
          if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
          else this.gfxMain.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);
        }
        this.gfxMain.closePath();this.gfxMain.strokePath();
        // Ghost echo trail dots
        this.gfxMain.lineStyle(1.5,sc,0.25);this.gfxMain.strokeCircle(px,py,20);

      }else if(skin==='virus'){
        // Asymmetric corrupted 7-sided shape, one glitched vertex
        this.gfxMain.fillStyle(sc,0.85);
        this.gfxMain.beginPath();
        const sides=7;
        for(let s=0;s<sides;s++){
          const a=rot+(Math.PI*2/sides)*s;
          const isGlitch=s===3; // one broken vertex
          const r=isGlitch?14+Math.sin(this.t*15)*6:14; // glitches wildly
          const glitchOff=isGlitch?(Math.random()-0.5)*4:0;
          if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*r+glitchOff,py+Math.sin(a)*r);
          else this.gfxMain.lineTo(px+Math.cos(a)*r+glitchOff,py+Math.sin(a)*r);
        }
        this.gfxMain.closePath();this.gfxMain.fillPath();
        // Corruption cracks
        this.gfxMain.lineStyle(1,0xff0000,0.5);
        this.gfxMain.moveTo(px,py);this.gfxMain.lineTo(px+Math.cos(rot+0.8)*14,py+Math.sin(rot+0.8)*14);this.gfxMain.strokePath();
        this.gfxMain.lineStyle(1,0x00ff44,0.4);
        this.gfxMain.moveTo(px,py);this.gfxMain.lineTo(px+Math.cos(rot+2.9)*12,py+Math.sin(rot+2.9)*12);this.gfxMain.strokePath();
        // Infection pulse
        const ip=0.15+0.1*Math.sin(this.t*5);
        this.gfxMain.lineStyle(1,0x00ff44,ip);this.gfxMain.strokeCircle(px,py,22+Math.sin(this.t*3)*3);
      }
    }catch(e){}

    // Core dot — all skins
    const corePulse=0.7+0.3*Math.sin(this.t*6);
    this.gfxMain.fillStyle(0xffffff,corePulse);this.gfxMain.fillCircle(px,py,3);

    // Damage flash — white burst then red ring
    if(this._dmgFlashT>0){
      const fa=this._dmgFlashT/0.28;
      this.gfxMain.fillStyle(0xffffff,fa*0.55);this.gfxMain.fillCircle(px,py,36);
      this.gfxMain.lineStyle(3,0xff2244,fa*0.9);this.gfxMain.strokeCircle(px,py,28+fa*12);
    }

    // Screen edge at high combo
    if(this.combo>=10){
      const ec=this.combo>=20?0xffd700:0xff6600;
      const ea=(0.04+0.03*Math.sin(this.t*3))*(this.combo>=20?1.5:1);
      this.gfxMain.lineStyle(44,ec,ea);this.gfxMain.strokeRect(0,0,W,H);
    }
    // ENCORE wave: pulsing cyan border showing stakes
    if(this.waveModifier==='ENCORE'){
      const ea2=0.25+0.18*Math.sin(this.t*4);
      this.gfxMain.lineStyle(8,0x00ffcc,ea2);this.gfxMain.strokeRect(4,4,W-8,H-8);
      this.gfxMain.lineStyle(2,0x00ffcc,ea2*0.4);this.gfxMain.strokeRect(14,14,W-28,H-28);
    }
    // Power ready pulse — brief ring from player when cooldown hits zero
    if(this._powerReadyPulseT>0){
      this._powerReadyPulseT=Math.max(0,this._powerReadyPulseT-0.05);
      const pr=1-this._powerReadyPulseT;
      this.gfxMain.lineStyle(2,0x00ffaa,this._powerReadyPulseT*0.9);
      this.gfxMain.strokeCircle(px,py,20+pr*60);
    }

    // Shield — hex ring, thickness = hits remaining
    if(this.shieldActive){
      const sa=0.5+0.4*Math.sin(this.t*7);
      const sw=1+this.shieldHits*0.8; // thicker per hit
      const sc2=this.shieldHits>=4?0x00ffff:this.shieldHits>=3?0xffdd00:this.shieldHits>=2?0xff8800:0xff4400;
      this.gfxMain.lineStyle(sw,sc2,sa);
      this.gfxMain.beginPath();
      for(let s=0;s<6;s++){const a=this.t+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*32,py+Math.sin(a)*32);else this.gfxMain.lineTo(px+Math.cos(a)*32,py+Math.sin(a)*32);}
      this.gfxMain.closePath();this.gfxMain.strokePath();
      for(let d=0;d<6;d++){const a=this.t*2+(Math.PI/3)*d;this.gfxMain.fillStyle(sc2,0.6);this.gfxMain.fillCircle(px+Math.cos(a)*32,py+Math.sin(a)*32,1.5+this.shieldHits*0.4);}
    }

    // Surge aura
    if(this.surgeActive){
      const sr=0.4+0.4*Math.sin(this.t*10);
      this.gfxMain.lineStyle(3,0x00f5ff,sr);
      this.gfxMain.beginPath();
      for(let s=0;s<6;s++){const a=-rot+(Math.PI/3)*s;if(s===0)this.gfxMain.moveTo(px+Math.cos(a)*46,py+Math.sin(a)*46);else this.gfxMain.lineTo(px+Math.cos(a)*46,py+Math.sin(a)*46);}
      this.gfxMain.closePath();this.gfxMain.strokePath();
    }

    // I10 — hit-stop flash overlay (above gameplay, below HUD)
    if(this._hitStopT>0 && this.gfxFx2){
      const _hsCol=(this._hitStopColor!=null)?this._hitStopColor:0xffffff;
      const _hsA=0.3*Math.min(1,this._hitStopT/0.1);
      this.gfxFx2.fillStyle(_hsCol,_hsA);
      this.gfxFx2.fillRect(0,0,W,H);
    }
  }

  // I10 — hit-stop helper: freeze gameplay for `ms` milliseconds with a flash overlay
  _hitStop(ms,color){
    this._hitStopT=Math.max(this._hitStopT||0, ms/1000);
    this._hitStopColor=color;
  }

  // ─────────────────────────────────────────────────────
  // PILOT terminal widget — bottom-left HUD
  // Shows the equipped archetype's icon + name + passive + power
  // with a CRT-terminal aesthetic tinted by the archetype color.
  // ─────────────────────────────────────────────────────
  _buildPilotWidget(){
    const mono = "'Courier New',monospace";
    const orb  = "'Orbitron',sans-serif";

    // Resolve display fields (overlay forge config for signal_forge).
    // Read color from archetype data directly — `this.shipColor` is the legacy-skin color
    // at this point in create() (ArchetypeUnify rewrites it later in the patched-create chain).
    const archId = this._archetype || 'reflector';
    const arch = (typeof ARCHETYPES !== 'undefined')
      ? (ARCHETYPES.find(a => a.id === archId) || ARCHETYPES[0])
      : { name:'REFLECTOR', icon:'↩', passive:'Chain depth +2.', power:'chain_trigger', col:0x00ffcc };
    let dispIcon = arch.icon, dispName = arch.name,
        dispPassive = arch.passive, dispPower = arch.power;
    let col = arch.col || 0x00ffcc;
    if(archId === 'signal_forge' && typeof Save.forgeConfig === 'function'){
      const cfg = Save.forgeConfig();
      if(cfg){
        if(cfg.icon)         dispIcon = cfg.icon;
        if(cfg.power)        dispPower = cfg.power;
        if(cfg.passive)      dispPassive = cfg.passive.toUpperCase() + ' (forged)';
        if(cfg.color != null) col = cfg.color;
      }
    }

    const colStr = '#' + col.toString(16).padStart(6,'0');
    // 60% brightness desaturation for label rows
    const r=(col>>16)&0xff, g=(col>>8)&0xff, b=col&0xff;
    const muteCol = (Math.floor(r*0.6)<<16) | (Math.floor(g*0.6)<<8) | Math.floor(b*0.6);
    const muteStr = '#' + muteCol.toString(16).padStart(6,'0');

    // Frame
    const FX=5, FY=240, FW=120, FH=220;
    const innerFill = this.add.rectangle(FX, FY, FW, FH, 0x020a04, 0.9).setOrigin(0,0).setDepth(8);
    const outerFrame = this.add.rectangle(FX, FY, FW, FH).setOrigin(0,0).setDepth(9)
      .setStrokeStyle(1, col, 0.6);

    // Title bar
    this.add.text(FX+10, FY+5, '// PILOT', {
      fontFamily: mono, fontSize:'9px', color:colStr, letterSpacing:2
    }).setDepth(10);
    this.add.rectangle(FX, FY+18, FW, 1, col, 0.5).setOrigin(0,0).setDepth(9);

    // Icon hex (manual draw — depth above innerFill, below tweens layer)
    const ICX = FX + FW/2, ICY = FY + 62, IR = 24;
    const iconGfx = this.add.graphics().setDepth(9);
    iconGfx.fillStyle(col, 0.18);
    iconGfx.beginPath();
    for(let s=0;s<6;s++){
      const a=(Math.PI/3)*s + Math.PI/6;
      const x=ICX+Math.cos(a)*IR, y=ICY+Math.sin(a)*IR;
      if(s===0)iconGfx.moveTo(x,y); else iconGfx.lineTo(x,y);
    }
    iconGfx.closePath(); iconGfx.fillPath();
    iconGfx.lineStyle(2, col, 0.95);
    iconGfx.beginPath();
    for(let s=0;s<6;s++){
      const a=(Math.PI/3)*s + Math.PI/6;
      const x=ICX+Math.cos(a)*IR, y=ICY+Math.sin(a)*IR;
      if(s===0)iconGfx.moveTo(x,y); else iconGfx.lineTo(x,y);
    }
    iconGfx.closePath(); iconGfx.strokePath();

    // Icon glyph
    this.add.text(ICX, ICY, dispIcon, {
      fontFamily: mono, fontSize:'22px', fontStyle:'bold', color:colStr,
      stroke:'#000', strokeThickness:2
    }).setOrigin(0.5).setDepth(10);

    // Glow ring (animated)
    const glowRing = this.add.graphics().setDepth(9);
    glowRing.lineStyle(2, col, 1);
    glowRing.strokeCircle(ICX, ICY, 32);
    glowRing.setAlpha(0.25);

    // Name
    this.add.text(ICX, FY+105, dispName, {
      fontFamily: orb, fontSize:'12px', fontStyle:'900', color:colStr, letterSpacing:2
    }).setOrigin(0.5, 0).setDepth(10);

    // Passive section
    this.add.text(FX+12, FY+130, '// PASSIVE', {
      fontFamily: mono, fontSize:'8px', color:muteStr, letterSpacing:1
    }).setDepth(10);
    this.add.text(FX+12, FY+144, dispPassive, {
      fontFamily: mono, fontSize:'9px', color:colStr,
      wordWrap:{width: FW-22}
    }).setDepth(10);

    // Power section
    this.add.text(FX+12, FY+180, '// POWER', {
      fontFamily: mono, fontSize:'8px', color:muteStr, letterSpacing:1
    }).setDepth(10);
    this.add.text(FX+12, FY+194, dispPower.replace(/_/g,' ').toUpperCase(), {
      fontFamily: mono, fontSize:'10px', fontStyle:'bold', color:colStr, letterSpacing:1
    }).setDepth(10);

    // Bottom divider
    this.add.rectangle(FX, FY+FH-3, FW, 1, col, 0.3).setOrigin(0,0).setDepth(9);

    // Scanline (animated top→bottom)
    const scanline = this.add.rectangle(FX, FY+19, FW, 1, col, 0.45).setOrigin(0,0).setDepth(11);
    this._pilotScanTween = this.tweens.add({
      targets: scanline, y: { from: FY+19, to: FY+FH-5 },
      duration: 3200, repeat: -1, ease: 'Linear'
    });

    // Border alpha breathing
    this._pilotBorderTween = this.tweens.add({
      targets: outerFrame, strokeAlpha: { from: 0.6, to: 0.85 },
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      onUpdate: (tw, tgt) => { try { tgt.setStrokeStyle(1, col, tw.getValue()); } catch {} }
    });

    // Icon glow pulse
    this._pilotGlowTween = this.tweens.add({
      targets: glowRing, alpha: { from: 0.25, to: 0.55 },
      duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });

    // Occasional CRT flicker on the inner fill
    this._pilotFlickerEvt = this.time.addEvent({
      delay: 5800, loop: true,
      callback: () => {
        try { this.tweens.add({ targets: innerFill, alpha: { from: 0.9, to: 0.3 }, duration: 60, yoyo: true }); } catch {}
      }
    });
  }

  // ─── Wave modifier color/label/desc maps — single source of truth ───
  _MOD_COLORS(){
    return {
      FAST:0xff8800, DENSE:0xff4400, ARMORED:0xff2244, VOLATILE:0xaa44ff,
      DARK:0x4488ff, OVERLOAD:0xffdd44, FRAGILE:0xff88aa, MINIBOSS:0xffaa00,
      ENCORE:0x00ffcc, SURGE:0xff44ff, BOUNTY:0x44ffaa, FRACTURED:0xffaa44,
    };
  }
  _MOD_LABELS(){
    return {
      FAST:'OVERCLOCK', DENSE:'FLOOD_PROTOCOL', ARMORED:'HARDENED_SHELL', VOLATILE:'UNSTABLE_DATA',
      DARK:'SIGNAL_BLACKOUT', OVERLOAD:'CORE_OVERLOAD', FRAGILE:'PACKET_FRAGMENTATION', MINIBOSS:'ELITE_PROCESS',
      ENCORE:'ENCORE_PROTOCOL', SURGE:'DATA_SURGE', BOUNTY:'BOUNTY_WAVE', FRACTURED:'PROCESS_FRACTURE',
    };
  }
  _MOD_DESCS(){
    return {
      FAST:'+40% enemy speed', DENSE:'+50% spawn rate', ARMORED:'+1 HP all enemies',
      VOLATILE:'enemies detonate on death', DARK:'HUD signal suppressed', OVERLOAD:'+30% speed · shards ×2',
      FRAGILE:'1 HP · +60% speed', MINIBOSS:'all units upgraded', ENCORE:'×2 kills · dual reward',
      SURGE:'+50% speed · frag per kill', BOUNTY:'shards ×2.5 · +30% quota', FRACTURED:'enemies split on death',
    };
  }

  // ─── Wave modifier widget — persistent pill under PILOT ───
  _buildWaveModWidget(){
    const mono = "'Courier New',monospace";
    const FX=5, FY=466, FW=120, FH=60;

    this._wmFrame = this.add.rectangle(FX, FY, FW, FH, 0x080404, 0.92).setOrigin(0,0).setDepth(9)
      .setStrokeStyle(1, 0x554433, 0.5);
    this._wmAccent = this.add.rectangle(FX, FY, 4, FH, 0x554433, 0.6).setOrigin(0,0).setDepth(10);
    this.add.text(FX+12, FY+5, '// MODIFIER', {
      fontFamily: mono, fontSize:'8px', color:'#665544', letterSpacing:1
    }).setDepth(10);
    this._wmLabel = this.add.text(FX+12, FY+20, '—', {
      fontFamily: mono, fontSize:'11px', fontStyle:'bold', color:'#554433', letterSpacing:1
    }).setDepth(10);
    this._wmDesc = this.add.text(FX+12, FY+38, '', {
      fontFamily: mono, fontSize:'8px', color:'#554433', wordWrap:{width: FW-22}
    }).setDepth(10);

    this._refreshWaveModWidget();
  }

  _refreshWaveModWidget(){
    if(!this._wmFrame) return;
    const mod = this.waveModifier;
    if(!mod || mod === 'NONE'){
      // Empty state — dimmed frame, "—" placeholder
      this._wmFrame.setStrokeStyle(1, 0x554433, 0.4);
      this._wmAccent.setFillStyle(0x554433, 0.4);
      this._wmLabel.setText('—').setColor('#554433');
      this._wmDesc.setText('no modifier active').setColor('#334433');
      return;
    }
    const cols = this._MOD_COLORS();
    const labels = this._MOD_LABELS();
    const descs = this._MOD_DESCS();
    const colNum = cols[mod] || 0xff4444;
    const colHex = '#' + colNum.toString(16).padStart(6,'0');
    const muteR = ((colNum>>16)&0xff)*0.6, muteG = ((colNum>>8)&0xff)*0.6, muteB = (colNum&0xff)*0.6;
    const muteCol = (Math.floor(muteR)<<16)|(Math.floor(muteG)<<8)|Math.floor(muteB);
    const muteHex = '#' + muteCol.toString(16).padStart(6,'0');
    this._wmFrame.setStrokeStyle(1, colNum, 0.85);
    this._wmAccent.setFillStyle(colNum, 1);
    this._wmLabel.setText(labels[mod] || mod).setColor(colHex);
    this._wmDesc.setText(descs[mod] || '').setColor(muteHex);
  }

  // ─── Shards flash: floats `+N ◈` above the SHARDS readout, fades and rises ───
  _flashShardGain(amount, immediate=false){
    if(!amount || amount <= 0) return;
    if(!immediate){
      // Batch tiny per-kill drops into a 0.5s accumulator (flushed by _updateHUD)
      this._shardFlashAccum = (this._shardFlashAccum || 0) + amount;
      return;
    }
    if(!this.txtShards) return;
    const x = (this._shardFlashX || (W-30));
    const y = (this._shardFlashY || 100);
    const t = this.add.text(x + 64, y, `+${amount} ◈`, {
      fontFamily: "'Courier New',monospace", fontSize:'11px', fontStyle:'bold', color:'#ffdd44'
    }).setOrigin(1, 0.5).setDepth(12);
    this.tweens.add({
      targets: t, y: y - 18, alpha: { from: 1, to: 0 }, duration: 800, ease: 'Power1',
      onComplete: () => { try { t.destroy(); } catch {} }
    });
  }

  // ─── Mini-banner — small alert zone under wave-mod widget ───
  _buildMiniBanner(){
    const mono = "'Courier New',monospace";
    const FX=5, FY=534, FW=120, FH=36;
    this._miniBannerFrame = this.add.rectangle(FX, FY, FW, FH, 0x000000, 0.85).setOrigin(0,0).setDepth(9)
      .setStrokeStyle(1, 0x224433, 0.4).setAlpha(0);
    this._miniBannerTxt = this.add.text(FX+8, FY+8, '', {
      fontFamily: mono, fontSize:'9px', color:'#ccffcc', wordWrap:{width: FW-16}
    }).setDepth(10).setAlpha(0);
    this._miniBannerTween = null;
    this._miniBannerHideEvt = null;

    // Expose wrapper API
    this.miniBanner = {
      show: (text, color = '#ccffcc', duration = 1500) => this._showMiniBanner(text, color, duration),
    };
  }

  _showMiniBanner(text, color, duration){
    if(!this._miniBannerFrame || !this._miniBannerTxt) return;
    // Kill any in-flight tween/event so back-to-back messages cross-fade cleanly
    try { if(this._miniBannerTween) this._miniBannerTween.stop(); } catch {}
    try { if(this._miniBannerHideEvt) this._miniBannerHideEvt.remove(false); } catch {}
    this._miniBannerTxt.setText(text).setColor(color);
    this._miniBannerFrame.setStrokeStyle(1, parseInt(color.replace('#',''),16) || 0x224433, 0.55);
    // Fade in
    this._miniBannerTween = this.tweens.add({
      targets: [this._miniBannerFrame, this._miniBannerTxt], alpha: 1, duration: 150,
    });
    // Schedule fade-out after duration
    this._miniBannerHideEvt = this.time.delayedCall(duration, () => {
      if(!this._miniBannerFrame || !this._miniBannerTxt) return;
      this._miniBannerTween = this.tweens.add({
        targets: [this._miniBannerFrame, this._miniBannerTxt], alpha: 0, duration: 400,
      });
    });
  }

  _updateHUD(){
    const LP=130, RP=130;
    const darkMode=this.waveModifier==='DARK';
    const da=darkMode?0.05:1;
    if(this.gfxHud)this.gfxHud.setAlpha(darkMode?0.08:1);
    [this.txtScore,this.txtKills,this.txtWave,this.txtCombo,this.txtShield].forEach(t=>t&&t.setAlpha(da));

    try{
      if(window.DEV&&window.DEV.showFPS){const fps=Math.round(1000/(this.game.loop.delta||16));this.devFpsTxt&&this.devFpsTxt.setText(`FPS:${fps} E:${this.enemies.length} B:${this.bullets.length} P:${this.particles.length}`).setVisible(true);}
      else{this.devFpsTxt&&this.devFpsTxt.setVisible(false);}
      if(window.DEV&&window.DEV.showLabels){this.enemies.forEach(e=>{if(!e._devTxt){e._devTxt=[];for(let i=0;i<3;i++)e._devTxt.push(this.add.text(0,0,'',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#00ff44'}).setDepth(30));}const lns=[`${e.type} HP:${Math.ceil(e.hp)}`,`crp:${e.corruptions||0}${e.defected?' DEF':''}`,`s:${Math.round(e.spd)}`];e._devTxt.forEach((t,i)=>{t.setText(lns[i]||'').setPosition(e.x-35,e.y-e.size-36+i*11);});});}
      else{this.enemies.forEach(e=>{if(e._devTxt){e._devTxt.forEach(t=>t.destroy());delete e._devTxt;}});}
    }catch(e){}

    this.txtScore.setText(`${Math.floor(this.scoreDisplay)}${this.stackOverflowT>0?' OVF':''}`);
    if(this._txtFrags)this._txtFrags.setText(`◆ ${Save.fragments()}`);
    if(this.txtShards)this.txtShards.setText(`${this.shards} ◈`);
    // Batch flush per-kill shard flashes (0.5s window — avoid +N spam)
    this._shardFlashT = (this._shardFlashT || 0) + (this.game && this.game.loop ? (this.game.loop.delta/1000) : 0.016);
    if(this._shardFlashT >= 0.5){
      if((this._shardFlashAccum || 0) > 0) this._flashShardGain(this._shardFlashAccum, true);
      this._shardFlashAccum = 0;
      this._shardFlashT = 0;
    }

    if(this.mode==='endless')this.txtWave.setText('∞');
    else this.txtWave.setText(String(this.wave).padStart(2,'0'));

    if(this.mode==='endless'){
      const ts=Math.floor(this.t);
      this.txtKills.setText(`${String(Math.floor(ts/60)).padStart(2,'0')}:${String(ts%60).padStart(2,'0')}`);
    } else {
      this.txtKills.setText(`${Math.min(this.kills,this.killsNeeded)}/${this.killsNeeded}`);
    }

    if(this.combo>1){
      // I6 — combo escalation: scale + colour tiers + pulse at high tiers
      let cc, _cscale=1.0;
      if(this.combo>=50){ cc='#ff00ff'; _cscale=1.6+0.12*Math.sin(this.t*10); }
      else if(this.combo>=20){ cc='#ffd700'; _cscale=1.4+0.08*Math.sin(this.t*8); }
      else if(this.combo>=10){ cc='#ff8800'; _cscale=1.2; }
      else if(this.combo>=5){ cc='#ffdd00'; }
      else { cc='#ffee88'; }
      this.txtCombo.setText(`×${this.combo}`).setColor(cc).setScale(_cscale);
    } else { this.txtCombo.setText('').setScale(1.0); }

    const shPips=(this.shieldHits>0)?('■ '.repeat(this.shieldHits)+(this.shieldMaxHits>this.shieldHits?'□ '.repeat(this.shieldMaxHits-this.shieldHits):'')).trim():(this.extraLife?'◈ EXTRA':'—');
    this.txtShield.setText(shPips).setColor(this.shieldHits>0?'#ff44cc':this.extraLife?'#ffaaee':'#444444');

    if(this.txtModTag){
      const hasMod=this.waveModifier&&this.waveModifier!=='NONE';
      const MC={FAST:'#ff9900',DENSE:'#ff4400',ARMORED:'#ff2244',VOLATILE:'#aa44ff',DARK:'#4488ff',OVERLOAD:'#ffdd44',FRAGILE:'#ff88aa',MINIBOSS:'#ffaa00',ENCORE:'#00ffcc',SURGE:'#ff44ff',BOUNTY:'#44ffaa',FRACTURED:'#ffaa44'};
      if(hasMod&&!darkMode){
        const mc=MC[this.waveModifier]||'#ff4444';
        const HUD_LMAP={FAST:'OVERCLOCK',DENSE:'FLOOD',ARMORED:'HARDENED',VOLATILE:'UNSTABLE',DARK:'BLACKOUT',OVERLOAD:'OVERLOAD',FRAGILE:'FRAGMENTED',MINIBOSS:'ELITE_PROC',ENCORE:'ENCORE',SURGE:'DATA_SURGE',BOUNTY:'BOUNTY_WAVE',FRACTURED:'PROCESS_FRACTURE'};
        this.txtModTag.setText(HUD_LMAP[this.waveModifier]||this.waveModifier).setColor(mc).setAlpha(1);
        if(this._modSubTxt)this._modSubTxt.setAlpha(0);
      } else {
        this.txtModTag.setAlpha(0);
        if(this._modSubTxt)this._modSubTxt.setAlpha(darkMode?0.1:0.7);
      }
    }

    if(this.ghostStepActive&&this.activePowerT>0){
      if(!this.txtGhostStep)this.txtGhostStep=this.add.text(W/2,H/2-70,'',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#00aaff'}).setOrigin(0.5).setDepth(12);
      this.txtGhostStep.setText(`[ GHOST_STEP ${this.activePowerT.toFixed(1)}s ]`).setVisible(true).setAlpha(0.6+0.4*Math.sin(this.t*4));
    } else if(this.txtGhostStep)this.txtGhostStep.setVisible(false);

    const showSurge=!this.activePower||this.activePower==='ping';
    if(this.surgeActive)this.txtSurge.setText(`⚡ SURGE ${this.surgeT.toFixed(1)}s`).setColor('#00ffff').setAlpha(1);
    else if(this.signal>=1&&showSurge)this.txtSurge.setText('[ R ] → SURGE READY').setColor('#00cccc').setAlpha(0.85);
    else this.txtSurge.setText('');

    this.gfxHud.clear();

    // ── VERTICAL BARS (right panel) — backgrounds + fills in one pass ──
    const BX1=this._vHeatX||W-112, BX2=this._vWarpX||W-86, BX3=this._vSurgeX||W-60;
    const BY=this._vBarY||18, BH=this._vBarH||120, BW2=this._vBarW||16;

    // Backgrounds
    this.gfxHud.fillStyle(0x2a0800,1);this.gfxHud.fillRoundedRect(BX1,BY,BW2,BH,3);
    this.gfxHud.fillStyle(0x001a30,1);this.gfxHud.fillRoundedRect(BX2,BY,BW2,BH,3);
    this.gfxHud.fillStyle(0x1a0030,1);this.gfxHud.fillRoundedRect(BX3,BY,BW2,BH,3);

    // HEAT fill from bottom
    const heat=this.bubbleHeat/100;
    let heatCol;
    if(heat<0.5)heatCol=Phaser.Display.Color.Interpolate.ColorWithColor({r:0,g:255,b:100},{r:255,g:200,b:0},100,heat*200);
    else heatCol=Phaser.Display.Color.Interpolate.ColorWithColor({r:255,g:200,b:0},{r:255,g:20,b:0},100,(heat-0.5)*200);
    const hHex=(heatCol.r<<16)|(heatCol.g<<8)|heatCol.b;
    if(this.bubbleOverheated){
      const f=0.5+0.5*Math.sin(this.t*14);
      this.gfxHud.fillStyle(0xff2200,1);this.gfxHud.fillRoundedRect(BX1,BY,BW2,BH,3);
      this.gfxHud.lineStyle(2,0xff6600,f);this.gfxHud.strokeRoundedRect(BX1,BY,BW2,BH,3);
      if(!this.txtOverheat)this.txtOverheat=this.add.text(BX1+BW2/2,BY-2,'OVH',{fontFamily:"'Courier New',monospace",fontSize:'8px',color:'#ff6600'}).setOrigin(0.5,1).setDepth(12);
      if(this.txtOverheat&&this.txtOverheat.active)this.txtOverheat.setVisible(true).setColor(f>0.75?'#ffff00':'#ff6600');
    } else {
      if(this.txtOverheat)this.txtOverheat.setVisible(false);
      if(heat>0){
        const fillH=Math.max(2,BH*heat);
        this.gfxHud.fillStyle(hHex,1);this.gfxHud.fillRoundedRect(BX1,BY+BH-fillH,BW2,fillH,3);
        if(heat>0.7){const f=0.5+0.5*Math.sin(this.t*10);this.gfxHud.lineStyle(2,hHex,f);this.gfxHud.strokeRoundedRect(BX1,BY,BW2,BH,3);}
      }
    }

    // WARP fill from bottom
    if(this.bubbleCharge>0){
      const warpCol=this.bubbleOverheated?0xff3300:this.pressing?0x44bbff:0x0088ee;
      const wH=Math.max(2,BH*this.bubbleCharge);
      this.gfxHud.fillStyle(warpCol,1);this.gfxHud.fillRoundedRect(BX2,BY+BH-wH,BW2,wH,3);
      if(this.pressing&&!this.bubbleOverheated){const wp=0.5+0.5*Math.sin(this.t*8);this.gfxHud.lineStyle(2,0x44ccff,wp);this.gfxHud.strokeRoundedRect(BX2,BY,BW2,BH,3);}
    }

    // SURGE fill from bottom
    if(this.signal>0){
      const sH=Math.max(2,BH*Math.min(this.signal,1));
      const surgeCol=this.signal>=1?0xdd44ff:0x8800cc;
      this.gfxHud.fillStyle(surgeCol,1);this.gfxHud.fillRoundedRect(BX3,BY+BH-sH,BW2,sH,3);
      if(this.signal>=1){const sp=0.5+0.5*Math.sin(this.t*8);this.gfxHud.lineStyle(2,0xff44ff,sp);this.gfxHud.strokeRoundedRect(BX3,BY,BW2,BH,3);}
    }
    // I8 — SURGE EQ pips: 5 phase-staggered bouncing dots inside the bar
    {
      const _pipCol=this.signal>=1?0xff44ff:0xaa66ff;
      const _spdMul=this.signal>=1?2.5:1.0;
      const _segH=BH/5;
      const _cx=BX3+BW2/2;
      for(let _pi=0;_pi<5;_pi++){
        const _ph=Math.sin(this.t*4*_spdMul + _pi*0.7);
        const _segBottom=BY+BH-(_pi*_segH);
        const _amp=2+(this.signal>=1?2:1);
        const _py2=_segBottom-3 - _amp*(0.5+0.5*_ph);
        this.gfxHud.fillStyle(_pipCol,0.85);
        this.gfxHud.fillCircle(_cx,_py2,2.2);
      }
    }

    // INFERNO rage bar — own column to the RIGHT of SURGE (inside the right HUD panel).
    // (Was BX1-26 which placed it OUTSIDE the panel on the left.)
    // Gate on activeSkin so signal_forge with inferno-passive also gets the bar.
    if(this.activeSkin==='inferno'){
      const RAGE_X = BX3 + 22; // own column right of SURGE — stays inside the panel
      const rageFrac=Math.min((this.rageMeter||0)/100,1);
      const rageCol=this.rageActive?0xff6600:rageFrac>0.7?0xff4400:0xcc3300;
      this.gfxHud.fillStyle(0x2a0000,1);this.gfxHud.fillRoundedRect(RAGE_X,BY,BW2,BH,3);
      if(rageFrac>0){const rH=Math.max(2,BH*rageFrac);this.gfxHud.fillStyle(rageCol,1);this.gfxHud.fillRoundedRect(RAGE_X,BY+BH-rH,BW2,rH,3);}
      if(!this.txtRage)this.txtRage=this.add.text(RAGE_X+BW2/2,BY-13,'RAGE',{fontFamily:"'Courier New',monospace",fontSize:'8px',color:'#ff4400'}).setOrigin(0.5,0).setDepth(12);
      else this.txtRage.setPosition(RAGE_X+BW2/2,BY-13); // reposition if scene re-entered
      this.txtRage.setVisible(true);
    } else if(this.txtRage)this.txtRage.setVisible(false);

    // PING indicator
    const pBarX=W-RP+10, pBarW=RP-20;
    const pReady=this.pingCooldownT<=0, pFrac=pReady?1:1-(this.pingCooldownT/this.pingBaseCD);
    const pBarY=BY+BH+this._vBarH*0+174; // shifted +32 to match PING label move (was +142)
    this.gfxHud.fillStyle(0x001a14,1);this.gfxHud.fillRect(pBarX,pBarY,pBarW,6);
    this.gfxHud.fillStyle(pReady?0x00ffaa:0x005533,1);this.gfxHud.fillRect(pBarX,pBarY,pBarW*pFrac,6);
    if(pReady){const fp=0.5+0.5*Math.sin(this.t*4);this.gfxHud.lineStyle(1,0x00ffaa,fp*0.5);this.gfxHud.strokeRect(pBarX,pBarY,pBarW,6);}

    // DASH indicator
    const dBarY=pBarY+18;
    const _dashBaseCD = (this._dashCooldownOverride || 1.2) * (this._evoDashReduce || 1);
    const dReady = this._dashCdT <= 0;
    const dFrac = dReady ? 1 : 1 - (this._dashCdT / _dashBaseCD);
    this.gfxHud.fillStyle(0x1a0008,1);this.gfxHud.fillRect(pBarX,dBarY,pBarW,6);
    this.gfxHud.fillStyle(dReady?0xff2244:0x550011,1);this.gfxHud.fillRect(pBarX,dBarY,pBarW*dFrac,6);
    if(dReady){const fp=0.5+0.5*Math.sin(this.t*6);this.gfxHud.lineStyle(1,0xff2244,fp*0.5);this.gfxHud.strokeRect(pBarX,dBarY,pBarW,6);}

    // Active power bar — bottom-center play area
    if(this.activePower&&this.activePower!=='ping'){
      const apW=220,apH=5,apx=W/2-110,apy=H-62;
      const apReady=this.activePowerCD<=0;
      const CDS={emp_burst:22,null_zone:28,overclock_surge:35,chain_trigger:18,ghost_step:26,corrupt_wave:38,decoy_packet:32};
      const apFrac=apReady?1:1-(this.activePowerCD/(CDS[this.activePower]||1));
      if(this.txtActivePower)this.txtActivePower.setY(apy-12).setText(this.activePower.replace(/_/g,' ').toUpperCase()).setColor(apReady?'#ffdd00':'#555500').setVisible(true);
      this.gfxHud.fillStyle(0x000000,0.7);this.gfxHud.fillRect(apx-2,apy-1,apW+4,apH+2);
      this.gfxHud.fillStyle(0x111100,1);this.gfxHud.fillRect(apx,apy,apW,apH);
      this.gfxHud.fillStyle(apReady?0xffdd00:0x665500,1);this.gfxHud.fillRect(apx,apy,apW*apFrac,apH);
    } else if(this.txtActivePower)this.txtActivePower.setVisible(false);

    // System log
    if(this._logTxtObjs&&this.sysLogLines)
      this._logTxtObjs.forEach((lt,i)=>lt.setText(this.sysLogLines[i]||'').setAlpha(Math.max(0,0.38-i*0.06)));

    // Kill feed
    if(this._killFeedLines&&this._killFeedObjs){
      this._killFeedLines.forEach(l=>{l.a=Math.max(0,l.a-0.004);});
      this._killFeedLines=this._killFeedLines.filter(l=>l.a>0);
      this._killFeedObjs.forEach((obj,i)=>{const line=this._killFeedLines[i];if(line)obj.setText(line.msg).setColor(line.col||'#00ff88').setAlpha(line.a);else obj.setAlpha(0);});
      while(this._killFeedObjs.length>5){const ex=this._killFeedObjs.pop();if(ex&&ex.destroy)ex.destroy();}
    }

    // Wave dots — bottom center
    if(!this.bossWave){
      const total=Math.min(this.killsNeeded,24),filled=Math.min(this.kills,total);
      const dotSpan=500,sx=W/2-dotSpan/2,ns=dotSpan/Math.max(total,1);
      const accent=this.STAGES[this.stage].accent;
      this.gfxHud.lineStyle(1,0x001133,1);this.gfxHud.moveTo(sx,H-10);this.gfxHud.lineTo(sx+dotSpan,H-10);this.gfxHud.strokePath();
      for(let n=0;n<total;n++){
        const nx=sx+n*ns+(ns/2),f=n<filled;
        this.gfxHud.fillStyle(f?accent:0x001133,1);this.gfxHud.fillCircle(nx,H-10,f?3.5:2);
      }
    }

    // Boss HP bar
    if(this.bossWave&&this.boss&&this.boss.hp!=null){
      const bpw=W-LP-RP-40,bpy=H-26,bFrac=Math.max(0,this.boss.hp/this.boss.maxHp);
      const bCol=bFrac<0.3?0xff0000:bFrac<0.6?0xff6600:0xff2244;
      this.gfxHud.fillStyle(0x1a0000,1);this.gfxHud.fillRect(LP+20,bpy,bpw,14);
      this.gfxHud.fillStyle(bCol,1);this.gfxHud.fillRect(LP+20,bpy,bpw*bFrac,14);
      this.gfxHud.lineStyle(1,0xff2244,0.5);this.gfxHud.strokeRect(LP+20,bpy,bpw,14);
      if(this.bannerBoss)this.bannerBoss.setVisible(true).setPosition(W/2,bpy-14);
      if(this.txtBossName)this.txtBossName.setVisible(true).setPosition(W/2,bpy-14);
    } else {
      if(this.bannerBoss)this.bannerBoss.setVisible(false);
      if(this.txtBossName)this.txtBossName.setVisible(false);
    }

    // Threat indicators clamped to play area
    const PAD=16,TRI=8,ZONE=120;
    this.enemies.filter(e=>e.x<ZONE||e.x>W-ZONE||e.y<ZONE||e.y>H-ZONE).forEach(e=>{
      if(e.x>LP+60&&e.x<W-RP-60&&e.y>60&&e.y<H-60)return;
      const dL=e.x-LP,dR=(W-RP)-e.x,dT=e.y,dB=H-e.y,md=Math.min(dL,dR,dT,dB);
      let ax,ay,ang;
      if(md===dL){ax=LP+PAD+TRI;ay=Phaser.Math.Clamp(e.y,PAD,H-PAD-TRI);ang=0;}
      else if(md===dR){ax=W-RP-PAD-TRI;ay=Phaser.Math.Clamp(e.y,PAD,H-PAD-TRI);ang=Math.PI;}
      else if(md===dT){ax=Phaser.Math.Clamp(e.x,LP+PAD+TRI,W-RP-PAD-TRI);ay=PAD+TRI;ang=Math.PI/2;}
      else{ax=Phaser.Math.Clamp(e.x,LP+PAD+TRI,W-RP-PAD-TRI);ay=H-PAD-TRI;ang=-Math.PI/2;}
      const col=e.isBoss?0xff2244:e.elite?0xffdd00:e.type==='rootkit'?0x00ff88:0xff4444;
      this.gfxHud.fillStyle(col,0.5+0.4*Math.sin(this.t*6+e.x*0.01));
      this.gfxHud.beginPath();
      this.gfxHud.moveTo(ax+Math.cos(ang)*TRI,ay+Math.sin(ang)*TRI);
      this.gfxHud.lineTo(ax+Math.cos(ang+2.5)*(TRI*0.5),ay+Math.sin(ang+2.5)*(TRI*0.5));
      this.gfxHud.lineTo(ax+Math.cos(ang-2.5)*(TRI*0.5),ay+Math.sin(ang-2.5)*(TRI*0.5));
      this.gfxHud.closePath();this.gfxHud.fillPath();
    });
  }






} // GameScene

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
function _applyRenderScale(){
  try{
    const scale=Settings.get('render_scale')||1;
    document.querySelectorAll('canvas').forEach(cv=>{
      cv.style.imageRendering=scale<=0.5?'pixelated':'auto';
    });
  }catch(e){}
}
