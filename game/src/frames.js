// Deterministic screenshot scenes. `?shot=<name>&seed=7` boots the game straight into a
// posed scene (no title screen) and freezes the simulation, so a screenshot is the same
// every run. The playtest script waits for window.__shotReady.

export const SHOT_LIST = ['cover', 'street', 'chase', 'mission'];

function putHeroInCar(game, car) {
  game.hero.x = car.x;
  game.hero.z = car.z;
  game.hero.heading = car.heading;
  game.hero.climbIn(car);
  game.hero.sync();
}

function putHeroOnFoot(game, x, z, heading) {
  if (game.hero.inAuto) game.hero.climbOut();
  game.hero.x = x;
  game.hero.z = z;
  game.hero.heading = heading;
  game.hero.sync();
}

export function poseScene(name, game) {
  const { hero, story, heat, lens, dash, seed } = game;
  game.frozen = true;
  dash.show(null);
  // A clean slate: no heat, no leftover cops.
  heat.reset();
  if (name === 'cover') {
    // Jace beside the red Comet, city and beach behind him.
    story.start(0);
    putHeroOnFoot(game, 10, -28, 0.9);
    game.missionCar.x = 14;
    game.missionCar.z = -24;
    game.missionCar.heading = 0.4;
    game.missionCar.sync();
    lens.yaw = 2.6;
    lens.pitch = 0.3;
    lens.dist = 12;
    lens.follow = false;
    lens.lastMove = performance.now();
  } else if (name === 'street') {
    // Driving through traffic on a main street.
    story.start(0);
    const car = game.traffic[0];
    car.x = 0;
    car.z = 30;
    car.heading = 0;
    car.speed = 12;
    car.sync();
    putHeroInCar(game, car);
    const others = game.traffic.slice(1, 5);
    const spots = [[-2, 55, 0], [3, 80, 0], [-3, 5, 0], [2, -15, 0]];
    others.forEach((c, i) => {
      c.x = spots[i][0];
      c.z = spots[i][1];
      c.heading = spots[i][2];
      c.speed = 10;
      c.sync();
    });
    lens.yaw = 0;
    lens.pitch = 0.32;
    lens.dist = 9;
    lens.follow = true;
  } else if (name === 'chase') {
    // Three stars, cruisers closing in from behind.
    story.start(2);
    const car = game.missionCar;
    car.x = 0;
    car.z = -30;
    car.heading = 0;
    car.speed = 18;
    car.sync();
    putHeroInCar(game, car);
    heat.set(3);
    const c1 = heat.sendAuto(hero.x, hero.z);
    c1.x = -3;
    c1.z = -58;
    c1.heading = 0;
    c1.sync();
    const c2 = heat.sendAuto(hero.x, hero.z);
    c2.x = 4;
    c2.z = -64;
    c2.heading = 0;
    c2.sync();
    lens.yaw = 0;
    lens.pitch = 0.34;
    lens.dist = 10;
    lens.follow = true;
  } else {
    // 'mission': on foot at the Bay Bank, the beacon marking the score.
    story.start(3);
    putHeroOnFoot(game, -108, 192, -0.7);
    lens.yaw = 2.4;
    lens.pitch = 0.3;
    lens.dist = 12;
    lens.follow = false;
    lens.lastMove = performance.now();
  }
  // Refresh the HUD once so the shot shows the posed state.
  game.refreshHud();
}
