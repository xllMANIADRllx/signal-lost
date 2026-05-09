// ═══════════════════════════════════════════════════════════
// PARTICLE SYSTEM — Visual effects: particles, shock rings,
// death fragments, movement trails
// ═══════════════════════════════════════════════════════════

class ParticleSystem {
  constructor() {
    this.particles  = [];
    this.shockRings = [];
    this.fragParts  = [];
  }

  // ── Spawn particles at position ──
  spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.particles.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        a:     1.0,
        size:  2 + Math.random() * 3,
        color,
        life:  0.4 + Math.random() * 0.4,
        t:     0,
      });
    }
  }

  // ── Spawn expanding shock ring ──
  spawnShockRing(x, y, color, maxR = 100) {
    this.shockRings.push({ x, y, r: 0, maxR, color, a: 0.8, speed: maxR * 3 });
  }

  // ── Spawn death fragments (geometric shapes) ──
  spawnDeathFragments(enemy) {
    const count = enemy.isBoss ? 12 : 5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 160;
      this.fragParts.push({
        x:     enemy.x,
        y:     enemy.y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        rot:   Math.random() * Math.PI * 2,
        rotV:  (Math.random() - 0.5) * 8,
        size:  3 + Math.random() * (enemy.isBoss ? 8 : 4),
        color: enemy.color,
        a:     1.0,
        life:  0.5 + Math.random() * 0.5,
        t:     0,
      });
    }
  }

  // ── Update all effects ──
  update(dt) {
    // Particles
    this.particles.forEach(p => {
      p.t  += dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.a   = Math.max(0, 1 - p.t / p.life);
    });
    this.particles = this.particles.filter(p => p.a > 0);

    // Shock rings
    this.shockRings.forEach(r => {
      r.r += r.speed * dt;
      r.a  = Math.max(0, r.a - dt * 2.5);
    });
    this.shockRings = this.shockRings.filter(r => r.a > 0 && r.r < r.maxR);

    // Fragments
    this.fragParts.forEach(f => {
      f.t  += dt;
      f.x  += f.vx * dt;
      f.y  += f.vy * dt;
      f.vx *= 0.88;
      f.vy *= 0.88;
      f.rot += f.rotV * dt;
      f.a   = Math.max(0, 1 - f.t / f.life);
    });
    this.fragParts = this.fragParts.filter(f => f.a > 0);
  }

  // ── Draw all effects ──
  draw(gfx) {
    gfx.clear();

    // Particles
    this.particles.forEach(p => {
      const col = typeof p.color === 'number' ? p.color : parseInt(String(p.color).replace('#',''), 16);
      gfx.fillStyle(col, p.a);
      gfx.fillCircle(p.x, p.y, p.size * p.a);
    });

    // Shock rings
    this.shockRings.forEach(r => {
      const col = typeof r.color === 'number' ? r.color : parseInt(String(r.color).replace('#',''), 16);
      gfx.lineStyle(1.5, col, r.a);
      gfx.strokeCircle(r.x, r.y, r.r);
    });

    // Fragments
    this.fragParts.forEach(f => {
      const col = typeof f.color === 'number' ? f.color : parseInt(String(f.color).replace('#',''), 16);
      gfx.fillStyle(col, f.a);
      gfx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
    });
  }

  // ── Clear all effects ──
  clear() {
    this.particles  = [];
    this.shockRings = [];
    this.fragParts  = [];
  }
}
