import * as THREE from 'three';
import { Chick } from './Chick.js';
import { subRng, randRange } from '../citygen/rng.js';

const TOTAL         = 8;
const JOIN_DIST     = 1.5;
const DELIVER_DIST  = 3.0;
const NEST_Y_HEIGHT = 0.8;
const MIN_SEP       = 18;
const BREADCRUMB_STEP = 0.3;
const CRUMB_PER_CHICK = 2;   // steps behind per slot in queue
const DROP_CHANCE_PER_SEC = 0.12;

const BONUS = [0, 1.0, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 2.0]; // index = count (0 unused)

export class ChickManager {
  constructor(scene, city, world, seed) {
    this._scene = scene;
    this._world = world;
    this._chicks = [];
    this._delivered = 0;
    this._score = 0;
    this._crumbs = []; // ring buffer of {x,z} positions
    this._crumbDist = 0; // accumulated distance since last crumb
    this._lastCrumbX = city.spawn.x;
    this._lastCrumbZ = city.spawn.z;
    this._dropAccum = 0; // accumulated time for drop lottery

    this._nestX = 0; this._nestZ = 0;
    this._buildNest(city);
    this._spawnChicks(city, world, seed);
  }

  _buildNest(city) {
    // Place nest near city center (0,0) or slightly offset
    this._nestX = 0; this._nestZ = 0;

    // Glowing ring on ground
    const ringGeo = new THREE.RingGeometry(1.8, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(this._nestX, 0.03, this._nestZ);
    this._scene.add(ring);
    this._nestRing = ring;
    this._ringPulse = 0;

    // Light pillar (translucent cylinder)
    const pillarGeo = new THREE.CylinderGeometry(0.5, 1.5, 8, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(this._nestX, 4, this._nestZ);
    this._scene.add(pillar);

    // Point light
    const light = new THREE.PointLight(0xffff88, 2, 18);
    light.position.set(this._nestX, 2, this._nestZ);
    this._scene.add(light);
    this._nestLight = light;
  }

  _spawnChicks(city, world, seed) {
    const rng  = subRng(seed, 42);
    const half = city.size / 2 - 15;
    const placed = [];
    for (let i = 0; i < TOTAL; i++) {
      let x, z, tries = 0;
      do {
        x = randRange(rng, -half, half);
        z = randRange(rng, -half, half);
        tries++;
      } while (tries < 80 && (
        world.isInsideBuilding(x, z) ||
        placed.some(p => Math.hypot(p.x - x, p.z - z) < MIN_SEP) ||
        Math.hypot(x, z) < 10
      ));
      placed.push({ x, z });
      this._chicks.push(new Chick(x, z, this._scene));
    }
  }

  _addCrumb(playerX, playerZ) {
    const dx = playerX - this._lastCrumbX;
    const dz = playerZ - this._lastCrumbZ;
    const d  = Math.hypot(dx, dz);
    this._crumbDist += d;
    this._lastCrumbX = playerX; this._lastCrumbZ = playerZ;
    if (this._crumbDist >= BREADCRUMB_STEP) {
      this._crumbDist -= BREADCRUMB_STEP;
      this._crumbs.push({ x: playerX, z: playerZ });
      if (this._crumbs.length > TOTAL * CRUMB_PER_CHICK + 8) {
        this._crumbs.shift();
      }
    }
  }

  update(dt, playerX, playerZ, isRunning) {
    this._addCrumb(playerX, playerZ);
    this._ringPulse = (this._ringPulse + dt * 2) % (Math.PI * 2);
    this._nestRing.material.opacity = 0.5 + 0.25 * Math.sin(this._ringPulse);
    this._nestLight.intensity = 1.5 + 0.7 * Math.sin(this._ringPulse);

    const following = this._chicks.filter(c => c.state === 'following');

    // Drop lottery (running only, once per second accumulated)
    let droppedChick = null;
    if (isRunning && following.length > 0) {
      this._dropAccum += dt;
      if (this._dropAccum >= 1.0) {
        this._dropAccum -= 1.0;
        for (const chick of following) {
          if (Math.random() < DROP_CHANCE_PER_SEC) {
            chick.drop();
            droppedChick = chick;
            break; // at most one drop per second
          }
        }
      }
    } else {
      this._dropAccum = 0;
    }

    // Update positions via breadcrumbs
    const followingNow = this._chicks.filter(c => c.state === 'following');
    followingNow.forEach((chick, idx) => {
      const stepsBack = (idx + 1) * CRUMB_PER_CHICK;
      const crumbIdx  = this._crumbs.length - 1 - stepsBack;
      if (crumbIdx >= 0) {
        const crumb = this._crumbs[crumbIdx];
        chick.update(dt, crumb.x, crumb.z);
      } else {
        chick.update(dt, playerX, playerZ);
      }
    });

    // Update lost/dropped chicks in place
    for (const chick of this._chicks) {
      if (chick.state === 'lost') chick.update(dt, chick.x, chick.z);
    }

    // Join check (lost chicks near player)
    let joined = null;
    for (const chick of this._chicks) {
      if (chick.state !== 'lost') continue;
      const d = Math.hypot(chick.position.x - playerX, chick.position.z - playerZ);
      if (d < JOIN_DIST) { chick.join(); joined = chick; break; }
    }

    // Deliver check (player near nest)
    let delivered = null;
    const distNest = Math.hypot(playerX - this._nestX, playerZ - this._nestZ);
    if (distNest < DELIVER_DIST && followingNow.length > 0) {
      const count = followingNow.length;
      const bonus = BONUS[Math.min(count, BONUS.length - 1)];
      const pts   = Math.round(count * 100 * bonus);
      this._score += pts;
      this._delivered += count;
      for (const chick of followingNow) chick.deliver(this._scene);
      delivered = { count, pts, bonus };
    }

    return {
      joined,
      delivered,
      droppedChick,
      followingCount: this._chicks.filter(c => c.state === 'following').length,
      deliveredCount: this._delivered,
      remaining: TOTAL - this._delivered,
      score: this._score,
      allDone: this._delivered >= TOTAL,
    };
  }

  get chicks()     { return this._chicks; }
  get delivered()  { return this._delivered; }
  get score()      { return this._score; }
  get total()      { return TOTAL; }
  get nestX()      { return this._nestX; }
  get nestZ()      { return this._nestZ; }

  dispose() {
    for (const c of this._chicks) c.dispose(this._scene);
  }
}
