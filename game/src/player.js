// Jace Moreno, the player: on-foot movement with building collision, getting
// in and out of cars, and health. While driving, the hero rides the car — the
// app copies the car's position onto the hero every step, so the camera, the
// missions and the police never lose track of him.

import { makePedMesh } from './ped.js';

/** The hero mesh: a teal jacket and dark jeans, so he reads against the crowd. */
export function makePlayerMesh() {
  const group = makePedMesh({ next: () => 0.5 }, false);
  // Recolour the jacket teal and the jeans dark.
  const teal = 0x1a8a7a;
  group.children.forEach((child) => {
    if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.y === 1.05) {
      child.material = child.material.clone();
      child.material.color.setHex(teal);
    }
  });
  return group;
}

export class Player {
  constructor(mesh) {
    this.mesh = mesh;
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.health = 100;
    this.inCar = false;
    this.car = null;
    this.stepPhase = 0;
    this.sync();
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Walk. mx/mz is a world-space direction; sprint doubles the pace. */
  walk(dt, mx, mz, sprint, world) {
    if (this.inCar) return;
    const len = Math.hypot(mx, mz);
    if (len < 0.01) {
      this.stepPhase = 0;
      this.mesh.userData.legL.rotation.x = 0;
      this.mesh.userData.legR.rotation.x = 0;
      return;
    }
    const speed = sprint ? 9 : 5.5;
    const nx = this.x + (mx / len) * speed * dt;
    const nz = this.z + (mz / len) * speed * dt;
    const want = Math.atan2(mx, mz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += diff * Math.min(1, dt * 10);
    const hit = world.collideCircle(nx, nz, 0.6);
    this.x = hit.x;
    this.z = hit.z;
    this.stepPhase += dt * speed * 1.6;
    const swing = Math.sin(this.stepPhase) * 0.5;
    this.mesh.userData.legL.rotation.x = swing;
    this.mesh.userData.legR.rotation.x = -swing;
    this.mesh.userData.armL.rotation.x = -swing * 0.7;
    this.mesh.userData.armR.rotation.x = swing * 0.7;
    this.sync();
  }

  enter(car) {
    this.inCar = true;
    this.car = car;
    this.mesh.visible = false;
  }

  exit() {
    if (!this.car) return;
    // Step out beside the car, on the side away from traffic.
    const side = this.car.heading + Math.PI / 2;
    this.x = this.car.x + Math.sin(side) * 3.2;
    this.z = this.car.z + Math.cos(side) * 3.2;
    this.heading = this.car.heading;
    this.inCar = false;
    this.car = null;
    this.mesh.visible = true;
    this.sync();
  }

  /** Take damage. Returns true when the hero goes down. */
  hurt(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      return true;
    }
    return false;
  }

  tick() {
    // Slow recovery while the heat is off is handled by the app; nothing here.
  }
}
