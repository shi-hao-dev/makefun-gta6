// Cars: the mesh builder, the arcade driving model, traffic cruising and police pursuit.
// A car drives along the ground plane; its forward is (sin(heading), cos(heading)).
// Traffic cars cruise between crossings; police cars pursue a target and ram it.

import { AUTO, FLOW } from './tune.js';

const PALETTE = [0xd43d3d, 0x3d7bd4, 0xd4a53d, 0x3dd47a, 0xd4d4d4, 0x2a2f38, 0x8a5fd4, 0xe88a3d];

export function randomAutoColor(seed) {
  return seed.pick(PALETTE);
}

/** Build a car mesh. `kind` is 'traffic' or 'police'. Front is +z in local space. */
export function buildAuto(color, kind) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.1, metalness: 0.7 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.3, metalness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.9), bodyMat);
  nose.position.set(0, 0.5, 1.95);
  nose.castShadow = true;
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.8), bodyMat);
  tail.position.set(0, 0.52, -1.95);
  tail.castShadow = true;
  g.add(tail);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.0), glassMat);
  cabin.position.set(0, 1.05, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, tyreMat);
    wheel.position.set(wx, 0.36, wz);
    wheel.castShadow = true;
    g.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), rimMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.36, wz);
    g.add(hub);
  }
  // Headlights and taillights.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff6c9, emissiveIntensity: 0.8 });
  for (const lx of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), lampMat);
    lamp.position.set(lx, 0.55, 2.42);
    g.add(lamp);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd43d3d, emissive: 0xd43d3d, emissiveIntensity: 0.6 });
  for (const lx of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), tailMat);
    lamp.position.set(lx, 0.55, -2.38);
    g.add(lamp);
  }
  if (kind === 'police') {
    // Light bar: red on one side, blue on the other, flashing in law.js.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.38, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 1 }));
    red.position.set(-0.3, 1.4, -0.2);
    red.name = 'cop-red';
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x2a6bff, emissiveIntensity: 1 }));
    blue.position.set(0.3, 1.4, -0.2);
    blue.name = 'cop-blue';
    g.add(blue);
  }
  return g;
}

export class Auto {
  constructor(mesh, kind) {
    this.mesh = mesh;
    this.kind = kind;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.health = kind === 'police' ? 140 : 100;
    this.dead = false;
    this.brakeOn = false;
    this.goal = null;
    this.cruiseSpeed = FLOW.slow;
    this.wait = 0;
    this.ramWait = 0;
    this.smokeWait = 0;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Player driving. `cmd` is {fwd, steer, brake} with fwd/steer in -1..1. */
  drive(dt, cmd, bay) {
    if (this.dead) return;
    if (cmd.brake) {
      this.speed -= Math.sign(this.speed) * AUTO.brake * dt;
      if (Math.abs(this.speed) < 0.4) this.speed = 0;
    } else if (cmd.fwd !== 0) {
      const accel = cmd.fwd > 0 ? AUTO.accel : AUTO.reverse;
      this.speed += cmd.fwd * accel * dt;
      const top = this.speed >= 0 ? AUTO.top : -AUTO.topBack;
      this.speed = Math.max(-AUTO.topBack, Math.min(AUTO.top, this.speed));
      if (this.speed > 0 && this.speed > top) this.speed = top;
    } else {
      // Rolling drag.
      this.speed *= Math.exp(-dt * 0.5);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }
    const steerTarget = cmd.steer * AUTO.steer * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 7);
    this.heading += this.steer * this.speed * dt * 0.12;
    const f = this.forward();
    const nx = this.x + f.x * this.speed * dt;
    const nz = this.z + f.z * this.speed * dt;
    const fixed = bay.pushOut(nx, nz, AUTO.radius);
    if ((fixed.x !== nx || fixed.z !== nz) && Math.abs(this.speed) > 4) {
      this.speed *= 0.55;
    }
    this.x = fixed.x;
    this.z = fixed.z;
    this.sync();
  }

  /** Traffic cruising: follow the street grid between crossings, slow for cars ahead. */
  cruise(dt, bay, seed, others) {
    if (this.dead) return;
    if (this.wait > 0) {
      this.wait -= dt;
      this.speed *= Math.exp(-dt * 3);
      this.sync();
      return;
    }
    if (!this.goal) this.goal = bay.anyCrossing(seed);
    const dx = this.goal.x - this.x;
    const dz = this.goal.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 5) {
      this.goal = bay.anyCrossing(seed);
      return;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    // Slow down for a car stopped or crawling ahead.
    let target = this.cruiseSpeed;
    const f = this.forward();
    for (const o of others) {
      if (o === this || o.dead) continue;
      const ox = o.x - this.x;
      const oz = o.z - this.z;
      const along = ox * f.x + oz * f.z;
      const side = Math.abs(ox * f.z - oz * f.x);
      if (along > 0 && along < 9 && side < 2.6) {
        target = Math.min(target, o.speed > 0 ? o.speed : 0);
        break;
      }
    }
    this.speed += (target - this.speed) * Math.min(1, dt * 1.5);
    this.heading += steer * this.speed * dt * 0.09;
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const fixed = bay.pushOut(nx, nz, AUTO.radius);
    this.x = fixed.x;
    this.z = fixed.z;
    this.sync();
  }

  /** Police pursuit: chase a point, ramming when close. Returns true on a ram. */
  pursue(dt, bay, tx, tz) {
    if (this.dead) return false;
    this.ramWait -= dt;
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.8));
    const target = dist > 25 ? FLOW.fast + 4 : FLOW.fast;
    this.speed += (target - this.speed) * Math.min(1, dt * 2);
    this.heading += steer * this.speed * dt * 0.1;
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const fixed = bay.pushOut(nx, nz, AUTO.radius);
    this.x = fixed.x;
    this.z = fixed.z;
    this.sync();
    if (dist < 4.2 && this.ramWait <= 0) {
      this.ramWait = 1.0;
      return true;
    }
    return false;
  }
}

/** Push two cars apart and exchange a little speed; returns the impact strength. */
export function bump(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dist = Math.hypot(dx, dz);
  const min = AUTO.radius * 2;
  if (dist >= min || dist < 0.0001) return 0;
  const nx = dx / dist;
  const nz = dz / dist;
  const overlap = (min - dist) / 2;
  a.x -= nx * overlap;
  a.z -= nz * overlap;
  b.x += nx * overlap;
  b.z += nz * overlap;
  const along = (b.speed - a.speed) * 0.5;
  a.speed += along;
  b.speed -= along;
  a.sync();
  b.sync();
  return Math.abs(along);
}
