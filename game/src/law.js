// The wanted system: heat points turn into stars, stars decide how many cruisers and
// foot cops hunt the player, and heat cools off after a quiet spell. Cruisers ram the
// player's car; foot cops hold the player to bust him.

import { HEAT, COPS, FLOW } from './tune.js';
import { buildAuto, Auto } from './ride.js';
import { buildWalker, Walker } from './crowd.js';

const AUTOS_WANTED = [0, 1, 1, 2, 2, 3];
const FEET_WANTED = [0, 0, 1, 1, 2, 3];

export class Heat {
  constructor(scene, bay, seed) {
    this.scene = scene;
    this.bay = bay;
    this.seed = seed;
    this.heat = 0;
    this.stars = 0;
    this.quiet = 99;
    this.spawnWait = 0;
    this.autos = [];
    this.feet = [];
    this.bustWait = 0;
    this.bustAutoWait = 0;
    this.flashPhase = 0;
  }

  add(points) {
    this.heat = Math.min(HEAT.at[HEAT.cap] + 40, this.heat + points);
    this.quiet = 0;
    this.refresh();
  }

  set(n) {
    this.stars = Math.max(0, Math.min(HEAT.cap, n));
    this.heat = HEAT.at[this.stars];
    this.quiet = 0;
    this.refresh();
  }

  refresh() {
    let n = 0;
    for (let i = HEAT.cap; i >= 0; i -= 1) {
      if (this.heat >= HEAT.at[i]) {
        n = i;
        break;
      }
    }
    this.stars = n;
    // Trim units above the wanted count.
    while (this.autos.length > AUTOS_WANTED[n]) this.drop(this.autos, this.autos[this.autos.length - 1]);
    while (this.feet.length > FEET_WANTED[n]) this.drop(this.feet, this.feet[this.feet.length - 1]);
  }

  reset() {
    this.heat = 0;
    this.stars = 0;
    this.quiet = 99;
    while (this.autos.length) this.drop(this.autos, this.autos[0]);
    while (this.feet.length) this.drop(this.feet, this.feet[0]);
    this.bustWait = 0;
    this.bustAutoWait = 0;
  }

  drop(list, unit) {
    const i = list.indexOf(unit);
    if (i >= 0) list.splice(i, 1);
    this.scene.remove(unit.mesh);
  }

  /** A spawn point on a lane, 40-70 units from the player. */
  spawnPoint(px, pz) {
    for (let tries = 0; tries < 12; tries += 1) {
      const lane = this.bay.nearestLane(px + this.seed.span(-70, 70), pz + this.seed.span(-70, 70));
      const along = this.seed.span(-240, 240);
      const x = lane.axis === 'x' ? lane.line : along;
      const z = lane.axis === 'x' ? along : lane.line;
      const d = Math.hypot(x - px, z - pz);
      if (d > 35 && d < 90) return { x, z };
    }
    return { x: px + 45, z: pz };
  }

  sendAuto(px, pz) {
    const p = this.spawnPoint(px, pz);
    const car = new Auto(buildAuto(0xf2f4f6, 'police'), 'police');
    car.x = p.x;
    car.z = p.z;
    car.heading = Math.atan2(px - p.x, pz - p.z);
    car.cruiseSpeed = FLOW.fast + 2;
    car.sync();
    this.scene.add(car.mesh);
    this.autos.push(car);
    return car;
  }

  sendFoot(px, pz) {
    const p = this.spawnPoint(px, pz);
    const cop = new Walker(buildWalker(this.seed, true), true);
    cop.x = p.x;
    cop.z = p.z;
    cop.mode = 'hunt';
    cop.sync();
    this.scene.add(cop.mesh);
    this.feet.push(cop);
    return cop;
  }

  /**
   * One tick. `hero` is the player; `onRam` is called with the impact strength when a
   * cruiser rams the player or his car. Returns 'busted' when the player is arrested.
   */
  tick(dt, hero, onRam) {
    this.quiet += dt;
    if (this.quiet > HEAT.quiet && this.heat > 0) {
      this.heat = Math.max(0, this.heat - HEAT.cool * dt);
      this.refresh();
    }
    this.spawnWait -= dt;
    if (this.spawnWait <= 0) {
      this.spawnWait = 1.2;
      if (this.autos.length < AUTOS_WANTED[this.stars]) this.sendAuto(hero.x, hero.z);
      if (this.feet.length < FEET_WANTED[this.stars]) this.sendFoot(hero.x, hero.z);
    }
    // Flash the light bars.
    this.flashPhase += dt;
    const redOn = Math.floor(this.flashPhase * 4) % 2 === 0;
    for (const car of this.autos) {
      const red = car.mesh.getObjectByName('cop-red');
      const blue = car.mesh.getObjectByName('cop-blue');
      if (red) red.material.emissiveIntensity = redOn ? 2 : 0.2;
      if (blue) blue.material.emissiveIntensity = redOn ? 0.2 : 2;
    }
    // Cruisers pursue and ram.
    let rammed = false;
    for (const car of this.autos) {
      const hit = car.pursue(dt, this.bay, hero.x, hero.z);
      if (hit) {
        rammed = true;
        onRam(COPS.ram);
      }
    }
    // Foot cops hunt; holding the player on foot busts him.
    let held = false;
    for (const cop of this.feet) {
      cop.goal = { x: hero.x, z: hero.z };
      cop.walk(dt, this.bay, this.seed);
      const d = Math.hypot(cop.x - hero.x, cop.z - hero.z);
      if (!hero.inAuto && d < 2.2) held = true;
    }
    if (held) {
      this.bustWait += dt;
      if (this.bustWait > HEAT.bustFoot) return 'busted';
    } else {
      this.bustWait = Math.max(0, this.bustWait - dt * 2);
    }
    // A cruiser pinning the player's car busts him too.
    let pinned = false;
    if (hero.inAuto && hero.auto) {
      for (const car of this.autos) {
        const d = Math.hypot(car.x - hero.auto.x, car.z - hero.auto.z);
        if (d < 3.6 && Math.abs(hero.auto.speed) < 2) pinned = true;
      }
    }
    if (pinned) {
      this.bustAutoWait += dt;
      if (this.bustAutoWait > HEAT.bustAuto) return 'busted';
    } else {
      this.bustAutoWait = Math.max(0, this.bustAutoWait - dt * 2);
    }
    return rammed ? 'rammed' : null;
  }
}
