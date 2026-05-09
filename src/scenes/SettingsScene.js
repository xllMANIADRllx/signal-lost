// ═══ SETTINGSSCENE ═══
class SettingsScene extends Phaser.Scene{
  constructor(){super('SettingsScene');}
  create(d){
    try{CRT.inGame=false;}catch(e){}
    try{_applyRenderScale();}catch(e){}
    const back=d&&d.from==='pause'?'pause':'menu';
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(280,0,0,0);
    this._catObjs={};
    this._activeCat='render';

    // Grid
    const g=this.add.graphics().setAlpha(0.06);
    g.lineStyle(1,0x00cc66,1);
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();

    // Header
    this.add.rectangle(W/2,0,W,36,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,36,W,1.5,0x667788,0.5).setOrigin(0.5,0);
    this.add.text(40,17,'// /etc/signal_lost.conf',{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#4477aa'}).setOrigin(0,0.5);
    this.add.text(W/2,17,'SYS_CONFIG.SH',{fontFamily:"'Orbitron',sans-serif",fontSize:'16px',fontStyle:'900',color:'#667788',letterSpacing:5}).setOrigin(0.5);

    // Divider
    const DIV=220;
    this.add.rectangle(DIV,H/2+18,1,H-36,0x223344,0.5).setOrigin(0.5);

    // ── Left: category nav ──
    this.add.text(14,50,'// CATEGORY',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#4477aa'});

    const CATS=[
      {id:'render',  label:'RENDER',   sub:'CRT · Vignette · Shake · Smooth', acol:'#00ff88', acolN:0x00ff88},
      {id:'audio',   label:'AUDIO',    sub:'Music · SFX volumes',           acol:'#4488ff', acolN:0x4488ff},
      {id:'hud',     label:'HUD',      sub:'Scale · Margin',                acol:'#ffdd00', acolN:0xffdd00},
      {id:'display', label:'DISPLAY',  sub:'Canvas scale · Window mode',    acol:'#ff9944', acolN:0xff9944},
    ];

    this._catBtns={};
    CATS.forEach((c,i)=>{
      const y=62+i*62;
      const act=c.id===this._activeCat;
      const cbg=this.add.rectangle(DIV/2,y,DIV-12,50,act?c.acolN:0x000000,act?0.12:0.8).setOrigin(0.5,0).setInteractive({useHandCursor:!act});
      const cbdr=this.add.rectangle(DIV/2,y,DIV-12,50).setStrokeStyle(act?2:1,c.acolN,act?0.85:0.15).setOrigin(0.5,0);
      const cbar=this.add.rectangle(8,y,3,50,c.acolN,act?0.9:0.2).setOrigin(0,0);
      const clbl=this.add.text(20,y+10,c.label,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:act?'bold':'normal',color:act?c.acol:'#445566'});
      const csub=this.add.text(20,y+28,c.sub,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:act?c.acol:'#334455'});
      this._catBtns[c.id]={bg:cbg,bdr:cbdr,bar:cbar,lbl:clbl,sub:csub,acol:c.acol,acolN:c.acolN};
      cbg.on('pointerover',()=>{if(this._activeCat!==c.id){cbg.setFillStyle(c.acolN,0.08);clbl.setColor('#ffffff');}});
      cbg.on('pointerout', ()=>{if(this._activeCat!==c.id){cbg.setFillStyle(0x000000,0.8);clbl.setColor('#445566');}});
      cbg.on('pointerdown',()=>{if(this._activeCat!==c.id)this._switchCat(c.id);});
    });

    // Version bottom left
    this.add.text(14,H-22,`v${(window._appVersion||'...')}`,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#3366aa'}).setOrigin(0,0.5);

    // ── Right: settings panel ──
    this._buildRight('render');

    // Back
    const bkLabel=back==='pause'?'[ RESUME PROCESS ]':'[ BACK TO TERMINAL ]';
    this.add.rectangle(W/2,H-20,W,36,0x000000,0.96).setOrigin(0.5);
    this.add.rectangle(W/2,H-38,W,1,0x223344,0.6).setOrigin(0.5);
    const bk=this.add.text(W/2,H-20,bkLabel,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#445566'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    bk.on('pointerover',()=>bk.setColor('#ffffff'));
    bk.on('pointerout', ()=>bk.setColor('#445566'));
    bk.on('pointerdown',()=>{
      this.cameras.main.fadeOut(240,0,0,0);
      this.time.delayedCall(240,()=>{
        if(back==='pause'){this.scene.stop('SettingsScene');this.scene.resume('GameScene',{fromSettings:true});}
        else{this.scene.stop('SettingsScene');const ms=this.scene.get('MenuScene');if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');else this.scene.start('MenuScene');}
      });
    });
  }

  _switchCat(id){
    // Destroy old right panel
    (this._catObjs[this._activeCat]||[]).forEach(o=>{try{o&&o.destroy();}catch{}});
    this._catObjs[this._activeCat]=[];

    // Update left nav visuals
    const prev=this._catBtns[this._activeCat];
    if(prev){
      prev.bg.setFillStyle(0x000000,0.8);
      prev.bdr.setStrokeStyle(1,prev.acolN,0.15);
      prev.bar.setAlpha(0.2);
      prev.lbl.setColor('#445566').setFontStyle('normal');
      prev.sub.setColor('#334455');
      prev.bg.setInteractive({useHandCursor:true});
    }
    this._activeCat=id;
    const cur=this._catBtns[id];
    if(cur){
      cur.bg.setFillStyle(cur.acolN,0.12);
      cur.bdr.setStrokeStyle(2,cur.acolN,0.85);
      cur.bar.setAlpha(0.9);
      cur.lbl.setColor(cur.acol).setFontStyle('bold');
      cur.sub.setColor(cur.acol);
      cur.bg.removeInteractive();
    }
    this._buildRight(id);
  }

  _reg(obj){
    if(!this._catObjs[this._activeCat])this._catObjs[this._activeCat]=[];
    this._catObjs[this._activeCat].push(obj);
    return obj;
  }

  _buildRight(cat){
    if(!this._catObjs[cat])this._catObjs[cat]=[];
    const RP=238, RW=W-RP-16;
    const acol=this._catBtns[cat]?.acol||'#00ff88';
    const acolN=this._catBtns[cat]?.acolN||0x00ff88;
    const RH=58, GAP=8;
    let y=44;

    const row=(label,sub)=>{
      const rowBg=this._reg(this.add.rectangle(RP+RW/2,y,RW,RH,0x040d06,0.97).setOrigin(0.5,0));
      rowBg.setStrokeStyle(1,acolN,0.25);
      this._reg(this.add.rectangle(RP,y,3,RH,acolN,0.6).setOrigin(0,0));
      this._reg(this.add.rectangle(RP,y,RW,3,acolN,0.4).setOrigin(0,0));
      this._reg(this.add.text(RP+14,y+10,label,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:acol}));
      this._reg(this.add.text(RP+14,y+30,sub,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#4477aa'}));
      return rowBg;
    };

    const toggle=(label,sub,key)=>{
      const rowBg=row(label,sub);
      const on=Settings.get(key);
      const trkBg=this._reg(this.add.rectangle(RP+RW-50,y+RH/2,60,24,on?acolN:0x0a1218,on?0.18:0.9).setStrokeStyle(1.5,acolN,on?0.9:0.3));
      const knob=this._reg(this.add.circle(on?RP+RW-26:RP+RW-62,y+RH/2,10,on?acolN:0x334455));
      const lbl=this._reg(this.add.text(on?RP+RW-63:RP+RW-26,y+RH/2,on?'ON':'OFF',{fontFamily:"'Courier New',monospace",fontSize:'8px',color:on?acol:'#445566'}).setOrigin(0.5));
      rowBg.setInteractive({useHandCursor:true});
      rowBg.on('pointerover',()=>rowBg.setFillStyle(acolN,0.08));
      rowBg.on('pointerout', ()=>rowBg.setFillStyle(0x040d06,0.97));
      rowBg.on('pointerdown',()=>{
        const nv=!Settings.get(key);Settings.set(key,nv);
        trkBg.setFillStyle(nv?acolN:0x0a1218,nv?0.18:0.9);
        trkBg.setStrokeStyle(1.5,acolN,nv?0.9:0.3);
        knob.setX(nv?RP+RW-26:RP+RW-62).setFillStyle(nv?acolN:0x334455);
        lbl.setX(nv?RP+RW-63:RP+RW-26).setText(nv?'ON':'OFF').setColor(nv?acol:'#445566');
      });
      y+=RH+GAP;
    };

    const slider=(label,sub,key,max)=>{
      const rowBg=row(label,sub);
      const TW=260,TX=RP+RW-TW-60;
      let val=Settings.get(key)||0.7;
      const track=this._reg(this.add.rectangle(TX+TW/2,y+RH/2,TW,6,0x0d1a22,1).setStrokeStyle(1,acolN,0.3).setInteractive({useHandCursor:true}));
      const fill=this._reg(this.add.rectangle(TX,y+RH/2,TW*(val/max),6,acolN,0.6).setOrigin(0,0.5));
      const knob=this._reg(this.add.circle(TX+TW*(val/max),y+RH/2,7,acolN));
      const pct=this._reg(this.add.text(RP+RW-12,y+RH/2,`${Math.round(val/max*100)}%`,{fontFamily:"'Courier New',monospace",fontSize:'11px',color:acol}).setOrigin(1,0.5));
      const upd=(px)=>{const f=Phaser.Math.Clamp((px-TX)/TW,0,1);fill.width=TW*f;knob.x=TX+TW*f;pct.setText(`${Math.round(f*100)}%`);Settings.set(key,f*max);try{Snd.updateVols&&Snd.updateVols();}catch{}};
      track.on('pointerdown',p=>upd(p.x));
      track.on('pointermove',p=>{if(p.isDown)upd(p.x);});
      y+=RH+GAP;
    };

    const pills=(label,sub,steps,labels,key,cmp)=>{
      const fullRH=RH+22;
      const rowBg=this._reg(this.add.rectangle(RP+RW/2,y,RW,fullRH,0x040d06,0.97).setOrigin(0.5,0));
      rowBg.setStrokeStyle(1,acolN,0.25);
      this._reg(this.add.rectangle(RP,y,3,fullRH,acolN,0.6).setOrigin(0,0));
      this._reg(this.add.rectangle(RP,y,RW,3,acolN,0.4).setOrigin(0,0));
      this._reg(this.add.text(RP+14,y+10,label,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:acol}));
      this._reg(this.add.text(RP+14,y+30,sub,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#4477aa'}));
      let cur=Settings.get(key);
      const btnObjs=steps.map((s,i)=>{
        const act=cmp?cmp(cur,s):cur===s;
        const bx=RP+14+i*(Math.floor((RW-28)/steps.length));
        const bw=Math.floor((RW-28)/steps.length)-6;
        const pbg=this._reg(this.add.rectangle(bx,y+44,bw,20,act?acolN:0x0a1218,act?0.22:0.9).setOrigin(0,0).setStrokeStyle(1,acolN,act?0.9:0.2).setInteractive({useHandCursor:true}));
        const ptxt=this._reg(this.add.text(bx+bw/2,y+54,labels[i],{fontFamily:"'Courier New',monospace",fontSize:'10px',fontStyle:act?'bold':'normal',color:act?acol:'#445566'}).setOrigin(0.5));
        pbg.on('pointerover',()=>{pbg.setFillStyle(acolN,0.15);ptxt.setColor('#ffffff');});
        pbg.on('pointerout', ()=>{const a=cmp?cmp(Settings.get(key),s):Settings.get(key)===s;pbg.setFillStyle(a?acolN:0x0a1218,a?0.22:0.9);ptxt.setColor(a?acol:'#445566');});
        pbg.on('pointerdown',()=>{
          Settings.set(key,s);cur=s;
          btnObjs.forEach((b,j)=>{const a=cmp?cmp(s,steps[j]):s===steps[j];b.bg.setFillStyle(a?acolN:0x0a1218,a?0.22:0.9);b.bg.setStrokeStyle(1,acolN,a?0.9:0.2);b.txt.setColor(a?acol:'#445566').setFontStyle(a?'bold':'normal');});
          if(key==='render_scale')try{_applyRenderScale();}catch{}
        });
        return {bg:pbg,txt:ptxt};
      });
      y+=fullRH+GAP;
    };

    if(cat==='render'){
      toggle('CRT_OVERLAY',   'Scanlines + chromatic aberration + glitch','crt');
      toggle('VIGNETTE',      'Edge darkening overlay around screen borders','vignette');
      toggle('SCREEN_FX',     'Camera shake + flash effects on damage/events','shake');
      toggle('SMOOTH_MOVE',   'Lerp player smoothly to cursor position','smooth');
      toggle('VOICE_SYNTH',   'Speech API system narration','voice');
    } else if(cat==='audio'){
      slider('MUSIC_VOLUME',  'Adaptive background music · 0.0 – 1.5','music',1.5);
      slider('SFX_VOLUME',    'Sound effects and feedback · 0.0 – 1.0','sfx',1.0);
    } else if(cat==='hud'){
      pills('HUD_SCALE',  'Resize all HUD elements globally',
        [0.7,0.85,1.0,1.2,1.4],['XS','SM','MD','LG','XL'],'hud_scale',
        (a,b)=>Math.abs(a-b)<0.05);
      pills('HUD_MARGIN', 'Safe zone from screen edges (px)',
        [4,8,12,18,24],['4px','8px','12px','18px','24px'],'hud_margin');
    } else if(cat==='display'){
      pills('CANVAS_SCALE',  'Sharpness rendering mode',
        [0.5,1,2],['CRISP','SMOOTH','SHARP'],'render_scale',
        (a,b)=>Math.abs(a-b)<0.1);
      pills('WINDOW_MODE', 'Toggle fullscreen display',
        [false,true],['WINDOWED','FULLSCREEN'],'fullscreen');
    }
  }
}


// GAME SCENE — the whole game
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ENEMY MUTATIONS
// ═══════════════════════════════════════════════════════════
