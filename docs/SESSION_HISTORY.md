# Session History — major changes log

Chronological summary of every meaningful change made in the long iterative session. Each section names files touched and the rationale, so future sessions can pick up cleanly.

---

## 1. Rebuild salvage — Batch 1 (META shop items)

11 META shop items ported from the abandoned `signal-lost-clean/` rebuild into the live game.

| Tab | New items |
|---|---|
| BUBBLE | `heat_vent`, `lens_focus`, `primed_bubble`, `resonance` |
| SURVIVAL | `thermal_bleed`, `last_stand`, `kinetic_damper` |
| COMBAT | `combo_memory`, `shard_doubler`, `boss_trace`, `perfect_reflect` |

Each: data entry in [ShopScene.js](../src/scenes/ShopScene.js) META array + `Save.hasMeta` read in [GameScene.js:228-241](../src/scenes/GameScene.js) cluster + effect-site wiring.

## 2. Rebuild salvage — Batch 2 (visual additions I1–I10)

9 of 10 visual additions landed (I3 deferred initially, then shipped in Phase A). All live in [GameScene.js](../src/scenes/GameScene.js).

| ID | What | Hook |
|---|---|---|
| I1 | ASCII decompile death | `_killEnemy` non-boss branch |
| I2 | Layered hex warp bubble (3 rings) | bubble render block |
| I3 | Boss attack telegraphs (4 bosses) | `_drawBoss` + 4 `_update<Boss>` |
| I4 | Modifier palette tint | `_drawGrid` bg |
| I5 | Reflect impact sparks (directional) | reflect handler + `this.particles[]` |
| I6 | Combo escalation (size/glow at ×10/×20/×50) | `_updateHUD` combo text |
| I7 | Defected enemy network thread | `_drawEnemy` defected branch |
| I8 | SURGE EQ pips | HUD surge bar |
| I9 | Foreground hex-particles | `_drawGrid` end |
| I10 | Hit-stop frames | `_hitStop` helper + 2 call sites |

## 3. Overhaul plan — 4 phases A–D

### Phase A — Readability & game feel

- **Bullet trail glow halo** at every bullet position
- **Enemy silhouette shadow** (dark offset behind each enemy)
- **Boss attack telegraphs** (the deferred I3 — finally landed across all 4 bosses)
- **Particle cap 200** (prevents flood)
- **Grunt-death particle 9→6** (less clutter)

### Phase B — Mechanical depth

- **Parry window** — 0.5s after overheat, finger-down re-deploys bubble at 40% radius with 0 heat. Wires the pre-existing dead `parryWindowT` field.
- **Enemy charge tells** on grunt + tank (yellow/red ring + 3 orbital dots before firing). Sniper has its own charge system; others fire immediately.
- **Combo-feeder waves** — wave 4/9/14 (before each boss): swarm-only, HP halved, ×3 combo gain.

### Phase C — Subtract & rework

- **LEECH rework**: visible cling pursuit + 11 heat/sec on contact (was unrelated "drain" mechanic).
- **PACKET_CACHE simplify**: every 8/6/4 reflects (tiered) → 3s/4s free-reflect window. Removed the old "5 kills in 3s" probabilistic timer.

### Phase D — Retention hooks

- **Boss-family lore unlock on kill** — first time killing each boss (`FIREWALL/VOID/GHOST/CORE`) grants a unique lore entry.
- **Wave milestones** at 5/10/15/20 → unlock lore + 50 shards.
- **Archetype mastery tracks** — `arch_<id>_runs/total_kills/total_bosses/best_wave/best_score` per archetype. Mastery flag at wave-10. Displayed via new `MASTERY` tab in CodexScene.
- **FRAGMENT_REFINERY** shop item (500 shards) — unlocks a 5◈→1▲ converter button visible in the COMBAT tab.

Save API extended with `Save.stat(key, default)` and `Save.setStat(key, val)`.

## 4. Playtest fixes — combat AI + difficulty curve

After playtesting via Chrome MCP, multiple gameplay regressions surfaced:

- **Reflect-chain surge cap** — `_chainExplosion` exits early if `surgeActive && depth>=3`. Prevents map-clear cascades.
- **Multishot surge gate** — `!this.surgeActive` added to the multishot condition. No 2x bullet duplication during surge.
- **Wave-5 → wave-7 spawn delay** — the 6-enemy ring formation now requires wave ≥7 (was wave ≥5). Also orbit-chance and 4-grunt sweep gated.
- **HUD overlap fix** — `_txtFrags` y: 172→196 to clear the chain banner.
- **Player velocity tracker** — `playerVx/Vy` per-frame (clamped to ±2000) for aim-leading. Smoothed via EMA (`playerVxSmooth/VySmooth`) over ~0.25s window so direction changes don't whip the aim.
- **Enemy aim-lead** in `_shoot` — gated by `_isAimAtPlayer` (within 1px of player coords). 60% lead factor on the smoothed velocity. Tank and rootkit compute their own predicted target (since they pass offset coords, not player coords).
- **VOID.NODE Phase 2 rework** — replaced the dull single-aimed-shot with a slow 3-bullet predicted spread that the player can reflect into gravity wells.

## 5. Sniper + rootkit fixes

- **Sniper firing was DEAD CODE** — outer condition excluded snipers but the inner branch never fired. Added proper charge-and-fire cycle using `e.charging`/`e.chargeT` (which already drove the targeting laser render). Cycle: idle `sInt`s → charge 0.5s with laser → fire 540-spd shot.
- **Sniper out-of-bounds clamp** — orbits stay within HUD-aware playfield bounds.
- **Sniper concurrent cap = 2** — spawn-roll falls back to grunt if 2 snipers already on screen.
- **Rootkit 4 → 2 bullets** + reveal first for 0.5s (warning telegraph), then fire over 0.06s, hide at 0.75s.

## 6. Enemy bullet speed buff (+30%)

| Source | Before | After |
|---|---|---|
| Grunt + default | 260 | 340 |
| Sniper | 420 | 540 |
| Tank (per-bullet) | 190 | 260 |
| Rootkit (per-bullet) | 300 | 380 |
| Defected enemies (vs foes) | 300 | 380 |
| `_shoot` floor (daemon difficulty) | enemyMaxSpd+80 | enemyMaxSpd+120 |

## 7. Playfield bounds (HUD-aware clamping)

- Player position clamped to `[150, W-150] × [30, H-60]` each frame.
- Sniper movement clamped to same bounds (was `[40, W-40] × [40, H-40]`).
- Excludes left HUD column, right HUD bars, top header, bottom power bar.

## 8. Black-screen-after-RECONNECT bug

After dying and clicking RECONNECT on the death screen, the game went to a permanent black screen with a recurring `Cannot read properties of null (reading 'drawImage')` exception.

Three nested causes, all fixed:
1. **Race in `GameScene.shutdown()`** — graphics were cleared via `setTimeout(...,i*8)`, which fired AFTER Phaser destroyed the scene → `.clear()` on stale graphics → renderer's `gameCanvas` nulled.
2. **Redundant manual `gs.shutdown()`** in `GameOverScene` RECONNECT — Phaser auto-invokes shutdown via `scene.stop()`, so this was double-firing the race.
3. **`CRT.suppress` stuck `true`** — GameOverScene set it, but the GameOver→GameScene path (no MenuScene in between) had no place to reset.

Fixes in [GameScene.js create() and shutdown()](../src/scenes/GameScene.js) + [GameOverScene.js:177](../src/scenes/GameOverScene.js).

## 9. Pure 180° reflect

Bullets now retrace their incoming trajectory exactly (negate velocity, retain boosted speed). Old behavior was a 60% radial + 40% cursor-aim blend, which felt unpredictable. The cursor-aim feature is GONE. Code at [_updateBullets reflect handler](../src/scenes/GameScene.js) computes `rnx, rny` from `-b.vx, -b.vy / |v|`.

## 10. Reflected bullet 4-second lifetime

Reflected bullets pick up a `b.reflectAge` counter that ticks each frame. At ≥4s they despawn with a 5-particle burst in the bullet's color. Prevents screen-clutter from echo-protocol bouncing bullets.

## 11. Chain explosion respects `bootT > 0`

The FRACTURED wave modifier was acting as a free chain-score fountain because newly-spawned child enemies (bootT:0.05) got caught in the parent's chain explosion AOE at 30ms post-death. Fix:
- Chain explosion AOE skips enemies with `e.bootT > 0`
- Volatile mutation AOE: same guard
- Inferno rage pulse AOE: same guard
- FRACTURED + SPLITTING bootT: 0.05 → 0.2 (covers chain delay + 1-2 cascade levels)

## 12. Synergy unlock banner positioning fix

The "SYNERGY UNLOCKED" panel was drifting right because it was created with width 0 and tweened to width 480 — Phaser tweens Rectangle `width` from the left edge, ignoring origin (0.5, 0.5). Fix: create the rectangle at full width with `setScale(0,1)`, then tween `scaleX:1`. Origin-respecting.

## 13. Motion trail tone-down (player ship "duplication" complaint)

The data-fragmentation motion trail used hex/square shapes 3-8px in ship color — read as "another ship" trailing. Changed to triangles only (`sides:3`) at 1.5-4px. Still visible, no longer ship-like.

## 14. Archetype + Skin unification — the big restructure

**See [ARCHETYPE_UNIFY.md](ARCHETYPE_UNIFY.md) for the full architecture.**

In summary:
- **Before**: 6 skins (visual + passive) + 7 archetypes (mechanics) as two parallel systems.
- **After**: 7 archetypes are the identity. Player ship visual = archetype icon (hex + glyph + flair). Shop sells archetype unlocks instead of skins. Skin passives merged into archetypes.
- All gated by a `Save.get('archetype_unify_v1', true)` flag — flip to `false` to revert to old system.
- 4 phases shipped (1: Save+migration, 2: visual, 3: passive routing, 4: shop tabs). Phase 5 (ArchetypeSelectScene gating) outstanding.

## 15. Shop carousel overhaul (Phase 6)

All 5 shop tabs use a carousel design:
- **ARCHETYPE tab**: single-item carousel with arrows + 7 dots + animated preview + name/tagline/passive/status
- **BUBBLE/SURVIVAL/COMBAT/POWERS tabs**: 4-up grid carousel — each card has its own embedded animation Graphics positioned at card-anim-center, scaled 0.6. Arrows page through items in 4s. Page dots reflect page count.
- **Tall side rails** for navigation: 36×360-480px button rails with green stroke + accent bar (matches the game's button style).
- POWERS retains 3-state model: BUY / EQUIP / EQUIPPED.
- COMBAT bottom panel: FRAGMENT_REFINERY converter button appears when meta owned.
- Category buttons moved down to y=172+ to clear the "// CATEGORY" label.
- Tab labels: "CHASSIS / skins & ships" → "ARCHETYPE / unlock identity" when flag is on.

## 16. MenuScene overhaul — Containment Log dev console

Old menu showed the equipped-skin ship preview (hex with RANGER glyph) + scrolling lore packets. Replaced with a procedural live dev-console feed:

- **CHASSIS stat** → **ARCHETYPE stat** (shows `Save.equippedArchetype()` name)
- Ship preview hex + label: REMOVED
- Hex-ring spawn event (emanated from ship pos): REMOVED
- Lore scrolling feed (~30 lines): REPLACED with `// CONTAINMENT_LOG` panel
- New: `_conLines[]` ring buffer, `pushLine()` every 400ms, 27 procedural templates across 5 severities (`ERR` red / `WARN` amber / `CRIT` flashing red / `NET` cyan / `SYS` green), randomized hex addresses + sectors + PIDs, clipping mask for right border, red pulsing LIVE indicator dot

The grid pulses (ambient bg effect) are kept. Bottom horizontal ticker (controls hint) is kept.

---

## Outstanding work (todo list)

When resuming, the captured TODOs in priority order:

1. **Fix missing green right border** on CONTAINMENT_LOG console panel (small)
2. **Gate ArchetypeSelectScene** — grey out locked archetypes with LOCKED label, block selection of unowned ones
3. **Remove POWERS tab** from shop (archetypes own their power, activated via spacebar — no separate power selection needed)
4. **Overhaul FIREWALL boss** — new phases + attack patterns + visual design
5. **Overhaul VOID.NODE boss** — same
6. **Overhaul GHOST.EXE boss** — same
7. **Overhaul CORE.BREACH boss** — same

The 4 boss overhauls are the largest pending scope (~150-300 lines each).
