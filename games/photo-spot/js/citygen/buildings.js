import { CONFIG } from '../config.js';
import { lerp, randInt, randRange } from './rng.js';
import { subdivideLots } from './blocks.js';

export function generateBuildings(blocks, citySize, rng) {
  const half = citySize / 2;
  const out = [];
  for (const block of blocks) {
    if (block.kind !== 'buildings') continue;
    for (const lot of subdivideLots(block, rng)) {
      const lotW = lot.x1 - lot.x0;
      const lotD = lot.z1 - lot.z0;
      let margin = randRange(rng, 0.5, 2);
      margin = Math.max(0.3, Math.min(margin, (Math.min(lotW, lotD) - 5) / 2));
      const width = lotW - margin * 2;
      const depth = lotD - margin * 2;
      if (width < 4 || depth < 4) continue;
      const x = (lot.x0 + lot.x1) / 2;
      const z = (lot.z0 + lot.z1) / 2;
      const t = Math.min(1, Math.hypot(x, z) / half);
      const h = lerp(
        randRange(rng, CONFIG.heightCenter[0], CONFIG.heightCenter[1]),
        randRange(rng, CONFIG.heightEdge[0], CONFIG.heightEdge[1]),
        t,
      );
      const floors = Math.max(2, Math.round(h / CONFIG.floorHeight));
      const height = floors * CONFIG.floorHeight;
      const roofRoll = rng();
      const roof = roofRoll < 0.5 ? 'flat' : roofRoll < 0.8 ? 'ledge' : 'tower';
      out.push({
        x, z, width, depth, height,
        colorIndex: randInt(rng, 0, CONFIG.wallColorCount - 1),
        windowStyle: height >= 24 ? randInt(rng, 2, 3) : randInt(rng, 0, 1),
        roof,
      });
    }
  }
  return out;
}
