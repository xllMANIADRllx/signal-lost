// ═══ ENEMY MUTATIONS ═══
const ENEMY_MUTATIONS = [
  { id: 'splitting',    label: 'SPLIT',  col: 0xff6600, desc: 'On death spawns 2 swarms' },
  { id: 'magnetic',     label: 'MAGNET', col: 0x00aaff, desc: 'Pulls reflected bullets toward it' },
  { id: 'armored',      label: 'ARMOR',  col: 0xffdd00, desc: '+1 HP — takes an extra hit' },
  { id: 'volatile',     label: 'VOLAT',  col: 0xaa00ff, desc: 'Explodes on death — AoE damage' },
  { id: 'phase',        label: 'PHASE',  col: 0x88ffff, desc: 'Teleports when hit below 50% HP' },
  { id: 'mirror',       label: 'MIRR',   col: 0xffffff, desc: 'Deflects reflected bullets back' },
  { id: 'regenerating', label: 'REGEN',  col: 0x00ff88, desc: 'Slowly heals if not hit for 3s' },
  { id: 'overclocked',  label: 'OVCL',   col: 0xff4400, desc: '+50% move speed and fire rate' },
];

function _pickRunMutations() {
  const pool = [...ENEMY_MUTATIONS];
  const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [a, b];
}
