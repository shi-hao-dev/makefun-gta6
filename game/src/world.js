// Solmar Bay: the city itself. A road grid on a 60 m pitch, block buildings with
// procedural window textures, a beach and a marina pier to the south, and the
// named places every mission drives to. All targets sit ON roads, never inside
// a building, so a goal is always reachable.

import { makeRng } from './util.js';

const THREE = window.THREE;

export const GRID = 60;
export const ROAD = 14;
const EDGE = 330; // city half-size; the beach runs south of z = 300

/** Named spots, all on roads or intersections, so cars and feet can reach them. */
export const PLACES = {
  playerStart: { x: -60, z: 0 },
  missionCar: { x: 60, z: -60 },
  garage: { x: 120, z: -60 },
  marina: { x: 0, z: 300 },
  motel: { x: -180, z: 120 },
  bank: { x: 180, z: -180 },
  safehouse: { x: -240, z: -240 },
  hospital: { x: 240, z: 240 },
};

/** Eight hidden cash stashes, each worth $150. */
export const STASH_POINTS = [
  { x: -120, z: 180 },
  { x: 120, z: 180 },
  { x: -120, z: -180 },
  { x: 120, z: -180 },
  { x: 0, z: 240 },
  { x: -60, z: -120 },
  { x: 180, z: 60 },
  { x: -180, z: -60 },
];

const PALETTE = [0xd9a066, 0xb0705a, 0x7d8a99, 0xe0cfa8, 0x9a8a7a, 0x6a7a8a, 0xc98a7a, 0x8a9a7a];

/** A window-grid texture drawn on a canvas, shared per base colour. */
function windowTexture(base) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = `#${base.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(20, 28, 40, 0.85)';
  for (let y = 10; y < 120; y += 18) {
    for (let x = 8; x < 56; x += 16) {
      g.fillRect(x, y, 9, 11);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function buildWorld(rng) {
  const group = new THREE.Group();
  const solids = []; // {x, z, hx, hz} axis-aligned colliders
  const crossings = [];
  for (let i = -5; i <= 5; i += 1) {
    for (let j = -5; j <= 5; j += 1) crossings.push({ x: i * GRID, z: j * GRID });
  }

  const addSolid = (x, z, hx, hz) => solids.push({ x, z, hx, hz });

  // --- Ground, roads, beach, water. ---
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9aa08a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 780), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 20);
  ground.receiveShadow = true;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.95 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
  for (let k = -5; k <= 5; k += 1) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 660), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(k * GRID, 0, 0);
    v.receiveShadow = true;
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(660, ROAD), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0, k * GRID);
    h.receiveShadow = true;
    group.add(h);
    // Centre dashes.
    for (let s = -300; s <= 300; s += 24) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), lineMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(k * GRID, 0.02, s);
      group.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), lineMat);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(s, 0.02, k * GRID);
      group.add(d2);
    }
  }

  // Beach sand and the bay water to the south.
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe8d49a, roughness: 1 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(760, 90), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, 345);
  sand.receiveShadow = true;
  group.add(sand);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a7ab0, roughness: 0.25, metalness: 0.35 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(760, 220), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, 500);
  group.add(water);

  // --- Buildings. ---
  const textures = PALETTE.slice(0, 4).map(windowTexture);
  const landmarkBlocks = new Set(['1,-1', '2,-4', '-4,1', '-5,-5', '3,3', '0,4']);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 1 });
  for (let bx = -5; bx <= 4; bx += 1) {
    for (let bz = -5; bz <= 4; bz += 1) {
      if (landmarkBlocks.has(`${bx},${bz}`)) continue;
      const cx = bx * GRID + GRID / 2;
      const cz = bz * GRID + GRID / 2;
      // Keep blocks slim: a wide block in a 60 m pitch leaves almost no gap
      // between the building and the road edge, and cars wedge there.
      // 26 m max leaves 9 m of clearance on each side.
      const w = rng.range(18, 26);
      const d = rng.range(18, 26);
      const h = rng.range(9, 42);
      const tex = rng.pick(textures);
      tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 14)));
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const b = box(w, h, d, mat, cx, h / 2, cz);
      group.add(b);
      group.add(box(w + 1, 1.2, d + 1, roofMat, cx, h + 0.6, cz));
      addSolid(cx, cz, w / 2 + 0.6, d / 2 + 0.6);
    }
  }

  // --- Landmarks. ---
  const cream = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.9 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x2a9a8a, roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.9 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6, emissive: 0xffd23f, emissiveIntensity: 0.25 });

  // Lena's garage: low wide block with a yellow sign, front on the z=-60 road.
  group.add(box(34, 9, 24, cream, 90, 4.5, -30));
  group.add(box(20, 2.2, 1, yellow, 90, 10.5, -42.5));
  addSolid(90, -30, 17.5, 12.5);

  // Bay Bank: tall white tower with columns, front on the (180,-180) crossing.
  group.add(box(26, 52, 26, white, 150, 26, -210));
  group.add(box(30, 2, 30, roofMat, 150, 53, -210));
  for (let i = -1; i <= 1; i += 1) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 12, 10), cream);
    col.position.set(150 + i * 9, 6, -196);
    col.castShadow = true;
    group.add(col);
  }
  addSolid(150, -210, 13.5, 13.5);

  // Starfish Motel: long turquoise block with a pool, front on (-180,120).
  group.add(box(40, 8, 16, teal, -210, 4, 90));
  group.add(box(42, 1, 18, roofMat, -210, 8.5, 90));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: 0x2a9ad0, roughness: 0.2, metalness: 0.4 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-210, 0.1, 112);
  group.add(pool);
  addSolid(-210, 90, 20.5, 8.5);

  // Safehouse: small house with a pyramid roof, front on (-240,-240).
  group.add(box(14, 6, 12, cream, -270, 3, -270));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), new THREE.MeshStandardMaterial({ color: 0xa04a3a, roughness: 0.9 }));
  roof.position.set(-270, 8.5, -270);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  addSolid(-270, -270, 7.5, 6.5);

  // Hospital: white slab with a red cross, front on (240,240).
  group.add(box(24, 30, 20, white, 210, 15, 210));
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xd43d3d, emissive: 0xd43d3d, emissiveIntensity: 0.4 });
  group.add(box(8, 2.4, 1, crossMat, 210, 32, 200.5));
  group.add(box(2.4, 8, 1, crossMat, 210, 32, 200.5));
  addSolid(210, 210, 12.5, 10.5);

  // Marina shack + pier + boats.
  group.add(box(10, 5, 8, cream, 30, 2.5, 270));
  addSolid(30, 270, 5.5, 4.5);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  group.add(box(8, 1, 60, pierMat, 0, 0.6, 330));
  const boats = [];
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });
  const hullMat2 = new THREE.MeshStandardMaterial({ color: 0x3a6ab0, roughness: 0.6 });
  for (let i = 0; i < 2; i += 1) {
    const boat = new THREE.Group();
    const hull = box(4, 1.6, 10, i === 0 ? hullMat : hullMat2, 0, 0.4, 0);
    boat.add(hull);
    boat.add(box(2.4, 1.4, 3, cream, 0, 1.8, -1));
    boat.position.set(i === 0 ? -14 : 14, 0, 352);
    boat.rotation.y = rng.range(-0.1, 0.1);
    group.add(boat);
    boats.push(boat);
  }

  // Palms along the beach and a few on the avenues.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3a8a4a, roughness: 0.9 });
  const palmSpots = [];
  for (let x = -300; x <= 300; x += 60) palmSpots.push({ x, z: 312 });
  for (let i = 0; i < 10; i += 1) {
    palmSpots.push({ x: rng.range(-280, 280), z: rng.pick([-300, -240, -180, -120, -60, 0, 60, 120, 180, 240]) + 24 });
  }
  for (const p of palmSpots) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 8), trunkMat);
    trunk.position.set(p.x, 3.5, p.z);
    trunk.castShadow = true;
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3, 8), frondMat);
    top.position.set(p.x, 8.2, p.z);
    top.castShadow = true;
    group.add(top);
  }

  /** Push a circle out of every building it overlaps. */
  function collideCircle(x, z, r) {
    let hit = false;
    let nx = 0;
    let nz = 0;
    for (const s of solids) {
      const dx = x - s.x;
      const dz = z - s.z;
      const px = s.hx + r - Math.abs(dx);
      const pz = s.hz + r - Math.abs(dz);
      if (px > 0 && pz > 0) {
        hit = true;
        if (px < pz) {
          x += (dx > 0 ? px : -px);
          nx = dx > 0 ? 1 : -1;
          nz = 0;
        } else {
          z += (dz > 0 ? pz : -pz);
          nx = 0;
          nz = dz > 0 ? 1 : -1;
        }
      }
    }
    // City bounds: stay out of deep water and off the map edge.
    if (x < -EDGE) { x = -EDGE; hit = true; nx = 1; nz = 0; }
    if (x > EDGE) { x = EDGE; hit = true; nx = -1; nz = 0; }
    if (z < -EDGE) { z = -EDGE; hit = true; nx = 0; nz = 1; }
    if (z > 385) { z = 385; hit = true; nx = 0; nz = -1; }
    return { hit, x, z, nx, nz };
  }

  function randomCrossing(r) {
    return r.pick(crossings);
  }

  let t = 0;
  function tick(dt) {
    t += dt;
    for (let i = 0; i < boats.length; i += 1) {
      boats[i].position.y = Math.sin(t * 0.9 + i * 2.1) * 0.25;
      boats[i].rotation.z = Math.sin(t * 0.7 + i) * 0.03;
    }
    water.position.y = -0.4 + Math.sin(t * 0.5) * 0.08;
  }

  return { group, solids, crossings, places: PLACES, stashes: STASH_POINTS, collideCircle, randomCrossing, tick };
}
