// ═══════════════════════════════════════════════════════════
// META UPGRADES — Permanent upgrades purchased with fragments
// Add new meta upgrades here
// ═══════════════════════════════════════════════════════════

const META_UPGRADES = [
  {
    id:   'redundant_buf',
    label: 'REDUNDANT_BUFFER',
    cost:  4,
    col:   0x00ffcc,
    desc:  'Start every run with shield active (1 hit)',
  },
  {
    id:   'signal_amp',
    label: 'SIGNAL_AMPLIFIER',
    cost:  8,
    col:   0x00ff88,
    desc:  'Reflected bullets deal ×1.5 damage',
  },
  {
    id:   'heat_sink',
    label: 'HEAT_SINK',
    cost:  4,
    col:   0xff6600,
    desc:  'Bubble heat dissipates 20% faster',
  },
  {
    id:   'packet_router',
    label: 'PACKET_ROUTER',
    cost:  8,
    col:   0x4488ff,
    desc:  'Ping power cooldown -5 seconds',
  },
  {
    id:   'overclock_chip',
    label: 'OVERCLOCK_CHIP',
    cost:  6,
    col:   0xff4400,
    desc:  'Start each run with OVERCLOCK_BURST tier 1',
  },
  {
    id:   'ghost_protocol',
    label: 'GHOST_PROTOCOL',
    cost:  6,
    col:   0x8888ff,
    desc:  'Start each run with GHOST_TRACE tier 1',
  },
  {
    id:   'data_compress',
    label: 'DATA_COMPRESS',
    cost:  8,
    col:   0xddcc55,
    desc:  'Shards earned +25% permanently',
  },
  {
    id:   'kernel_access',
    label: 'KERNEL_ACCESS',
    cost:  12,
    col:   0xff2244,
    desc:  '4th upgrade card offered after each wave',
  },
  {
    id:   'primed_signal',
    label: 'PRIMED_SIGNAL',
    cost:  4,
    col:   0xaaffdd,
    desc:  'Start wave 1 with signal meter 50% full',
  },
  {
    id:   'redundant_path',
    label: 'REDUNDANT_PATH',
    cost:  10,
    col:   0xffdd44,
    desc:  'Survive one death per run (extra life)',
  },
  {
    id:   'slow_combo',
    label: 'SLOW_COMBO',
    cost:  4,
    col:   0xff88cc,
    desc:  'Combo timer lasts 4s instead of 3s',
  },
  {
    id:   'start_shield',
    label: 'START_SHIELD',
    cost:  4,
    col:   0x44ffcc,
    desc:  'Start every run with 1 shield hit',
  },
  {
    id:   'start_score',
    label: 'SCORE_SEED',
    cost:  6,
    col:   0xffaa00,
    desc:  'Begin every run with score multiplier ×1.25',
  },
];
