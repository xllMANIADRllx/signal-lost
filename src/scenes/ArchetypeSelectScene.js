// ═══════════════════════════════════════════════════════════
// ARCHETYPESELECTSCENE
// ═══════════════════════════════════════════════════════════

class ArchetypeSelectScene extends Phaser.Scene{
  constructor(){super('ArchetypeSelectScene');}
  create(d){
    try{CRT.inGame=false;}catch(e){}
    this._data=d||{};
    this._selected=null;
    this.cameras.main.setBackgroundColor('#020804');
    this.cameras.main.fadeIn(320,0,0,0);

    // Background grid
    const g=this.add.graphics();
    g.lineStyle(1,0x00cc66,0.08);
    g.beginPath();
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();

    // Header
    this.add.rectangle(W/2,0,W,42,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,42,W,2,0x00cc66,0.6).setOrigin(0.5,0);
    this.add.text(W/2,20,'SELECT_ARCHETYPE.SH',{
      fontFamily:"'Orbitron',sans-serif",fontSize:'20px',fontStyle:'900',color:'#00ff88',letterSpacing:6
    }).setOrigin(0.5);

    // Vertical divider
    const DIV=W/2;
    this.add.rectangle(DIV,H/2+21,1,H-42,0x003322,0.6).setOrigin(0.5,0.5);

    // ── RIGHT PANEL — archetype list ──
    const RP=DIV+20;
    const RW=W-RP-20;
    this.add.text(RP,52,'// AVAILABLE_ARCHETYPES',{
      fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
    });

    this._listCards={};
    const _ownsFn=(typeof Save.ownsArchetype==='function')?Save.ownsArchetype.bind(Save):()=>true;
    const _forgeCfgFn=(typeof Save.forgeConfig==='function')?Save.forgeConfig.bind(Save):()=>null;
    ARCHETYPES.forEach((arch,i)=>{
      const owned=_ownsFn(arch.id);
      // SIGNAL_FORGE: unlocked-but-unconfigured shows a third visual state (UNCONFIGURED)
      const forgeCfg=(arch.id==='signal_forge')?_forgeCfgFn():null;
      const needsForge=(arch.id==='signal_forge')&&owned&&!forgeCfg;
      const displayIcon=(arch.id==='signal_forge'&&forgeCfg&&forgeCfg.icon)?forgeCfg.icon:arch.icon;
      // Effective color: saved forge color overrides static arch.col when set
      const effectiveCol=(arch.id==='signal_forge'&&forgeCfg&&forgeCfg.color!=null)?forgeCfg.color:arch.col;
      const ac=owned?effectiveCol:0x556655;
      const acS=owned?('#'+effectiveCol.toString(16).padStart(6,'0')):'#778877';
      const y=68+i*(68+4); // stride 72 — tightened from 76 to fit 8th signal_forge card above back button

      const card=this.add.rectangle(RP,y,RW,68,0x020a04,0.97).setOrigin(0,0)
        .setStrokeStyle(1,ac,0.4).setInteractive({useHandCursor:true});
      const bar=this.add.rectangle(RP,y,4,68,ac,0.6).setOrigin(0,0);
      if(!owned){card.setAlpha(0.78);bar.setAlpha(0.45);}

      // Icon circle
      const iconGfx=this.add.graphics();
      iconGfx.fillStyle(ac,0.12);iconGfx.fillCircle(RP+30,y+34,22);
      iconGfx.lineStyle(1.5,ac,0.6);iconGfx.strokeCircle(RP+30,y+34,22);
      if(!owned)iconGfx.setAlpha(0.6);
      const iconTxt=this.add.text(RP+30,y+34,owned?displayIcon:'⌧',{
        fontFamily:"'Courier New',monospace",fontSize:'18px',color:acS
      }).setOrigin(0.5);

      const nameTxt=this.add.text(RP+60,y+12,arch.name,{
        fontFamily:"'Orbitron',sans-serif",fontSize:'14px',fontStyle:'900',color:acS
      });
      const tagTxt=this.add.text(RP+60,y+34,arch.tagline,{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:owned?'#336644':'#445544',
        wordWrap:{width:RW-70}
      });
      const pwrLabel=(arch.id==='signal_forge'&&forgeCfg)?forgeCfg.power.replace(/_/g,' ').toUpperCase():arch.power.replace(/_/g,' ').toUpperCase();
      const pwrTxt=this.add.text(RP+RW-4,y+54,`PWR: ${pwrLabel}`,{
        fontFamily:"'Courier New',monospace",fontSize:'9px',color:acS
      }).setOrigin(1,0).setAlpha(owned?0.7:0.45);

      // Badges — LOCKED (not owned) or UNCONFIGURED (signal_forge unlocked-but-empty)
      if(!owned){
        this.add.rectangle(RP+RW-8,y+8,62,16,0x000000,0.85).setOrigin(1,0)
          .setStrokeStyle(1,0x886622,0.85);
        this.add.text(RP+RW-39,y+16,'⚿ LOCKED',{
          fontFamily:"'Courier New',monospace",fontSize:'9px',fontStyle:'bold',color:'#ffaa44',letterSpacing:1
        }).setOrigin(0.5);
      } else if(needsForge){
        this.add.rectangle(RP+RW-8,y+8,84,16,0x000000,0.85).setOrigin(1,0)
          .setStrokeStyle(1,0xcc44ff,0.85);
        this.add.text(RP+RW-50,y+16,'⚙ UNCONFIGURED',{
          fontFamily:"'Courier New',monospace",fontSize:'9px',fontStyle:'bold',color:'#cc44ff',letterSpacing:1
        }).setOrigin(0.5);
      } else if(typeof computeArchetypeTier==='function'){
        // ── Phase 2B: MASTERY tier badge + progress bar ──
        const tier=computeArchetypeTier(arch.id);
        const bossKills=Save.stat&&Save.stat('arch_'+arch.id+'_total_bosses',0)||0;
        const tierThresh=[0,5,15,35,70,100];
        const tierCol=tier>=5?0xffd700:tier>=1?ac:0x554433;
        const tierColS='#'+tierCol.toString(16).padStart(6,'0');
        // Top-right mastery badge (moved from top-left to avoid overlapping the icon)
        this.add.rectangle(RP+RW-8,y+8,32,14,0x000000,0.85).setOrigin(1,0)
          .setStrokeStyle(1,tierCol,tier>=1?0.85:0.4);
        this.add.text(RP+RW-24,y+16,tier>=1?`T${tier}`:'T0',{
          fontFamily:"'Courier New',monospace",fontSize:'9px',fontStyle:'bold',color:tierColS,letterSpacing:1
        }).setOrigin(0.5);
        // Thin progress bar at bottom of card showing boss kills toward next tier
        if(tier<5){
          const cur=bossKills, prev=tierThresh[tier], next=tierThresh[tier+1];
          const frac=Math.max(0,Math.min(1,(cur-prev)/(next-prev)));
          this.add.rectangle(RP+8,y+64,RW-16,2,0x222222,0.7).setOrigin(0,0);
          this.add.rectangle(RP+8,y+64,(RW-16)*frac,2,tierCol,0.85).setOrigin(0,0);
        } else {
          // T5 capstone — full gold bar
          this.add.rectangle(RP+8,y+64,RW-16,2,0xffd700,0.9).setOrigin(0,0);
        }
      }

      this._listCards[arch.id]={card,bar,iconGfx,nameTxt,acS,ac,owned,needsForge};

      card.on('pointerover',()=>{
        if(this._selected!==arch.id){
          if(owned){
            card.setFillStyle(ac,0.10);
            card.setStrokeStyle(1,ac,0.75);
          }else{
            card.setFillStyle(0x221100,0.4);
            card.setStrokeStyle(1,0x886622,0.7);
          }
        }
      });
      card.on('pointerout',()=>{
        if(this._selected!==arch.id){
          card.setFillStyle(0x020a04,0.97);
          card.setStrokeStyle(1,ac,0.4);
        }
      });
      card.on('pointerdown',()=>this._preview(arch,owned));
    });

    // ── LEFT PANEL — detail card (starts empty) ──
    const LP=20;
    const LW=DIV-40;

    // Placeholder before selection
    this._placeholder=this.add.text(DIV/2,H/2,'// select an archetype',{
      fontFamily:"'Courier New',monospace",fontSize:'13px',color:'#2d6644'
    }).setOrigin(0.5);
    this._placeholderSub=this.add.text(DIV/2,H/2+20,'from the list on the right',{
      fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#336644'
    }).setOrigin(0.5);

    // Detail card objects — hidden until selection
    this._detailBg=this.add.rectangle(LP,48,LW,H-76,0x020a04,0).setOrigin(0,0);
    this._detailBorder=this.add.rectangle(LP,48,LW,H-76).setStrokeStyle(2,0x00ffcc,0).setOrigin(0,0);
    this._detailTopBar=this.add.rectangle(LP,48,LW,4,0x00ffcc,0).setOrigin(0,0);

    // Icon circle — large
    this._detailIconBg=this.add.graphics().setAlpha(0);
    this._detailIconTxt=this.add.text(DIV/2-100,H/2-60,'',{
      fontFamily:"'Courier New',monospace",fontSize:'52px',color:'#00ffcc'
    }).setOrigin(0.5).setAlpha(0);

    // Name
    this._detailName=this.add.text(LP+20,130,'',{
      fontFamily:"'Orbitron',sans-serif",fontSize:'28px',fontStyle:'900',color:'#00ffcc'
    }).setAlpha(0);

    // Tagline
    this._detailTagline=this.add.text(LP+20,170,'',{
      fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#55aa77',letterSpacing:1
    }).setAlpha(0);

    // Divider
    this._detailDiv=this.add.rectangle(LP+10,192,LW-20,1,0x003322,0).setOrigin(0,0);

    // Desc label + text
    this._detailDescLabel=this.add.text(LP+20,202,'DESCRIPTION',{
      fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
    }).setAlpha(0);
    this._detailDesc=this.add.text(LP+20,218,'',{
      fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#44aa66',
      wordWrap:{width:LW-40}
    }).setAlpha(0);

    // Passive label + text
    this._detailPassiveLabel=this.add.text(LP+20,262,'PASSIVE',{
      fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
    }).setAlpha(0);
    this._detailPassive=this.add.text(LP+20,278,'',{
      fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#44aa66',
      wordWrap:{width:LW-40}
    }).setAlpha(0);

    // Power label + text
    this._detailPowerLabel=this.add.text(LP+20,322,'ACTIVE POWER',{
      fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
    }).setAlpha(0);
    this._detailPower=this.add.text(LP+20,338,'',{
      fontFamily:"'Orbitron',sans-serif",fontSize:'14px',fontStyle:'900',color:'#00ffcc'
    }).setAlpha(0);

    // Seeds
    this._detailSeedsLabel=this.add.text(LP+20,374,'STARTING UPGRADES',{
      fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'
    }).setAlpha(0);
    this._detailSeeds=this.add.text(LP+20,390,'',{
      fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#44aa66'
    }).setAlpha(0);

    // Confirm button — kept inside detail card border (card bottom = H-28)
    this._confirmBg=this.add.rectangle(LP+LW/2,H-50,LW-20,36,0x000000,0)
      .setStrokeStyle(2,0x00ffcc,0).setInteractive({useHandCursor:true});
    this._confirmTxt=this.add.text(LP+LW/2,H-50,'',{
      fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#00ffcc'
    }).setOrigin(0.5).setAlpha(0);

    // RE-FORGE sub-button — only visible when previewing a configured signal_forge
    this._reforgeBg=this.add.rectangle(LP+LW/2,H-90,LW-20,26,0x000000,0)
      .setStrokeStyle(1,0xcc44ff,0).setInteractive({useHandCursor:true});
    this._reforgeTxt=this.add.text(LP+LW/2,H-90,'',{
      fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#cc44ff'
    }).setOrigin(0.5).setAlpha(0);
    this._reforgeBg.on('pointerover',()=>{
      if(!this._reforgeVisible)return;
      this._reforgeBg.setFillStyle(0xcc44ff,0.14);
    });
    this._reforgeBg.on('pointerout',()=>this._reforgeBg.setFillStyle(0x000000,0));
    this._reforgeBg.on('pointerdown',()=>{
      if(!this._reforgeVisible)return;
      this._openForge();
    });
    this._confirmBg.on('pointerover',()=>{
      if(!this._selected)return;
      const fillCol=this._previewLocked?0x886622:this._previewNeedsForge?0xcc44ff:0x00ffcc;
      this._confirmBg.setFillStyle(fillCol,this._previewLocked?0.10:0.14);
    });
    this._confirmBg.on('pointerout',()=>{this._confirmBg.setFillStyle(0x000000,0);});
    this._confirmBg.on('pointerdown',()=>{
      if(!this._selected)return;
      if(this._previewLocked){
        // Bounce + flash to signal denied
        this.tweens.add({targets:this._confirmBg,scaleX:{from:1.03,to:1},scaleY:{from:1.03,to:1},duration:160,ease:'Back.Out'});
        try{Snd.play('click');}catch(e){}
        return;
      }
      if(this._previewNeedsForge){
        this._openForge();
        return;
      }
      const arch=ARCHETYPES.find(a=>a.id===this._selected);
      if(arch)this._select(arch);
    });

    // ── ASCENSION selector (horizontal row of 25 dots) ──
    this._renderAscensionRow();

    // Back button
    const backFn=()=>{
      this.cameras.main.fadeOut(220,0,0,0);
      this.time.delayedCall(220,()=>{
        this.scene.stop('ArchetypeSelectScene');
        const ms=this.scene.get('MenuScene');
        if(ms&&ms.sys.isSleeping())this.scene.wake('MenuScene');
        else this.scene.start('MenuScene');
      });
    };
    this.input.keyboard&&this.input.keyboard.on('keydown-ESC',backFn);
    const backBg=this.add.rectangle(W-140,H-38,220,30,0x000000,0.9)
      .setStrokeStyle(1,0x224433,0.5).setInteractive({useHandCursor:true});
    const backTxt=this.add.text(W-140,H-38,'[ ← BACK ]',{
      fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#336644'
    }).setOrigin(0.5);
    backBg.on('pointerover',()=>{backBg.setStrokeStyle(1,0x00cc66,0.7);backTxt.setColor('#00cc66');});
    backBg.on('pointerout', ()=>{backBg.setStrokeStyle(1,0x224433,0.5);backTxt.setColor('#336644');});
    backBg.on('pointerdown',()=>{ try { Snd.play('powerup'); } catch {} backFn(); });
  }

  _preview(arch,owned){
    if(owned===undefined){
      const _o=(typeof Save.ownsArchetype==='function')?Save.ownsArchetype.bind(Save):()=>true;
      owned=_o(arch.id);
    }
    // SIGNAL_FORGE state resolution
    const isForge=arch.id==='signal_forge';
    const forgeCfg=isForge&&(typeof Save.forgeConfig==='function')?Save.forgeConfig():null;
    this._previewNeedsForge=isForge&&owned&&!forgeCfg;
    this._reforgeVisible=isForge&&owned&&!!forgeCfg;
    // Effective color — overlay saved forge color when configured
    const ac=(isForge&&forgeCfg&&forgeCfg.color!=null)?forgeCfg.color:arch.col;
    const acS='#'+ac.toString(16).padStart(6,'0');
    this._previewLocked=!owned;

    // Update selected state on list cards
    if(this._selected&&this._listCards[this._selected]){
      const prev=this._listCards[this._selected];
      prev.card.setFillStyle(0x020a04,0.97);
      prev.card.setStrokeStyle(1,prev.ac,0.4);
      prev.bar.setAlpha(0.6);
    }
    this._selected=arch.id;
    const lc=this._listCards[arch.id];
    lc.card.setFillStyle(ac,0.14);
    lc.card.setStrokeStyle(2,ac,0.9);
    lc.bar.setAlpha(1);

    // Hide placeholder
    this._placeholder.setAlpha(0);
    this._placeholderSub.setAlpha(0);

    // Update detail card colors
    this._detailBg.setFillStyle(ac,0.07).setAlpha(1);
    this._detailBorder.setStrokeStyle(2,ac,0.7).setAlpha(1);
    this._detailTopBar.setFillStyle(ac,1).setAlpha(1);
    this._detailDiv.setFillStyle(ac,0.4).setAlpha(1);

    // Icon — overlay forge icon if configured
    const displayIcon=(isForge&&forgeCfg&&forgeCfg.icon)?forgeCfg.icon:arch.icon;
    this._detailIconBg.clear().setAlpha(1);
    this._detailIconBg.fillStyle(ac,0.12);this._detailIconBg.fillCircle(80,110,46);
    this._detailIconBg.lineStyle(2,ac,0.7);this._detailIconBg.strokeCircle(80,110,46);
    this._detailIconTxt.setPosition(80,110).setText(displayIcon).setColor(acS).setAlpha(1);

    // Text content — for configured forge, overlay passive/power from config
    this._detailName.setText(arch.name).setColor(acS).setAlpha(1);
    this._detailTagline.setText(arch.tagline).setAlpha(1);
    this._detailDescLabel.setAlpha(1);
    this._detailDesc.setText(arch.desc).setAlpha(1);
    this._detailPassiveLabel.setAlpha(1);
    let passiveLabel=arch.passive;
    let powerLabel=arch.power;
    if(isForge&&forgeCfg){
      passiveLabel=forgeCfg.passive.toUpperCase()+' — chosen skin behavior';
      powerLabel=forgeCfg.power;
    } else if(this._previewNeedsForge){
      passiveLabel='(open SIGNAL_FORGE to configure)';
      powerLabel='(open SIGNAL_FORGE to configure)';
    }
    this._detailPassive.setText('▸ '+passiveLabel).setAlpha(1);
    this._detailPowerLabel.setAlpha(1);
    this._detailPower.setText('[ '+powerLabel.replace(/_/g,' ').toUpperCase()+' ]').setColor(acS).setAlpha(1);
    this._detailSeedsLabel.setAlpha(1);
    const seedStr=isForge?'(none — fully customized)':Object.entries(arch.seeds).map(([k,v])=>`${k.toUpperCase()} T${v}`).join('   ');
    this._detailSeeds.setText(seedStr).setAlpha(1);

    // Confirm button — three branches: locked / needsForge / ready
    if(!owned){
      // SIGNAL_FORGE is earned by killing CORE.BREACH, not buyable — use a distinct hint
      const lockHint=(arch.id==='signal_forge')?'[ ⚿ LOCKED — DEFEAT CORE.BREACH ]':'[ ⚿ LOCKED — UNLOCK IN DATA_SHOP ]';
      this._confirmBg.setStrokeStyle(2,0x886622,0.85).setAlpha(1);
      this._confirmTxt.setText(lockHint).setColor('#ffaa44').setAlpha(1);
    } else if(this._previewNeedsForge){
      this._confirmBg.setStrokeStyle(2,0xcc44ff,0.85).setAlpha(1);
      this._confirmTxt.setText(`[ ⚙ CONFIGURE — OPEN SIGNAL_FORGE ]`).setColor('#cc44ff').setAlpha(1);
    } else {
      this._confirmBg.setStrokeStyle(2,ac,0.85).setAlpha(1);
      this._confirmTxt.setText(`[ INITIALIZE WITH ${arch.name} ]`).setColor(acS).setAlpha(1);
    }

    // RE-FORGE sub-button — only for configured signal_forge
    if(this._reforgeVisible){
      this._reforgeBg.setStrokeStyle(1,0xcc44ff,0.6).setAlpha(1);
      this._reforgeTxt.setText('[ ⚙ RE-FORGE — change passive/power/icon ]').setAlpha(1);
    } else {
      this._reforgeBg.setStrokeStyle(1,0xcc44ff,0).setAlpha(0);
      this._reforgeTxt.setAlpha(0);
    }

    // Pulse confirm button once
    this.tweens.add({targets:this._confirmBg,scaleX:{from:0.97,to:1},scaleY:{from:0.97,to:1},duration:120,ease:'Back.Out'});

    Snd.play(owned?'powerup':'click');
  }

  _openForge(){
    this.cameras.main.fadeOut(220,0,0,0);
    this.time.delayedCall(220,()=>{
      this.scene.stop('ArchetypeSelectScene');
      this.scene.start('ForgeScene',{returnPayload:this._data});
    });
  }

  _renderAscensionRow(){
    const mono="'Courier New',monospace";
    const maxLv=Save.get('ascension_max',0);
    if(maxLv<=0&&!Save.get('ascension',0)){
      // Hide UI entirely until first wave-20 clear — keeps screen clean for new players
      return;
    }
    const cur=Math.min(Save.get('ascension',0),maxLv);
    // Placed in the right panel below archetype cards, so it doesn't collide
    // with the LEFT preview confirm/re-forge buttons at the screen bottom.
    const _RP=W/2+20;
    const DOT=12, GAP=2;
    const DOTS_X=_RP+6, DOTS_Y=H-66;
    this.add.text(DOTS_X,DOTS_Y-16,'// ASCENSION',{
      fontFamily:mono,fontSize:'10px',color:'#ccaa00',letterSpacing:2
    });
    this._ascLabel=this.add.text(DOTS_X+106,DOTS_Y-15,'',{
      fontFamily:mono,fontSize:'9px',color:'#aa8833',wordWrap:{width:260}
    }).setOrigin(0,0);

    this._ascDots=[];
    for(let i=0;i<=25;i++){
      const cx=DOTS_X+i*(DOT+GAP);
      const unlocked=i<=maxLv;
      const dot=this.add.rectangle(cx,DOTS_Y,DOT,DOT,0x000000,unlocked?0.85:0.4)
        .setOrigin(0,0)
        .setStrokeStyle(1,unlocked?0xffd700:0x554422,unlocked?0.85:0.4);
      const label=this.add.text(cx+DOT/2,DOTS_Y+DOT/2,String(i),{
        fontFamily:mono,fontSize:'9px',fontStyle:'bold',color:unlocked?'#ffd700':'#554422'
      }).setOrigin(0.5);
      if(unlocked){
        dot.setInteractive({useHandCursor:true});
        dot.on('pointerover',()=>{ if(this._ascCur!==i){dot.setFillStyle(0xffd700,0.18);label.setColor('#ffffff');} this._showAscPreview(i); });
        dot.on('pointerout', ()=>{ if(this._ascCur!==i){dot.setFillStyle(0x000000,0.85);label.setColor('#ffd700');} this._showAscPreview(this._ascCur); });
        dot.on('pointerdown',()=>{
          if(i===this._ascCur)return;
          Save.set('ascension',i);
          this._setAscSelection(i);
          try{Snd.play('click');}catch{}
        });
      }
      this._ascDots.push({dot,label,unlocked,i});
    }
    this._setAscSelection(cur);
    this._showAscPreview(cur);
  }

  _setAscSelection(n){
    this._ascCur=n;
    this._ascDots.forEach(d=>{
      const sel=d.i===n;
      if(!d.unlocked){return;}
      d.dot.setFillStyle(sel?0xffd700:0x000000,sel?0.3:0.85);
      d.dot.setStrokeStyle(sel?2:1,0xffd700,sel?1:0.85);
      d.label.setColor(sel?'#ffffff':'#ffd700');
    });
  }

  _showAscPreview(n){
    if(!this._ascLabel)return;
    if(n<=0){
      this._ascLabel.setText('A0: baseline (no modifiers)');
      return;
    }
    if(typeof ascensionActiveModifiers!=='function'){this._ascLabel.setText('');return;}
    const mods=ascensionActiveModifiers(n);
    const last=mods[mods.length-1]||'';
    const rew=(typeof ascensionRewardMults==='function')?ascensionRewardMults(n):{score:1,shards:1};
    const scorePct=Math.round((rew.score-1)*100);
    const shardPct=Math.round((rew.shards-1)*100);
    this._ascLabel.setText(`A${n}: ${mods.length} modifier${mods.length===1?'':'s'} active · +${scorePct}% score · +${shardPct}% shards`);
  }

  _select(arch){
    const _o=(typeof Save.ownsArchetype==='function')?Save.ownsArchetype.bind(Save):()=>true;
    if(!_o(arch.id))return; // double-guard: locked archetypes cannot be equipped
    // SIGNAL_FORGE: pull power + (no) seeds from saved config
    let powerForRun=arch.power, seedsForRun=arch.seeds;
    if(arch.id==='signal_forge'){
      const cfg=(typeof Save.forgeConfig==='function')?Save.forgeConfig():null;
      if(!cfg)return; // defensive — UI should route to ForgeScene first
      powerForRun=cfg.power;
      seedsForRun={};
    }
    // Use effective color for the flash (signal_forge gets the player's chosen color)
    const flashCol=(arch.id==='signal_forge'&&(typeof Save.forgeConfig==='function'))?(()=>{const c=Save.forgeConfig();return (c&&c.color!=null)?c.color:arch.col;})():arch.col;
    Snd.init();Snd.play('archetype');
    if(Settings.get('shake'))this.cameras.main.flash(200,(flashCol>>16)&0xff,(flashCol>>8)&0xff,flashCol&0xff,0.15);
    Save.set('equipped_power',powerForRun);
    this.cameras.main.fadeOut(300,0,0,0);
    this.time.delayedCall(300,()=>{
      this.scene.stop('ArchetypeSelectScene');
      const nextScene=this._data.mode==='corrupted'?'CorruptedBriefingScene':'BootScene';
      this.scene.start(nextScene,{
        mode:this._data.mode,
        archetype:arch.id,
        archetypeSeeds:seedsForRun,
        archetypePower:powerForRun,
        ascension:Save.get('ascension',0),
        // Pass through daily challenge data if present
        challengeId:this._data.challengeId||null,
        challengeReward:this._data.challengeReward||null,
        challengeLabel:this._data.challengeLabel||null,
        challengeDesc:this._data.challengeDesc||null,
        challengeDiff:this._data.challengeDiff||null,
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════
// META UPGRADE SCENE
// ═══════════════════════════════════════════════════════════
