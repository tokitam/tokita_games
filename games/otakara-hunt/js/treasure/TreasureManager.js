import * as THREE from 'three';
import { subRng, randRange } from '../citygen/rng.js';

const CATCH_DIST   = 1.2;
const SPARKLE_DIST = 10;
const MIN_SEP      = 25;

class Treasure {
  constructor(x, z, isGolden) {
    this.x = x; this.z = z;
    this.isGolden = isGolden;
    this.found = false;
    this._particles = null;
  }
}

export class TreasureManager {
  constructor(scene, city, world, seed) {
    this._scene = scene;
    this._world = world;
    this._treasures = [];
    this._place(city, seed);
  }

  _place(city, seed) {
    const rng  = subRng(seed, 99);
    const half = city.size / 2 - 20;
    const total = 5;
    const placed = [];

    for (let i = 0; i < total; i++) {
      let x, z, tries = 0;
      do {
        x = randRange(rng, -half, half);
        z = randRange(rng, -half, half);
        tries++;
      } while (tries < 80 && (
        this._world.isInsideBuilding(x, z) ||
        placed.some(p => Math.hypot(p.x - x, p.z - z) < MIN_SEP)
      ));

      placed.push({ x, z });
      const t = new Treasure(x, z, i === total - 1);
      this._treasures.push(t);
      this._addSparkle(t);
    }
  }

  _addSparkle(t) {
    const N   = 28;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.08 + Math.random() * 0.55;
      pos[i * 3]     = t.x + Math.cos(a) * r;
      pos[i * 3 + 1] = 0.04 + Math.random() * 0.7;
      pos[i * 3 + 2] = t.z + Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: t.isGolden ? 0xffd700 : 0x88ddff,
      size: 0.13, transparent: true, opacity: 0, depthWrite: false,
    });
    t._particles = new THREE.Points(geo, mat);
    this._scene.add(t._particles);
  }

  _digEffect(x, z, golden) {
    const col = golden ? 0xffd700 : 0x66ccff;
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true })
    );
    gem.position.set(x, 0.25, z);
    this._scene.add(gem);

    const N = 18;
    const dPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      dPos[i * 3]     = x + Math.cos(a) * (0.1 + Math.random() * 0.45);
      dPos[i * 3 + 1] = Math.random() * 0.6;
      dPos[i * 3 + 2] = z + Math.sin(a) * (0.1 + Math.random() * 0.45);
    }
    const dust = new THREE.Points(
      Object.assign(new THREE.BufferGeometry(), { attributes: { position: new THREE.BufferAttribute(dPos, 3) } }),
      new THREE.PointsMaterial({ color: 0xbbaa88, size: 0.1, transparent: true })
    );
    this._scene.add(dust);

    let t = 0;
    const anim = () => {
      t += 1 / 60;
      gem.position.y = 0.25 + t * 2.5;
      gem.rotation.y += 0.12;
      gem.material.opacity = Math.max(0, 1 - t * 1.4);
      dust.material.opacity = Math.max(0, 1 - t * 2.2);
      if (t < 1.1) requestAnimationFrame(anim);
      else { this._scene.remove(gem); this._scene.remove(dust); }
    };
    anim();
  }

  update(dt, playerX, playerZ) {
    let nearestDist = Infinity;

    for (const t of this._treasures) {
      if (t.found) continue;
      const dx = t.x - playerX, dz = t.z - playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist < nearestDist) nearestDist = dist;

      if (t._particles) {
        t._particles.material.opacity = dist < SPARKLE_DIST
          ? (1 - dist / SPARKLE_DIST) * 0.9 : 0;
      }

      if (dist < CATCH_DIST) {
        t.found = true;
        if (t._particles) { this._scene.remove(t._particles); t._particles = null; }
        this._digEffect(t.x, t.z, t.isGolden);
        return { found: t };
      }
    }
    return { nearestDist };
  }

  get treasures()   { return this._treasures; }
  get total()       { return this._treasures.length; }
  get foundCount()  { return this._treasures.filter(t => t.found).length; }
  get remaining()   { return this.total - this.foundCount; }
}
