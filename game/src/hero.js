// The player on foot: Jace Moreno, teal jacket, dark pants. He walks and sprints, climbs
// into cars and out again, and slowly recovers health when he has been out of trouble.

import { HERO, HUES } from './tune.js';

/** Build the hero mesh. Faces +z in local space, like the cars. */
export function buildHero() {
  const g = new THREE.Group();
  const jacketMat = new THREE.MeshStandardMaterial({ color: HUES.jacket, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.8, 0.36), jacketMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), new THREE.MeshStandardMaterial({ color: 0x1c1e22 }));
  hair.position.y = 1.94;
  g.add(hair);
  const legGeo = new THREE.BoxGeometry(0.26, 0.75, 0.28);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.17, 0.38, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.17, 0.38, 0);
  legR.castShadow = true;
  g.add(legR);
  const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.22);
  const armL = new THREE.Mesh(armGeo, jacketMat);
  armL.position.set(-0.45, 1.1, 0);
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, jacketMat);
  armR.position.set(0.45, 1.1, 0);
  armR.castShadow = true;
  g.add(armR);
  g.userData.legs = [legL, legR];
  g.userData.arms = [armL, armR];
  return g;
}

export class Hero {
  constructor(mesh) {
    this.mesh = mesh;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.health = HERO.health;
    this.inAuto = false;
    this.auto = null;
    this.speed = 0;
    this.hurtWait = 0;
    this.regenWait = 0;
    this.phase = 0;
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Walk on foot. `mx, mz` is the desired world-space direction, magnitude 0..1. */
  stroll(dt, mx, mz, sprint, bay) {
    const mag = Math.hypot(mx, mz);
    if (mag < 0.05) {
      this.speed = 0;
      return;
    }
    const target = sprint ? HERO.sprint : HERO.walk;
    this.speed = target;
    const want = Math.atan2(mx, mz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += Math.max(-1, Math.min(1, diff * 2.5)) * dt * 8;
    const nx = this.x + (mx / mag) * target * dt;
    const nz = this.z + (mz / mag) * target * dt;
    const fixed = bay.pushOut(nx, nz, HERO.radius);
    this.x = fixed.x;
    this.z = fixed.z;
    this.phase += dt * target * 2.2;
    const swing = Math.sin(this.phase) * 0.5;
    const [legL, legR] = this.mesh.userData.legs;
    const [armL, armR] = this.mesh.userData.arms;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.7;
    armR.rotation.x = swing * 0.7;
    this.sync();
  }

  climbIn(auto) {
    this.inAuto = true;
    this.auto = auto;
    this.mesh.visible = false;
  }

  climbOut() {
    if (!this.auto) return;
    const side = { x: Math.cos(this.auto.heading), z: -Math.sin(this.auto.heading) };
    this.x = this.auto.x + side.x * 2.6;
    this.z = this.auto.z + side.z * 2.6;
    this.heading = this.auto.heading;
    this.inAuto = false;
    this.auto = null;
    this.mesh.visible = true;
    this.sync();
  }

  /** Take damage; returns true if it landed (brief invulnerability after a hit). */
  hurt(amount) {
    if (this.hurtWait > 0) return false;
    this.health -= amount;
    this.hurtWait = 0.4;
    this.regenWait = 6;
    return true;
  }

  tick(dt) {
    this.hurtWait = Math.max(0, this.hurtWait - dt);
    this.regenWait = Math.max(0, this.regenWait - dt);
    if (this.regenWait <= 0 && this.health > 0 && this.health < HERO.health) {
      this.health = Math.min(HERO.health, this.health + 4 * dt);
    }
  }
}
