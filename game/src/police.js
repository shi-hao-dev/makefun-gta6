// The wanted system and the police who enforce it. Crimes add heat; heat maps to stars; stars
// decide how many cruisers and foot cops hunt the player. The heat only cools when the player
// stays clean and out of sight.

import { POLICE, WANTED } from './config.js';
import { Car, makeCarMesh } from './vehicles.js';
import { Ped, makePedMesh } from './people.js';

export class Wanted {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.heat = 0;
    this.stars = 0;
    this.quietTimer = 0;
    this.spawnTimer = 0;
    this.policeCars = [];
    this.cops = [];
    this.bustTimer = 0;
    this.bustCarTimer = 0;
  }

  addCrime(points) {
    this.heat = Math.min(260, this.heat + points);
    this.quietTimer = 0;
    this.updateStars();
  }

  setStars(n) {
    const target = WANTED.starAt[n] ?? 0;
    this.heat = target + 1;
    this.quietTimer = 0;
    this.updateStars();
  }

  updateStars() {
    let s = 0;
    for (let i = WANTED.maxStars; i >= 1; i -= 1) {
      if (this.heat >= WANTED.starAt[i]) { s = i; break; }
    }
    this.stars = s;
  }

  clear() {
    this.heat = 0;
    this.stars = 0;
    this.bustTimer = 0;
    this.bustCarTimer = 0;
  }

  wantedCarCount() {
    return Math.min(this.stars, 5);
  }

  wantedCopCount() {
    return this.stars >= 2 ? Math.min(2, this.stars - 1) : 0;
  }

  spawnPoliceCar(px, pz) {
    const a = this.rng.next() * Math.PI * 2;
    const dist = 70 + this.rng.next() * 30;
    let x = px + Math.cos(a) * dist;
    let z = pz + Math.sin(a) * dist;
    const road = this.world.nearestRoadPoint(x, z);
    x = road.x;
    z = road.z;
    const mesh = makeCarMesh(0xf2f4f6, 'police');
    this.scene.add(mesh);
    const car = new Car(mesh, x, z, this.rng.next() * Math.PI * 2, 'police');
    car.health = 120;
    this.policeCars.push(car);
    return car;
  }

  spawnCop(px, pz) {
    const a = this.rng.next() * Math.PI * 2;
    const x = px + Math.cos(a) * 14;
    const z = pz + Math.sin(a) * 14;
    const mesh = makePedMesh(this.rng, true);
    this.scene.add(mesh);
    const cop = new Ped(mesh, x, z, 0, true);
    cop.state = 'chase';
    this.cops.push(cop);
    return cop;
  }

  removeUnit(list, unit) {
    const i = list.indexOf(unit);
    if (i !== -1) list.splice(i, 1);
    this.scene.remove(unit.mesh);
  }

  /**
   * One step. `player` is {x, z, inCar, car, speed}. Returns 'busted' when the police
   * finally grab the player, else null. `onRam` is called with damage when a cruiser rams.
   */
  step(dt, player, onRam) {
    this.quietTimer += dt;
    if (this.stars > 0 && this.quietTimer > WANTED.decayQuietSeconds) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSecond * dt);
      this.updateStars();
    }
    // Keep the hunting pack at the size the stars demand.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      while (this.policeCars.length < this.wantedCarCount()) this.spawnPoliceCar(player.x, player.z);
      while (this.cops.length < this.wantedCopCount() && !player.inCar) this.spawnCop(player.x, player.z);
      while (this.policeCars.length > this.wantedCarCount()) {
        const car = this.policeCars[0];
        if (Math.hypot(car.x - player.x, car.z - player.z) > 130) this.removeUnit(this.policeCars, car);
        else break;
      }
      while (this.cops.length > this.wantedCopCount()) {
        const cop = this.cops[0];
        if (Math.hypot(cop.x - player.x, cop.z - player.z) > 60) this.removeUnit(this.cops, cop);
        else break;
      }
    }
    // Cruisers chase and ram.
    for (const car of [...this.policeCars]) {
      if (car.dead) {
        this.removeUnit(this.policeCars, car);
        continue;
      }
      car.ramCooldown -= dt;
      car.stepPolice(dt, this.world, player.x, player.z, POLICE.chaseSpeed);
      const d = Math.hypot(car.x - player.x, car.z - player.z);
      if (d < 5 && car.ramCooldown <= 0) {
        car.ramCooldown = POLICE.ramCooldown;
        if (player.inCar) {
          if (Math.abs(player.speed) < 4) {
            this.bustCarTimer += 0.5;
          } else {
            onRam(POLICE.ramDamage);
          }
        } else {
          onRam(POLICE.ramDamage);
        }
      }
      if (car.health <= 0) {
        car.dead = true;
      }
    }
    // Foot cops chase the player on foot.
    for (const cop of [...this.cops]) {
      if (cop.dead) {
        this.removeUnit(this.cops, cop);
        continue;
      }
      if (player.inCar) {
        cop.state = 'walk';
        cop.target = null;
      } else {
        cop.state = 'chase';
        cop.target = { x: player.x, z: player.z };
      }
      cop.step(dt, this.world, this.rng);
      if (!player.inCar) {
        const d = Math.hypot(cop.x - player.x, cop.z - player.z);
        if (d < 2.4) {
          this.bustTimer += dt;
          if (this.bustTimer >= WANTED.bustHoldSeconds) return 'busted';
        } else {
          this.bustTimer = Math.max(0, this.bustTimer - dt);
        }
      }
    }
    if (player.inCar && this.bustCarTimer >= WANTED.bustCarHoldSeconds) return 'busted';
    if (!player.inCar || Math.abs(player.speed) > 4) this.bustCarTimer = 0;
    return null;
  }
}
