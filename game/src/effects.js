// Particles: one pooled THREE.Points cloud for sparks, smoke, cash glints and explosions.
// Particles are recycled, never allocated per frame, and the flash light is shared.

const THREE = window.THREE;

const MAX = 600;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.head = 0;
    for (let i = 0; i < MAX; i += 1) this.positions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.flash = new THREE.PointLight(0xffa040, 0, 30);
    scene.add(this.flash);
    this.tmpColor = new THREE.Color();
  }

  burst(pos, colorHex, count, speed, life, gravity = 9) {
    this.tmpColor.setHex(colorHex);
    for (let n = 0; n < count; n += 1) {
      const i = this.head;
      this.head = (this.head + 1) % MAX;
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.3;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = up * sp;
      this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.colors[i * 3] = this.tmpColor.r;
      this.colors[i * 3 + 1] = this.tmpColor.g;
      this.colors[i * 3 + 2] = this.tmpColor.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.maxLife[i] = this.life[i];
      this.grav[i] = gravity;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  smoke(pos, count = 6) {
    this.burst({ x: pos.x, y: pos.y + 1.2, z: pos.z }, 0x555a60, count, 1.5, 1.4, -1.5);
  }

  explosion(pos) {
    this.burst(pos, 0xffa040, 60, 12, 1.1);
    this.burst(pos, 0xff5a2a, 40, 8, 0.9);
    this.burst({ x: pos.x, y: pos.y + 1, z: pos.z }, 0x333333, 30, 4, 2.2, -1);
    this.flash.position.set(pos.x, pos.y + 2, pos.z);
    this.flash.intensity = 400;
  }

  step(dt) {
    for (let i = 0; i < MAX; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 900);
  }
}
