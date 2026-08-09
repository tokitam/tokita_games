import * as THREE from 'three';
import { subRng, randRange } from '../citygen/rng.js';

const MIN_SEP  = 40;
const MARGIN   = 30;

export const LANDMARK_DEFS = [
  { id: 'clock',   label: '時計台',   emoji: '🕰',  minDist: 15, maxDist: 40 },
  { id: 'wheel',   label: '観覧車',   emoji: '🎡',  minDist: 20, maxDist: 55 },
  { id: 'fountain',label: '噴水',     emoji: '⛲',  minDist: 8,  maxDist: 30 },
  { id: 'tree',    label: '大きな木', emoji: '🌳',  minDist: 10, maxDist: 35 },
  { id: 'tower',   label: '赤い鉄塔', emoji: '🗼',  minDist: 25, maxDist: 60 },
];

function buildClock(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Tower shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.1, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.5 })
  );
  shaft.position.y = 6;
  g.add(shaft);

  // Clock face
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.4 })
    );
    face.position.set(Math.sin(angle) * 0.92, 11, Math.cos(angle) * 0.92);
    face.rotation.y = -angle;
    g.add(face);
  }

  // Top dome
  const dome = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x4477aa, roughness: 0.4 })
  );
  dome.position.y = 13.25;
  g.add(dome);

  // Point for targeting (center at mid height)
  return { root: g, x, z, targetY: 11, height: 15 };
}

function buildWheel(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Support legs
  for (const sx of [-3, 3]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 })
    );
    leg.position.set(sx, 4, 0);
    leg.rotation.z = sx > 0 ? -0.2 : 0.2;
    g.add(leg);
  }

  // Rim
  const rimGeo = new THREE.TorusGeometry(5, 0.18, 8, 40);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.5, roughness: 0.4 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 13;
  g.add(rim);

  // Gondolas via InstancedMesh
  const gondolaMat = new THREE.MeshStandardMaterial({ color: 0xffdd66 });
  const N = 12;
  const gondolaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.6, 0.3), gondolaMat, N);
  gondolaMesh.position.y = 13;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0);
    dummy.rotation.z = a;
    dummy.updateMatrix();
    gondolaMesh.setMatrixAt(i, dummy.matrix);
  }
  g.add(gondolaMesh);

  return { root: g, x, z, targetY: 13, height: 18, rimMesh: rim, gondolaMesh, N };
}

function buildFountain(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Basin
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.8, 0.5, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x99bbdd, roughness: 0.3, side: THREE.DoubleSide })
  );
  basin.position.y = 0.25;
  g.add(basin);

  // Water surface
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 20),
    new THREE.MeshStandardMaterial({ color: 0x4499cc, roughness: 0.1, transparent: true, opacity: 0.7 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.4;
  g.add(water);

  // Central pillar
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3 })
  );
  pillar.position.y = 1.5;
  g.add(pillar);

  // Spray sphere (translucent blue)
  const spray = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 })
  );
  spray.position.y = 3.2;
  g.add(spray);

  return { root: g, x, z, targetY: 2, height: 4 };
}

function buildTree(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 })
  );
  trunk.position.y = 2;
  g.add(trunk);

  // Foliage balls
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.7 });
  const balls = [[0, 8, 0, 3.5], [0, 11, 0, 2.5], [-1.5, 7, 0.5, 2], [1.2, 6.5, -0.8, 1.8]];
  for (const [bx, by, bz, r] of balls) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), leafMat);
    b.position.set(bx, by, bz);
    g.add(b);
  }

  return { root: g, x, z, targetY: 8, height: 13 };
}

function buildTower(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.4, metalness: 0.3 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });

  // Main tapered shaft in segments
  for (let i = 0; i < 5; i++) {
    const bot = 1.5 - i * 0.28, top = bot - 0.28;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(top * 0.9, 0.1), bot, 5, 6),
      i % 2 === 0 ? redMat : whiteMat
    );
    seg.position.y = i * 5 + 2.5;
    g.add(seg);
  }

  // Antenna
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 4, 4),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  ant.position.y = 29;
  g.add(ant);

  // Red beacon at top
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 })
  );
  beacon.position.y = 31;
  g.add(beacon);

  return { root: g, x, z, targetY: 15, height: 31 };
}

const BUILDERS = [buildClock, buildWheel, buildFountain, buildTree, buildTower];

export class Landmarks {
  constructor(scene, city, world, seed) {
    this._scene = scene;
    this._list  = [];
    this._wheelData = null;
    this._spawn(city, world, seed);
  }

  _spawn(city, world, seed) {
    const rng  = subRng(seed, 11);
    const half = city.size / 2 - MARGIN;
    const placed = [];

    for (let i = 0; i < LANDMARK_DEFS.length; i++) {
      let x, z, tries = 0;
      do {
        x = randRange(rng, -half, half);
        z = randRange(rng, -half, half);
        tries++;
      } while (tries < 100 && (
        world.isInsideBuilding(x, z) ||
        placed.some(p => Math.hypot(p.x - x, p.z - z) < MIN_SEP)
      ));
      placed.push({ x, z });

      const data = BUILDERS[i](x, z);
      data.def   = LANDMARK_DEFS[i];
      data.stars = 0;
      this._list.push(data);
      this._scene.add(data.root);
      if (i === 1) this._wheelData = data;
    }
  }

  update(dt) {
    if (this._wheelData) {
      this._wheelData.root.rotation.y += dt * 0.3;
    }
  }

  get list() { return this._list; }

  dispose() {
    for (const d of this._list) this._scene.remove(d.root);
  }
}
