// ═══════════════════════════════════════════════════════════
// BOOTSCENE
// ═══════════════════════════════════════════════════════════

class BootScene extends Phaser.Scene{
  constructor(){super('BootScene');}

  create(data){
    CRT.suppress=true;
    try{
      this.cameras.main.setBackgroundColor('#020804');
      this.cameras.main.fadeIn(280,0,0,0);
      this._data=data||{};
      this.t=0;
      const mode=data.mode||'normal';
      const diff=(Settings.get('difficulty')||'daemon').toUpperCase();
      const archId=data.archetype||'reflector';
      const arch=ARCHETYPES.find(a=>a.id===archId)||ARCHETYPES[0];
      const acN=arch.col;
      const acS='#'+acN.toString(16).padStart(6,'0');

      // Mode accent colour


      // Duration — how long before launching GameScene
      const DURATION={normal:2600,daily:2400,corrupted:2000,endless:2800};
      const dur=DURATION[mode]||2600;

      // ── Background hex grid ──
      const hg=this.add.graphics().setAlpha(0.07);
      hg.lineStyle(1,acN,1);
      for(let hx=0;hx<W+80;hx+=80){
        for(let hy=0;hy<H+80;hy+=70){
          const ox=Math.floor(hy/70)%2===0?0:40;
          hg.beginPath();
          for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)hg.moveTo(hx+ox+Math.cos(a)*36,hy+Math.sin(a)*36);else hg.lineTo(hx+ox+Math.cos(a)*36,hy+Math.sin(a)*36);}
          hg.closePath();hg.strokePath();
        }
      }

      // ── Corner brackets ──
      const cg=this.add.graphics();
      [[0,0],[W,0],[0,H],[W,H]].forEach(([cx2,cy2])=>{
        const sx=cx2===0?1:-1,sy=cy2===0?1:-1;
        cg.lineStyle(2,acN,0.5);
        cg.beginPath();cg.moveTo(cx2+sx*28,cy2);cg.lineTo(cx2,cy2);cg.lineTo(cx2,cy2+sy*28);cg.strokePath();
      });

      // ── Top strip ──
      this.add.rectangle(W/2,0,W,32,0x000000,0.95).setOrigin(0.5,0);
      this.add.rectangle(W/2,32,W,1,acN,0.6).setOrigin(0.5,0);
      const modeLabel={normal:'INITIALIZE',daily:'DAILY_CHALLENGE',corrupted:'CORRUPTED_MODE',endless:'ENDLESS_MODE'};
      this.add.text(W/2,15,`${modeLabel[mode]||'INITIALIZE'}.SH — PROCESS INITIALISING`,{fontFamily:"'Courier New',monospace",fontSize:'12px',fontStyle:'bold',color:acS,letterSpacing:2}).setOrigin(0.5,0.5);
      this.add.text(16,15,`[${mode.toUpperCase()}]`,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:acS}).setOrigin(0,0.5);
      this.add.text(W-16,15,`${diff} DIFFICULTY`,{fontFamily:"'Courier New',monospace",fontSize:'10px',color:acS}).setOrigin(1,0.5);

      // ── CENTER: Archetype spotlight ──
      const CX=W/2, CY=H/2-30;

      // Animated hex rings — drawn in update
      this._hexGfx=this.add.graphics().setDepth(5);
      this._hexRings=[
        {r:58, speed:0.8,  alpha:0.55, width:1.5},
        {r:80, speed:-0.5, alpha:0.30, width:1.0},
        {r:104,speed:0.3,  alpha:0.15, width:0.8},
        {r:130,speed:-0.2, alpha:0.08, width:0.5},
      ];
      this._hexCX=CX;
      this._hexCY=CY;
      this._hexCol=acN;

      // Inner hex fill glow
      const innerGfx=this.add.graphics().setDepth(4);
      innerGfx.fillStyle(acN,0.10);
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)innerGfx.moveTo(CX+Math.cos(a)*48,CY+Math.sin(a)*48);else innerGfx.lineTo(CX+Math.cos(a)*48,CY+Math.sin(a)*48);}
      innerGfx.closePath();innerGfx.fillPath();
      innerGfx.lineStyle(2,acN,0.7);
      innerGfx.beginPath();
      for(let s=0;s<6;s++){const a=(Math.PI/3)*s;if(s===0)innerGfx.moveTo(CX+Math.cos(a)*48,CY+Math.sin(a)*48);else innerGfx.lineTo(CX+Math.cos(a)*48,CY+Math.sin(a)*48);}
      innerGfx.closePath();innerGfx.strokePath();

      // Icon inside hex
      this.add.text(CX,CY,arch.icon,{fontFamily:"'Courier New',monospace",fontSize:'44px',color:acS}).setOrigin(0.5).setDepth(6);

      // Archetype name
      const nameT=this.add.text(CX,CY+72,arch.name,{
        fontFamily:"'Orbitron',sans-serif",fontSize:'32px',fontStyle:'900',color:acS,letterSpacing:4
      }).setOrigin(0.5).setAlpha(0).setDepth(6);
      this.tweens.add({targets:nameT,alpha:1,duration:300,delay:200});

      // Tagline
      const tagT=this.add.text(CX,CY+110,arch.tagline,{
        fontFamily:"'Courier New',monospace",fontSize:'12px',color:acS,letterSpacing:1
      }).setOrigin(0.5).setAlpha(0).setDepth(6);
      this.tweens.add({targets:tagT,alpha:1,duration:300,delay:400});

      // Divider
      const divGfx=this.add.graphics().setDepth(6).setAlpha(0);
      divGfx.lineStyle(1,acN,0.3);
      divGfx.beginPath();divGfx.moveTo(CX-200,CY+128);divGfx.lineTo(CX+200,CY+128);divGfx.strokePath();
      this.tweens.add({targets:divGfx,alpha:1,duration:300,delay:500});

      // Passive text
      const passT=this.add.text(CX,CY+146,`PASSIVE: ${arch.passive}`,{
        fontFamily:"'Courier New',monospace",fontSize:'11px',color:acS,wordWrap:{width:420},align:'center'
      }).setOrigin(0.5).setAlpha(0).setDepth(6);
      this.tweens.add({targets:passT,alpha:1,duration:300,delay:600});

      // Mutations line
      const muts=this._data._runMutations||[];
      if(muts.length>0){
        const mutStr='MUTATIONS: '+muts.map(m=>m.label||m.id).join(' + ');
        const mutT=this.add.text(CX,CY+170,mutStr,{
          fontFamily:"'Courier New',monospace",fontSize:'10px',color:'#aa44ff'
        }).setOrigin(0.5).setAlpha(0).setDepth(6);
        this.tweens.add({targets:mutT,alpha:1,duration:300,delay:800});
      }

      // ── Bottom: progress bar + status lines ──
      const barY=H-48;
      this.add.rectangle(120,barY,W-240,4,0x001100,1).setOrigin(0,0.5);
      const barFill=this.add.rectangle(120,barY,0,4,acN,0.9).setOrigin(0,0.5);
      this.tweens.add({targets:barFill,width:W-240,duration:dur-400,ease:'Sine.Out'});

      // Status text below bar
      const statusLines=[
        `INITIALISING WAVE_001 — ${(this._data.archetypeSeeds?Object.entries(this._data.archetypeSeeds).map(([k,v])=>k.toUpperCase()+' T'+v).join(' · '):'NO SEEDS')}`,
        `SECTOR: SURFACE_LAYER  ·  DIFF: ${diff}  ·  MODE: ${mode.toUpperCase()}`,
      ];
      const stTxt=this.add.text(W/2,barY+12,statusLines[0],{
        fontFamily:"'Courier New',monospace",fontSize:'10px',color:acS
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({targets:stTxt,alpha:1,duration:200,delay:300});
      this.time.delayedCall(dur*0.5,()=>{try{stTxt.setText(statusLines[1]);}catch{}});

      // Scan sweep
      const sweep=this.add.rectangle(0,32,W,2,acN,0.18).setOrigin(0,0);
      this.tweens.add({targets:sweep,y:H,duration:dur*0.65,ease:'Linear'});

      // ── Launch ──
      this.time.delayedCall(dur,()=>{
        const flash=this.add.rectangle(W/2,H/2,W,H,acN,0).setDepth(50);
        this.tweens.add({targets:flash,alpha:0.2,duration:100,yoyo:true,onComplete:()=>{
          this.cameras.main.fadeOut(300,0,0,0);
          this.time.delayedCall(300,()=>this.scene.start('GameScene',data));
        }});
      });

    }catch(err){
      console.error('[BOOT SCENE ERROR]',err);
      this.scene.start('GameScene',this._data||{});
    }
  }

  update(_,delta){
    this.t+=delta/1000;
    if(!this._hexGfx||!this._hexRings)return;
    this._hexGfx.clear();
    this._hexRings.forEach((ring,i)=>{
      const angle=this.t*ring.speed+(i*Math.PI/3);
      this._hexGfx.lineStyle(ring.width,this._hexCol,ring.alpha);
      this._hexGfx.beginPath();
      for(let s=0;s<6;s++){
        const a=angle+(Math.PI/3)*s;
        if(s===0)this._hexGfx.moveTo(this._hexCX+Math.cos(a)*ring.r,this._hexCY+Math.sin(a)*ring.r);
        else this._hexGfx.lineTo(this._hexCX+Math.cos(a)*ring.r,this._hexCY+Math.sin(a)*ring.r);
      }
      this._hexGfx.closePath();this._hexGfx.strokePath();
    });
  }
}



// ═══════════════════════════════════════════════════════════
// OVERCLOCK SCENE
// ═══════════════════════════════════════════════════════════
