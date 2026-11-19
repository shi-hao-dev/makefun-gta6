// Every tuning number, colour and name in one place. Solmar Bay is a sun-soaked coastal
// city: streets on a 60-unit grid, the beach and ocean along the south edge (+z). Nothing here
// depends on the screen size; the renderer scales to the window.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-heat.save.v1';

export const CITY = {
  // Street centre lines, both directions. Blocks sit between neighbouring streets.
  streets: [-210, -150, -90, -30, 30, 90, 150, 210],
  roadHalf: 6,
  walkHalf: 10,
  // South edge: sand, then water.
  beachStart: 245,
  waterStart: 292,
  bound: 248,
};

export const PLAYER = {
  walkSpeed: 5.2,
  runSpeed: 8.4,
  radius: 0.7,
  health: 100,
  enterRange: 4.5,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverseAccel: 10,
  maxSpeed: 34,
  maxReverse: 10,
  steerMax: 0.55,
  grip: 8,
  radius: 2.1,
  length: 4.4,
  width: 2.0,
};

export const TRAFFIC = {
  count: 14,
  speedMin: 8,
  speedMax: 13,
  radius: 2.1,
};

export const PED = {
  count: 24,
  walkMin: 1.1,
  walkMax: 2.0,
  fleeSpeed: 3.6,
  radius: 0.6,
};

export const WANTED = {
  maxStars: 5,
  // Heat points per crime; stars are thresholds of heat.
  crimeSteal: 25,
  crimeHitPed: 30,
  crimeShoot: 20,
  crimeRamCop: 35,
  starAt: [0, 25, 55, 95, 145, 205],
  decayQuietSeconds: 20,
  decayPerSecond: 2.2,
  bustHoldSeconds: 2.0,
  bustCarHoldSeconds: 3.0,
};

export const POLICE = {
  chaseSpeed: 30,
  ramDamage: 7,
  ramCooldown: 1.0,
};

export const COMBAT = {
  fireRate: 0.22,
  damage: 34,
  range: 90,
  pedHealth: 34,
  copHealth: 102,
  carHealth: 120,
};

export const MISSIONS = [
  {
    id: 'warmup',
    title: 'Warm-Up Wheels',
    briefing: 'Lena needs a wheelman. Steal the red Comet on Marina Blvd and bring it to her garage.',
    reward: 500,
  },
  {
    id: 'marina',
    title: 'The Marina Drop',
    briefing: 'Pick up the package at the marina pier, then deliver it to the Starfish Motel. The drop is hot — expect heat.',
    reward: 900,
  },
  {
    id: 'heatwave',
    title: 'Heat Wave',
    briefing: 'Three stars and every cruiser in Solmar on your tail. Lose them. All of them.',
    reward: 1200,
  },
  {
    id: 'score',
    title: 'The Solmar Score',
    briefing: 'The Bay Bank. Walk in, grab the cash, and get to the safehouse with the whole city chasing you.',
    reward: 3000,
  },
];

export const STASH_COUNT = 8;
export const STASH_REWARD = 150;

export const PALETTE = {
  sky: 0x8ec9ee,
  skyHorizon: 0xf6d9a0,
  sun: 0xffe3b3,
  fog: 0xd8e6f2,
  ground: 0x3a3f46,
  asphalt: 0x33373d,
  sidewalk: 0x9a938a,
  sand: 0xe8d29a,
  ocean: 0x2e7fb8,
  oceanDeep: 0x1d5f8f,
  buildingRoof: 0x6b6f76,
  grass: 0x5f9e52,
  palmTrunk: 0x8a6a45,
  palmLeaf: 0x3f8f4f,
  lamp: 0x2c2f33,
  playerJacket: 0x2fb3a3,
  playerPants: 0x2a2f38,
  policeWhite: 0xf2f4f6,
  policeBlack: 0x1c1e22,
  hudText: '#f4f6f8',
  hudMuted: '#c8ccd2',
  star: '#ffd23f',
  marker: 0xffc93c,
  markerBeam: 0xffe27a,
};

export const NAMES = {
  game: 'SOLMAR HEAT',
  city: 'Solmar Bay',
  player: 'Jace Moreno',
  fixer: 'Lena Cruz',
  bank: 'Bay Bank',
  garage: "Lena's Garage",
  motel: 'Starfish Motel',
  safehouse: 'The Safehouse',
};
