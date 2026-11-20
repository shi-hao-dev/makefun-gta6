// Shared helpers for Solmar Heat: a seeded dice stream and small math tools.
// Every system that needs randomness takes its own forked stream, so a scene
// posed with the same seed plays out the same way every run.

/** xorshift32 — a tiny fast seeded generator. */
export function xorshift(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return function roll() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * A dice bag: roll() in [0,1), between(), whole(), pick(), chance(), fork().
 * fork() hands out an independent stream so systems never share a sequence.
 */
export function makeDice(seed) {
  const roll = xorshift(seed);
  return {
    roll,
    between(lo, hi) { return lo + roll() * (hi - lo); },
    whole(lo, hi) { return lo + Math.floor(roll() * (hi - lo + 1)); },
    pick(list) { return list[Math.floor(roll() * list.length)]; },
    chance(p) { return roll() < p; },
    fork() { return makeDice(Math.floor(roll() * 0xffffffff)); },
  };
}

/** Clamp a value into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Shortest signed turn from angle b to angle a, in (-PI, PI]. */
export function turnDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Flat distance between two ground points. */
export function dist2(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** Format a dollar amount with thousands separators. */
export function cash(n) {
  return `$${Math.floor(n).toLocaleString('en-US')}`;
}
