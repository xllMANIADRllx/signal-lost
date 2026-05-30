// ═══════════════════════════════════════════════════════════
// CRT SYSTEM — Scanlines, glitch effects, custom cursor
// Retina display aware — renders at full device pixel ratio
// ═══════════════════════════════════════════════════════════

const CRT = {
  canvas:   null,
  ctx:      null,
  t:        0,
  glitchT:  0,
  inGame:   false,
  suppress: false,
  mx:       0,
  my:       0,
  _dpr:     1,

  init() {
    this.canvas = document.getElementById('crt');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this._dpr = window.devicePixelRatio || 1;
    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
    this._loop();
  },

  // ── Resize — Retina aware ──
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this._dpr  = dpr;
    const w    = window.innerWidth;
    const h    = window.innerHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  glitch(d = 0.3) { this.glitchT = d; },

  _loop() {
    requestAnimationFrame(() => this._loop());
    this.t      += 0.016;
    this.glitchT = Math.max(0, this.glitchT - 0.016);

    const c = this.ctx;
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.clearRect(0, 0, W, H);

    // Heavy post-process passes (scanlines, vignette, chromatic, border) only
    // render in GameScene — menu scenes set inGame=false so they skip these
    // and only the cursor/crosshair (below) is drawn.
    if (Settings.get('crt') && !this.suppress && this.inGame) {
      // Scanlines
      for (let y = 0; y < H; y += 3) {
        c.fillStyle = 'rgba(0,0,0,0.14)';
        c.fillRect(0, y, W, 1.5);
      }

      // Vignette
      if (Settings.get('vignette')) {
        const vg = c.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,8,0.52)');
        c.fillStyle = vg;
        c.fillRect(0, 0, W, H);
      }

      // Glitch lines
      if (this.glitchT > 0 || Math.random() < 0.004) {
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
          const y = Math.random() * H;
          const h = 1 + Math.random() * 5;
          c.fillStyle = `rgba(0,245,255,${0.03 + Math.random() * 0.07})`;
          c.fillRect(0, y, W, h);
          if (Math.random() < 0.4) {
            const sw = 40 + Math.random() * 160;
            const sx = Math.random() * (W - sw);
            c.fillStyle = 'rgba(255,20,60,0.05)';  c.fillRect(sx + 3, y, sw, h);
            c.fillStyle = 'rgba(0,200,255,0.05)';  c.fillRect(sx - 3, y, sw, h);
          }
        }
      }

      // Chromatic aberration edges
      const ca = c.createLinearGradient(0, 0, W, 0);
      ca.addColorStop(0,    'rgba(255,0,50,0.04)');
      ca.addColorStop(0.05, 'rgba(0,0,0,0)');
      ca.addColorStop(0.95, 'rgba(0,0,0,0)');
      ca.addColorStop(1,    'rgba(0,160,255,0.04)');
      c.fillStyle = ca; c.fillRect(0, 0, W, H);

      // Border
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.lineWidth   = 24;
      c.strokeRect(0, 0, W, H);
    }

    // Screen tear on heavy glitch
    if (this.glitchT > 0.15) {
      const strips = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < strips; i++) {
        const sy    = Math.random() * H;
        const sh    = 4 + Math.random() * 20;
        const shift = (Math.random() - 0.5) * 40;
        // Use physical pixels for getImageData
        const pdpr = this._dpr;
        const imgData = c.getImageData(0, sy * pdpr, W * pdpr, sh * pdpr);
        c.putImageData(imgData, shift, sy);
      }
    }

    // ── Custom targeting bracket cursor ──
    const mx     = this.mx;
    const my     = this.my;
    const pulse  = 0.6 + 0.35 * Math.sin(this.t * 3);
    const glitch = this.glitchT > 0.05;
    const gx     = glitch ? (Math.random() - 0.5) * 6 : 0;
    const cx2    = mx + gx;
    const cy2    = my;
    const col    = this.inGame
      ? `rgba(0,245,255,${pulse})`
      : `rgba(0,200,80,${pulse * 0.8})`;
    const dimCol = this.inGame
      ? `rgba(0,245,255,${pulse * 0.35})`
      : `rgba(0,200,80,${pulse * 0.25})`;
    const bSize  = 7;
    const bGap   = 3;

    c.save();
    c.lineWidth   = 1.5;
    c.strokeStyle = col;

    // Brackets
    c.beginPath(); c.moveTo(cx2-bGap-bSize, cy2-bGap);   c.lineTo(cx2-bGap-bSize, cy2-bGap-bSize); c.lineTo(cx2-bGap, cy2-bGap-bSize); c.stroke();
    c.beginPath(); c.moveTo(cx2+bGap+bSize, cy2-bGap);   c.lineTo(cx2+bGap+bSize, cy2-bGap-bSize); c.lineTo(cx2+bGap, cy2-bGap-bSize); c.stroke();
    c.beginPath(); c.moveTo(cx2-bGap-bSize, cy2+bGap);   c.lineTo(cx2-bGap-bSize, cy2+bGap+bSize); c.lineTo(cx2-bGap, cy2+bGap+bSize); c.stroke();
    c.beginPath(); c.moveTo(cx2+bGap+bSize, cy2+bGap);   c.lineTo(cx2+bGap+bSize, cy2+bGap+bSize); c.lineTo(cx2+bGap, cy2+bGap+bSize); c.stroke();

    // Center dot
    if (Math.sin(this.t * 6) > 0) {
      c.fillStyle = col;
      c.beginPath(); c.arc(cx2, cy2, 2, 0, Math.PI * 2); c.fill();
    }

    // Hex address label
    const hexAddr = `${Math.floor(mx).toString(16).padStart(3,'0').toUpperCase()}:${Math.floor(my).toString(16).padStart(3,'0').toUpperCase()}`;
    c.fillStyle = dimCol;
    c.font      = `8px 'Courier New', monospace`;
    c.fillText(hexAddr, cx2 + bGap + bSize + 4, cy2 - bGap - bSize + 8);

    // Occasional corruption
    if (glitch && Math.random() < 0.4) {
      const goff = (Math.random() - 0.5) * 8;
      c.strokeStyle = 'rgba(255,0,80,0.3)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx2-bGap-bSize+goff, cy2-bGap); c.lineTo(cx2-bGap-bSize+goff, cy2-bGap-bSize); c.stroke();
    }

    c.restore();
  },
};
