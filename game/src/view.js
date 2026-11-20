// The camera: a third-person chase rig that sits behind the player or the
// car, swings with the mouse, zooms with the wheel, and shakes on impacts.
// The player never fights it — it follows the heading, it never orbits.

import { angleDiff, clamp, lerp } from './util.js';

export class View {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0; // extra yaw the player drags with the mouse
    this.pitch = 0.32;
    this.dist = 11;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.cx = 0;
    this.cz = 0;
  }

  nudge(dx, dy) {
    this.yaw -= dx * 0.005;
    this.pitch = clamp(this.pitch + dy * 0.004, 0.08, 0.9);
  }

  zoom(d) {
    this.dist = clamp(this.dist + d * 0.01, 7, 20);
  }

  shake(amount) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
    this.shakeT = 0.5;
  }

  /** Forward on the ground plane, from the camera's point of view. */
  ahead() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  /**
   * Chase the focus {x, z, heading, inCar}. The camera trails behind the
   * heading, eased so it never snaps, and looks a little ahead of the motion.
   */
  followCam(dt, focus, time) {
    const wantYaw = focus.heading;
    let dy = angleDiff(wantYaw, this.yaw);
    // When the player drags the mouse they own the yaw; ease back gently.
    this.yaw += dy * Math.min(1, dt * 1.4);
    const dist = focus.inCar ? this.dist + 2.5 : this.dist;
    const height = focus.inCar ? 5.2 : 4.6;
    const back = 1;
    const tx = focus.x - Math.sin(this.yaw) * dist * back;
    const tz = focus.z - Math.cos(this.yaw) * dist * back;
    const k = Math.min(1, dt * 6);
    this.cx = lerp(this.cx, tx, k);
    this.cz = lerp(this.cz, tz, k);
    let sx = 0;
    let sy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeAmp * (this.shakeT / 0.5);
      sx = (Math.random() - 0.5) * s;
      sy = (Math.random() - 0.5) * s;
      if (this.shakeT <= 0) this.shakeAmp = 0;
    }
    this.camera.position.set(this.cx + sx, height + Math.sin(this.pitch) * dist * 0.4 + sy, this.cz);
    const lookX = focus.x + Math.sin(focus.heading) * 6;
    const lookZ = focus.z + Math.cos(focus.heading) * 6;
    this.camera.lookAt(lookX, 1.6, lookZ);
  }
}
