import { CONFIG } from '../config.js';

export function generateBlocks(roads, rng) {
  const vs = roads.filter(r => r.axis === 'z');
  const hs = roads.filter(r => r.axis === 'x');
  const blocks = [];
  for (let i = 0; i + 1 < vs.length; i++) {
    for (let j = 0; j + 1 < hs.length; j++) {
      const x0 = vs[i].offset + vs[i].width / 2;
      const x1 = vs[i + 1].offset - vs[i + 1].width / 2;
      const z0 = hs[j].offset + hs[j].width / 2;
      const z1 = hs[j + 1].offset - hs[j + 1].width / 2;
      if (x1 - x0 < 4 || z1 - z0 < 4) continue;
      const minDim = Math.min(x1 - x0, z1 - z0);
      let kind = 'buildings';
      if (minDim < CONFIG.plazaMinDim) kind = 'plaza';
      else if (rng() < CONFIG.parkChance) kind = 'park';
      blocks.push({ x0, z0, x1, z1, kind });
    }
  }
  return blocks;
}

export function subdivideLots(block, rng) {
  const out = [];
  const rec = (r) => {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const long = Math.max(w, d);
    if (long <= CONFIG.lotMax || (long <= CONFIG.lotMax * 2 && rng() < 0.1)) {
      out.push(r);
      return;
    }
    const frac = 0.5 + (rng() - 0.5) * 0.4;
    if (w >= d) {
      const sx = Math.min(Math.max(r.x0 + w * frac, r.x0 + CONFIG.lotMin), r.x1 - CONFIG.lotMin);
      rec({ ...r, x1: sx });
      rec({ ...r, x0: sx });
    } else {
      const sz = Math.min(Math.max(r.z0 + d * frac, r.z0 + CONFIG.lotMin), r.z1 - CONFIG.lotMin);
      rec({ ...r, z1: sz });
      rec({ ...r, z0: sz });
    }
  };
  rec(block);
  return out;
}
