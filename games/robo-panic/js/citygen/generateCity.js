import { subRng } from './rng.js';
import { generateRoads } from './roads.js';
import { generateBlocks } from './blocks.js';
import { generateBuildings } from './buildings.js';
import { generateProps } from './props.js';

function chooseSpawn(roads) {
  const nearest = rs => rs.reduce((a, b) => (Math.abs(b.offset) < Math.abs(a.offset) ? b : a));
  const pickAxis = axis => {
    const majors = roads.filter(r => r.axis === axis && r.major);
    return nearest(majors.length ? majors : roads.filter(r => r.axis === axis));
  };
  const rx = pickAxis('x');
  const rz = pickAxis('z');
  return { x: rz.offset, z: rx.offset, heading: Math.PI / 2 };
}

export function generateCity(seed) {
  const roads = generateRoads(subRng(seed, 1));
  const blocks = generateBlocks(roads, subRng(seed, 2));
  const buildings = generateBuildings(blocks, 256, subRng(seed, 3));
  const props = generateProps(roads, blocks, 256, subRng(seed, 4));
  const spawn = chooseSpawn(roads);
  return { seed, size: 256, roads, blocks, buildings, props, spawn };
}
