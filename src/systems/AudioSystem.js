// ═══ AUDIO SYSTEM ═══
const Snd={
  ctx:null,master:null,music:null,sfx:null,
  beat:0,nextBeat:0,bpm:70,ready:false,intensity:0,
  _mode:'menu', // 'menu'|'game'|'boss'
  _ambNodes:[],
  _schedTimer:null,
  _ambActive:false,

  init(){
    if(this.ready)return;this.ready=true;
    this.ctx=new(window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain();this.master.gain.value=0.65;this.master.connect(this.ctx.destination);
    this.music=this.ctx.createGain();this.music.gain.value=Settings.get('music');this.music.connect(this.master);
    this.sfx=this.ctx.createGain();this.sfx.gain.value=Settings.get('sfx');this.sfx.connect(this.master);
    this._startMenuMusic();
    this._sched();
  },

  _osc(type,freq,vol,dest,t0,t1,fEnd){
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t1);
    if(fEnd)o.frequency.exponentialRampToValueAtTime(fEnd,t1);
    o.connect(g);g.connect(dest);o.start(t0);o.stop(t1);
  },

  // ── Persistent pad oscillator ──
  _pad(freqs,vol,attack,dest){
    const nodes=[];
    freqs.forEach(f=>{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(),filt=this.ctx.createBiquadFilter();
      filt.type='lowpass';filt.frequency.value=800;filt.Q.value=0.8;
      o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol,this.ctx.currentTime+attack);
      o.connect(filt);filt.connect(g);g.connect(dest);o.start();
      nodes.push({o,g});
    });
    return nodes;
  },
  _stopNodes(nodes){
    if(!nodes)return;
    nodes.forEach(n=>{try{n.g.gain.setTargetAtTime(0,this.ctx.currentTime,0.4);setTimeout(()=>{try{n.o.stop();}catch{}},1200);}catch{}});
  },

  // ── MENU MUSIC — atmospheric D minor drone ──
  _startMenuMusic(){
    this._ambActive=true;
    this._mode='menu';this.bpm=70;this.beat=0;
    // Stop any existing pads
    this._stopNodes(this._padNodes);
    // Deep sub drone — D1 36.7Hz
    const subFilt=this.ctx.createBiquadFilter();subFilt.type='lowpass';subFilt.frequency.value=120;
    const subG=this.ctx.createGain();subG.gain.value=0.12;
    const subOsc=this.ctx.createOscillator();subOsc.type='sine';subOsc.frequency.value=36.7;
    const subLFO=this.ctx.createOscillator(),subLG=this.ctx.createGain();
    subLFO.frequency.value=0.08;subLG.gain.value=4;
    subLFO.connect(subLG);subLG.connect(subOsc.frequency);
    subOsc.connect(subFilt);subFilt.connect(subG);subG.connect(this.music);
    subOsc.start();subLFO.start();
    // Dm pad chord — D3, F3, A3 with very slow attack
    this._padNodes=this._pad([146.8,174.6,220,261.6],0.04,3.5,this.music);
    // Store for cleanup
    this._subOsc=subOsc;this._subLFO=subLFO;this._subG=subG;
  },

  _stopMenuMusic(){
    try{this._subG&&this._subG.gain.setTargetAtTime(0,this.ctx.currentTime,0.5);}catch{}
    this._stopNodes(this._padNodes);
    this._padNodes=[];
  },

  // ── GAME MUSIC — switch to driving 138 BPM ──
  startGameMusic(){
    if(!this.ready)return;
    this._stopMenuMusic();
    this._mode='game';this.bpm=138;this.beat=0;
    this._ambActive=true;
  },

  startBossMusic(){
    if(!this.ready||this._mode==='boss')return;
    this._mode='boss';this.bpm=155;this.beat=0;
    this._stopNodes(this._padNodes);this._padNodes=[];
  },

  stopBossMusic(){
    if(!this.ready||this._mode!=='boss')return;
    this._mode='game';this.bpm=138;
  },

  _startMenuMusic_resume(){
    if(!this.ready)return;
    this._mode='menu';this.bpm=70;this.beat=0;
    this._startMenuMusic();
  },

  _sched(){
    const run=()=>{
      if(!this.ctx)return;
      const iv=(60/this.bpm)/4; // 16th note interval
      const now=this.ctx.currentTime;
      while(this.nextBeat<now+0.12){this._beat(this.nextBeat,this.beat%64);this.nextBeat+=iv;this.beat++;}
      this._schedTimer=setTimeout(run,20);
    };
    this.nextBeat=this.ctx.currentTime;run();
  },

  _beat(t,b){
    if(this._mode==='menu')this._beatMenu(t,b);
    else if(this._mode==='game')this._beatGame(t,b);
    else if(this._mode==='boss')this._beatBoss(t,b);
  },

  // ── Menu beat — 70 BPM, 64-step (4-bar) loop ──
  _beatMenu(t,b){
    const s=b%64;
    // Slow bass pulse every 8 steps (every 2 beats)
    const bassSeq=[36.7,36.7,32.7,32.7,29.1,29.1,32.7,32.7]; // D C Bb C root movement
    if(s%8===0){const note=bassSeq[Math.floor(s/8)%bassSeq.length];this._osc('sine',note,0.18,this.music,t,t+0.7,note*0.98);}
    // Sparse arp — D minor pentatonic (D F A C)
    const arpGrid=[0,0,0,0,1,0,0,0, 0,0,0,1,0,0,0,0, 0,1,0,0,0,0,0,0, 0,0,0,0,0,1,0,0,
                   0,0,1,0,0,0,0,0, 0,0,0,0,1,0,0,0, 0,0,0,0,0,0,1,0, 0,0,0,0,0,0,0,0];
    const arpNotes=[146.8,174.6,220,261.6,293.7,349.2,440,523.3,440,349.2];
    if(arpGrid[s]){const n=arpNotes[s%arpNotes.length];this._osc('square',n,0.05,this.music,t,t+0.22,n*0.97);}
    // Subtle shimmer every 16 steps
    if(s===0||s===32){[880,1046,1318].forEach((f,i)=>this._osc('sine',f,0.025,this.music,t+i*0.12,t+i*0.12+0.35));}
    // Occasional low pulse texture
    if(s===16||s===48){this._osc('sawtooth',73.4,0.06,this.music,t,t+0.55,73.4*0.99);}
  },

  // ── Game beat — 138 BPM, 32-step (2-bar) loop, intensity-layered ──
  _beatGame(t,b){
    const s=b%32;
    const v=0.22+this.intensity*0.42;

    // LAYER 1 (always) — kick drum: 4-on-floor + light syncopation
    const kick=[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0];
    if(kick[s])this._osc('sine',90,v*0.95,this.music,t,t+0.18,0.01);

    // LAYER 1 — hihat (16th notes, alternating open/closed)
    {const hv=(s%2===0?0.12:0.07)*v;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
    o.type='square';o.frequency.value=8000+Math.random()*2000;f.type='highpass';f.frequency.value=7000;
    g.gain.setValueAtTime(hv,t);g.gain.exponentialRampToValueAtTime(0.0001,t+(s%2===0?0.06:0.03));
    o.connect(f);f.connect(g);g.connect(this.music);o.start(t);o.stop(t+0.1);}

    // LAYER 2 (intensity 0.2+) — snare at beats 2 and 4
    if(this.intensity>0.2&&(s===8||s===24)){
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
      o.type='square';o.frequency.value=180;f.type='highpass';f.frequency.value=2000;
      g.gain.setValueAtTime(v*0.35,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
      o.connect(f);f.connect(g);g.connect(this.music);o.start(t);o.stop(t+0.18);}

    // LAYER 2 (intensity 0.2+) — bass line Dm sawtooth
    if(this.intensity>0.2){
      const bassLine=[73.4,73.4,65.4,73.4, 65.4,65.4,58.3,65.4, 73.4,73.4,65.4,73.4, 55,65.4,73.4,65.4,
                      73.4,73.4,65.4,58.3, 49,49,55,58.3, 65.4,65.4,58.3,55, 49,55,65.4,73.4];
      const bn=bassLine[s];
      this._osc('sawtooth',bn,(this.intensity-0.2)*0.55,this.music,t,t+0.12,bn*0.99);}

    // LAYER 3 (intensity 0.45+) — melodic arp D minor
    if(this.intensity>0.45){
      const arpPat=[1,0,0,1,0,0,1,0, 0,1,0,0,1,0,0,1, 1,0,0,0,1,0,1,0, 0,0,1,0,0,1,0,0];
      const arpNotes=[220,261.6,293.7,349.2,440,349.2,293.7,261.6];
      if(arpPat[s]){const n=arpNotes[s%arpNotes.length];this._osc('square',n,(this.intensity-0.45)*0.28,this.music,t,t+0.09,n*1.001);}}

    // LAYER 4 (intensity 0.7+) — acid bass / lead
    if(this.intensity>0.7){
      const acidPat=[1,0,1,0,0,1,0,0, 1,0,0,1,0,1,0,0, 0,1,0,1,0,0,1,0, 1,0,1,0,0,0,0,1];
      if(acidPat[s]){
        const acidNotes=[146.8,174.6,146.8,130.8,110,130.8,146.8,174.6];
        const an=acidNotes[s%acidNotes.length];
        this._osc('sawtooth',an,(this.intensity-0.7)*0.45,this.music,t,t+0.07,an*1.003);}}
  },

  // ── Boss beat — 155 BPM, more aggressive ──
  _beatBoss(t,b){
    const s=b%32;
    const v=0.32+this.intensity*0.4;
    // Heavier kick — double at bar end
    const kick=[1,0,0,1,0,0,1,0, 1,0,0,0,1,0,1,0, 1,0,0,1,0,0,1,0, 1,0,1,0,1,0,0,0];
    if(kick[s])this._osc('sine',80,v,this.music,t,t+0.22,0.01);
    // Snare every 2 and 4
    if(s===8||s===24){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type='square';o.frequency.value=160;f.type='highpass';f.frequency.value=2200;g.gain.setValueAtTime(v*0.4,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.connect(f);f.connect(g);g.connect(this.music);o.start(t);o.stop(t+0.16);}
    // Driving bass (lower, more tense)
    const bassLine=[55,55,49,49,43.6,43.6,41.2,49, 55,55,49,43.6,41.2,43.6,49,55,
                    55,55,49,49,43.6,43.6,41.2,43.6, 41.2,41.2,43.6,49,55,65.4,49,43.6];
    const bn=bassLine[s];this._osc('sawtooth',bn,v*0.6,this.music,t,t+0.10,bn*0.99);
    // Rising tension notes
    if(s===0||s===16){[110,138.6,164.8].forEach((f,i)=>this._osc('sine',f,v*0.12,this.music,t+i*0.06,t+i*0.06+0.2));}
    // Aggressive hihat
    {const hv=s%2===0?v*0.18:v*0.1;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),fi=this.ctx.createBiquadFilter();o.type='square';o.frequency.value=10000;fi.type='highpass';fi.frequency.value=8000;g.gain.setValueAtTime(hv,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.04);o.connect(fi);fi.connect(g);g.connect(this.music);o.start(t);o.stop(t+0.06);}
  },

  play(type){
    if(!this.ready)return;const now=this.ctx.currentTime;
    if(type==='reflect'){this._osc('sine',660,0.22,this.sfx,now,now+0.1,1320);this._osc('sine',1320,0.08,this.sfx,now+0.04,now+0.16);}
    else if(type==='chain'){[880,1100,1320,1760].forEach((f,i)=>this._osc('sine',f,0.25-i*0.04,this.sfx,now+i*0.05,now+i*0.05+0.12));}
    else if(type==='kill'){this._osc('square',440,0.16,this.sfx,now,now+0.08,220);}
    else if(type==='death'){[120,80,50].forEach((f,i)=>this._osc('sawtooth',f,0.45,this.sfx,now+i*0.06,now+i*0.06+0.45,0.01));}
    else if(type==='powerup'){[523,659,784,1047].forEach((f,i)=>this._osc('sine',f,0.16,this.sfx,now+i*0.07,now+i*0.07+0.1));}
    else if(type==='boss'){[55,50,45,40].forEach((f,i)=>this._osc('sawtooth',f,0.55,this.sfx,now+i*0.18,now+i*0.18+0.4,0.01));}
    else if(type==='surge'){this._osc('sawtooth',200,0.38,this.sfx,now,now+0.55,2000);this._osc('sine',440,0.18,this.sfx,now+0.1,now+0.65,1760);}
    else if(type==='shield'){[880,1100,1320].forEach((f,i)=>this._osc('sine',f,0.13,this.sfx,now+i*0.05,now+i*0.05+0.08));}
    else if(type==='node'){[659,784,1047].forEach((f,i)=>this._osc('sine',f,0.2,this.sfx,now+i*0.06,now+i*0.06+0.12));}
    else if(type==='phase'){[110,90,70].forEach((f,i)=>this._osc('sawtooth',f,0.4,this.sfx,now+i*0.1,now+i*0.1+0.35,f*0.3));this._osc('sine',220,0.15,this.sfx,now,now+0.5,880);}
    else if(type==='volatile'){this._osc('sawtooth',80,0.5,this.sfx,now,now+0.4,20);this._osc('sine',160,0.3,this.sfx,now,now+0.3,40);}
    else if(type==='split'){this._osc('square',440,0.2,this.sfx,now,now+0.06,880);this._osc('square',440,0.2,this.sfx,now+0.1,now+0.16,880);}
    else if(type==='fragment'){this._osc('sine',1047,0.12,this.sfx,now,now+0.12);this._osc('sine',1319,0.1,this.sfx,now+0.08,now+0.2);}
    else if(type==='archetype'){[523,659,784,1047,1319].forEach((f,i)=>this._osc('sine',f,0.18-i*0.02,this.sfx,now+i*0.06,now+i*0.06+0.14));}
    else if(type==='rage'){this._osc('sawtooth',60,0.5,this.sfx,now,now+0.8,600);this._osc('sine',440,0.25,this.sfx,now+0.2,now+0.9,880);this._osc('sawtooth',120,0.35,this.sfx,now+0.4,now+1.0,240);}
    else if(type==='echo_hit'){this._osc('sine',880,0.08,this.sfx,now,now+0.05,440);}
    else if(type==='modifier'){[220,180].forEach((f,i)=>this._osc('sawtooth',f,0.3,this.sfx,now+i*0.15,now+i*0.15+0.25,f*0.4));}
    else if(type==='install'){this._osc('square',660,0.15,this.sfx,now,now+0.06);this._osc('sine',880,0.2,this.sfx,now+0.06,now+0.18);this._osc('sine',1100,0.15,this.sfx,now+0.14,now+0.26);}
  },
  setVolume(type,v){if(!this.ready)return;if(type==='music'&&this.music)this.music.gain.setTargetAtTime(v,this.ctx.currentTime,0.2);if(type==='sfx'&&this.sfx)this.sfx.gain.setTargetAtTime(v,this.ctx.currentTime,0.2);},
  setIntensity(v){this.intensity=Math.max(0,Math.min(1,v));}
};
