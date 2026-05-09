// ═══════════════════════════════════════════════════════════
// AUDIO SYSTEM — Procedural music + SFX
// To add real music tracks: load MP3s via this.music.load()
// and call Snd.playTrack('trackName') to switch
// ═══════════════════════════════════════════════════════════

const Snd = {
  ctx:         null,
  master:      null,
  music:       null,
  sfx:         null,
  beat:        0,
  nextBeat:    0,
  bpm:         70,
  ready:       false,
  intensity:   0,
  _mode:       'menu', // 'menu' | 'game' | 'boss'
  _padNodes:   [],
  _schedTimer: null,

  // ── Initialise audio context ──
  init() {
    if (this.ready) return;
    this.ready = true;
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.65; this.master.connect(this.ctx.destination);
    this.music  = this.ctx.createGain(); this.music.gain.value  = Settings.get('music'); this.music.connect(this.master);
    this.sfx    = this.ctx.createGain(); this.sfx.gain.value    = Settings.get('sfx');   this.sfx.connect(this.master);
    this._startMenuMusic();
    this._sched();
  },

  // ── Oscillator helper ──
  _osc(type, freq, vol, dest, t0, t1, fEnd) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t1);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t1);
  },

  // ── Persistent pad oscillator ──
  _pad(freqs, vol, attack, dest) {
    const nodes = [];
    freqs.forEach(f => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 800; filt.Q.value = 0.8;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
      o.connect(filt); filt.connect(g); g.connect(dest); o.start();
      nodes.push({ o, g });
    });
    return nodes;
  },

  _stopNodes(nodes) {
    if (!nodes) return;
    nodes.forEach(n => {
      try {
        n.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        setTimeout(() => { try { n.o.stop(); } catch {} }, 1200);
      } catch {}
    });
  },

  // ── MENU MUSIC — atmospheric D minor drone ──
  _startMenuMusic() {
    this._mode = 'menu'; this.bpm = 70; this.beat = 0;
    this._stopNodes(this._padNodes);
    const subFilt = this.ctx.createBiquadFilter(); subFilt.type = 'lowpass'; subFilt.frequency.value = 120;
    const subG   = this.ctx.createGain(); subG.gain.value = 0.12;
    const subOsc = this.ctx.createOscillator(); subOsc.type = 'sine'; subOsc.frequency.value = 36.7;
    const subLFO = this.ctx.createOscillator();
    const subLG  = this.ctx.createGain(); subLFO.frequency.value = 0.08; subLG.gain.value = 4;
    subLFO.connect(subLG); subLG.connect(subOsc.frequency);
    subOsc.connect(subFilt); subFilt.connect(subG); subG.connect(this.music);
    subOsc.start(); subLFO.start();
    this._padNodes = this._pad([146.8, 174.6, 220, 261.6], 0.04, 3.5, this.music);
    this._subOsc = subOsc; this._subLFO = subLFO; this._subG = subG;
  },

  _stopMenuMusic() {
    try { this._subG && this._subG.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); } catch {}
    this._stopNodes(this._padNodes);
    this._padNodes = [];
  },

  startGameMusic() {
    if (!this.ready) return;
    this._stopMenuMusic();
    this._mode = 'game'; this.bpm = 138; this.beat = 0;
  },

  startBossMusic() {
    if (!this.ready || this._mode === 'boss') return;
    this._mode = 'boss'; this.bpm = 155; this.beat = 0;
    this._stopNodes(this._padNodes); this._padNodes = [];
  },

  stopBossMusic() {
    if (!this.ready || this._mode !== 'boss') return;
    this._mode = 'game'; this.bpm = 138;
  },

  returnToMenu() {
    if (!this.ready) return;
    this._mode = 'menu'; this.bpm = 70; this.beat = 0;
    this._startMenuMusic();
  },

  // Legacy alias used by GameScene
  _startMenuMusic_resume() {
    this.returnToMenu();
  },

  // ── Beat scheduler ──
  _sched() {
    const run = () => {
      if (!this.ctx) return;
      const iv  = (60 / this.bpm) / 4;
      const now = this.ctx.currentTime;
      while (this.nextBeat < now + 0.12) {
        this._beat(this.nextBeat, this.beat % 64);
        this.nextBeat += iv;
        this.beat++;
      }
      this._schedTimer = setTimeout(run, 20);
    };
    this.nextBeat = this.ctx.currentTime;
    run();
  },

  _beat(t, b) {
    if (this._mode === 'menu') this._beatMenu(t, b);
    else if (this._mode === 'game') this._beatGame(t, b);
    else if (this._mode === 'boss') this._beatBoss(t, b);
  },

  // ── Menu beat — 70 BPM atmospheric ──
  _beatMenu(t, b) {
    const s = b % 64;
    const bassSeq = [36.7, 36.7, 32.7, 32.7, 29.1, 29.1, 32.7, 32.7];
    if (s % 8 === 0) { const note = bassSeq[Math.floor(s / 8) % bassSeq.length]; this._osc('sine', note, 0.18, this.music, t, t + 0.7, note * 0.98); }
    const arpGrid  = [0,0,0,0,1,0,0,0, 0,0,0,1,0,0,0,0, 0,1,0,0,0,0,0,0, 0,0,0,0,0,1,0,0, 0,0,1,0,0,0,0,0, 0,0,0,0,1,0,0,0, 0,0,0,0,0,0,1,0, 0,0,0,0,0,0,0,0];
    const arpNotes = [146.8, 174.6, 220, 261.6, 293.7, 349.2, 440, 523.3, 440, 349.2];
    if (arpGrid[s]) { const n = arpNotes[s % arpNotes.length]; this._osc('square', n, 0.05, this.music, t, t + 0.22, n * 0.97); }
    if (s === 0 || s === 32) { [880, 1046, 1318].forEach((f, i) => this._osc('sine', f, 0.025, this.music, t + i * 0.12, t + i * 0.12 + 0.35)); }
    if (s === 16 || s === 48) { this._osc('sawtooth', 73.4, 0.06, this.music, t, t + 0.55, 73.4 * 0.99); }
  },

  // ── Game beat — 138 BPM intensity-layered ──
  _beatGame(t, b) {
    const s = b % 32;
    const v = 0.22 + this.intensity * 0.42;
    const kick = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0];
    if (kick[s]) this._osc('sine', 90, v * 0.95, this.music, t, t + 0.18, 0.01);
    { const hv = (s % 2 === 0 ? 0.12 : 0.07) * v; const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); o.type = 'square'; o.frequency.value = 8000 + Math.random() * 2000; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(hv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (s % 2 === 0 ? 0.06 : 0.03)); o.connect(f); f.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.1); }
    if (this.intensity > 0.2 && (s === 8 || s === 24)) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); o.type = 'square'; o.frequency.value = 180; f.type = 'highpass'; f.frequency.value = 2000; g.gain.setValueAtTime(v * 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(f); f.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.18); }
    if (this.intensity > 0.2) { const bassLine = [73.4,73.4,65.4,73.4,65.4,65.4,58.3,65.4,73.4,73.4,65.4,73.4,55,65.4,73.4,65.4,73.4,73.4,65.4,58.3,49,49,55,58.3,65.4,65.4,58.3,55,49,55,65.4,73.4]; this._osc('sawtooth', bassLine[s], (this.intensity - 0.2) * 0.55, this.music, t, t + 0.12, bassLine[s] * 0.99); }
    if (this.intensity > 0.45) { const arpPat = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0]; const arpNotes = [220,261.6,293.7,349.2,440,349.2,293.7,261.6]; if (arpPat[s]) { const n = arpNotes[s % arpNotes.length]; this._osc('square', n, (this.intensity - 0.45) * 0.28, this.music, t, t + 0.09, n * 1.001); } }
    if (this.intensity > 0.7) { const acidPat = [1,0,1,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,1,0,0,0,0,1]; if (acidPat[s]) { const acidNotes = [146.8,174.6,146.8,130.8,110,130.8,146.8,174.6]; const an = acidNotes[s % acidNotes.length]; this._osc('sawtooth', an, (this.intensity - 0.7) * 0.45, this.music, t, t + 0.07, an * 1.003); } }
  },

  // ── Boss beat — 155 BPM aggressive ──
  _beatBoss(t, b) {
    const s = b % 32;
    const v = 0.32 + this.intensity * 0.4;
    const kick = [1,0,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0];
    if (kick[s]) this._osc('sine', 80, v, this.music, t, t + 0.22, 0.01);
    if (s === 8 || s === 24) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); o.type = 'square'; o.frequency.value = 160; f.type = 'highpass'; f.frequency.value = 2200; g.gain.setValueAtTime(v * 0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(f); f.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.16); }
    const bassLine = [55,55,49,49,43.6,43.6,41.2,49,55,55,49,43.6,41.2,43.6,49,55,55,55,49,49,43.6,43.6,41.2,43.6,41.2,41.2,43.6,49,55,65.4,49,43.6];
    this._osc('sawtooth', bassLine[s], v * 0.6, this.music, t, t + 0.10, bassLine[s] * 0.99);
    if (s === 0 || s === 16) { [110, 138.6, 164.8].forEach((f, i) => this._osc('sine', f, v * 0.12, this.music, t + i * 0.06, t + i * 0.06 + 0.2)); }
    { const hv = s % 2 === 0 ? v * 0.18 : v * 0.1; const o = this.ctx.createOscillator(), g = this.ctx.createGain(), fi = this.ctx.createBiquadFilter(); o.type = 'square'; o.frequency.value = 10000; fi.type = 'highpass'; fi.frequency.value = 8000; g.gain.setValueAtTime(hv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); o.connect(fi); fi.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.06); }
  },

  // ── SFX ──
  play(type) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const sfx = this.sfx;
    switch (type) {
      case 'reflect':   this._osc('sine', 660, 0.22, sfx, now, now + 0.1, 1320); this._osc('sine', 1320, 0.08, sfx, now + 0.04, now + 0.16); break;
      case 'chain':     [880,1100,1320,1760].forEach((f,i) => this._osc('sine', f, 0.25 - i * 0.04, sfx, now + i * 0.05, now + i * 0.05 + 0.12)); break;
      case 'kill':      this._osc('square', 440, 0.16, sfx, now, now + 0.08, 220); break;
      case 'death':     [120,80,50].forEach((f,i) => this._osc('sawtooth', f, 0.45, sfx, now + i * 0.06, now + i * 0.06 + 0.45, 0.01)); break;
      case 'powerup':   [523,659,784,1047].forEach((f,i) => this._osc('sine', f, 0.16, sfx, now + i * 0.07, now + i * 0.07 + 0.1)); break;
      case 'boss':      [55,50,45,40].forEach((f,i) => this._osc('sawtooth', f, 0.55, sfx, now + i * 0.18, now + i * 0.18 + 0.4, 0.01)); break;
      case 'surge':     this._osc('sawtooth', 200, 0.38, sfx, now, now + 0.55, 2000); this._osc('sine', 440, 0.18, sfx, now + 0.1, now + 0.65, 1760); break;
      case 'shield':    [880,1100,1320].forEach((f,i) => this._osc('sine', f, 0.13, sfx, now + i * 0.05, now + i * 0.05 + 0.08)); break;
      case 'node':      [659,784,1047].forEach((f,i) => this._osc('sine', f, 0.2, sfx, now + i * 0.06, now + i * 0.06 + 0.12)); break;
      case 'phase':     [110,90,70].forEach((f,i) => this._osc('sawtooth', f, 0.4, sfx, now + i * 0.1, now + i * 0.1 + 0.35, f * 0.3)); this._osc('sine', 220, 0.15, sfx, now, now + 0.5, 880); break;
      case 'volatile':  this._osc('sawtooth', 80, 0.5, sfx, now, now + 0.4, 20); this._osc('sine', 160, 0.3, sfx, now, now + 0.3, 40); break;
      case 'split':     this._osc('square', 440, 0.2, sfx, now, now + 0.06, 880); this._osc('square', 440, 0.2, sfx, now + 0.1, now + 0.16, 880); break;
      case 'fragment':  this._osc('sine', 1047, 0.12, sfx, now, now + 0.12); this._osc('sine', 1319, 0.1, sfx, now + 0.08, now + 0.2); break;
      case 'archetype': [523,659,784,1047,1319].forEach((f,i) => this._osc('sine', f, 0.18 - i * 0.02, sfx, now + i * 0.06, now + i * 0.06 + 0.14)); break;
      case 'rage':      this._osc('sawtooth', 60, 0.5, sfx, now, now + 0.8, 600); this._osc('sine', 440, 0.25, sfx, now + 0.2, now + 0.9, 880); this._osc('sawtooth', 120, 0.35, sfx, now + 0.4, now + 1.0, 240); break;
      case 'echo_hit':  this._osc('sine', 880, 0.08, sfx, now, now + 0.05, 440); break;
      case 'modifier':  [220,180].forEach((f,i) => this._osc('sawtooth', f, 0.3, sfx, now + i * 0.15, now + i * 0.15 + 0.25, f * 0.4)); break;
      case 'install':   this._osc('square', 660, 0.15, sfx, now, now + 0.06); this._osc('sine', 880, 0.2, sfx, now + 0.06, now + 0.18); this._osc('sine', 1100, 0.15, sfx, now + 0.14, now + 0.26); break;
    }
  },

  setVolume(type, v) {
    if (!this.ready) return;
    if (type === 'music' && this.music) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
    if (type === 'sfx'   && this.sfx)   this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  },

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
  },

  // Update volumes from settings (called after settings change)
  updateVols() {
    if (!this.ready) return;
    this.setVolume('music', Settings.get('music'));
    this.setVolume('sfx', Settings.get('sfx'));
  },
};
