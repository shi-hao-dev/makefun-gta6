// The crowd: a simple procedural person mesh and a Walker class. Walkers
// wander the sidewalks, scatter when they hear a gunshot, and fall down when
// hit. Foot cops are the same mesh in a dark uniform with a cap.

const THREE = window.THREE;

const SHIRTS = [0xd86a1e, 0x2e6fb8, 0x7d3c98, 0x2f8f5b, 0xe8c832, 0xc0392b, 0x8a9ab0, 0xe8e8e8];
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];

function cloth(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

/** A low-poly person: torso, head, two legs, two arms. cop swaps the palette. */
export function buildPerson(dice, cop = false) {
  const group = new THREE.Group();
  const shirt = cop ? 0x1c2a4a : SHIRTS[Math.floor(dice.roll() * SHIRTS.length)];
  const skin = SKINS[Math.floor(dice.roll() * SKINS.length)];
  const pants = cop ? 0x141c26 : 0x2a2f36;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), cloth(shirt));
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), cloth(skin, 0.7));
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);

  if (cop) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), cloth(0x141c26));
    cap.position.y = 1.82;
    group.add(cap);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, 1.2), cloth(0x2a2018, 0.95));
    hair.position.y = 1.66;
    group.add(hair);
  }

  const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.24);
  const legMat = cloth(pants);
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.16, 0.35, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.16, 0.35, 0);
  legR.castShadow = true;
  group.add(legR);

  const armGeo = new THREE.BoxGeometry(0.16, 0.62, 0.18);
  const armMat = cloth(shirt);
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.4, 1.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.4, 1.05, 0);
  group.add(armR);

  group.userData.legL = legL;
  group.userData.legR = legR;
  group.userData.armL = armL;
  group.userData.armR = armR;
  return group;
}

export class Walker {
  constructor(mesh, cop = false) {
    this.mesh = mesh;
    this.cop = cop;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = 1.2;
    this.dead = false;
    this.fleeX = 0;
    this.fleeZ = 0;
    this.fleeing = 0;
    this.target = null;
    this.stepPhase = 0;
    this.sync();
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Run away from a point for a few seconds. */
  fleeFrom(x, z) {
    const dx = this.x - x;
    const dz = this.z - z;
    const d = Math.hypot(dx, dz) || 1;
    this.fleeX = dx / d;
    this.fleeZ = dz / d;
    this.fleeing = 4;
  }

  fall() {
    this.dead = true;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.3;
  }

  /** Wander to a random crossing, or run from a threat. */
  walk(dt, city, dice) {
    if (this.dead) return;
    let tx;
    let tz;
    let speed = this.speed;
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      tx = this.x + this.fleeX * 30;
      tz = this.z + this.fleeZ * 30;
      speed = this.cop ? 3.4 : 4.2;
    } else {
      if (!this.target) this.target = city.randomCrossing(dice);
      tx = this.target.x;
      tz = this.target.z;
      if (Math.hypot(tx - this.x, tz - this.z) < 4) {
        this.target = city.randomCrossing(dice);
        tx = this.target.x;
        tz = this.target.z;
      }
    }
    const want = Math.atan2(tx - this.x, tz - this.z);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += diff * Math.min(1, dt * 5);
    const nx = this.x + Math.sin(this.heading) * speed * dt;
    const nz = this.z + Math.cos(this.heading) * speed * dt;
    const hit = city.pushOut(nx, nz, 0.5);
    this.x = hit.x;
    this.z = hit.z;
    // Walk cycle: swing the limbs.
    this.stepPhase += dt * speed * 4;
    const swing = Math.sin(this.stepPhase) * 0.45;
    this.mesh.userData.legL.rotation.x = swing;
    this.mesh.userData.legR.rotation.x = -swing;
    this.mesh.userData.armL.rotation.x = -swing * 0.7;
    this.mesh.userData.armR.rotation.x = swing * 0.7;
    this.sync();
  }
}
