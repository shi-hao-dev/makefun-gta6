// Pedestrians: the crowd that strolls the sidewalks, flees from gunfire, and — for the
// foot cops — hunts the player down. A walker that is shot falls and stays down for a
// while, then gets back up and walks off.

import { CROWD } from './tune.js';

/** Build a walker mesh. `cop` makes a foot cop in white and dark blue with a cap. */
export function buildWalker(seed, cop) {
  const g = new THREE.Group();
  const shirt = cop
    ? 0xf2f4f6
    : seed.pick([0xd43d3d, 0x3d7bd4, 0xd4a53d, 0x3dd47a, 0x8a5fd4, 0xe88a3d, 0xd4d4d4, 0x5a8a5a]);
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: cop ? 0x1c1e22 : 0x2a2f38, roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: seed.pick([0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0]), roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  if (cop) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0x1c1e22 }));
    cap.position.y = 1.83;
    g.add(cap);
  }
  const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.26);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.16, 0.35, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.16, 0.35, 0);
  legR.castShadow = true;
  g.add(legR);
  const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.2);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.42, 1.05, 0);
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(0.42, 1.05, 0);
  armR.castShadow = true;
  g.add(armR);
  g.userData.legs = [legL, legR];
  g.userData.arms = [armL, armR];
  return g;
}

export class Walker {
  constructor(mesh, cop) {
    this.mesh = mesh;
    this.cop = cop;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = CROWD.slow;
    this.health = cop ? 102 : 34;
    this.dead = false;
    this.mode = 'stroll';
    this.goal = null;
    this.fleeLeft = 0;
    this.downLeft = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Walk one step. The caller sets goal for 'hunt'; 'flee' runs from a threat. */
  walk(dt, bay, seed) {
    if (this.dead) {
      this.downLeft -= dt;
      if (this.downLeft <= 0) {
        this.dead = false;
        this.mode = 'stroll';
        this.health = this.cop ? 102 : 34;
        this.mesh.rotation.x = 0;
        this.mesh.position.y = 0;
        this.goal = null;
      }
      return;
    }
    if (this.mode === 'flee') {
      this.fleeLeft -= dt;
      if (this.fleeLeft <= 0) this.mode = 'stroll';
    }
    if (!this.goal) this.goal = bay.anyCrossing(seed);
    const dx = this.goal.x - this.x;
    const dz = this.goal.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2) {
      if (this.mode === 'hunt') {
        // The hunt target keeps moving; the caller refreshes the goal.
        return;
      }
      this.goal = bay.anyCrossing(seed);
      return;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += Math.max(-1, Math.min(1, diff * 2)) * dt * 2.2;
    const target = this.mode === 'flee' || this.mode === 'hunt' ? CROWD.run : this.speed;
    const nx = this.x + Math.sin(this.heading) * target * dt;
    const nz = this.z + Math.cos(this.heading) * target * dt;
    const fixed = bay.pushOut(nx, nz, CROWD.radius);
    this.x = fixed.x;
    this.z = fixed.z;
    // A simple walk cycle: legs and arms swing.
    this.phase += dt * target * 2.4;
    const swing = Math.sin(this.phase) * 0.45;
    const [legL, legR] = this.mesh.userData.legs;
    const [armL, armR] = this.mesh.userData.arms;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.7;
    armR.rotation.x = swing * 0.7;
    this.sync();
  }

  /** Run away from a point. */
  flee(x, z) {
    if (this.dead) return;
    this.mode = 'flee';
    this.fleeLeft = 4;
    const dx = this.x - x;
    const dz = this.z - z;
    const d = Math.hypot(dx, dz) || 1;
    this.goal = { x: this.x + (dx / d) * 30, z: this.z + (dz / d) * 30 };
  }

  /** Take damage; returns true if this shot put the walker down. */
  harm(amount, fx, fz) {
    if (this.dead) return false;
    this.health -= amount;
    this.flee(fx, fz);
    if (this.health <= 0) {
      this.dead = true;
      this.mode = 'down';
      this.downLeft = 8;
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.position.y = 0.3;
      return true;
    }
    return false;
  }
}
