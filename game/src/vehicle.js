// Cars: one procedural mesh factory and one arcade Car class. The player, the
// traffic and the police all drive the same physics — throttle, steering that
// bites less the faster you go, a handbrake that breaks the rear loose — and
// differ only in who holds the wheel.

import { angleDiff, clamp } from './util.js';

const THREE = window.THREE;

const PAINT = [0xc0392b, 0x2e6fb8, 0xe8c832, 0x7d3c98, 0x2f8f5b, 0xd86a1e, 0x8a9ab0, 0x3a3f46];

function paint(color, rough = 0.5, metal = 0.4) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function randomPaint(rng) {
  return PAINT[Math.floor(rng.next() * PAINT.length)];
}

/** A low-poly car: body, cabin, four wheels, lights. kind: sedan | sport | cop | taxi. */
export function makeCarMesh(color, kind = 'sedan') {
  const group = new THREE.Group();
  const bodyMat = kind === 'cop' ? paint(0xf2f4f6, 0.4, 0.3) : paint(color, 0.45, 0.4);
  const glassMat = paint(0x141c26, 0.25, 0.7);
  const trimMat = paint(0x1c1e22, 0.7, 0.2);
  const low = kind === 'sport';
  const bodyH = low ? 0.7 : 0.85;
  const bodyY = low ? 0.62 : 0.72;

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, bodyH, 2.0), bodyMat);
  body.position.y = bodyY;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 1.75), glassMat);
  cabin.position.set(-0.25, bodyY + bodyH / 2 + 0.28, 0);
  cabin.castShadow = true;
  group.add(cabin);

  if (kind === 'sport') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), trimMat);
    wing.position.set(-2.1, 1.25, 0);
    wing.castShadow = true;
    group.add(wing);
  }
  if (kind === 'cop') {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.02), paint(0x1c1e22, 0.5, 0.3));
    door.position.set(0.1, bodyY, 0);
    group.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.5), trimMat);
    bar.position.set(-0.25, bodyY + bodyH / 2 + 0.66, 0);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1 }));
    red.position.set(-0.25, bodyY + bodyH / 2 + 0.78, 0.38);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x2e6bff, emissive: 0x2e6bff, emissiveIntensity: 1 }));
    blue.position.set(-0.25, bodyY + bodyH / 2 + 0.78, -0.38);
    group.add(blue);
    group.userData.sirenRed = red;
    group.userData.sirenBlue = blue;
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: 0.5 }));
    sign.position.set(-0.25, bodyY + bodyH / 2 + 0.66, 0);
    group.add(sign);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheelMat = paint(0x141518, 0.9, 0.1);
  const wheels = [];
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.42, wz);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    pivot.add(wheel);
    group.add(pivot);
    wheels.push(pivot);
  }

  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2b0, emissiveIntensity: 0.9 });
  for (const wz of [0.62, -0.62]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), headMat);
    head.position.set(2.21, 0.72, wz);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd21f1f, emissive: 0xd21f1f, emissiveIntensity: 0.5 });
  for (const wz of [0.62, -0.62]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), tailMat);
    tail.position.set(-2.21, 0.72, wz);
    group.add(tail);
  }
  group.userData.tailMat = tailMat;
  group.userData.wheels = wheels;
  return group;
}

export class Car {
  constructor(mesh, kind = 'sedan') {
    this.mesh = mesh;
    this.kind = kind;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = 0;
    // A police cruiser tops out clearly slower than the player's car, so a
    // clean getaway on open road can actually shake the chase.
    this.topSpeed = kind === 'cop' ? 24 : 34;
    this.steer = 0;
    this.health = 120;
    this.dead = false;
    this.stolen = false;
    // Anchored cars never move in a collision (the parked mission car).
    this.anchored = false;
    this.brakeLight = false;
    this.target = null; // traffic: next intersection {x, z}
    this.cruiseSpeed = 10;
    this.wait = 0;
    this.smokeWait = 0;
    this.sync();
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    this.mesh.userData.tailMat.emissiveIntensity = this.brakeLight ? 1.6 : 0.5;
    if (this.mesh.userData.sirenRed) {
      const on = Math.floor(performance.now() / 280) % 2 === 0;
      this.mesh.userData.sirenRed.material.emissiveIntensity = on ? 2.2 : 0.1;
      this.mesh.userData.sirenBlue.material.emissiveIntensity = on ? 0.1 : 2.2;
    }
  }

  /**
   * Arcade step. ctrl is {fwd -1..1, steer -1..1, brake, handbrake}. Returns the
   * impact speed when the car hit something hard, else 0.
   */
  drive(dt, ctrl, world) {
    if (this.dead) return 0;
    const maxSteer = 0.55 / (1 + Math.abs(this.speed) * 0.045);
    const steerTarget = ctrl.steer * maxSteer;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    // Gentle turn rate: a twitchy car overshoots every corner and wedges
    // itself in buildings. ~1.4 rad/s at speed keeps it controllable.
    this.heading += (this.speed / 4.5) * Math.tan(this.steer) * dt * (ctrl.handbrake ? 1.5 : 1);
    let accel = ctrl.fwd * 16;
    if (ctrl.brake) accel -= Math.sign(this.speed) * 30;
    if (ctrl.handbrake) accel -= Math.sign(this.speed) * 10;
    this.speed += accel * dt;
    this.speed -= this.speed * 0.35 * dt;
    if (this.speed > this.topSpeed) this.speed = this.topSpeed;
    if (this.speed < -10) this.speed = -10;
    if (Math.abs(this.speed) < 0.15 && ctrl.fwd === 0) this.speed = 0;
    const f = this.forward();
    const nx = this.x + f.x * this.speed * dt;
    const nz = this.z + f.z * this.speed * dt;
    // A tight collision circle lets the car thread the road without
    // catching every building corner.
    const hit = world.collideCircle(nx, nz, 1.7);
    const impact = hit.hit ? Math.abs(this.speed) : 0;
    if (hit.hit) {
      const dot = f.x * hit.nx + f.z * hit.nz;
      if (dot < 0) this.speed *= 0.45;
      this.x = hit.x;
      this.z = hit.z;
    } else {
      this.x = nx;
      this.z = nz;
    }
    this.brakeLight = ctrl.brake || (ctrl.fwd < 0 && this.speed > 1);
    for (const w of this.mesh.userData.wheels) w.rotation.x += (this.speed / 0.42) * dt;
    this.sync();
    return impact;
  }

  /** Traffic AI: chase the target intersection, then pick a neighbouring one. */
  cruise(dt, world, rng, others) {
    if (this.dead) return 0;
    if (!this.target) {
      this.target = world.randomCrossing(rng);
      this.cruiseSpeed = 8 + rng.next() * 5;
    }
    const dx = this.target.x - this.x;
    const dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 5) {
      this.target = nextCrossing(world, this.target, rng);
      return this.drive(dt, { fwd: 0, steer: 0, brake: false, handbrake: false }, world);
    }
    const want = Math.atan2(dx, dz);
    const diff = angleDiff(want, this.heading);
    let throttle = 0.55;
    for (const other of others) {
      if (other === this || other.dead) continue;
      const ox = other.x - this.x;
      const oz = other.z - this.z;
      const od = Math.hypot(ox, oz);
      if (od < 9) {
        const f = this.forward();
        if (ox * f.x + oz * f.z > 0) throttle = Math.min(throttle, 0.1);
      }
    }
    if (dist < 18) throttle = Math.min(throttle, 0.3);
    return this.drive(dt, { fwd: throttle, steer: clamp(diff * 2.2, -1, 1), brake: false, handbrake: false }, world);
  }

  /** Police AI: steer at the target point and ram it. */
  chase(dt, world, tx, tz) {
    if (this.dead) return 0;
    const dx = tx - this.x;
    const dz = tz - this.z;
    const want = Math.atan2(dx, dz);
    const diff = angleDiff(want, this.heading);
    const dist = Math.hypot(dx, dz);
    const throttle = dist > 6 ? 1 : 0.4;
    return this.drive(dt, { fwd: throttle, steer: clamp(diff * 2.6, -1, 1), brake: false, handbrake: false }, world);
  }
}

function nextCrossing(world, current, rng) {
  const options = [];
  for (const p of world.crossings) {
    const dx = Math.abs(p.x - current.x);
    const dz = Math.abs(p.z - current.z);
    if ((dx === 60 && dz === 0) || (dz === 60 && dx === 0)) options.push(p);
  }
  if (options.length === 0) return world.randomCrossing(rng);
  return options[Math.floor(rng.next() * options.length)];
}

/** Push two overlapping cars apart and report the impact speed. An anchored
 * car (the parked mission car, before it is stolen) never moves — the other
 * car takes the full push instead. */
export function separateCars(a, b) {
  if (a.dead || b.dead) return 0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = 4.2;
  if (d >= min || d < 0.001) return 0;
  const push = (min - d) / 2;
  const nx = dx / d;
  const nz = dz / d;
  if (a.anchored && b.anchored) {
    // Neither moves.
  } else if (a.anchored) {
    b.x += nx * push * 2;
    b.z += nz * push * 2;
  } else if (b.anchored) {
    a.x -= nx * push * 2;
    a.z -= nz * push * 2;
  } else {
    a.x -= nx * push;
    a.z -= nz * push;
    b.x += nx * push;
    b.z += nz * push;
  }
  const rel = Math.abs(a.speed - b.speed);
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7;
  b.speed = avg * 0.7;
  a.sync();
  b.sync();
  return rel;
}
