// Screenshot poses: four deterministic scenes, one per screenshot. Each pose
// places the hero, the cars and the police, sets the wanted level, points the
// camera, and freezes the simulation so the frame is identical every run.
// The app renders 90 frames and then raises window.__shotReady.

/**
 * Pose a shot. game is the app's game object: {hero, traffic, heat, story,
 * view, missionCar, places, panel, screen, frozen}.
 */
export function poseShot(name, game) {
  const { hero, view, heat, story } = game;
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
    heat.set(3);
    const cop = heat.cars[0];
    if (cop) {
      cop.x = -14;
      cop.z = -58;
      cop.heading = Math.PI * 0.1;
      cop.sync();
    }
    view.yaw = Math.PI * 0.15;
    view.pitch = 0.3;
    view.dist = 12;
    game.panel.setStars(3);
    game.panel.setCash(story.cash + 500);
    game.panel.setBrief("Warm-Up Wheels: Bring the Comet to Lena's garage", 86);
  } else if (name === 'street') {
    // On foot on the avenue, traffic rolling by, the city behind him.
    if (hero.inCar) hero.exit();
    hero.x = -30;
    hero.z = 60;
    hero.heading = Math.PI;
    hero.sync();
    heat.set(0);
    view.yaw = Math.PI;
    view.pitch = 0.32;
    view.dist = 10;
    game.panel.setStars(0);
    game.panel.setCash(story.cash);
    game.panel.setBrief('Free roam — Solmar Bay', null);
  } else if (name === 'chase') {
    // Mid-pursuit: the hero in a stolen sedan, a cruiser closing in, four stars.
    const sedan = game.traffic[2];
    putHeroInCar(sedan, 60, 60, Math.PI * 0.5);
    sedan.speed = 22;
    heat.set(4);
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
    view.yaw = Math.PI * 0.5;
    view.pitch = 0.3;
    view.dist = 13;
    game.panel.setStars(4);
    game.panel.setCash(story.cash + 1400);
    game.panel.setBrief('Heat Wave: Lose the heat — get to 0 stars', null);
  } else {
    // Mission: at the Bay Bank with the beacon up, the score about to land.
    if (hero.inCar) hero.exit();
    hero.x = P.bank.x - 6;
    hero.z = P.bank.z + 18;
    hero.heading = Math.PI * 0.9;
    hero.sync();
    heat.set(4);
    view.yaw = Math.PI * 0.9;
    view.pitch = 0.34;
    view.dist = 12;
    game.panel.setStars(4);
    game.panel.setCash(story.cash + 1400);
    game.panel.setBrief('Solmar Score: Grab the cash — stay at the bank', 12);
    story.beacon.visible = true;
    story.beacon.position.set(P.bank.x, 0, P.bank.z);
  }
  game.panel.setHealth(hero.health);
  game.panel.setSight(false);
  game.panel.show(null);
}
