// ═══════════════════════════════════════════════════════════
// UPGRADESCENE
// ═══════════════════════════════════════════════════════════

class UpgradeScene extends Phaser.Scene{
  constructor(){super('UpgradeScene');}
  create(data){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(260,0,0,0);

    // Grid bg
    const g=this.add.graphics().setAlpha(0.05);
    g.lineStyle(1,0x00cc66,1);
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();

    // ── Header strip ──
    this.add.rectangle(W/2,0,W,56,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,56,W,1.5,0x00ff88,0.5).setOrigin(0.5,0);
    this.add.text(W/2,14,`// WAVE ${data.wave} CLEARED — SELECT_UPGRADE.SH`,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#224433',letterSpacing:1}).setOrigin(0.5,0);
    this.add.text(W/2,28,'INSTALL_MODULE — CHOOSE ONE',{fontFamily:"'Orbitron',sans-serif",fontSize:'18px',fontStyle:'900',color:'#00ff88',letterSpacing:4}).setOrigin(0.5,0);

    // ── Left stats panel ──
    const LP=230;
    this.add.rectangle(0,56,LP,H-56,0x000000,0.75).setOrigin(0,0);
    this.add.rectangle(LP,H/2+28,1,H-56,0x1a3322,0.6).setOrigin(0.5,0.5);

    const stat=(y,label,val,col)=>{
      this.add.text(16,y,label,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#336644'});
      this.add.text(16,y+14,val,{fontFamily:"'Orbitron',sans-serif",fontSize:'20px',fontStyle:'700',color:col});
    };

    this.add.text(16,68,'// WAVE STATS',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#224433'});
    stat(84, 'SIGNAL SCORE', Math.floor(data.score||0).toLocaleString(), '#00ffcc');
    stat(124,'KILLS',        String(data.kills||0),                      '#aaff00');
    stat(164,'BEST COMBO',   `×${data.bestCombo||0}`,                   '#ffdd00');
    stat(204,'SHARDS EARNED',`+${data.shardsEarned||0} ◈`,              '#ff9944');

    this.add.rectangle(16,250,LP-32,1,0x1a3322,0.6).setOrigin(0,0);

    this.add.text(16,258,'// RUN INFO',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#224433'});
    this.add.text(16,272,'SECTOR',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#336644'});
    const sNames=['SURFACE_LAYER','KERNEL_SPACE','DEEP_MEMORY','SECTOR_00'];
    this.add.text(16,284,sNames[data.stage||0]||'SURFACE_LAYER',{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:'#00ffcc'});
    this.add.text(16,304,'ARCHETYPE',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#336644'});
    this.add.text(16,316,(data.archetype||'REFLECTOR').toUpperCase(),{fontFamily:"'Courier New',monospace",fontSize:'11px',fontStyle:'bold',color:'#00ffcc'});
    this.add.text(16,336,'WALLET',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:'#336644'});
    this.add.text(16,348,`◈ ${data.shards||0} SHARDS`,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#ff9944'});

    // Skip button bottom of panel
    const sk=this.add.text(LP/2,H-20,'[ SKIP ]',{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#224433'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    sk.on('pointerover',()=>sk.setColor('#00ff88'));sk.on('pointerout',()=>sk.setColor('#224433'));
    sk.on('pointerdown',()=>{
      try{CRT.inGame=true;}catch(e){}
      this.cameras.main.fadeOut(200,0,0,0);
      this.time.delayedCall(200,()=>{this.scene.stop();this.scene.resume('GameScene',{upgrade:null});});
    });
    this.input.keyboard.once('keydown-ESC',()=>sk.emit('pointerdown'));
    this.input.keyboard.once('keydown-S',()=>sk.emit('pointerdown'));

    // ── Upgrade definitions ──
    // Upgrade definitions loaded from src/data/upgrades.js
    // Add new upgrades there — they appear here automatically

    // Build picks
    const picks=[];
    const shuffled=[...Object.entries(UPGRADES)].sort(()=>Math.random()-0.5);
    for(const [id,u] of shuffled){
      if(picks.length>=(data.extraCard?4:3))break;
      const curLevel=(data.upgrades||{})[id]||0;
      if(curLevel>=4)continue; // skip maxed upgrades (T4 = max)
      picks.push({id,...u,level:curLevel});
    }

    // ── Cards — right side of screen ──
    const RX=LP+10; // right area start x
    const RW=W-RX-10; // right area width
    const CW=Math.floor((RW-(picks.length-1)*12)/picks.length);
    const CH=H-56-10; // card height
    const cardTopY=58;
    const MAX_TIER=4;

    picks.forEach((upg,i)=>{
      const cx=RX+i*(CW+12)+CW/2;
      const cy=cardTopY+CH/2;
      const col=parseInt(upg.color.replace('#',''),16);
      const isNew=upg.level===0;

      // Card
      const card=this.add.rectangle(cx,cy,CW,CH,0x000000,0.97)
        .setStrokeStyle(isNew?2:1,col,isNew?0.8:0.5).setInteractive({useHandCursor:true});
      this.add.rectangle(cx-CW/2,cardTopY,CW,5,col,0.9).setOrigin(0,0);
      this.add.rectangle(cx-CW/2,cardTopY,3,CH,col,0.5).setOrigin(0,0);

      // NEW badge
      if(isNew){
        this.add.rectangle(cx+CW/2-36,cardTopY+8,62,18,col,0.2).setOrigin(0.5,0);
        this.add.text(cx+CW/2-36,cardTopY+8,'NEW',{fontFamily:"'Courier New',monospace",fontSize:'9px',color:upg.color}).setOrigin(0.5,0);
      } else {
        this.add.text(cx+CW/2-36,cardTopY+8,`T${upg.level}→T${upg.level+1}`,{fontFamily:"'Courier New',monospace",fontSize:'9px',color:upg.color}).setOrigin(0.5,0);
      }

      // Icon
      const iconY=cardTopY+60;
      const ig=this.add.graphics();
      ig.fillStyle(col,0.14);ig.fillCircle(cx,iconY,34);
      ig.lineStyle(1.5,col,0.6);ig.strokeCircle(cx,iconY,34);
      this.add.text(cx,iconY,upg.icon,{fontFamily:"'Courier New',monospace",fontSize:'28px',color:upg.color}).setOrigin(0.5,0.5);

      // Name
      this.add.text(cx,iconY+50,upg.name,{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:upg.color,align:'center',wordWrap:{width:CW-20}}).setOrigin(0.5,0);

      // Divider
      this.add.rectangle(cx,iconY+82,CW-24,1,col,0.25).setOrigin(0.5,0);

      // Description
      this.add.text(cx-CW/2+12,iconY+90,upg.desc,{fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#44aa66',wordWrap:{width:CW-24},lineSpacing:3});

      // Tier pip bar
      const pipY=cy+CH/2-72;
      this.add.text(cx-CW/2+12,pipY,isNew?'FIRST INSTALL':`T${upg.level} → T${upg.level+1}`,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#336644'});
      for(let t=0;t<MAX_TIER;t++){
        const filled=t<upg.level,isNext=t===upg.level;
        const px=cx-CW/2+12+t*(CW-24)/MAX_TIER;
        const pw=(CW-24)/MAX_TIER-4;
        this.add.rectangle(px,pipY+14,pw,7,filled?col:isNext?col:0x0a1a0d,filled?0.7:isNext?0.25:0.8).setOrigin(0,0);
        if(filled||isNext)this.add.rectangle(px,pipY+14,pw,7).setStrokeStyle(0.5,col,filled?0.5:0.4).setOrigin(0,0);
      }

      // Install button
      const btnY=cy+CH/2-36;
      const btnBg=this.add.rectangle(cx,btnY,CW-16,32,0x001500,0.95).setOrigin(0.5).setStrokeStyle(1.5,col,0.8);
      const btnTxt=this.add.text(cx,btnY,'[ INSTALL ]',{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:upg.color}).setOrigin(0.5);

      card.on('pointerover',()=>{card.setFillStyle(col,0.10);card.setStrokeStyle(2.5,col,0.95);btnBg.setFillStyle(col,0.2);btnTxt.setColor('#ffffff');});
      card.on('pointerout', ()=>{card.setFillStyle(0x000000,0.97);card.setStrokeStyle(isNew?2:1,col,isNew?0.8:0.5);btnBg.setFillStyle(0x001500,0.95);btnTxt.setColor(upg.color);});
      card.on('pointerdown',()=>{
        picks.forEach(p=>p._cardObj&&p._cardObj.removeInteractive());
        this._vfxUpgradeSelect(cx,cy,col,upg,picks,i,()=>{
          try{CRT.inGame=true;}catch(e){}
          this.scene.stop();
          this.scene.resume('GameScene',{upgrade:upg.id,overclocked:data.overclocked});
        });
      });
      upg._cardObj=card;
    });
  }

  _vfxUpgradeSelect(cx,cy,col,upg,picks,chosenIdx,onDone){
    try{
      const g=this.add.graphics().setDepth(30);
      const frags=[];
      for(let i=0;i<18;i++){
        const a=(Math.PI*2/18)*i,spd=4+Math.random()*5;
        frags.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,r:4+Math.random()*6,rot:Math.random()*Math.PI});
      }
      picks.forEach((p,pi)=>{
        if(pi===chosenIdx)return;
        if(p._borderObj)this.tweens.add({targets:p._borderObj,alpha:0,duration:280});
        if(p._cardObj){
          const wipe=this.add.rectangle(p._cardX||0,(p._cardY||0)-H/2+46,280,0,0x000000,0.95).setOrigin(0.5,0).setDepth(25);
          this.tweens.add({targets:wipe,height:H-90,duration:320,ease:'Power2'});
        }
      });
      const beam=this.add.rectangle(cx,cy,3,0,col,0.8).setOrigin(0.5,0).setDepth(28);
      this.tweens.add({targets:beam,height:H-cy,duration:220,ease:'Power2'});
      const iv=this.time.addEvent({delay:16,repeat:45,callback:()=>{
        g.clear();
        frags.forEach(f=>{
          f.x+=f.vx;f.y+=f.vy;f.vy+=0.12;f.life-=0.022;f.rot+=0.1;
          if(f.life<=0)return;
          g.fillStyle(col,f.life*0.9);
          g.beginPath();
          for(let s=0;s<6;s++){const a=f.rot+(Math.PI/3)*s;if(s===0)g.moveTo(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r);else g.lineTo(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r);}
          g.closePath();g.fillPath();
        });
      }});
      const logT=this.add.text(W/2,H-50,`> MODULE [${upg.name}] INJECTED — PROCESS MODIFIED`,{
        fontFamily:"'Courier New',monospace",fontSize:'12px',fontStyle:'bold',
        color:'#'+col.toString(16).padStart(6,'0')
      }).setOrigin(0.5).setAlpha(0).setDepth(35);
      this.tweens.add({targets:logT,alpha:1,duration:160});
      const fl=this.add.rectangle(W/2,H/2,W,H,col,0).setDepth(32);
      this.tweens.add({targets:fl,alpha:0.1,duration:100,yoyo:true,onComplete:()=>fl.destroy()});
      this.time.delayedCall(460,()=>{
        g.destroy();beam.destroy();
        this.cameras.main.fadeOut(200,0,0,0);
        this.time.delayedCall(200,onDone);
      });
    }catch(err){
      this.cameras.main.fadeOut(220,0,0,0);
      this.time.delayedCall(220,onDone);
    }
  }
}

// GAME OVER SCENE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// RUN SUMMARY SCENE
// ═══════════════════════════════════════════════════════════
