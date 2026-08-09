import { randInt, randRange } from './rng.js';

export function generateProps(roads, blocks, citySize, rng) {
  const half = citySize / 2;
  const props = [];

  for (const road of roads) {
    const crossings = roads.filter(r => r.axis !== road.axis);
    const step = road.major ? 25 : 15;
    const sideOffset = road.width / 2 - 1;
    let flip = false;

    for (let s = -half + 10; s <= half - 10; s += step) {
      if (crossings.some(c => Math.abs(s - c.offset) < c.width / 2 + 1.5)) continue;
      const skip = !road.major && rng() >= 0.6;
      const off = flip ? sideOffset : -sideOffset;
      flip = !flip;
      if (skip) continue;
      const [x, z] = road.axis === 'x' ? [s, road.offset + off] : [road.offset + off, s];
      props.push(
        road.major
          ? { kind: 'lamp', x, z, rotation: 0, scale: 1 }
          : { kind: 'tree', x, z, rotation: rng() * Math.PI * 2, scale: randRange(rng, 0.85, 1.25) },
      );
    }
  }

  for (const block of blocks) {
    if (block.kind === 'buildings') continue;
    const w = block.x1 - block.x0;
    const d = block.z1 - block.z0;
    const inset = 1.5;
    if (w < inset * 2 + 1 || d < inset * 2 + 1) continue;
    const treeCount = block.kind === 'park' ? Math.max(3, Math.floor((w * d) / 60)) : randInt(rng, 1, 3);
    for (let i = 0; i < treeCount; i++) {
      props.push({ kind: 'tree', x: randRange(rng, block.x0 + inset, block.x1 - inset), z: randRange(rng, block.z0 + inset, block.z1 - inset), rotation: rng() * Math.PI * 2, scale: randRange(rng, 0.8, 1.4) });
    }
    const benchCount = randInt(rng, 1, 3);
    for (let i = 0; i < benchCount; i++) {
      props.push({ kind: 'bench', x: randRange(rng, block.x0 + inset, block.x1 - inset), z: randRange(rng, block.z0 + inset, block.z1 - inset), rotation: (randInt(rng, 0, 3) * Math.PI) / 2, scale: 1 });
    }
  }
  return props;
}
