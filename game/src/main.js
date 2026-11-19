// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between six screens: title,
// play, paused, busted, wasted and story complete. Save lives in localStorage.
//
// ?seed=N fixes the city layout. ?shot=cover|street|chase|mission (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.

import { CAR, COMBAT, SAVE_KEY, STEP, TRAFFIC, PED, WANTED } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PLACES } from './world.js';
import { Car, collideCars, makeCarMesh, randomCarColor } from './vehicles.js';
import { Ped, makePedMesh } from './people.js';
import { Wanted } from './police.js';
import { Player, makePlayerMesh } from './player.js';
import { Combat } from './combat.js';
import { MissionManager } from './missions.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { Hud } from './hud.js';
import { CameraRig } from './camera.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createStage } from './render.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const stage = createStage(canvas);
const { renderer, scene, camera } = stage;
const rng = createRandom(seed);

const world = createWorld(rng.fork());
scene.add(world.group);

const effects = new Effects(scene);
const combat = new Combat(scene, effects);
const audio = new AudioEngine();
const hud = new Hud(document);
const cameraRig = new CameraRig(camera);
const input = createInput(canvas);

// The player and his red Comet, parked on Marina Blvd for the first mission.
const player = new Player(makePlayerMesh(), PLACES.playerStart.x, PLACES.playerStart.z);
scene.add(player.mesh);
const missionCarMesh = makeCarMesh(0xc0392b, 'sport');
scene.add(missionCarMesh);
const missionCar = new Car(missionCarMesh, PLACES.missionCar.x, PLACES.missionCar.z, Math.PI / 2, 'sport');
missionCar.health = COMBAT.carHealth;
missionCar.targetSpeed = 0;

// Traffic: cars seeded onto the roads.
const traffic = [];
const trafficRng = rng.fork();
for (let i = 0; i < TRAFFIC.count; i += 1) {
  const road = world.randomIntersection(trafficRng);
  const kind = trafficRng.next() < 0.12 ? 'taxi' : 'sedan';
  const mesh = makeCarMesh(randomCarColor(trafficRng), kind);
  scene.add(mesh);
  const car = new Car(mesh, road.x + trafficRng.range(-4, 4), road.z + trafficRng.range(-4, 4), trafficRng.next() * Math.PI * 2, kind);
  car.target = world.randomIntersection(trafficRng);
  car.targetSpeed = TRAFFIC.speedMin + trafficRng.next() * (TRAFFIC.speedMax - TRAFFIC.speedMin);
  traffic.push(car);
}

// Pedestrians on the sidewalks.
const peds = [];
const pedRng = rng.fork();
for (let i = 0; i < PED.count; i += 1) {
  const mesh = makePedMesh(pedRng);
  scene.add(mesh);
  const x = pedRng.range(-210, 210);
  const z = pedRng.range(-210, 230);
  const ped = new Ped(mesh, x, z, pedRng.next() * Math.PI * 2);
  peds.push(ped);
}

const wanted = new Wanted(scene, world, rng.fork());
const missions = new MissionManager(scene, rng.fork());
missions.onMissionDone = (kind, amount, title) => {
  if (kind === 'mission') {
    hud.banner('Mission complete', `${title} — +$${amount}`);
    audio.missionDone();
  } else {
    hud.toast(`Stash found — +$${amount}`);
    audio.pickup();
  }
  saveGame();
};
missions.onMissionStart = (kind) => {
  if (kind === 'hot') hud.toast('The drop is hot — the cops are coming!');
  if (kind === 'heat') hud.toast('Three stars. Lose them all!');
};
missions.onStoryDone = () => {
  hud.banner('Story complete', 'The Solmar Score is yours. Free roam!');
  audio.missionDone();
  saveGame();
};

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(missions.saveState()));
  } catch {
    // Storage can be off: the session then lasts this visit only.
  }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) missions.loadState(JSON.parse(raw));
  } catch {
    // A corrupt save starts a fresh story.
  }
}

const game = {
  world, player, missionCar, traffic, peds, wanted, missions, effects, combat, camera: cameraRig, hud, scene, renderer, stage,
  time: 0,
  runSteps(n, scripted) {
    // Scripted steps (shot staging, tests) simulate without rendering every step:
    // one render at the end is all the frame needs. The live loop still renders
    // per step through stepWorld's default.
    for (let i = 0; i < n; i += 1) stepWorld(STEP, scripted, false);
    this.render();
  },
  render() {
    stage.updateSun(player.x, player.z);
    renderer.render(scene, camera);
  },
};

function allCars() {
  const list = [missionCar, ...traffic, ...wanted.policeCars];
  if (player.car && !list.includes(player.car)) list.push(player.car);
  return list;
}

function scarePeds(x, z, radius) {
  for (const ped of peds) {
    if (Math.hypot(ped.x - x, ped.z - z) < radius) ped.scare(x, z);
  }
}

function damageCar(car, amount, atX, atZ) {
  if (car.dead) return;
  car.health -= amount;
  if (car.health <= 0) {
    car.dead = true;
    effects.explosion({ x: car.x, y: 1, z: car.z });
    audio.crash(1);
    cameraRig.addShake(0.7);
    if (player.car === car) {
      player.exitCar();
      player.hurt(25);
      hud.toast('Your car blew up!');
    }
    return;
  }
  if (car.health < 50) {
    car.smokeTimer -= 1;
    if (car.smokeTimer <= 0) {
      car.smokeTimer = 12;
      effects.smoke({ x: car.x, y: 0, z: car.z }, 4);
    }
  }
}

function nearestCar(x, z, range) {
  let best = null;
  let bestD = range;
  for (const car of allCars()) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** One fixed step of the whole simulation, driven by `input` ({f, s, run, handbrake, shoot}). */
function stepWorld(dt, ctrl, doRender = true) {
  game.time += dt;
  const now = game.time;

  // The player, on foot or behind the wheel.
  if (player.inCar && player.car) {
    const car = player.car;
    const braking = ctrl.f < 0 && car.speed > 0.5;
    const throttle = braking ? 0 : ctrl.f;
    const impact = car.step(dt, { throttle, steer: -ctrl.s, brake: braking, handbrake: ctrl.handbrake }, world);
    // While driving, Jace rides with the car: everything that tracks the player
    // (camera, missions, minimap, police) reads player.x/z, so keep them on the car.
    player.x = car.x;
    player.z = car.z;
    player.heading = car.heading;
    if (impact > 12) {
      const dmg = (impact - 12) * 1.1;
      player.hurt(dmg);
      damageCar(car, dmg * 0.8, car.x, car.z);
      audio.crash(Math.min(1, impact / 30));
      cameraRig.addShake(Math.min(0.6, impact / 40));
      hud.damageFlash();
      effects.burst({ x: car.x, y: 0.8, z: car.z }, 0xffd23f, 10, 6, 0.5);
    }
    // Running over pedestrians is a crime, and it scares the block.
    for (const ped of peds) {
      if (ped.dead || ped.state === 'down') continue;
      const d = Math.hypot(ped.x - car.x, ped.z - car.z);
      if (d < 2.6 && Math.abs(car.speed) > 3) {
        const killed = ped.hurt(100, car.x, car.z);
        wanted.addCrime(WANTED.crimeHitPed);
        hud.toast(killed ? 'Pedestrian down — the heat is on!' : 'You hit a pedestrian!');
        effects.burst({ x: ped.x, y: 1, z: ped.z }, 0xd94f4f, 12, 5, 0.7);
        audio.crash(0.7);
      } else if (d < 8 && Math.abs(car.speed) > 15) {
        ped.scare(car.x, car.z);
      }
    }
  } else {
    const f = cameraRig.forward();
    const r = { x: -f.z, z: f.x };
    const mx = f.x * ctrl.f + r.x * ctrl.s;
    const mz = f.z * ctrl.f + r.z * ctrl.s;
    player.stepOnFoot(dt, { x: mx, z: mz }, ctrl.run, world);
    if (ctrl.shoot) {
      const origin = camera.position.clone();
      const dir = camera.getWorldDirection(new THREE.Vector3());
      const result = combat.shoot({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z }, { peds: [...peds, ...wanted.cops], cars: allCars() });
      if (result && result.hit) {
        audio.shot();
        scarePeds(player.x, player.z, 25);
        if (result.kind === 'ped' || result.kind === 'cop') {
          wanted.addCrime(WANTED.crimeShoot);
          if (result.killed && result.kind === 'cop') hud.toast('You took down a cop — run!');
        } else if (result.kind === 'car' && result.destroyed) {
          damageCar(result.car, 999, result.car.x, result.car.z);
        }
      } else if (result) {
        audio.shot();
        scarePeds(player.x, player.z, 18);
      }
    }
  }
  player.stepTimers(dt);

  // Traffic and the crowd.
  for (const car of traffic) car.stepTraffic(dt, world, trafficRng, allCars());
  for (const ped of peds) ped.step(dt, world, pedRng);

  // Car-on-car collisions, with consequences when the player is involved.
  const cars = allCars();
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const rel = collideCars(cars[i], cars[j]);
      const playerCar = player.car;
      if (rel > 8 && (cars[i] === playerCar || cars[j] === playerCar)) {
        const other = cars[i] === playerCar ? cars[j] : cars[i];
        audio.crash(Math.min(1, rel / 30));
        cameraRig.addShake(Math.min(0.5, rel / 40));
        hud.damageFlash();
        player.hurt(rel * 0.25);
        damageCar(playerCar, rel * 0.5, playerCar.x, playerCar.z);
        if (other.kind === 'police') {
          wanted.addCrime(WANTED.crimeRamCop);
          hud.toast('You rammed a cruiser!');
        }
        effects.burst({ x: playerCar.x, y: 0.8, z: playerCar.z }, 0xffd23f, 12, 7, 0.5);
      }
    }
  }

  // The law.
  const bust = wanted.step(dt, { x: player.x, z: player.z, inCar: player.inCar, car: player.car, speed: player.inCar && player.car ? player.car.speed : 0 }, (dmg) => {
    player.hurt(dmg);
    hud.damageFlash();
    audio.crash(0.5);
    cameraRig.addShake(0.4);
  });
  if (bust === 'busted' && screen === 'play') {
    endRun('busted');
  }

  // Missions and their beacon.
  const missionResult = missions.step(dt, { player, wanted }, now);
  if (missionResult === 'story' && screen === 'play') {
    screen = 'complete';
    hud.showOverlay('complete');
    audio.missionDone();
  }

  // Wasted?
  if (player.health <= 0 && screen === 'play') {
    endRun('wasted');
  }

  // Cosmetics.
  world.update(dt, now);
  effects.step(dt);
  combat.step(dt);
  audio.step(player.inCar && player.car ? Math.abs(player.car.speed) / CAR.maxSpeed : 0, player.inCar, wanted.stars > 0, dt);
  hud.step(dt);
  hud.setStars(wanted.stars);
  hud.setCash(missions.cash);
  hud.setHealth(player.health);
  hud.setSpeed(player.inCar && player.car ? Math.abs(player.car.speed) * 3.6 : 0, player.inCar);
  hud.setObjective(missions.objectiveText, missions.distanceToTarget(player));
  hud.setCrosshair(!player.inCar && screen === 'play');
  hud.drawMinimap({ player, traffic, police: wanted.policeCars, marker: missions.target, stashes: missions.stashes }, now);
  cameraRig.update(dt, { x: player.x, z: player.z, heading: player.inCar && player.car ? player.car.heading : player.heading, inCar: player.inCar }, now);
  if (doRender) game.render();
}

function endRun(kind) {
  const penalty = kind === 'busted' ? 200 : 150;
  missions.cash = Math.max(0, missions.cash - penalty);
  saveGame();
  if (player.inCar) player.exitCar();
  player.x = PLACES.hospital.x;
  player.z = PLACES.hospital.z + 12;
  player.heading = 0;
  player.health = 100;
  player.syncMesh();
  wanted.clear();
  screen = kind;
  hud.showOverlay(kind);
  audio.bust();
  hud.toast(kind === 'busted' ? `Busted! The cops took $${penalty}.` : `Wasted! The hospital took $${penalty}.`);
}

function respawn() {
  screen = 'play';
  hud.showOverlay(null);
  audio.click();
}

function startPlay() {
  audio.ensure();
  audio.click();
  screen = 'play';
  hud.showOverlay(null);
}

let screen = 'title';
loadGame();
hud.setCash(missions.cash);
hud.setObjective(missions.objectiveText, null);
hud.showOverlay('title');

function readInput() {
  const axes = input.axes();
  return { f: axes.f, s: axes.s, run: input.running(), handbrake: input.handbrake(), shoot: input.shooting() };
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    audio.ensure();
    audio.setMuted(!audio.muted);
    hud.setMuted(audio.muted);
  }
  if (screen === 'title') {
    if (actions & ACTION_CONFIRM) startPlay();
    return;
  }
  if (screen === 'play') {
    if (actions & ACTION_PAUSE) {
      screen = 'paused';
      hud.showOverlay('pause');
      return;
    }
    if (actions & ACTION_ENTER) {
      if (player.inCar) {
        player.exitCar();
        audio.click();
      } else {
        const car = nearestCar(player.x, player.z, 4.5);
        if (car) {
          if (!car.owned) {
            car.owned = true;
            wanted.addCrime(WANTED.crimeSteal);
            hud.toast('Car stolen — the heat is on!');
            audio.crash(0.3);
          }
          player.enterCar(car);
          audio.click();
        }
      }
      return;
    }
    if (actions & ACTION_CONFIRM) input.lockPointer();
    return;
  }
  if (screen === 'paused') {
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
      screen = 'play';
      hud.showOverlay(null);
    }
    return;
  }
  if (screen === 'busted' || screen === 'wasted') {
    if (actions & ACTION_CONFIRM) respawn();
    return;
  }
  if (screen === 'complete') {
    if (actions & ACTION_CONFIRM) {
      screen = 'play';
      hud.showOverlay(null);
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const drag = input.takeDrag();
  if (drag.dx !== 0 || drag.dy !== 0) cameraRig.orbit(drag.dx, drag.dy);
  if (drag.wheel !== 0) cameraRig.zoom(drag.wheel);
  handleActions();
  if (screen === 'play') {
    frameAccumulator += Math.min((now - lastNow) / 1000, MAX_FRAME);
    lastNow = now;
    // Simulate every catch-up step, but render only once: the intermediate states
    // are never presented, so rendering each one is pure waste — on a slow
    // renderer it stalls the whole frame.
    let stepped = false;
    while (frameAccumulator >= STEP) {
      stepWorld(STEP, readInput(), false);
      frameAccumulator -= STEP;
      stepped = true;
      if (screen !== 'play') break;
    }
    if (stepped) game.render();
  } else {
    lastNow = now;
    frameAccumulator = 0;
    // The title screen still shows the city alive behind it.
    if (screen === 'title') {
      stepWorld(STEP, { f: 0, s: 0, run: false, handbrake: false, shoot: false });
    }
  }
}

let frameAccumulator = 0;
let lastNow = performance.now();

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') {
    screen = 'paused';
    hud.showOverlay('pause');
  }
});

function runShot(name) {
  hud.showOverlay(null);
  stageShot(name, game);
  hud.setStars(wanted.stars);
  hud.setCash(missions.cash);
  hud.setHealth(player.health);
  hud.setObjective(missions.objectiveText, missions.distanceToTarget(player));
  hud.drawMinimap({ player, traffic, police: wanted.policeCars, marker: missions.target, stashes: missions.stashes }, game.time);
  game.render();
  let painted = 0;
  function paint() {
    game.render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

window.__game = game;

if (shot) runShot(shot);
else requestAnimationFrame(frame);
