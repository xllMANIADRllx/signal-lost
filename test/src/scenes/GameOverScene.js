// ═══ GAMEOVERSCENE ═══
class GameOverScene extends Phaser.Scene{
  constructor(){super('GameOverScene');}
  _terminateToMenu(){
    try{CRT.suppress=true;document.body.style.cursor='none';}catch{}
    const ov=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(100);
    ov.setAlpha(0);this.tweens.add({targets:ov,alpha:1,duration:150});
    const lines=[
      {t:80,  txt:'> TERMINATE_PROCESS — SIGNAL LOST', col:'#ff2244'},
      {t:200, txt:'> KILLING ALL CHILD PROCESSES...',   col:'#ff4444'},
      {t:320, txt:'> FLUSHING MEMORY BUFFERS...',       col:'#882222'},
      {t:430, txt:'> WRITING CORE DUMP...',             col:'#661111'},
      {t:530, txt:'> PROCESS TERMINATED — EXIT CODE 0', col:'#ff2244'},
    ];
    lines.forEach((l,i)=>{
      this.time.delayedCall(l.t,()=>{
        try{CRT.glitch&&i===0&&CRT.glitch(0.4);}catch{}
        const txt=this.add.text(W/2,H/2-44+i*22,l.txt,{
          fontFamily:"'Courier New',monospace",fontSize:'13px',color:l.col
        }).setOrigin(0.5).setDepth(101).setAlpha(0);
        this.tweens.add({targets:txt,alpha:1,duration:50});
      });
    });
    this.time.delayedCall(750,()=>{
      try{
        const gs=this.scene.get('GameScene');
        if(gs&&gs.shutdown)gs.shutdown();
        this.scene.setVisible(false,'GameScene');
        const ms=this.scene.get('MenuScene');
        if(ms&&ms.sys.isSleeping()){this.scene.wake('MenuScene');}
        else{this.scene.start('MenuScene');}
        setTimeout(()=>{try{this.scene.stop('GameScene');}catch{}try{this.scene.stop('GameOverScene');}catch{}},250);
      }catch(e){try{this.scene.start('MenuScene');}catch{}}
    });
  }

  create(d){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(100,0,0,0);
    CRT.glitch(1.0);
    const addr=()=>'0x'+Math.floor(Math.random()*0xFFFFFFFF).toString(16).toUpperCase().padStart(8,'0');
    const hex4=()=>'0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
    const isNew=d&&d.score>parseInt(Save.hs()||0);

    // ── Full-screen dark red bg ──
    this.add.rectangle(W/2,H/2,W,H,0x0a0000,1);

    // Red vignette
    for(let i=0;i<6;i++){
      this.add.rectangle(W/2,H/2,W,H,0xff0000,0).setStrokeStyle(i*12,0xff0000,0.04-i*0.005);
    }

    // ── Background red scanlines ──
    const sg=this.add.graphics().setAlpha(0.06);
    for(let y=0;y<H;y+=4){sg.fillStyle(0xff0000,1);sg.fillRect(0,y,W,1);}

    // ── Top panic strip — slides down ──
    const strip=this.add.rectangle(W/2,-18,W,36,0xff0000,0.85).setOrigin(0.5,0.5);
    this.add.rectangle(W/2,-18,W,36).setStrokeStyle(0,0).setOrigin(0.5,0.5); // placeholder depth
    const stripTxt=this.add.text(W/2,-18,'  KERNEL PANIC — PROCESS TERMINATED — SIGNAL LOST  ',{
      fontFamily:"'Courier New',monospace",fontSize:'14px',fontStyle:'bold',color:'#99bbaa',letterSpacing:3
    }).setOrigin(0.5);
    this.tweens.add({targets:[strip,stripTxt],y:18,duration:220,ease:'Power2.Out'});

    // ── ASCII corruption block (left side) ──
    const skull=[
      '  ██████████  ',
      ' ██  ████  ██ ',
      '████  ██  ████',
      '██  ██████  ██',
      ' ██  ████  ██ ',
      '  ██████████  ',
      '   ██    ██   ',
      ' ████████████ ',
    ];
    skull.forEach((row,i)=>{
      this.time.delayedCall(i*30,()=>{
        this.add.text(24,56+i*20,row,{fontFamily:"'Courier New',monospace",fontSize:'13px',color:'#662222'}).setAlpha(0);
        const t2=this.add.text(24,56+i*20,row,{fontFamily:"'Courier New',monospace",fontSize:'13px',color:'#ff0000'}).setAlpha(0);
        this.tweens.add({targets:t2,alpha:0.6,duration:80});
      });
    });

    // ── Crash dump lines ──
    const score=d&&d.score||0,wave=d&&d.wave||0,shards=d&&d.shards||0;
    const chain=d&&d.bestChain||0,mode=(d&&d.mode||'normal').toUpperCase();
    const diff=(Settings.get('difficulty')||'daemon').toUpperCase();

    const lines=[
      {t:0,   txt:`[CRITICAL] PROCESS signal_lost.exe — UNHANDLED EXCEPTION`,  col:'#ff2244',sz:14,bold:true},
      {t:120, txt:`[ FATAL  ] CPU: ${addr()} · PID: ${hex4()} · COMM: signal_lost.exe`, col:'#ff4444',sz:11},
      {t:230, txt:`[ FAULT  ] SIGNAL_STRENGTH: ${score} · WAVE_REACHED: ${wave} · MODE: ${mode} · DIFF: ${diff}`,col:'#ff6644',sz:11},
      {t:330, txt:`[ FAULT  ] SHARDS_HARVESTED: ${shards} ◈ · BEST_CHAIN: ${chain}x`,col:'#ff6644',sz:11},
      {t:420, txt:'',sz:10},
      {t:440, txt:`[ TRACE  ] #0  warp_bubble_collapse+${hex4()} [signal_lost+${addr()}]`,col:'#882222',sz:11},
      {t:510, txt:`[ TRACE  ] #1  packet_integrity_fail+${hex4()} [rogue_core+${addr()}]`,col:'#882222',sz:11},
      {t:580, txt:`[ TRACE  ] #2  rogue_ai_overpowered+${hex4()} [kernel+${addr()}]`,col:'#771111',sz:11},
      {t:650, txt:`[ TRACE  ] #3  process_containment_fail+${hex4()} [network+${addr()}]`,col:'#661111',sz:11},
      {t:720, txt:'',sz:10},
      {t:740, txt:`[ REGS   ] EAX=${addr()} EBX=${addr()} ECX=${addr()} EDX=${addr()}`,col:'#441111',sz:10},
      {t:800, txt:`[ REGS   ] ESI=${addr()} EDI=${addr()} EBP=${addr()} ESP=${addr()}`,col:'#441111',sz:10},
      {t:860, txt:`[ STACK  ] ${addr()}: ff ff 00 de ad be ef 4a 2b 19 c3 00 00 ff ff`,col:'#330000',sz:10},
      {t:920, txt:`[ STACK  ] ${addr()}: 00 00 00 00 00 00 00 00 ff ff ff ff 00 00 00 00`,col:'#330000',sz:10},
      {t:980, txt:'',sz:10},
      {t:1000,txt:`[ DUMP   ] CORE SAVED — /var/crash/signal_lost_${Date.now()}.core`,col:'#ff3333',sz:11},
      ...(isNew?[{t:1080,txt:`[ RECORD ] ★ NEW HIGH SIGNAL: ${score} — PROCESS EXCEEDS LIMITS ★`,col:'#ffd700',sz:14,bold:true}]:[]),
      {t:isNew?1180:1080,txt:'[ SYSTEM ] RECONNECTION AVAILABLE — STANDBY...',col:'#ff4444',sz:12,bold:true},
    ];

    let maxT=0;
    lines.forEach((l,i)=>{
      if(!l.txt)return;
      maxT=Math.max(maxT,l.t);
      this.time.delayedCall(l.t,()=>{
        if(!this.scene.isActive('GameOverScene'))return;
        const y=50+i*22;
        const txt=this.add.text(200,y,l.txt,{
          fontFamily:"'Courier New',monospace",fontSize:`${l.sz}px`,
          fontStyle:l.bold?'bold':'normal',color:l.col
        }).setAlpha(0);
        this.tweens.add({targets:txt,alpha:1,duration:50});
        if(i===0){
          this.tweens.add({targets:txt,x:{from:206,to:196},duration:40,yoyo:true,repeat:3});
          if(Settings.get('shake'))this.cameras.main.flash(250,255,0,0,0.25);
        }
        if(l.bold&&isNew&&l.col==='#ffd700'){
          this.tweens.add({targets:txt,alpha:{from:1,to:0.5},duration:400,yoyo:true,repeat:-1});
        }
      });
    });

    // ── Bottom panel + buttons ──
    this.time.delayedCall(maxT+240,()=>{
      if(!this.scene.isActive('GameOverScene'))return;
      try{
        const debugUses=Save.get('debug_uses')||0;
        const diff2=Settings.get('difficulty')||'daemon';
        const costs=DIFFICULTY[diff2].debugCost;
        const debugCost=debugUses<costs.length?costs[debugUses]:costs[costs.length-1]*2;
        const canDebug=Save.shards()>=debugCost;
        // Rollback vars
        const ROLLBACK_COST=80;
        const canRollback=!d.rollbackUsed&&Save.shards()>=ROLLBACK_COST;
        const fmt2=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');};
        const sector=d.stage>=0?['SURFACE_LAYER','KERNEL_SPACE','DEEP_MEMORY','SECTOR_00'][d.stage||0]:'SURFACE_LAYER';
        const sectorCols=['#00cc66','#ff6600','#aa44ff','#ffd700'];
        const sectorCol=sectorCols[d.stage||0]||'#00cc66';

        // Bottom panel
        this.add.rectangle(W/2,H-56,W,108,0x000000,0.97).setOrigin(0.5);
        this.add.rectangle(W/2,H-108,W,2,0x440000,0.9).setOrigin(0.5);

        // Summary strip — richer data
        const timeStr=fmt2(d.timeAlive||0);
        this.add.text(W/2,H-105,`RUNTIME: ${timeStr}  ·  SECTOR: ${sector}  ·  CAUSE: ${d.deathCause||'UNKNOWN'}`,{
          fontFamily:"'Courier New',monospace",fontSize:'10px',color:sectorCol
        }).setOrigin(0.5);
        this.add.text(W/2,H-90,`SIGNAL: ${score}  ·  WAVE: ${wave}  ·  SHARDS: ${shards} ◈  ·  BEST_CHAIN: ${chain}x`,{
          fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#cc4444'
        }).setOrigin(0.5);

        const btnY=H-60;
        const btns=[
          {x:W/2-370,w:210,h:48,label:'[ DEBUG_MODE ]',sub:canDebug?`Cost: ${debugCost} ◈`:'INSUFFICIENT ◈',
           bg:canDebug?0x150800:0x050000,col:0xff8800,colH:'#ff8800',
           active:canDebug,
           fn:()=>{Save.spendShards(debugCost);Save.set('debug_uses',(Save.get('debug_uses')||0)+1);
             this.cameras.main.fadeOut(280,0,0,0);
             this.time.delayedCall(280,()=>this.scene.start('GameScene',{mode:d.mode,debugWave:d.wave,debugUpgrades:d.upgrades,debugScore:d.score}));}},
          {x:W/2-130,w:210,h:48,label:'[ RECONNECT ]',sub:'start new run',
           bg:0x001500,col:0x00ff44,colH:'#00ff44',active:true,
           fn:()=>{Save.set('debug_uses',0);this.cameras.main.fadeOut(280,0,0,0);this.time.delayedCall(280,()=>{
             try{const gs=this.scene.get('GameScene');if(gs)gs.shutdown();}catch{}
             this.scene.stop('GameScene');
             this.scene.stop('GameOverScene');
             let arcData2={};
              try{arcData2=JSON.parse(Save.get('last_run_archetype')||'{}');}catch{}
              this.scene.start('GameScene',{
                mode:d.mode,
                archetype:arcData2.archetype||null,
                archetypeSeeds:arcData2.archetypeSeeds||null,
                archetypePower:arcData2.archetypePower||null,
              });
           });}},
          {x:W/2+110,w:230,h:48,label:'[ ROLLBACK_PROCESS ]',
           sub:canRollback?`Cost: ${ROLLBACK_COST} ◈ — one use per run`:'ALREADY_USED or INSUFFICIENT ◈',
           bg:canRollback?0x001a1a:0x050505,col:0x00ffcc,colH:'#00ffcc',active:canRollback,
           fn:()=>{
             Save.spendShards(ROLLBACK_COST);
             this.cameras.main.fadeOut(300,0,0,0);
             this.time.delayedCall(300,()=>{
               this.scene.stop('GameOverScene');
               // Resume GameScene from same wave/state, rollback flag set
               this.scene.start('GameScene',{
                 mode:d.mode,debugWave:d.wave,debugScore:d.score,
                 debugUpgrades:d.upgrades,rollbackUsed:true,
               });
             });
           }},
          {x:W/2+350,w:210,h:48,label:'[ TERMINATE ]',sub:'kill process — return to shell',
           bg:0x150000,col:0xff2244,colH:'#ff2244',active:true,
           fn:()=>{
             Save.set('debug_uses',0);
             this._terminateToMenu();
           }},
        ];

        btns.forEach(b=>{
          const col=typeof b.col==='string'?parseInt(b.col.replace('#',''),16):b.col;
          const bg2=this.add.rectangle(b.x,btnY,b.w,b.h,b.bg,0.97);
          if(b.active)bg2.setInteractive({useHandCursor:true});
          this.add.rectangle(b.x,btnY,b.w,b.h).setStrokeStyle(b.x===W/2?2:1,col,b.active?0.8:0.25);
          this.add.rectangle(b.x-b.w/2,btnY-b.h/2,2,b.h,col,b.active?0.8:0.2).setOrigin(0,0);
          const lbl=this.add.text(b.x,btnY-9,b.label,{fontFamily:"'Courier New',monospace",fontSize:'14px',fontStyle:'bold',color:b.active?b.colH:(b.col+'88')}).setOrigin(0.5);
          this.add.text(b.x,btnY+12,b.sub,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:b.active?'#224433':'#331111'}).setOrigin(0.5);
          if(b.active){
            bg2.on('pointerover',()=>{bg2.setFillStyle(col,0.15);lbl.setColor('#ffffff');});
            bg2.on('pointerout',()=>{bg2.setFillStyle(b.bg,0.97);lbl.setColor(b.colH);});
            bg2.on('pointerdown',b.fn);
          }
          // Blink the RECONNECT button
          if(b.x===W/2){this.tweens.add({targets:lbl,alpha:0.5,duration:550,yoyo:true,repeat:-1,delay:400});}
        });
      }catch(err){console.error('[GAMEOVER BTN]',err);}
    });

    try{Voice.say('connection lost');}catch{}
  }
}

// BOSS CUTSCENE
// ═══════════════════════════════════════════════════════════
