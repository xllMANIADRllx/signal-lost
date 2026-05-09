// ═══ DEVSCENE ═══
class DevScene extends Phaser.Scene{
  constructor(){super('DevScene');}

  create(){
    try{
      this.cameras.main.setBackgroundColor('#000000');
      this.cameras.main.fadeIn(200,0,0,0);

      // ── Background grid ──
      const g=this.add.graphics();
      g.lineStyle(1,0x001100,0.35);
      for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
      for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
      g.strokePath();

      // ── Header ──
      this.add.rectangle(W/2,0,W,32,0x000000,1).setOrigin(0.5,0);
      this.add.rectangle(W/2,32,W,1,0x00ff44,0.8).setOrigin(0.5,0);
      this.add.text(W/2,14,'[ DEV_CONSOLE.SH — SIGNAL LOST ]',{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#00ff44',letterSpacing:3}).setOrigin(0.5,0.5);
      this.add.text(16,14,'// DEV MODE',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#336644'}).setOrigin(0,0.5);
      this.add.text(W-16,14,'NOT FOR RELEASE',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#664400'}).setOrigin(1,0.5);

      // ── Live stats bar ──
      this.add.rectangle(W/2,48,W,20,0x001100,0.9).setOrigin(0.5,0);
      this.statsTxt=this.add.text(12,58,'',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#00cc55'}).setOrigin(0,0.5);

      // ── Section layout ──
      // Left column: Game State | Visual Debug
      // Center column: Upgrades | Testing
      // Right column: Save | Audio
      const COL=[170,490,810];
      const SEC_Y=82;
      const W_COL=290;

      // ── Helper: section header ──
      const secHead=(x,y,label)=>{
        this.add.rectangle(x,y,W_COL,22,0x001a00,1).setOrigin(0.5,0);
        this.add.rectangle(x-W_COL/2,y,2,22,0x00ff44,0.7).setOrigin(0,0);
        this.add.text(x-W_COL/2+8,y+10,label,{fontFamily:"'Courier New',monospace",fontSize:'12px',fontStyle:'bold',color:'#00ff44'}).setOrigin(0,0.5);
      };

      // ── Helper: button ──
      const btn=(x,y,label,col,cb)=>{
        col=col||'#00cc44';
        const bg=this.add.rectangle(x,y,W_COL-10,22,0x000000,0.9).setOrigin(0.5,0).setInteractive({useHandCursor:true});
        this.add.rectangle(x-W_COL/2+5,y,2,22,parseInt(col.replace('#',''),16),0.5).setOrigin(0,0);
        const t=this.add.text(x-W_COL/2+14,y+11,`> ${label}`,{fontFamily:"'Courier New',monospace",fontSize:'12px',color:col}).setOrigin(0,0.5);
        bg.on('pointerover',()=>{bg.setFillStyle(0x002200);t.setColor('#ffffff');});
        bg.on('pointerout',()=>{bg.setFillStyle(0x000000);t.setColor(col);});
        bg.on('pointerdown',()=>{try{cb();}catch(err){this._log('[ERR] '+err.message,'#ff4444');}});
        return {bg,t};
      };

      // ── Helper: number input button pair ──
      const numBtn=(x,y,label,col,getCb,setCb)=>{
        this.add.text(x-W_COL/2+14,y+11,label,{fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#336644'}).setOrigin(0,0.5);
        const valT=this.add.text(x+30,y+9,'',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:col||'#00cc44'}).setOrigin(0.5,0.5);
        const upd=()=>valT.setText(String(getCb()));
        upd();
        const mkB=(bx,dir,amt)=>{
          const b=this.add.rectangle(bx,y+9,22,16,0x001a00,1).setOrigin(0.5,0.5).setInteractive({useHandCursor:true});
          this.add.text(bx,y+9,dir>0?'+':'-',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:col||'#00cc44'}).setOrigin(0.5,0.5);
          b.on('pointerdown',()=>{setCb(getCb()+dir*amt);upd();});
          b.on('pointerover',()=>b.setFillStyle(0x003300));
          b.on('pointerout',()=>b.setFillStyle(0x001a00));
        };
        mkB(x+75,1,1);mkB(x+99,1,10);
        mkB(x-15,-1,1);mkB(x-39,-1,10);
      };

      // ── Helper: toggle button ──
      const tog=(x,y,label,col,getCb,setCb)=>{
        const bg=this.add.rectangle(x,y,W_COL-10,22,0x000000,0.9).setOrigin(0.5,0).setInteractive({useHandCursor:true});
        this.add.rectangle(x-W_COL/2+5,y,2,22,parseInt((col||'#00cc44').replace('#',''),16),0.5).setOrigin(0,0);
        const t=this.add.text(x-W_COL/2+14,y+11,'',{fontFamily:"'Courier New',monospace",fontSize:'12px'}).setOrigin(0,0.5);
        const upd=()=>{const v=getCb();t.setText(`> ${label}: ${v?'ON':'OFF'}`).setColor(v?col||'#00cc44':'#224433');};
        upd();
        bg.on('pointerdown',()=>{setCb(!getCb());upd();});
        bg.on('pointerover',()=>bg.setFillStyle(0x002200));
        bg.on('pointerout',()=>bg.setFillStyle(0x000000));
        return upd;
      };

      // Dev state — all scoped to DevScene, applied via GameScene globals
      if(!window.DEV)window.DEV={
        invincible:false, oneHit:false, showHitboxes:false,
        showLabels:false, showFPS:false, noParticles:false,
        wave:1, score:0, shards:Save.shards(),
        skin:'ranger',
      };

      // ══════════════════════════════════════════
      // COL 0: GAME STATE CONTROL
      // ══════════════════════════════════════════
      let y=SEC_Y;
      secHead(COL[0],y,'// GAME STATE'); y+=26;
      numBtn(COL[0],y,'WAVE',  '#00cc44',()=>window.DEV.wave,    v=>window.DEV.wave=Math.max(1,Math.min(20,v))); y+=22;
      numBtn(COL[0],y,'SCORE', '#ffdd00',()=>window.DEV.score,   v=>window.DEV.score=Math.max(0,v)); y+=22;
      numBtn(COL[0],y,'SHARDS','#ccaa00',()=>window.DEV.shards,  v=>window.DEV.shards=Math.max(0,v)); y+=22;
      btn(COL[0],y,'LAUNCH WITH DEV STATE','#00ff44',()=>{
        Save.set('shards',window.DEV.shards);
        this.cameras.main.fadeOut(250,0,0,0);
        this.time.delayedCall(250,()=>{
          this.scene.start('GameScene',{mode:'dev',debugWave:window.DEV.wave,debugScore:window.DEV.score,debugUpgrades:null});
        });
      }); y+=24;

      secHead(COL[0],y,'// TOGGLES'); y+=22;
      const tInvinc=tog(COL[0],y,'INVINCIBLE','#00ffcc',()=>window.DEV.invincible,v=>{window.DEV.invincible=v;}); y+=20;
      const tOneHit=tog(COL[0],y,'ONE HIT KILL','#ff4444',()=>window.DEV.oneHit,v=>{window.DEV.oneHit=v;}); y+=20;
      const tHitbox=tog(COL[0],y,'SHOW HITBOXES','#ff8800',()=>window.DEV.showHitboxes,v=>{window.DEV.showHitboxes=v;}); y+=20;
      const tLabels=tog(COL[0],y,'SHOW LABELS','#ffdd00',()=>window.DEV.showLabels,v=>{window.DEV.showLabels=v;}); y+=20;
      const tFPS=tog(COL[0],y,'SHOW FPS','#00aaff',()=>window.DEV.showFPS,v=>{window.DEV.showFPS=v;}); y+=20;
      const tParts=tog(COL[0],y,'NO PARTICLES','#aa00ff',()=>window.DEV.noParticles,v=>{window.DEV.noParticles=v;}); y+=24;

      secHead(COL[0],y,'// SKIN SELECT'); y+=22;
      Object.values(SHIPS).forEach(s=>{
        btn(COL[0],y,`${s.name} (${s.id})`,window.DEV.skin===s.id?'#00ff44':'#224433',()=>{
          window.DEV.skin=s.id;Save.setSkin(s.id);
          if(!Save.isOwned(s.id)){Save.own(s.id);}
          this._log(`Skin set: ${s.id}`);
        }); y+=20;
      });

      // ══════════════════════════════════════════
      // COL 1: SPAWN / TEST FEATURES
      // ══════════════════════════════════════════
      y=SEC_Y;
      secHead(COL[1],y,'// SPAWN CONTROL'); y+=22;
      ['grunt','sniper','tank','swarm','rootkit'].forEach(type=>{
        btn(COL[1],y,`SPAWN ${type.toUpperCase()}`, '#ff8800',()=>{
          this._log(`Spawn ${type} — launch game first`);
          window.DEV.spawnEnemy=type;
        }); y+=20;
      });
      btn(COL[1],y,'SPAWN BOSS','#ff2244',()=>{window.DEV.spawnBoss=true;this._log('Boss will spawn on next game launch');}); y+=20;
      btn(COL[1],y,'CLEAR ALL ENEMIES','#ff4444',()=>{window.DEV.clearEnemies=true;this._log('Enemies cleared on next frame');}); y+=20;
      btn(COL[1],y,'FORCE WAVE CLEAR','#00ffcc',()=>{window.DEV.forceWaveClear=true;this._log('Wave clear queued');}); y+=24;

      secHead(COL[1],y,'// TRIGGER EVENTS'); y+=22;
      btn(COL[1],y,'TRIGGER MEMORY DUMP','#aaffdd',()=>{window.DEV.triggerMemDump=true;this._log('Memory dump queued');}); y+=20;
      btn(COL[1],y,'TRIGGER STACK OVERFLOW','#ffdd00',()=>{window.DEV.triggerOverflow=true;this._log('Stack overflow queued');}); y+=20;
      btn(COL[1],y,'TRIGGER PING (bypass CD)','#00ffcc',()=>{window.DEV.forcePing=true;this._log('Ping bypass queued');}); y+=20;
      btn(COL[1],y,'TRIGGER INFERNO RAGE','#ff6600',()=>{window.DEV.forceRage=true;this._log('Rage mode queued');}); y+=20;
      btn(COL[1],y,'TEST WAVE CLEAR CINEMATIC','#00cc44',()=>{
        this.cameras.main.fadeOut(250,0,0,0);
        this.time.delayedCall(250,()=>this.scene.start('GameScene',{mode:'dev',debugWave:1,debugScore:500}));
      }); y+=20;
      btn(COL[1],y,'TEST BOSS CUTSCENE','#ff2244',()=>{
        this.cameras.main.fadeOut(250,0,0,0);
        this.time.delayedCall(250,()=>this.scene.start('GameScene',{mode:'dev',debugWave:4,debugScore:0}));
      }); y+=20;
      btn(COL[1],y,'TEST ALL BANNERS','#ffdd00',()=>{window.DEV.testBanners=true;this._log('Banners queued');}); y+=24;
      btn(COL[1],y,'GIVE ALL RELICS','#aa44ff',()=>{window.DEV.giveAllRelics=true;this._log('All relics queued');}); y+=20;
      btn(COL[1],y,'OPEN STATS SCREEN','#00ccff',()=>{window.DEV.openStats=true;this._log('Stats screen queued');}); y+=20; y+=26;
      [1,2,3].forEach(ph=>{
        btn(COL[1],y,`FORCE BOSS PHASE ${ph}`,'#ff4444',()=>{window.DEV.bossPhase=ph;this._log(`Boss phase ${ph} queued`);}); y+=24;
      });
      y+=4;
      secHead(COL[1],y,'// FIGHT BOSS DIRECTLY'); y+=26;
      const bossWaves={FIREWALL:5,'VOID.NODE':10,'GHOST.EXE':15,'CORE.BREACH':20};
      Object.entries(bossWaves).forEach(([name,wave])=>{
        btn(COL[1],y,`FIGHT ${name}`,'#ff2244',()=>{
          this.cameras.main.fadeOut(260,0,0,0);
          this.time.delayedCall(260,()=>{
            this.scene.stop('DevScene');
            this.scene.start('GameScene',{mode:'dev',debugWave:wave-1,debugScore:0});
          });
        }); y+=24;
      });

      // ══════════════════════════════════════════
      // COL 2: UPGRADES / SAVE / AUDIO
      // ══════════════════════════════════════════
      y=SEC_Y;
      secHead(COL[2],y,'// UPGRADES'); y+=22;
      btn(COL[2],y,'GIVE ALL WAVE UPGRADES (MAX)','#00ffcc',()=>{
        window.DEV.allUpgrades=true;
        this._log('All upgrades max — launch game to apply');
      }); y+=20;
      btn(COL[2],y,'GIVE ALL SHOP PATCHES','#00aaff',()=>{
        ['firewall_seed','redundant_path','data_cache','primed_signal',
         'redundant_buf','overclock_chip','signal_amp','packet_router',
         'heat_sink','ghost_protocol','data_compress','kernel_access'].forEach(id=>Save.setMeta(id,true));
        this._log('All shop patches installed');
      }); y+=20;
      btn(COL[2],y,'UNLOCK ALL SKINS','#aa88ff',()=>{
        Object.keys(SHIPS).forEach(id=>{if(!Save.isOwned(id))Save.own(id);});
        this._log('All skins unlocked');
      }); y+=20;
      btn(COL[2],y,'RESET RUN UPGRADES','#ff4444',()=>{
        window.DEV.resetUpgrades=true;this._log('Upgrades reset queued');
      }); y+=24;

      secHead(COL[2],y,'// SAVE DATA'); y+=22;
      btn(COL[2],y,'ADD 9999 SHARDS','#ccaa00',()=>{
        Save.set('shards',(Save.shards()||0)+9999);
        this._log(`Shards: ${Save.shards()}`);
      }); y+=20;
      btn(COL[2],y,'RESET SHARDS TO 0','#ff4444',()=>{Save.set('shards',0);this._log('Shards reset');}); y+=20;
      btn(COL[2],y,'RESET LEADERBOARD','#ff4444',()=>{Save.set('lb','[]');this._log('Leaderboard wiped');}); y+=20;
      btn(COL[2],y,'EXPORT SAVE TO CONSOLE','#00aaff',()=>{
        try{
          const data={};
          for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))data[k]=localStorage.getItem(k);}
          console.log('[DEV] SAVE EXPORT:',JSON.stringify(data,null,2));
          this._log('Save exported to console (F12)');
        }catch(e){this._log('[ERR] '+e.message,'#ff4444');}
      }); y+=20;
      btn(COL[2],y,'WIPE ALL SAVE DATA','#ff0000',()=>{
        if(!this._wipeConfirm){
          this._wipeConfirm=true;
          this._log('Click again to confirm wipe!','#ff4444');
          this.time.delayedCall(3000,()=>{this._wipeConfirm=false;});
        } else {
          try{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sl_'))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));this._log('ALL DATA WIPED','#ff0000');}
          catch(e){this._log('[ERR] '+e.message,'#ff4444');}
        }
      }); y+=24;

      secHead(COL[2],y,'// AUDIO / VISUAL'); y+=22;
      btn(COL[2],y,'FORCE CRT GLITCH MAX','#aaaaff',()=>{CRT.glitch(2.0);this._log('Glitch triggered');}); y+=20;
      btn(COL[2],y,'TEST ALL SOUNDS',   '#00aaff',()=>{
        ['reflect','shield','surge','powerup','hit','laser'].forEach((s,i)=>this.time.delayedCall(i*400,()=>{try{Snd.play(s);}catch{}}));
        this._log('Playing all sounds...');
      }); y+=20;
      btn(COL[2],y,'TOGGLE CRT',        '#aaaaff',()=>{Settings.set('crt',!Settings.get('crt'));this._log(`CRT: ${Settings.get('crt')}`);}); y+=20;
      btn(COL[2],y,'TOGGLE SHAKE',      '#aaaaff',()=>{Settings.set('shake',!Settings.get('shake'));this._log(`Shake: ${Settings.get('shake')}`);}); y+=20;
      btn(COL[2],y,'RESET DEBUG_USES',  '#ff8800',()=>{Save.set('debug_uses',0);this._log('Debug uses reset to 0');}); y+=20;
      btn(COL[2],y,'COMPLETE DAILY CHALLENGES','#ffdd00',()=>{
        const today=new Date().toDateString();
        const key='daily_done_'+today;
        const ids=DAILY_POOL.map(c=>c.id);
        Save.set(key,JSON.stringify(ids));
        this._log('All daily challenges marked done');
      }); y+=20;

      // ── Log area ──
      this.add.rectangle(W/2,H-70,W,66,0x000000,0.95).setOrigin(0.5,0);
      this.add.rectangle(W/2,H-70,W,1,0x003322,1).setOrigin(0.5,0);
      this.add.text(12,H-62,'// LOG',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#224433'});
      this._logLines=[];
      for(let i=0;i<4;i++){
        this._logLines.push(this.add.text(12,H-52+i*13,'',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#00aa44'}));
      }

      // ── Back button ──
      // ── Back button — prominent top left + ESC ──
      const backBg=this.add.rectangle(80,16,140,26,0x110000,0.95).setDepth(20);
      this.add.rectangle(80,16,140,26).setStrokeStyle(1,0xff4444,0.7).setDepth(20);
      const back=this.add.text(80,16,'[ ESC — EXIT DEV ]',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:'#ff4444'}).setOrigin(0.5,0.5).setDepth(20).setInteractive({useHandCursor:true});
      const goBack=()=>{this.cameras.main.fadeOut(200,0,0,0);this.time.delayedCall(220,()=>{this.scene.stop();const ms2=this.scene.get('MenuScene');if(ms2&&ms2.sys.isSleeping()){this.scene.wake('MenuScene');}else{this.scene.start('MenuScene');}});};
      back.on('pointerover',()=>{backBg.setFillStyle(0x330000);back.setColor('#ffffff');});
      back.on('pointerout',()=>{backBg.setFillStyle(0x110000);back.setColor('#ff4444');});
      back.on('pointerdown',goBack);
      this.input.keyboard.on('keydown-ESC',goBack);

      this._log('DEV CONSOLE READY — signal_lost debug build');
      this._statsTimer=this.time.addEvent({delay:500,loop:true,callback:this._updateStats,callbackScope:this});

    }catch(err){console.error('[DEV SCENE ERROR]',err);}
  }

  _log(msg,col){
    try{
      if(!this._logLines)return;
      col=col||'#00cc44';
      const ts=new Date().toTimeString().slice(0,8);
      const line=`[${ts}] ${msg}`;
      this._logHistory=(this._logHistory||[]);
      this._logHistory.unshift({line,col});
      this._logHistory=this._logHistory.slice(0,4);
      this._logLines.forEach((t,i)=>{
        const entry=this._logHistory[i];
        t.setText(entry?entry.line:'').setColor(entry?entry.col:'#00cc44');
      });
    }catch(e){}
  }

  _updateStats(){
    try{
      const d=window.DEV||{};
      this.statsTxt&&this.statsTxt.setText(
        `WAVE:${d.wave||1}  SCORE:${d.score||0}  SHARDS:${Save.shards()}  SKIN:${d.skin||'ranger'}  `+
        `INV:${d.invincible?'ON':'OFF'}  1HIT:${d.oneHit?'ON':'OFF'}  HBX:${d.showHitboxes?'ON':'OFF'}  `+
        `LABELS:${d.showLabels?'ON':'OFF'}  FPS:${d.showFPS?'ON':'OFF'}`
      );
    }catch(e){}
  }
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// BOOT SCENE — mode-specific terminal loading sequences
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// ARCHETYPE SELECT SCENE
// ═══════════════════════════════════════════════════════════
