// ═══════════════════════════════════════════════════════════
// SHOPSCENE
// ═══════════════════════════════════════════════════════════

class ShopScene extends Phaser.Scene{
  constructor(){super('ShopScene');}
  create(){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(260,0,0,0);
    this.t=0;
    this._tab='chassis';
    this._tabObjs={chassis:[],bubble:[],survival:[],combat:[],powers:[]};
    this._previewGraphics=[];

    // Background grid
    const bg=this.add.graphics().setAlpha(0.05);
    bg.lineStyle(1,0x00cc66,1);
    for(let x=0;x<=W;x+=80){bg.moveTo(x,0);bg.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){bg.moveTo(0,y);bg.lineTo(W,y);}
    bg.strokePath();

    // ── Header ──
    this.add.rectangle(W/2,0,W,36,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,36,W,1,0xffaa00,0.5).setOrigin(0.5,0);
    this.add.text(W/2,17,'DATA_SHOP.EXE',{fontFamily:"'Orbitron',sans-serif",fontSize:'15px',fontStyle:'900',color:'#ffaa00',letterSpacing:5}).setOrigin(0.5);
    this.add.text(20,17,'// PERMANENT UPGRADES',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'}).setOrigin(0,0.5);
    this.shardsT=this.add.text(W-20,17,`◈ ${Save.shards()} SHARDS`,{fontFamily:"'Courier New',monospace",fontSize:'14px',fontStyle:'bold',color:'#ffdd00'}).setOrigin(1,0.5);

    // ── Left panel ──
    const LP=200;
    this.add.rectangle(LP,H/2+18,1,H-36,0x332200,0.5).setOrigin(0.5,0.5);

    // Wallet block
    this.add.text(LP/2,54,'// WALLET',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'}).setOrigin(0.5);
    this._walletNum=this.add.text(LP/2,86,String(Save.shards()),{fontFamily:"'Orbitron',sans-serif",fontSize:'28px',fontStyle:'900',color:'#ffdd00'}).setOrigin(0.5);
    this.add.text(LP/2,110,'SHARDS',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'}).setOrigin(0.5);
    this.add.rectangle(LP/2,122,LP-20,1,0x221100,0.8).setOrigin(0.5);

    // Category buttons
    this.add.text(LP/2,134,'// CATEGORY',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'}).setOrigin(0.5);
    const CATS=[
      {id:'chassis',  label:'CHASSIS',  sub:'skins & ships',    col:'#00ff66', colN:0x00ff66},
      {id:'bubble',   label:'BUBBLE',   sub:'reflect & expand', col:'#00aaff', colN:0x00aaff},
      {id:'survival', label:'SURVIVAL', sub:'heat & shield',    col:'#ff4444', colN:0xff4444},
      {id:'combat',   label:'COMBAT',   sub:'chain & score',    col:'#ffdd00', colN:0xffdd00},
      {id:'powers',   label:'POWERS',   sub:'active ability',   col:'#ff8800', colN:0xff8800},
    ];
    this._catBtns={};
    CATS.forEach((c,i)=>{
      const by=150+i*56;
      const act=this._tab===c.id;
      const cbg=this.add.rectangle(LP/2,by,LP-16,44,act?c.colN:0x000000,act?0.18:0.8).setInteractive({useHandCursor:!act});
      const cbdr=this.add.rectangle(LP/2,by,LP-16,44).setStrokeStyle(act?2:1,c.colN,act?0.9:0.2);
      const cbar=this.add.rectangle(12,by,3,44,c.colN,act?0.9:0.25).setOrigin(0,0.5);
      const clbl=this.add.text(LP/2-4,by-6,c.label,{fontFamily:"'Courier New',monospace",fontSize:'12px',fontStyle:act?'bold':'normal',color:act?c.col:'#443300'}).setOrigin(0.5);
      const csub=this.add.text(LP/2-4,by+8,c.sub,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:act?c.col:'#332200'}).setOrigin(0.5);
      this._catBtns[c.id]={bg:cbg,border:cbdr,bar:cbar,lbl:clbl,sub:csub,col:c.col,colN:c.colN};
      cbg.on('pointerover',()=>{if(this._tab!==c.id){cbg.setFillStyle(c.colN,0.1);clbl.setColor('#ffffff');}});
      cbg.on('pointerout', ()=>{if(this._tab!==c.id){cbg.setFillStyle(0x000000,0.8);clbl.setColor('#443300');}});
      cbg.on('pointerdown',()=>{if(this._tab!==c.id)this._switchTab(c.id);});
    });

    // Status message
    this._msgTxt=this.add.text(LP/2,H-60,'',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#ff4444',wordWrap:{width:LP-16},align:'center'}).setOrigin(0.5).setDepth(10);

    // Back button
    this.add.rectangle(LP/2,H-22,LP-16,30,0x000000,0.96).setOrigin(0.5).setStrokeStyle(1,0x332200,0.6);
    const bk=this.add.text(LP/2,H-22,'[ BACK ]',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:'#886633'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    bk.on('pointerover',()=>bk.setColor('#ffaa00'));
    bk.on('pointerout', ()=>bk.setColor('#443300'));
    bk.on('pointerdown',()=>{
      this.cameras.main.fadeOut(240,0,0,0);
      this.time.delayedCall(240,()=>{
        this.scene.stop();
        const ms=this.scene.get('MenuScene');
        if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
      });
    });

    // Header for right panel
    this.add.text(LP+20,46,'// AVAILABLE_MODULES',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'});

    this._buildChassis();
  }

  _switchTab(id){
    // Remove wheel listeners from scroll containers
    (this._tabObjs[this._tab]||[]).forEach(o=>{
      try{if(o&&o._wheelFn)this.input.off('wheel',o._wheelFn);}catch{}
      try{o&&o.destroy();}catch{}
    });
    this._tabObjs[this._tab]=[];
    this._previewGraphics.forEach(g2=>{try{g2.destroy();}catch{}});
    this._previewGraphics=[];
    Object.values(SHIPS).forEach(s=>{s._previewGfx=null;s._previewX=null;s._previewY=null;});

    this._tab=id;
    Object.entries(this._catBtns).forEach(([tid,tb])=>{
      const act=tid===id;
      tb.bg.setFillStyle(act?tb.colN:0x000000,act?0.18:0.8);
      tb.border.setStrokeStyle(act?2:1,tb.colN,act?0.9:0.2);
      tb.bar.setAlpha(act?0.9:0.25);
      tb.lbl.setColor(act?tb.col:'#443300').setFontStyle(act?'bold':'normal');
      tb.sub.setColor(act?tb.col:'#332200');
      tb.bg.setInteractive({useHandCursor:!act});
    });
    this._walletNum.setText(String(Save.shards()));

    if(id==='chassis')this._buildChassis();
    else if(id==='bubble')this._buildBubble();
    else if(id==='survival')this._buildSurvival();
    else if(id==='combat')this._buildCombat();
    else if(id==='powers')this._buildPowers();
  }

  _reg(tab,obj){
    if(!this._tabObjs[tab])this._tabObjs[tab]=[];
    this._tabObjs[tab].push(obj);
    return obj;
  }

  _makeScrollPane(tab,contentHeight){
    // Creates a scrollable pane for the right panel
    const RP=200,CLIP_TOP=58,CLIP_BOT=H-36;
    const viewH=CLIP_BOT-CLIP_TOP;
    const container=this.add.container(0,0);
    this._reg(tab,container);

    // Clip mask
    const maskGfx=this.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(RP,CLIP_TOP,W-RP-20,viewH);
    const mask=maskGfx.createGeometryMask();
    maskGfx.setAlpha(0);
    container.setMask(mask);
    this._reg(tab,maskGfx);

    // Scroll state
    container._scrollY=0;
    container._maxScroll=Math.max(0,contentHeight-viewH+10);

    // Mouse wheel scroll
    const wheelFn=(pointer,gameObjects,deltaX,deltaY,deltaZ)=>{
      container._scrollY=Phaser.Math.Clamp(container._scrollY+deltaY*0.8,0,container._maxScroll);
      container.y=-container._scrollY;
    };
    this.input.on('wheel',wheelFn);
    // Store to remove later
    container._wheelFn=wheelFn;

    // Scrollbar track
    if(contentHeight>viewH){
      const sbTrack=this.add.rectangle(W-8,CLIP_TOP+viewH/2,4,viewH,0x221100,0.5).setOrigin(0.5);
      this._reg(tab,sbTrack);
      // Scrollbar thumb — updated each frame via update
      const thumbH=Math.max(30,viewH*(viewH/contentHeight));
      const sbThumb=this.add.rectangle(W-8,CLIP_TOP+thumbH/2,4,thumbH,0xffaa00,0.5).setOrigin(0.5);
      this._reg(tab,sbThumb);
      container._sbThumb=sbThumb;
      container._sbTrackTop=CLIP_TOP;
      container._sbViewH=viewH;
      container._sbThumbH=thumbH;
    }

    return container;
  }

  _rowBase(tab,y,RH,col,colN){
    // Full-width row for right panel
    const RP=200, RW=W-RP-20;
    const row=this._reg(tab,this.add.rectangle(RP+RW/2,y,RW,RH,0x050200,0.97).setOrigin(0.5,0));
    this._reg(tab,this.add.rectangle(RP,y,RW,RH).setStrokeStyle(1,colN,0.35).setOrigin(0,0));
    this._reg(tab,this.add.rectangle(RP,y,4,RH,colN,0.7).setOrigin(0,0));
    this._reg(tab,this.add.rectangle(RP,y,RW,3,colN,0.5).setOrigin(0,0));
    return row;
  }

  _buildChassis(){
    const RP=200, RW=W-RP-20;
    const RH=84, GAP=8;
    const ships=Object.values(SHIPS);

    ships.forEach((s,i)=>{
      const y=58+i*(RH+GAP);
      const owned=Save.isOwned(s.id)||s.cost===0;
      const active=Save.skin()===s.id;
      const shipHex=s.color;
      const shipS='#'+shipHex.toString(16).padStart(6,'0');
      const col=active?shipS:owned?shipS:'#667777';
      const colN=active?shipHex:owned?shipHex:0x446655;

      const row=this._rowBase('chassis',y,RH,col,colN);
      row.setInteractive({useHandCursor:!active});

      // Preview circle
      const previewX=RP+50,previewY=y+RH/2;
      this._reg('chassis',this.add.rectangle(previewX,previewY,72,72,0x001100,0.5));
      this._reg('chassis',this.add.rectangle(previewX,previewY,72,72).setStrokeStyle(1,colN,0.3));
      s._previewX=previewX; s._previewY=previewY;

      // Name + passive
      this._reg('chassis',this.add.text(RP+96,y+10,s.name,{fontFamily:"'Courier New',monospace",fontSize:'15px',fontStyle:'bold',color:col}));
      const passiveName=s.passiveName||'PASSIVE';
      this._reg('chassis',this.add.text(RP+96,y+32,'PASSIVE: ',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#886633'}));
      this._reg('chassis',this.add.text(RP+150,y+32,passiveName,{fontFamily:"'Courier New',monospace",fontSize:'10px',fontStyle:'bold',color:col}));
      this._reg('chassis',this.add.text(RP+96,y+48,s.desc||'',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#997755',wordWrap:{width:RW-380}}));

      // Status badge right
      const bLabel=active?'[ ACTIVE ]':owned?'[ EQUIP ]':`[ ${s.cost} ◈ ]`;
      const bCol=active?'#00ff66':owned?'#00cc44':'#ccaa00';
      const bbg=this._reg('chassis',this.add.rectangle(RP+RW-70,y+RH/2,120,34,active?0x001a00:owned?0x001a00:0x0a0a0a,0.95).setStrokeStyle(1.5,colN,active?0.9:owned?0.7:0.5));
      const btn=this._reg('chassis',this.add.text(RP+RW-70,y+RH/2,bLabel,{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:bCol}).setOrigin(0.5));

      if(!active){
        row.on('pointerover',()=>{row.setFillStyle(colN,0.10);btn.setColor('#ffffff');});
        row.on('pointerout', ()=>{row.setFillStyle(0x050200,0.97);btn.setColor(bCol);});
        row.on('pointerdown',()=>{
          if(owned){Save.setSkin(s.id);this._vfxEquip(RP+RW/2+200,y+RH/2,colN,s.name);}
          else if(Save.spendShards(s.cost)){Save.own(s.id);Save.setSkin(s.id);this._vfxEquip(RP+RW/2+200,y+RH/2,colN,s.name);}
          else this._msg('NEED '+s.cost+' ◈');
        });
      }
    });
    this._startPreviews();
  }

  _startPreviews(){
    this._previewT=0;
    Object.values(SHIPS).forEach(s=>{
      if(!s._previewX)return;
      const g2=this.add.graphics().setDepth(5);
      this._previewGraphics.push(g2);
      this._reg('chassis',g2);
      s._previewGfx=g2;
    });
  }

  _buildBubble(){
    const RP=200, RW=W-RP-20, RH=84, GAP=8;
    const mono="'Courier New',monospace";
    const META=[
      {id:'overclock_chip',name:'OVERCLOCK_CHIP',cost:700,col:'#ff8800',desc:'Bubble expands 25% faster permanently'},
      {id:'signal_amp',name:'SIGNAL_AMPLIFIER',cost:600,col:'#00ffcc',desc:'Reflected bullets deal 1.5x damage'},
      {id:'kernel_access',name:'KERNEL_ACCESS',cost:800,col:'#00ff66',desc:'Surge meter fills 50% faster'},
      {id:'data_compress',name:'DATA_COMPRESSION',cost:300,col:'#ffdd00',desc:'Start each run with 1 random free upgrade'},
    ];
    const totalH=META.length*(RH+GAP)+20;
    const sc=this._makeScrollPane('bubble',totalH);
    META.forEach((m,i)=>{
      const y=58+i*(RH+GAP);
      const owned=Save.meta(m.id,false);
      const col=parseInt(m.col.replace('#',''),16);
      const rowBg =this.add.rectangle(RP+RW/2,y,RW,RH,0x050200,0.97).setOrigin(0.5,0);
      const rowBdr=this.add.rectangle(RP,y,RW,RH).setStrokeStyle(1,col,owned?0.25:0.35).setOrigin(0,0);
      const rowBar=this.add.rectangle(RP,y,4,RH,col,owned?0.4:0.7).setOrigin(0,0);
      const rowTop=this.add.rectangle(RP,y,RW,3,col,owned?0.3:0.5).setOrigin(0,0);
      const nameTxt=this.add.text(RP+18,y+18,m.name,{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:owned?'#336644':m.col});
      const descTxt=this.add.text(RP+18,y+42,m.desc,{fontFamily:mono,fontSize:'11px',color:owned?'#445533':'#997755'});
      const costStr=owned?'✓ INSTALLED':`◈ ${m.cost}`;
      const costCol=owned?'#44aa77':'#ffdd00';
      const btnBg=this.add.rectangle(RP+RW-70,y+RH/2,120,34,owned?0x001a00:0x0a0a0a,0.95).setOrigin(0.5).setStrokeStyle(1.5,col,owned?0.4:0.7);
      const btnTxt=this.add.text(RP+RW-70,y+RH/2,costStr,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:costCol}).setOrigin(0.5);
      sc.add([rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt]);
      [rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt].forEach(o=>this._reg('bubble',o));
      if(!owned){
        rowBg.setInteractive({useHandCursor:true});
        rowBg.on('pointerover',()=>{rowBg.setFillStyle(col,0.10);btnTxt.setColor('#ffffff');});
        rowBg.on('pointerout', ()=>{rowBg.setFillStyle(0x050200,0.97);btnTxt.setColor(costCol);});
        rowBg.on('pointerdown',()=>{
          if(Save.spendShards(m.cost)){
            Save.setMeta(m.id,true);
            this._msg(`${m.name} INSTALLED`);
            this._walletNum&&this._walletNum.setText(String(Save.shards()));
            this.time.delayedCall(600,()=>this._switchTab('bubble'));
          } else {
            this._msg('INSUFFICIENT SHARDS');
          }
        });
      }
    });
  }

  _buildSurvival(){
    const RP=200, RW=W-RP-20, RH=84, GAP=8;
    const mono="'Courier New',monospace";
    const META=[
      {id:'firewall_seed',name:'FIREWALL_SEED',cost:500,col:'#00aaff',desc:'Start with shield layer active (2 hits)'},
      {id:'redundant_path',name:'REDUNDANT_PATH',cost:900,col:'#aa00ff',desc:'One free process recovery on death'},
      {id:'redundant_buf',name:'REDUNDANT_BUFFER',cost:400,col:'#00aaff',desc:'+1 shield hit on top of current tier'},
      {id:'heat_sink',name:'HEAT_SINK',cost:350,col:'#ff4400',desc:'Overheat threshold +3 reflections permanently'},
      {id:'ghost_protocol',name:'GHOST_PROTOCOL',cost:900,col:'#aaaaff',desc:'1s invisibility after overheat'},
      {id:'cooldown_patch',name:'COOLDOWN_PATCH',cost:450,col:'#00ff88',desc:'Overheat lockout 3s to 1.8s'},
      {id:'regen_patch',name:'REGEN_PATCH',cost:600,col:'#00ff88',desc:'Restore 1 shield hit per wave clear'},
      {id:'dash_patch',name:'DASH_PATCH',cost:400,col:'#00ff88',desc:'Dash cooldown 1.2s to 0.8s permanently'},
    ];
    const totalH=META.length*(RH+GAP)+20;
    const sc=this._makeScrollPane('survival',totalH);
    META.forEach((m,i)=>{
      const y=58+i*(RH+GAP);
      const owned=Save.meta(m.id,false);
      const col=parseInt(m.col.replace('#',''),16);
      const rowBg =this.add.rectangle(RP+RW/2,y,RW,RH,0x050200,0.97).setOrigin(0.5,0);
      const rowBdr=this.add.rectangle(RP,y,RW,RH).setStrokeStyle(1,col,owned?0.25:0.35).setOrigin(0,0);
      const rowBar=this.add.rectangle(RP,y,4,RH,col,owned?0.4:0.7).setOrigin(0,0);
      const rowTop=this.add.rectangle(RP,y,RW,3,col,owned?0.3:0.5).setOrigin(0,0);
      const nameTxt=this.add.text(RP+18,y+18,m.name,{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:owned?'#336644':m.col});
      const descTxt=this.add.text(RP+18,y+42,m.desc,{fontFamily:mono,fontSize:'11px',color:owned?'#445533':'#997755'});
      const costStr=owned?'✓ INSTALLED':`◈ ${m.cost}`;
      const costCol=owned?'#44aa77':'#ffdd00';
      const btnBg=this.add.rectangle(RP+RW-70,y+RH/2,120,34,owned?0x001a00:0x0a0a0a,0.95).setOrigin(0.5).setStrokeStyle(1.5,col,owned?0.4:0.7);
      const btnTxt=this.add.text(RP+RW-70,y+RH/2,costStr,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:costCol}).setOrigin(0.5);
      sc.add([rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt]);
      [rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt].forEach(o=>this._reg('survival',o));
      if(!owned){
        rowBg.setInteractive({useHandCursor:true});
        rowBg.on('pointerover',()=>{rowBg.setFillStyle(col,0.10);btnTxt.setColor('#ffffff');});
        rowBg.on('pointerout', ()=>{rowBg.setFillStyle(0x050200,0.97);btnTxt.setColor(costCol);});
        rowBg.on('pointerdown',()=>{
          if(Save.spendShards(m.cost)){
            Save.setMeta(m.id,true);
            this._msg(`${m.name} INSTALLED`);
            this._walletNum&&this._walletNum.setText(String(Save.shards()));
            this.time.delayedCall(600,()=>this._switchTab('survival'));
          } else {
            this._msg('INSUFFICIENT SHARDS');
          }
        });
      }
    });
  }

  _buildCombat(){
    const RP=200, RW=W-RP-20, RH=84, GAP=8;
    const mono="'Courier New',monospace";
    const META=[
      {id:'data_cache',name:'DATA_CACHE',cost:450,col:'#ffdd00',desc:'Score multiplier x1.25 on all kills'},
      {id:'primed_signal',name:'PRIMED_SIGNAL',cost:650,col:'#ff6600',desc:'Signal meter starts 50% full each run'},
      {id:'packet_router',name:'PACKET_ROUTER',cost:500,col:'#00cc66',desc:'Ping cooldown reduced 15s to 10s'},
      {id:'chain_patch',name:'CHAIN_PATCH',cost:500,col:'#00ff88',desc:'Chain reaction depth +1 permanently'},
    ];
    const totalH=META.length*(RH+GAP)+20;
    const sc=this._makeScrollPane('combat',totalH);
    META.forEach((m,i)=>{
      const y=58+i*(RH+GAP);
      const owned=Save.meta(m.id,false);
      const col=parseInt(m.col.replace('#',''),16);
      const rowBg =this.add.rectangle(RP+RW/2,y,RW,RH,0x050200,0.97).setOrigin(0.5,0);
      const rowBdr=this.add.rectangle(RP,y,RW,RH).setStrokeStyle(1,col,owned?0.25:0.35).setOrigin(0,0);
      const rowBar=this.add.rectangle(RP,y,4,RH,col,owned?0.4:0.7).setOrigin(0,0);
      const rowTop=this.add.rectangle(RP,y,RW,3,col,owned?0.3:0.5).setOrigin(0,0);
      const nameTxt=this.add.text(RP+18,y+18,m.name,{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:owned?'#336644':m.col});
      const descTxt=this.add.text(RP+18,y+42,m.desc,{fontFamily:mono,fontSize:'11px',color:owned?'#445533':'#997755'});
      const costStr=owned?'✓ INSTALLED':`◈ ${m.cost}`;
      const costCol=owned?'#44aa77':'#ffdd00';
      const btnBg=this.add.rectangle(RP+RW-70,y+RH/2,120,34,owned?0x001a00:0x0a0a0a,0.95).setOrigin(0.5).setStrokeStyle(1.5,col,owned?0.4:0.7);
      const btnTxt=this.add.text(RP+RW-70,y+RH/2,costStr,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:costCol}).setOrigin(0.5);
      sc.add([rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt]);
      [rowBg,rowBdr,rowBar,rowTop,nameTxt,descTxt,btnBg,btnTxt].forEach(o=>this._reg('combat',o));
      if(!owned){
        rowBg.setInteractive({useHandCursor:true});
        rowBg.on('pointerover',()=>{rowBg.setFillStyle(col,0.10);btnTxt.setColor('#ffffff');});
        rowBg.on('pointerout', ()=>{rowBg.setFillStyle(0x050200,0.97);btnTxt.setColor(costCol);});
        rowBg.on('pointerdown',()=>{
          if(Save.spendShards(m.cost)){
            Save.setMeta(m.id,true);
            this._msg(`${m.name} INSTALLED`);
            this._walletNum&&this._walletNum.setText(String(Save.shards()));
            this.time.delayedCall(600,()=>this._switchTab('combat'));
          } else {
            this._msg('INSUFFICIENT SHARDS');
          }
        });
      }
    });
  }

  _buildPowers(){
    const RP=200, RW=W-RP-20;
    const RH=84, GAP=8;
    const equippedPower=Save.get('equipped_power','ping')||'ping';

    // Ping row
    const pingY=58;
    const pingRow=this._reg('powers',this.add.rectangle(RP+RW/2,pingY,RW,44,equippedPower==='ping'?0x001a00:0x050200,0.97).setOrigin(0.5,0));
    this._reg('powers',this.add.rectangle(RP,pingY,RW,44).setStrokeStyle(equippedPower==='ping'?2:1,0x00ff66,equippedPower==='ping'?0.85:0.2).setOrigin(0,0));
    this._reg('powers',this.add.rectangle(RP,pingY,4,44,0x00ff66,equippedPower==='ping'?0.9:0.2).setOrigin(0,0));
    this._reg('powers',this.add.text(RP+18,pingY+8,'PING',{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:equippedPower==='ping'?'#00ff66':'#44aa66'}));
    this._reg('powers',this.add.text(RP+72,pingY+8,'DEFAULT · Free forever · SPACE to emit hex rings reversing nearby bullets · 15s CD',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#446633'}));
    const pingBtn=this._reg('powers',this.add.text(RP+RW-70,pingY+22,equippedPower==='ping'?'[ ACTIVE ]':'[ EQUIP ]',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:equippedPower==='ping'?'#00ff66':'#44aa66'}).setOrigin(0.5));
    pingRow.setInteractive({useHandCursor:equippedPower!=='ping'});
    pingRow.on('pointerover',()=>{if(equippedPower!=='ping'){pingRow.setFillStyle(0x00ff66,0.08);pingBtn.setColor('#ffffff');}});
    pingRow.on('pointerout', ()=>{if(equippedPower!=='ping'){pingRow.setFillStyle(0x050200,0.97);pingBtn.setColor('#44aa66');}});
    pingRow.on('pointerdown',()=>{Save.set('equipped_power','ping');this._msg('PING EQUIPPED');this.time.delayedCall(600,()=>this._switchTab('powers'));});

    const POWERS_DEF=[
      {id:'emp_burst',     name:'EMP_BURST',        icon:'⚡',col:'#ffffff',cost:800, cd:'22s',desc:'Stuns ALL enemies for 4 seconds. Freezes enemy bullets in place.'},
      {id:'null_zone',     name:'NULL_ZONE',          icon:'◯',col:'#aa00ff',cost:1000,cd:'28s',desc:'Deploys a void node at cursor. Deletes all bullets in 130px radius for 6s.'},
      {id:'overclock_surge',name:'OVERCLOCK_SURGE',  icon:'⚙',col:'#ffdd00',cost:1200,cd:'35s',desc:'Triple bubble expand speed, zero heat buildup, gold bubble for 4s.'},
      {id:'chain_trigger', name:'CHAIN_TRIGGER',     icon:'∞',col:'#ff6600',cost:900, cd:'18s',desc:'Instantly detonates ALL reflected bullets. Massive chain potential.'},
      {id:'ghost_step',    name:'GHOST_STEP',         icon:'~',col:'#aaaaff',cost:700, cd:'26s',desc:'Enemies lose targeting for 3s. They wander randomly.'},
      {id:'corrupt_wave',  name:'CORRUPT_WAVE',       icon:'☣',col:'#00ff44',cost:1100,cd:'38s',desc:'Corruption wave — all enemies within 300px gain +2 corruption counters.'},
      {id:'system_restore',name:'SYSTEM_RESTORE',    icon:'↺',col:'#00ffcc',cost:600, cd:'1/wave',desc:'Clears overheat. Regenerates shield. Refills 30% surge meter.'},
      {id:'decoy_packet',  name:'DECOY_PACKET',       icon:'◈',col:'#ff8800',cost:750, cd:'32s',desc:'Drops a decoy. All enemies retarget it for 6s while you act freely.'},
    ];

    const totalPH=110+POWERS_DEF.length*(RH+GAP)+10;
    const psc=this._makeScrollPane('powers',totalPH);
    [pingRow,...Object.values({pingRow,pingBtn})].forEach(o=>psc.add(o));

    POWERS_DEF.forEach((p,i)=>{
      const y=110+i*(RH+GAP);
      const owned=Save.meta('power_'+p.id,false);
      const equipped=equippedPower===p.id;
      const pCol=parseInt(p.col.replace('#',''),16);

      const rowBg2=this.add.rectangle(RP+RW/2,y,RW,RH,0x050200,0.97).setOrigin(0.5,0).setInteractive({useHandCursor:true});
      const rowBdr2=this.add.rectangle(RP,y,RW,RH).setStrokeStyle(1,pCol,0.35).setOrigin(0,0);
      const rowBar2=this.add.rectangle(RP,y,4,RH,pCol,0.7).setOrigin(0,0);
      const rowTop2=this.add.rectangle(RP,y,RW,3,pCol,0.5).setOrigin(0,0);
      const iconGfx=this.add.graphics().fillStyle(pCol,0.12).fillCircle(RP+36,y+RH/2,26);
      iconGfx.lineStyle(1.5,pCol,0.6);iconGfx.strokeCircle(RP+36,y+RH/2,26);
      const iconT=this.add.text(RP+36,y+RH/2,p.icon,{fontFamily:"'Courier New',monospace",fontSize:'20px',color:p.col}).setOrigin(0.5);
      const nameT=this.add.text(RP+76,y+14,p.name,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:p.col});
      const cdT=this.add.text(RP+76+p.name.length*8+10,y+16,`CD: ${p.cd}`,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#886633'});
      const descT=this.add.text(RP+76,y+38,p.desc,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#664422',wordWrap:{width:RW-240}});
      const statusStr=equipped?'[ EQUIPPED ]':owned?'[ EQUIP ]':`◈ ${p.cost}`;
      const statusCol=equipped?p.col:owned?'#00cc44':'#ffdd00';
      const btnBg2=this.add.rectangle(RP+RW-70,y+RH/2,120,34,equipped?0x001a00:owned?0x001200:0x0a0800,0.95).setStrokeStyle(1,pCol,equipped?0.85:0.3);
      const btn2=this.add.text(RP+RW-70,y+RH/2,statusStr,{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:statusCol}).setOrigin(0.5);
      [rowBg2,rowBdr2,rowBar2,rowTop2,iconGfx,iconT,nameT,cdT,descT,btnBg2,btn2].forEach(o=>{psc.add(o);this._reg('powers',o);});

      rowBg2.on('pointerover',()=>{rowBg2.setFillStyle(pCol,0.08);btn2.setColor('#ffffff');});
      rowBg2.on('pointerout', ()=>{rowBg2.setFillStyle(0x050200,0.97);btn2.setColor(statusCol);});
      rowBg2.on('pointerdown',()=>{
        if(!owned){
          if(Save.spendShards(p.cost)){
            Save.setMeta('power_'+p.id,true);
            this.shardsT.setText(`◈ ${Save.shards()} SHARDS`);
            this._walletNum.setText(String(Save.shards()));
            Save.set('equipped_power',p.id);
            this._msg(p.name+' PURCHASED AND EQUIPPED');
            this._vfxPatchInstall(RP+RW-70,y+RH/2+psc.y,pCol,p.name);
            this.time.delayedCall(700,()=>this._switchTab('powers'));
          } else this._msg('NEED '+p.cost+' ◈');
        } else if(!equipped){
          Save.set('equipped_power',p.id);
          this._msg(p.name+' EQUIPPED');
          this.time.delayedCall(400,()=>this._switchTab('powers'));
        }
      });
    });
  }

  update(_,delta){
    this.t+=delta/1000;
    // Update scrollbar thumb positions
    ['patches','powers'].forEach(tab=>{
      const objs=this._tabObjs[tab]||[];
      objs.forEach(o=>{
        if(o&&o._sbThumb&&o._maxScroll>0){
          const frac=o._scrollY/o._maxScroll;
          const range=o._sbViewH-o._sbThumbH;
          o._sbThumb.y=o._sbTrackTop+o._sbThumbH/2+frac*range;
        }
      });
    });
    if(this._tab!=='chassis')return;
    if(!this._prevT)this._prevT=0;
    this._prevT+=delta;
    if(this._prevT<32)return;
    this._prevT=0;
    const ships=Object.values(SHIPS);
    ships.forEach(s=>{
      if(!s._previewGfx||!s._previewX)return;
      const g2=s._previewGfx; g2.clear();
      const px2=s._previewX,py2=s._previewY,rot=this.t*0.8;
      const col=s.color||0x00ff66;
      const owned=Save.isOwned(s.id)||s.cost===0;
      const alpha=owned?1:0.3;
      try{
        if(s.id==='ranger'){
          g2.fillStyle(col,0.08);g2.fillCircle(px2,py2,26);
          g2.lineStyle(1,col,0.2*alpha);g2.beginPath();for(let k=0;k<6;k++){const a2=rot+(Math.PI/3)*k;if(k===0)g2.moveTo(px2+Math.cos(a2)*24,py2+Math.sin(a2)*24);else g2.lineTo(px2+Math.cos(a2)*24,py2+Math.sin(a2)*24);}g2.closePath();g2.strokePath();
          g2.fillStyle(col,0.9*alpha);g2.beginPath();for(let k=0;k<6;k++){const a2=rot+(Math.PI/3)*k;if(k===0)g2.moveTo(px2+Math.cos(a2)*14,py2+Math.sin(a2)*14);else g2.lineTo(px2+Math.cos(a2)*14,py2+Math.sin(a2)*14);}g2.closePath();g2.fillPath();
          g2.lineStyle(1,0xffffff,0.2*alpha);for(let k=0;k<6;k++){const a2=this.t*-0.5+(Math.PI/3)*k;g2.beginPath();g2.moveTo(px2,py2);g2.lineTo(px2+Math.cos(a2)*9,py2+Math.sin(a2)*9);g2.strokePath();}
        }else if(s.id==='phantom'){
          const h=18,w=9;g2.fillStyle(col,0.85*alpha);g2.beginPath();g2.moveTo(px2,py2-h);g2.lineTo(px2+w,py2);g2.lineTo(px2,py2+h);g2.lineTo(px2-w,py2);g2.closePath();g2.fillPath();
          g2.lineStyle(1.5,col,0.5*alpha);g2.beginPath();g2.moveTo(px2,py2-h);g2.lineTo(px2+w,py2);g2.lineTo(px2,py2+h);g2.lineTo(px2-w,py2);g2.closePath();g2.strokePath();
        }else if(s.id==='inferno'){
          const sr=this.t*2.2;g2.fillStyle(col,0.9*alpha);g2.beginPath();for(let k=0;k<8;k++){const a2=sr+(Math.PI/4)*k;const r2=k%2===0?16:8;if(k===0)g2.moveTo(px2+Math.cos(a2)*r2,py2+Math.sin(a2)*r2);else g2.lineTo(px2+Math.cos(a2)*r2,py2+Math.sin(a2)*r2);}g2.closePath();g2.fillPath();
          g2.lineStyle(1.5,0xff4400,0.4*alpha);g2.strokeCircle(px2,py2,22);
        }else if(s.id==='core'){
          g2.lineStyle(3,col,0.8*alpha);g2.beginPath();for(let k=0;k<6;k++){const a2=rot+(Math.PI/3)*k;if(k===0)g2.moveTo(px2+Math.cos(a2)*18,py2+Math.sin(a2)*18);else g2.lineTo(px2+Math.cos(a2)*18,py2+Math.sin(a2)*18);}g2.closePath();g2.strokePath();
          g2.fillStyle(col,0.7*alpha);g2.beginPath();for(let k=0;k<6;k++){const a2=rot*-0.6+(Math.PI/3)*k;if(k===0)g2.moveTo(px2+Math.cos(a2)*10,py2+Math.sin(a2)*10);else g2.lineTo(px2+Math.cos(a2)*10,py2+Math.sin(a2)*10);}g2.closePath();g2.fillPath();
        }else if(s.id==='ghost'){
          const hash=(n)=>((n*7+Math.floor(this.t*8)*3)%11)/11;
          g2.fillStyle(col,0.5*alpha);g2.beginPath();for(let k=0;k<6;k++){const a2=rot+(Math.PI/3)*k;const jt=1+(hash(k)-0.5)*0.4;if(k===0)g2.moveTo(px2+Math.cos(a2)*14*jt,py2+Math.sin(a2)*14*jt);else g2.lineTo(px2+Math.cos(a2)*14*jt,py2+Math.sin(a2)*14*jt);}g2.closePath();g2.fillPath();
          g2.lineStyle(1,col,0.6*alpha);g2.strokeCircle(px2,py2,18);
        }else if(s.id==='virus'){
          const sides=7;g2.fillStyle(col,0.85*alpha);g2.beginPath();for(let k=0;k<sides;k++){const a2=rot+(Math.PI*2/sides)*k;const isG=k===3;const r2=isG?14+Math.sin(this.t*15)*4:14;if(k===0)g2.moveTo(px2+Math.cos(a2)*r2,py2+Math.sin(a2)*r2);else g2.lineTo(px2+Math.cos(a2)*r2,py2+Math.sin(a2)*r2);}g2.closePath();g2.fillPath();
          g2.lineStyle(1,0xff0000,0.5*alpha);g2.beginPath();g2.moveTo(px2,py2);g2.lineTo(px2+Math.cos(rot+0.8)*14,py2+Math.sin(rot+0.8)*14);g2.strokePath();
        }
        g2.fillStyle(0xffffff,0.9*alpha);g2.fillCircle(px2,py2,2);
      }catch(e2){}
    });
  }

  _msg(t){this._msgTxt.setText(`> ${t}`);this.time.delayedCall(2500,()=>{try{this._msgTxt.setText('');}catch{}});}

  _vfxEquip(cx,cy,col,name){
    try{
      const g2=this.add.graphics().setDepth(20);let r=8,a=1;
      this.time.addEvent({delay:16,repeat:25,callback:()=>{
        g2.clear();g2.lineStyle(2,col,a);
        g2.beginPath();for(let k=0;k<6;k++){const a2=(Math.PI/3)*k;if(k===0)g2.moveTo(cx+Math.cos(a2)*r,cy+Math.sin(a2)*r);else g2.lineTo(cx+Math.cos(a2)*r,cy+Math.sin(a2)*r);}
        g2.closePath();g2.strokePath();r+=8;a-=0.04;
      }});
      this.time.delayedCall(420,()=>g2.destroy());
      this._msg(`CHASSIS [${name}] EQUIPPED`);
      this.time.delayedCall(700,()=>this._switchTab('chassis'));
    }catch(e){this._switchTab('chassis');}
  }

  _vfxPatchInstall(cx,cy,col,name){
    try{
      const fl=this.add.rectangle(cx,cy,100,100,col,0).setDepth(20);
      this.tweens.add({targets:fl,alpha:0.2,duration:70,yoyo:true,repeat:2,onComplete:()=>fl.destroy()});
    }catch(e){}
  }
}

// CODEX SCENE
// ═══════════════════════════════════════════════════════════
