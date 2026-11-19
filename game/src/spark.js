// Particles: one pooled THREE.Points cloud for sparks, smoke, cash glints and explosions.
// Particles are recycled, never allocated per frame, and one shared flash light sells
// the explosions.

const THREE = window.THREE;

const MAX = 500;

export class Sparks {
  constructor(scene) {
    this.scene = scene;
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.span = new Float32Array(MAX);
    this.fall = new Float32Array(MAX);
    this.head = 0;
    for (let i = 0; i < MAX; i += 1) this.pos[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.cloud = new THREE.Points(geo, mat);
    this.cloud.frustumCulled = false;
    scene.add(this.cloud);
    this.flash = new THREE.PointLight(0xffa040, 0, 30);
    scene.add(this.flash);
    this.tmp = new THREE.Color();
  }

  puff(p, hex, n, spd, life, grav = 9) {
    this.tmp.setHex(hex);
    for (let k = 0; k < n; k += 1) {
      const i = this.head;
      this.head = (this.head + 1) % MAX;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.3;
      const s = spd * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * s;
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.col[i * 3] = this.tmp.r;
      this.col[i * 3 + 1] = this.tmp.g;
      this.col[i * 3 + 2] = this.tmp.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.span[i] = this.life[i];
      this.fall[i] = grav;
    }
    this.cloud.geometry.attributes.position.needsUpdate = true;
    this.cloud.geometry.attributes.color.needsUpdate = true;
  }

  smoke(p, n = 6) {
    this.puff({ x: p.x, y: p.y + 1.2, z: p.z }, 0x555a60, n, 1.5, 1.4, -1.5);
  }

  blast(p) {
    this.puff(p, 0xffa040, 55, 12, 1.1);
    this.puff(p, 0xff5a2a, 38, 8, 0.9);
    this.puff({ x: p.x, y: p.y + 1, z: p.z }, 0x333333, 28, 4, 2.2, -1);
    this.flash.position.set(p.x, p.y + 2, p.z);
    this.flash.intensity = 400;
  }

  tick(dt) {
    for (let i = 0; i < MAX; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] -= this.fall[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.cloud.geometry.attributes.position.needsUpdate = true;
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 900);
  }
}
