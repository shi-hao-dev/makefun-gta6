// Sparks: a small pool of glowing cubes for impacts, smoke and explosions.
// One shared pool, no allocation per burst, so a firefight never stutters.

const THREE = window.THREE;

const POOL = 240;

export class Sparks {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    for (let i = 0; i < POOL; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.items.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, max: 1, grav: 0 });
    }
    this.cursor = 0;
  }

  /** A burst of n cubes from pos, flying out at up to speed, living life seconds. */
  burst(pos, color, n, speed, life) {
    for (let i = 0; i < n; i += 1) {
      const p = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % POOL;
      p.mesh.visible = true;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.position.set(pos.x, pos.y, pos.z);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = up * sp;
      p.life = life * (0.6 + Math.random() * 0.4);
      p.max = p.life;
      p.grav = 9;
    }
  }

  /** Grey smoke rising from a spot. */
  smoke(pos, n) {
    for (let i = 0; i < n; i += 1) {
      const p = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % POOL;
      p.mesh.visible = true;
      p.mesh.material.color.setHex(0x8a8a8a);
      p.mesh.material.opacity = 0.55;
      p.mesh.position.set(pos.x + (Math.random() - 0.5) * 1.5, pos.y + Math.random(), pos.z + (Math.random() - 0.5) * 1.5);
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vz = (Math.random() - 0.5) * 0.6;
      p.vy = 1.6 + Math.random();
      p.life = 1.1;
      p.max = 1.1;
      p.grav = -0.4;
    }
  }

  /** A big orange blast with smoke. */
  explosion(pos) {
    this.burst(pos, 0xffa040, 26, 9, 0.9);
    this.burst(pos, 0xff5030, 16, 6, 0.7);
    this.smoke(pos, 8);
  }

  tick(dt) {
    for (const p of this.items) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vy -= p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.15) p.mesh.position.y = 0.15;
      p.mesh.material.opacity = Math.max(0, p.life / p.max);
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.y += dt * 2;
    }
  }
}
