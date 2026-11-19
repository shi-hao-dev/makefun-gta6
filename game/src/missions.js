// Missions: Lena's four-job story arc, plus the cash stashes hidden around the city. Each
// mission is a short chain of steps with a target and a radius; a floating beacon marks the
// target in the world and the HUD points at it. Finishing a mission pays out and saves.

import { MISSIONS, STASH_COUNT, STASH_REWARD } from './config.js';
import { PLACES } from './world.js';

const THREE = window.THREE;

const STASH_SPOTS = [
  { x: -180, z: -60 }, { x: 120, z: -180 }, { x: -60, z: 120 }, { x: 180, z: 60 },
  { x: 60, z: -120 }, { x: -120, z: -120 }, { x: 120, z: 120 }, { x: -200, z: 210 },
];

// Mission targets sit on the street side of a landmark, never inside its walls:
// a target at a building's centre is unreachable — the collider pushes the player
// out past the step's radius (the garage is 26x18 with a 9m radius; the bank
// 30x20 with a 9m radius). The sign face is the -z side, so the front is z -
// (half-depth + 4).
function frontOf(place, halfDepth) {
  return { x: place.x, z: place.z - halfDepth - 4 };
}

function missionSteps(index) {
  if (index === 0) {
    return [
      { id: 'steal', text: 'Steal the red Comet on Marina Blvd', target: { x: PLACES.missionCar.x, z: PLACES.missionCar.z }, radius: 5, needCar: true },
      { id: 'garage', text: "Drive to Lena's Garage", target: frontOf(PLACES.garage, 9), radius: 9, needCar: true },
    ];
  }
  if (index === 1) {
    return [
      { id: 'pickup', text: 'Pick up the package at the Marina Pier', target: { x: PLACES.marina.x, z: PLACES.marina.z }, radius: 7, needCar: false },
      { id: 'deliver', text: 'Deliver it to the Starfish Motel', target: frontOf(PLACES.motel, 7), radius: 9, needCar: false },
    ];
  }
  if (index === 2) {
    return [
      { id: 'lose', text: 'Lose the heat — get your wanted level to zero', target: null, radius: 0, needCar: false },
    ];
  }
  return [
    { id: 'bank', text: 'Get to the Bay Bank', target: frontOf(PLACES.bank, 10), radius: 9, needCar: false },
    { id: 'grab', text: 'Grab the cash — hold the vault marker', target: { x: PLACES.bank.x, z: PLACES.bank.z - 12 }, radius: 6, needCar: false, hold: 3 },
    { id: 'escape', text: 'Lose the cops — reach the Safehouse', target: frontOf(PLACES.safehouse, 6), radius: 9, needCar: false },
  ];
}

export class MissionManager {
  constructor(scene, rng) {
    this.scene = scene;
    this.index = 0;
    this.stepIndex = 0;
    this.done = false;
    this.cash = 0;
    this.holdTimer = 0;
    this.onMissionStart = null;
    this.onMissionDone = null;
    this.onStoryDone = null;
    // The beacon: a glowing marker column at the current target.
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.35, depthWrite: false });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.85, depthWrite: false });
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 42, 12, 1, true), beamMat);
    beam.position.y = 21;
    this.beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.2, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    this.beacon.add(ring);
    this.beacon.visible = false;
    scene.add(this.beacon);
    // Cash stashes: small green-glowing cases.
    this.stashes = [];
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x1f7a44, emissive: 0x2fd06a, emissiveIntensity: 0.9, roughness: 0.4 });
    for (let i = 0; i < STASH_COUNT; i += 1) {
      const spot = STASH_SPOTS[i];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), caseMat);
      mesh.position.set(spot.x, 0.5, spot.z);
      mesh.castShadow = true;
      scene.add(mesh);
      this.stashes.push({ x: spot.x, z: spot.z, taken: false, mesh });
    }
  }

  get mission() {
    return MISSIONS[this.index];
  }

  get currentStep() {
    return missionSteps(this.index)[this.stepIndex];
  }

  get objectiveText() {
    if (this.done) return 'Story complete — free roam. Find stashes, steal cars, dodge the law.';
    return `${this.mission.title}: ${this.currentStep.text}`;
  }

  get target() {
    if (this.done) return null;
    return this.currentStep.target;
  }

  startMission(index) {
    this.index = index;
    this.stepIndex = 0;
    this.holdTimer = 0;
    if (index === 2 && this.onMissionStart) this.onMissionStart('heat');
    if (index === 3 && this.onMissionStart) this.onMissionStart('score');
    this.syncBeacon();
  }

  syncBeacon() {
    const t = this.target;
    if (t) {
      this.beacon.visible = true;
      this.beacon.position.set(t.x, 0, t.z);
    } else {
      this.beacon.visible = false;
    }
  }

  /** Advance the story. `ctx` is {player, wanted}. Returns 'mission' | 'story' | null. */
  step(dt, ctx, time) {
    // Beacon pulse.
    if (this.beacon.visible) {
      const s = 1 + Math.sin(time * 4) * 0.12;
      this.beacon.scale.set(s, 1, s);
      this.beacon.rotation.y += dt * 0.8;
    }
    // Stash pickups.
    for (const stash of this.stashes) {
      if (stash.taken) continue;
      const d = Math.hypot(ctx.player.x - stash.x, ctx.player.z - stash.z);
      if (d < 3.2) {
        stash.taken = true;
        stash.mesh.visible = false;
        this.cash += STASH_REWARD;
        if (this.onMissionDone) this.onMissionDone('stash', STASH_REWARD);
      }
      stash.mesh.rotation.y += dt * 0.7;
    }
    if (this.done) return null;
    const step = this.currentStep;
    const player = ctx.player;
    if (step.id === 'lose') {
      if (ctx.wanted.stars === 0) return this.completeMission();
      return null;
    }
    if (step.needCar && !player.inCar) return null;
    const d = Math.hypot(player.x - step.target.x, player.z - step.target.z);
    if (d > step.radius) {
      this.holdTimer = 0;
      return null;
    }
    if (step.hold) {
      this.holdTimer += dt;
      if (this.holdTimer < step.hold) return null;
    }
    if (step.id === 'pickup' && this.index === 1) {
      ctx.wanted.setStars(2);
      if (this.onMissionStart) this.onMissionStart('hot');
    }
    if (step.id === 'grab') {
      ctx.wanted.setStars(4);
    }
    this.stepIndex += 1;
    this.holdTimer = 0;
    if (this.stepIndex >= missionSteps(this.index).length) return this.completeMission();
    this.syncBeacon();
    return null;
  }

  completeMission() {
    const reward = this.mission.reward;
    this.cash += reward;
    const finished = this.mission;
    if (this.index >= MISSIONS.length - 1) {
      this.done = true;
      this.beacon.visible = false;
      if (this.onStoryDone) this.onStoryDone();
      return 'story';
    }
    this.index += 1;
    this.stepIndex = 0;
    this.syncBeacon();
    if (this.onMissionDone) this.onMissionDone('mission', reward, finished.title);
    return 'mission';
  }

  distanceToTarget(player) {
    const t = this.target;
    if (!t) return null;
    return Math.hypot(player.x - t.x, player.z - t.z);
  }

  saveState() {
    return {
      index: this.index,
      stepIndex: this.stepIndex,
      done: this.done,
      cash: this.cash,
      stashes: this.stashes.map((s) => s.taken),
    };
  }

  loadState(saved) {
    if (!saved) return;
    this.index = Math.min(saved.index || 0, MISSIONS.length - 1);
    this.stepIndex = saved.stepIndex || 0;
    this.done = !!saved.done;
    this.cash = saved.cash || 0;
    if (Array.isArray(saved.stashes)) {
      for (let i = 0; i < saved.stashes.length && i < this.stashes.length; i += 1) {
        if (saved.stashes[i]) {
          this.stashes[i].taken = true;
          this.stashes[i].mesh.visible = false;
        }
      }
    }
    this.syncBeacon();
  }
}
