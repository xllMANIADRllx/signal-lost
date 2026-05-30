# Archetype + Skin Unification

## What this is

Signal Lost previously had two parallel identity systems that overlapped conceptually:

- **6 skins** (ranger, phantom, inferno, core, ghost, virus) — bought in shop, each with a unique gameplay passive AND drove the in-game ship visual
- **7 archetypes** (reflector, corruptor, ghost, overclocker, fortress, storm, rogue) — picked at run start, each with a passive + active power + seeded upgrades. All 7 unlocked by default; not in shop

The unification merges them: **the player's chosen archetype IS their identity**. Its icon becomes the player ship, and archetypes (not skins) are what the shop sells. Skin passives are routed through to the equivalent archetype.

## The feature flag

Everything is gated by `Save.get('archetype_unify_v1', true)` — default ON. To disable from the console:

```js
Save.set('archetype_unify_v1', false); location.reload();
```

The original skin-based code paths remain as the `else` branch in every dispatch site, so the toggle is a real revert (no hidden state changes).

## File map

| File | Role |
|---|---|
| [src/systems/ArchetypeUnify.js](../src/systems/ArchetypeUnify.js) | The injection script. Loaded after all game classes in [index.html](../index.html) just before `src/main.js`. Contains all the Save extensions, migration, prototype patches, and the renderer install hook. |
| [src/data/archetypes.js](../src/data/archetypes.js) | Each archetype has `id, name, col, icon, tagline, desc, passive, seeds, power, cost`. Costs: REFLECTOR 0 (free starter), FORTRESS 400, OVERCLOCKER 800, GHOST 1200, CORRUPTOR 1600, STORM 2200, ROGUE 2800. |
| [src/data/save.js](../src/data/save.js) | Extended at runtime by ArchetypeUnify.js — `Save.stat` / `Save.setStat` were added directly to this file in Phase D; `Save.ownsArchetype` / `Save.unlockArchetype` / `Save.equippedArchetype` are bolted on by the unify script. |
| [src/scenes/GameScene.js](../src/scenes/GameScene.js) | Has one source edit at the player-render section: `if (this._archetypeRender) { this._archetypeRender(px, py, rot); } else if (skin === 'ranger') {...}`. Hook bypasses the 6-skin draw branches when unify is active. |
| [src/scenes/ShopScene.js](../src/scenes/ShopScene.js) | Direct edits for shop UI (Phase 4 + 6). Tab dispatch checks the flag and routes to `_buildArchetypes`/`_buildBubbleGrid`/etc. when on. Original `_buildChassis`/`_buildBubble`/etc. remain as fallbacks. |
| [src/scenes/MenuScene.js](../src/scenes/MenuScene.js) | Replaced CHASSIS stat with ARCHETYPE; removed ship preview; replaced lore feed with CONTAINMENT_LOG dev console. |

## Skin → Archetype passive mapping

When unify is active, `this.activeSkin` gets overridden on scene create to a skin id that "matches" the equipped archetype. This makes the existing `this.activeSkin === 'X'` check sites fire naturally — no per-site patches.

| Archetype | activeSkin override | Inherited passive |
|---|---|---|
| reflector | `ranger` | bubble-speed-per-wave (small baseline) |
| corruptor | `virus` | INFECTION_SPREAD on kill |
| ghost (archetype) | `ghost` (skin) | SIGNAL_ECHO reflect/dash echoes |
| overclocker | `inferno` | OVERCLOCK_IMMUNITY rage state |
| fortress | `core` | REINFORCED_PACKET shield bonus |
| storm | `ranger` | (self-contained — multishot via own seeds) |
| rogue | `phantom` | PHASE_SHIFT dash decoys |

Ship.passives seeds are re-applied via the unify script's seed-swap: when activeSkin is overridden, the old ship's seeds are subtracted from `this.upg` and the new ship's seeds are added.

## Phase summary

### Phase 1 — Save extensions + migration (live)

`Save.ownsArchetype(id)` — `true` if owned. REFLECTOR always returns `true` (free starter).
`Save.unlockArchetype(id)` — sets `arch_owned_<id>` to true in localStorage.
`Save.equippedArchetype()` — returns the currently equipped archetype id, default `reflector`.
`Save.setEquippedArchetype(id)` — stores it.

On first load with the new script, migration runs once (`arch_migrated_v1` flag prevents re-running):
- For each owned skin (`Save.isOwned`), grant the corresponding archetype (per the mapping table above)
- If the player had a non-ranger skin equipped, also set the equipped archetype to its match

### Phase 2 — Player visual (live)

In `GameScene.create()`, the unify script installs `scene._archetypeRender(px, py, rot)`. The function draws:
- Outer hex stroke (archetype color, alpha 0.95)
- Inner filled hex (alpha 0.22)
- Phaser Text glyph at center (Unicode from `arch.icon`, 16px, archetype color, black stroke)
- Per-archetype flair (5–15 lines each):
  - REFLECTOR: pulsing trail when bubble's growing
  - CORRUPTOR: slow-pulsing biohazard aura
  - GHOST: hex jitter ±1.2px + offset ghost-hex trail
  - OVERCLOCKER: heat-reactive outline glow + rage burst when active
  - FORTRESS: thicker stationary outline + shield pip when shield active
  - STORM: 2 orbiting satellites
  - ROGUE: dash afterimage

A persistent Phaser Text object for the glyph is created once at create() and repositioned each frame — no per-frame allocations.

Also: `scene.shipColor` is overridden to the archetype color, so the shared decoration code (combo glow, shield ring, surge aura) automatically uses the right palette.

### Phase 3 — Skin passive routing (live)

In the same `installArchetypeRenderer(scene)` hook:
1. Compute target skin from `ARCHETYPE_TO_SKIN[scene._archetype]`
2. If different from current `scene.activeSkin`, swap seeds:
   - Subtract old `SHIPS[oldSkin].passives` from `scene.upg`
   - Add `SHIPS[targetSkin].passives` to `scene.upg`
3. Set `scene.activeSkin = targetSkin` — all downstream `=== 'X'` checks now fire on the new value

`Save.setEquippedArchetype(scene._archetype)` is also called to keep the save in sync.

### Phase 4 — Shop UI rebuild (live)

Old `_buildChassis()` is unchanged in source — kept as fallback. When flag is on:
- Tab label changes from "CHASSIS / skins & ships" to "ARCHETYPE / unlock identity"
- `_buildArchetypes()` runs: single-item carousel with arrows + 7 page dots + animated preview hex + name/tagline/passive/status + PURCHASE button (only when unowned)
- Shop only shows lock state (`✓ UNLOCKED` or `COST: N ◈`) — equip happens elsewhere

Phase 6 (also done): all 4 other tabs (BUBBLE/SURVIVAL/COMBAT/POWERS) now use a 4-up grid carousel via `_buildItemGrid(tabId, items, config)`. Each card has its own embedded animation Graphics positioned at card-anim-center with `setScale(0.6)`. Page-nav uses tall side-rail buttons (36×360px, green stroke + accent bar) matching the game's button style.

### Phase 5 — ArchetypeSelectScene gating (PENDING)

Not yet implemented. Need to:
- Grey out archetype cards in [ArchetypeSelectScene.js](../src/scenes/ArchetypeSelectScene.js) when `!Save.ownsArchetype(id)`
- Add "🔒 LOCKED — UNLOCK IN DATA_SHOP" badge
- Block selection click on locked archetypes
- Optionally: small archetype-icon badge near top of menu for continuity

## Open caveats

- **POWERS tab is still in shop** but redundant — archetypes have their own active powers. Plan: remove POWERS tab entirely (todo).
- **ShopScene `_buildChassis()` legacy code** stays as fallback but is dead with flag on. Eventually deletable.
- **`SHIPS` data file** stays as the source for the activeSkin → passive lookup. Even with unify, `SHIPS[skinId]` is still queried internally. Not safe to delete.
- **Phase 5 not done**: ArchetypeSelectScene currently lets players pick any archetype regardless of unlock. This bypasses the shop economy until fixed.
- **MenuScene `Save.skin()` reference** at line 121 was replaced with `Save.equippedArchetype()` — but if other scenes still call `Save.skin()`, they get the actual saved (legacy) skin value. The unify script does NOT globally override Save.skin().
