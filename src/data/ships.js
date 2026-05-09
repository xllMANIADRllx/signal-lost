// ═══ SHIPS ═══
const SHIPS = {
  ranger:  { id: 'ranger',  passiveName: 'ADAPTIVE_ROUTING',    name: 'RANGER',  color: 0x00cc66, cost: 0,    desc: 'Adaptive routing — bubble speed +5% per wave survived. Resets on death.',           passives: [],                               trailColor: 0x00cc66 },
  phantom: { id: 'phantom', passiveName: 'PHASE_SHIFT',         name: 'PHANTOM', color: 0xaa00ff, cost: 800,  desc: 'Phase shift — dashing leaves a decoy ghost for 2s. Enemies target ghost.',          passives: ['magnet'],                       trailColor: 0xaa00ff },
  inferno: { id: 'inferno', passiveName: 'OVERCLOCK_IMMUNITY',  name: 'INFERNO', color: 0xff6600, cost: 1200, desc: 'Overclock immunity — heat fills RAGE meter instead. At 100 RAGE, reflect speed ×3.', passives: ['reflect_speed', 'reflect_speed'], trailColor: 0xff4400 },
  core:    { id: 'core',    passiveName: 'REINFORCED_PACKET',   name: 'CORE',    color: 0xffd700, cost: 1800, desc: 'Reinforced packet — shield absorbs 2 hits. Auto-regenerates every 20 seconds.',      passives: ['shield'],                       trailColor: 0xffd700 },
  ghost:   { id: 'ghost',   passiveName: 'SIGNAL_ECHO',         name: 'GHOST',   color: 0xddddff, cost: 2500, desc: 'Signal echo — every reflected bullet spawns a ghost copy 0.4s later at half damage.', passives: [],                              trailColor: 0xaaaaff },
  virus:   { id: 'virus',   passiveName: 'INFECTION_SPREAD',    name: 'VIRUS',   color: 0x44ff66, cost: 3200, desc: 'Infection spread — corrupting an enemy pulses 1 corruption to nearby enemies on death.', passives: [],                            trailColor: 0x22cc44 },
};
