// The third-person camera: it trails behind the player on foot and behind the car while
// driving, eases toward its spot instead of snapping, and lets the mouse orbit it. A
// little shake sells the crashes.

export class Lens {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.32;
    this.dist = 9;
    this.trauma = 0;
    this.follow = true;
    this.lastMove = 0;
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Mouse deltas from a drag or pointer lock; negative dy looks up. */
  nudge(dx, dy) {
    this.yaw -= dx * 0.0042;
    this.pitch = Math.max(0.06, Math.min(1.1, this.pitch + dy * 0.0032));
    this.follow = false;
    this.lastMove = performance.now();
  }

  zoom(delta) {
    this.dist = Math.max(5, Math.min(16, this.dist + delta * 0.01));
  }

  /** Camera forward on the ground plane, for movement. */
  ahead() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  followCam(dt, focus, time) {
    if (this.follow || performance.now() - this.lastMove > 4000) {
      // Ease the camera behind the direction of travel when the player is not steering it.
      const want = focus.heading;
      let diff = want - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 1.6);
      if (performance.now() - this.lastMove > 4000) this.follow = true;
    }
    const dist = focus.inCar ? this.dist + 2.5 : this.dist;
    const height = focus.inCar ? 3.6 : 3.0;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const px = Math.sin(this.pitch);
    const py = Math.cos(this.pitch);
    const wantX = focus.x - fx * dist * py;
    const wantY = height + dist * px;
    const wantZ = focus.z - fz * dist * py;
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
    this.camera.lookAt(focus.x, 1.6, focus.z);
    this.camera.position.x -= shX;
    this.camera.position.y -= shY;
  }
}
