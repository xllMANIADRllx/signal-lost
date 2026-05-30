// ═══════════════════════════════════════════════════════════
// DEV OVERLAY — Shift+Tab from any screen
// Pauses GameScene if active. Replaced old backtick + DevScene.
// ═══════════════════════════════════════════════════════════

class DevOverlay extends Phaser.Scene {
  constructor(){ super('DevOverlay'); }

  init(data){
    this._pausedGame = data && data.pausedGame ? true : false;
  }

  create(){
    try{
      const mono = "'Courier New',monospace", orb = "'Orbitron',sans-serif";
      const D = 95;

      if(!window.DEV) window.DEV = {
        invincible:false, oneHit:false, showHitboxes:false,
        showLabels:false, showFPS:false, noParticles:false,
        enemySpeedCap: 200,
      };
      if(typeof window.DEV.enemySpeedCap !== 'number') window.DEV.enemySpeedCap = 200;

      // ── Overlay bg ──
      this.add.rectangle(W/2,H/2,W,H,0x000000,0.96).setDepth(D);

      // ── Header ──
      this.add.rectangle(W/2,0,W,36,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1);
      this.add.rectangle(W/2,36,W,1.5,0x00ff44,0.5).setOrigin(0.5,0).setDepth(D+1);
      this.add.text(W/2,12,'DEV_OVERLAY.SH',{fontFamily:orb,fontSize:'14px',fontStyle:'900',color:'#00ff44',letterSpacing:4}).setOrigin(0.5,0).setDepth(D+2);
      const subHdr = this.add.text(W/2,25,`SHIFT+TAB TO CLOSE${this._pausedGame?' — GAME PAUSED':''}`,{fontFamily:mono,fontSize:'8px',color:'#224433'}).setOrigin(0.5,0).setDepth(D+2);

      // ── Sandbox button ──
      const SBY = 42;
      const sbBg = this.add.rectangle(W/2,SBY,360,28,0x00ff88,0.1).setOrigin(0.5,0).setDepth(D+1).setInteractive({useHandCursor:true});
      this.add.rectangle(W/2,SBY,360,28).setStrokeStyle(1,0x00ff88,0.5).setOrigin(0.5,0).setDepth(D+1);
      this.add.text(W/2,SBY+14,'⬡  LAUNCH SANDBOX MODE',{fontFamily:orb,fontSize:'11px',fontStyle:'900',color:'#00ff88',letterSpacing:3}).setOrigin(0.5).setDepth(D+2);
      sbBg.on('pointerover',()=>sbBg.setFillStyle(0x00ff88,0.2));
      sbBg.on('pointerout', ()=>sbBg.setFillStyle(0x00ff88,0.1));
      sbBg.on('pointerdown',()=>{
        if(this._pausedGame){
          // Active run — cannot launch sandbox
          const gs = this.scene.get('GameScene');
          if(gs && gs.banner) gs.banner.show('SANDBOX: Unavailable during an active run','#ff4444',2000);
          // Flash the button red briefly
          sbBg.setFillStyle(0xff4444,0.25);
          this.time.delayedCall(400,()=>sbBg.setFillStyle(0x00ff88,0.1));
          return;
        }
        this.cameras.main.fadeOut(200,0,0,0);
        this.time.delayedCall(200,()=>{
          this.game.scene.getScenes(true).forEach(s=>this.game.scene.stop(s.sys.settings.key));
          this.game.scene.run('GameScene',{mode:'dev',debugWave:1,debugScore:0,sandbox:true});
        });
      });

      // ── Tab system ──
      const TABS=['LAUNCH','STATE','UPGRADES','SAVE','AUDIO','TOGGLES'];
      const TAB_Y = 76, TAB_H = 26, CONTENT_Y = TAB_Y + TAB_H + 2;
      const LOG_H = 52, CONTENT_H = H - CONTENT_Y - LOG_H;

      this.add.rectangle(W/2,TAB_Y,W,TAB_H,0x001100,0.97).setOrigin(0.5,0).setDepth(D+1);
      this.add.rectangle(W/2,TAB_Y+TAB_H,W,1,0x1a3322,1).setOrigin(0.5,0).setDepth(D+1);

      let activeTab = 0;
      const TW = Math.floor(W/TABS.length);
      const tabObjs = [];
      const contentObjs = [];
      const cadd = o => { contentObjs.push(o); return o; };
      const clearContent = () => { contentObjs.forEach(o=>{try{o.destroy();}catch{}}); contentObjs.length=0; };

      // Helpers
      const btn=(x,y,w,label,col,cb)=>{
        col=col||'#00cc44';
        const n=parseInt(col.replace('#',''),16);
        const bg=cadd(this.add.rectangle(x,y,w,20,n,0.08).setOrigin(0,0).setDepth(D+2).setInteractive({useHandCursor:true}));
        cadd(this.add.rectangle(x,y,2,20,n,0.7).setOrigin(0,0).setDepth(D+2));
        const t=cadd(this.add.text(x+8,y+10,`> ${label}`,{fontFamily:mono,fontSize:'10px',color:col}).setOrigin(0,0.5).setDepth(D+3));
        bg.on('pointerover',()=>{bg.setFillStyle(n,0.18);t.setColor('#ffffff');});
        bg.on('pointerout', ()=>{bg.setFillStyle(n,0.08);t.setColor(col);});
        bg.on('pointerdown',()=>{try{cb();}catch(e){this._log('[ERR] '+e.message,'#ff4444');}});
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
        bg.on('pointerdown',()=>{setCb(!getCb());upd();this._log(`${label}: ${getCb()?'ON':'OFF'}`,getCb()?col:'#336644');});
        bg.on('pointerover',()=>bg.setFillStyle(n,0.14));
        bg.on('pointerout', ()=>bg.setFillStyle(n,0.06));
        return upd;
      };
      const numRow=(x,y,label,col,getCb,setCb)=>{
        cadd(this.add.text(x,y+12,label,{fontFamily:mono,fontSize:'9px',color:'#445544'}).setOrigin(0,0.5).setDepth(D+2));
        const n=parseInt((col||'#00cc44').replace('#',''),16);
        const valT=cadd(this.add.text(x+130,y+12,'',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:col||'#00cc44'}).setOrigin(0,0.5).setDepth(D+3));
        const upd=()=>valT.setText(String(getCb())); upd();
        const mkB=(bx,dir)=>{
          const b=cadd(this.add.rectangle(bx,y+10,22,16,0x001a00,1).setOrigin(0.5).setDepth(D+2).setInteractive({useHandCursor:true}));
          cadd(this.add.text(bx,y+10,dir>0?'+':'-',{fontFamily:mono,fontSize:'9px',color:col||'#00cc44'}).setOrigin(0.5).setDepth(D+3));
          b.on('pointerdown',()=>{setCb(getCb()+dir);upd();});
          b.on('pointerover',()=>b.setFillStyle(n,0.3));
          b.on('pointerout',()=>b.setFillStyle(0x001a00,1));
        };
        mkB(x+160,-1); mkB(x+184,1);
      };
      const secHdr=(x,y,w,label)=>{
        cadd(this.add.rectangle(x,y,w,20,0x001a00,1).setOrigin(0,0).setDepth(D+1));
        cadd(this.add.rectangle(x,y,2,20,0x00ff44,0.7).setOrigin(0,0).setDepth(D+1));
        cadd(this.add.text(x+8,y+10,label,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:'#00ff44'}).setOrigin(0,0.5).setDepth(D+2));
      };

      const CX=[10,455], CW=435, GAP=4;

      const buildContent=()=>{
        clearContent();
        const gs = this.scene.get('GameScene');
        const CY = CONTENT_Y + 6;
        const bossWaves={FIREWALL:5,'VOID.NODE':10,'GHOST.EXE':15,'CORE.BREACH':20};
        const doLaunch=(data)=>{
          if(this._pausedGame){const gs2=this.scene.get('GameScene');if(gs2&&gs2.sys.isPaused())this.scene.resume('GameScene');}
          this.cameras.main.fadeOut(250,0,0,0);
          this.time.delayedCall(250,()=>{
            this.game.scene.getScenes(true).forEach(s=>this.game.scene.stop(s.sys.settings.key));
            this.game.scene.run('GameScene',data);
          });
        };

        if(activeTab===0){ // LAUNCH
          let y=CY;
          secHdr(CX[0],y,CW,'// QUICK LAUNCH'); y+=24;
          btn(CX[0],y,CW,'LAUNCH NEW RUN (WAVE 1)','#00ff44',()=>doLaunch({mode:'dev',debugWave:1,debugScore:0})); y+=24+GAP;
          y+=4;
          secHdr(CX[0],y,CW,'// LAUNCH AT BOSS WAVE'); y+=24;
          Object.entries(bossWaves).forEach(([name,wave])=>{
            btn(CX[0],y,CW,`FIGHT ${name} (wave ${wave})`,'#ff2244',()=>doLaunch({mode:'dev',debugWave:wave,debugScore:0})); y+=24+GAP;
          });
          if(gs && gs.sys.isPaused()){
            let y2=CY;
            secHdr(CX[1],y2,CW,'// BOSS PHASE (active boss only)'); y2+=24;
            [1,2,3].forEach(ph=>{
              btn(CX[1],y2,CW,`FORCE BOSS PHASE ${ph}`,'#ff4444',()=>{window.DEV.bossPhase=ph;this._log(`Boss phase ${ph} queued`);}); y2+=24+GAP;
            });
          }

        } else if(activeTab===1){ // STATE
          if(gs && gs.sys.isPaused()){
            let y=CY;
            secHdr(CX[0],y,CW,'// GAME STATE'); y+=24;
            numRow(CX[0],y,'WAVE',  '#00cc44',()=>gs.wave,             v=>{gs.wave=Math.max(1,v);}); y+=24;
            numRow(CX[0],y,'SCORE', '#ffdd00',()=>Math.floor(gs.score),v=>{gs.score=Math.max(0,v);}); y+=24;
            numRow(CX[0],y,'SHARDS','#ccaa00',()=>gs.shards,           v=>{gs.shards=Math.max(0,v);}); y+=24;
            y+=4;
            btn(CX[0],y,CW,'FORCE WAVE CLEAR',     '#00ffcc',()=>{window.DEV.forceWaveClear=true; this._log('Wave clear queued');}); y+=24+GAP;
            btn(CX[0],y,CW,'CLEAR ALL ENEMIES',    '#ff4444',()=>{window.DEV.clearEnemies=true;   this._log('Enemies cleared');}); y+=24+GAP;
            btn(CX[0],y,CW,'TRIGGER MEMORY DUMP',  '#aaffdd',()=>{window.DEV.triggerMemDump=true; this._log('Mem dump queued');}); y+=24+GAP;
            btn(CX[0],y,CW,'TRIGGER STACK OVERFLOW','#ffdd00',()=>{window.DEV.triggerOverflow=true;this._log('Overflow queued');}); y+=24+GAP;
            btn(CX[0],y,CW,'TRIGGER PING (bypass CD)','#00ffcc',()=>{window.DEV.forcePing=true;   this._log('Ping queued');}); y+=24+GAP;
            let y2=CY;
            secHdr(CX[1],y2,CW,'// EVENTS'); y2+=24;
            btn(CX[1],y2,CW,'TRIGGER INFERNO RAGE','#ff6600',()=>{window.DEV.forceRage=true;    this._log('Rage queued');}); y2+=24+GAP;
            btn(CX[1],y2,CW,'TEST ALL BANNERS',    '#ffdd00',()=>{window.DEV.testBanners=true;  this._log('Banners queued');}); y2+=24+GAP;
            btn(CX[1],y2,CW,'GIVE ALL RELICS',     '#aa44ff',()=>{window.DEV.giveAllRelics=true;this._log('Relics queued');}); y2+=24+GAP;
          } else {
            cadd(this.add.text(W/2,CY+40,'// No active game running',{fontFamily:mono,fontSize:'11px',color:'#224433'}).setOrigin(0.5,0).setDepth(D+2));
            cadd(this.add.text(W/2,CY+58,'Use LAUNCH tab to start a run, then re-open this overlay',{fontFamily:mono,fontSize:'9px',color:'#1a3322'}).setOrigin(0.5,0).setDepth(D+2));
          }

        } else if(activeTab===2){ // UPGRADES
          const gs2 = this.scene.get('GameScene');
          let y=CY;
          secHdr(CX[0],y,CW,'// UPGRADE TOOLS'); y+=24;
          btn(CX[0],y,CW,'GIVE ALL WAVE UPGRADES (MAX)','#00ffcc',()=>{window.DEV.allUpgrades=true;this._log('All upgrades max');}); y+=24+GAP;
          btn(CX[0],y,CW,'GIVE ALL SHOP PATCHES','#00aaff',()=>{
            ['firewall_seed','redundant_path','data_cache','primed_signal','redundant_buf','overclock_chip',
             'signal_amp','packet_router','heat_sink','ghost_protocol','data_compress','kernel_access'].forEach(id=>Save.setMeta(id,true));
            this._log('All shop patches installed');
          }); y+=24+GAP;
          btn(CX[0],y,CW,'UNLOCK ALL SKINS','#aa88ff',()=>{Object.keys(SHIPS).forEach(id=>{if(!Save.isOwned(id))Save.own(id);});this._log('All skins unlocked');}); y+=24+GAP;
          btn(CX[0],y,CW,'RESET RUN UPGRADES','#ff4444',()=>{window.DEV.resetUpgrades=true;this._log('Upgrades reset');}); y+=24+GAP;
          y+=6;
          secHdr(CX[0],y,CW,'// CURRENT BUILD'); y+=24;
          const activeUpgs=Object.entries(gs2&&gs2.upg?gs2.upg:{}).filter(([k,v])=>v>0);
          if(activeUpgs.length===0){
            cadd(this.add.text(CX[0]+8,y+10,'NO MODULES INSTALLED',{fontFamily:mono,fontSize:'10px',color:'#224433'}).setDepth(D+2));
          } else {
            activeUpgs.slice(0,12).forEach(([id,tier])=>{
              cadd(this.add.rectangle(CX[0],y,CW,20,0x001a00,0.5).setOrigin(0,0).setDepth(D+1));
              cadd(this.add.text(CX[0]+8,y+10,id.toUpperCase().replace(/_/g,' '),{fontFamily:mono,fontSize:'9px',color:'#00cc66'}).setDepth(D+2));
              cadd(this.add.text(CX[0]+CW-30,y+10,`T${tier}`,{fontFamily:mono,fontSize:'9px',fontStyle:'bold',color:'#00ffcc'}).setOrigin(1,0.5).setDepth(D+2));
              y+=22;
            });
          }

          let y2=CY;
          secHdr(CX[1],y2,CW,'// SKIN SELECT'); y2+=24;
          if(typeof SHIPS!=='undefined') Object.values(SHIPS).forEach(s=>{
            const active=gs2&&gs2.activeSkin===s.id;
            btn(CX[1],y2,CW,`${s.name}${active?' (ACTIVE)':''}`,active?'#00ff44':'#224433',()=>{
              Save.setSkin(s.id); if(!Save.isOwned(s.id))Save.own(s.id);
              this._log(`Skin: ${s.id}`); buildContent();
            }); y2+=24+GAP;
          });

        } else if(activeTab===3){ // SAVE
          let y=CY;
          secHdr(CX[0],y,CW,'// SAVE DATA'); y+=24;
          btn(CX[0],y,CW,'ADD 9999 SHARDS','#ccaa00',()=>{Shards.add(9999,'dev');this._log(`Shards: ${Shards.get()}`);buildContent();}); y+=24+GAP;
          btn(CX[0],y,CW,'ADD 100 SHARDS','#aacc66',()=>{Shards.add(100,'dev');this._log(`Shards: ${Shards.get()}`);buildContent();}); y+=24+GAP;
          btn(CX[0],y,CW,'RESET SHARDS TO 0','#ff4444',()=>{Shards.reset();this._log('Shards reset');buildContent();}); y+=24+GAP;
          btn(CX[0],y,CW,'ADD 9999 FRAGMENTS','#44ffcc',()=>{Save.addFragments(9999);this._log(`Fragments: ${Save.fragments()}`);buildContent();}); y+=24+GAP;
          btn(CX[0],y,CW,'TOGGLE SHARDS DEBUG_LOG','#88ccff',()=>{Shards.DEBUG_LOG=!Shards.DEBUG_LOG;this._log(`Shards.DEBUG_LOG = ${Shards.DEBUG_LOG} — see console`);}); y+=24+GAP;
          btn(CX[0],y,CW,'UNLOCK ALL ARCHETYPES','#cc44ff',()=>{const ids=(typeof ARCHETYPES!=='undefined')?ARCHETYPES.map(a=>a.id):[];ids.forEach(id=>{if(id!=='signal_forge')Save.set('arch_owned_'+id,true);});Save.set('forge_unlocked',true);this._log('All archetypes + SIGNAL_FORGE unlocked');}); y+=24+GAP;
          btn(CX[0],y,CW,'SET ASCENSION_MAX = 25','#ffd700',()=>{Save.set('ascension_max',25);this._log('ascension_max = 25');}); y+=24+GAP;
          btn(CX[0],y,CW,'RESET LEADERBOARD','#ff4444',()=>{Save.set('lb','[]');this._log('Leaderboard wiped');}); y+=24+GAP;
          btn(CX[0],y,CW,'COMPLETE DAILY CHALLENGES','#ffdd00',()=>{
            const today=new Date().toDateString();
            if(typeof DAILY_POOL!=='undefined') Save.set('daily_done_'+today,JSON.stringify(DAILY_POOL.map(c=>c.id)));
            this._log('All daily challenges done');
          }); y+=24+GAP;
          btn(CX[0],y,CW,'EXPORT SAVE (F12 console)','#00aaff',()=>{
            const data={};
            for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))data[k]=localStorage.getItem(k);}
            console.log('[DEV] SAVE EXPORT:',JSON.stringify(data,null,2));
            this._log('Exported to F12 console');
          }); y+=24+GAP;
          btn(CX[0],y,CW,'WIPE ALL SAVE DATA','#ff0000',()=>{
            if(!this._wipeConfirm){this._wipeConfirm=true;this._log('Click again to confirm!','#ff4444');this.time.delayedCall(3000,()=>{this._wipeConfirm=false;});}
            else{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));this._log('ALL DATA WIPED','#ff0000');}
          }); y+=24+GAP;
          y+=8;
          cadd(this.add.text(CX[0]+8,y+10,`CURRENT SHARDS: ${Shards.get()} ◈  ·  FRAGMENTS: ${Save.fragments()||0} ✦`,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ffaa00'}).setDepth(D+2));

        } else if(activeTab===4){ // AUDIO
          let y=CY;
          secHdr(CX[0],y,CW,'// AUDIO / VISUAL'); y+=24;
          btn(CX[0],y,CW,'FORCE CRT GLITCH MAX','#aaaaff',()=>{CRT.glitch(2.0);this._log('Glitch triggered');}); y+=24+GAP;
          btn(CX[0],y,CW,'TEST ALL SOUNDS','#00aaff',()=>{['reflect','shield','surge','powerup','hit','laser','click','emp','void','corrupt','decoy','chain','phase','install','archetype','rage','volatile','boss','kill','death','fragment','modifier','echo_hit','shoot','node'].forEach((s,i)=>this.time.delayedCall(i*350,()=>{try{Snd.play(s);}catch{}}));this._log('Playing all 25 sounds...');}); y+=24+GAP;
          btn(CX[0],y,CW,'RESET DEBUG USES','#ff8800',()=>{Save.set('debug_uses',0);this._log('Debug uses reset');}); y+=24+GAP;
          y+=8;
          secHdr(CX[0],y,CW,'// SETTINGS'); y+=24;
          tog(CX[0],y,CW,'CRT OVERLAY','#aaaaff',()=>Settings.get('crt'),v=>Settings.set('crt',v)); y+=24+GAP;
          tog(CX[0],y,CW,'SCREEN SHAKE','#aaaaff',()=>Settings.get('shake'),v=>Settings.set('shake',v)); y+=24+GAP;
          tog(CX[0],y,CW,'VIGNETTE','#aaaaff',()=>Settings.get('vignette'),v=>Settings.set('vignette',v)); y+=24+GAP;
          tog(CX[0],y,CW,'VOICE','#aaaaff',()=>Settings.get('voice'),v=>Settings.set('voice',v)); y+=24+GAP;

        } else if(activeTab===5){ // TOGGLES
          let y=CY;
          secHdr(CX[0],y,CW,'// DEBUG FLAGS'); y+=24;
          tog(CX[0],y,CW,'INVINCIBLE',  '#00ffcc',()=>window.DEV.invincible, v=>{window.DEV.invincible=v;}); y+=24+GAP;
          tog(CX[0],y,CW,'ONE HIT KILL','#ff4444', ()=>window.DEV.oneHit,    v=>{window.DEV.oneHit=v;}); y+=24+GAP;
          tog(CX[0],y,CW,'SHOW HITBOXES','#ff8800',()=>window.DEV.showHitboxes,v=>{window.DEV.showHitboxes=v;}); y+=24+GAP;
          tog(CX[0],y,CW,'SHOW LABELS', '#ffdd00', ()=>window.DEV.showLabels,v=>{window.DEV.showLabels=v;}); y+=24+GAP;
          tog(CX[0],y,CW,'SHOW FPS',    '#00aaff', ()=>window.DEV.showFPS,  v=>{window.DEV.showFPS=v;}); y+=24+GAP;
          tog(CX[0],y,CW,'NO PARTICLES','#aa00ff', ()=>window.DEV.noParticles,v=>{window.DEV.noParticles=v;}); y+=24+GAP;

          // ── Enemy speed cap slider ──
          y+=8;
          secHdr(CX[0],y,CW,'// TUNING'); y+=24;
          (() => {
            const sliderX = CX[0]+8, sliderY = y;
            const BAR_W = CW-110, BAR_H = 14;
            const MIN = 150, MAX = 300, STEP = 10;
            const label = cadd(this.add.text(sliderX,sliderY,'ENEMY SPEED CAP',{fontFamily:mono,fontSize:'10px',color:'#aaaaaa',letterSpacing:1}).setOrigin(0,0).setDepth(D+2));
            const valTxt = cadd(this.add.text(sliderX+CW-70,sliderY,'',{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#ffaa00',letterSpacing:1}).setOrigin(0,0).setDepth(D+3));
            const trackBg = cadd(this.add.rectangle(sliderX,sliderY+18,BAR_W,BAR_H,0x111111,1).setOrigin(0,0).setDepth(D+2).setStrokeStyle(1,0x553300,0.8).setInteractive({useHandCursor:true}));
            const fillBar = cadd(this.add.rectangle(sliderX+1,sliderY+19,1,BAR_H-2,0xff8800,0.85).setOrigin(0,0).setDepth(D+3));
            const knob = cadd(this.add.rectangle(sliderX,sliderY+18+BAR_H/2,6,BAR_H+6,0xffdd44,1).setOrigin(0.5).setDepth(D+4));
            const minLbl = cadd(this.add.text(sliderX,sliderY+18+BAR_H+4,String(MIN),{fontFamily:mono,fontSize:'8px',color:'#553300'}).setOrigin(0,0).setDepth(D+2));
            const maxLbl = cadd(this.add.text(sliderX+BAR_W,sliderY+18+BAR_H+4,String(MAX),{fontFamily:mono,fontSize:'8px',color:'#553300'}).setOrigin(1,0).setDepth(D+2));
            const updateUI = () => {
              const v = window.DEV.enemySpeedCap;
              const ratio = Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)));
              valTxt.setText(`${v} px/s`);
              fillBar.width = Math.max(1, ratio * (BAR_W - 2));
              knob.x = sliderX + ratio * BAR_W;
            };
            updateUI();
            const handlePointer = (pointer) => {
              const localX = pointer.x - sliderX;
              const ratio = Math.max(0, Math.min(1, localX / BAR_W));
              let newVal = Math.round((MIN + ratio * (MAX - MIN)) / STEP) * STEP;
              newVal = Math.max(MIN, Math.min(MAX, newVal));
              window.DEV.enemySpeedCap = newVal;
              updateUI();
            };
            trackBg.on('pointerdown', handlePointer);
            trackBg.on('pointermove', (p) => { if (p.isDown) handlePointer(p); });
            // +/- buttons for precise stepping
            const mkStepBtn = (bx, dir, glyph) => {
              const b = cadd(this.add.rectangle(bx, sliderY+18+BAR_H/2, 22, 18, 0x002211, 1).setOrigin(0.5).setDepth(D+3).setInteractive({useHandCursor:true}).setStrokeStyle(1,0xff8800,0.6));
              cadd(this.add.text(bx, sliderY+18+BAR_H/2, glyph, {fontFamily:mono,fontSize:'11px',color:'#ffaa00',fontStyle:'bold'}).setOrigin(0.5).setDepth(D+4));
              b.on('pointerdown', () => {
                window.DEV.enemySpeedCap = Math.max(MIN, Math.min(MAX, window.DEV.enemySpeedCap + dir*STEP));
                updateUI();
              });
            };
            mkStepBtn(sliderX+BAR_W+18, -1, '-');
            mkStepBtn(sliderX+BAR_W+44, +1, '+');
          })();
          y += 48;
        }
      };

      // Tab bar
      const switchTab=i=>{
        activeTab=i;
        tabObjs.forEach((t,j)=>{
          t.bg.setFillStyle(0x00ff44,j===i?0.12:0);
          t.bar.setFillStyle(0x00ff44,j===i?0.9:0);
          t.txt.setColor(j===i?'#00ff44':'#336644');
        });
        buildContent();
      };
      TABS.forEach((label,i)=>{
        const tx=i*TW+TW/2;
        const tbg=this.add.rectangle(tx,TAB_Y,TW,TAB_H,0x00ff44,i===0?0.12:0).setOrigin(0.5,0).setDepth(D+1).setInteractive({useHandCursor:true});
        const tbar=this.add.rectangle(tx,TAB_Y,TW,2,0x00ff44,i===0?0.9:0).setOrigin(0.5,0).setDepth(D+2);
        const ttxt=this.add.text(tx,TAB_Y+TAB_H/2,label,{fontFamily:mono,fontSize:'10px',color:i===0?'#00ff44':'#336644',letterSpacing:1}).setOrigin(0.5).setDepth(D+2);
        tbg.on('pointerdown',()=>switchTab(i));
        tbg.on('pointerover',()=>{if(i!==activeTab)tbg.setFillStyle(0x00ff44,0.06);});
        tbg.on('pointerout', ()=>{if(i!==activeTab)tbg.setFillStyle(0x00ff44,0);});
        tabObjs.push({bg:tbg,bar:tbar,txt:ttxt});
      });
      buildContent();

      // ── Log strip ──
      const logY=H-LOG_H;
      this.add.rectangle(W/2,logY,W,LOG_H,0x000000,0.97).setOrigin(0.5,0).setDepth(D+1);
      this.add.rectangle(W/2,logY,W,1,0x003322,1).setOrigin(0.5,0).setDepth(D+1);
      this.add.text(10,logY+6,'// LOG',{fontFamily:mono,fontSize:'8px',color:'#224433'}).setDepth(D+2);
      this._logLines=[];
      for(let li=0;li<3;li++){
        this._logLines.push(this.add.text(10,logY+18+li*11,'',{fontFamily:mono,fontSize:'9px',color:'#00aa44'}).setDepth(D+2));
      }
      this._log('DEV OVERLAY READY — signal_lost');

      // ── Close button ──
      const closeBg=this.add.rectangle(W-80,18,140,26,0x110000,0.95).setDepth(D+3);
      this.add.rectangle(W-80,18,140,26).setStrokeStyle(1,0xff4444,0.7).setDepth(D+3);
      const closeTxt=this.add.text(W-80,18,'[ SHIFT+TAB ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#ff4444'}).setOrigin(0.5).setDepth(D+4).setInteractive({useHandCursor:true});
      closeTxt.on('pointerover',()=>{closeBg.setFillStyle(0x330000);closeTxt.setColor('#ffffff');});
      closeTxt.on('pointerout', ()=>{closeBg.setFillStyle(0x110000);closeTxt.setColor('#ff4444');});
      closeTxt.on('pointerdown',()=>this._close());

    }catch(err){console.error('[DEV OVERLAY]',err);}
  }

  _close(){
    try{
      const gs=this.scene.get('GameScene');
      if(this._pausedGame && gs && gs.sys.isPaused()){
        this.scene.resume('GameScene');
      }
    }catch{}
    this.scene.stop('DevOverlay');
  }

  _log(msg,col){
    try{
      if(!this._logLines)return;
      col=col||'#00cc44';
      const ts=new Date().toTimeString().slice(0,8);
      this._logHistory=(this._logHistory||[]);
      this._logHistory.unshift({line:`[${ts}] ${msg}`,col});
      this._logHistory=this._logHistory.slice(0,3);
      this._logLines.forEach((t,i)=>{
        const e=this._logHistory[i];
        t.setText(e?e.line:'').setColor(e?e.col:'#00cc44');
      });
    }catch{}
  }
}
