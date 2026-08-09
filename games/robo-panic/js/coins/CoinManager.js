import * as THREE from 'three';
import { subRng, randRange } from '../citygen/rng.js';

const COIN_COUNT  = 30;
const CATCH_DIST  = 0.8;
const COIN_VALUE  = 10;
const MIN_SEP     = 5;

export class CoinManager {
  constructor(scene, city, world) {
    this._scene  = scene;
    this._city   = city;
    this._world  = world;
    this._score  = 0;
    this._wave   = 1;
    this._rng    = subRng(Math.floor(Math.random() * 0xffffffff), 55);

    this._dummy  = new THREE.Object3D();
    const geo    = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16);
    const mat    = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.25, metalness: 0.8, emissive: 0xffaa00, emissiveIntensity: 0.3 });
    this._mesh   = new THREE.InstancedMesh(geo, mat, COIN_COUNT);
    this._mesh.castShadow = true;
    this._scene.add(this._mesh);

    this._coins  = [];
    this._spawnCoins();
  }

  _spawnCoins() {
    const half = this._city.size / 2 - 10;
    this._coins = [];
    for (let i = 0; i < COIN_COUNT; i++) {
      let x, z, tries = 0;
      do {
        x = randRange(this._rng, -half, half);
        z = randRange(this._rng, -half, half);
        tries++;
      } while (tries < 80 && (
        this._world.isInsideBuilding(x, z) ||
        this._coins.some(c => Math.hypot(c.x - x, c.z - z) < MIN_SEP)
      ));
      this._coins.push({ x, z, collected: false });
    }
    this._updateInstances();
  }

  _updateInstances() {
    let idx = 0;
    for (const c of this._coins) {
      if (!c.collected) {
        this._dummy.position.set(c.x, 0.35, c.z);
        this._dummy.updateMatrix();
        this._mesh.setMatrixAt(idx, this._dummy.matrix);
        c._idx = idx++;
      }
    }
    // hide leftover slots
    const hideMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = idx; i < COIN_COUNT; i++) {
      this._mesh.setMatrixAt(i, hideMat);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt, playerX, playerZ) {
    // spin all coins
    for (const c of this._coins) {
      if (c.collected || c._idx == null) continue;
      this._mesh.getMatrixAt(c._idx, this._dummy.matrix);
      const pos  = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const sc   = new THREE.Vector3();
      this._dummy.matrix.decompose(pos, quat, sc);
      const extra = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, dt * 2.5, 0));
      quat.multiply(extra);
      this._dummy.matrix.compose(pos, quat, sc);
      this._mesh.setMatrixAt(c._idx, this._dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;

    let coinGot = null;
    for (const c of this._coins) {
      if (c.collected) continue;
      const d = Math.hypot(c.x - playerX, c.z - playerZ);
      if (d < CATCH_DIST) {
        c.collected = true;
        const hideMat = new THREE.Matrix4().makeScale(0, 0, 0);
        this._mesh.setMatrixAt(c._idx, hideMat);
        this._mesh.instanceMatrix.needsUpdate = true;
        this._score += COIN_VALUE;
        coinGot = c;
        break;
      }
    }

    const remaining = this._coins.filter(c => !c.collected).length;
    if (remaining === 0) {
      this._wave++;
      this._spawnCoins();
      return { coinGot, wave: this._wave };
    }

    return { coinGot, remaining };
  }

  get score()     { return this._score; }
  get wave()      { return this._wave; }
  get remaining() { return this._coins.filter(c => !c.collected).length; }

  dispose() {
    this._scene.remove(this._mesh);
  }
}
