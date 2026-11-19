// Solmar Heat: the game itself. Builds the city, the cars, the crowd and the story,
// runs the fixed-timestep loop, and owns the screen state machine (title, playing,
// paused, busted, wasted, story complete) plus the savegame.

import { makeSeed } from './seed.js';
import { TICK, SAVE_SLOT, FLOW, CROWD, HEAT, GUN, CAST } from './tune.js';
import { buildBay, SPOTS } from './bay.js';
import { buildAuto, randomAutoColor, Auto, bump } from './ride.js';
import { buildWalker, Walker } from './crowd.js';
import { buildHero, Hero } from './hero.js';
import { Heat } from './law.js';
import { Gunplay } from './fight.js';
import { Story } from './jobs.js';
import { Sparks } from './spark.js';
import { Soundboard } from './sound.js';
import { Dash } from './dash.js';
import { Lens } from './lens.js';
import { ACT_OK, ACT_PAUSE, ACT_RIDE, ACT_MUTE, makeKeys } from './keys.js';
import { makeStage } from './stage.js';
import { poseScene } from './frames.js';

const params = new URLSearchParams(location.search);
const seedValue = Number(params.get('seed')) || 7;
const shotName = params.get('shot');

const canvas = document.getElementById('board');
const statusEl = document.getElementById('live');
const stage = makeStage(canvas);
const seed = makeSeed(seedValue);
const bay = buildBay(seed.branch());
stage.scene.add(bay.group);

const sparks = new Sparks(stage.scene);
const audio = new Soundboard();
const dash = new Dash(document);
const lens = new Lens(stage.camera);
const keys = makeKeys(canvas);
const hero = new Hero(buildHero());
const heat = new Heat(stage.scene, bay, seed.branch());
const gun = new Gunplay(stage.scene, sparks);
const story = new Story(stage.scene);

hero.x = SPOTS.playerStart.x;
hero.z = SPOTS.playerStart.z;
hero.heading = 0;
hero.sync();
stage.scene.add(hero.mesh);

// --- Traffic, crowd and the mission car. ---
const traffic = [];
for (let i = 0; i < FLOW.count; i += 1) {
  const car = new Auto(buildAuto(randomAutoColor(seed), 'traffic'), 'traffic');
  const p = bay.anyCrossing(seed);
  car.x = p.x;
  car.z = p.z;
  car.heading = seed.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
  car.cruiseSpeed = seed.span(FLOW.slow, FLOW.fast);
  car.sync();
  stage.scene.add(car.mesh);
  traffic.push(car);
}
const walkers = [];
for (let i = 0; i < CROWD.count; i += 1) {
  const w = new Walker(buildWalker(seed, false), false);
  const p = bay.anyCrossing(seed);
  w.x = p.x;
  w.z = p.z;
  w.speed = seed.span(CROWD.slow, CROWD.fast);
  w.sync();
  stage.scene.add(w.mesh);
  walkers.push(w);
}
const missionCar = new Auto(buildAuto(0xd43d3d, 'traffic'), 'traffic');
missionCar.x = SPOTS.missionCar.x;
missionCar.z = SPOTS.missionCar.z;
missionCar.heading = 0;
missionCar.health = 1e9; // The story car cannot be written off.
missionCar.sync();
stage.scene.add(missionCar.mesh);
story.missionCar = missionCar;

const allCars = () => [...traffic, missionCar, ...heat.autos];

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

// Load before wiring the story callbacks, so a saved step's heat is not re-applied.
const saveLoaded = loadGame();

// --- Story callbacks. ---
story.onStart = (job) => {
  dash.toast(`Job: ${job.title} — ${job.brief}`);
  dash.banner(job.title, job.brief, 4);
  audio.click();
};
story.onDone = (job, pay) => {
  dash.banner('Job complete', `${job.title} — $${pay.toLocaleString('en-US')}`, 4);
  audio.done();
  saveGame();
};
story.onStory = () => {
  screen = 'done';
  dash.show('done');
  audio.done();
  saveGame();
};
story.onHeat = (n) => heat.set(n);
story.onStash = (pay) => {
  dash.toast(`Stash found! +$${pay}`);
  saveGame();
};

// --- Screen state. ---
let screen = 'title';
let time = 0;
let frozen = false;
let muted = false;
let saveTimer = 0;
let shotFrames = 0;

const game = {
  hero, traffic, walkers, heat, story, lens, dash, stage, bay, seed, missionCar, sparks, audio, gun,
  get screen() { return screen; },
  get frozen() { return frozen; },
  set frozen(v) { frozen = v; },
  refreshHud,
  saveGame,
  loadGame,
};
window.__game = game;

function refreshHud() {
  dash.setStars(heat.stars);
  dash.setCash(story.cash);
  dash.setHealth(hero.health);
  dash.setSpeed(hero.inAuto && hero.auto ? Math.abs(hero.auto.speed) * 3.6 : 0, hero.inAuto);
  dash.setBrief(story.brief, story.gap(hero));
  dash.setSight(!hero.inAuto && screen === 'playing');
  dash.setMuted(muted);
  dash.drawMap(
    { player: hero, traffic, police: heat.autos, marker: story.target, stashes: story.stashes },
    time,
  );
}

function respawn() {
  hero.x = SPOTS.hospital.x;
  hero.z = SPOTS.hospital.z - 24;
  hero.heading = 0;
  hero.health = 100;
  if (hero.inAuto) hero.climbOut();
  hero.sync();
  heat.reset();
  story.start(story.index);
  screen = 'playing';
  dash.show(null);
  dash.toast('Back on your feet. The job is still waiting.');
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
  const f = lens.ahead();
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
  for (const cop of heat.feet) {
    if (cop.dead) continue;
    foes.push({ kind: 'walker', ref: cop, x: cop.x, y: 1.0, z: cop.z, r: 0.9 });
  }
  const hit = gun.fire(origin, dir, foes);
  if (!hit) return;
  audio.shot();
  // Nearby pedestrians run from the gunfire.
  for (const w of walkers) {
    if (!w.dead && Math.hypot(w.x - hero.x, w.z - hero.z) < 25) w.flee(hero.x, hero.z);
  }
  if (hit.hit) {
    if (hit.kind === 'walker') {
      heat.add(hit.ref.cop ? HEAT.shoot : HEAT.hitPed);
      if (hit.ref.dead) dash.toast(hit.ref.cop ? 'Cop down!' : 'Pedestrian down!');
    } else if (hit.kind === 'car' && hit.ref.dead) {
      heat.add(HEAT.shoot);
    }
  }
}

function damagePlayerCar(amount) {
  const car = hero.auto;
  if (!car) return;
  car.health -= amount;
  if (car.health <= 0 && !car.dead) {
    car.dead = true;
    sparks.blast({ x: car.x, y: 1, z: car.z });
    audio.crash(1);
    hero.climbOut();
    hero.hurt(20);
    dash.hurtFlash();
    lens.shake(0.8);
    dash.toast('Your car is wrecked!');
  }
}

function advance(dt) {
  time += dt;
  bay.tick(dt);
  sparks.tick(dt);
  gun.tick(dt);
  dash.tick(dt);

  const acts = keys.takeActs();
  const move = keys.takeMove();
  if (move.dx !== 0 || move.dy !== 0) lens.nudge(move.dx, move.dy);
  if (move.wheel !== 0) lens.zoom(move.wheel);
  if (acts & ACT_MUTE) {
    muted = !muted;
    audio.setMuted(muted);
  }
  if (acts & ACT_OK) audio.start();

  // Shot mode: the scene is posed and frozen; only the camera settles.
  if (frozen) {
    lens.followCam(dt, { x: hero.x, z: hero.z, heading: hero.inAuto && hero.auto ? hero.auto.heading : hero.heading, inCar: hero.inAuto }, time);
    stage.sunFollow(hero.x, hero.z);
    return;
  }

  if (screen === 'title') {
    // Attract mode: the city lives behind the title, the camera drifts.
    for (const car of traffic) car.cruise(dt, bay, seed, allCars());
    for (const w of walkers) w.walk(dt, bay, seed);
    lens.yaw += dt * 0.06;
    lens.followCam(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.sunFollow(hero.x, hero.z);
    if (acts & ACT_OK) {
      audio.start();
      screen = 'playing';
      dash.show(null);
      if (!saveLoaded && !story.done) story.start(0);
      else if (!story.done) story.beginStep();
      dash.toast(`${CAST.game} — ${CAST.city}. Good luck, ${CAST.hero}.`);
    }
    return;
  }

  if (screen === 'paused') {
    if (acts & ACT_PAUSE || acts & ACT_OK) {
      screen = 'playing';
      dash.show(null);
    }
    return;
  }

  if (screen === 'busted' || screen === 'wasted') {
    for (const car of traffic) car.cruise(dt, bay, seed, allCars());
    for (const w of walkers) w.walk(dt, bay, seed);
    lens.followCam(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.sunFollow(hero.x, hero.z);
    if (acts & ACT_OK) respawn();
    return;
  }

  if (screen === 'done') {
    // Free roam after the story: the city keeps living.
    for (const car of traffic) car.cruise(dt, bay, seed, allCars());
    for (const w of walkers) w.walk(dt, bay, seed);
    lens.followCam(dt, { x: hero.x, z: hero.z, heading: hero.heading, inCar: false }, time);
    stage.sunFollow(hero.x, hero.z);
    if (acts & ACT_OK) {
      screen = 'playing';
      dash.show(null);
    }
    return;
  }

  // --- Playing. ---
  if (acts & ACT_PAUSE) {
    screen = 'paused';
    dash.show('paused');
    return;
  }

  const axes = keys.axes();
  const fwd = lens.ahead();
  const right = { x: -fwd.z, z: fwd.x };
  const mx = fwd.x * axes.f + right.x * axes.s;
  const mz = fwd.z * axes.f + right.z * axes.s;

  if (hero.inAuto && hero.auto) {
    const car = hero.auto;
    car.drive(dt, { fwd: axes.f, steer: -axes.s, brake: keys.braking() }, bay);
    hero.x = car.x;
    hero.z = car.z;
    hero.heading = car.heading;
    if (car.health < 60 && car.smokeWait <= 0) {
      car.smokeWait = 0.4;
      sparks.smoke({ x: car.x, y: 0.8, z: car.z }, 4);
    }
    car.smokeWait -= dt;
    if (acts & ACT_RIDE) hero.climbOut();
  } else {
    hero.stroll(dt, mx, mz, keys.sprinting(), bay);
    if (keys.isFiring()) fireGun();
    if (acts & ACT_RIDE) {
      const car = nearestCar(4.5);
      if (car) {
        hero.climbIn(car);
        if (!car.stolen) {
          car.stolen = true;
          heat.add(HEAT.steal);
          dash.toast('Car stolen! The heat is on.');
        }
        audio.click();
        keys.lock();
      }
    }
  }

  // Traffic and the crowd.
  const cars = allCars();
  for (const car of traffic) car.cruise(dt, bay, seed, cars);
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const impact = bump(cars[i], cars[j]);
      if (impact > 3) {
        const mine = cars[i] === hero.auto || cars[j] === hero.auto;
        if (mine) {
          audio.crash(Math.min(1, impact / 12));
          lens.shake(Math.min(0.6, impact / 20));
          sparks.puff({ x: hero.x, y: 1, z: hero.z }, 0xffa040, 8, 4, 0.5);
        }
        const a = cars[i];
        const b = cars[j];
        a.health -= impact * 1.2;
        b.health -= impact * 1.2;
        if (a.health <= 0 && !a.dead && a !== missionCar) {
          a.dead = true;
          sparks.blast({ x: a.x, y: 1, z: a.z });
        }
        if (b.health <= 0 && !b.dead && b !== missionCar) {
          b.dead = true;
          sparks.blast({ x: b.x, y: 1, z: b.z });
        }
        if (hero.auto && (hero.auto === a || hero.auto === b) && hero.auto.health <= 0) damagePlayerCar(0);
      }
    }
  }
  for (const w of walkers) w.walk(dt, bay, seed);

  // The wanted system.
  const result = heat.tick(dt, hero, (strength) => {
    if (hero.inAuto) {
      damagePlayerCar(strength);
      audio.crash(0.6);
      lens.shake(0.5);
      dash.hurtFlash();
    } else if (hero.hurt(strength)) {
      audio.crash(0.4);
      lens.shake(0.4);
      dash.hurtFlash();
    }
  });
  if (result === 'busted') {
    story.cash = Math.floor(story.cash * 0.9);
    screen = 'busted';
    dash.show('busted');
    audio.bust();
    saveGame();
    return;
  }

  // The story.
  story.tick(dt, { hero, heat, sparks, audio }, time);

  hero.tick(dt);
  audio.tick(hero.inAuto && hero.auto ? Math.abs(hero.auto.speed) / 34 : 0, hero.inAuto, heat.stars > 0, dt);

  // Wasted?
  if (hero.health <= 0) {
    screen = 'wasted';
    dash.show('wasted');
    audio.bust();
    saveGame();
    return;
  }

  // Camera, sun, HUD.
  lens.followCam(dt, { x: hero.x, z: hero.z, heading: hero.inAuto && hero.auto ? hero.auto.heading : hero.heading, inCar: hero.inAuto }, time);
  stage.sunFollow(hero.x, hero.z);
  refreshHud();

  saveTimer += dt;
  if (saveTimer > 15) {
    saveTimer = 0;
    saveGame();
  }
}

// --- Main loop. ---
let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  // Clamp a hitching frame, but allow enough fixed steps that the simulation keeps up
  // with real time on slow machines instead of running in slow motion.
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

dash.show('title');
if (statusEl) statusEl.textContent = `${CAST.game} — ${CAST.city}`;
if (shotName) {
  screen = 'playing';
  audio.start();
  poseScene(shotName, game);
  dash.toast(`${CAST.game} — ${CAST.city}`);
} else if (saveLoaded) {
  dash.toast('Save loaded — welcome back.');
}
requestAnimationFrame(frame);
