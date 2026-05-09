// ═══ METAUPGRADESCENE ═══
class MetaUpgradeScene extends Phaser.Scene{
  constructor(){super('MetaUpgradeScene');}
  create(){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#020c05');
    this.cameras.main.fadeIn(260,0,0,0);
    const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";

    // ── Layout constants ──
    const HDR_H=44, FTR_H=64, SB_W=300;
    const CONTENT_Y=HDR_H, CONTENT_H=H-HDR_H-FTR_H;
    const DETAIL_X=SB_W;

    // ── Background grid ──
    const bg=this.add.graphics().setAlpha(0.06);
    bg.lineStyle(1,0x00ff66,1);
    for(let x=0;x<=W;x+=80){bg.moveTo(x,0);bg.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){bg.moveTo(0,y);bg.lineTo(W,y);}
    bg.strokePath();

    // ── Scanlines ──
    const sl=this.add.graphics().setAlpha(0.025).setDepth(50);
    for(let y=0;y<H;y+=4){sl.fillStyle(0x000000,1);sl.fillRect(0,y,W,2);}

    // ── Header ──
    this.add.rectangle(W/2,0,W,HDR_H,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,HDR_H,W,1.5,0x00ff66,0.9).setOrigin(0.5,0);
    this.add.text(20,HDR_H/2,'NETWORK_UPGRADES.SH',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#00ff66',letterSpacing:5}).setOrigin(0,0.5);
    this.add.text(W/2,HDR_H/2,'// PERMANENT UPGRADES — PERSIST ACROSS ALL RUNS',{fontFamily:mono,fontSize:'10px',color:'#1a5530',letterSpacing:1}).setOrigin(0.5);
    this._fragTxt=this.add.text(W-20,HDR_H/2,'',{fontFamily:mono,fontSize:'13px',fontStyle:'bold',color:'#00cc66',letterSpacing:2}).setOrigin(1,0.5);

    // ── Sidebar panel ──
    this.add.rectangle(0,CONTENT_Y,SB_W,CONTENT_H,0x000000,0.88).setOrigin(0,0);
    this.add.rectangle(SB_W,CONTENT_Y,1,CONTENT_H,0x0a2818,1).setOrigin(0,0);

    // Filter bar
    this.add.rectangle(0,CONTENT_Y,SB_W,32,0x000000,0.95).setOrigin(0,0);
    this.add.rectangle(0,CONTENT_Y+32,SB_W,1,0x071a0f,1).setOrigin(0,0);
    this._filterTxt=this.add.text(14,CONTENT_Y+16,'> filter packages...',{fontFamily:mono,fontSize:'11px',color:'#1a4422',letterSpacing:1}).setOrigin(0,0.5);

    // ── Detail panel ──
    this.add.rectangle(DETAIL_X,CONTENT_Y,W-DETAIL_X,CONTENT_H,0x010a03,1).setOrigin(0,0);

    // ── Footer ──
    this.add.rectangle(W/2,H-FTR_H,W,FTR_H,0x010a03,0.98).setOrigin(0.5,0);
    this.add.rectangle(W/2,H-FTR_H,W,1,0x0a2818,1).setOrigin(0.5,0);
    this._promptTxt=this.add.text(20,H-FTR_H/2,'',{fontFamily:mono,fontSize:'11px',color:'#00ff66',letterSpacing:1}).setOrigin(0,0.5);
    this._cursorBlock=this.add.rectangle(0,H-FTR_H/2,7,13,0x00ff66,1).setOrigin(0,0.5);
    this.tweens.add({targets:this._cursorBlock,alpha:{from:1,to:0},duration:500,yoyo:true,repeat:-1,ease:'Step'});

    // Back button
    const backBg=this.add.rectangle(W-160,H-FTR_H/2,130,34,0x000000,0.9).setStrokeStyle(1,0x0a2818,1).setInteractive({useHandCursor:true});
    const backTxt=this.add.text(W-160,H-FTR_H/2,'[ ESC — BACK ]',{fontFamily:mono,fontSize:'11px',color:'#336644',letterSpacing:1}).setOrigin(0.5);
    backBg.on('pointerover',()=>{backBg.setStrokeStyle(1,0x336644,1);backTxt.setColor('#00cc66');});
    backBg.on('pointerout',()=>{backBg.setStrokeStyle(1,0x0a2818,1);backTxt.setColor('#336644');});
    backBg.on('pointerdown',()=>this._goBack());

    // Install button
    this._installBg=this.add.rectangle(W-24,H-FTR_H/2,140,34,0x000000,0.9).setStrokeStyle(1,0x0a3318,1).setOrigin(1,0.5).setInteractive({useHandCursor:false}).setAlpha(0.4);
    this._installTxt=this.add.text(W-24-70,H-FTR_H/2,'[ INSTALL ]',{fontFamily:mono,fontSize:'11px',color:'#00ff66',letterSpacing:2}).setOrigin(0.5).setAlpha(0.4);

    // ── Build package data ──
    const metaMap={};
    META_UPGRADES.forEach(u=>metaMap[u.id]=u);
    const TIERS=[
      {label:'// TIER_1 — ENTRY',ids:['start_shield','slow_combo','heat_sink','primed_signal','overclock_chip']},
      {label:'// TIER_2 — ADVANCED',ids:['redundant_buf','signal_amp','data_compress','packet_router','ghost_protocol']},
      {label:'// TIER_3 — CORE',ids:['redundant_path','kernel_access']},
    ];

    // Parent map from NODES in old tree
    const PARENTS={
      start_shield:[],slow_combo:[],heat_sink:[],primed_signal:[],overclock_chip:[],
      redundant_buf:['start_shield','slow_combo'],
      signal_amp:['slow_combo','heat_sink'],
      data_compress:['heat_sink','primed_signal'],
      packet_router:['primed_signal','overclock_chip'],
      ghost_protocol:['data_compress','packet_router'],
      redundant_path:['redundant_buf'],
      kernel_access:['signal_amp','data_compress'],
    };
    // Children (reverse)
    const CHILDREN={};
    Object.entries(PARENTS).forEach(([id,pars])=>{
      pars.forEach(p=>{if(!CHILDREN[p])CHILDREN[p]=[];CHILDREN[p].push(id);});
    });

    const buildPkgs=()=>{
      const pkgs=[];
      TIERS.forEach(tier=>{
        tier.ids.forEach(id=>{
          const meta=metaMap[id];if(!meta)return;
          const owned=Save.hasMeta(id);
          const parentOwned=(PARENTS[id]||[]).length===0||(PARENTS[id]||[]).some(p=>Save.hasMeta(p));
          const canAfford=!owned&&parentOwned&&Save.fragments()>=meta.cost;
          const available=!owned&&parentOwned;
          pkgs.push({id,meta,owned,available,canAfford,tier:tier.label,
            parents:PARENTS[id]||[],children:CHILDREN[id]||[]});
        });
      });
      return pkgs;
    };

    // ── Render package list ──
    this._listObjs=[];
    this._selected=null;
    this._pkgs=[];

    const renderList=()=>{
      this._listObjs.forEach(o=>{try{o.destroy();}catch{}});
      this._listObjs=[];
      this._pkgs=buildPkgs();
      const add2=o=>{this._listObjs.push(o);return o;};

      let ly=CONTENT_Y+40;
      let lastTier='';
      this._pkgs.forEach((pkg,idx)=>{
        if(pkg.tier!==lastTier){
          lastTier=pkg.tier;
          add2(this.add.rectangle(0,ly,SB_W,1,0x071a0f,1).setOrigin(0,0));
          add2(this.add.text(12,ly+6,pkg.tier,{fontFamily:mono,fontSize:'9px',color:'#1a4422',letterSpacing:2}));
          ly+=22;
        }
        const ROW_H=34;
        const isActive=this._selected===pkg.id;

        const rowBg=add2(this.add.rectangle(0,ly,SB_W,ROW_H,0x000000,isActive?0.9:0).setOrigin(0,0));
        if(isActive)add2(this.add.rectangle(0,ly,2,ROW_H,0x00ff66,1).setOrigin(0,0));
        if(isActive)rowBg.setFillStyle(0x071a0f,1);

        // Status dot
        const dotCol=pkg.owned?0x00ff66:pkg.available?0x00cc66:0x0a1a0a;
        const dotBg=add2(this.add.circle(22,ly+ROW_H/2,8,0x040e06));
        add2(this.add.circle(22,ly+ROW_H/2,8).setStrokeStyle(1,dotCol,pkg.owned?1:pkg.available?0.8:0.2));
        const dotTxt=add2(this.add.text(22,ly+ROW_H/2,pkg.owned?'✓':pkg.available?'◆':'✕',
          {fontFamily:mono,fontSize:'8px',color:'#'+dotCol.toString(16).padStart(6,'0')}).setOrigin(0.5));

        // Name
        const nameCol=pkg.owned?'#1a5530':pkg.available?'#00cc66':'#0d2016';
        add2(this.add.text(40,ly+ROW_H/2,pkg.meta.label,{fontFamily:mono,fontSize:'10px',letterSpacing:1,color:nameCol}).setOrigin(0,0.5));

        // Cost / status
        const costStr=pkg.owned?'INSTALLED':pkg.available?`◆ ${pkg.meta.cost}`:'LOCKED';
        const costCol=pkg.owned?'#1a4422':pkg.canAfford?'#00aa55':pkg.available?'#1a4422':'#0a1a0a';
        add2(this.add.text(SB_W-10,ly+ROW_H/2,costStr,{fontFamily:mono,fontSize:'9px',color:costCol,letterSpacing:1}).setOrigin(1,0.5));

        // Separator
        add2(this.add.rectangle(0,ly+ROW_H,SB_W,1,0x040c05,1).setOrigin(0,0));

        // Hit area
        const hit=add2(this.add.rectangle(0,ly,SB_W,ROW_H,0x000000,0).setOrigin(0,0).setInteractive({useHandCursor:true}));
        hit.on('pointerover',()=>{if(this._selected!==pkg.id)rowBg.setFillStyle(0x040e06,1);});
        hit.on('pointerout', ()=>{if(this._selected!==pkg.id)rowBg.setFillStyle(0x000000,0);});
        hit.on('pointerdown',()=>{
          this._selected=pkg.id;
          renderList();
          showDetail(pkg);
        });

        ly+=ROW_H+1;
      });
    };

    // ── Render detail ──
    this._detailObjs=[];
    const showDetail=(pkg)=>{
      this._detailObjs.forEach(o=>{try{o.destroy();}catch{}});
      this._detailObjs=[];
      const dadd=o=>{this._detailObjs.push(o);return o;};
      const DX=DETAIL_X+28, DW=W-DETAIL_X-56;
      let dy=CONTENT_Y+20;

      // Update prompt
      const cmd=pkg.owned?`status ${pkg.id}`:pkg.available?`install ${pkg.id}`:`info ${pkg.id}`;
      this._promptTxt.setText(`root@signal_lost:~/network$ ${cmd}`);
      const promptW=this._promptTxt.width;
      this._cursorBlock.setX(this._promptTxt.x+promptW+4);

      // Update install button
      if(pkg.canAfford){
        this._installBg.setAlpha(1).setStrokeStyle(1,0x0a3318,1).setInteractive({useHandCursor:true});
        this._installTxt.setAlpha(1).setText(`[ INSTALL — ◆ ${pkg.meta.cost} ]`);
        this._installBg.removeAllListeners();
        this._installBg.on('pointerover',()=>{this._installBg.setFillStyle(0x071a0f,1).setStrokeStyle(1,0x00ff66,1);this._installTxt.setColor('#ffffff');});
        this._installBg.on('pointerout', ()=>{this._installBg.setFillStyle(0x000000,0.9).setStrokeStyle(1,0x0a3318,1);this._installTxt.setColor('#00ff66');});
        this._installBg.on('pointerdown',()=>doInstall(pkg));
      } else {
        this._installBg.setAlpha(0.3).setInteractive({useHandCursor:false});
        this._installTxt.setAlpha(0.3).setText(pkg.owned?'[ INSTALLED ]':'[ LOCKED ]');
        this._installBg.removeAllListeners();
      }

      // Cmd echo
      dadd(this.add.text(DX,dy,`> ${cmd}`,{fontFamily:mono,fontSize:'11px',color:'#00ff66',letterSpacing:1}));
      dy+=18;
      dadd(this.add.text(DX,dy,'Reading package manifest...',{fontFamily:mono,fontSize:'10px',color:'#1a4422',letterSpacing:1}));
      dy+=28;

      // Name + tier
      const ac='#'+pkg.meta.col.toString(16).padStart(6,'0');
      dadd(this.add.text(DX,dy,pkg.meta.label,{fontFamily:orb,fontSize:'20px',fontStyle:'900',color:ac,letterSpacing:4}));
      dy+=26;

      // Tier badge
      const tierShort=pkg.tier.replace('// ','').replace('ENTRY','ENTRY NODE').replace('ADVANCED','ADVANCED MODULE').replace('CORE','CORE UPGRADE');
      dadd(this.add.text(DX,dy,`// ${tierShort}`,{fontFamily:mono,fontSize:'9px',color:'#1a5530',letterSpacing:3}));
      dy+=22;

      // Stat boxes
      const stats=[
        {l:'COST',  v:pkg.owned?'INSTALLED':`◆ ${pkg.meta.cost}`, c:pkg.owned?'#1a5530':pkg.canAfford?'#00ff66':'#336644'},
        {l:'STATUS',v:pkg.owned?'INSTALLED':pkg.available?'AVAILABLE':'LOCKED',c:pkg.owned?'#00ff66':pkg.available?'#00cc66':'#1a4422'},
        {l:'REQUIRES',v:pkg.parents.length?pkg.parents.map(p=>p.toUpperCase().replace('_','-')).join(', '):'NONE',c:pkg.parents.every(p=>Save.hasMeta(p))?'#00ff66':'#cc6600'},
        {l:'UNLOCKS',v:pkg.children.length?pkg.children.map(p=>p.toUpperCase().replace('_','-')).join(', '):'NONE',c:'#336644'},
      ];
      const SBW=Math.floor((DW)/4)-6;
      stats.forEach((s,i)=>{
        const sx=DX+i*(SBW+6);
        dadd(this.add.rectangle(sx,dy,SBW,50,0x040e06,1).setOrigin(0,0).setStrokeStyle(1,0x071a0f,1));
        dadd(this.add.text(sx+10,dy+10,s.l,{fontFamily:mono,fontSize:'8px',color:'#1a4422',letterSpacing:2}));
        dadd(this.add.text(sx+10,dy+28,s.v,{fontFamily:mono,fontSize:'10px',color:s.c,letterSpacing:1,wordWrap:{width:SBW-20}}));
      });
      dy+=62;

      // Divider
      dadd(this.add.rectangle(DX,dy,DW,1,0x0a2818,1).setOrigin(0,0));
      dy+=14;

      // Description
      dadd(this.add.text(DX,dy,'DESCRIPTION',{fontFamily:mono,fontSize:'9px',color:'#1a4422',letterSpacing:3}));
      dy+=14;
      dadd(this.add.text(DX,dy,pkg.meta.desc,{fontFamily:mono,fontSize:'11px',color:'#2a6640',wordWrap:{width:DW},lineSpacing:4}));
      dy+=36;

      // Synergy section — only if meaningful
      const SYNERGIES={
        redundant_buf:'CORE skin: +1 hits stacks on 3-hit passive = 4 hits at run start. FORTRESS archetype: combined with shield:1 seed.',
        signal_amp:'REFLECTOR archetype: chain kill damage ×1.5 per hit. STORM passive: bonus bullet also gets amp.',
        heat_sink:'OVERCLOCKER archetype: safe high-heat playstyle without overheat risk.',
        overclock_chip:'OVERCLOCKER archetype: seeds overclock_burst:1 already — combined = T2 from wave 1.',
        ghost_protocol:'GHOST archetype: seeds ghost_trace:2 already — combined = T3 from wave 1.',
        kernel_access:'Every UpgradeScene pass offers 4 cards instead of 3. Compounds with REFLECTOR (more choices = better chains).',
        primed_signal:'STORM archetype: surge-ready on wave 1 for immediate EMP burst.',
        redundant_path:'FORTRESS archetype: extra life on top of high shield = near-unkillable early game.',
        slow_combo:'STORM passive (every 5th reflect = bonus bullet): longer window = more combos.',
        packet_router:'Any run using PING as active power benefits directly.',
        data_compress:'Universal — 25% more shards per run compounds over time.',
        start_shield:'Stacks with redundant_buf and CORE skin. Pairs with null_zone upgrade.',
      };
      const syn=SYNERGIES[pkg.id];
      if(syn){
        dadd(this.add.text(DX,dy,'SYNERGY',{fontFamily:mono,fontSize:'9px',color:'#1a4422',letterSpacing:3}));
        dy+=14;
        dadd(this.add.text(DX,dy,syn,{fontFamily:mono,fontSize:'11px',color:'#336644',wordWrap:{width:DW},lineSpacing:4}));
        dy+=36;
      }

      // Status message if owned
      if(pkg.owned){
        dadd(this.add.rectangle(DX,dy,DW,1,0x0a2818,1).setOrigin(0,0));dy+=14;
        dadd(this.add.text(DX,dy,'[OK] Package already installed. Effect active in all future runs.',{fontFamily:mono,fontSize:'11px',color:'#1a5530',letterSpacing:1}));
      } else if(!pkg.available){
        dadd(this.add.rectangle(DX,dy,DW,1,0x0a2818,1).setOrigin(0,0));dy+=14;
        dadd(this.add.text(DX,dy,'[LOCKED] Install required parent packages first.',{fontFamily:mono,fontSize:'11px',color:'#3a1a00',letterSpacing:1}));
        const missing=pkg.parents.filter(p=>!Save.hasMeta(p));
        dadd(this.add.text(DX,dy+18,`missing: ${missing.join(', ')}`,{fontFamily:mono,fontSize:'10px',color:'#2a1000',letterSpacing:1}));
      } else if(!pkg.canAfford){
        dadd(this.add.rectangle(DX,dy,DW,1,0x0a2818,1).setOrigin(0,0));dy+=14;
        dadd(this.add.text(DX,dy,`[WARN] Insufficient fragments. Need ◆ ${pkg.meta.cost}, have ◆ ${Save.fragments()}.`,{fontFamily:mono,fontSize:'11px',color:'#3a2a00',letterSpacing:1}));
      }
    };

    const doInstall=(pkg)=>{
      if(!Save.spendFragments(pkg.meta.cost))return;
      Snd.init();Snd.play('install');
      Save.setMeta(pkg.id,true);
      if(Settings.get('shake'))this.cameras.main.flash(180,(pkg.meta.col>>16)&0xff,(pkg.meta.col>>8)&0xff,pkg.meta.col&0xff,0.15);
      // Flash install line in detail
      this._detailObjs.forEach(o=>{try{o.destroy();}catch{}});
      this._detailObjs=[];
      const dc=this.add.text(DETAIL_X+28,CONTENT_Y+20,`> install ${pkg.id}`,{fontFamily:mono,fontSize:'11px',color:'#00ff66'});
      this._detailObjs.push(dc);
      const dc2=this.add.text(DETAIL_X+28,CONTENT_Y+40,'[OK] Package installed successfully.',{fontFamily:mono,fontSize:'12px',color:'#00ff88',letterSpacing:1});
      this._detailObjs.push(dc2);
      const dc3=this.add.text(DETAIL_X+28,CONTENT_Y+60,`Effect active from next run.`,{fontFamily:mono,fontSize:'11px',color:'#336644'});
      this._detailObjs.push(dc3);
      // Rebuild list
      this._fragTxt.setText(`◆ ${Save.fragments()} FRAGMENTS`);
      this.time.delayedCall(600,()=>{
        renderList();
        const newPkg=buildPkgs().find(p=>p.id===pkg.id);
        if(newPkg)showDetail(newPkg);
      });
    };

    // ── Keyboard ──
    const goBack=()=>this._goBack();
    this.input.keyboard&&this.input.keyboard.on('keydown-ESC',goBack);

    // Arrow key nav
    this.input.keyboard&&this.input.keyboard.on('keydown-DOWN',()=>{
      const pkgs=buildPkgs();
      const idx=pkgs.findIndex(p=>p.id===this._selected);
      const next=pkgs[Math.min(idx+1,pkgs.length-1)];
      if(next){this._selected=next.id;renderList();showDetail(next);}
    });
    this.input.keyboard&&this.input.keyboard.on('keydown-UP',()=>{
      const pkgs=buildPkgs();
      const idx=pkgs.findIndex(p=>p.id===this._selected);
      const prev=pkgs[Math.max(idx-1,0)];
      if(prev){this._selected=prev.id;renderList();showDetail(prev);}
    });
    this.input.keyboard&&this.input.keyboard.on('keydown-ENTER',()=>{
      const pkg=buildPkgs().find(p=>p.id===this._selected);
      if(pkg&&pkg.canAfford)doInstall(pkg);
    });

    // ── Init ──
    this._fragTxt.setText(`◆ ${Save.fragments()} FRAGMENTS`);
    this._promptTxt.setText('root@signal_lost:~/network$ _');
    this._cursorBlock.setX(this._promptTxt.x+this._promptTxt.width+4);
    renderList();

    // Auto-select first available
    const firstAvail=buildPkgs().find(p=>p.available&&!p.owned)||buildPkgs()[0];
    if(firstAvail){this._selected=firstAvail.id;renderList();showDetail(firstAvail);}
  }

  _goBack(){
    this.cameras.main.fadeOut(220,0,0,0);
    this.time.delayedCall(220,()=>{
      this.scene.stop('MetaUpgradeScene');
      const ms=this.scene.get('MenuScene');
      if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');
      else this.scene.start('MenuScene');
    });
  }
}

