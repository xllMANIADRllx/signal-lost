// ═══════════════════════════════════════════════════════════
// OVERCLOCKSCENE
// ═══════════════════════════════════════════════════════════

class OverclockScene extends Phaser.Scene{
  constructor(){super('OverclockScene');}
  create(data){
    const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";

    // Only show every 3 waves
    if(data.wave%3!==0){
      this.scene.stop();
      this.scene.launch('UpgradeScene',{...data,extraCard:Save.hasMeta('kernel_access')});
      return;
    }

    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(400,0,0,0);

    // ── Pulsing full-screen bg glow ──
    const glow=this.add.graphics();
    const drawGlow=(a)=>{
      glow.clear();
      glow.fillStyle(0x00ff44,a);
      glow.fillRect(0,0,W,H);
    };
    drawGlow(0);
    this.tweens.add({targets:{v:0},v:0.06,duration:800,yoyo:true,repeat:-1,
      onUpdate:(tw,obj)=>drawGlow(obj.v)});

    // Grid lines
    const g=this.add.graphics();
    g.lineStyle(1,0x001a0a,0.4);
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();

    // ── Top accent line ──
    this.add.rectangle(W/2,0,W,3,0x00ff44,0.9).setOrigin(0.5,0);
    this.add.rectangle(W/2,H,W,3,0x00ff44,0.9).setOrigin(0.5,1);

    // ── Warning tag ──
    this.add.text(W/2,54,'// SECTOR_OVERCLOCK.SH — DECISION REQUIRED',{
      fontFamily:mono,fontSize:'10px',color:'#224433',letterSpacing:3
    }).setOrigin(0.5);

    // ── Main headline — big and dramatic ──
    const hdr=this.add.text(W/2,H/2-120,'OVERCLOCK\nTHIS SECTOR?',{
      fontFamily:orb,fontSize:'64px',fontStyle:'900',
      color:'#00ff44',letterSpacing:8,align:'center',lineSpacing:10
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({targets:hdr,alpha:1,duration:500,ease:'Power2'});

    // ── Divider ──
    this.add.rectangle(W/2,H/2+12,600,1,0x00ff44,0.25).setOrigin(0.5);

    // ── Risk/reward stats row ──
    const statY=H/2+40;
    const statData=[
      {label:'ENEMY SPEED',val:'+60%',  col:'#ff4444'},
      {label:'SPAWN RATE', val:'×2',    col:'#ff8800'},
      {label:'SCORE MULT', val:'×3',    col:'#00ff44'},
    ];
    statData.forEach((s,i)=>{
      const sx=W/2-240+i*240;
      this.add.rectangle(sx,statY+18,200,52,parseInt(s.col.replace('#',''),16),0.08).setOrigin(0.5);
      this.add.rectangle(sx-100,statY,2,52,parseInt(s.col.replace('#',''),16),0.6).setOrigin(0,0.5);
      this.add.text(sx,statY+6,s.label,{fontFamily:mono,fontSize:'9px',color:'#445544',letterSpacing:2}).setOrigin(0.5);
      this.add.text(sx,statY+26,s.val,{fontFamily:mono,fontSize:'22px',fontStyle:'bold',color:s.col}).setOrigin(0.5);
    });

    // ── Bottom command strip ──
    const STRIP_Y=H-80;
    this.add.rectangle(W/2,STRIP_Y,W,80,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,STRIP_Y,W,1.5,0x1a3322,1).setOrigin(0.5,0);

    // OVERCLOCK button — full left half
    const ocBg=this.add.rectangle(W/4,STRIP_Y+40,W/2-2,78,0x00ff44,0.10).setOrigin(0.5,0.5).setInteractive({useHandCursor:true});
    this.add.rectangle(0,STRIP_Y,3,80,0x00ff44,0.8).setOrigin(0,0);
    const ocLabel=this.add.text(W/4,STRIP_Y+22,'[ OVERCLOCK ]',{fontFamily:mono,fontSize:'16px',fontStyle:'bold',color:'#00ff44'}).setOrigin(0.5);
    this.add.text(W/4,STRIP_Y+46,'SCORE ×3  ·  HIGH RISK  ·  ENEMIES +60%',{fontFamily:mono,fontSize:'10px',color:'#336644'}).setOrigin(0.5);
    this.add.rectangle(W/2-1,STRIP_Y,1,80,0x1a3322,0.8).setOrigin(0.5,0);
    ocBg.on('pointerover',()=>{ocBg.setFillStyle(0x00ff44,0.18);ocLabel.setColor('#ffffff');});
    ocBg.on('pointerout', ()=>{ocBg.setFillStyle(0x00ff44,0.10);ocLabel.setColor('#00ff44');});
    ocBg.on('pointerdown',()=>{
      this.cameras.main.flash(120,0,255,80,true);
      this.cameras.main.fadeOut(280,0,0,0);
      this.time.delayedCall(280,()=>{
        this.scene.stop();
        this.scene.launch('UpgradeScene',{...data,overclocked:true,extraCard:Save.hasMeta('kernel_access')});
      });
    });

    // PROCEED button — full right half
    const skBg=this.add.rectangle(W*3/4,STRIP_Y+40,W/2-2,78,0xff4444,0.06).setOrigin(0.5,0.5).setInteractive({useHandCursor:true});
    this.add.rectangle(W-3,STRIP_Y,3,80,0xff4444,0.4).setOrigin(0,0);
    const skLabel=this.add.text(W*3/4,STRIP_Y+22,'[ PROCEED ]',{fontFamily:mono,fontSize:'16px',fontStyle:'bold',color:'#446633'}).setOrigin(0.5);
    this.add.text(W*3/4,STRIP_Y+46,'STANDARD  ·  SAFE  ·  NO BONUS',{fontFamily:mono,fontSize:'10px',color:'#336644'}).setOrigin(0.5);
    skBg.on('pointerover',()=>{skBg.setFillStyle(0xff4444,0.12);skLabel.setColor('#ff8888');});
    skBg.on('pointerout', ()=>{skBg.setFillStyle(0xff4444,0.06);skLabel.setColor('#446633');});
    skBg.on('pointerdown',()=>{
      this.cameras.main.fadeOut(280,0,0,0);
      this.time.delayedCall(280,()=>{
        this.scene.stop();
        this.scene.launch('UpgradeScene',{...data,overclocked:false,extraCard:Save.hasMeta('kernel_access')});
      });
    });

    // ── Countdown ──
    let t=8;
    const cT=this.add.text(W/2,STRIP_Y-14,`AUTO-PROCEED IN ${t}s`,{
      fontFamily:mono,fontSize:'10px',color:'#224433'
    }).setOrigin(0.5,1);
    this.time.addEvent({delay:1000,repeat:7,callback:()=>{
      t--;
      cT.setText(t>0?`AUTO-PROCEED IN ${t}s`:'PROCEEDING...');
      if(t<=0){
        this.cameras.main.fadeOut(280,0,0,0);
        this.time.delayedCall(280,()=>{
          this.scene.stop();
          this.scene.launch('UpgradeScene',{...data,overclocked:false,extraCard:Save.hasMeta('kernel_access')});
        });
      }
    }});
  }
}
