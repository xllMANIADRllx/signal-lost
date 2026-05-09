// ═══ ARCHETYPESELECTSCENE ═══
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
    ARCHETYPES.forEach((arch,i)=>{
      const ac=arch.col;
      const acS='#'+ac.toString(16).padStart(6,'0');
      const y=68+i*(68+8);

      const card=this.add.rectangle(RP,y,RW,68,0x020a04,0.97).setOrigin(0,0)
        .setStrokeStyle(1,ac,0.4).setInteractive({useHandCursor:true});
      const bar=this.add.rectangle(RP,y,4,68,ac,0.6).setOrigin(0,0);

      // Icon circle
      const iconGfx=this.add.graphics();
      iconGfx.fillStyle(ac,0.12);iconGfx.fillCircle(RP+30,y+34,22);
      iconGfx.lineStyle(1.5,ac,0.6);iconGfx.strokeCircle(RP+30,y+34,22);
      const iconTxt=this.add.text(RP+30,y+34,arch.icon,{
        fontFamily:"'Courier New',monospace",fontSize:'18px',color:acS
      }).setOrigin(0.5);

      const nameTxt=this.add.text(RP+60,y+12,arch.name,{
        fontFamily:"'Orbitron',sans-serif",fontSize:'14px',fontStyle:'900',color:acS
      });
      const tagTxt=this.add.text(RP+60,y+34,arch.tagline,{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644',
        wordWrap:{width:RW-70}
      });
      const pwrTxt=this.add.text(RP+RW-4,y+54,`PWR: ${arch.power.replace(/_/g,' ').toUpperCase()}`,{
        fontFamily:"'Courier New',monospace",fontSize:'9px',color:acS
      }).setOrigin(1,0).setAlpha(0.7);

      this._listCards[arch.id]={card,bar,iconGfx,nameTxt,acS,ac};

      card.on('pointerover',()=>{
        if(this._selected!==arch.id){
          card.setFillStyle(ac,0.10);
          card.setStrokeStyle(1,ac,0.75);
        }
      });
      card.on('pointerout',()=>{
        if(this._selected!==arch.id){
          card.setFillStyle(0x020a04,0.97);
          card.setStrokeStyle(1,ac,0.4);
        }
      });
      card.on('pointerdown',()=>this._preview(arch));
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

    // Confirm button
    this._confirmBg=this.add.rectangle(LP+LW/2,H-38,LW-20,36,0x000000,0)
      .setStrokeStyle(2,0x00ffcc,0).setInteractive({useHandCursor:true});
    this._confirmTxt=this.add.text(LP+LW/2,H-38,'',{
      fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#00ffcc'
    }).setOrigin(0.5).setAlpha(0);
    this._confirmBg.on('pointerover',()=>{if(this._selected)this._confirmBg.setFillStyle(0x00ffcc,0.14);});
    this._confirmBg.on('pointerout',()=>{this._confirmBg.setFillStyle(0x000000,0);});
    this._confirmBg.on('pointerdown',()=>{
      if(!this._selected)return;
      const arch=ARCHETYPES.find(a=>a.id===this._selected);
      if(arch)this._select(arch);
    });

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
    backBg.on('pointerdown',backFn);
  }

  _preview(arch){
    const ac=arch.col;
    const acS='#'+ac.toString(16).padStart(6,'0');

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

    // Icon
    this._detailIconBg.clear().setAlpha(1);
    this._detailIconBg.fillStyle(ac,0.12);this._detailIconBg.fillCircle(80,110,46);
    this._detailIconBg.lineStyle(2,ac,0.7);this._detailIconBg.strokeCircle(80,110,46);
    this._detailIconTxt.setPosition(80,110).setText(arch.icon).setColor(acS).setAlpha(1);

    // Text content
    this._detailName.setText(arch.name).setColor(acS).setAlpha(1);
    this._detailTagline.setText(arch.tagline).setAlpha(1);
    this._detailDescLabel.setAlpha(1);
    this._detailDesc.setText(arch.desc).setAlpha(1);
    this._detailPassiveLabel.setAlpha(1);
    this._detailPassive.setText('▸ '+arch.passive).setAlpha(1);
    this._detailPowerLabel.setAlpha(1);
    this._detailPower.setText('[ '+arch.power.replace(/_/g,' ').toUpperCase()+' ]').setColor(acS).setAlpha(1);
    this._detailSeedsLabel.setAlpha(1);
    const seedStr=Object.entries(arch.seeds).map(([k,v])=>`${k.toUpperCase()} T${v}`).join('   ');
    this._detailSeeds.setText(seedStr).setAlpha(1);

    // Confirm button
    this._confirmBg.setStrokeStyle(2,ac,0.85).setAlpha(1);
    this._confirmTxt.setText(`[ INITIALIZE WITH ${arch.name} ]`).setColor(acS).setAlpha(1);

    // Pulse confirm button once
    this.tweens.add({targets:this._confirmBg,scaleX:{from:0.97,to:1},scaleY:{from:0.97,to:1},duration:120,ease:'Back.Out'});

    Snd.play('powerup');
  }

  _select(arch){
    Snd.init();Snd.play('archetype');
    if(Settings.get('shake'))this.cameras.main.flash(200,(arch.col>>16)&0xff,(arch.col>>8)&0xff,arch.col&0xff,0.15);
    Save.set('equipped_power',arch.power);
    this.cameras.main.fadeOut(300,0,0,0);
    this.time.delayedCall(300,()=>{
      this.scene.stop('ArchetypeSelectScene');
      const nextScene=this._data.mode==='corrupted'?'CorruptedBriefingScene':'BootScene';
      this.scene.start(nextScene,{
        mode:this._data.mode,
        archetype:arch.id,
        archetypeSeeds:arch.seeds,
        archetypePower:arch.power,
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
