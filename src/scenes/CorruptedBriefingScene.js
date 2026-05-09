// ═══════════════════════════════════════════════════════════
// CORRUPTEDBRIEFINGSCENE
// ═══════════════════════════════════════════════════════════

class CorruptedBriefingScene extends Phaser.Scene{
  constructor(){super('CorruptedBriefingScene');}
  create(d){
    try{CRT.inGame=false;}catch(e){}
    this._data=d||{};
    this.cameras.main.setBackgroundColor('#020804');
    this.cameras.main.fadeIn(300,0,0,0);
    const MODIFIERS=[
      {id:'FAST',     col:0xff8800, label:'PACKET_STORM',    desc:'All enemies +40% speed every wave this applies'},
      {id:'DENSE',    col:0xff4400, label:'PROCESS_FLOOD',   desc:'Enemy spawn rate +50% — screen gets crowded fast'},
      {id:'ARMORED',  col:0xff2244, label:'HARDENED_PROCS',  desc:'All enemies +1 HP — takes an extra hit to kill'},
      {id:'VOLATILE', col:0xaa44ff, label:'UNSTABLE_PROCS',  desc:'Enemies explode on death — AoE damages nearby'},
      {id:'DARK',     col:0x4488ff, label:'SIGNAL_BLACKOUT', desc:'HUD goes dark — no score, heat or kill feed visible'},
      {id:'OVERLOAD', col:0xffdd44, label:'CORE_OVERLOAD',   desc:'Enemies +30% faster · Shards earned ×2'},
      {id:'FRAGILE',  col:0xff88aa, label:'FRAGILE_PROCS',   desc:'All enemies 1HP but +60% speed — a blizzard of them'},
      {id:'MINIBOSS', col:0xffaa00, label:'ELITE_SURGE',     desc:'Every enemy this wave is elite — larger, faster, tougher'},
      {id:'ENCORE',   col:0x00ffcc, label:'ENCORE_PROTOCOL', desc:'Kill count ×2 — but 2 upgrade cards rewarded on clear'},
    ];
    const g=this.add.graphics();
    g.lineStyle(1,0xcc44ff,0.10);
    g.beginPath();
    for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
    for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
    g.strokePath();
    this.add.rectangle(W/2,0,W,44,0x000000,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,44,W,2,0xcc44ff,0.7).setOrigin(0.5,0);
    this.add.text(W/2,21,'CORRUPTED_MODE — ACTIVE_MODIFIERS',{fontFamily:"'Orbitron',sans-serif",fontSize:'18px',fontStyle:'900',color:'#cc44ff',letterSpacing:4}).setOrigin(0.5);
    this.add.text(W/2,54,'One of these modifiers activates every wave — chosen at random',{fontFamily:"'Courier New',monospace",fontSize:'12px',color:'#774488',letterSpacing:1}).setOrigin(0.5);
    const COLS=3,CW=360,CH=76,GAPX=20,GAPY=10;
    const totalW=COLS*CW+(COLS-1)*GAPX;
    const sx=(W-totalW)/2;
    const sy=70;
    MODIFIERS.forEach((m,i)=>{
      const col=i%COLS,row=Math.floor(i/COLS);
      const cx=sx+col*(CW+GAPX)+CW/2,cy=sy+row*(CH+GAPY)+CH/2;
      const ac=m.col,acS='#'+ac.toString(16).padStart(6,'0');
      this.add.rectangle(cx,cy,CW,CH,0x030006,0.97).setStrokeStyle(1,ac,0.55);
      this.add.rectangle(cx-CW/2,cy,3,CH,ac,0.85).setOrigin(0,0.5);
      this.add.text(cx-CW/2+12,cy-CH/2+10,m.id,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#553366'});
      this.add.text(cx-CW/2+12,cy-CH/2+26,m.label,{fontFamily:"'Orbitron',sans-serif",fontSize:'14px',fontStyle:'900',color:acS});
      this.add.text(cx-CW/2+12,cy-CH/2+48,m.desc,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#667788',wordWrap:{width:CW-24}});
    });
    const contFn=()=>{
      this.cameras.main.fadeOut(280,0,0,0);
      this.time.delayedCall(280,()=>{this.scene.stop('CorruptedBriefingScene');this.scene.start('BootScene',this._data);});
    };
    this.input.keyboard&&this.input.keyboard.on('keydown-ENTER',contFn);
    this.input.keyboard&&this.input.keyboard.on('keydown-SPACE',contFn);
    const contBg=this.add.rectangle(W/2,H-28,320,34,0x000000,0.9).setStrokeStyle(2,0xcc44ff,0.8).setInteractive({useHandCursor:true});
    const contTxt=this.add.text(W/2,H-28,'[ ACKNOWLEDGED — BEGIN CORRUPTED RUN ]',{fontFamily:"'Courier New',monospace",fontSize:'13px',fontStyle:'bold',color:'#cc44ff'}).setOrigin(0.5);
    this.tweens.add({targets:contTxt,alpha:0.4,duration:600,yoyo:true,repeat:-1,delay:400});
    contBg.on('pointerover',()=>{contBg.setFillStyle(0xcc44ff,0.12);contTxt.setAlpha(1);});
    contBg.on('pointerout', ()=>{contBg.setFillStyle(0x000000,0.9);});
    contBg.on('pointerdown',contFn);
  }
}
