// The story: Lena Cruz's four jobs, chained in order, plus the hidden cash stashes.
// Each job is a list of steps; a step is a small goal (go somewhere, steal a car, grab
// something, hold a spot, lose the heat). The beacon in the world marks the current goal.

import { JOBS, STASHES, STASH_PAY } from './tune.js';
import { SPOTS } from './bay.js';

const STASH_SPOTS = [
  { x: -205, z: 205 },
  { x: 205, z: 205 },
  { x: -205, z: -205 },
  { x: 205, z: -205 },
  { x: 5, z: 235 },
  { x: -85, z: -35 },
  { x: 155, z: 85 },
  { x: -145, z: -85 },
];

/** The step lists, one per job. `setHeat` is applied when the step becomes active. */
function stepList(i) {
  if (i === 0) {
    return [
      { kind: 'goto', label: 'Go to the red Comet', target: SPOTS.missionCar, radius: 6 },
      { kind: 'take', label: 'Steal the Comet', target: SPOTS.missionCar, radius: 6 },
      { kind: 'goto', label: "Bring the Comet to Lena's garage", target: SPOTS.garage, radius: 24, inMissionCar: true },
    ];
  }
  if (i === 1) {
    return [
      { kind: 'goto', label: 'Drive to the marina pier', target: SPOTS.marina, radius: 18 },
      { kind: 'grab', label: 'Grab the package on foot', target: SPOTS.marina, radius: 8, setHeat: 1 },
      { kind: 'goto', label: 'Deliver the package to the Starfish Motel', target: SPOTS.motel, radius: 24 },
    ];
  }
  if (i === 2) {
    return [
      { kind: 'clear', label: 'Lose the heat — get to 0 stars', target: null, radius: 0, setHeat: 3 },
    ];
  }
  return [
    { kind: 'goto', label: 'Get to the Bay Bank', target: SPOTS.bank, radius: 24 },
    { kind: 'hold', label: 'Grab the cash — stay at the bank', target: SPOTS.bank, radius: 24, holdSecs: 8, setHeat: 4 },
    { kind: 'goto', label: 'Escape to the safehouse', target: SPOTS.safehouse, radius: 24 },
  ];
}

export class Story {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;
    this.stepIdx = 0;
    this.done = false;
    this.cash = 0;
    this.hold = 0;
    this.missionCar = null;
    this.onStart = null; // (job) => void
    this.onDone = null; // (job, pay) => void
    this.onStory = null; // () => void, all jobs done
    this.onHeat = null; // (n) => void
    this.onStash = null; // (pay) => void
    // The beacon: a glowing column and a pulsing ring on the ground.
    this.beacon = new THREE.Group();
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 34, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    col.position.y = 17;
    this.beacon.add(col);
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.22, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.9 }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.25;
    this.beacon.add(this.ring);
    this.beacon.visible = false;
    scene.add(this.beacon);
    // Cash stashes: small green glowing crates.
    this.stashes = [];
    for (const s of STASH_SPOTS.slice(0, STASHES)) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.8, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x37c978, emissive: 0x37c978, emissiveIntensity: 0.45, roughness: 0.5 }),
      );
      crate.position.set(s.x, 0.4, s.z);
      crate.castShadow = true;
      scene.add(crate);
      this.stashes.push({ x: s.x, z: s.z, mesh: crate, taken: false });
    }
  }

  get job() {
    return JOBS[this.index];
  }

  get step() {
    return stepList(this.index)[this.stepIdx];
  }

  get steps() {
    return stepList(this.index);
  }

  get target() {
    return this.step && this.step.target ? this.step.target : null;
  }

  get brief() {
    if (this.done) return 'Story complete — Solmar is yours.';
    return `${this.job.title}: ${this.step ? this.step.label : ''}`;
  }

  start(i) {
    this.index = i;
    this.stepIdx = 0;
    this.hold = 0;
    this.beginStep();
    if (this.onStart) this.onStart(this.job);
  }

  beginStep() {
    const s = this.step;
    if (!s) return;
    if (s.setHeat !== undefined && this.onHeat) this.onHeat(s.setHeat);
    this.syncBeacon();
  }

  syncBeacon() {
    const t = this.target;
    if (!t) {
      this.beacon.visible = false;
      return;
    }
    this.beacon.visible = true;
    this.beacon.position.set(t.x, 0, t.z);
  }

  /** Distance from the hero to the current goal, or null when there is none. */
  gap(hero) {
    const t = this.target;
    if (!t) return null;
    return Math.hypot(hero.x - t.x, hero.z - t.z);
  }

  advance() {
    this.stepIdx += 1;
    this.hold = 0;
    if (this.stepIdx >= this.steps.length) {
      const pay = this.job.pay;
      this.cash += pay;
      const finished = this.job;
      if (this.onDone) this.onDone(finished, pay);
      if (this.index + 1 >= JOBS.length) {
        this.done = true;
        this.beacon.visible = false;
        if (this.onStory) this.onStory();
      } else {
        this.start(this.index + 1);
      }
      return;
    }
    this.beginStep();
  }

  /** One tick. `ctx` is {hero, heat, sparks, audio}. */
  tick(dt, ctx, time) {
    // Beacon pulse.
    if (this.beacon.visible) {
      const pulse = 1 + Math.sin(time * 3) * 0.18;
      this.ring.scale.set(pulse, pulse, 1);
    }
    // Stashes: walk or drive over one to collect it.
    for (const s of this.stashes) {
      if (s.taken) continue;
      const d = Math.hypot(ctx.hero.x - s.x, ctx.hero.z - s.z);
      if (d < 2.6) {
        s.taken = true;
        s.mesh.visible = false;
        this.cash += STASH_PAY;
        if (ctx.audio) ctx.audio.pickup();
        if (ctx.sparks) ctx.sparks.puff({ x: s.x, y: 1, z: s.z }, 0x37c978, 14, 4, 0.7);
        if (this.onStash) this.onStash(STASH_PAY);
      }
    }
    if (this.done) return;
    const s = this.step;
    if (!s) return;
    const hero = ctx.hero;
    if (s.kind === 'goto') {
      const d = Math.hypot(hero.x - s.target.x, hero.z - s.target.z);
      if (d < s.radius) {
        if (s.inMissionCar && !(hero.inAuto && hero.auto === this.missionCar)) return;
        this.advance();
      }
    } else if (s.kind === 'take') {
      if (hero.inAuto && hero.auto === this.missionCar) this.advance();
    } else if (s.kind === 'grab') {
      if (!hero.inAuto) {
        const d = Math.hypot(hero.x - s.target.x, hero.z - s.target.z);
        if (d < s.radius) this.advance();
      }
    } else if (s.kind === 'hold') {
      const d = Math.hypot(hero.x - s.target.x, hero.z - s.target.z);
      if (d < s.radius) {
        this.hold += dt;
        if (this.hold >= s.holdSecs) this.advance();
      } else {
        this.hold = Math.max(0, this.hold - dt * 2);
      }
    } else if (s.kind === 'clear') {
      if (ctx.heat.stars === 0) this.advance();
    }
  }

  save() {
    return {
      index: this.index,
      stepIdx: this.stepIdx,
      cash: this.cash,
      done: this.done,
      stashes: this.stashes.map((s) => s.taken),
    };
  }

  load(saved) {
    if (!saved) return;
    this.index = saved.index || 0;
    this.stepIdx = saved.stepIdx || 0;
    this.cash = saved.cash || 0;
    this.done = !!saved.done;
    if (Array.isArray(saved.stashes)) {
      saved.stashes.forEach((taken, i) => {
        if (taken && this.stashes[i]) {
          this.stashes[i].taken = true;
          this.stashes[i].mesh.visible = false;
        }
      });
    }
    if (!this.done) this.beginStep();
    else this.beacon.visible = false;
  }
}
