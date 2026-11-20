// The wanted system: stars, police cruisers that chase and ram, and foot
// cops who close in and make the arrest. Stars decay when the player stays
// clean and out of sight; committing a crime adds them at once.

import { buildCarBody, Vehicle } from './autos.js';
import { buildPerson, Walker } from './crowd.js';
import { dist2 } from './rand.js';

const MAX_STARS = 5;

/** How many cruisers and foot cops each star level fields. */
const FORCE = [
  { cars: 0, cops: 0 },
  { cars: 1, cops: 0 },
  { cars: 2, cops: 0 },
  { cars: 3, cops: 1 },
  { cars: 4, cops: 2 },
  { cars: 5, cops: 3 },
];

export class Heat {
  constructor(scene, city, dice) {
    this.scene = scene;
    this.city = city;
    this.dice = dice;
    this.stars = 0;
    this.cars = [];
    this.officers = [];
    this.calm = 0; // seconds without a crime or a cop nearby
    this.arrest = 0; // seconds an officer has been close enough to arrest
    this.siren = 0;
  }

  setStars(n) {
    this.stars = Math.max(0, Math.min(MAX_STARS, n));
    this.calm = 0;
    this.arrest = 0;
    this.matchForce();
  }

  addStars(n) {
    this.setStars(this.stars + n);
  }

  clear() {
    this.setStars(0);
  }

  /** Spawn or remove cruisers and officers to match the current stars. */
  matchForce() {
    const want = FORCE[this.stars];
    while (this.cars.length < want.cars) {
      const car = new Vehicle(buildCarBody(0xf2f4f6, 'cop'), 'cop');
      const spot = this.city.randomCrossing(this.dice);
      car.x = spot.x;
      car.z = spot.z;
      car.heading = this.dice.roll() * Math.PI * 2;
      car.sync();
      this.scene.add(car.mesh);
      this.cars.push(car);
    }
    while (this.cars.length > want.cars) {
      const car = this.cars.pop();
      this.scene.remove(car.mesh);
    }
    while (this.officers.length < want.cops) {
      const cop = new Walker(buildPerson(this.dice, true), true);
      const spot = this.city.randomCrossing(this.dice);
      cop.x = spot.x;
      cop.z = spot.z;
      cop.speed = 3.4;
      cop.sync();
      this.scene.add(cop.mesh);
      this.officers.push(cop);
    }
    while (this.officers.length > want.cops) {
      const cop = this.officers.pop();
      this.scene.remove(cop.mesh);
    }
  }

  /**
   * One tick. onHit(strength) is called when a cruiser rams the player or an
   * officer lands a hit. Returns 'busted' when the arrest completes, else null.
   */
  tick(dt, player, onHit) {
    if (this.stars === 0) {
      // Stand the force down; officers and cruisers drive off.
      if (this.cars.length > 0 || this.officers.length > 0) {
        for (const car of this.cars) this.scene.remove(car.mesh);
        for (const cop of this.officers) this.scene.remove(cop.mesh);
        this.cars = [];
        this.officers = [];
      }
      return null;
    }
    this.matchForce();
    const px = player.x;
    const pz = player.z;

    // Cruisers chase the player and ram.
    for (const car of this.cars) {
      car.backoff = Math.max(0, (car.backoff || 0) - dt);
      if (car.backoff > 0) {
        // After landing a ram the cruiser peels off for a few seconds
        // instead of staying bumper-to-bumper: it gives the player a
        // window to pull away, and it stops three cruisers pinning the
        // player's car against a wall between them.
        const ax = car.x + (car.x - px) * 2;
        const az = car.z + (car.z - pz) * 2;
        car.chase(dt, this.city, ax, az);
      } else {
        car.chase(dt, this.city, px, pz);
      }
      car.ramWait = Math.max(0, (car.ramWait || 0) - dt);
      const d = dist2(car.x, car.z, px, pz);
      if (d < 4.5 && car.speed > 4 && car.ramWait <= 0) {
        // A ram slows the player and chips the car; it should not wreck it
        // in a handful of hits. A ram on foot is a glancing blow, not a
        // full-speed hit — the story makes the hero get out at the marina,
        // and a 1-star cruiser must not be a death sentence there. One
        // damaging ram per cruiser every two seconds, either way.
        const dmg = player.inCar ? Math.min(12, 4 + car.speed * 0.3) : 4;
        onHit(dmg);
        car.speed *= 0.4;
        car.ramWait = 2.0;
        car.backoff = 3.0;
      }
      // A cruiser that fell far behind reappears at a nearer crossing.
      if (d > 260) {
        const spot = this.city.randomCrossing(this.dice);
        car.x = spot.x + this.dice.between(-30, 30);
        car.z = spot.z + this.dice.between(-30, 30);
        car.speed = 0;
        car.sync();
      }
    }

    // Foot cops run the player down; close for long enough and it's an arrest.
    let nearest = Infinity;
    for (const cop of this.officers) {
      if (cop.dead) continue;
      cop.target = { x: px, z: pz };
      cop.walk(dt, this.city, this.dice);
      const d = dist2(cop.x, cop.z, px, pz);
      if (d < nearest) nearest = d;
      if (d < 3 && !player.inCar) onHit(6 * dt);
    }
    if (nearest < 2.6 && !player.inCar) {
      this.arrest += dt;
      if (this.arrest > 1.5) return 'busted';
    } else {
      this.arrest = Math.max(0, this.arrest - dt);
    }

    // Stay clean and out of sight and the heat cools off.
    const closestCop = Math.min(
      ...this.cars.map((c) => dist2(c.x, c.z, px, pz)),
      ...this.officers.map((c) => dist2(c.x, c.z, px, pz)),
      Infinity,
    );
    if (closestCop > 70) {
      this.calm += dt;
      if (this.calm > 12) {
        this.calm = 0;
        this.setStars(this.stars - 1);
      }
    } else {
      this.calm = 0;
    }
    return null;
  }
}
