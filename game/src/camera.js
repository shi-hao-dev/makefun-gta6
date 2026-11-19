// The third-person camera: it trails behind the player on foot and behind the car while
// driving, eases toward its spot instead of snapping, and lets the mouse orbit it. A little
// shake sells the crashes.

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.32;
    this.distance = 9;
    this.trauma = 0;
    this.autoAlign = true;
    this.lastDrag = 0;
  }

  addShake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Mouse deltas from a drag or pointer lock; negative dy looks up. */
  orbit(dx, dy) {
    this.yaw -= dx * 0.0042;
    this.pitch = Math.max(0.06, Math.min(1.1, this.pitch + dy * 0.0032));
    this.autoAlign = false;
    this.lastDrag = performance.now();
  }

  zoom(delta) {
    this.distance = Math.max(5, Math.min(16, this.distance + delta * 0.01));
  }

  /** Camera forward on the ground plane, for movement. */
  forward() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  update(dt, target, time) {
    if (this.autoAlign || performance.now() - this.lastDrag > 4000) {
      // Ease the camera behind the direction of travel when the player is not steering it.
      const want = target.heading;
      let diff = want - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 1.6);
      if (performance.now() - this.lastDrag > 4000) this.autoAlign = true;
    }
    const dist = target.inCar ? this.distance + 2.5 : this.distance;
    const height = target.inCar ? 3.6 : 3.0;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const px = Math.sin(this.pitch);
    const py = Math.cos(this.pitch);
    const wantX = target.x - fx * dist * py;
    const wantY = height + dist * px;
    const wantZ = target.z - fz * dist * py;
    const k = Math.min(1, dt * 7);
    this.camera.position.x += (wantX - this.camera.position.x) * k;
    this.camera.position.y += (wantY - this.camera.position.y) * k;
    this.camera.position.z += (wantZ - this.camera.position.z) * k;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma;
    const shX = (Math.random() - 0.5) * sh * 0.9;
    const shY = (Math.random() - 0.5) * sh * 0.6;
    this.camera.position.x += shX;
    this.camera.position.y += shY;
    this.camera.lookAt(target.x, 1.6, target.z);
    this.camera.position.x -= shX;
    this.camera.position.y -= shY;
  }
}
