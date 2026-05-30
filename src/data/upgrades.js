// ═══════════════════════════════════════════════════════════
// UPGRADES — In-run upgrade card pool
// Add new upgrades here — UpgradeScene picks them up automatically
// Max tier: 4
// ═══════════════════════════════════════════════════════════

const UPGRADES = {
  bubble_size: {
    name:  'RADIUS_EXPAND',
    icon:  '○',
    color: '#00aaff',
    desc:  'Warp field max radius +15px per tier. Catches more bullets simultaneously.',
  },
  bubble_speed: {
    name:  'EXPANSION_RATE',
    icon:  '⟳',
    color: '#00ff88',
    desc:  'Bubble expansion speed +70px/s. Deploy your warp field faster.',
  },
  reflect_speed: {
    name:  'REFLECT_BOOST',
    icon:  '↯',
    color: '#ff00ff',
    desc:  'Reflected bullet velocity +50% per tier. Faster bullets deal more chain damage.',
  },
  shield: {
    name:  'SHIELD_LAYER',
    icon:  '◈',
    color: '#ffdd00',
    desc:  'Generates a hex shield absorbing one hit. Stack for multiple charges.',
  },
  magnet: {
    name:  'SIGNAL_PULL',
    icon:  '⊕',
    color: '#00ffff',
    desc:  'Enemy bullets are drawn toward your bubble edge. Easier to catch stray shots.',
  },
  multishot: {
    name:  'ECHO_BURST',
    icon:  '✦',
    color: '#ff6688',
    desc:  'Each reflection spawns 2 extra vectors at ±21°. Triple your reflected output.',
  },
  slow: {
    name:  'DECAY_FIELD',
    icon:  '≋',
    color: '#aa00ff',
    desc:  'All enemy speeds reduced 25% per tier. Buys crucial reaction time in dense waves.',
  },
  score_boost: {
    name:  'DATA_HARVEST',
    icon:  '▲',
    color: '#ffaa00',
    desc:  'Score multiplier +0.5x per tier. Every kill scales exponentially.',
  },
  signal_fork: {
    name:  'SIGNAL_FORK',
    icon:  '⋔',
    color: '#00ffcc',
    desc:  'Ping emits 2 hex rings instead of 1. Second ring fires 0.35s after the first.',
  },
  packet_cache: {
    name:  'PACKET_CACHE',
    icon:  '▣',
    color: '#66cc88',
    desc:  'Reflect bullets to earn free-reflect charges: Tier 1 every 8 (3s), Tier 2 every 6 (3s), Tier 3 every 4 (4s).',
  },
  null_shield: {
    name:  'NULL_SHIELD',
    icon:  '◯',
    color: '#aaffdd',
    desc:  'Shield regenerates automatically every 25 seconds if broken.',
  },
  echo_protocol: {
    name:  'ECHO_PROTOCOL',
    icon:  '↩',
    color: '#ff88ff',
    desc:  'Reflected bullets bounce once off screen edges for a second pass.',
  },
  corrupt_data: {
    name:  'CORRUPT_DATA',
    icon:  '⚡',
    color: '#ff4444',
    desc:  'Enemy defection threshold drops from 3 hits to 2. Corrupt enemies faster.',
  },
  ghost_trace: {
    name:  'GHOST_TRACE',
    icon:  '~',
    color: '#aaaaff',
    desc:  'Your movement trail deals 1 damage/sec to enemies that walk through it.',
  },
  overclock_burst: {
    name:  'OVERCLOCK_BURST',
    icon:  '⚙',
    color: '#ff8800',
    desc:  'First reflection after bubble deploys is critical — 2x speed and 2x damage.',
  },
  signal_decay: {
    name:  'SIGNAL_DECAY',
    icon:  '↓',
    color: '#884400',
    desc:  'Enemies slow 2% per second they are alive on screen. Max -30% over time.',
  },
  firewall_breach: {
    name:  'FIREWALL_BREACH',
    icon:  '⊞',
    color: '#ff2244',
    desc:  'Memory sector locked cells fully block enemy movement, not just slow them.',
  },
  chain_amplifier: {
    name:  'CHAIN_AMPLIFIER',
    icon:  '∞',
    color: '#ffdd44',
    desc:  'Chain reaction depth +1 per tier. Default 5, max 8. Bigger cascades.',
  },
  bubble_armor: {
    name:  'BUBBLE_ARMOR',
    icon:  '⬡',
    color: '#aaffcc',
    desc:  'Bubble absorbs 1 enemy bullet before collapsing. Resets each deploy.',
  },
};
