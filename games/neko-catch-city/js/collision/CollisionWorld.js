const CELL = 16;
const KEY_STRIDE = 4096;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function propRadius(p) {
  if (p.kind === 'lamp') return 0.25;
  if (p.kind === 'tree') return 0.3;
  return 0;
}

function rayBoxT(o, d, b, maxDist) {
  let tmin = 0, tmax = maxDist;
  const axes = [
    [o.x, d.x, b.minX, b.maxX],
    [o.y, d.y, 0, b.height],
    [o.z, d.z, b.minZ, b.maxZ],
  ];
  for (const [ov, dv, lo, hi] of axes) {
    if (Math.abs(dv) < 1e-9) { if (ov < lo || ov > hi) return null; continue; }
    let t1 = (lo - ov) / dv, t2 = (hi - ov) / dv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin > 1e-6 ? tmin : null;
}

export class CollisionWorld {
  constructor(city) {
    this._cells = new Map();
    this._half = city.size / 2;
    for (const b of city.buildings) {
      this._addBox({ minX: b.x - b.width / 2, maxX: b.x + b.width / 2, minZ: b.z - b.depth / 2, maxZ: b.z + b.depth / 2, height: b.height });
    }
    for (const p of city.props) {
      const r = propRadius(p);
      if (r > 0) this._addCircle({ x: p.x, z: p.z, r: r * p.scale });
    }
  }

  _ci(v) { return Math.floor((v + this._half) / CELL); }

  _cell(ix, iz, create) {
    const key = ix * KEY_STRIDE + iz;
    let cell = this._cells.get(key);
    if (!cell && create) { cell = { boxes: [], circles: [] }; this._cells.set(key, cell); }
    return cell;
  }

  _addBox(box) {
    for (let ix = this._ci(box.minX); ix <= this._ci(box.maxX); ix++)
      for (let iz = this._ci(box.minZ); iz <= this._ci(box.maxZ); iz++)
        this._cell(ix, iz, true).boxes.push(box);
  }

  _addCircle(c) {
    for (let ix = this._ci(c.x - c.r); ix <= this._ci(c.x + c.r); ix++)
      for (let iz = this._ci(c.z - c.r); iz <= this._ci(c.z + c.r); iz++)
        this._cell(ix, iz, true).circles.push(c);
  }

  _cellsIn(minX, minZ, maxX, maxZ) {
    const out = [];
    for (let ix = this._ci(minX); ix <= this._ci(maxX); ix++)
      for (let iz = this._ci(minZ); iz <= this._ci(maxZ); iz++) {
        const cell = this._cell(ix, iz, false);
        if (cell) out.push(cell);
      }
    return out;
  }

  resolveCircle(x, z, r) {
    x = clamp(x, -this._half + r, this._half - r);
    z = clamp(z, -this._half + r, this._half - r);
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const cell of this._cellsIn(x - r, z - r, x + r, z + r)) {
        for (const b of cell.boxes) {
          const px = clamp(x, b.minX, b.maxX), pz = clamp(z, b.minZ, b.maxZ);
          const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
          if (d2 > 1e-12) {
            if (d2 < r * r) { const d = Math.sqrt(d2), push = (r - d) / d; x += dx * push; z += dz * push; moved = true; }
          } else {
            const m = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
            if (m === x - b.minX) x = b.minX - r;
            else if (m === b.maxX - x) x = b.maxX + r;
            else if (m === z - b.minZ) z = b.minZ - r;
            else z = b.maxZ + r;
            moved = true;
          }
        }
        for (const c of cell.circles) {
          const dx = x - c.x, dz = z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2);
            if (d < 1e-6) x += rr; else { const push = (rr - d) / d; x += dx * push; z += dz * push; }
            moved = true;
          }
        }
      }
      x = clamp(x, -this._half + r, this._half - r);
      z = clamp(z, -this._half + r, this._half - r);
      if (!moved) break;
    }
    return { x, z };
  }

  raycast(origin, dir, maxDist) {
    const ex = origin.x + dir.x * maxDist, ez = origin.z + dir.z * maxDist;
    let best = null;
    const seen = new Set();
    for (const cell of this._cellsIn(Math.min(origin.x, ex), Math.min(origin.z, ez), Math.max(origin.x, ex), Math.max(origin.z, ez))) {
      for (const b of cell.boxes) {
        if (seen.has(b)) continue; seen.add(b);
        const t = rayBoxT(origin, dir, b, maxDist);
        if (t !== null && (best === null || t < best)) best = t;
      }
    }
    return best;
  }

  // Check if a point (x, z) is inside any building
  isInsideBuilding(x, z) {
    for (const cell of this._cellsIn(x - 0.1, z - 0.1, x + 0.1, z + 0.1)) {
      for (const b of cell.boxes) {
        if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
      }
    }
    return false;
  }
}
