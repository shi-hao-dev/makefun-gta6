// Solmar Heat: the game itself. Builds the city, the cars, the crowd and the
// story, runs the fixed-timestep loop, and owns the screen state machine
// (title, playing, paused, busted, wasted, story complete) plus the savegame.
// Shot mode (?shot=cover|street|chase|mission) poses a frozen scene for the
// screenshots and raises window.__shotReady after 90 frames.

import { makeDice } from './rand.js';
import { buildStage } from './stage.js';
import { buildCity } from './city.js';
import { buildCarBody, randomPaint, Vehicle, shoveApart } from './autos.js';
import { buildPerson, Walker } from './crowd.js';
import { buildHeroMesh, Hero } from './hero.js';
import { Heat } from './heat.js';
import { Pistol } from './pistol.js';
import { Missions } from './missions.js';
import { Sparks } from './sparks.js';
import { Sound } from './sound.js';
import { Hud } from './hud.js';
import { Rig } from './camera.js';
import { makeKeys, ACT_OK, ACT_PAUSE, ACT_ENTER, ACT_MUTE, ACT_FIRE } from './keys.js';
import { poseFrame } from './frames.js';

const TICK = 1 / 60;
const SAVE_SLOT = 'solmar-heat-save-v1';
const TRAFFIC_COUNT = 14;
const CROWD_COUNT = 24;

const params = new URLSearchParams(location.search);
const seedValue = Number(params.get('seed')) || 7;
const shotName = params.get('shot');

const canvas = document.getElementById('board');
const stage = buildStage(canvas);
const dice = makeDice(seedValue);
const city = buildCity(dice.fork());
stage.scene.add(city.group);

const sparks = new Sparks(stage.scene);
const audio = new Sound();
const hud = new Hud(document);
const rig = new Rig(stage.camera);
const keys = makeKeys(canvas);
const hero = new Hero(buildHeroMesh());
const heat = new Heat(stage.scene, city, dice.fork());
const pistol = new Pistol(stage.scene);
const story = new Missions(stage.scene, city.places);

hero.x = city.places.playerStart.x;
hero.z = city.places.playerStart.z;
hero.heading = 0;
hero.sync();
stage.scene.add(hero.mesh);

// --- Traffic, crowd and the mission car. ---
const traffic = [];
for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
  const kind = dice.chance(0.18) ? 'sport' : dice.chance(0.12) ? 'taxi' : 'sedan';
  const car = new Vehicle(buildCarBody(randomPaint(dice), kind), kind);
  const p = city.randomCrossing(dice);
  car.x = p.x;
  car.z = p.z;
  car.heading = dice.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
  car.cruiseSpeed = dice.between(8, 13);
  car.sync();
  stage.scene.add(car.mesh);
  traffic.push(car);
}
const walkers = [];
for (let i = 0; i < CROWD_COUNT; i += 1) {
  const w = new Walker(buildPerson(dice, false), false);
  const p = city.randomCrossing(dice);
  w.x = p.x;
  w.z = p.z;
  w.speed = dice.between(1.0, 1.8);
  w.sync();
  stage.scene.add(w.mesh);
  walkers.push(w);
}
const missionCar = new Vehicle(buildCarBody(0xd43d3d, 'sport'), 'sport');
missionCar.x = city.places.missionCar.x;
missionCar.z = city.places.missionCar.z;
// Parked facing east, down the road toward Lena's garage — the first job
// starts with a straight drive, not a 90° turn out of a parking spot.
missionCar.heading = Math.PI / 2;
missionCar.health = 1e9; // The story car cannot be written off.
missionCar.anchored = true; // Parked until stolen — traffic cannot push it away.
missionCar.sync();
stage.scene.add(missionCar.mesh);
story.missionCar = missionCar;

const allCars = () => [...traffic, missionCar, ...heat.cars];

// --- Save / load. ---
function saveGame() {
  try {
    localStorage.setItem(SAVE_SLOT, JSON.stringify({
      hero: { x: hero.x, z: hero.z, health: hero.health },
      story: story.save(),
    }));
  } catch {
    // Storage can be unavailable (private mode): the game still runs.
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_SLOT);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved) return false;
    if (saved.hero) {
      hero.x = saved.hero.x;
      hero.z = saved.hero.z;
      hero.health = saved.hero.health || 100;
      hero.sync();
    }
    if (saved.story) story.load(saved.story);
    return true;
  } catch {
    return false;
  }
}

const saveLoaded = loadGame();

// --- Story callbacks. ---
story.onStart = (job) => {
  hud.toast(`Job: ${job.title} — ${job.brief}`);
  hud.banner(job.title, job.brief, 4);
  audio.click();
};
story.onDone = (job, pay) => {
  hud.banner('Job complete', `${job.title} — $${pay.toLocaleString('en-US')}`, 4);
  audio.done();
  saveGame();
};
story.onStory = () => {
  game.screen = 'done';
  hud.show('done');
  audio.done();
  saveGame();
};
story.onHeat = (n) => heat.setStars(n);
story.onStash = () => {
  hud.toast('Stash found! +$150');
  saveGame();
};

// --- The game object: everything the shot poser and the playtest need. ---
const game = {
  hero, traffic, walkers, heat, story, rig, hud, stage, city, dice,
  missionCar, sparks, audio, pistol,
  places: city.places,
  screen: 'title',
  frozen: false,
  refreshHud,
  saveGame,
  loadGame,
};
window.__game = game;

let time = 0;
let muted = false;
let saveTimer = 0;
let shotFrames = 0;
let lastShot = -10; // game time of the last pistol shot (rate limit)
const FIRE_GAP = 0.28; // seconds between pistol shots

function refreshHud() {
  hud.setStars(heat.stars);
  hud.setCash(story.cash);
  hud.setHealth(hero.health);
  hud.setSpeed(hero.inCar && hero.car ? Math.abs(hero.car.speed) * 3.6 : 0, hero.inCar);
  hud.setBrief(story.brief, story.gap(hero));
  hud.setSight(!hero.inCar && game.screen === 'playing');
  hud.setMuted(muted);
  hud.drawMap(
    { player: hero, traffic, police: heat.cars, marker: story.target, stashes: story.stashes },
    time,
  );
}

function respawn() {
  hero.x = city.places.hospital.x;
  hero.z = city.places.hospital.z - 24;
  hero.heading = 0;
  hero.health = 100;
  if (hero.inCar) hero.exit();
  hero.sync();
  heat.clear();
  story.start(story.index);
  game.screen = 'playing';
  hud.show(null);
  hud.toast('Back on your feet. The job is still waiting.');
  saveGame();
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of allCars()) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - hero.x, car.z - hero.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function fireGun() {
  const f = rig.ahead();
  const origin = { x: hero.x + f.x * 0.8, y: 1.4, z: hero.z + f.z * 0.8 };
  const dir = { x: f.x, y: 0, z: f.z };
  const foes = [];
  for (const car of allCars()) {
    if (car.dead) continue;
    foes.push({ kind: 'car', ref: car, x: car.x, y: 0.8, z: car.z, r: 2.2 });
  }
  for (const w of walkers) {
    if (w.dead) continue;
    foes.push({ kind: 'walker', ref: w, x: w.x, y: 1.0, z: w.z, r: 0.9 });
  }
  for (const cop of heat.officers) {
    if (cop.dead) continue;
    foes.push({ kind: 'walker', ref: cop, x: cop.x, y: 1.0, z: cop.z, r: 0.9 });
  }
  const hit = pistol.fire(origin, dir, foes);
  if (!hit) return;
  audio.shot();
  for (const w of walkers) {
    if (!w.dead && Math.hypot(w.x - hero.x, w.z - hero.z) < 25) w.fleeFrom(hero.x, hero.z);
  }
  if (hit.kind === 'walker') {
    const ref = hit.ref;
    if (ref.cop) {
      heat.addStars(2);
      if (ref.dead) hud.toast('Cop down!');
    } else {
      heat.addStars(1);
      if (ref.dead) hud.toast('Pedestrian down!');
    }
    if (hit.dist < 30) {
      ref.fall();
      sparks.burst({ x: ref.x, y: 1, z: ref.z }, 0xd43d3d, 8, 3, 0.6);
    }
  } else if (hit.kind === 'car') {
    const car = hit.ref;
    car.health -= 25;
    if (car.health <= 0 && !car.dead && car !== missionCar) {
      car.dead = true;
      sparks.explosion({ x: car.x, y: 1, z: car.z });
      audio.crash(1);
    }
    heat.addStars(1);
  }
}

function damagePlayerCar(amount) {
  const car = hero.car;
  if (!car) return;
  car.health -= amount;
  if (car.health <= 0 && !car.dead) {
    car.dead = true;
    sparks.explosion({ x: car.x, y: 1, z: car.z });
    audio.crash(1);
    hero.exit();
    hero.hurt(20);
    hud.hurtFlash();
    rig.shake(0.8);
    hud.toast('Your car is wrecked!');
  }
}

function advance(dt) {
  time += dt;
  city.tick(dt);
  sparks.tick(dt);
  pistol.tick(dt);
  hud.tick(dt);

  const acts = keys.takeActs();
  const move = keys.takeMove();
  if (move.dx !== 0 || move.dy !== 0) rig.nudge(move.dx, move.dy);
  if (move.wheel !== 0) rig.zoom(move.wheel);
  if (acts & ACT_MUTE) {
    muted = !muted;
    audio.setMuted(muted);
  }
  if (acts & ACT_OK) audio.start();

  // Shot mode: the scene is posed and frozen; only the camera settles and the
  // minimap draws, so the screenshots show a full HUD.
  if (game.frozen) {
    rig.follow(dt, { x: hero.x, z: hero.z, heading: hero.inCar && hero.car ? hero.car.heading : hero.heading, inCar: hero.inCar }, time);
    stage.followSun(hero.x, hero.z);
    hud.drawMap(
      { player: hero, traffic, police: heat.cars, marker: story.target, stashes: story.stashes },
      time,
    );
    return;
  }

  if (game.screen === 'title') {
    // Attract mode: the city lives behind the title, the camera drifts.
    for (const car of traffic) car.cruise(dt, city, dice, allCars());
    for (const w of walkers) w.walk(dt, city, dice);
    rig.yaw += dt * 0.06;
    rig.follow(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.followSun(hero.x, hero.z);
    if (acts & ACT_OK) {
      audio.start();
      game.screen = 'playing';
      hud.show(null);
      if (!saveLoaded && !story.done) story.start(0);
      else if (!story.done) story.beginStep();
      hud.toast('Solmar Heat — Solmar Bay. Good luck, Jace.');
    }
    return;
  }

  if (game.screen === 'paused') {
    if (acts & ACT_PAUSE || acts & ACT_OK) {
      game.screen = 'playing';
      hud.show(null);
    }
    return;
  }

  if (game.screen === 'busted' || game.screen === 'wasted') {
    for (const car of traffic) car.cruise(dt, city, dice, allCars());
    for (const w of walkers) w.walk(dt, city, dice);
    rig.follow(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.followSun(hero.x, hero.z);
    if (acts & ACT_OK) respawn();
    return;
  }

  if (game.screen === 'done') {
    // Free roam after the story: the city keeps living.
    for (const car of traffic) car.cruise(dt, city, dice, allCars());
    for (const w of walkers) w.walk(dt, city, dice);
    rig.follow(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.followSun(hero.x, hero.z);
    if (acts & ACT_OK) {
      game.screen = 'playing';
      hud.show(null);
    }
    return;
  }

  // --- Playing. ---
  if (acts & ACT_PAUSE) {
    game.screen = 'paused';
    hud.show('paused');
    return;
  }

  const axes = keys.axes();
  const fwd = rig.ahead();
  const right = { x: -fwd.z, z: fwd.x };
  const mx = fwd.x * axes.f + right.x * axes.s;
  const mz = fwd.z * axes.f + right.z * axes.s;

  if (hero.inCar && hero.car) {
    const car = hero.car;
    car.drive(dt, { fwd: axes.f, steer: -axes.s, brake: keys.braking() }, city);
    // The hero rides the car: copy the car onto him every step, so the camera,
    // the missions and the police never lose track of him.
    hero.x = car.x;
    hero.z = car.z;
    hero.heading = car.heading;
    if (car.health < 60 && car.smokeWait <= 0) {
      car.smokeWait = 0.4;
      sparks.smoke({ x: car.x, y: 0.8, z: car.z }, 4);
    }
    car.smokeWait -= dt;
    if (acts & ACT_ENTER) {
      const car = hero.car;
      hero.exit();
      // Parked: a car you are not in cannot be shoved around by traffic
      // or a cruiser, or it rolls away from you while you are on foot.
      if (car) car.anchored = true;
    }
  } else {
    hero.walk(dt, mx, mz, keys.sprinting(), city);
    // The pistol is semi-auto: a clean click fires once, holding still
    // autofires, and a drag to look around never shoots. Rate-limited so a
    // held button cannot flood the scene with tracers.
    if (((acts & ACT_FIRE) || keys.isFiring()) && time - lastShot >= FIRE_GAP) {
      lastShot = time;
      fireGun();
    }
    if (acts & ACT_ENTER) {
      // Generous entry radius: the car is big and the player should not
      // have to stand on its bumper to get in.
      const car = nearestCar(6);
      if (car) {
        hero.enter(car);
        car.anchored = false; // You are driving it now — it can move.
        if (!car.stolen) {
          car.stolen = true;
          heat.addStars(1);
          hud.toast('Car stolen! The heat is on.');
        }
        audio.click();
        keys.lock();
      }
    }
  }

  // Traffic, the crowd, and every car bumping into every other car.
  const cars = allCars();
  for (const car of traffic) car.cruise(dt, city, dice, cars);
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const impact = shoveApart(cars[i], cars[j]);
      if (impact > 3) {
        const mine = cars[i] === hero.car || cars[j] === hero.car;
        if (mine) {
          audio.crash(Math.min(1, impact / 12));
          rig.shake(Math.min(0.6, impact / 20));
          sparks.burst({ x: hero.x, y: 1, z: hero.z }, 0xffa040, 8, 4, 0.5);
        }
        const a = cars[i];
        const b = cars[j];
        a.health -= impact * 1.2;
        b.health -= impact * 1.2;
        if (a.health <= 0 && !a.dead && a !== missionCar) {
          a.dead = true;
          sparks.explosion({ x: a.x, y: 1, z: a.z });
        }
        if (b.health <= 0 && !b.dead && b !== missionCar) {
          b.dead = true;
          sparks.explosion({ x: b.x, y: 1, z: b.z });
        }
        if (hero.car && (hero.car === a || hero.car === b) && hero.car.health <= 0) damagePlayerCar(0);
      }
    }
  }
  for (const w of walkers) w.walk(dt, city, dice);

  // The wanted system.
  const result = heat.tick(dt, hero, (strength) => {
    if (hero.inCar) {
      damagePlayerCar(strength);
      audio.crash(0.6);
      rig.shake(0.5);
      hud.hurtFlash();
    } else if (hero.hurt(strength)) {
      audio.crash(0.4);
      rig.shake(0.4);
      hud.hurtFlash();
    }
  });
  if (result === 'busted') {
    story.cash = Math.floor(story.cash * 0.9);
    game.screen = 'busted';
    hud.show('busted');
    audio.bust();
    saveGame();
    return;
  }

  // The story.
  story.tick(dt, { hero, heat, sparks, audio }, time);

  hero.tick();
  audio.tick(hero.inCar && hero.car ? Math.abs(hero.car.speed) / 34 : 0, hero.inCar, heat.stars > 0, dt);

  // Wasted?
  if (hero.health <= 0) {
    game.screen = 'wasted';
    hud.show('wasted');
    audio.bust();
    saveGame();
    return;
  }

  // Camera, sun, HUD.
  rig.follow(dt, { x: hero.x, z: hero.z, heading: hero.inCar && hero.car ? hero.car.heading : hero.heading, inCar: hero.inCar }, time);
  stage.followSun(hero.x, hero.z);
  refreshHud();

  saveTimer += dt;
  if (saveTimer > 15) {
    saveTimer = 0;
    saveGame();
  }
}

// --- Main loop: fixed steps, one render per frame. ---
let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.5) dt = 0.5;
  acc += dt;
  let steps = 0;
  while (acc >= TICK && steps < 60) {
    advance(TICK);
    acc -= TICK;
    steps += 1;
  }
  if (steps === 60) acc = 0;
  stage.renderer.render(stage.scene, stage.camera);
  if (shotName) {
    shotFrames += 1;
    if (shotFrames === 90) window.__shotReady = true;
  }
}

hud.show('title');
if (shotName) {
  game.screen = 'playing';
  audio.start();
  poseFrame(shotName, game);
  hud.toast('Solmar Heat — Solmar Bay');
} else if (saveLoaded) {
  hud.toast('Save loaded — welcome back.');
}
requestAnimationFrame(frame);
