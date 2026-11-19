// Cars: one procedural mesh factory and one arcade Car class. The player, the traffic and the
// police all drive the same physics — throttle, steering that bites harder the faster you go,
// a handbrake that breaks the rear loose — and differ only in who holds the wheel.

const THREE = window.THREE;

const CAR_COLORS = [0xc0392b, 0x2e6fb8, 0xe8c832, 0x7d3c98, 0x2f8f5b, 0xd86a1e, 0x8a9ab0, 0x3a3f46];

function std(color, rough = 0.55, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function randomCarColor(rng) {
  return CAR_COLORS[Math.floor(rng.next() * CAR_COLORS.length)];
}

/** A low-poly car: body, cabin, four wheels, lights. `kind` is 'sedan' | 'sport' | 'police' | 'taxi'. */
export function makeCarMesh(color, kind = 'sedan') {
  const group = new THREE.Group();
  const bodyMat = kind === 'police' ? std(0xf2f4f6, 0.4, 0.3) : std(color, 0.45, 0.4);
  const glassMat = std(0x141c26, 0.25, 0.7);
  const trimMat = std(0x1c1e22, 0.7, 0.2);
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
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), trimMat);
    spoiler.position.set(-2.1, 1.25, 0);
    spoiler.castShadow = true;
    group.add(spoiler);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.1), trimMat);
    lip.position.set(-2.1, 1.0, 0);
    group.add(lip);
  }
  if (kind === 'police') {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.02), std(0x1c1e22, 0.5, 0.3));
    door.position.set(0.1, bodyY, 0);
    group.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.5), trimMat);
    bar.position.set(-0.25, bodyY + bodyH / 2 + 0.66, 0);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.6), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1 }));
    red.position.set(-0.25, bodyY + bodyH / 2 + 0.78, 0.38);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.6), new THREE.MeshStandardMaterial({ color: 0x2e6bff, emissive: 0x2e6bff, emissiveIntensity: 1 }));
    blue.position.set(-0.25, bodyY + bodyH / 2 + 0.78, -0.38);
    group.add(blue);
    group.userData.sirenRed = red;
    group.userData.sirenBlue = blue;
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: 0.5 }));
    sign.position.set(-0.25, bodyY + bodyH / 2 + 0.66, 0);
    group.add(sign);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheelMat = std(0x141518, 0.9, 0.1);
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
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), tailMat);
  tailL.position.set(-2.21, 0.72, 0.62);
  group.add(tailL);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), tailMat);
  tailR.position.set(-2.21, 0.72, -0.62);
  group.add(tailR);
  group.userData.tailMat = tailMat;
  group.userData.wheels = wheels;
  return group;
}

export class Car {
  constructor(mesh, x, z, heading, kind = 'sedan') {
    this.mesh = mesh;
    this.kind = kind;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.health = 120;
    this.dead = false;
    this.brakeLight = false;
    this.target = null; // traffic: next intersection {x, z}
    this.targetSpeed = 0;
    this.wait = 0;
    this.ramCooldown = 0;
    this.smokeTimer = 0;
    this.syncMesh();
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  syncMesh() {
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
   * Arcade step. `ctrl` is {throttle -1..1, steer -1..1, brake, handbrake}. Returns the
   * impact speed when the car hit something hard, else 0.
   */
  step(dt, ctrl, world) {
    if (this.dead) return 0;
    const maxSteer = 0.55 / (1 + Math.abs(this.speed) * 0.045);
    const steerTarget = ctrl.steer * maxSteer;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    // Bicycle model: heading rate is speed over wheelbase times tan(steering angle).
    this.heading += (this.speed / 2.8) * Math.tan(this.steer) * dt * (ctrl.handbrake ? 1.5 : 1);
    let accel = ctrl.throttle * 16;
    if (ctrl.brake) accel -= Math.sign(this.speed) * 30;
    if (ctrl.handbrake) accel -= Math.sign(this.speed) * 10;
    this.speed += accel * dt;
    // Drag and rolling resistance.
    this.speed -= this.speed * 0.35 * dt;
    if (this.speed > 34) this.speed = 34;
    if (this.speed < -10) this.speed = -10;
    if (Math.abs(this.speed) < 0.15 && ctrl.throttle === 0) this.speed = 0;
    const f = this.forward();
    const nx = this.x + f.x * this.speed * dt;
    const nz = this.z + f.z * this.speed * dt;
    const hit = world.collideCircle(nx, nz, 2.1);
    const impact = hit.hit ? Math.abs(this.speed) : 0;
    if (hit.hit) {
      // Kill the velocity component that ran into the wall.
      const dot = f.x * hit.nx + f.z * hit.nz;
      if (dot < 0) this.speed *= 0.45;
      this.x = hit.x;
      this.z = hit.z;
    } else {
      this.x = nx;
      this.z = nz;
    }
    this.brakeLight = ctrl.brake || (ctrl.throttle < 0 && this.speed > 1);
    for (const w of this.mesh.userData.wheels) w.rotation.x += (this.speed / 0.42) * dt;
    this.syncMesh();
    return impact;
  }

  /** Traffic AI: chase the target intersection, then pick the next one. */
  stepTraffic(dt, world, rng, others) {
    if (this.dead) return 0;
    if (!this.target) {
      this.target = world.randomIntersection(rng);
      this.targetSpeed = 8 + rng.next() * 5;
    }
    const dx = this.target.x - this.x;
    const dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 5) {
      this.target = pickNextIntersection(world, this.target, rng);
      return this.step(dt, { throttle: 0, steer: 0, brake: false, handbrake: false }, world);
    }
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Slow for the car ahead.
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
    return this.step(dt, { throttle, steer: Math.max(-1, Math.min(1, diff * 2.2)), brake: false, handbrake: false }, world);
  }

  /** Police AI: steer at the target point and ram it. */
  stepPolice(dt, world, tx, tz, speed) {
    if (this.dead) return 0;
    const dx = tx - this.x;
    const dz = tz - this.z;
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const dist = Math.hypot(dx, dz);
    const throttle = dist > 6 ? 1 : 0.4;
    return this.step(dt, { throttle, steer: Math.max(-1, Math.min(1, diff * 2.6)), brake: false, handbrake: false }, world);
  }
}

function pickNextIntersection(world, current, rng) {
  const options = [];
  for (const p of world.intersections) {
    const dx = Math.abs(p.x - current.x);
    const dz = Math.abs(p.z - current.z);
    if ((dx === 60 && dz === 0) || (dz === 60 && dx === 0)) options.push(p);
  }
  if (options.length === 0) return world.randomIntersection(rng);
  return options[Math.floor(rng.next() * options.length)];
}

/** Push two overlapping cars apart (circle vs circle) and report the impact speed. */
export function collideCars(a, b) {
  if (a.dead || b.dead) return 0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = 4.2;
  if (d >= min || d < 0.001) return 0;
  const push = (min - d) / 2;
  const nx = dx / d;
  const nz = dz / d;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
  const rel = Math.abs(a.speed - b.speed);
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7;
  b.speed = avg * 0.7;
  a.syncMesh();
  b.syncMesh();
  return rel;
}
