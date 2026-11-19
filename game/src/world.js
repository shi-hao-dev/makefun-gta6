// The city of Solmar Bay, built once from a seed: a street grid, procedural buildings with
// canvas facades, palms, lamps, traffic lights, billboards, the beach and the ocean. It also
// owns the collision boxes and the road graph the traffic and the missions drive on.
import { CITY, PALETTE } from './config.js';
import { asphaltTexture, billboardTexture, facadeTexture, oceanTexture, sandTexture, sidewalkTexture } from './textures.js';

const THREE = window.THREE;

const FACADE_BASES = ['#d8b48f', '#c9a37e', '#b7c4c9', '#d9c9a8', '#a8b8c4', '#c4a49a'];
const BILLBOARDS = [
  { lines: ['SOLMAR', 'BAY CITY'], bg: '#e8632c', fg: '#fff3e0' },
  { lines: ['HEAT FM', '98.5'], bg: '#1d5f8f', fg: '#ffe27a' },
  { lines: ['TACO', 'MARINA'], bg: '#2f7d4f', fg: '#fff3e0' },
  { lines: ['BAY BANK'], bg: '#3a3f46', fg: '#ffd23f' },
];

/** Named places the missions point at. */
export const PLACES = {
  garage: { x: -180, z: 180, label: "Lena's Garage" },
  bank: { x: -90, z: 180, label: 'Bay Bank' },
  motel: { x: -190, z: -190, label: 'Starfish Motel' },
  safehouse: { x: 200, z: -200, label: 'The Safehouse' },
  marina: { x: 190, z: 262, label: 'Marina Pier' },
  hospital: { x: 150, z: -210, label: 'Solmar General' },
  playerStart: { x: 0, z: -22 },
  missionCar: { x: 14, z: -24 },
};

function box(w, h, d, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createWorld(rng) {
  const group = new THREE.Group();
  const colliders = [];
  const intersections = [];
  const trafficLights = [];
  const { streets } = CITY;

  for (const sx of streets) {
    for (const sz of streets) intersections.push({ x: sx, z: sz });
  }

  const asphalt = asphaltTexture();
  const sidewalk = sidewalkTexture();
  const sand = sandTexture();
  const ocean = oceanTexture();
  const roofMat = new THREE.MeshStandardMaterial({ color: PALETTE.buildingRoof, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.palmTrunk, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: PALETTE.palmLeaf, roughness: 0.9 });
  const lampMat = new THREE.MeshStandardMaterial({ color: PALETTE.lamp, roughness: 0.6, metalness: 0.4 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6, metalness: 0.3 });

  // Base ground: dark earth under everything.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 620),
    new THREE.MeshStandardMaterial({ color: 0x4d5a4a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 20);
  ground.receiveShadow = true;
  group.add(ground);

  // Roads: asphalt strips along every street, sidewalks beside them.
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ map: sidewalk, roughness: 1 });
  for (const s of streets) {
    const len = 480;
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(len, CITY.roadHalf * 2), roadMat.clone());
    roadX.material.map = asphalt.clone();
    roadX.material.map.repeat.set(len / 12, 1);
    roadX.material.map.needsUpdate = true;
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.01, s);
    roadX.receiveShadow = true;
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadHalf * 2, len), roadMat.clone());
    roadZ.material.map = asphalt.clone();
    roadZ.material.map.repeat.set(1, len / 12);
    roadZ.material.map.needsUpdate = true;
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(s, 0.01, 0);
    roadZ.receiveShadow = true;
    group.add(roadZ);
    const walkX = new THREE.Mesh(new THREE.PlaneGeometry(len, 8), walkMat.clone());
    walkX.material.map = sidewalk.clone();
    walkX.material.map.repeat.set(len / 8, 1);
    walkX.rotation.x = -Math.PI / 2;
    walkX.position.set(0, 0.02, s);
    walkX.receiveShadow = true;
    group.add(walkX);
    const walkZ = new THREE.Mesh(new THREE.PlaneGeometry(8, len), walkMat.clone());
    walkZ.material.map = sidewalk.clone();
    walkZ.material.map.repeat.set(1, len / 8);
    walkZ.rotation.x = -Math.PI / 2;
    walkZ.position.set(s, 0.02, 0);
    walkZ.receiveShadow = true;
    group.add(walkZ);
  }

  // Beach sand and the ocean to the south.
  const sandMesh = new THREE.Mesh(new THREE.PlaneGeometry(560, 50), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  sandMesh.rotation.x = -Math.PI / 2;
  sandMesh.position.set(0, 0.03, CITY.beachStart + 22);
  sandMesh.receiveShadow = true;
  group.add(sandMesh);
  const oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), new THREE.MeshStandardMaterial({ map: ocean, roughness: 0.35, metalness: 0.1 }));
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.set(0, -0.4, CITY.waterStart + 150);
  group.add(oceanMesh);
  // A pale foam line where the water meets the sand.
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 3),
    new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.6 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.05, CITY.waterStart - 1);
  group.add(foam);

  // Buildings, one block at a time. A block is the square between four streets.
  const facadeMats = FACADE_BASES.map((base) => new THREE.MeshStandardMaterial({ map: facadeTexture(rng.fork(), base, 0.28), roughness: 0.9 }));
  const blockRng = rng.fork();
  for (let ix = 0; ix < streets.length - 1; ix += 1) {
    for (let iz = 0; iz < streets.length - 1; iz += 1) {
      const x0 = streets[ix] + CITY.walkHalf;
      const x1 = streets[ix + 1] - CITY.walkHalf;
      const z0 = streets[iz] + CITY.walkHalf;
      const z1 = streets[iz + 1] - CITY.walkHalf;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const downtown = Math.abs(cx) < 100 && Math.abs(cz) < 100;
      const count = downtown ? blockRng.int(1, 2) : blockRng.int(1, 3);
      for (let b = 0; b < count; b += 1) {
        const w = blockRng.range(14, 26);
        const d = blockRng.range(14, 26);
        const h = downtown ? blockRng.range(18, 58) : blockRng.range(7, 22);
        const bx = cx + blockRng.range(-8, 8) * (count > 1 ? 0.7 : 0);
        const bz = cz + blockRng.range(-8, 8) * (count > 1 ? 0.7 : 0);
        const mat = facadeMats[blockRng.int(0, facadeMats.length - 1)];
        const building = box(w, h, d, mat, bx, h / 2, bz);
        building.material.map.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 22)));
        group.add(building);
        group.add(box(w + 0.6, 0.8, d + 0.6, roofMat, bx, h + 0.4, bz));
        if (blockRng.chance(0.5)) {
          group.add(box(3, 1.6, 3, roofMat, bx + w / 4, h + 1.6, bz - d / 4));
        }
        colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
      }
      // A few blocks get a tree or two in their courtyard.
      if (blockRng.chance(0.45)) addPalm(group, cx + blockRng.range(-12, 12), cz + blockRng.range(-12, 12), trunkMat, leafMat, blockRng);
    }
  }

  // Named places: distinct low buildings with signs, so missions read at a glance.
  function landmark(place, w, h, d, color, sign) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const b = box(w, h, d, mat, place.x, h / 2, place.z);
    group.add(b);
    group.add(box(w + 0.6, 0.8, d + 0.6, roofMat, place.x, h + 0.4, place.z));
    colliders.push({ minX: place.x - w / 2, maxX: place.x + w / 2, minZ: place.z - d / 2, maxZ: place.z + d / 2 });
    if (sign) {
      const tex = billboardTexture(sign.lines, sign.bg, sign.fg);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 8),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
      );
      board.position.set(place.x, h + 5.5, place.z - d / 2 - 0.2);
      board.rotation.y = Math.PI;
      group.add(board);
      const post1 = box(0.5, 5, 0.5, poleMat, place.x - 6, h + 3, place.z - d / 2 - 0.2);
      const post2 = box(0.5, 5, 0.5, poleMat, place.x + 6, h + 3, place.z - d / 2 - 0.2);
      group.add(post1, post2);
    }
    return b;
  }
  landmark(PLACES.garage, 26, 9, 18, 0x2f7d6a, { lines: ["LENA'S", 'GARAGE'], bg: '#1d6a5c', fg: '#ffe27a' });
  landmark(PLACES.bank, 30, 16, 20, 0xcfc4a8, { lines: ['BAY BANK'], bg: '#3a3f46', fg: '#ffd23f' });
  landmark(PLACES.motel, 24, 8, 14, 0xc47f5a, { lines: ['STARFISH', 'MOTEL'], bg: '#c47f5a', fg: '#fff3e0' });
  landmark(PLACES.safehouse, 16, 7, 12, 0x8a9ab0, null);
  landmark(PLACES.hospital, 28, 14, 18, 0xdfe6ea, { lines: ['SOLMAR', 'GENERAL'], bg: '#dfe6ea', fg: '#2e7fb8' });

  // Marina pier: wooden deck reaching into the water.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
  group.add(box(8, 1, 40, pierMat, PLACES.marina.x, 0.6, PLACES.marina.z + 12));

  // Palms along Marina Blvd and the beach front.
  for (let x = -200; x <= 200; x += 40) {
    addPalm(group, x + 14, -30 + 12, trunkMat, leafMat, rng.fork());
    addPalm(group, x - 6, -30 - 12, trunkMat, leafMat, rng.fork());
    if (rng.chance(0.6)) addPalm(group, x, CITY.beachStart + 8, trunkMat, leafMat, rng.fork());
  }

  // Street lamps at every other intersection, traffic lights at the four central ones.
  for (const p of intersections) {
    if ((Math.round(p.x / 60) + Math.round(p.z / 60)) % 2 === 0) {
      const lamp = new THREE.Group();
      lamp.add(box(0.3, 6, 0.3, lampMat, 0, 3, 0));
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf8a, emissiveIntensity: 0.7 }),
      );
      head.position.set(0, 6.2, 0);
      lamp.add(head);
      lamp.position.set(p.x + 8, 0, p.z + 8);
      group.add(lamp);
    }
  }
  const central = [
    { x: -30, z: -30 }, { x: 30, z: -30 }, { x: -30, z: 30 }, { x: 30, z: 30 },
  ];
  for (const p of central) {
    const light = makeTrafficLight(poleMat);
    light.position.set(p.x + 8, 0, p.z - 8);
    group.add(light);
    trafficLights.push(light);
  }

  // Rooftop billboards over the downtown.
  for (let i = 0; i < BILLBOARDS.length; i += 1) {
    const spec = BILLBOARDS[i];
    const tex = billboardTexture(spec.lines, spec.bg, spec.fg);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 9),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
    );
    const bx = -120 + i * 80;
    const bz = -150 + (i % 2) * 300;
    board.position.set(bx, 46, bz);
    board.rotation.y = i % 2 === 0 ? 0 : Math.PI;
    group.add(board);
  }

  /** Push a circle out of every building box it overlaps. Returns the corrected position. */
  function collideCircle(x, z, r) {
    let hit = false;
    let nx = 0;
    let nz = 0;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        x += dx * push;
        z += dz * push;
        nx = dx / d;
        nz = dz / d;
      } else {
        // Centre inside the box: push out along the smallest penetration axis.
        const pl = x - c.minX;
        const pr = c.maxX - x;
        const pt = z - c.minZ;
        const pb = c.maxZ - z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) { x = c.minX - r; nx = -1; }
        else if (m === pr) { x = c.maxX + r; nx = 1; }
        else if (m === pt) { z = c.minZ - r; nz = -1; }
        else { z = c.maxZ + r; nz = 1; }
      }
    }
    // Keep everything inside the city bounds and out of the deep water.
    if (x < -CITY.bound) { x = -CITY.bound; hit = true; nx = 1; }
    if (x > CITY.bound) { x = CITY.bound; hit = true; nx = -1; }
    if (z < -CITY.bound) { z = -CITY.bound; hit = true; nz = 1; }
    if (z > CITY.waterStart + 6) { z = CITY.waterStart + 6; hit = true; nz = -1; }
    return { x, z, hit, nx, nz };
  }

  function nearestStreetCoord(v) {
    let best = streets[0];
    let bd = Infinity;
    for (const s of streets) {
      const d = Math.abs(v - s);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** The closest point on a road centre line to (x, z). */
  function nearestRoadPoint(x, z) {
    const sx = nearestStreetCoord(x);
    const sz = nearestStreetCoord(z);
    const dX = Math.abs(z - sz);
    const dZ = Math.abs(x - sx);
    return dX <= dZ ? { x, z: sz, along: 'x' } : { x: sx, z, along: 'z' };
  }

  function randomIntersection(r) {
    return intersections[Math.floor(r.next() * intersections.length)];
  }

  function update(dt, time) {
    // Traffic lights cycle green/amber/red on a slow shared clock.
    const phase = Math.floor(time / 4) % 3;
    for (let i = 0; i < trafficLights.length; i += 1) {
      const light = trafficLights[i];
      const on = (phase + i) % 3;
      light.userData.lamps[0].material.emissiveIntensity = on === 0 ? 1.4 : 0.08;
      light.userData.lamps[1].material.emissiveIntensity = on === 1 ? 1.4 : 0.08;
      light.userData.lamps[2].material.emissiveIntensity = on === 2 ? 1.4 : 0.08;
    }
  }

  return { group, colliders, intersections, collideCircle, nearestRoadPoint, randomIntersection, update };
}

function addPalm(group, x, z, trunkMat, leafMat, rng) {
  const palm = new THREE.Group();
  const h = rng.range(5, 8);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 6), trunkMat);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  palm.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.2, h + 0.6, Math.sin(a) * 1.2);
    leaf.rotation.z = Math.cos(a) * 1.9;
    leaf.rotation.x = -Math.sin(a) * 1.9;
    leaf.castShadow = true;
    palm.add(leaf);
  }
  palm.position.set(x, 0, z);
  group.add(palm);
  return palm;
}

function makeTrafficLight(poleMat) {
  const light = new THREE.Group();
  light.add(box(0.3, 5.4, 0.3, poleMat, 0, 2.7, 0));
  const housing = box(1.0, 2.6, 0.7, new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.6 }), 0, 5.6, 0);
  light.add(housing);
  const lamps = [];
  const colors = [0xff3b30, 0xffcc00, 0x34c759];
  for (let i = 0; i < 3; i += 1) {
    const lamp = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 12),
      new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.08 }),
    );
    lamp.position.set(0, 6.4 - i * 0.8, 0.36);
    light.add(lamp);
    lamps.push(lamp);
  }
  light.userData.lamps = lamps;
  return light;
}
