// ═══════════════════════════════════════════════════════════
// ASCENSION — Post-wave-20 difficulty ladder (25 levels)
// Each level adds one cumulative modifier from the table.
// Reward side scales with N: shards × (1 + 0.04N), score × (1 + 0.05N).
// Unlocked by killing CORE.BREACH at current level; max=N+1, cap 25.
// ═══════════════════════════════════════════════════════════

const ASCENSION_MAX = 25;

// Each entry mutates one slot of the per-run state object that
// `_applyAscension()` constructs. Functions take `s` (state) by ref.
const ASCENSION_MODIFIERS = [
  { lv: 1,  txt: 'Enemies move 6% faster',                                 apply: (s) => { s.diff.enemySpeedMult *= 1.06; } },
  { lv: 2,  txt: '+2 kills per wave',                                      apply: (s) => { s.killsNeededBonus += 2; } },
  { lv: 3,  txt: 'Snipers fire 8% faster',                                 apply: (s) => { s.diff.sniperInterval *= 0.92; } },
  { lv: 4,  txt: 'Player bullets deal 5% less damage',                     apply: (s) => { s.bulletDmgMult *= 0.95; } },
  { lv: 5,  txt: 'Bubble overheats 10% sooner',                            apply: (s) => { s.overheatPctMult += 0.10; } },
  { lv: 6,  txt: 'Enemies move 6% faster',                                 apply: (s) => { s.diff.enemySpeedMult *= 1.06; } },
  { lv: 7,  txt: '+2 kills per wave',                                      apply: (s) => { s.killsNeededBonus += 2; } },
  { lv: 8,  txt: 'Snipers fire 8% faster',                                 apply: (s) => { s.diff.sniperInterval *= 0.92; } },
  { lv: 9,  txt: 'Bosses gain +1 phase iteration',                         apply: (s) => { s.bossPhaseBonus += 1; } },
  { lv: 10, txt: 'Player bullets deal 5% less damage',                     apply: (s) => { s.bulletDmgMult *= 0.95; } },
  { lv: 11, txt: 'Enemies move 6% faster',                                 apply: (s) => { s.diff.enemySpeedMult *= 1.06; } },
  { lv: 12, txt: 'Bubble cools 15% slower',                                apply: (s) => { s.diff.heatCoolRate *= 0.85; } },
  { lv: 13, txt: '+2 kills per wave',                                      apply: (s) => { s.killsNeededBonus += 2; } },
  { lv: 14, txt: 'Power cooldowns +10%',                                   apply: (s) => { s.powerCdMult *= 1.10; } },
  { lv: 15, txt: 'Bubble overheats 10% sooner',                            apply: (s) => { s.overheatPctMult += 0.10; } },
  { lv: 16, txt: 'Enemies move 6% faster',                                 apply: (s) => { s.diff.enemySpeedMult *= 1.06; } },
  { lv: 17, txt: 'Elite spawn chance +8%',                                 apply: (s) => { s.eliteChanceBonus += 0.08; } },
  { lv: 18, txt: 'Snipers fire 8% faster',                                 apply: (s) => { s.diff.sniperInterval *= 0.92; } },
  { lv: 19, txt: '+2 kills per wave',                                      apply: (s) => { s.killsNeededBonus += 2; } },
  { lv: 20, txt: 'Boss HP +15%',                                           apply: (s) => { s.bossHpMult *= 1.15; } },
  { lv: 21, txt: 'Player bullets deal 5% less damage',                     apply: (s) => { s.bulletDmgMult *= 0.95; } },
  { lv: 22, txt: 'Power cooldowns +10%',                                   apply: (s) => { s.powerCdMult *= 1.10; } },
  { lv: 23, txt: 'Enemies move 6% faster',                                 apply: (s) => { s.diff.enemySpeedMult *= 1.06; } },
  { lv: 24, txt: 'Bubble overheats 10% sooner',                            apply: (s) => { s.overheatPctMult += 0.10; } },
  { lv: 25, txt: 'Wave 1 starts with a random wave-modifier active',       apply: (s) => { s.startWaveModRoll = true; } },
];

// Reward scaling — applied multiplicatively on top of meta + difficulty multis
function ascensionRewardMults(N){
  return {
    score:  1 + 0.05 * N,
    shards: 1 + 0.04 * N,
  };
}

// Compose active modifier text for level N — used in UI tooltip
function ascensionActiveModifiers(N){
  if(N <= 0) return [];
  return ASCENSION_MODIFIERS.slice(0, N).map(m => `A${m.lv}: ${m.txt}`);
}
