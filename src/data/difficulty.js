// ═══════════════════════════════════════════════════════════
// DIFFICULTY — Game difficulty profiles
// ═══════════════════════════════════════════════════════════

const DIFFICULTY = {
  packet: {
    label:              'PACKET',
    col:                '#00cc66',
    heatCoolRate:       65,
    enemySpeedMult:     0.8,
    sniperInterval:     1.6,
    debugCost:          [50, 150, 300],
    scoreMulti:         0.8,
    mutations:          0,
    waveModFreq:        0,    // 0 = never roll wave modifiers
    memSectorsBullets:  'enemy_only', // only block enemy bullets
    desc:               'Reduced enemy speed · Faster heat vent · Lower debug cost',
  },
  daemon: {
    label:              'DAEMON',
    col:                '#ffdd00',
    heatCoolRate:       45,
    enemySpeedMult:     1.0,
    sniperInterval:     1.3,
    debugCost:          [100, 300, 600],
    scoreMulti:         1.0,
    mutations:          1,
    waveModFreq:        4,    // every 4 waves
    memSectorsBullets:  'all',
    desc:               'Balanced · Standard experience · Recommended',
  },
  kernel: {
    label:              'KERNEL',
    col:                '#ff4444',
    heatCoolRate:       30,
    enemySpeedMult:     1.25,
    sniperInterval:     1.0,
    debugCost:          [200, 500, 1000],
    scoreMulti:         1.5,
    mutations:          2,
    waveModFreq:        2,    // every 2 waves
    memSectorsBullets:  'all_plus_player', // also slows player
    desc:               'Faster enemies · Slow heat vent · Score ×1.5',
  },
};
