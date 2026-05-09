// ═══ SETTINGS ═══
const Settings = {
  data: {
    music: 0.35, sfx: 0.8, shake: true, crt: true, voice: true, smooth: true, vignette: false,
    hud_scale: 1.0, hud_margin: 12, fullscreen: false,
    crt_intensity: 0.7,
    bg_brightness: 1.0,
    particle_density: 1,
    color_theme: 'green',
    shake_intensity: 0.7,
    voice_vol: 0.8,
    mouse_sensitivity: 10,
    colorblind: false,
    high_contrast: false,
    ping_key: 'Space',
    surge_key: 'KeyR',
    difficulty: 'daemon',
    render_scale: 1,
  },
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; try { localStorage.setItem('sl_cfg', JSON.stringify(this.data)); } catch {} },
  load() { try { const d = JSON.parse(localStorage.getItem('sl_cfg') || '{}'); Object.assign(this.data, d); } catch {} },
};
Settings.load();
