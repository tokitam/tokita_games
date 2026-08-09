import * as THREE from 'three';
import { Robot } from './Robot.js';
import { subRng, randRange } from '../citygen/rng.js';

const INITIAL_COUNT   = 2;
const MAX_ROBOTS      = 8;
const ADD_INTERVAL    = 45;   // seconds between additions
const SPEED_UP_INTERVAL = 30; // seconds between speed boosts
const SPEED_UP_RATE   = 0.02; // +2% per interval
const BASE_SPEED      = 2.2;  // world units / sec (between walk and run)
const CATCH_DIST      = 0.8;
const SPAWN_MIN_DIST  = 30;

export class RobotManager {
  constructor(scene, city, world, seed) {
    this._scene  = scene;
    this._world  = world;
    this._city   = city;
    this._robots = [];
    this._speed  = BASE_SPEED;
    this._elapsed      = 0;
    this._nextAddTime  = ADD_INTERVAL;
    this._nextSpeedTime = SPEED_UP_INTERVAL;
    this._spawnRng = subRng(seed, 77);

    const spawnX = city.spawn.x, spawnZ = city.spawn.z;
    for (let i = 0; i < INITIAL_COUNT; i++) {
      this._spawnRobot(spawnX, spawnZ);
    }
  }

  _spawnRobot(awayFromX, awayFromZ) {
    const half = this._city.size / 2 - 8;
    let x, z, tries = 0;
    do {
      x = randRange(this._spawnRng, -half, half);
      z = randRange(this._spawnRng, -half, half);
      tries++;
    } while (tries < 80 && (
      this._world.isInsideBuilding(x, z) ||
      Math.hypot(x - awayFromX, z - awayFromZ) < SPAWN_MIN_DIST
    ));

    const r = new Robot(x, z, this._scene);
    this._robots.push(r);
    return r;
  }

  _spawnEffect(x, z) {
    const N = 14;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      pos[i * 3]     = x + Math.cos(a) * (0.2 + Math.random() * 0.8);
      pos[i * 3 + 1] = Math.random() * 0.8;
      pos[i * 3 + 2] = z + Math.sin(a) * (0.2 + Math.random() * 0.8);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xbbaa88, size: 0.12, transparent: true });
    const pts = new THREE.Points(geo, mat);
    this._scene.add(pts);
    let t = 0;
    const anim = () => {
      t += 1 / 60;
      mat.opacity = Math.max(0, 1 - t * 2);
      if (t < 0.8) requestAnimationFrame(anim);
      else this._scene.remove(pts);
    };
    anim();
  }

  update(dt, playerX, playerZ) {
    this._elapsed += dt;

    if (this._robots.length < MAX_ROBOTS && this._elapsed >= this._nextAddTime) {
      this._nextAddTime += ADD_INTERVAL;
      const r = this._spawnRobot(playerX, playerZ);
      this._spawnEffect(r.position.x, r.position.z);
    }

    if (this._elapsed >= this._nextSpeedTime) {
      this._nextSpeedTime += SPEED_UP_INTERVAL;
      this._speed *= (1 + SPEED_UP_RATE);
    }

    let nearestDist = Infinity;
    for (const r of this._robots) {
      r.update(dt, playerX, playerZ, this._world, this._speed);
      const d = Math.hypot(r.position.x - playerX, r.position.z - playerZ);
      if (d < nearestDist) nearestDist = d;
      if (d < CATCH_DIST) return { caught: true, nearestDist };
    }
    return { caught: false, nearestDist };
  }

  get count() { return this._robots.length; }

  dispose() {
    for (const r of this._robots) r.dispose(this._scene);
    this._robots = [];
  }
}
