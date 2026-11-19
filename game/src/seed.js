// Seeded randomness for Solmar Bay. One mulberry32 stream per job, so a seed always
// rebuilds the same city, the same traffic and the same crowd. Nothing here touches
// Math.random, which keeps every layout reproducible from the seed in the URL.

export function makeSeed(value) {
  let s = value >>> 0;
  function draw() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** Uniform float in [0, 1). */
    draw,
    /** Uniform float in [lo, hi). */
    span(lo, hi) {
      return lo + (hi - lo) * draw();
    },
    /** Uniform integer in [lo, hi]. */
    whole(lo, hi) {
      return lo + Math.floor(draw() * (hi - lo + 1));
    },
    /** One element of an array, uniformly. */
    pick(list) {
      return list[Math.floor(draw() * list.length)];
    },
    /** True with probability p. */
    maybe(p) {
      return draw() < p;
    },
    /** A fresh stream derived from this one. */
    branch() {
      return makeSeed(Math.floor(draw() * 4294967296));
    },
  };
}
