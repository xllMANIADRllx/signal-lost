// ═══════════════════════════════════════════════════════════
// WORLD STATE — Derives a "stage" from player progression
// signals (boss kills, ascension max, CORE.BREACH cleared).
// Used by MenuScene to gradually unlock log templates +
// shift the background grid color as the player advances.
// ═══════════════════════════════════════════════════════════

const WorldState = {
  compute(){
    return {
      bossKills:    (typeof Save !== 'undefined' && Save.stat) ? Save.stat('boss_kills', 0) : 0,
      maxWave:      (typeof Save !== 'undefined' && Save.stat) ? Save.stat('max_wave', 0)  : 0,
      ascensionMax: (typeof Save !== 'undefined' && Save.get)  ? Save.get('ascension_max', 0) : 0,
      coreBreached: (typeof Save !== 'undefined' && Save.get)  ? Save.get('forge_unlocked', false) : false,
    };
  },
  // stage 0 PRISTINE → 1 DEGRADED → 2 CORRUPTED → 3 BREACHED → 4 ASCENDED
  stage(ws){
    if(!ws) ws = this.compute();
    if(ws.ascensionMax >= 10) return 4;
    if(ws.coreBreached)       return 3;
    if(ws.bossKills >= 20)    return 2;
    if(ws.bossKills >= 5)     return 1;
    return 0;
  },
  stageLabel(s){
    return ['PRISTINE','DEGRADED','CORRUPTED','BREACHED','ASCENDED'][s||0];
  }
};

// Grid color per stage — drives MenuScene background tint
const WORLD_GRID_COLORS = [
  0x00cc66, // 0 PRISTINE — current green
  0x008866, // 1 DEGRADED — deeper teal
  0x666600, // 2 CORRUPTED — amber-corrupted
  0x660044, // 3 BREACHED — magenta-breach
  0x440066, // 4 ASCENDED — deep violet
];
