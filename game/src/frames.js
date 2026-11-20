// Screenshot poses: four deterministic scenes, one per screenshot. Each pose
// places the hero, the cars and the police, sets the wanted level, points the
// camera, and freezes the simulation so the frame is identical every run.
// The app renders 90 frames and then raises window.__shotReady.

/**
 * Pose a shot. game is the app's game object: {hero, traffic, heat, story,
 * rig, missionCar, places, hud, screen, frozen}.
 */
export function poseFrame(name, game) {
  const { hero, rig, heat, story } = game;
  const P = game.places;
  game.screen = 'playing';
  game.frozen = true;

  const putHeroInCar = (car, x, z, heading) => {
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.speed = 0;
    car.sync();
    hero.enter(car);
    hero.x = x;
    hero.z = z;
    hero.heading = heading;
    hero.sync();
  };

  if (name === 'cover') {
    // The red Comet front and centre, three stars, traffic streaming past.
    putHeroInCar(game.missionCar, 0, -30, Math.PI * 0.15);
    heat.setStars(3);
    const cop = heat.cars[0];
    if (cop) {
      cop.x = -14;
      cop.z = -58;
      cop.heading = Math.PI * 0.1;
      cop.sync();
    }
    rig.yaw = Math.PI * 0.15;
    rig.pitch = 0.3;
    rig.dist = 12;
    game.hud.setStars(3);
    game.hud.setCash(story.cash + 500);
    game.hud.setBrief("Warm-Up Wheels: Bring the Comet to Lena's garage", 86);
  } else if (name === 'street') {
    // On foot on the avenue, traffic rolling by, the city behind him.
    if (hero.inCar) hero.exit();
    hero.x = -30;
    hero.z = 60;
    hero.heading = Math.PI;
    hero.sync();
    heat.setStars(0);
    rig.yaw = Math.PI;
    rig.pitch = 0.32;
    rig.dist = 10;
    game.hud.setStars(0);
    game.hud.setCash(story.cash);
    game.hud.setBrief('Free roam — Solmar Bay', null);
  } else if (name === 'chase') {
    // Mid-pursuit: the hero in a stolen sedan, a cruiser closing in, four stars.
    const sedan = game.traffic[2];
    putHeroInCar(sedan, 60, 60, Math.PI * 0.5);
    sedan.speed = 22;
    heat.setStars(4);
    const cop = heat.cars[0];
    if (cop) {
      cop.x = 52;
      cop.z = 28;
      cop.heading = Math.PI * 0.5;
      cop.speed = 24;
      cop.sync();
    }
    const cop2 = heat.cars[1];
    if (cop2) {
      cop2.x = 78;
      cop2.z = 88;
      cop2.heading = Math.PI * 0.5;
      cop2.speed = 20;
      cop2.sync();
    }
    rig.yaw = Math.PI * 0.5;
    rig.pitch = 0.3;
    rig.dist = 13;
    game.hud.setStars(4);
    game.hud.setCash(story.cash + 1400);
    game.hud.setBrief('Heat Wave: Lose the heat — get to 0 stars', null);
  } else {
    // Mission: at the Bay Bank with the beacon up, the score about to land.
    if (hero.inCar) hero.exit();
    hero.x = P.bank.x - 6;
    hero.z = P.bank.z + 18;
    hero.heading = Math.PI * 0.9;
    hero.sync();
    heat.setStars(4);
    rig.yaw = Math.PI * 0.9;
    rig.pitch = 0.34;
    rig.dist = 12;
    game.hud.setStars(4);
    game.hud.setCash(story.cash + 1400);
    game.hud.setBrief('Solmar Score: Grab the cash — stay at the bank', 12);
    story.beacon.visible = true;
    story.beacon.position.set(P.bank.x, 0, P.bank.z);
  }
  game.hud.setHealth(hero.health);
  game.hud.setSight(false);
  game.hud.show(null);
}
