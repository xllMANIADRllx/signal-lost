// ═══════════════════════════════════════════════════════════
// BOSSCUTSCENESCENE
// ═══════════════════════════════════════════════════════════

class BossCutsceneScene extends Phaser.Scene{
  constructor(){super('BossCutsceneScene');}
  create(d = {}){
    this.cameras.main.fadeIn(250,0,0,0);
    const rect=this.add.rectangle(W/2,H/2,W,H,0x000000,0.92).setAlpha(0);this.tweens.add({targets:rect,alpha:1,duration:280});
    // Process injection matrix rain
    const rainChars='01INJECT0xDEAD0xBEEF PROCESS HOSTILE NODE FIREWALL BREACH';
    const streams=[];
    for(let i=0;i<40;i++){
      const x=20+Math.random()*(W-40);
      const t=this.add.text(x,-20,rainChars[Math.floor(Math.random()*rainChars.length)],
        {fontFamily:"'Courier New',monospace",fontSize:'11px',color:'#'+(d.color||0xff0000).toString(16).padStart(6,'0'),alpha:0.5+Math.random()*0.5});
      streams.push(t);
      this.tweens.add({targets:t,y:H+20,alpha:0,duration:600+Math.random()*800,delay:Math.random()*500,onComplete:()=>t.destroy()});
    }
    for(let i=0;i<6;i++){const bar=this.add.rectangle(Math.random()*W,Math.random()*H,Math.random()*500+100,2+Math.random()*8,d.color||0xff0000,0.35);this.time.delayedCall(250,()=>bar.destroy());}
    // Banner style cutscene
    const topBg=this.add.rectangle(W/2,-60,W,100,0x0d0000,0.96);const botBg=this.add.rectangle(W/2,H+60,W,100,0x0d0000,0.96);
    this.tweens.add({targets:topBg,y:50,duration:300,ease:'Back.Out'});this.tweens.add({targets:botBg,y:H-50,duration:300,ease:'Back.Out'});
    const col='#'+((d.color||0xff0000).toString(16).padStart(6,'0'));
    const warn=this.add.text(W/2,50,'⚠  WARNING  ⚠',{fontFamily:'Orbitron',fontSize:'18px',fontStyle:'700',color:'#ff2244',letterSpacing:10}).setOrigin(0.5).setAlpha(0);
    const nameT=this.add.text(W/2,H/2-30,d.name,{fontFamily:'Orbitron',fontSize:'62px',fontStyle:'800',color:col,stroke:'#000000',strokeThickness:4}).setOrigin(0.5).setAlpha(0);
    const loreT=this.add.text(W/2,H-50,d.lore||'HOSTILE NODE DETECTED',{fontFamily:'Rajdhani',fontSize:'13px',color:'#445566',letterSpacing:2,wordWrap:{width:700},align:'center'}).setOrigin(0.5).setAlpha(0);
    this.time.delayedCall(300,()=>{this.tweens.add({targets:[warn,nameT,loreT],alpha:1,duration:380});});
    Snd.play('boss');CRT.glitch(1.5);Voice.say('warning. hostile node detected.');
    this.time.delayedCall(3000,()=>{
      this.tweens.add({targets:[rect,topBg,botBg,warn,nameT,loreT],alpha:0,duration:350,onComplete:()=>{this.scene.stop();this.scene.resume('GameScene',{bossReady:true});}});
    });
  }
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
