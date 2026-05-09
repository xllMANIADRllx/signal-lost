// ═══════════════════════════════════════════════════════════
// CONFIG — Global constants and stage definitions
// ═══════════════════════════════════════════════════════════

const W = 1280;
const H = 720;

// ── Stage definitions ──
const STAGES = [
  { name: 'SURFACE_LAYER', bg: '#020804', gridCol: 0x0a2a0a, accentCol: 0x00ff66, bgStyle: 'grid'     },
  { name: 'KERNEL_SPACE',  bg: '#020408', gridCol: 0x0a1a2a, accentCol: 0x00aaff, bgStyle: 'circuit'  },
  { name: 'DEEP_MEMORY',   bg: '#080204', gridCol: 0x2a0a0a, accentCol: 0xff4444, bgStyle: 'hex'      },
  { name: 'SECTOR_00',     bg: '#040408', gridCol: 0x1a1a2a, accentCol: 0xffd700, bgStyle: 'fractal'  },
];
