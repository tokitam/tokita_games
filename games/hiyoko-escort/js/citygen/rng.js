export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function subRng(seed, stage) {
  return mulberry32((seed ^ Math.imul(stage + 1, 0x9e3779b9)) >>> 0);
}

export const randRange = (rng, min, max) => min + rng() * (max - min);
export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const lerp = (a, b, t) => a + (b - a) * t;
