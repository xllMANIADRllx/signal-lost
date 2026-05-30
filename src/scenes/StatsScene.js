// ═══════════════════════════════════════════════════════════
// STATSSCENE
// ═══════════════════════════════════════════════════════════

class StatsScene extends Phaser.Scene{
  constructor(){super('StatsScene');}
  create(d){
    try{
      const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";
      this.cameras.main.setBackgroundColor('#000000');
      this.cameras.main.fadeIn(200,0,0,0);
      const UPG_META={
        bubble_size:   {name:'RADIUS_EXPAND',   col:'#00aaff',icon:'○'},
        bubble_speed:  {name:'EXPANSION_RATE',  col:'#00ff88',icon:'⟳'},
        reflect_speed: {name:'REFLECT_BOOST',   col:'#ff00ff',icon:'↯'},
        shield:        {name:'SHIELD_LAYER',    col:'#ffdd00',icon:'◈'},
        magnet:        {name:'SIGNAL_PULL',     col:'#00ffff',icon:'⊕'},
        multishot:     {name:'ECHO_BURST',      col:'#ff6688',icon:'✦'},
        slow:          {name:'DECAY_FIELD',     col:'#aa00ff',icon:'≋'},
        score_boost:   {name:'DATA_HARVEST',    col:'#ffaa00',icon:'▲'},
        signal_fork:   {name:'SIGNAL_FORK',     col:'#00ffcc',icon:'⋔'},
        packet_cache:  {name:'PACKET_CACHE',    col:'#66cc88',icon:'▣'},
        null_shield:   {name:'NULL_SHIELD',     col:'#aaffdd',icon:'◯'},
        echo_protocol: {name:'ECHO_PROTOCOL',   col:'#ff88ff',icon:'↩'},
        corrupt_data:  {name:'CORRUPT_DATA',    col:'#ff4444',icon:'⚡'},
        ghost_trace:   {name:'GHOST_TRACE',     col:'#aaaaff',icon:'~'},
        overclock_burst:{name:'OVERCLOCK_BURST',col:'#ff8800',icon:'⚙'},
        signal_decay:  {name:'SIGNAL_DECAY',    col:'#884400',icon:'↓'},
        firewall_breach:{name:'FIREWALL_BREACH',col:'#ff2244',icon:'⊞'},
        chain_amplifier:{name:'CHAIN_AMP',      col:'#ffdd44',icon:'∞'},
      };
      const g=this.add.graphics().setAlpha(0.05);
      g.lineStyle(1,0x00ccff,1);
      for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
      for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
      g.strokePath();
      this.add.rectangle(W/2,0,W,48,0x000000,0.97).setOrigin(0.5,0);
      this.add.rectangle(W/2,48,W,1.5,0x00ccff,0.5).setOrigin(0.5,0);
      this.add.text(W/2,14,'BUILD_MATRIX.SH',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#00ccff',letterSpacing:4}).setOrigin(0.5,0);
      this.add.text(W/2,32,`WAVE ${d.wave||0}  ·  SIGNAL ${(d.score||0).toLocaleString()}  ·  ${(d.mode||'NORMAL').toUpperCase()}`,{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:1}).setOrigin(0.5,0);
      const CW=420,CX2=W/2+20;
      this.add.text(20,58,'// INSTALLED_MODULES',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2});
      const activeUpgs=Object.entries(d.upg||{}).filter(([k,v])=>v>0);
      let uy=76;
      if(activeUpgs.length===0){
        this.add.text(20,uy,'NO MODULES INSTALLED',{fontFamily:mono,fontSize:'11px',color:'#224433'});
        uy+=24;
      } else {
        activeUpgs.forEach(([id,tier])=>{
          const meta=UPG_META[id];if(!meta)return;
          const col=parseInt(meta.col.replace('#',''),16);
          this.add.rectangle(20,uy,CW-10,28,col,0.08).setOrigin(0,0);
          this.add.rectangle(20,uy,3,28,col,0.7).setOrigin(0,0);
          this.add.text(28,uy+4,meta.icon,{fontFamily:mono,fontSize:'14px',color:meta.col});
          this.add.text(52,uy+4,meta.name,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:meta.col});
          for(let t=0;t<4;t++){
            const px=224+t*22,filled=t<tier;
            this.add.rectangle(px,uy+9,16,10,filled?col:0x0a1a0d,filled?0.7:0.8).setOrigin(0,0);
            if(filled)this.add.rectangle(px,uy+9,16,10).setStrokeStyle(0.5,col,0.4).setOrigin(0,0);
          }
          this.add.text(316,uy+14,`T${tier}`,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:meta.col}).setOrigin(0,0.5);
          uy+=32;
        });
      }
      if((d.relics||[]).length>0){
        uy+=6;
        this.add.rectangle(20,uy,CW-10,1,0x00ccff,0.2).setOrigin(0,0);uy+=8;
        this.add.text(20,uy,'// BOSS_RELICS',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2});uy+=16;
        d.relics.forEach(r=>{
          const col=r.col||0x00ffcc;
          const colS='#'+col.toString(16).padStart(6,'0');
          this.add.rectangle(20,uy,CW-10,32,col,0.10).setOrigin(0,0);
          this.add.rectangle(20,uy,3,32,col,0.8).setOrigin(0,0);
          this.add.text(28,uy+4,r.icon||'◆',{fontFamily:mono,fontSize:'14px',color:colS});
          this.add.text(52,uy+4,r.name,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:colS});
          this.add.text(52,uy+19,r.desc||'',{fontFamily:mono,fontSize:'9px',color:'#446655'});
          uy+=36;
        });
      }
      let ry=58;
      this.add.text(CX2,ry,'// RUN_STATS',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2});ry+=16;
      const stats=[
        ['BEST CHAIN',`x${d.bestChain||0}`,'#ffdd00'],
        ['BEST COMBO',`x${d.maxCombo||0}`,'#ff9900'],
        ['TOTAL REFLECTS',String(d.totalReflects||0),'#00ffcc'],
        ['SHARDS THIS RUN',`${d.shards||0}`,'#ff9944'],
        ['ACTIVE POWER',(d.activePower||'PING').toUpperCase().replace(/_/g,' '),'#aaffdd'],
        ['ARCHETYPE',(d.archetype||'_').toUpperCase(),'#00ff88'],
        ['SKIN',(d.skin||'RANGER').toUpperCase(),'#00ff66'],
      ];
      stats.forEach(([label,val,col])=>{
        this.add.text(CX2,ry,label,{fontFamily:mono,fontSize:'9px',color:'#445544'});
        this.add.text(CX2+170,ry,val,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:col}).setOrigin(0,0);
        ry+=20;
      });
      ry+=8;
      this.add.rectangle(CX2,ry,W/2-30,1,0xffd700,0.2).setOrigin(0,0);ry+=10;
      this.add.text(CX2,ry,'// SYNERGIES',{fontFamily:mono,fontSize:'9px',color:'#336655',letterSpacing:2});ry+=16;
      const syns=d.synergies||[];
      if(syns.length===0){
        this.add.text(CX2,ry,'NONE ACTIVE',{fontFamily:mono,fontSize:'11px',color:'#224433'});ry+=20;
      } else {
        syns.forEach(s=>{
          this.add.rectangle(CX2,ry,W/2-30,24,0xffd700,0.08).setOrigin(0,0);
          this.add.rectangle(CX2,ry,3,24,0xffd700,0.7).setOrigin(0,0);
          this.add.text(CX2+10,ry+4,'⚡ '+s,{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#ffd700'});
          ry+=28;
        });
      }
      if(d.waveModifier&&d.waveModifier!=='NONE'){
        ry+=6;
        const MC={FAST:'#ff8800',DENSE:'#ff4400',ARMORED:'#ff2244',VOLATILE:'#aa44ff',DARK:'#4488ff',OVERLOAD:'#ffdd44',FRAGILE:'#ff88aa',MINIBOSS:'#ffaa00',ENCORE:'#00ffcc',SURGE:'#ff44ff',BOUNTY:'#44ffaa',FRACTURED:'#ffaa44'};
        const HL={FAST:'OVERCLOCK',DENSE:'FLOOD',ARMORED:'HARDENED',VOLATILE:'UNSTABLE',DARK:'BLACKOUT',OVERLOAD:'OVERLOAD',FRAGILE:'FRAGMENTED',MINIBOSS:'ELITE_PROC',ENCORE:'ENCORE',SURGE:'DATA_SURGE',BOUNTY:'BOUNTY_WAVE',FRACTURED:'PROCESS_FRACTURE'};
        const mc=MC[d.waveModifier]||'#ff4444';
        const mcN=parseInt(mc.replace('#',''),16);
        this.add.rectangle(CX2,ry,W/2-30,28,mcN,0.10).setOrigin(0,0);
        this.add.rectangle(CX2,ry,3,28,mcN,0.8).setOrigin(0,0);
        this.add.text(CX2+10,ry+5,'MOD: '+(HL[d.waveModifier]||d.waveModifier),{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:mc});
      }
      this.add.rectangle(W/2,H-22,220,30,0x000000,0.97).setOrigin(0.5).setStrokeStyle(1,0x00ccff,0.5);
      const bk=this.add.text(W/2,H-22,'[ CLOSE ]',{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#336655'}).setOrigin(0.5).setInteractive({useHandCursor:true});
      bk.on('pointerover',()=>bk.setColor('#00ccff'));
      bk.on('pointerout', ()=>bk.setColor('#336655'));
      bk.on('pointerdown',()=>{
        this.cameras.main.fadeOut(150,0,0,0);
        this.time.delayedCall(150,()=>{this.scene.stop();this.scene.resume('GameScene');});
      });
      this.input.keyboard.once('keydown-ESC',()=>bk.emit('pointerdown'));
      this.input.keyboard.once('keydown-TAB',()=>bk.emit('pointerdown'));
    }catch(err){console.error('[STATS SCENE]',err);}
  }
}
