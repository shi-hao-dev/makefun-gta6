// Pedestrians: low-poly walkers who stroll the sidewalks, and run when something scary
// happens nearby. Foot cops are the same walker with a dark uniform and a chase order.

const THREE = window.THREE;

const SHIRTS = [0xe8e4da, 0xd94f4f, 0x4f7dd9, 0x53b06a, 0xe0a83c, 0x8a5fb0, 0x3aa7a3, 0xd97fb0];
const PANTS = [0x2a2f38, 0x3a4a6b, 0x5a4632, 0x4a4a4a];
const SKINS = [0xe8b88a, 0xc98d64, 0x8a5a3b, 0xf0c8a0];

function std(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

/** A simple walker: torso, head, two legs that swing, two arms. */
export function makePedMesh(rng, cop = false) {
  const group = new THREE.Group();
  const shirt = cop ? 0x1c2f4a : SHIRTS[Math.floor(rng.next() * SHIRTS.length)];
  const pants = cop ? 0x1c1e22 : PANTS[Math.floor(rng.next() * PANTS.length)];
  const skin = SKINS[Math.floor(rng.next() * SKINS.length)];
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), std(shirt));
  torso.position.y = 1.08;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), std(skin));
  head.position.y = 1.68;
  head.castShadow = true;
  group.add(head);
  if (cop) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), std(0x1c2f4a));
    cap.position.y = 1.86;
    group.add(cap);
  } else if (rng.next() < 0.4) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, 1.2), std(0x2a2018));
    hair.position.y = 1.72;
    group.add(hair);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), std(pants));
  legL.position.set(0, 0.35, 0.14);
  legL.geometry.translate(0, -0.35, 0);
  legL.position.y = 0.7;
  group.add(legL);
  const legR = legL.clone();
  legR.position.z = -0.14;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), std(shirt));
  armL.position.set(0, 1.32, 0.26);
  armL.geometry.translate(0, -0.31, 0);
  armL.position.y = 1.32;
  group.add(armL);
  const armR = armL.clone();
  armR.position.z = -0.26;
  group.add(armR);
  group.userData = { legL, legR, armL, armR, walkPhase: rng.next() * 6 };
  return group;
}

export class Ped {
  constructor(mesh, x, z, heading, cop = false) {
    this.mesh = mesh;
    this.cop = cop;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.health = cop ? 102 : 34;
    this.dead = false;
    this.state = 'walk'; // walk | flee | chase | down
    this.target = null; // sidewalk waypoint
    this.fleeFrom = null;
    this.fleeTimer = 0;
    this.downTimer = 0;
    this.bustTimer = 0;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const u = this.mesh.userData;
    const swing = this.state === 'down' ? 0 : Math.sin(u.walkPhase) * 0.55 * Math.min(1, this.speed / 2);
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    if (this.state === 'down') {
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.25;
    } else {
      this.mesh.rotation.z = 0;
      this.mesh.position.y = 0;
    }
  }

  step(dt, world, rng) {
    if (this.dead) return;
    if (this.state === 'down') {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.mesh.visible = false;
        this.dead = true;
      }
      this.syncMesh();
      return;
    }
    let speed = this.cop ? 3.4 : 1.5;
    let tx = null;
    let tz = null;
    if (this.state === 'flee' && this.fleeFrom) {
      speed = 3.6;
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0) this.state = 'walk';
      tx = this.x + (this.x - this.fleeFrom.x);
      tz = this.z + (this.z - this.fleeFrom.z);
    } else if (this.state === 'chase' && this.target) {
      tx = this.target.x;
      tz = this.target.z;
    } else {
      if (!this.target) this.target = pickSidewalkTarget(world, this, rng);
      const dx = this.target.x - this.x;
      const dz = this.target.z - this.z;
      if (Math.hypot(dx, dz) < 2) {
        this.target = pickSidewalkTarget(world, this, rng);
      } else {
        tx = this.target.x;
        tz = this.target.z;
      }
    }
    if (tx !== null) {
      const want = Math.atan2(tx - this.x, tz - this.z);
      let diff = want - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
    }
    this.speed = speed;
    const nx = this.x + Math.sin(this.heading) * speed * dt;
    const nz = this.z + Math.cos(this.heading) * speed * dt;
    const hit = world.collideCircle(nx, nz, 0.6);
    this.x = hit.x;
    this.z = hit.z;
    this.mesh.userData.walkPhase += dt * speed * 3.2;
    this.syncMesh();
  }

  /** Scare this pedestrian: run away from (x, z) for a few seconds. */
  scare(x, z) {
    if (this.cop || this.state === 'down') return;
    this.state = 'flee';
    this.fleeFrom = { x, z };
    this.fleeTimer = 3 + Math.random() * 2;
  }

  hurt(amount, fromX = this.x, fromZ = this.z) {
    if (this.state === 'down') return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'down';
      this.downTimer = 6;
      this.syncMesh();
      return true;
    }
    this.scare(fromX, fromZ);
    return false;
  }
}

function pickSidewalkTarget(world, ped, rng) {
  // Walk along a sidewalk line: a street centre offset by +-8, to a random point on it.
  const streets = [-210, -150, -90, -30, 30, 90, 150, 210];
  const s = streets[Math.floor(rng.next() * streets.length)];
  const off = rng.next() < 0.5 ? 8 : -8;
  if (rng.next() < 0.5) return { x: rng.next() * 420 - 210, z: s + off };
  return { x: s + off, z: rng.next() * 420 - 210 };
}
