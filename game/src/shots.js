// The screenshot scenes behind ?shot=cover|street|chase|mission (with &seed=N). Each one puts
// the real game in a staged state — a chase, a street walk, a mission moment — then plays the
// real rules forward for a fixed number of steps, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { PLACES } from './world.js';

/** Drive a car straight ahead at a steady throttle for the shot. */
function driveInput(throttle) {
  return { f: throttle, s: 0, run: false, handbrake: false, shoot: false };
}

function walkInput() {
  return { f: 1, s: 0, run: false, handbrake: false, shoot: false };
}

function idleInput() {
  return { f: 0, s: 0, run: false, handbrake: false, shoot: false };
}

function placeTraffic(game, spots) {
  for (let i = 0; i < spots.length && i < game.traffic.length; i += 1) {
    const car = game.traffic[i];
    const spot = spots[i];
    car.x = spot.x;
    car.z = spot.z;
    car.heading = spot.heading;
    car.speed = spot.speed || 0;
    car.target = spot.target || null;
    car.syncMesh();
  }
}

function placePolice(game, spots) {
  while (game.wanted.policeCars.length < spots.length) game.wanted.spawnPoliceCar(game.player.x, game.player.z);
  for (let i = 0; i < spots.length; i += 1) {
    const car = game.wanted.policeCars[i];
    car.x = spots[i].x;
    car.z = spots[i].z;
    car.heading = spots[i].heading;
    car.speed = spots[i].speed || 0;
    car.syncMesh();
  }
}

function placePeds(game, spots) {
  for (let i = 0; i < spots.length && i < game.peds.length; i += 1) {
    const ped = game.peds[i];
    ped.x = spots[i].x;
    ped.z = spots[i].z;
    ped.heading = spots[i].heading || 0;
    ped.state = 'walk';
    ped.target = { x: spots[i].x + (spots[i].walk || 20), z: spots[i].z };
    ped.syncMesh();
  }
}

function snapCamera(game, yaw, pitch, distance, target) {
  game.camera.yaw = yaw;
  game.camera.pitch = pitch;
  game.camera.distance = distance;
  game.camera.autoAlign = false;
  game.camera.lastDrag = performance.now();
  for (let i = 0; i < 4; i += 1) game.camera.update(1, target, game.time);
}

/**
 * Stage the named scene on the live game and return the number of fixed steps it ran.
 * The caller renders and sets window.__shotReady afterwards.
 */
export function stageShot(name, game) {
  const player = game.player;
  const wanted = game.wanted;
  const missions = game.missions;
  let steps = 60;
  let input = idleInput();

  if (name === 'street') {
    // On foot at Marina Blvd, peds crossing, traffic rolling past, beach ahead.
    player.x = 0;
    player.z = 20;
    player.heading = 0;
    player.inCar = false;
    player.car = null;
    player.mesh.visible = true;
    player.syncMesh();
    wanted.clear();
    missions.index = 0;
    missions.stepIndex = 0;
    missions.done = false;
    missions.syncBeacon();
    placeTraffic(game, [
      { x: -40, z: 30, heading: Math.PI / 2, speed: 11, target: { x: 210, z: 30 } },
      { x: 60, z: -30, heading: -Math.PI / 2, speed: 12, target: { x: -210, z: -30 } },
      { x: -90, z: -30, heading: Math.PI / 2, speed: 10, target: { x: 210, z: -30 } },
    ]);
    placePeds(game, [
      { x: 6, z: 34, heading: Math.PI / 2, walk: 30 },
      { x: -8, z: 38, heading: -Math.PI / 2, walk: -30 },
      { x: 14, z: -22, heading: 0, walk: 24 },
      { x: -16, z: -38, heading: Math.PI, walk: -24 },
    ]);
    steps = 45;
    input = walkInput();
    game.runSteps(steps, input);
    snapCamera(game, 0.15, 0.3, 8.5, { x: player.x, z: player.z, heading: player.heading, inCar: false });
    return steps;
  }

  if (name === 'chase') {
    // Flat out down Ocean Ave with three cruisers on the bumper, four stars.
    const car = game.missionCar;
    car.x = 0;
    car.z = 30;
    car.heading = Math.PI / 2;
    car.speed = 30;
    car.syncMesh();
    player.enterCar(car);
    wanted.setStars(4);
    missions.index = 1;
    missions.stepIndex = 1;
    missions.done = false;
    missions.syncBeacon();
    placeTraffic(game, [
      { x: 90, z: 30, heading: Math.PI / 2, speed: 12, target: { x: 210, z: 30 } },
      { x: 120, z: -30, heading: -Math.PI / 2, speed: 11, target: { x: -210, z: -30 } },
    ]);
    placePolice(game, [
      { x: -10, z: 30, heading: Math.PI / 2, speed: 29 },
      { x: -20, z: 33, heading: Math.PI / 2, speed: 28 },
      { x: -16, z: 26, heading: Math.PI / 2, speed: 27 },
    ]);
    game.effects.burst({ x: -8, y: 0.5, z: 31 }, 0xffd23f, 16, 7, 0.6);
    steps = 50;
    input = driveInput(1);
    game.runSteps(steps, input);
    snapCamera(game, Math.PI / 2 + 0.25, 0.16, 10, { x: player.x, z: player.z, heading: car.heading, inCar: true });
    return steps;
  }

  if (name === 'mission') {
    // The Solmar Score: Jace on foot at the Bay Bank vault marker, cruisers closing in.
    player.x = -90;
    player.z = 162;
    player.heading = 0;
    player.inCar = false;
    player.car = null;
    player.mesh.visible = true;
    player.syncMesh();
    wanted.setStars(4);
    missions.index = 3;
    missions.stepIndex = 1;
    missions.done = false;
    missions.syncBeacon();
    placeTraffic(game, [
      { x: -120, z: 150, heading: Math.PI / 2, speed: 10, target: { x: 210, z: 150 } },
    ]);
    placePolice(game, [
      { x: -140, z: 150, heading: Math.PI / 2, speed: 12 },
      { x: 40, z: 150, heading: -Math.PI / 2, speed: 12 },
    ]);
    placePeds(game, [
      { x: -70, z: 168, heading: Math.PI / 2, walk: 30 },
      { x: -110, z: 170, heading: -Math.PI / 2, walk: -30 },
    ]);
    steps = 35;
    input = idleInput();
    game.runSteps(steps, input);
    snapCamera(game, 0.35, 0.34, 8, { x: player.x, z: player.z, heading: player.heading, inCar: false });
    return steps;
  }

  // cover: the hero shot. The red Comet tearing down Marina Blvd, two stars of heat behind
  // it, traffic ahead, the marina drop marker glowing in the distance.
  const car = game.missionCar;
  car.x = 0;
  car.z = -30;
  car.heading = Math.PI / 2;
  car.speed = 18;
  car.syncMesh();
  player.enterCar(car);
  wanted.setStars(3);
  missions.index = 1;
  missions.stepIndex = 0;
  missions.done = false;
  missions.syncBeacon();
  placeTraffic(game, [
    { x: 38, z: -30, heading: Math.PI / 2, speed: 11, target: { x: 210, z: -30 } },
    { x: 78, z: -30, heading: Math.PI / 2, speed: 9, target: { x: 210, z: -30 } },
    { x: -30, z: 30, heading: -Math.PI / 2, speed: 12, target: { x: -210, z: 30 } },
  ]);
  placePolice(game, [
    { x: -26, z: -30, heading: Math.PI / 2, speed: 20 },
    { x: -48, z: -27, heading: Math.PI / 2, speed: 19 },
  ]);
  placePeds(game, [
    { x: 20, z: -20, heading: Math.PI / 2, walk: 30 },
    { x: -14, z: -40, heading: -Math.PI / 2, walk: -30 },
    { x: 55, z: -20, heading: 0, walk: 24 },
  ]);
  steps = 75;
  input = driveInput(0.6);
  game.runSteps(steps, input);
  snapCamera(game, Math.PI / 2 + 0.35, 0.2, 11, { x: player.x, z: player.z, heading: car.heading, inCar: true });
  return steps;
}

export const SHOT_NAMES = ['cover', 'street', 'chase', 'mission'];
export { PLACES };
