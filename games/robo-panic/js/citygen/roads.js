import { CONFIG } from '../config.js';
import { randInt, randRange } from './rng.js';

function lineOffsets(rng) {
  const half = CONFIG.citySize / 2;
  const offsets = [-half];
  let cur = -half;
  for (;;) {
    cur += randRange(rng, CONFIG.blockMin, CONFIG.blockMax);
    if (cur > half - CONFIG.blockMin) { offsets.push(half); break; }
    offsets.push(cur);
  }
  return offsets;
}

function chooseMajors(rng, count) {
  const majors = new Set();
  let i = randInt(rng, 1, 2);
  while (i < count - 1) { majors.add(i); i += randInt(rng, 3, 4); }
  return majors;
}

export function generateRoads(rng) {
  const roads = [];
  for (const axis of ['x', 'z']) {
    const offsets = lineOffsets(rng);
    const majors = chooseMajors(rng, offsets.length);
    offsets.forEach((offset, i) => {
      const major = majors.has(i);
      roads.push({ axis, offset, width: major ? CONFIG.majorRoadWidth : CONFIG.minorRoadWidth, major });
    });
  }
  return roads;
}
