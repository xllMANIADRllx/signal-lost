// ═══════════════════════════════════════════════════════════
// SHIPS — Playable chassis definitions
// Add new ships here — shop picks them up automatically
// ═══════════════════════════════════════════════════════════

const SHIPS = {
  ranger: {
    id:          'ranger',
    name:        'RANGER',
    passiveName: 'ADAPTIVE_ROUTING',
    color:       0x00cc66,
    trailColor:  0x00cc66,
    cost:        0,
    passives:    [],
    desc:        'Adaptive routing — bubble speed +5% per wave survived. Resets on death.',
  },
  phantom: {
    id:          'phantom',
    name:        'PHANTOM',
    passiveName: 'PHASE_SHIFT',
    color:       0xaa00ff,
    trailColor:  0xaa00ff,
    cost:        800,
    passives:    ['magnet'],
    desc:        'Phase shift — dashing leaves a decoy ghost for 2s. Enemies target ghost.',
  },
  inferno: {
    id:          'inferno',
    name:        'INFERNO',
    passiveName: 'OVERCLOCK_IMMUNITY',
    color:       0xff6600,
    trailColor:  0xff4400,
    cost:        1200,
    passives:    ['reflect_speed', 'reflect_speed'],
    desc:        'Overclock immunity — heat fills RAGE meter instead. At 100 RAGE, reflect speed ×3.',
  },
  core: {
    id:          'core',
    name:        'CORE',
    passiveName: 'REINFORCED_PACKET',
    color:       0xffd700,
    trailColor:  0xffd700,
    cost:        1800,
    passives:    ['shield'],
    desc:        'Reinforced packet — shield absorbs 2 hits. Auto-regenerates every 20 seconds.',
  },
  ghost: {
    id:          'ghost',
    name:        'GHOST',
    passiveName: 'SIGNAL_ECHO',
    color:       0xddddff,
    trailColor:  0xaaaaff,
    cost:        2500,
    passives:    [],
    desc:        'Signal echo — every reflected bullet spawns a ghost copy 0.4s later at half damage.',
  },
  virus: {
    id:          'virus',
    name:        'VIRUS',
    passiveName: 'INFECTION_SPREAD',
    color:       0x44ff66,
    trailColor:  0x22cc44,
    cost:        3200,
    passives:    [],
    desc:        'Infection spread — corrupting an enemy pulses 1 corruption to nearby enemies on death.',
  },
};
