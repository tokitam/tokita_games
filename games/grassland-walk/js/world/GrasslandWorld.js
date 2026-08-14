const HALF = 256;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export class GrasslandWorld {
  constructor() {
    this._trees = []; // { x, z, r }
  }

  addTree(x, z, r) { this._trees.push({ x, z, r }); }

  resolveCircle(x, z, r) {
    // boundary
    x = clamp(x, -HALF + r, HALF - r);
    z = clamp(z, -HALF + r, HALF - r);
    // tree collisions
    for (const t of this._trees) {
      const dx = x - t.x, dz = z - t.z;
      const minD = r + t.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD * minD && d2 > 1e-12) {
        const d = Math.sqrt(d2);
        const push = (minD - d) / d;
        x += dx * push; z += dz * push;
      }
    }
    return { x, z };
  }

  // No building occlusion; returns null so camera never clips
  raycast() { return null; }
}
