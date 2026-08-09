import { Cat } from './Cat.js';
import { subRng, randRange } from '../citygen/rng.js';
import { CONFIG } from '../config.js';

const COLOR_KEYS = ['white', 'black', 'tora', 'mike', 'gray', 'cream'];

export class CatManager {
  constructor(scene, city, collisionWorld, seed) {
    this._scene = scene;
    this._cats = [];
    this._world = collisionWorld;
    this._place(city, seed);
  }

  _place(city, seed) {
    const rng = subRng(seed, 50);
    const half = city.size / 2 - 5;
    const total = CONFIG.catCount + CONFIG.goldenCatCount;

    for (let i = 0; i < total; i++) {
      let x, z, tries = 0;
      do {
        x = randRange(rng, -half, half);
        z = randRange(rng, -half, half);
        tries++;
      } while (this._world.isInsideBuilding(x, z) && tries < 30);

      const isGolden = i === total - 1;
      const colorKey = COLOR_KEYS[i % COLOR_KEYS.length];
      // 通常猫は index に応じて速度を線形補間（最初が最も遅い）
      const t = CONFIG.catCount > 1 ? i / (CONFIG.catCount - 1) : 1;
      const fleeSpeed = isGolden
        ? CONFIG.goldenFleeSpeed
        : CONFIG.catFleeSpeedMin + (CONFIG.catFleeSpeed - CONFIG.catFleeSpeedMin) * t;
      const cat = new Cat(x, z, isGolden, colorKey, fleeSpeed);
      this._cats.push(cat);
      this._scene.add(cat.root);
    }
  }

  get cats() { return this._cats; }

  get total() { return this._cats.length; }
  get caught() { return this._cats.filter(c => c.state === 'caught').length; }
  get remaining() { return this.total - this.caught; }

  update(dt, playerX, playerZ) {
    const toRemove = [];
    for (const cat of this._cats) {
      if (cat.state !== 'caught') {
        cat.update(dt, playerX, playerZ, this._world);

        // Catch check
        const dx = cat.root.position.x - playerX;
        const dz = cat.root.position.z - playerZ;
        if (Math.hypot(dx, dz) < CONFIG.catCatchDist) {
          cat.catch();
          toRemove.push(cat);
          return { caught: cat };
        }
      } else {
        const done = cat.updateCatch(dt);
        if (done) {
          this._scene.remove(cat.root);
          toRemove.push(cat);
        }
      }
    }
    // Don't remove from active list until fully faded - just mark them
    return null;
  }
}
