// Every number the game runs on, in one place. Solmar Bay is a sun-soaked coastal city
// on a 60-unit street grid, with the beach and the ocean along its south edge (+z).
// Nothing here depends on the window size; the stage scales to it.

export const TICK = 1 / 60;
export const SAVE_SLOT = 'solmar-heat.save.v2';

export const GRID = {
  // Street centre lines, both ways. Blocks sit between neighbouring streets.
  lines: [-210, -150, -90, -30, 30, 90, 150, 210],
  road: 6, // half-width of asphalt
  walk: 10, // half-width out to the sidewalk edge
  sand: 245, // where the beach starts
  sea: 292, // where the water starts
  edge: 248, // playable bound
};

export const HERO = {
  walk: 5.2,
  sprint: 8.4,
  radius: 0.7,
  health: 100,
  reach: 4.5, // how close a car must be to steal it
};

export const AUTO = {
  accel: 16,
  brake: 30,
  reverse: 10,
  top: 34,
  topBack: 10,
  steer: 0.55,
  grip: 8,
  radius: 2.1,
  len: 4.4,
  wide: 2.0,
};

export const FLOW = {
  count: 14,
  slow: 8,
  fast: 13,
  radius: 2.1,
};

export const CROWD = {
  count: 24,
  slow: 1.1,
  fast: 2.0,
  run: 3.6,
  radius: 0.6,
};

export const HEAT = {
  cap: 5,
  steal: 25, // heat points per crime; stars are thresholds of heat
  hitPed: 30,
  shoot: 20,
  ramCop: 35,
  at: [0, 25, 55, 95, 145, 205], // heat needed for 0..5 stars
  quiet: 20, // seconds clean before heat starts to cool
  cool: 2.2, // heat lost per second while cooling
  bustFoot: 2.0, // seconds a foot cop must hold you to bust you
  bustAuto: 3.0, // seconds a cruiser must pin your car to bust you
};

export const COPS = {
  chase: 30,
  ram: 7,
  ramWait: 1.0,
};

export const GUN = {
  rate: 0.22,
  dmg: 34,
  reach: 90,
  pedHp: 34,
  copHp: 102,
  carHp: 120,
};

export const JOBS = [
  {
    id: 'wheels',
    title: 'Warm-Up Wheels',
    brief: 'Lena needs a wheelman. Steal the red Comet on Marina Blvd and bring it to her garage.',
    pay: 500,
  },
  {
    id: 'drop',
    title: 'The Marina Drop',
    brief: 'Pick up the package at the marina pier, then deliver it to the Starfish Motel. The drop is hot — expect heat.',
    pay: 900,
  },
  {
    id: 'heat',
    title: 'Heat Wave',
    brief: 'Three stars and every cruiser in Solmar on your tail. Lose them. All of them.',
    pay: 1200,
  },
  {
    id: 'score',
    title: 'The Solmar Score',
    brief: 'The Bay Bank. Walk in, grab the cash, and get to the safehouse with the whole city chasing you.',
    pay: 3000,
  },
];

export const STASHES = 8;
export const STASH_PAY = 150;

export const HUES = {
  sky: 0x8ec9ee,
  horizon: 0xf6d9a0,
  sun: 0xffe3b3,
  fog: 0xd8e6f2,
  earth: 0x3a3f46,
  road: 0x33373d,
  walk: 0x9a938a,
  sand: 0xe8d29a,
  sea: 0x2e7fb8,
  deep: 0x1d5f8f,
  roof: 0x6b6f76,
  grass: 0x5f9e52,
  trunk: 0x8a6a45,
  leaf: 0x3f8f4f,
  lamp: 0x2c2f33,
  jacket: 0x2fb3a3,
  pants: 0x2a2f38,
  copWhite: 0xf2f4f6,
  copDark: 0x1c1e22,
  ink: '#f4f6f8',
  dim: '#c8ccd2',
  gold: '#ffd23f',
  mark: 0xffc93c,
  beam: 0xffe27a,
};

export const CAST = {
  game: 'SOLMAR HEAT',
  city: 'Solmar Bay',
  hero: 'Jace Moreno',
  fixer: 'Lena Cruz',
  bank: 'Bay Bank',
  garage: "Lena's Garage",
  motel: 'Starfish Motel',
  safehouse: 'The Safehouse',
};
