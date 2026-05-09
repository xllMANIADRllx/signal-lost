// ═══ ARCHETYPES ═══
const ARCHETYPES = [
  { id: 'reflector',   name: 'REFLECTOR',   col: 0x00ffcc, icon: '↩',
    tagline: 'Pure bubble mastery. Every reflection matters.',
    desc: 'Echo Protocol active from wave 1. Bubble expands faster.',
    passive: 'Chain depth +2. Reflected bullets travel 20% faster.',
    seeds: { echo_protocol: 1, bubble_speed: 1 }, power: 'chain_trigger' },

  { id: 'corruptor',   name: 'CORRUPTOR',   col: 0x00ff88, icon: '☣',
    tagline: 'Infect everything. Turn the network against itself.',
    desc: 'Corrupt Data starts at tier 2. Enemies defect faster.',
    passive: 'Signal Decay active. Corrupted enemies spread on death.',
    seeds: { corrupt_data: 2, signal_decay: 1 }, power: 'corrupt_wave' },

  { id: 'ghost',       name: 'GHOST',       col: 0x8888ff, icon: '◌',
    tagline: 'Hit and vanish. You are the echo.',
    desc: 'Ghost Trace active from wave 1. Dash leaves damage trails.',
    passive: 'No dash cooldown below 30% bubble heat.',
    seeds: { ghost_trace: 2, bubble_speed: 1 }, power: 'ghost_step' },

  { id: 'overclocker', name: 'OVERCLOCKER', col: 0xff6600, icon: '⚡',
    tagline: 'Burn hot. Hit harder.',
    desc: 'Bubble Armor at tier 2. Heat boosts reflect speed.',
    passive: 'At 80%+ heat: reflect speed ×1.5.',
    seeds: { bubble_armor: 2, overclock_burst: 1 }, power: 'overclock_surge' },

  { id: 'fortress',    name: 'FORTRESS',    col: 0xffdd00, icon: '⬡',
    tagline: 'Immovable object. Outlast everything.',
    desc: 'Large bubble from the start. Shield has 2 hits.',
    passive: 'Shield break slows nearby enemies for 2 seconds.',
    seeds: { bubble_size: 2, shield: 1 }, power: 'null_zone' },

  { id: 'storm',       name: 'STORM',       col: 0xff4488, icon: '✦',
    tagline: 'Fill the screen. Overwhelm everything.',
    desc: 'Multishot and Signal Fork both start at tier 2.',
    passive: 'Every 5th reflection auto-fires a bonus bullet.',
    seeds: { multishot: 2, signal_fork: 2 }, power: 'emp_burst' },
];
