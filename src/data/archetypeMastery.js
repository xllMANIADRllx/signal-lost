// ═══════════════════════════════════════════════════════════
// ARCHETYPE MASTERY — Per-archetype tier ladder
// Driven by `arch_<id>_total_bosses` stat (already tracked
// at GameScene.js:3258, end-of-run persist).
// Tiers stack cumulatively when active archetype is played.
// ═══════════════════════════════════════════════════════════

const MASTERY_TIERS = [
  { tier: 1, bossKills: 5,   label: 'INITIATE',    bonus: '+5% score' },
  { tier: 2, bossKills: 15,  label: 'OPERATOR',    bonus: '+10% shard pickup' },
  { tier: 3, bossKills: 35,  label: 'VETERAN',     bonus: '+1 starting SYSTEM_RESTORE charge' },
  { tier: 4, bossKills: 70,  label: 'ASCENDANT',   bonus: '+5% bullet damage' },
  { tier: 5, bossKills: 100, label: 'MYTH',        bonus: 'capstone: +10% score · +10% shards (requires CORE.BREACH kill with this archetype)' },
];

// Returns the tier number (0-5) for an archetype id.
// T5 requires both 100 boss kills AND `arch_<id>_breached` meta flag (set on CORE.BREACH kill).
// Legacy `arch_mastery_<id>` meta flag grants T1 free for backwards-compat with the old wave-10 flat mastery flag.
function computeArchetypeTier(archId){
  const boss = (typeof Save !== 'undefined' && Save.stat) ? Save.stat('arch_'+archId+'_total_bosses', 0) : 0;
  const breached = (typeof Save !== 'undefined' && Save.hasMeta) ? Save.hasMeta('arch_'+archId+'_breached') : false;
  const legacy = (typeof Save !== 'undefined' && Save.hasMeta) ? Save.hasMeta('arch_mastery_'+archId) : false;
  let tier = 0;
  if(boss >= 5 || legacy) tier = 1;
  if(boss >= 15) tier = 2;
  if(boss >= 35) tier = 3;
  if(boss >= 70) tier = 4;
  if(boss >= 100 && breached) tier = 5;
  return tier;
}

// Returns the next tier object (or null if already maxed) and the boss-kill count needed.
function nextMasteryTier(archId){
  const cur = computeArchetypeTier(archId);
  if(cur >= 5) return null;
  return MASTERY_TIERS[cur]; // MASTERY_TIERS is 0-indexed: index 0 = T1, so next-tier-after-cur is MASTERY_TIERS[cur]
}
