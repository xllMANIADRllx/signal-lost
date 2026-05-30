# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                    # run locally via Electron (loads index.html)
npm run build                # package with electron-builder (cross-platform from local)
npm run build -- --mac --publish always       # mac DMG → GitHub release
npm run build -- --win --publish always       # win NSIS installer → GitHub release
```

No tests, no lint, no formatter — this repo has none.

Tagged releases (`v*`) trigger `.github/workflows/release.yml` which builds Mac and Windows in parallel and publishes to GitHub Releases via `GH_TOKEN`.

## Architecture

**This is NOT an ES modules / bundler project.** It's a pre-bundler Phaser game loaded by global `<script>` tags. Two things follow from that:

1. Every file declares globals — `class Foo`, `const BAR = {...}`, `function baz(){}`. There are **no `import`/`export` statements anywhere**. Dependencies between files are implicit (file B references `Foo` declared in file A).

2. **`index.html` is the dependency graph.** The order scripts appear in `index.html` IS the load order, and changing it breaks things. Order is: `phaser` CDN → `src/config.js` → `src/data/*` → `src/systems/*` → `src/game/*` → `src/scenes/*` → `src/main.js`. When you add a new file, you must add a `<script src="…">` line to `index.html` at the correct position.

**Two `main.js` files — do not confuse them:**
- `/main.js` — Electron main process (BrowserWindow, autoUpdater, IPC, F11 fullscreen). Node context.
- `/src/main.js` — Phaser bootstrap (`new Phaser.Game({...})` with the scene list). Renderer context. This is the one game code touches.

**Renderer ↔ main bridge:** `preload.js` exposes `window.electronAPI` (update checks, fullscreen toggle, brightness). The game runs without Electron too (browser standalone mode is supported — see `index.html` splash handler).

### Code layout

- `src/config.js` — global `W`, `H` (1280×720), `STAGES` (4 sector themes with bg colors + accent palette + bg style key)
- `src/data/*` — pure data, no Phaser, no side effects. Globals: `Settings`, `Save`, `DIFFICULTY`, `SHIPS`, `UPGRADES`, `ENEMY_TYPES`, `ENEMY_MUTATIONS`, `LORE`, `META_UPGRADES`, `ARCHETYPES`. `Save` reads/writes `localStorage` with `sl_` prefix.
- `src/systems/*` — singletons attached to global names: `Snd` (AudioSystem), `Voice`, `CRT`, `BannerManager`. Shared by every scene.
- `src/game/*` — gameplay subsystem **classes** instantiated per `GameScene`: `Player`, `Enemy`, `EnemySpawner`, `WaveManager`, `UpgradeManager`, `ComboSystem`, `ParticleSystem`.
- `src/scenes/*` — Phaser scenes (~20). The full list is registered in `src/main.js`.

### The GameScene fact

`src/scenes/GameScene.js` is ~6,500 lines and is the runtime orchestrator: input handling, per-frame update loop, all rendering (`_drawGrid`/`_drawEnemy`/`_drawBoss`/`_drawCursor`/`_drawVignette`), boss attack patterns, mutation effects, particle/shock-ring/hazard systems, HUD wiring, daily-challenge checks, achievement unlocks, sandbox mode, tutorial overlay. When working on gameplay, expect to read 200+ lines around the area you're touching and grep aggressively — methods are spread across the file.

`ShopScene.js` (~2,100 lines) is similarly monolithic with tab-specific render code inline.

### Per-run vs persistent state

- `Save.*` API (`shards`, `fragments`, `meta`, `setMeta`, `hasMeta`, `unlockLore`, `addStat`, `addRunHistory`, etc.) → `localStorage` under `sl_<key>`. Persists across runs.
- `GameScene._initData` (mode, archetype, challengeId, etc.) → set once at scene start from the previous scene's payload.
- `this._*` on GameScene → reset each run; **20 stat counters** feed the run summary + daily challenge check:
  - **16 original**: `_dashUses`, `_maxHeat`, `_totalReflects`, `_bestPing`, `_totalCorrupted`, `_maxDefected`, `_pingUsedOnBoss`, `_powerUsed`, `_killStreak5`, `_maxCombo`, `_waveModCount`, `_bossUnder60`, `_perfectWave3`, `_usedShield`, `_comboTime15`, `_monoWave`
  - **4 added for daily-challenge predicates**: `_bossNoDamage` (true on boss spawn, false on player damage during bossWave), `_surgeFires` (++ on surge activation), `_volatileExplosions` (++ in volatile death branch), `_waveBestReflects` (peak `_waveReflects` per wave; `_waveReflects` resets in `_startWave`). Both `_volatileExplosions` and the boss-no-damage flag persist across waves within a run.

### Daily challenges (live)

`getDailyChallenges()` in [src/scenes/CodexScene.js:675](src/scenes/CodexScene.js) returns 12 daily-mission objects with `check: (d) => predicate` functions. The end-of-run check in `GameScene.js:3093` calls these against a `checkData` snapshot of the run's stat counters. When a check passes, the daily completes, shards are awarded, and the date-keyed `daily_done_<date>` save key adds the id.

When adding/modifying challenges, the predicate fields available on `d` are listed in the `checkData` object construction (around `GameScene.js:3103-3127`). If you need a new predicate field, add it to: (1) the GameScene init block, (2) the relevant event site to increment/flip, (3) the `checkData` object, then (4) the check function in CodexScene.

### Adding gameplay content

The data files are designed for content additions:
- New ship: append to `SHIPS` in `data/ships.js` — shop picks it up automatically.
- New archetype: append to `ARCHETYPES` in `data/archetypes.js`. **There are exactly 7 archetypes** — `reflector`, `corruptor`, `ghost`, `overclocker`, `fortress`, `storm`, `rogue`. Any code that iterates archetypes (e.g. the Codex MASTERY tab) must enumerate all 7.
- New upgrade: add entry to `UPGRADES` in `data/upgrades.js` and wire its effect at the relevant gameplay site (`UpgradeManager.apply*` or directly in GameScene logic).
- New meta-upgrade: add to `META_UPGRADES` in `data/metaUpgrades.js` and check `Save.hasMeta(id)` at the read site.

### Notable globals / conventions

- `CRT` is a singleton overlay (`<canvas id="crt">`) with `CRT.glitch(intensity)` for screen-glitch effects. `CRT.suppress = true` skips draws (used during scene fades).
- `Snd` exposes `Snd.play(name)`, `Snd.startSceneMusic(name)`, `Snd.stopSceneMusic()`, `Snd.startBossMusic(idx)`, `Snd.stopBossMusic()`. After a boss ends, call `startGameMusic()` to resume — there is no `'game'` named track. Audio assets live in `assets/music/` and `assets/sfx/`.
- Cursor: `cursor: none !important` is enforced globally in `index.html` CSS — every scene draws its own crosshair (see `_drawCursor` patterns).
- DevOverlay: global Shift+Tab opens it from any scene (handled in `src/main.js` `postBoot`). In sandbox mode, Shift+Tab triggers a sandbox-exit confirmation instead.
- The "rebuild" project at `/Users/maniadr/signal-lost-clean/` is a separate ES-modules port — **do not pull from it without explicit instruction**. The original at this path is the source of truth. Reference only.

### Scene lifecycle gotchas

- **Always guard `scene.stop('X')` with `scene.isActive('X') || scene.isSleeping('X')`.** Phaser throws if you stop a scene that isn't running. DailyChallengeScene-style "go back to menu" handlers all need this.
- **Default args on `create(d = {})`.** Scenes launched without payload crash if `create(d)` destructures from undefined. BossCutsceneScene is the canonical example.
- **Tween + event leaks across scene re-entries.** Infinite `.tweens.add({loop:-1})` and `.time.addEvent({loop:true})` survive scene shutdown unless captured into class fields and killed in `shutdown()`. MenuScene has 5 of these; treat any new infinite timer the same way.

### Gameplay tuning notes

- **Shield-hit RGB glitch-split** (`GameScene.js:2835` writes `glitchSplit=0.06`, render at ~L6050): duration 0.06s, offset 3-6px, r=9, alpha 0.22. Toned down from louder values — restoring those will produce a visible "duplicate ship" on hit.
- **Bubble overheat cooldown is 3s.** During cooldown the bubble does not respond to input; playtesters can read this as a movement freeze. If tuned, also make the overheat ring more legible.
- **`signal_decay` mutation** caches `_baseSpd` on `Enemy` and multiplies each frame — do NOT mutate `spd` directly inside the per-frame branch (compounds).
- **Daily-challenge predicate caveats** (live and intentional): `skill_reflect` is PERFECT reflects per wave (looser than spec); `chaos_volatile` is per-run, not per-wave; `score_combo` uses a proxy instead of true "3 consecutive waves" tracking.

### Documentation

- [docs/SESSION_HISTORY.md](docs/SESSION_HISTORY.md) — full chronological log of major changes (rebuild salvage, A/B/C/D overhaul phases, all playtest fixes, archetype unification, menu redesign)
- [docs/ARCHETYPE_UNIFY.md](docs/ARCHETYPE_UNIFY.md) — full architecture of the archetype + skin unification system (feature-flagged via `archetype_unify_v1`, default ON)

### Archetype + Skin Unification (live, feature-flagged)

The skin and archetype systems have been merged. **The player's archetype IS their identity**: its icon becomes the in-game ship, and the shop sells archetype unlocks (not skins). Skin passives are routed through to the matching archetype.

- **Feature flag**: `Save.get('archetype_unify_v1', true)` — default ON. Set false in console + reload to revert.
- **Single injected file**: [src/systems/ArchetypeUnify.js](src/systems/ArchetypeUnify.js) — extends Save with `ownsArchetype/unlockArchetype/equippedArchetype`, patches `GameScene.create` to install a per-archetype renderer + skin-passive routing.
- **Player visual**: hex + Unicode glyph + per-archetype flair. Replaces the 6 inline skin draw branches (which still exist as fallback when flag off).
- **Shop tabs**: all 5 use a carousel design. ARCHETYPE tab = single-item carousel; the other 4 = 4-up grid carousel with embedded per-card animations. Tall green side-rail buttons for navigation.
- **Skin → archetype mapping**: phantom→rogue, inferno→overclocker, core→fortress, ghost→ghost, virus→corruptor, ranger→reflector. Existing saves migrate once on first load.
- **Outstanding**: ArchetypeSelectScene doesn't gate locked archetypes yet (Phase 5). See docs/ARCHETYPE_UNIFY.md for details.

### MenuScene — CONTAINMENT_LOG dev console

The old menu's skin showcase + scrolling lore panel has been replaced with a procedural live error feed in the right panel. Defined inline in [MenuScene.js](src/scenes/MenuScene.js) `create()`.

- Header: `// CONTAINMENT_LOG ● LIVE`
- 27 message templates across 5 severities (ERR / WARN / CRIT-flicker / NET / SYS)
- Random hex addresses, sector names, PIDs, percentages — never repeats verbatim
- New line every 400ms, ring-buffer with MAX_LINES based on panel height
- Clipping mask prevents text overflow past the right border
- Pre-seeded with 10 lines so it doesn't open empty

The old `_loreLines` scroll system was removed entirely. The bottom horizontal ticker (controls reminder) remains.

### Gameplay tuning notes (current values)

- **Bullet speeds** (post-buff): grunt 340, sniper 540, tank 260, rootkit 380, defected 380. Floor in `_shoot`: `enemyMaxSpd + 120` (daemon difficulty).
- **Sniper**: charge-and-fire cycle (was dead code); 0.5s charge with laser sight; capped at 2 concurrent; orbits clamped to playfield bounds.
- **Rootkit**: 2-bullet burst (was 4), revealed 0.5s BEFORE first shot.
- **Player aim-lead defense**: enemies aim at `playerVxSmooth/playerVySmooth` (EMA over 0.25s) with 60% lead factor.
- **Bubble reflect**: pure 180° reverse (no cursor-aim blend). Cursor-aim mechanic removed.
- **Reflected bullet lifetime**: 4 seconds, then despawn with 5-particle burst.
- **Chain explosion / volatile / rage AOE**: skip enemies with `bootT > 0` (newly-spawned grace). FRACTURED + SPLITTING spawn `bootT:0.2` so children survive the parent's chain.
- **Playfield bounds**: player + sniper clamped to `[150, W-150] × [30, H-60]` to keep out of HUD margins.
- **Motion trail**: triangles only at 1.5–4px (was hex/square 3-8px which read as "another ship").
- **Shield-hit RGB glitch-split**: `glitchSplit=0.06` (toned down — restoring louder values produces visible "duplicate ship").

### Scene lifecycle gotchas

- **Always guard `scene.stop('X')` with `scene.isActive('X') || scene.isSleeping('X')`.** Phaser throws if you stop a scene that isn't running.
- **Default args on `create(d = {})`.** Scenes launched without payload crash if `create(d)` destructures from undefined.
- **Tween + event leaks across scene re-entries.** Infinite `.tweens.add({loop:-1})` and `.time.addEvent({loop:true})` survive scene shutdown unless captured into class fields and killed in `shutdown()`.
- **Never call a scene's custom `shutdown()` manually before `scene.stop()`** — Phaser auto-invokes it. Calling it manually creates a race condition (we hit this with the black-screen-after-RECONNECT bug). The `gs.shutdown()` line in `GameOverScene` RECONNECT was removed for this reason.
- **`CRT.suppress` must be reset on every entry into GameScene** — `GameScene.create()` now does `try { CRT.suppress = false; CRT.inGame = true; } catch {}` to handle the GameOver → GameScene direct path.

### Outstanding work

Captured in the session todo list (see docs/SESSION_HISTORY.md tail):

1. Fix missing green right border on the menu CONTAINMENT_LOG panel
2. Gate ArchetypeSelectScene — grey out locked archetypes with LOCKED label
3. Remove POWERS tab from shop (archetypes have own powers via spacebar)
4. Overhaul FIREWALL boss — new phases + design
5. Overhaul VOID.NODE boss
6. Overhaul GHOST.EXE boss
7. Overhaul CORE.BREACH boss

### Reverted / dead code to be aware of

- Original `_buildChassis()` in ShopScene.js still exists as fallback when flag is OFF. Eventually deletable.
- Original 6-skin draw branches in GameScene.js (~L6490-6640) still exist as fallback. Bypassed when `this._archetypeRender` is set.
- `data/ships.js` is still queried internally for skin passive seed data. Don't delete it.
- `Save.skin()` still works and returns the actual saved skin id (not overridden globally). Some legacy scenes may still call it.

