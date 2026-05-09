// ═══ DAILYCHALLENGESCENE ═══
class DailyChallengeScene extends Phaser.Scene{
  constructor(){super('DailyChallengeScene');}
  create(){
    try{
      this.cameras.main.setBackgroundColor('#000000');
      this.cameras.main.fadeIn(300,0,0,0);
      const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";

      // Background grid
      const g=this.add.graphics().setAlpha(0.05);
      g.lineStyle(1,0x00cc66,1);
      for(let x=0;x<=W;x+=80){g.moveTo(x,0);g.lineTo(x,H);}
      for(let y=0;y<=H;y+=80){g.moveTo(0,y);g.lineTo(W,y);}
      g.strokePath();

      const today=new Date();
      const dateStr=today.toDateString().toUpperCase();

      // Reset timer
      const midnight=new Date(today); midnight.setHours(24,0,0,0);
      const secsLeft=Math.floor((midnight-today)/1000);
      const hh=String(Math.floor(secsLeft/3600)).padStart(2,'0');
      const mm=String(Math.floor((secsLeft%3600)/60)).padStart(2,'0');
      const ss=String(secsLeft%60).padStart(2,'0');
      const resetStr=`⏱ RESETS IN ${hh}:${mm}:${ss}`;

      // Category colors
      const CAT_COL={SURVIVAL:0x00aaff,SCORE:0xffdd00,SKILL:0x00ff66,CHAOS:0xff6600};
      const CAT_STR={SURVIVAL:'#00aaff',SCORE:'#ffdd00',SKILL:'#00ff66',CHAOS:'#ff6600'};
      const CAT_DIM={SURVIVAL:'#003366',SCORE:'#664400',SKILL:'#224422',CHAOS:'#552200'};
      const CAT_BG ={SURVIVAL:0x000d1a,SCORE:0x1a1400,SKILL:0x001a00,CHAOS:0x1a0500};
      const DIFF_COL={EASY:'#00cc66',MED:'#ffdd00',HARD:'#ff8800',EXPERT:'#ff4444'};

      // ── Header ──
      this.add.rectangle(W/2,0,W,44,0x000000,0.97).setOrigin(0.5,0);
      this.add.rectangle(W/2,44,W,1.5,0xffaa00,0.5).setOrigin(0.5,0);
      this.add.text(W/2,22,'DAILY_CHALLENGES.SH',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#ffaa00',letterSpacing:5}).setOrigin(0.5);
      this.add.text(16,22,dateStr,{fontFamily:mono,fontSize:'9px',color:'#886633'}).setOrigin(0,0.5);
      this.add.text(W-16,22,resetStr,{fontFamily:mono,fontSize:'9px',color:'#886633'}).setOrigin(1,0.5);

      const challenges=getDailyChallenges();
      const todayKey='daily_done_'+today.toDateString();
      const doneTodayRaw=Save.get(todayKey)||'[]';
      let doneToday=[];
      try{doneToday=JSON.parse(doneTodayRaw);}catch{}

      const [feat,...rest]=challenges;

      const M=14; // margin
      const FULL_W=W-M*2;

      // ── FEATURED CARD ──
      const FY=52, FH=196;
      const done0=doneToday.includes(feat.id);
      const fc=done0?0x224422:CAT_COL[feat.cat]||0x00ffcc;
      const fcS=done0?'#224422':CAT_STR[feat.cat]||'#00ffcc';
      const fbg=done0?0x050505:CAT_BG[feat.cat]||0x000a00;

      this.add.rectangle(M,FY,FULL_W,FH,fbg,0.96).setOrigin(0,0);
      this.add.rectangle(M,FY,FULL_W,FH).setStrokeStyle(done0?1:2,fc,done0?0.3:0.85).setOrigin(0,0);
      this.add.rectangle(M,FY,FULL_W,4,fc,done0?0.3:0.95).setOrigin(0,0);
      this.add.rectangle(M,FY,4,FH,fc,done0?0.2:0.8).setOrigin(0,0);

      // Featured tag
      this.add.rectangle(M+FULL_W-110,FY+12,90,18,fc,done0?0.1:0.15).setOrigin(0,0);
      this.add.text(M+FULL_W-65,FY+12+9,done0?'COMPLETED':'FEATURED',{fontFamily:mono,fontSize:'8px',color:fcS,letterSpacing:1}).setOrigin(0.5);

      this.add.text(M+20,FY+16,feat.cat,{fontFamily:mono,fontSize:'9px',color:done0?'#224422':CAT_DIM[feat.cat],letterSpacing:2});
      this.add.text(M+20,FY+32,feat.label,{fontFamily:mono,fontSize:'22px',fontStyle:'bold',color:done0?'#336633':fcS,letterSpacing:2});
      this.add.rectangle(M+20,FY+62,FULL_W-200,1,fc,done0?0.1:0.25).setOrigin(0,0);
      this.add.text(M+20,FY+72,feat.desc,{fontFamily:mono,fontSize:'13px',color:done0?'#224422':'#aabbaa',letterSpacing:1,wordWrap:{width:FULL_W-260}});

      // Stats right side
      const rX=M+FULL_W-220;
      this.add.text(rX,FY+32,'DIFFICULTY',{fontFamily:mono,fontSize:'9px',color:done0?'#224422':CAT_DIM[feat.cat]});
      this.add.text(rX+110,FY+32,feat.diff,{fontFamily:mono,fontSize:'14px',fontStyle:'bold',color:done0?'#336633':DIFF_COL[feat.diff]||'#00cc66'});
      this.add.text(rX,FY+58,'REWARD',{fontFamily:mono,fontSize:'9px',color:done0?'#224422':CAT_DIM[feat.cat]});
      this.add.text(rX+110,FY+58,`${feat.reward} ◈`,{fontFamily:mono,fontSize:'18px',fontStyle:'bold',color:done0?'#336633':'#ffaa00'});

      // Button
      if(!done0){
        const fb=this.add.rectangle(rX+55,FY+130,198,34,fbg,0.97).setOrigin(0.5).setStrokeStyle(2,fc,0.9).setInteractive({useHandCursor:true});
        const ft=this.add.text(rX+55,FY+130,'[ ACCEPT MISSION ]',{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:fcS}).setOrigin(0.5);
        fb.on('pointerover',()=>{fb.setFillStyle(fc,0.18);ft.setColor('#ffffff');});
        fb.on('pointerout', ()=>{fb.setFillStyle(fbg,0.97);ft.setColor(fcS);});
        fb.on('pointerdown',()=>{
          this.cameras.main.fadeOut(240,0,0,0);
          this.time.delayedCall(240,()=>{
            this.scene.stop('MenuScene');
            this.scene.start('ArchetypeSelectScene',{mode:'daily',challengeId:feat.id,challengeReward:feat.reward,challengeLabel:feat.label,challengeDesc:feat.desc,challengeDiff:feat.diff});
          });
        });
      } else {
        this.add.text(rX+55,FY+130,'[ COMPLETED ]',{fontFamily:mono,fontSize:'12px',fontStyle:'bold',color:'#336633'}).setOrigin(0.5);
      }

      // ── TWO SMALLER CARDS ──
      const SY=FY+FH+10;
      const SH=H-SY-56;
      const SW=(FULL_W-10)/2;

      rest.forEach((ch,i)=>{
        const cx=M+i*(SW+10);
        const done=doneToday.includes(ch.id);
        const cc=done?0x224422:CAT_COL[ch.cat]||0x00ffcc;
        const ccS=done?'#224422':CAT_STR[ch.cat]||'#00ffcc';
        const cbg=done?0x050505:CAT_BG[ch.cat]||0x000a00;

        this.add.rectangle(cx,SY,SW,SH,cbg,0.95).setOrigin(0,0);
        this.add.rectangle(cx,SY,SW,SH).setStrokeStyle(done?1:1.5,cc,done?0.25:0.75).setOrigin(0,0);
        this.add.rectangle(cx,SY,SW,4,cc,done?0.2:0.9).setOrigin(0,0);
        this.add.rectangle(cx,SY,4,SH,cc,done?0.15:0.7).setOrigin(0,0);

        this.add.text(cx+16,SY+14,ch.cat,{fontFamily:mono,fontSize:'9px',color:done?'#224422':CAT_DIM[ch.cat]||'#224422',letterSpacing:2});
        this.add.text(cx+16,SY+30,ch.label,{fontFamily:mono,fontSize:'16px',fontStyle:'bold',color:done?'#336633':ccS,letterSpacing:1});
        this.add.rectangle(cx+16,SY+54,SW-80,1,cc,done?0.1:0.2).setOrigin(0,0);
        this.add.text(cx+16,SY+62,ch.desc,{fontFamily:mono,fontSize:'11px',color:done?'#224422':'#889988',wordWrap:{width:SW-32},lineSpacing:3});

        // Difficulty + reward
        this.add.rectangle(cx+16,SY+SH-70,SW-32,1,cc,done?0.1:0.15).setOrigin(0,0);
        this.add.text(cx+16,SY+SH-58,'DIFFICULTY',{fontFamily:mono,fontSize:'9px',color:done?'#224422':CAT_DIM[ch.cat]});
        this.add.text(cx+SW-16,SY+SH-58,ch.diff,{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:done?'#336633':DIFF_COL[ch.diff]||'#00cc66'}).setOrigin(1,0);
        this.add.text(cx+16,SY+SH-40,'REWARD',{fontFamily:mono,fontSize:'9px',color:done?'#224422':CAT_DIM[ch.cat]});
        this.add.text(cx+SW-16,SY+SH-40,`${ch.reward} ◈`,{fontFamily:mono,fontSize:'14px',fontStyle:'bold',color:done?'#336633':'#ffaa00'}).setOrigin(1,0);

        // Button
        if(!done){
          const sb=this.add.rectangle(cx+SW/2,SY+SH-14,SW-32,26,cbg,0.97).setOrigin(0.5).setStrokeStyle(1.5,cc,0.8).setInteractive({useHandCursor:true});
          const st=this.add.text(cx+SW/2,SY+SH-14,'[ ACCEPT MISSION ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:ccS}).setOrigin(0.5);
          sb.on('pointerover',()=>{sb.setFillStyle(cc,0.15);st.setColor('#ffffff');});
          sb.on('pointerout', ()=>{sb.setFillStyle(cbg,0.97);st.setColor(ccS);});
          sb.on('pointerdown',()=>{
            this.cameras.main.fadeOut(240,0,0,0);
            this.time.delayedCall(240,()=>{
              this.scene.stop('MenuScene');
              this.scene.start('ArchetypeSelectScene',{mode:'daily',challengeId:ch.id,challengeReward:ch.reward,challengeLabel:ch.label,challengeDesc:ch.desc,challengeDiff:ch.diff});
            });
          });
        } else {
          this.add.text(cx+SW/2,SY+SH-14,'[ COMPLETED ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#336633'}).setOrigin(0.5);
        }
      });

      // ── Bottom bar ──
      this.add.rectangle(W/2,H-36,W,36,0x000000,0.95).setOrigin(0.5,0);
      this.add.rectangle(W/2,H-36,W,1,0x332200,0.6).setOrigin(0.5,0);
      this.add.text(M,H-18,`WALLET: ${Save.shards()} ◈`,{fontFamily:mono,fontSize:'11px',color:'#ffaa00'}).setOrigin(0,0.5);
      const bk=this.add.text(W-M,H-18,'[ BACK TO TERMINAL ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#554433'}).setOrigin(1,0.5).setInteractive({useHandCursor:true});
      bk.on('pointerover',()=>bk.setColor('#ffaa00'));
      bk.on('pointerout', ()=>bk.setColor('#554433'));
      bk.on('pointerdown',()=>{
        this.cameras.main.fadeOut(220,0,0,0);
        this.time.delayedCall(220,()=>{
          this.scene.stop();
          const ms2=this.scene.get('MenuScene');
          if(ms2&&ms2.sys.isSleeping())this.scene.wake('MenuScene');
          else this.scene.start('MenuScene');
        });
      });

    }catch(err){console.error('[DAILY SCENE ERR]',err);}
  }
}


// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// DEV CONSOLE SCENE  — type "dev" on main menu to open
// ═══════════════════════════════════════════════════════════
