// ═══════════════════════════════════════════════════════════
// ARCHETYPE UNIFY — runtime patches that fold the 6-skin
// chassis system into the 7-archetype identity system.
//
// Loaded as a single script after all classes are defined.
// Gated by Save.get('archetype_unify_v1') — set false in
// console + reload to fully disable.
//
// Phases:
//   1 — Save API + migration  (this file, top section)
//   2 — Player visual         (TODO)
//   3 — Skin-passive routing  (TODO)
//   4 — Shop / select UI      (direct edits, not here)
// ═══════════════════════════════════════════════════════════

(function () {
  const FLAG_KEY = 'archetype_unify_v1';

  // Default ON. Flip in console: Save.set('archetype_unify_v1', false); location.reload();
  if (Save.get(FLAG_KEY, true) === false) {
    console.log('[ArchetypeUnify] feature disabled via flag, skipping');
    return;
  }

  // ─── Skin → Archetype migration mapping ────────────────
  const SKIN_TO_ARCHETYPE = {
    ranger:  'reflector',   // free starter on both sides
    phantom: 'rogue',       // dash decoys → rogue's hit-and-run identity
    inferno: 'overclocker', // rage state → heat-themed overclocker
    core:    'fortress',    // shield bonus → defensive fortress
    ghost:   'ghost',       // reflect/dash echoes → same-named archetype
    virus:   'corruptor',   // infection pulse → corruption-spread theme
  };

  // ─── Save API extensions ───────────────────────────────
  Save.ownsArchetype = function (id) {
    if (id === 'reflector') return true; // free starter, always owned
    if (id === 'signal_forge') return this.forgeUnlocked(); // gated by CORE.BREACH kill, not buyable
    return !!this.get('arch_owned_' + id, false);
  };

  Save.unlockArchetype = function (id) {
    this.set('arch_owned_' + id, true);
  };

  Save.equippedArchetype = function () {
    return this.get('arch_equipped', 'reflector');
  };

  Save.setEquippedArchetype = function (id) {
    this.set('arch_equipped', id);
  };

  // ─── SIGNAL_FORGE Save API ─────────────────────────────
  Save.forgeUnlocked = function () { return this.get('forge_unlocked', false); };
  Save.forgeUsed     = function () { return this.get('forge_used', false); };
  Save.forgeConfig   = function () {
    try { return JSON.parse(this.get('forge_config', 'null')) || null; }
    catch { return null; }
  };
  Save.setForgeConfig = function (cfg) { this.set('forge_config', JSON.stringify(cfg)); };

  // ─── One-time migration from skin ownership ────────────
  if (!Save.get('arch_migrated_v1', false)) {
    const granted = [];
    Object.entries(SKIN_TO_ARCHETYPE).forEach(([skinId, archId]) => {
      if (Save.isOwned(skinId) && !Save.ownsArchetype(archId)) {
        Save.unlockArchetype(archId);
        granted.push(archId);
      }
    });
    // If the player had a non-ranger skin equipped, auto-equip the matching archetype
    const equippedSkin = Save.skin();
    const matchingArch = SKIN_TO_ARCHETYPE[equippedSkin];
    if (matchingArch && Save.ownsArchetype(matchingArch)) {
      Save.setEquippedArchetype(matchingArch);
    }
    Save.set('arch_migrated_v1', true);
    console.log('[ArchetypeUnify] migration complete', { granted, equipped: Save.equippedArchetype() });
  }

  // Expose the mapping for downstream code (and future phases)
  window._ARCHETYPE_UNIFY = {
    SKIN_TO_ARCHETYPE,
    flag: FLAG_KEY,
  };

  // ═════════════════════════════════════════════════════
  // PHASE 2 — Player Visual Unification
  // Replaces 6 skin-draw branches with hex + glyph + flair
  // ═════════════════════════════════════════════════════

  // Build a fast lookup of archetype → { col, icon }
  const ARCH_LOOKUP = {};
  if (typeof ARCHETYPES !== 'undefined') {
    ARCHETYPES.forEach(a => { ARCH_LOOKUP[a.id] = { col: a.col, icon: a.icon, label: a.label }; });
  }

  // Default to reflector if unknown id
  function archMeta(id) {
    const base = ARCH_LOOKUP[id] || ARCH_LOOKUP['reflector'] || { col: 0x00ffcc, icon: '?', label: 'REFLECTOR' };
    if (id === 'signal_forge') {
      const cfg = Save.forgeConfig();
      if (cfg) {
        const overlay = { ...base };
        if (cfg.icon) overlay.icon = cfg.icon;
        if (cfg.color != null) overlay.col = cfg.color;
        return overlay;
      }
    }
    return base;
  }

  // Patch GameScene.create to install the per-scene renderer AFTER original init
  if (typeof GameScene !== 'undefined') {
    const origCreate = GameScene.prototype.create;
    GameScene.prototype.create = function () {
      origCreate.apply(this, arguments);
      installArchetypeRenderer(this);
    };
    console.log('[ArchetypeUnify] phase 2 — GameScene.create patched');
  }

  // ═════════════════════════════════════════════════════
  // PHASE 3 — Skin-passive routing
  // Each archetype "borrows" a skin's passive triggers by
  // swapping activeSkin at scene init. Existing skin-check
  // code paths fire naturally; no per-site patches needed.
  // ═════════════════════════════════════════════════════
  const ARCHETYPE_TO_SKIN = {
    reflector:   'ranger',   // bubble-speed-per-wave + clean baseline
    corruptor:   'virus',    // infection-spread on kill
    ghost:       'ghost',    // reflect echo bullets + dash echoes
    overclocker: 'inferno',  // rage state on overheat
    fortress:    'core',     // shield bonus + auto-regen
    storm:       'ranger',   // self-contained, default baseline
    rogue:       'phantom',  // dash decoys
  };

  // SIGNAL_FORGE passive selector → underlying skin id (used to route into ARCHETYPE_TO_SKIN logic)
  const PASSIVE_TO_SKIN = {
    ranger:'ranger', phantom:'phantom', inferno:'inferno',
    core:'core', ghost:'ghost', virus:'virus',
  };

  function installArchetypeRenderer(scene) {
    const archId = scene._archetype || 'reflector';
    const meta = archMeta(archId);

    // ─── Phase 3: skin swap + seed reconciliation ───
    if (typeof SHIPS !== 'undefined') {
      let targetSkin = ARCHETYPE_TO_SKIN[archId] || 'ranger';
      // SIGNAL_FORGE — route to player's chosen passive skin
      if (archId === 'signal_forge') {
        const cfg = Save.forgeConfig();
        targetSkin = (cfg && PASSIVE_TO_SKIN[cfg.passive]) || 'ranger';
      }
      const oldSkin = scene.activeSkin || 'ranger';
      if (oldSkin !== targetSkin && scene.upg) {
        // Undo old skin's seed passives
        const oldShip = SHIPS[oldSkin];
        if (oldShip && oldShip.passives) {
          oldShip.passives.forEach(p => {
            scene.upg[p] = Math.max(0, (scene.upg[p] || 0) - 1);
          });
        }
        // Apply target skin's seed passives
        const newShip = SHIPS[targetSkin];
        if (newShip && newShip.passives) {
          newShip.passives.forEach(p => {
            scene.upg[p] = (scene.upg[p] || 0) + 1;
          });
        }
      }
      scene.activeSkin = targetSkin;
      // Keep equipped archetype save in sync
      try { Save.setEquippedArchetype(archId); } catch {}
    }

    // Override shipColor so the shared decoration code (combo glow, etc.) uses the archetype color
    scene.shipColor = meta.col;

    // Defensive: destroy any pre-existing glyph before creating a new one.
    // If a prior shutdown didn't fully clean up (Phaser reuses scene instances), an
    // orphaned glyph would render at a stale position and look like a "duplicate player".
    if (scene._archetypeGlyph) {
      try { scene._archetypeGlyph.destroy(); } catch {}
      scene._archetypeGlyph = null;
    }

    // Persistent text glyph — created once, just repositioned each frame
    const colStr = '#' + meta.col.toString(16).padStart(6, '0');
    const glyph = scene.add.text(scene.px, scene.py, meta.icon, {
      fontFamily: "'Courier New',monospace",
      fontSize: '16px',
      fontStyle: 'bold',
      color: colStr,
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9);
    scene._archetypeGlyph = glyph;

    // Hex vertices precomputed at unit radius (recomputed per frame at scale)
    const HEX_R = 16;

    scene._archetypeRender = function (px, py, rot) {
      const c = meta.col;

      // Base hex — outer stroke + inner fill
      // (no rotation per user choice — static hex, static glyph)
      const g = this.gfxMain;
      g.lineStyle(2, c, 0.95);
      g.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (Math.PI / 3) * s + Math.PI / 6; // pointy-top hex
        const x = px + Math.cos(a) * HEX_R;
        const y = py + Math.sin(a) * HEX_R;
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.strokePath();

      g.fillStyle(c, 0.22);
      g.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (Math.PI / 3) * s + Math.PI / 6;
        const x = px + Math.cos(a) * (HEX_R - 2);
        const y = py + Math.sin(a) * (HEX_R - 2);
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.fillPath();

      // Position the glyph (text rendered automatically by Phaser)
      // Slight jitter for GHOST archetype
      let jx = 0, jy = 0;
      if (archId === 'ghost') {
        jx = (Math.random() - 0.5) * 1.2;
        jy = (Math.random() - 0.5) * 1.2;
      }
      if (scene._archetypeGlyph) scene._archetypeGlyph.setPosition(px + jx, py + jy);

      // ─── Per-archetype flair ───
      if (archId === 'reflector') {
        // Faint trail when bubble's growing
        if (scene.bubbleRadius > 10) {
          g.lineStyle(1, c, 0.25 + 0.15 * Math.sin(scene.t * 6));
          g.strokeCircle(px, py, HEX_R + 4);
        }
      } else if (archId === 'corruptor') {
        // Slow-pulsing biohazard aura
        const auraR = HEX_R + 6 + Math.sin(scene.t * 2.5) * 3;
        g.lineStyle(1, c, 0.18 + 0.12 * Math.sin(scene.t * 2));
        g.strokeCircle(px, py, auraR);
      } else if (archId === 'ghost') {
        // Hex jitter handled above; add a second ghost-hex trailing
        g.lineStyle(1, c, 0.3);
        const ghostOffset = 3;
        g.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (Math.PI / 3) * s + Math.PI / 6;
          const x = px + Math.cos(a) * HEX_R + ghostOffset;
          const y = py + Math.sin(a) * HEX_R + ghostOffset;
          if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath();
        g.strokePath();
      } else if (archId === 'overclocker') {
        // Outline glow scales with bubble heat
        const heatFrac = Math.min(1, (scene.bubbleHeat || 0) / (scene._armorThresh || 100));
        if (heatFrac > 0.1) {
          g.lineStyle(2, 0xff8800, 0.3 + heatFrac * 0.5);
          g.strokeCircle(px, py, HEX_R + 3 + heatFrac * 4);
        }
        // Rage state burst (inherited from old INFERNO)
        if (scene.rageActive) {
          g.lineStyle(3, 0xff4400, 0.5 + 0.3 * Math.sin(scene.t * 12));
          g.strokeCircle(px, py, HEX_R + 8);
        }
      } else if (archId === 'fortress') {
        // Thick stationary outline (defensive look)
        g.lineStyle(2, c, 0.4);
        g.strokeCircle(px, py, HEX_R + 5);
        // Shield indicator pip if shield active
        if (scene.shieldActive) {
          g.fillStyle(0xffffff, 0.6);
          g.fillCircle(px, py - HEX_R - 6, 2.5);
        }
      } else if (archId === 'storm') {
        // 2 satellites orbiting the hex
        for (let s = 0; s < 2; s++) {
          const a = scene.t * 2 + s * Math.PI;
          const ox = px + Math.cos(a) * (HEX_R + 8);
          const oy = py + Math.sin(a) * (HEX_R + 8);
          g.fillStyle(c, 0.8);
          g.fillCircle(ox, oy, 2);
        }
      } else if (archId === 'rogue') {
        // Brief afterimage during/just-after dash
        if (scene.isDashing || (scene.dashCooldownT && scene.dashCooldownT > 0.9)) {
          g.lineStyle(1, c, 0.4);
          const trailOffset = 8;
          g.beginPath();
          for (let s = 0; s < 6; s++) {
            const a = (Math.PI / 3) * s + Math.PI / 6;
            const x = px - (scene.playerVxSmooth || 0) * 0.02 + Math.cos(a) * HEX_R;
            const y = py - (scene.playerVySmooth || 0) * 0.02 + Math.sin(a) * HEX_R;
            if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.closePath();
          g.strokePath();
        }
      }

      // ─── Phase 2B: ARCHETYPE MASTERY tier flair ───
      // Generic outer ring + notch indicators that scale by tier.
      // Cached on scene to avoid Save lookups per frame (~120 lookups/sec).
      if (scene._masteryTierCached == null && typeof computeArchetypeTier === 'function') {
        scene._masteryTierCached = computeArchetypeTier(archId);
      }
      const mt = scene._masteryTierCached || 0;
      if (mt >= 1) {
        const ringR = HEX_R + 8;
        const goldTint = mt >= 5;
        const ringCol = goldTint ? 0xffd700 : c;
        const alphaBase = goldTint ? (0.5 + 0.5 * Math.sin(scene.t * 6.28)) : 0.4;
        g.lineStyle(1, ringCol, alphaBase);
        g.strokeCircle(px, py, ringR);
        // Notch positions per tier: T2=1 (top), T3=3 (12/4/8 o'clock), T4=5 (5-pt star), T5=5 gold
        const NOTCHES = { 2: [0], 3: [0, 2/3 * Math.PI, 4/3 * Math.PI], 4: [0, 2/5 * Math.PI, 4/5 * Math.PI, 6/5 * Math.PI, 8/5 * Math.PI], 5: [0, 2/5 * Math.PI, 4/5 * Math.PI, 6/5 * Math.PI, 8/5 * Math.PI] };
        const ns = NOTCHES[mt];
        if (ns) {
          ns.forEach(a => {
            const rOff = -Math.PI / 2 + a; // start at 12 o'clock
            const x1 = px + Math.cos(rOff) * (ringR - 2);
            const y1 = py + Math.sin(rOff) * (ringR - 2);
            const x2 = px + Math.cos(rOff) * (ringR + 3);
            const y2 = py + Math.sin(rOff) * (ringR + 3);
            g.lineStyle(1.5, ringCol, alphaBase + 0.2);
            g.beginPath();
            g.moveTo(x1, y1); g.lineTo(x2, y2);
            g.strokePath();
          });
        }
      }
    };

    // Reset cached mastery tier on each install (per scene start, so re-entry picks up new tier-ups)
    scene._masteryTierCached = null;

    // Clean up glyph on scene shutdown
    scene.events.once('shutdown', () => {
      try { scene._archetypeGlyph && scene._archetypeGlyph.destroy(); } catch {}
      scene._archetypeGlyph = null;
      scene._archetypeRender = null;
      scene._masteryTierCached = null;
    });

    console.log('[ArchetypeUnify] renderer installed for archetype:', archId);
  }

  console.log('[ArchetypeUnify] phase 1 + 2 + 3 active');
})();
