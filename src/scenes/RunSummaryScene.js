// ═══════════════════════════════════════════════════════════
// RUNSUMMARYSCENE
// ═══════════════════════════════════════════════════════════

class RunSummaryScene extends Phaser.Scene{
  constructor(){super('RunSummaryScene');}

  create(d){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(400,0,0,0);
    const D=d||{};
    const score=D.score||0;
    const wave=D.wave||0;
    const kills=D.kills||0;
    const shards=D.shards||0;
    const chain=D.bestChain||0;
    const stage=D.stage||0;
    const deathCause=D.deathCause||'UNKNOWN_ERROR';
    const timeAlive=D.timeAlive||0;
    const upgrades=D.upgrades||{};
    const mode=(D.mode||'normal').toUpperCase();
    const archetype=(D.archetype||'').toUpperCase();
    const rollbackUsed=D.rollbackUsed||false;
    const reflected=D.reflected||0;

    const STAGE_NAMES=['SURFACE_LAYER','KERNEL_SPACE','DEEP_MEMORY','SECTOR_00'];
    const STAGE_COLS=[0x00cc66,0xff6600,0xaa44ff,0xffd700];
    const STAGE_STRS=['#00cc66','#ff6600','#aa44ff','#ffd700'];
    const accentNum=STAGE_COLS[stage]||0x00cc66;
    const accentStr=STAGE_STRS[stage]||'#00cc66';
    const sectorName=STAGE_NAMES[stage]||'SURFACE_LAYER';

    const isNewBest=score>(Save.hs()||0);
    if(isNewBest)Save.saveHs(score);

    const prevBest=isNewBest?score:(Save.hs()||0);
    const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return`${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`;};

    // ── Background ──
    const bg=this.add.graphics();
    bg.lineStyle(1,accentNum,0.07);
    bg.beginPath();
    for(let x=0;x<=W;x+=80){bg.moveTo(x,0);bg.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){bg.moveTo(0,y);bg.lineTo(W,y);}
    bg.strokePath();

    // ── Death header banner ──
    this.add.rectangle(W/2,0,W,72,0x0d0000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,72,W,2,0xff2244,0.7).setOrigin(0.5,0);
    this.add.text(W/2,18,'// PROCESS_TERMINATED — EXIT_CODE: 0xDEAD',{
      fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#cc4444',letterSpacing:2
    }).setOrigin(0.5);
    const deathTxt=this.add.text(W/2,46,`SIGNAL LOST — ${deathCause}`,{
      fontFamily:"'Courier New',monospace",fontSize:'20px',fontStyle:'bold',color:'#ff2244',letterSpacing:2
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({targets:deathTxt,alpha:1,duration:300,delay:100});
    // Glitch pulse on death text
    this.time.addEvent({delay:2200,repeat:-1,callback:()=>{
      deathTxt.setColor('#ffffff');
      this.time.delayedCall(60,()=>deathTxt.setColor('#ff2244'));
      this.time.delayedCall(120,()=>deathTxt.setColor('#ffffff'));
      this.time.delayedCall(180,()=>deathTxt.setColor('#ff2244'));
    }});

    // ── Stat cards 3×2 grid ──
    const CW=280, CH=74, GAPX=16, GAPY=12;
    const GRID_Y=86;
    const totalGridW=3*CW+2*GAPX;
    const gridX=(W-totalGridW)/2;

    const STATS=[
      {label:'SIGNAL_SCORE', value:score.toLocaleString(), col:'#00ffcc', colN:0x00ffcc,
       badge:isNewBest?'NEW BEST ▲':score>0?`BEST: ${prevBest.toLocaleString()}`:''},
      {label:'WAVE_REACHED',  value:String(wave),           col:'#00ff88', colN:0x00ff88, badge:''},
      {label:'ENEMIES_TERMINATED', value:kills.toLocaleString(), col:'#ffdd00', colN:0xffdd00, badge:''},
      {label:'BULLETS_REFLECTED',  value:reflected.toLocaleString(), col:'#4488ff', colN:0x4488ff, badge:''},
      {label:'BEST_COMBO',   value:`×${chain}`,             col:'#ff9944', colN:0xff9944, badge:''},
      {label:'SHARDS_EARNED', value:`+${shards} ◆`,         col:'#aaffdd', colN:0xaaffdd, badge:''},
    ];

    STATS.forEach((s,i)=>{
      const col=i%3,row=Math.floor(i/3);
      const cx=gridX+col*(CW+GAPX);
      const cy=GRID_Y+row*(CH+GAPY);

      const card=this.add.rectangle(cx,cy,CW,CH,0x020a04,0.97).setOrigin(0,0).setAlpha(0);
      card.setStrokeStyle(1,s.colN,0.35);
      this.add.rectangle(cx,cy,CW,3,s.colN,0.8).setOrigin(0,0).setAlpha(0);
      const label=this.add.text(cx+14,cy+12,s.label,{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
      }).setAlpha(0);
      const val=this.add.text(cx+14,cy+34,s.value,{
        fontFamily:"'Orbitron',sans-serif",fontSize:'22px',fontStyle:'bold',color:s.col
      }).setAlpha(0);
      const badge=s.badge?this.add.text(cx+CW-10,cy+12,s.badge,{
        fontFamily:"'Courier New',monospace",fontSize:'9px',
        color:isNewBest&&i===0?'#ffd700':'#336644'
      }).setOrigin(1,0).setAlpha(0):null;

      const delay=200+i*80;
      this.time.delayedCall(delay,()=>{
        if(!this.scene.isActive('RunSummaryScene'))return;
        [card,label,val].forEach(o=>this.tweens.add({targets:o,alpha:1,duration:180}));
        if(badge)this.tweens.add({targets:badge,alpha:1,duration:180});
        // Highlight top bar on new best
        if(i===0&&isNewBest){
          this.tweens.add({targets:val,alpha:{from:1,to:0.5},duration:700,yoyo:true,repeat:-1,delay:400});
        }
      });
    });

    // ── Info strip (archetype, sector, diff, time) ──
    const STRIP_Y=GRID_Y+2*(CH+GAPY)+12;
    const stripBg=this.add.rectangle(gridX,STRIP_Y,totalGridW,42,0x001a0d,0.97).setOrigin(0,0).setAlpha(0);
    stripBg.setStrokeStyle(1,accentNum,0.3);
    this.time.delayedCall(700,()=>{
      if(!this.scene.isActive('RunSummaryScene'))return;
      this.tweens.add({targets:stripBg,alpha:1,duration:180});
      const infos=[
        {label:'ARCHETYPE', val:archetype||'—',    col:'#00ffcc', x:gridX+20},
        {label:'SECTOR',    val:sectorName,         col:accentStr,  x:gridX+220},
        {label:'DIFFICULTY',val:(D.difficulty||'DAEMON').toUpperCase(), col:'#ffdd00', x:gridX+500},
        {label:'DURATION',  val:fmt(timeAlive),     col:'#667788',  x:gridX+720},
      ];
      infos.forEach(inf=>{
        const lt=this.add.text(inf.x,STRIP_Y+8,inf.label,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#336644'}).setAlpha(0);
        const vt=this.add.text(inf.x,STRIP_Y+22,inf.val,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:inf.col}).setAlpha(0);
        this.tweens.add({targets:[lt,vt],alpha:1,duration:180});
      });
    });

    // ── Sector progress bar ──
    const BAR_Y=STRIP_Y+52;
    this.time.delayedCall(850,()=>{
      if(!this.scene.isActive('RunSummaryScene'))return;
      const barBg=this.add.rectangle(gridX,BAR_Y,totalGridW,20,0x030d06,0.97).setOrigin(0,0).setAlpha(0);
      barBg.setStrokeStyle(1,0x1a3322,0.8);
      this.tweens.add({targets:barBg,alpha:1,duration:150});

      STAGE_NAMES.forEach((sn,si)=>{
        const sx=gridX+si*(totalGridW/4);
        const sw=totalGridW/4;
        if(si<stage){
          const fill=this.add.rectangle(sx,BAR_Y,sw,20,STAGE_COLS[si],0.25).setOrigin(0,0).setAlpha(0);
          this.tweens.add({targets:fill,alpha:1,duration:200,delay:si*60});
        } else if(si===stage){
          const fill=this.add.rectangle(sx,BAR_Y,sw*0.5,20,STAGE_COLS[si],0.15).setOrigin(0,0).setAlpha(0);
          this.tweens.add({targets:fill,alpha:1,duration:200});
          // termination marker
          const mark=this.add.rectangle(sx+sw*0.5,BAR_Y,2,20,0xff2244,0.9).setOrigin(0,0).setAlpha(0);
          this.tweens.add({targets:mark,alpha:1,duration:150,delay:100});
        }
        const stxt=this.add.text(sx+sw/2,BAR_Y+10,si===stage?`◈ ${sn}`:sn,{
          fontFamily:"'Courier New',monospace",fontSize:'9px',
          color:si<stage?STAGE_STRS[si]:si===stage?'#ff4466':'#1a3322'
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({targets:stxt,alpha:1,duration:150,delay:si*60});
      });
    });

    // ── Action buttons ──
    const ROLLBACK_COST=80;
    const canRollback=!rollbackUsed&&Save.shards()>=ROLLBACK_COST;
    const BTN_Y=H-46;

    this.time.delayedCall(1000,()=>{
      if(!this.scene.isActive('RunSummaryScene'))return;

      this.add.rectangle(W/2,H,W,80,0x000000,0.95).setOrigin(0.5,1);
      this.add.rectangle(W/2,H-80,W,1,accentNum,0.35).setOrigin(0.5,0);

      const btns=[
        {x:W*0.2,  w:270, label:'[ REINITIALISE ]',     sub:'new run — same mode',
         col:0x00ff44, colS:'#00ff44', bg:0x001500, active:true,
         fn:()=>{
            this.cameras.main.fadeOut(280,0,0,0);
            this.time.delayedCall(280,()=>{
              this.scene.stop('RunSummaryScene');
              let arcData={};
              try{arcData=JSON.parse(Save.get('last_run_archetype')||'{}');}catch{}
              this.scene.start('GameScene',{
                mode:D.mode,
                archetype:arcData.archetype||null,
                archetypeSeeds:arcData.archetypeSeeds||null,
                archetypePower:arcData.archetypePower||null,
              });
            });
          }},
        {x:W*0.5,  w:280, label:'[ ROLLBACK_PROCESS ]',
         sub:canRollback?`Cost: ${ROLLBACK_COST} ◈ — once per run`:'UNAVAILABLE',
         col:0x00ffcc, colS:'#00ffcc', bg:canRollback?0x001a1a:0x050505, active:canRollback,
         fn:()=>{if(!canRollback||!Save.spendShards(ROLLBACK_COST))return;this.cameras.main.fadeOut(300,0,0,0);this.time.delayedCall(300,()=>{this.scene.stop('RunSummaryScene');this.scene.start('GameScene',{mode:D.mode,debugWave:D.wave||1,debugUpgrades:D.upgrades||{},debugScore:D.score||0,rollbackUsed:true});});}},
        {x:W*0.8,  w:270, label:'[ RETURN_TO_TERMINAL ]', sub:'disconnect — main menu',
         col:0xff2244, colS:'#ff2244', bg:0x150000, active:true,
         fn:()=>{this.cameras.main.fadeOut(280,0,0,0);this.time.delayedCall(280,()=>{this.scene.stop('RunSummaryScene');try{this.scene.stop('GameScene');}catch{}const ms=this.scene.get('MenuScene');if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');else this.scene.start('MenuScene');});}},
      ];

      btns.forEach(b=>{
        const bg2=this.add.rectangle(b.x,BTN_Y,b.w,46,b.bg,0.97)
          .setStrokeStyle(2,b.col,b.active?0.8:0.2).setAlpha(0);
        if(b.active)bg2.setInteractive({useHandCursor:true});
        const accentBar=this.add.rectangle(b.x-b.w/2,BTN_Y-23,4,46,b.col,b.active?0.8:0.15).setOrigin(0,0).setAlpha(0);
        const lbl=this.add.text(b.x,BTN_Y-10,b.label,{
          fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',
          color:b.active?b.colS:'#333333'
        }).setOrigin(0.5).setAlpha(0);
        const sub=this.add.text(b.x,BTN_Y+10,b.sub,{
          fontFamily:"'Courier New',monospace",fontSize:'10px',
          color:b.active?'#447755':'#333333'
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({targets:[bg2,accentBar,lbl,sub],alpha:1,duration:200});
        if(b.active){
          bg2.on('pointerover',()=>{bg2.setFillStyle(b.col,0.18);lbl.setColor('#ffffff');});
          bg2.on('pointerout', ()=>{bg2.setFillStyle(b.bg,0.97);lbl.setColor(b.colS);});
          bg2.on('pointerdown',b.fn);
        }
        if(b.label.includes('REINITIALISE')){
          this.tweens.add({targets:lbl,alpha:{from:1,to:0.5},duration:600,yoyo:true,repeat:-1,delay:800});
        }
      });
    });
  }
}
