// ═══════════════════════════════════════════════════════════
// SETTINGS — User preferences with localStorage persistence
// ═══════════════════════════════════════════════════════════

const Settings = {
  _defaults: {
    music:            0.35,
    sfx:              0.8,
    shake:            true,
    crt:              true,
    voice:            true,
    smooth:           true,
    vignette:         false,
    hud_scale:        1.0,
    hud_margin:       12,
    fullscreen:       true,
    crt_intensity:    0.7,
    bg_brightness:    1.0,
    particle_density: 1,      // 0=low 1=med 2=high
    color_theme:      'green', // green/cyan/red/gold
    shake_intensity:  0.7,
    voice_vol:        0.8,
    mouse_sensitivity:10,
    colorblind:       false,
    high_contrast:    false,
    ping_key:         'Space',
    surge_key:        'KeyR',
    difficulty:       'daemon', // packet/daemon/kernel
    render_scale:     1,
  },

  data: {},

  get(key) {
    return this.data[key];
  },

  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem('sl_cfg', JSON.stringify(this.data)); } catch {}
  },

  load() {
    this.data = { ...this._defaults };
    try {
      const saved = JSON.parse(localStorage.getItem('sl_cfg') || '{}');
      Object.assign(this.data, saved);
    } catch {}
  },

  reset() {
    this.data = { ...this._defaults };
    try { localStorage.removeItem('sl_cfg'); } catch {}
  },
};

Settings.load();
