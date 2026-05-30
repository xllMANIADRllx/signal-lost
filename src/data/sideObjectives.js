// ═══════════════════════════════════════════════════════════
// SIDE OBJECTIVES — Per-run mini-goals
// 1-2 drawn at run start (3 at A≥5, 4 at A≥15). Reward scales
// with ascension level. Predicates run against the same
// checkData snapshot as daily challenges.
// ═══════════════════════════════════════════════════════════

const SIDE_OBJECTIVES = [
  // Combat
  { id:'obj_chain_master', cat:'COMBAT',  label:'CHAIN MASTER',   desc:'Trigger 3 chain reactions',           check:(d)=> (d.chainReactions||0) >= 3,       reward: 80 },
  { id:'obj_reflect_4',    cat:'COMBAT',  label:'PACKET STORM',   desc:'Reflect 40 bullets total',            check:(d)=> (d.totalReflects||0) >= 40,       reward: 60 },
  { id:'obj_streak_8',     cat:'COMBAT',  label:'KILL STREAK 8',  desc:'Kill streak of 8 within combo window',check:(d)=> (d.killStreak5||0) >= 8,          reward: 70 },
  { id:'obj_corrupt_5',    cat:'COMBAT',  label:'CORRUPT 5',      desc:'Corrupt 5 enemies',                   check:(d)=> (d.totalCorrupted||0) >= 5,       reward: 60 },

  // Survival
  { id:'obj_no_shield',    cat:'SURVIVE', label:'NAKED RUN',      desc:'Clear wave 10 without using shield',  check:(d)=> (d.wave||0) >= 10 && !d.usedShield, reward: 80 },
  { id:'obj_no_overheat',  cat:'SURVIVE', label:'COOL HEAD',      desc:'Clear 5 waves without bubble overheat',check:(d)=> (d.wavesNoOverheat||0) >= 5,     reward: 60 },
  { id:'obj_boss_clean',   cat:'SURVIVE', label:'UNTOUCHED',      desc:'Beat a boss without taking damage',   check:(d)=> !!d.bossNoDamage,                  reward: 100 },
  { id:'obj_perfect_w3',   cat:'SURVIVE', label:'PERFECT W3',     desc:'Wave 3 with no damage taken',         check:(d)=> !!d.perfectWave3,                  reward: 50 },

  // Exploration
  { id:'obj_use_power_5',  cat:'EXPLORE', label:'POWER USER',     desc:'Use active power 5 times',            check:(d)=> (d.powerUsesTotal||0) >= 5,       reward: 50 },
  { id:'obj_volatile_3',   cat:'EXPLORE', label:'PYROMANCER',     desc:'Trigger 3 volatile explosions',        check:(d)=> (d.volatileExplosions||0) >= 3,   reward: 60 },
  { id:'obj_combo_25',     cat:'EXPLORE', label:'COMBO 25',       desc:'Reach combo ×25',                     check:(d)=> (d.maxCombo||0) >= 25,            reward: 70 },
  { id:'obj_surge_2',      cat:'EXPLORE', label:'SURGE TRIGGER',  desc:'Activate 2 wave surges',              check:(d)=> (d.surgeFires||0) >= 2,           reward: 50 },
];

// Fisher-Yates pick `count` objectives at random from the pool
function drawSideObjectives(count){
  const pool = SIDE_OBJECTIVES.slice();
  for(let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, Math.min(count, pool.length)));
}
