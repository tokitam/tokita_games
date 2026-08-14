import * as THREE from 'three';
import { getHeight } from '../terrain/TerrainBuilder.js';
import { CONFIG } from '../config.js';

function makeLCG(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 0x100000000; };
}

// Simple box-shaped animal mesh
function makeAnimalMesh(bodyColor, bodyW, bodyH, bodyD, headR) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), mat);
  body.position.y = bodyH / 2; body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 8, 6), mat);
  head.position.set(0, bodyH + headR * 0.6, bodyD * 0.4); head.castShadow = true;
  group.add(head);
  return group;
}

// Butterfly: 2 wing planes
function makeButterfly(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(0.4, 0.3);
  const wL = new THREE.Mesh(geo, mat); wL.position.x = -0.2; group.add(wL);
  const wR = new THREE.Mesh(geo, mat); wR.position.x =  0.2; group.add(wR);
  return { group, wL, wR };
}

class Animal {
  constructor(type, rng) {
    const half = CONFIG.worldSize / 2 * 0.85;
    const x = (rng() - 0.5) * half * 2;
    const z = (rng() - 0.5) * half * 2;
    this.pos = new THREE.Vector3(x, getHeight(x, z), z);
    this.vx = 0; this.vz = 0;
    this.state = 'wander';
    this.timer = rng() * 3;
    this.type = type;

    if (type === 'rabbit') {
      this.speed = 1.2; this.fleeSpeed = 4.5;
      this.fleeRadius = 4; this.safeRadius = 8;
      this.mesh = makeAnimalMesh(0xd4b896, 0.28, 0.22, 0.38, 0.13);
    } else {
      this.speed = 1.8; this.fleeSpeed = 5.5;
      this.fleeRadius = 3; this.safeRadius = 7;
      this.mesh = makeAnimalMesh(0x8b6914, 0.20, 0.18, 0.30, 0.11);
    }
    this.mesh.position.copy(this.pos);
  }

  update(dt, playerPos, rng) {
    const dx = this.pos.x - playerPos.x, dz = this.pos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (this.state === 'wander') {
      this.timer -= dt;
      if (this.timer <= 0) {
        const a = rng() * Math.PI * 2;
        this.vx = Math.cos(a) * this.speed;
        this.vz = Math.sin(a) * this.speed;
        this.timer = 2 + rng() * 4;
      }
      if (dist < this.fleeRadius) this.state = 'flee';
    }

    if (this.state === 'flee') {
      const len = Math.hypot(dx, dz);
      if (len > 1e-4) {
        this.vx = (dx / len) * this.fleeSpeed;
        this.vz = (dz / len) * this.fleeSpeed;
      }
      if (dist > this.safeRadius) { this.state = 'wander'; this.timer = 1 + rng() * 2; }
    }

    const nx = Math.max(-CONFIG.worldSize / 2 * 0.9, Math.min(CONFIG.worldSize / 2 * 0.9, this.pos.x + this.vx * dt));
    const nz = Math.max(-CONFIG.worldSize / 2 * 0.9, Math.min(CONFIG.worldSize / 2 * 0.9, this.pos.z + this.vz * dt));
    this.pos.set(nx, getHeight(nx, nz), nz);
    this.mesh.position.copy(this.pos);
    if (Math.hypot(this.vx, this.vz) > 0.1) {
      this.mesh.rotation.y = Math.atan2(this.vx, this.vz);
    }
  }
}

class Butterfly {
  constructor(rng) {
    const half = CONFIG.worldSize / 2 * 0.8;
    this.cx = (rng() - 0.5) * half * 2;
    this.cz = (rng() - 0.5) * half * 2;
    this.radius = 4 + rng() * 6;
    this.phase  = rng() * Math.PI * 2;
    this.t      = rng() * 10;
    const colors = [0xff88cc, 0xffcc44, 0x88ccff, 0xaaffaa];
    const bfly = makeButterfly(colors[Math.floor(rng() * colors.length)]);
    this.group = bfly.group;
    this.wL = bfly.wL;
    this.wR = bfly.wR;
  }

  update(dt) {
    this.t += dt;
    const x = this.cx + Math.cos(this.t * 0.5 + this.phase) * this.radius;
    const z = this.cz + Math.sin(this.t * 0.7 + this.phase) * this.radius;
    const y = getHeight(x, z) + 1.5 + Math.sin(this.t * 2.0) * 0.5;
    this.group.position.set(x, y, z);
    // Wing flap
    const flap = Math.sin(this.t * 8.0) * 0.7;
    this.wL.rotation.y =  flap;
    this.wR.rotation.y = -flap;
    this.group.rotation.y = Math.atan2(
      Math.cos(this.t * 0.5 + this.phase) * this.radius * 0.5,
      -Math.sin(this.t * 0.7 + this.phase) * this.radius * 0.7
    );
  }
}

export class AnimalManager {
  constructor(scene) {
    const N   = CONFIG.nature;
    const rng = makeLCG(0x12345678);
    this._rng = makeLCG(0x12345678); // matching rng for update randomness

    this.animals = [];
    for (let i = 0; i < N.rabbitCount;    i++) this.animals.push(new Animal('rabbit',   rng));
    for (let i = 0; i < N.squirrelCount;  i++) this.animals.push(new Animal('squirrel', rng));
    for (const a of this.animals) scene.add(a.mesh);

    this.butterflies = [];
    for (let i = 0; i < N.butterflyCount; i++) {
      const b = new Butterfly(rng);
      this.butterflies.push(b);
      scene.add(b.group);
    }
  }

  update(dt, playerPos) {
    for (const a of this.animals) a.update(dt, playerPos, this._rng);
    for (const b of this.butterflies) b.update(dt);
  }
}
