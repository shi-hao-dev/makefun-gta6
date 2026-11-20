// The pistol: a hitscan shot against cars, walkers and foot cops. A tracer
// line and a muzzle flash sell the shot; the range is short enough that the
// player has to get close, and every shot that lands raises the heat.

const THREE = window.THREE;

const RANGE = 60;

export class Pistol {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.flash = null;
    this.flashLife = 0;
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 });
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), flashMat);
    this.flash.visible = false;
    scene.add(this.flash);
  }

  /**
   * Fire from origin along dir (a flat {x, z} unit vector). targets are
   * {kind, ref, x, y, z, r}. Returns the nearest hit {kind, ref, point} or null.
   */
  fire(origin, dir, targets) {
    // Muzzle flash at the gun.
    this.flash.position.set(origin.x, origin.y, origin.z);
    this.flash.visible = true;
    this.flash.material.opacity = 0.95;
    this.flashLife = 0.06;

    let best = null;
    let bestD = RANGE;
    for (const t of targets) {
      const dx = t.x - origin.x;
      const dz = t.z - origin.z;
      const along = dx * dir.x + dz * dir.z;
      if (along < 0 || along > bestD) continue;
      const perp = Math.abs(dx * dir.z - dz * dir.x);
      if (perp > t.r + 0.6) continue;
      bestD = along;
      best = { kind: t.kind, ref: t.ref, point: { x: origin.x + dir.x * along, y: t.y, z: origin.z + dir.z * along }, dist: along };
    }

    const end = best
      ? best.point
      : { x: origin.x + dir.x * RANGE, y: origin.y, z: origin.z + dir.z * RANGE };
    const len = Math.hypot(end.x - origin.x, end.y - origin.y, end.z - origin.z);
    const geo = new THREE.CylinderGeometry(0.03, 0.03, len, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.85 });
    const tracer = new THREE.Mesh(geo, mat);
    tracer.position.set((origin.x + end.x) / 2, (origin.y + end.y) / 2, (origin.z + end.z) / 2);
    tracer.lookAt(end.x, end.y, end.z);
    tracer.rotateX(Math.PI / 2);
    this.scene.add(tracer);
    this.tracers.push({ mesh: tracer, life: 0.09 });
    return best;
  }

  tick(dt) {
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      this.flash.material.opacity = Math.max(0, this.flashLife / 0.06) * 0.95;
      if (this.flashLife <= 0) this.flash.visible = false;
    }
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.09) * 0.85;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
