// Shared helpers: a deterministic random stream and small math utilities.
// Every system that needs randomness takes its own branched stream, so a scene
// posed with the same seed plays out the same way every time.

/** Mulberry32 — a tiny fast seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A branched random source: next() in [0,1), range(), whole(), pick(), maybe(). */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(lo, hi) { return lo + next() * (hi - lo); },
    whole(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    maybe(p) { return next() < p; },
    branch() { return makeRng(Math.floor(next() * 0xffffffff)); },
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two ground points. */
export function gap(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** Format a dollar amount with thousands separators. */
export function dollars(n) {
  return `$${Math.floor(n).toLocaleString('en-US')}`;
}
