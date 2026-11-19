// Pistol combat: a hitscan ray from the hero's muzzle, a tracer line, a muzzle flash and
// sparks where the shot lands. The caller builds the target list and handles the
// consequences (heat, cash, sounds); this module only finds and applies the hit.

import { GUN } from './tune.js';

/** Ray-sphere intersection. Returns the distance along the ray, or null. */
export function rayBall(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const ocx = cx - ox;
  const ocy = cy - oy;
  const ocz = cz - oz;
  const t = ocx * dx + ocy * dy + ocz * dz;
  if (t < 0) return null;
  const d2 = ocx * ocx + ocy * ocy + ocz * ocz - t * t;
  if (d2 > r * r) return null;
  return t - Math.sqrt(r * r - d2);
}

export class Gunplay {
  constructor(scene, sparks) {
    this.scene = scene;
    this.sparks = sparks;
    this.cooldown = 0;
    this.tracerLeft = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0 }));
    this.tracer.frustumCulled = false;
    scene.add(this.tracer);
    this.flash = new THREE.PointLight(0xffa040, 0, 14);
    scene.add(this.flash);
  }

  /**
   * Fire one shot from `origin` along `dir` (both {x, y, z}, dir normalized).
   * `foes` is a list of {kind: 'car' | 'walker', ref, x, y, z, r}.
   * Returns a hit record, or null while the trigger is cooling down.
   */
  fire(origin, dir, foes) {
    if (this.cooldown > 0) return null;
    this.cooldown = GUN.rate;
    let best = null;
    let bestT = GUN.reach;
    for (const foe of foes) {
      const t = rayBall(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, foe.x, foe.y, foe.z, foe.r);
      if (t !== null && t < bestT) {
        bestT = t;
        best = foe;
      }
    }
    const end = {
      x: origin.x + dir.x * bestT,
      y: origin.y + dir.y * bestT,
      z: origin.z + dir.z * bestT,
    };
    // Tracer + muzzle flash.
    const pos = this.tracer.geometry.attributes.position.array;
    pos[0] = origin.x;
    pos[1] = origin.y;
    pos[2] = origin.z;
    pos[3] = end.x;
    pos[4] = end.y;
    pos[5] = end.z;
    this.tracer.geometry.attributes.position.needsUpdate = true;
    this.tracer.material.opacity = 0.95;
    this.tracerLeft = 0.07;
    this.flash.position.set(origin.x, origin.y, origin.z);
    this.flash.intensity = 10;
    if (best) {
      if (best.kind === 'car') {
        best.ref.health -= GUN.dmg;
        this.sparks.puff(end, 0xffa040, 10, 5, 0.5);
        if (best.ref.health <= 0 && !best.ref.dead) {
          best.ref.dead = true;
          this.sparks.blast({ x: best.ref.x, y: 1, z: best.ref.z });
        }
      } else {
        const down = best.ref.harm(GUN.dmg, origin.x, origin.z);
        this.sparks.puff(end, 0xd43d3d, 8, 4, 0.4);
        if (down) this.sparks.puff(end, 0xffa040, 6, 3, 0.5);
      }
      return { hit: true, kind: best.kind, ref: best.ref, point: end, dist: bestT };
    }
    this.sparks.puff(end, 0x8a8a8a, 4, 2, 0.3);
    return { hit: false, kind: null, ref: null, point: end, dist: bestT };
  }

  tick(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.tracerLeft > 0) {
      this.tracerLeft -= dt;
      this.tracer.material.opacity = Math.max(0, this.tracerLeft / 0.07) * 0.95;
      if (this.tracerLeft <= 0) this.tracer.material.opacity = 0;
    }
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 160);
  }
}
