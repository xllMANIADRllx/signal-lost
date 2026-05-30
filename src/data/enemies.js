// ═══════════════════════════════════════════════════════════
// ENEMIES — Enemy type definitions
// Add new enemy types here
// ═══════════════════════════════════════════════════════════

const ENEMY_TYPES = {
  grunt: {
    hp:    1,
    size:  14,
    spd:   160,
    color: 0xff3232,
    sInt:  1.8,
    desc:  'Basic enemy. Fires at player.',
  },
  sniper: {
    hp:    1,
    size:  10,
    spd:   120,
    color: 0xff8800,
    sInt:  1.3,
    desc:  'Slow, accurate long-range shots.',
  },
  tank: {
    hp:    3,
    size:  24,
    spd:   90,
    color: 0xaa0000,
    sInt:  2.5,
    desc:  'High HP, slow, heavy shots.',
  },
  swarm: {
    hp:    1,
    size:  8,
    spd:   220,
    color: 0xff00aa,
    sInt:  99,
    desc:  'Fast, no shooting. Rams player.',
  },
  rootkit: {
    hp:    1,
    size:  11,
    spd:   100,
    color: 0x00ff88,
    sInt:  2.2,
    desc:  'Corrupts nearby grid sectors.',
  },
  leech: {
    hp:    1,
    size:  12,
    spd:   130,
    color: 0x44ff44,
    sInt:  99,
    desc:  'Pursues and overloads bubble heat on contact.',
  },
  bouncer: {
    hp:    2,
    size:  18,
    spd:   70,
    color: 0x00ccff,
    sInt:  2.0,
    desc:  'Bullets bounce off walls.',
  },
  phantom: {
    hp:    1,
    size:  11,
    spd:   180,
    color: 0xcc88ff,
    sInt:  1.8,
    desc:  'Becomes invisible periodically.',
  },
  orbit_node: {
    hp:    2,
    size:  13,
    spd:   80,
    color: 0x0088ff,
    sInt:  1.6,
    desc:  'Orbits center, fires radially.',
  },
  pulsar: {
    hp:    3,
    size:  16,
    spd:   0,
    color: 0xaa44ff,
    sInt:  99,
    desc:  'Stationary. Emits pulse waves.',
  },
  drift_packet: {
    hp:    1,
    size:  10,
    spd:   280,
    color: 0x00aaaa,
    sInt:  99,
    desc:  'Very fast. Drifts unpredictably.',
  },
  memory_trap: {
    hp:    2,
    size:  14,
    spd:   0,
    color: 0xff44aa,
    sInt:  99,
    desc:  'Stationary trap. Explodes on death.',
  },
  fragment: {
    hp:    1,
    size:  11,
    spd:   200,    // scales with wave
    color: 0x44ffcc,
    sInt:  99,
    desc:  'Sector 00 enemy. Splits on death.',
  },
  core_shard: {
    hp:    2,
    size:  13,
    spd:   170,    // scales with wave
    color: 0xff2244,
    sInt:  99,
    desc:  'Deep Memory enemy. Aggressive.',
  },
  overload_node: {
    hp:    3,
    size:  15,
    spd:   80,     // scales with wave
    color: 0xff8800,
    sInt:  99,
    desc:  'Kernel Space enemy. Overloads on death.',
  },
};

// ── Enemy mutations (applied per-run, per-enemy mechanical effects only) ──
// Wave-level effects (+HP, +Speed, AoE-on-death) live in waveModifier pool instead.
const ENEMY_MUTATIONS = [
  { id: 'magnetic',     label: 'MAGNET', col: 0x00aaff, desc: 'Pulls reflected bullets toward it' },
  { id: 'phase',        label: 'PHASE',  col: 0x88ffff, desc: 'Teleports when hit below 50% HP' },
  { id: 'mirror',       label: 'MIRR',   col: 0xffffff, desc: 'Deflects reflected bullets back' },
  { id: 'regenerating', label: 'REGEN',  col: 0x00ff88, desc: 'Slowly heals if not hit for 3s' },
];

// -- Legacy alias used by GameScene (defaults to 1 mutation if called without count)
function _pickRunMutations(count) {
  return pickRunMutations(count);
}

function pickRunMutations(count = 1) {
  if (count <= 0) return [];
  const pool = [...ENEMY_MUTATIONS];
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
