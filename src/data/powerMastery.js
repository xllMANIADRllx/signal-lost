// ═══════════════════════════════════════════════════════════
// POWER MASTERY — Per-power use-count → variant tiers
// Each power tracks `power_uses_<id>` (incremented by GameScene._logPowerUse).
// Thresholds: 10 uses → T1, 50 → T2, 200 → T3. Cumulative effects.
// Variants mutate the per-activation `cfg` object before the power runs.
// ═══════════════════════════════════════════════════════════

const POWER_MASTERY_THRESHOLDS = [10, 50, 200];

// Each variant: { t1, t2, t3 } where each tier is a function (cfg, scene)
// that mutates cfg or sets flags the per-power case reads.
const POWER_VARIANTS = {
  ping: {
    t1: (cfg) => { cfg.cdMult = (cfg.cdMult || 1) * 0.9; },               // CD -10%
    t2: (cfg) => { cfg.radiusMult = (cfg.radiusMult || 1) * 1.25; },      // reveal radius +25%
    t3: (cfg) => { cfg.revealBullets = true; },                            // reveals enemy bullets
  },
  emp_burst: {
    t1: (cfg) => { cfg.duration = 5; },                                    // 4s → 5s
    t2: (cfg) => { cfg.cd = 18; },                                         // 22s → 18s
    t3: (cfg) => { cfg.blindBonus = 1; },                                  // +1s screen-flash blind
  },
  null_zone: {
    t1: (cfg) => { cfg.radius = 160; },                                    // 130 → 160
    t2: (cfg) => { cfg.duration = 8; },                                    // 6s → 8s
    t3: (cfg) => { cfg.dmgPerSec = 1; },                                   // 1 dmg/s to enemies inside
  },
  overclock_surge: {
    t1: (cfg) => { cfg.duration = 5; },                                    // 4s → 5s
    t2: (cfg) => { cfg.cd = 30; },                                         // 35s → 30s
    t3: (cfg) => { cfg.dmgMult = 2; },                                     // 2× bullet dmg during surge
  },
  chain_trigger: {
    t1: (cfg) => { cfg.radiusMult = (cfg.radiusMult || 1) * 1.20; },      // +20% chain radius
    t2: (cfg) => { cfg.cd = 15; },                                         // 18s → 15s
    t3: (cfg) => { cfg.spawnReflectBullets = 2; },                         // 2 reflected bullets per detonation
  },
  ghost_step: {
    t1: (cfg) => { cfg.duration = 4; },                                    // 3s → 4s
    t2: (cfg) => { cfg.cd = 22; },                                         // 26s → 22s
    t3: (cfg) => { cfg.killNoBreak = true; },                              // kills during cloak don't break stealth
  },
  corrupt_wave: {
    t1: (cfg) => { cfg.radius = 360; },                                    // 300 → 360
    t2: (cfg) => { cfg.corruptionAdd = 3; },                               // +2 → +3
    t3: (cfg) => { cfg.cd = 32; },                                         // 38s → 32s
  },
  system_restore: {
    t1: (cfg) => { cfg.shieldBonus = 1; },                                 // +1 extra shield hit
    t2: (cfg) => { cfg.clearBossTele = true; },                            // also clears boss telegraphs
    t3: (cfg) => { cfg.invincSec = 3; },                                   // 3s invincibility on use
  },
  decoy_packet: {
    t1: (cfg) => { cfg.duration = 8; },                                    // 6s → 8s
    t2: (cfg) => { cfg.cd = 27; },                                         // 32s → 27s
    t3: (cfg) => { cfg.aoeBlast = true; },                                 // decoy explodes for AOE on expire
  },
};

function powerMasteryTier(power){
  if(typeof Save === 'undefined' || !Save.stat) return 0;
  const n = Save.stat('power_uses_' + power, 0);
  let t = 0;
  for(let i = 0; i < POWER_MASTERY_THRESHOLDS.length; i++){
    if(n >= POWER_MASTERY_THRESHOLDS[i]) t = i + 1;
  }
  return t;
}

// Mutates cfg in place — call at the top of each power activation case.
function applyPowerVariants(power, cfg){
  const v = POWER_VARIANTS[power];
  if(!v) return cfg;
  const tier = powerMasteryTier(power);
  if(tier >= 1 && v.t1) v.t1(cfg);
  if(tier >= 2 && v.t2) v.t2(cfg);
  if(tier >= 3 && v.t3) v.t3(cfg);
  return cfg;
}
