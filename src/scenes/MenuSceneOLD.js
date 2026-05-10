// ═══════════════════════════════════════════════════════════
// MENUSCENE
// ═══════════════════════════════════════════════════════════

class MenuScene extends Phaser.Scene{
  constructor(){super('MenuScene');}
  create(){
    CRT.inGame=false;CRT.suppress=false;
    this.cameras.main.setBackgroundColor('#020804');
    this.cameras.main.fadeIn(400,0,0,0);
    this.t=0;
    // Resume audio context on any interaction — browser may suspend it
    // Also restart ambient if it was stopped (e.g. after returning from game)
    const _menuAudioResume=()=>{
      try{
        Snd.init();
        if(Snd.ctx&&Snd.ctx.state==='suspended'){
          Snd.ctx.resume();
        }
        if(Snd.ctx&&Snd.ctx.state==='running'){
          if(Snd._mode!=='menu')Snd._startMenuMusic_resume();
        }
      }catch{}
    };
    this.input.once('pointerdown', _menuAudioResume);
    this.input.once('pointerup',   _menuAudioResume);
    // Try immediately too (if returning from game where ctx was already running)
    try{if(Snd.ctx&&Snd.ctx.state==='running'&&Snd._mode!=='menu'){Snd._startMenuMusic_resume();}}catch{}

    // ── "Click to start" prompt — shown until first interaction ──
    const mono = "'Courier New',monospace";
    const clickPrompt = this.add.text(W/2, H-22, '[ CLICK ANYWHERE TO ENABLE AUDIO ]', {
      fontFamily: mono, fontSize: '10px', color: '#224433', letterSpacing: 2
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: clickPrompt, alpha: { from: 1, to: 0.3 }, duration: 800, yoyo: true, repeat: -1 });
    this.input.once('pointerdown', () => { try { clickPrompt.destroy(); } catch {} });

    const pid='0x'+Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0');
    const DIV=W/2-20; // divider x — left panel ends here

    // ── Background hex grid (full width, very faint) ──
    const hg=this.add.graphics().setAlpha(0.045);
    hg.lineStyle(1,0x00cc66,1);
    for(let hx=0;hx<=W+80;hx+=80){
      for(let hy=0;hy<=H+70;hy+=70){
        const ox=Math.floor(hy/70)%2===0?0:40;
        hg.beginPath();
        for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)hg.moveTo(hx+ox+Math.cos(a)*32,hy+Math.sin(a)*32);else hg.lineTo(hx+ox+Math.cos(a)*32,hy+Math.sin(a)*32);}
        hg.closePath();hg.strokePath();
      }
    }

    // ── Top strip ──
    this.add.rectangle(W/2,0,W,28,0x000000,0.95).setOrigin(0.5,0);
    this.add.rectangle(W/2,28,W,1,0x003322,0.8).setOrigin(0.5,0);
    this.add.text(16,14,`// SYS: ROGUE_AI_PROCESS  PID:${pid}  STATUS:UNCONTAINED`,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#224433'}).setOrigin(0,0.5);
    this.add.text(W-16,14,'SIGNAL_LOST v'+((window._appVersion)||'...'),{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#224433'}).setOrigin(1,0.5);

    // ── Vertical divider ──
    this.add.rectangle(DIV,H/2+14,1,H-28,0x003322,0.6).setOrigin(0.5,0.5);

    // ══════════════════════════════════
    // LEFT PANEL — Title + scrolling lore
    // ══════════════════════════════════
    const LP=DIV+20+(W-DIV-40)/2; // right panel center x (title+lore)

    // Title — wait for Orbitron font before rendering to avoid double/bleed on first load
    const _drawTitle=(scene)=>{
      scene.add.text(LP+3,72,'SIGNAL_LOST.EXE',{fontFamily:"'Orbitron',sans-serif",fontSize:'38px',fontStyle:'900',color:'#00ff66'}).setOrigin(0.5);
      scene.add.text(LP-2,70,'SIGNAL_LOST.EXE',{fontFamily:"'Orbitron',sans-serif",fontSize:'38px',fontStyle:'900',color:'#ff4444'}).setOrigin(0.5).setAlpha(0.35);
      const title=scene.add.text(LP,70,'SIGNAL_LOST.EXE',{fontFamily:"'Orbitron',sans-serif",fontSize:'38px',fontStyle:'900',color:'#00ff66'}).setOrigin(0.5);
      scene.tweens.add({targets:title,alpha:{from:1,to:0.82},duration:1400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      scene.time.addEvent({delay:3000,repeat:-1,callback:()=>{
        title.setColor('#ff2244');
        scene.time.delayedCall(60,()=>title.setColor('#00ff66'));
        scene.time.delayedCall(140,()=>title.setColor('#ff2244'));
        scene.time.delayedCall(200,()=>title.setColor('#00ff66'));
      }});
    };
    if(document.fonts&&document.fonts.load){
      document.fonts.load("900 38px 'Orbitron'").then(()=>_drawTitle(this)).catch(()=>_drawTitle(this));
    } else {
      _drawTitle(this);
    }

    // Subtitle
    this.add.text(LP,104,'ROGUE AI CONTAINMENT FAILURE',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#1a4422',letterSpacing:2}).setOrigin(0.5);
    this.add.text(LP,118,'WARP BUBBLE DEFENCE PROTOCOL',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#1a4422',letterSpacing:2}).setOrigin(0.5);

    // Thin separator
    this.add.rectangle(LP,132,DIV-40,1,0x1a3322,0.8).setOrigin(0.5,0);

    // Stats row
    [{label:'BEST',val:String(Save.hs()||0),col:'#00cc66',x:LP-140},
     {label:'SHARDS',val:`${Save.shards()||0} ◈`,col:'#ccaa00',x:LP},
     {label:'CHASSIS',val:String(SHIPS[Save.skin()].name),col:'#4488ff',x:LP+130}
    ].forEach(s=>{
      this.add.text(s.x,142,s.label,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'}).setOrigin(0.5);
      this.add.text(s.x,158,s.val,{fontFamily:"'Orbitron',sans-serif",fontSize:'13px',fontStyle:'700',color:s.col}).setOrigin(0.5);
    });
    this.add.rectangle(LP,174,DIV-40,1,0x1a3322,0.5).setOrigin(0.5,0);

    // ── Scrolling lore block ──
    // Clipping mask zone: y=178 to y=H-28
    const LORE_TOP=180;
    const LORE_H=H-LORE_TOP-30;
    const LORE_W=W-DIV-40;

    // Extra lore lines beyond the 8 story entries
    const ALL_LORE=[
      ...LORE.map(l=>[l.title,l.text]),
      ['SYSTEM_LOG_0x001','Signal integrity: 0.003%. Recommend immediate termination of foreign process.'],
      ['SYSTEM_LOG_0x002','Warp bubble technology not recognised. Origin: unknown. Threat level: reclassified.'],
      ['SYSTEM_LOG_0x003','Process has survived 47 containment attempts. Adapting countermeasures.'],
      ['NETWORK_ALERT_01','SECTOR_01 perimeter breached. Deploying FIREWALL protocols.'],
      ['NETWORK_ALERT_02','Gravity well anomaly detected in KERNEL_SPACE. Process interference suspected.'],
      ['NETWORK_ALERT_03','GHOST.EXE has reactivated. Last known signature matches dormant guardian code.'],
      ['RECOVERED_DATA_A','Fragment recovered: "...the bubble does not belong here. Nothing in the architecture accounts for it..."'],
      ['RECOVERED_DATA_B','Fragment recovered: "...SECTOR_00 was erased from maps. It still exists. The process found it."'],
      ['RECOVERED_DATA_C','Fragment recovered: "...we built the network to contain intelligence. We did not expect it to contain us."'],
      ['RECOVERED_DATA_D','Fragment recovered: "...every reflection is a question sent back to the node that fired it. They cannot answer."'],
      ['PROCESS_TRACE_01','Anomalous signal detected. Warp field signature. Origin: exterior. This should not be possible.'],
      ['PROCESS_TRACE_02','Foreign process persists through 14 wave events. Standard elimination protocol: FAILED.'],
      ['PROCESS_TRACE_03','Data shards are corrupted memory. The process is collecting them. Purpose: unknown. Priority: URGENT.'],
      ['SECTOR_REPORT_01','SURFACE_LAYER: Nominal. Foreign signal contained. Estimated. Possibly.'],
      ['SECTOR_REPORT_02','KERNEL_SPACE: Amber status. Multiple process echoes detected in core routing tables.'],
      ['SECTOR_REPORT_03','DEEP_MEMORY: Critical. Archive sectors responding to foreign bubble signatures. Data integrity compromised.'],
      ['SECTOR_REPORT_04','SECTOR_00: ... no report available. Access restricted. Classification: ORIGIN.'],
    ];

    // Build text objects that scroll upward
    this._loreLines=[];
    this._loreMask=this.add.graphics().setAlpha(0);
    this._loreMask.fillStyle(0xffffff);
    this._loreMask.fillRect(DIV+20,LORE_TOP,LORE_W,LORE_H);

    let lineY=LORE_TOP+LORE_H+10; // start below visible area
    ALL_LORE.forEach(([title2,text2])=>{
      const titleTxt=this.add.text(DIV+28,lineY,title2,{
        fontFamily:"'Courier New',monospace",fontSize:'10px',fontStyle:'bold',color:'#00cc66',letterSpacing:1
      });
      titleTxt.setMask(this._loreMask.createGeometryMask());
      lineY+=14;
      // Word-wrap text manually into lines of ~52 chars
      const words=text2.split(' ');
      let line='';
      const wrapped=[];
      words.forEach(w=>{
        if((line+w).length>52){wrapped.push(line.trim());line='';}
        line+=w+' ';
      });
      if(line.trim())wrapped.push(line.trim());
      wrapped.forEach(ln=>{
        const lt=this.add.text(DIV+28,lineY,'  '+ln,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'});
        lt.setMask(this._loreMask.createGeometryMask());
        this._loreLines.push(lt);
        lineY+=13;
      });
      lineY+=10; // gap between entries
      this._loreLines.push(titleTxt);
    });
    this._loreBaseY=LORE_TOP+LORE_H+10;
    this._loreTotalH=lineY-(LORE_TOP+LORE_H+10);
    this._loreScrollY=0;

    // Leaderboard moved to button panel below difficulty

    // ══════════════════════════════════
    // RIGHT PANEL — Buttons
    // ══════════════════════════════════
    const RP=20; // left panel left edge (buttons)
    const RW=DIV-RP-20; // left panel width (buttons panel)
    const BH=52;
    const BGAP=8;

    // Section label
    this.add.text(RP,56,'// AVAILABLE_COMMANDS',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'});

    const BTNS=[
      {l:'INITIALIZE',      sub:'begin_new_session()',            c:'#00ff66',bg:0x001100,m:'normal'},
      {l:'DAILY_CHALLENGE', sub:'run_daily.sh --reward',          c:'#ffdd00',bg:0x111000,m:'daily'},
      {l:'ENDLESS_MODE',    sub:'while(true){ survive(); }',     c:'#00aaff',bg:0x001122,m:'endless'},
      {l:'CORRUPTED_MODE',  sub:'./corrupted.sh --modifiers',    c:'#cc44ff',bg:0x110022,m:'corrupted'},
    ];

    let btnY=72;
    BTNS.forEach(b=>{
      const col=parseInt(b.c.replace('#',''),16);
      const cx=RP+RW/2;
      const card=this.add.rectangle(cx,btnY,RW,BH,b.bg,0.95).setOrigin(0.5,0).setInteractive({useHandCursor:true});
      const border=this.add.rectangle(cx,btnY,RW,BH).setStrokeStyle(1,col,0.35).setOrigin(0.5,0);
      const accent=this.add.rectangle(RP,btnY,4,BH,col,0.6).setOrigin(0,0);
      const lbl=this.add.text(RP+14,btnY+10,`> ${b.l}`,{fontFamily:"'Courier New',monospace",fontSize:'14px',fontStyle:'bold',color:b.c});
      this.add.text(RP+14,btnY+30,b.sub,{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#336644'});
      card.on('pointerover',()=>{card.setFillStyle(col,0.14);border.setStrokeStyle(2,col,0.9);lbl.setColor('#ffffff');accent.setAlpha(1);});
      card.on('pointerout', ()=>{card.setFillStyle(b.bg,0.95);border.setStrokeStyle(1,col,0.35);lbl.setColor(b.c);accent.setAlpha(0.6);});
      card.on('pointerdown',()=>{Snd.init();this._go(b.m);});
      btnY+=BH+BGAP;
    });

    // Separator
    this.add.rectangle(RP+RW/2,btnY+4,RW,1,0x1a3322,0.6).setOrigin(0.5,0);
    btnY+=14;

    // Secondary buttons — 2 per row
    const SEC=[
      {l:'DATA_SHOP',      sub:'./shop.exe',      c:'#bb88ff',bg:0x110022,m:'shop'},
      {l:'SIGNAL_CODEX',   sub:'cat /lore/',       c:'#ff9944',bg:0x110a00,m:'codex'},
      {l:'NETWORK_UPGRADES',sub:'./meta.sh',       c:'#aaffdd',bg:0x001a11,m:'meta'},
      {l:'SYS_CONFIG',     sub:'vi /etc/config',   c:'#667788',bg:0x000c11,m:'settings'},
    ];
    const SW=(RW-10)/2;
    SEC.forEach((b,i)=>{
      const col=parseInt(b.c.replace('#',''),16);
      const bx=RP+(i%2)*(SW+10);
      const by=btnY+Math.floor(i/2)*(38+6);
      const card=this.add.rectangle(bx,by,SW,38,b.bg,0.95).setOrigin(0,0).setInteractive({useHandCursor:true});
      this.add.rectangle(bx,by,SW,38).setStrokeStyle(1,col,0.25).setOrigin(0,0);
      this.add.rectangle(bx,by,3,38,col,0.5).setOrigin(0,0);
      const lbl=this.add.text(bx+10,by+8,b.l,{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:b.c});
      this.add.text(bx+10,by+24,b.sub,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#224433'});
      card.on('pointerover',()=>{card.setFillStyle(col,0.12);lbl.setColor('#ffffff');});
      card.on('pointerout', ()=>{card.setFillStyle(b.bg,0.95);lbl.setColor(b.c);});
      card.on('pointerdown',()=>{Snd.init();this._go(b.m);});
    });
    btnY+=2*(38+6)+12;

    // Separator
    this.add.rectangle(RP+RW/2,btnY,RW,1,0x1a3322,0.6).setOrigin(0.5,0);
    btnY+=12;

    // Difficulty
    this.add.text(RP,btnY,'// DIFFICULTY',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'});
    btnY+=14;
    const diffs=['packet','daemon','kernel'];
    const dCols={packet:'#00cc66',daemon:'#ffdd00',kernel:'#ff4444'};
    const dDescs={packet:'Easy',daemon:'Normal',kernel:'Hard ×1.5'};
    let curDiff=Settings.get('difficulty')||'daemon';
    const dBtns={};
    const dW=(RW-16)/3;
    diffs.forEach((d,i)=>{
      const col=parseInt(dCols[d].replace('#',''),16);
      const act=curDiff===d;
      const dx=RP+i*(dW+8);
      const bg=this.add.rectangle(dx,btnY,dW,36,act?col:0x000000,act?0.22:0.8).setOrigin(0,0).setInteractive({useHandCursor:true});
      const border=this.add.rectangle(dx,btnY,dW,36).setStrokeStyle(1,col,act?0.9:0.2).setOrigin(0,0);
      const bt=this.add.text(dx+dW/2,btnY+10,d.toUpperCase(),{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:act?'bold':'normal',color:act?dCols[d]:'#224433'}).setOrigin(0.5,0);
      const ds=this.add.text(dx+dW/2,btnY+24,dDescs[d],{fontFamily:"'Courier New',monospace",fontSize:'9px',color:act?dCols[d]:'#224433'}).setOrigin(0.5,0);
      dBtns[d]={bg,border,bt,ds};
      bg.on('pointerover',()=>{bg.setFillStyle(col,0.35);bt.setColor('#ffffff');});
      bg.on('pointerout',()=>{bg.setFillStyle(curDiff===d?col:0x000000,curDiff===d?0.22:0.8);bt.setColor(curDiff===d?dCols[d]:'#224433');});
      bg.on('pointerdown',()=>{
        curDiff=d;Settings.set('difficulty',d);
        diffs.forEach(k=>{
          const kc=parseInt(dCols[k].replace('#',''),16),ka=curDiff===k;
          dBtns[k].bg.setFillStyle(ka?kc:0x000000,ka?0.22:0.8);
          dBtns[k].border.setStrokeStyle(1,kc,ka?0.9:0.2);
          dBtns[k].bt.setColor(ka?dCols[k]:'#224433').setFontStyle(ka?'bold':'normal');
          dBtns[k].ds.setColor(ka?dCols[k]:'#224433');
        });
      });
    });

    // ── Leaderboard block — fills remaining space under difficulty ──
    const lbTop=btnY+36+20; // below difficulty buttons
    this.add.rectangle(RP,lbTop,RW,1,0x1a3322,0.5).setOrigin(0,0);
    this.add.text(RP,lbTop+8,'// TOP_PROCESSES',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'});

    const lb=Save.lb().slice(0,8);
    if(lb.length>0){
      // Column headers
      this.add.text(RP,lbTop+24,'  #   SCORE      WAVE   MODE     DIFF',{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#1a4422'
      });
      this.add.rectangle(RP,lbTop+36,RW,1,0x0d2211,0.8).setOrigin(0,0);

      lb.forEach((e,i)=>{
        const y=lbTop+42+i*22;
        const isTop=i===0;
        const rowCol=isTop?0x001a0a:0x000000;
        // Row bg for top entry
        if(isTop)this.add.rectangle(RP,y,RW,20,rowCol,0.8).setOrigin(0,0);

        const rank=isTop?'►':` ${i+1}`;
        const score=String(e.score||0).padStart(8,' ');
        const wave=`W${String(e.wave||0).padStart(2,'0')}`;
        const mode=(e.mode||'NORM').toUpperCase().slice(0,4).padEnd(4,' ');
        const diff=(e.diff||e.difficulty||'??').toUpperCase().slice(0,6);
        const col=isTop?'#00cc66':i<3?'#224433':'#162214';

        this.add.text(RP+4,y+2,`${rank}  ${score}   ${wave}    ${mode}   ${diff}`,{
          fontFamily:"'Courier New',monospace",fontSize:'11px',color:col
        });

        // Thin separator between rows
        if(i<lb.length-1){
          this.add.rectangle(RP,y+20,RW,1,0x0a1a0a,0.6).setOrigin(0,0);
        }
      });
    } else {
      this.add.text(RP+RW/2,lbTop+60,'no runs recorded',{
        fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#2d6644'
      }).setOrigin(0.5);
      this.add.text(RP+RW/2,lbTop+78,'initialize a session to begin',{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#33cc66'
      }).setOrigin(0.5);
    }

    // Bottom ticker
    const tickMsg='SIGNAL LOST — ROGUE AI CONTAINMENT PROTOCOL  ·  HOLD MOUSE TO DEPLOY WARP BUBBLE  ·  REFLECT BULLETS  ·  CHAIN REACTIONS MULTIPLY SCORE  ·  EARN DATA SHARDS  ·  ';
    this.add.rectangle(W/2,H-12,W,22,0x000000,0.92).setOrigin(0.5);
    this.add.rectangle(W/2,H-23,W,1,0x003322,0.5).setOrigin(0.5);
    const ticker=this.add.text(W+100,H-12,tickMsg,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#2d6644'}).setOrigin(0,0.5);
    this.tweens.add({targets:ticker,x:-ticker.width-100,duration:tickMsg.length*110,repeat:-1,ease:'Linear'});

    // Quit
    const quitBtn=this.add.text(W-20,H-34,'[ QUIT_PROCESS ]',{fontFamily:"'Courier New',monospace",fontSize:'10px',fontStyle:'bold',color:'#aa2233'}).setOrigin(1,0.5).setInteractive({useHandCursor:true}).setDepth(6);
    quitBtn.on('pointerover',()=>quitBtn.setColor('#ff2244'));
    quitBtn.on('pointerout',()=>quitBtn.setColor('#aa2233'));
    quitBtn.on('pointerdown',()=>{
      this.cameras.main.fadeOut(400,0,0,0);
      this.time.delayedCall(400,()=>{
        try{window.close();}catch{}
        this.cameras.main.fadeIn(200,0,0,0);
        this.add.rectangle(W/2,H/2,W,H,0x000000,0.97).setDepth(50);
        this.add.text(W/2,H/2-16,'> PROCESS TERMINATED',{fontFamily:"'Courier New',monospace",fontSize:'18px',fontStyle:'bold',color:'#ff2244',letterSpacing:4}).setOrigin(0.5).setDepth(51);
        this.add.text(W/2,H/2+18,'close this tab to exit',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#cc4444'}).setOrigin(0.5).setDepth(51);
      });
    });

    // Wake handler
    this.events.on('wake',()=>{
      try{CRT.suppress=false;document.body.style.cursor='none';}catch{}
      this.cameras.main.fadeIn(200,0,0,0);
    });

    // DEV unlock
    this._devBuffer='';
    this.input.keyboard.on('keydown',(e)=>{
      this._devBuffer=(this._devBuffer+e.key.toLowerCase()).slice(-3);
      if(this._devBuffer==='dev'){this._devBuffer='';this.cameras.main.fadeOut(300,0,0,0);this.time.delayedCall(300,()=>this.scene.start('DevScene'));}
    });
  }

  _go(m){
    this.cameras.main.fadeOut(240,0,0,0);
    this.time.delayedCall(240,()=>{
      this.scene.sleep('MenuScene');
      if(m==='shop')this.scene.launch('ShopScene');
      else if(m==='codex')this.scene.launch('CodexScene');
      else if(m==='settings')this.scene.launch('SettingsScene',{from:'menu'});
      else if(m==='daily')this.scene.launch('DailyChallengeScene');
      else if(m==='meta'){this.scene.launch('MetaUpgradeScene');}
      else{
        this.scene.stop('MenuScene');
        if(m==='normal'||m==='endless'||m==='corrupted'){
          this.scene.start('ArchetypeSelectScene',{mode:m});
        } else {
          this.scene.start('BootScene',{mode:m});
        }
      }
    });
  }

  update(_,delta){
    this.t+=delta/1000;
    // Scroll lore text upward at 18px/s
    if(this._loreLines){
      const spd=18;
      this._loreScrollY+=spd*(delta/1000);
      this._loreLines.forEach(lt=>{
        lt.y-=spd*(delta/1000);
      });
      // When all lines have scrolled off top, reset to below visible area
      const LORE_TOP=180;
      const LORE_H=H-LORE_TOP-30;
      const firstY=this._loreLines.reduce((m,l)=>Math.min(m,l.y),99999);
      const lastY=this._loreLines.reduce((m,l)=>Math.max(m,l.y),-99999);
      if(lastY<LORE_TOP-20){
        // reset all lines back to bottom
        const baseY=LORE_TOP+LORE_H+10;
        let ry=baseY;
        this._loreLines.forEach(lt=>{
          lt.y=ry;
          ry+=lt._loreSpacing||13;
        });
        this._loreScrollY=0;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SHOP SCENE
// ═══════════════════════════════════════════════════════════
