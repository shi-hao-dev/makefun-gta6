// Jace Moreno, the player: a low-poly walker with a teal jacket who moves on foot relative
// to the camera, steals cars with E, and shoots with the mouse. When he is driving, his body
// hides inside the car and the car answers the same keys.

const THREE = window.THREE;

function std(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

export function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = std(0x2fb3a3);
  const pants = std(0x2a2f38);
  const skin = std(0xe8b88a);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.38), jacket);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, 1.1), std(0x1c1410));
  hair.position.y = 1.76;
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
  legL.geometry.translate(0, -0.36, 0);
  legL.position.set(0, 0.72, 0.15);
  group.add(legL);
  const legR = legL.clone();
  legR.position.z = -0.15;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.64, 0.19), jacket);
  armL.geometry.translate(0, -0.32, 0);
  armL.position.set(0, 1.34, 0.28);
  group.add(armL);
  const armR = armL.clone();
  armR.position.z = -0.28;
  group.add(armR);
  // The pistol, held in the right hand.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.1), std(0x141518, 0.5));
  gun.position.set(0.1, 0.72, -0.28);
  group.add(gun);
  group.userData = { legL, legR, armL, armR, walkPhase: 0 };
  return group;
}

export class Player {
  constructor(mesh, x, z) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.health = 100;
    this.inCar = false;
    this.car = null;
    this.speed = 0;
    this.hurtTimer = 0;
    this.regenTimer = 0;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const u = this.mesh.userData;
    const swing = Math.sin(u.walkPhase) * 0.55 * Math.min(1, this.speed / 3);
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
  }

  /** On-foot step. `move` is {x, z} in world space, already rotated by the camera yaw. */
  stepOnFoot(dt, move, running, world) {
    const mag = Math.hypot(move.x, move.z);
    if (mag > 0.01) {
      const nx = move.x / mag;
      const nz = move.z / mag;
      const want = Math.atan2(nx, nz);
      let diff = want - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += Math.max(-10 * dt, Math.min(10 * dt, diff));
      this.speed = running ? 8.4 : 5.2;
      const px = this.x + nx * this.speed * dt;
      const pz = this.z + nz * this.speed * dt;
      const hit = world.collideCircle(px, pz, 0.7);
      this.x = hit.x;
      this.z = hit.z;
      this.mesh.userData.walkPhase += dt * this.speed * 2.4;
    } else {
      this.speed = 0;
    }
    this.syncMesh();
  }

  enterCar(car) {
    this.inCar = true;
    this.car = car;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    this.inCar = false;
    this.car = null;
    // Step out on the driver's side.
    const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    this.x = car.x + side.x * 2.6;
    this.z = car.z + side.z * 2.6;
    this.heading = car.heading;
    this.mesh.visible = true;
    this.syncMesh();
  }

  hurt(amount) {
    if (this.hurtTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.5;
    this.regenTimer = 0;
  }

  stepTimers(dt) {
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.regenTimer += dt;
    if (this.regenTimer > 8 && this.health > 0 && this.health < 100) {
      this.health = Math.min(100, this.health + 2 * dt);
    }
  }
}
