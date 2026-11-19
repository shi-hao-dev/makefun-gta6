// Solmar Bay: the ground, the street grid, the blocks of buildings, the beach and the
// ocean, plus the landmarks the story needs. Everything is built from a seed, so the
// same seed always rebuilds the same city. Colliders are circles; pushOut keeps the
// player, cars and pedestrians out of them.

import { GRID, HUES } from './tune.js';
import { paintFacade, paintRoad, paintWalk, paintSand, paintSea, paintSign } from './skin.js';

// The places the story and the screenshots need. Same spots the missions were built on.
export const SPOTS = {
  garage: { x: -180, z: 180 },
  bank: { x: -120, z: 180 },
  motel: { x: -190, z: -190 },
  safehouse: { x: 200, z: -200 },
  marina: { x: 190, z: 240 },
  hospital: { x: 180, z: -180 },
  playerStart: { x: 0, z: -22 },
  missionCar: { x: 14, z: -24 },
};

const FACADE_BASES = ['#c9a37e', '#b7a8c9', '#a8c9b7', '#c9b7a8', '#b7c9d9', '#d9c9a8'];

function flat(w, d, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function buildBay(seed) {
  const group = new THREE.Group();
  const solids = [];
  const crossings = [];
  const rng = seed.branch();

  // --- Ground: one big earth plane, then road and sidewalk strips over it. ---
  const earth = flat(560, 640, new THREE.MeshStandardMaterial({ color: HUES.earth, roughness: 1 }));
  earth.position.set(0, 0, 20);
  group.add(earth);

  const roadTex = paintRoad();
  const walkTex = paintWalk();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 });
  for (const line of GRID.lines) {
    // A horizontal street (constant z) and a vertical street (constant x).
    const h = flat(560, GRID.road * 2, roadMat.clone());
    h.material.map = roadTex.clone();
    h.material.map.repeat.set(14, 1);
    h.material.map.needsUpdate = true;
    h.position.set(0, 0.02, line);
    group.add(h);
    const v = flat(GRID.road * 2, 560, roadMat.clone());
    v.material.map = roadTex.clone();
    v.material.map.repeat.set(1, 14);
    v.material.map.needsUpdate = true;
    v.position.set(line, 0.02, 0);
    group.add(v);
    // Sidewalk ribbons on both sides of each street, centred between the road edge
    // and the block edge.
    for (const side of [-1, 1]) {
      const off = side * (GRID.road + GRID.walk) / 2;
      const hs = flat(560, GRID.walk - GRID.road, walkMat);
      hs.position.set(0, 0.015, line + off);
      group.add(hs);
      const vs = flat(GRID.walk - GRID.road, 560, walkMat);
      vs.position.set(line + off, 0.015, 0);
      group.add(vs);
    }
  }

  // --- Beach and ocean along the south edge (+z). ---
  const sand = flat(560, GRID.sea - GRID.sand, new THREE.MeshStandardMaterial({ map: paintSand(), roughness: 1 }));
  sand.position.set(0, 0.01, (GRID.sand + GRID.sea) / 2);
  group.add(sand);
  const seaTex = paintSea();
  const sea = flat(560, 260, new THREE.MeshStandardMaterial({ map: seaTex, roughness: 0.4, metalness: 0.1 }));
  sea.position.set(0, 0.005, GRID.sea + 130);
  group.add(sea);

  // --- Buildings: one or two per block, facades painted per building. ---
  const roofMat = new THREE.MeshStandardMaterial({ color: HUES.roof, roughness: 0.9 });
  const facades = FACADE_BASES.map((base) => paintFacade(rng, base, 0.45));
  const blocks = [];
  for (let i = 0; i < GRID.lines.length - 1; i += 1) {
    for (let j = 0; j < GRID.lines.length - 1; j += 1) {
      const x0 = GRID.lines[i] + GRID.walk;
      const x1 = GRID.lines[i + 1] - GRID.walk;
      const z0 = GRID.lines[j] + GRID.walk;
      const z1 = GRID.lines[j + 1] - GRID.walk;
      blocks.push({ x0, x1, z0, z1 });
    }
  }
  function tower(cx, cz, w, d, h, facadeIdx) {
    const mats = [
      new THREE.MeshStandardMaterial({ map: facades[facadeIdx] }),
      new THREE.MeshStandardMaterial({ map: facades[facadeIdx] }),
      roofMat,
      roofMat,
      new THREE.MeshStandardMaterial({ map: facades[facadeIdx] }),
      new THREE.MeshStandardMaterial({ map: facades[facadeIdx] }),
    ];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(cx, h / 2, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    solids.push({ x: cx, z: cz, r: Math.max(w, d) * 0.62 });
    return m;
  }
  for (const b of blocks) {
    const bw = b.x1 - b.x0;
    const bd = b.z1 - b.z0;
    // Skip the block the player starts on, so the spawn is open.
    if (b.x0 < 20 && b.x1 > -20 && b.z0 < 0 && b.z1 > -40) continue;
    // Keep the ground around every landmark clear: the mission spots need room to
    // drive up to, and a stray tower there would wedge the player against the landmark.
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const nearLandmark = [SPOTS.garage, SPOTS.bank, SPOTS.motel, SPOTS.safehouse, SPOTS.hospital]
      .some((s) => Math.hypot(cx - s.x, cz - s.z) < 45);
    if (nearLandmark) continue;
    if (rng.maybe(0.5)) {
      // One wide building.
      tower((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, bw * 0.62, bd * 0.62, rng.span(9, 26), rng.whole(0, facades.length - 1));
    } else {
      // Two buildings, offset to opposite corners.
      tower(b.x0 + bw * 0.28, b.z0 + bd * 0.3, bw * 0.4, bd * 0.4, rng.span(8, 22), rng.whole(0, facades.length - 1));
      tower(b.x0 + bw * 0.72, b.z0 + bd * 0.7, bw * 0.4, bd * 0.4, rng.span(8, 24), rng.whole(0, facades.length - 1));
    }
  }

  // --- Landmarks: distinct buildings with signs, at the story spots. ---
  function landmark(spot, w, d, h, color, signLines, signBg, signFg, signFace) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, roofMat, roofMat, mat, mat]);
    m.position.set(spot.x, h / 2, spot.z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    landmarkCollider(spot, w, d);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, 2.4),
      new THREE.MeshStandardMaterial({ map: paintSign(signLines, signBg, signFg), roughness: 0.6 }),
    );
    sign.position.set(spot.x, h + 1.6, spot.z + d / 2 + 0.15);
    if (signFace === 'north') sign.rotation.y = Math.PI;
    group.add(sign);
    return m;
  }
  // Landmark colliders are deliberately tight (half the larger side) so the player can
  // walk and drive right up to the door — the mission radii depend on it.
  function landmarkCollider(spot, w, d) {
    solids.push({ x: spot.x, z: spot.z, r: Math.max(w, d) * 0.5 });
  }
  landmark(SPOTS.garage, 26, 18, 9, 0xb0503c, ["LENA'S", 'GARAGE'], '#2b2b2b', '#ffd23f', 'south');
  landmark(SPOTS.bank, 30, 20, 16, 0xd9c9a8, ['BAY BANK'], '#1c3a5e', '#ffffff', 'south');
  landmark(SPOTS.motel, 28, 16, 10, 0x7fb3d9, ['STARFISH', 'MOTEL'], '#0f4c5c', '#ffe27a', 'north');
  landmark(SPOTS.safehouse, 24, 16, 8, 0x8a6a45, ['SAFEHOUSE'], '#3a2f22', '#f4f6f8', 'north');
  landmark(SPOTS.hospital, 30, 20, 14, 0xe8e8e8, ['HOSPITAL'], '#ffffff', '#d43d3d', 'north');

  // --- Marina pier: wooden planks jutting from the beach into the water. ---
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 60), pierMat);
  pier.position.set(SPOTS.marina.x, 0.4, SPOTS.marina.z + 35);
  pier.castShadow = true;
  pier.receiveShadow = true;
  group.add(pier);
  for (let i = 0; i < 5; i += 1) {
    solids.push({ x: SPOTS.marina.x, z: SPOTS.marina.z + 10 + i * 10, r: 4.5 });
  }

  // --- Billboards on tall posts at a few corners. ---
  const billboards = [
    { x: -150, z: -150, lines: ['SOLMAR', 'HEAT'], bg: '#b0503c', fg: '#ffe27a' },
    { x: 150, z: 150, lines: ['VISIT', 'SOLMAR BAY'], bg: '#1c3a5e', fg: '#ffffff' },
    { x: 150, z: -150, lines: ['BAY BANK'], bg: '#2b2b2b', fg: '#ffd23f' },
  ];
  const postMat = new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.8 });
  for (const bb of billboards) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 8), postMat);
    post.position.set(bb.x, 6, bb.z);
    post.castShadow = true;
    group.add(post);
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(16, 8, 0.6),
      new THREE.MeshStandardMaterial({ map: paintSign(bb.lines, bb.bg, bb.fg), roughness: 0.6 }),
    );
    face.position.set(bb.x, 14, bb.z);
    face.rotation.y = Math.PI / 4;
    face.castShadow = true;
    group.add(face);
    solids.push({ x: bb.x, z: bb.z, r: 1.2 });
  }

  // --- Palm trees along the beach, street lamps along the roads. ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: HUES.trunk, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: HUES.leaf, roughness: 1 });
  function palm(px, pz) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.4, 7.4, Math.sin(a) * 1.4);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(px, 0, pz);
    group.add(g);
    solids.push({ x: px, z: pz, r: 0.9 });
  }
  for (let x = -230; x <= 230; x += 28) {
    palm(x + rng.span(-4, 4), 252 + rng.span(-3, 3));
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: HUES.lamp, roughness: 0.8 });
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffe27a, emissiveIntensity: 0.7 });
  function lamp(px, pz) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6, 6), lampMat);
    pole.position.y = 3;
    pole.castShadow = true;
    g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.4), lampHeadMat);
    head.position.set(0.5, 6, 0);
    g.add(head);
    g.position.set(px, 0, pz);
    group.add(g);
    solids.push({ x: px, z: pz, r: 0.5 });
  }
  for (const line of GRID.lines) {
    for (const off of [-GRID.walk - 1.5, GRID.walk + 1.5]) {
      for (let t = -210; t <= 210; t += 60) {
        lamp(line + off, t);
        lamp(t, line + off);
      }
    }
  }

  // --- Crossings: the intersections traffic and pedestrians walk through. ---
  for (const lx of GRID.lines) {
    for (const lz of GRID.lines) {
      crossings.push({ x: lx, z: lz });
    }
  }

  /** Push a circle (x, z, r) out of every building collider and clamp it to the map. */
  function pushOut(x, z, r) {
    const bound = GRID.edge - r;
    x = Math.max(-bound, Math.min(bound, x));
    z = Math.max(-bound, Math.min(bound, z));
    for (const s of solids) {
      const dx = x - s.x;
      const dz = z - s.z;
      const dist = Math.hypot(dx, dz);
      const min = s.r + r;
      if (dist < min && dist > 0.0001) {
        x = s.x + (dx / dist) * min;
        z = s.z + (dz / dist) * min;
      }
    }
    return { x, z };
  }

  /** The street line nearest a point, as {axis, line}: axis 'x' is a vertical street. */
  function nearestLane(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const line of GRID.lines) {
      const dx = Math.abs(x - line);
      const dz = Math.abs(z - line);
      if (dx < bestD) {
        bestD = dx;
        best = { axis: 'x', line };
      }
      if (dz < bestD) {
        bestD = dz;
        best = { axis: 'z', line };
      }
    }
    return best;
  }

  /** A random crossing, with a little jitter. */
  function anyCrossing(s) {
    const c = s.pick(crossings);
    return { x: c.x + s.span(-4, 4), z: c.z + s.span(-4, 4) };
  }

  /** Animate the ocean: the water texture drifts slowly south. */
  function tick(dt) {
    seaTex.offset.y += dt * 0.015;
  }

  return { group, solids, crossings, pushOut, nearestLane, anyCrossing, tick };
}
