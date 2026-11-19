// Shooting: a hitscan ray from the camera through the crosshair. Peds and cops are spheres,
// cars are bigger spheres; the closest thing the ray passes wins. A tracer line and a muzzle
// flash make the shot read, and the damage lands at once.

const THREE = window.THREE;

export class Combat {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.cooldown = 0;
    // One reusable tracer line.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0 }));
    this.tracer.frustumCulled = false;
    scene.add(this.tracer);
    this.tracerTimer = 0;
    this.flash = new THREE.PointLight(0xffe27a, 0, 12);
    scene.add(this.flash);
  }

  /** Fire one shot. `origin`/`dir` are world vectors; returns what was hit, or null. */
  shoot(origin, dir, targets) {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.22;
    const muzzle = { x: origin.x + dir.x * 1.2, y: origin.y, z: origin.z + dir.z * 1.2 };
    this.flash.position.set(muzzle.x, 1.4, muzzle.z);
    this.flash.intensity = 60;
    let bestT = 90;
    let best = null;
    // Pedestrians and cops: a sphere at chest height.
    for (const ped of targets.peds) {
      if (ped.dead || ped.state === 'down') continue;
      const t = raySphere(origin, dir, { x: ped.x, y: 1.1, z: ped.z }, 1.0);
      if (t !== null && t < bestT) {
        bestT = t;
        best = { type: 'ped', target: ped };
      }
    }
    // Cars: a fat sphere at the body.
    for (const car of targets.cars) {
      if (car.dead) continue;
      const t = raySphere(origin, dir, { x: car.x, y: 0.9, z: car.z }, 2.4);
      if (t !== null && t < bestT) {
        bestT = t;
        best = { type: 'car', target: car };
      }
    }
    const end = {
      x: origin.x + dir.x * bestT,
      y: origin.y + dir.y * bestT,
      z: origin.z + dir.z * bestT,
    };
    const pos = this.tracer.geometry.attributes.position;
    pos.setXYZ(0, muzzle.x, 1.4, muzzle.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    this.tracer.material.opacity = 0.9;
    this.tracerTimer = 0.06;
    if (best) {
      this.effects.burst(end, 0xffd23f, 10, 6, 0.5);
      if (best.type === 'ped') {
        const killed = best.target.hurt(34, origin.x, origin.z);
        if (killed) this.effects.burst({ x: best.target.x, y: 1.0, z: best.target.z }, 0xd94f4f, 14, 5, 0.8);
        return { hit: true, kind: best.target.cop ? 'cop' : 'ped', killed };
      }
      best.target.health -= 34;
      this.effects.burst(end, 0x9aa2ad, 12, 7, 0.6);
      if (best.target.health <= 0 && !best.target.dead) {
        best.target.dead = true;
        return { hit: true, kind: 'car', destroyed: true, car: best.target };
      }
      return { hit: true, kind: 'car' };
    }
    return { hit: false };
  }

  step(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0) this.tracer.material.opacity = 0;
    }
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 500);
  }
}

/** Ray-sphere intersection; returns the distance along the ray, or null. */
function raySphere(origin, dir, centre, radius) {
  const ox = centre.x - origin.x;
  const oy = centre.y - origin.y;
  const oz = centre.z - origin.z;
  const tca = ox * dir.x + oy * dir.y + oz * dir.z;
  if (tca < 0) return null;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
  const r2 = radius * radius;
  if (d2 > r2) return null;
  return tca - Math.sqrt(r2 - d2);
}
