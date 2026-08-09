import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { createWindowTexture, WALL_PALETTE } from './materials.js';

function planeXZ(w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g;
}

function boxAt(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g;
}

function addMerged(parent, geoms, color, receiveShadow) {
  if (!geoms.length) return;
  const merged = mergeGeometries(geoms);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  for (const g of geoms) g.dispose();
}

function roadSegments(road, roads, half) {
  const cuts = roads.filter(r => r.axis !== road.axis)
    .map(c => [c.offset - c.width / 2, c.offset + c.width / 2])
    .sort((a, b) => a[0] - b[0]);
  const segs = [];
  let cur = -half;
  for (const [s, e] of cuts) { if (s > cur) segs.push([cur, s]); cur = Math.max(cur, e); }
  if (cur < half) segs.push([cur, half]);
  return segs.filter(([s, e]) => e - s > 0.5);
}

function buildGroundAndRoads(city) {
  const half = city.size / 2;
  const group = new THREE.Group();
  const ground = new THREE.Mesh(planeXZ(city.size + 120, city.size + 120, 0, 0, 0), new THREE.MeshStandardMaterial({ color: 0x5a5a55, roughness: 1 }));
  ground.receiveShadow = true; group.add(ground);

  const roadGeoms = [];
  for (const r of city.roads) roadGeoms.push(r.axis === 'x' ? planeXZ(city.size, r.width, 0, 0.02, r.offset) : planeXZ(r.width, city.size, r.offset, 0.03, 0));
  addMerged(group, roadGeoms, 0x45454b, true);

  const paveGeoms = [], parkGeoms = [], plazaGeoms = [];
  for (const r of city.roads) {
    for (const [s, e] of roadSegments(r, city.roads, half)) {
      const len = e - s, mid = (s + e) / 2;
      for (const sign of [-1, 1]) {
        const off = r.offset + sign * (r.width / 2 - CONFIG.sidewalkWidth / 2);
        paveGeoms.push(r.axis === 'x' ? boxAt(len, 0.12, CONFIG.sidewalkWidth, mid, 0.06, off) : boxAt(CONFIG.sidewalkWidth, 0.12, len, off, 0.06, mid));
      }
    }
  }
  for (const b of city.blocks) {
    const geom = boxAt(b.x1 - b.x0, 0.08, b.z1 - b.z0, (b.x0 + b.x1) / 2, 0.04, (b.z0 + b.z1) / 2);
    (b.kind === 'park' ? parkGeoms : b.kind === 'plaza' ? plazaGeoms : paveGeoms).push(geom);
  }
  addMerged(group, paveGeoms, 0xa8a79e, true);
  addMerged(group, parkGeoms, 0x5b8a4a, true);
  addMerged(group, plazaGeoms, 0x97968c, true);

  const lineGeoms = [];
  for (const r of city.roads) {
    if (!r.major) continue;
    for (const [s, e] of roadSegments(r, city.roads, half)) {
      for (let p = s + 2; p + 3 < e; p += 6) {
        lineGeoms.push(r.axis === 'x' ? planeXZ(3, 0.18, p + 1.5, 0.05, r.offset) : planeXZ(0.18, 3, r.offset, 0.05, p + 1.5));
      }
    }
  }
  addMerged(group, lineGeoms, 0xdedad0, false);
  return group;
}

function buildBuildings(city, rng) {
  const group = new THREE.Group();
  const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x55555a, roughness: 0.95 });
  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();

  for (let style = 0; style < 4; style++) {
    const list = city.buildings.filter(b => b.windowStyle === style);
    if (!list.length) continue;
    const wallMat = new THREE.MeshStandardMaterial({ map: createWindowTexture(style, rng), roughness: 0.85 });
    const mats = [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat];
    const im = new THREE.InstancedMesh(unit, mats, list.length);
    list.forEach((b, i) => {
      pos.set(b.x, 0, b.z); scale.set(b.width, b.height, b.depth);
      im.setMatrixAt(i, mat4.compose(pos, quat, scale));
      im.setColorAt(i, WALL_PALETTE[b.colorIndex % WALL_PALETTE.length]);
    });
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
    group.add(im);
  }

  const extras = city.buildings.filter(b => b.roof !== 'flat');
  if (extras.length) {
    const im = new THREE.InstancedMesh(unit, roofMat, extras.length);
    extras.forEach((b, i) => {
      if (b.roof === 'ledge') { pos.set(b.x, b.height - 0.15, b.z); scale.set(b.width + 0.6, 0.5, b.depth + 0.6); }
      else { pos.set(b.x, b.height, b.z); scale.set(Math.max(2, b.width * 0.3), 2 + rng() * 2.5, Math.max(2, b.depth * 0.3)); }
      im.setMatrixAt(i, mat4.compose(pos, quat, scale));
    });
    im.castShadow = true; im.frustumCulled = false; group.add(im);
  }
  return group;
}

function buildProps(city) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  const addInstanced = (geom, mat, items, castShadow) => {
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geom, mat, items.length);
    items.forEach((p, i) => { dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.rotation, 0); dummy.scale.setScalar(p.scale); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = castShadow; im.frustumCulled = false; group.add(im);
  };

  const lamps = city.props.filter(p => p.kind === 'lamp');
  const trees = city.props.filter(p => p.kind === 'tree');
  const benches = city.props.filter(p => p.kind === 'bench');

  const poleG = new THREE.CylinderGeometry(0.06, 0.09, 4.6, 6); poleG.translate(0, 2.3, 0);
  addInstanced(poleG, new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.4 }), lamps, true);
  const headG = new THREE.SphereGeometry(0.22, 8, 6); headG.translate(0, 4.7, 0);
  addInstanced(headG, new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffedb8, emissiveIntensity: 0.7 }), lamps, false);

  const trunkG = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6); trunkG.translate(0, 0.75, 0);
  addInstanced(trunkG, new THREE.MeshStandardMaterial({ color: 0x6b4f36, roughness: 1 }), trees, true);
  const foliageG = new THREE.IcosahedronGeometry(1.15, 0); foliageG.translate(0, 2.3, 0);
  addInstanced(foliageG, new THREE.MeshStandardMaterial({ color: 0x4d7a3c, roughness: 1, flatShading: true }), trees, true);

  const benchG = mergeGeometries([boxAt(1.8, 0.1, 0.55, 0, 0.45, 0), boxAt(1.8, 0.5, 0.08, 0, 0.75, -0.28), boxAt(0.08, 0.45, 0.5, -0.8, 0.22, 0), boxAt(0.08, 0.45, 0.5, 0.8, 0.22, 0)]);
  addInstanced(benchG, new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }), benches, true);

  return group;
}

function buildPerimeterHedge(size) {
  const half = size / 2 + 2;
  const geoms = [boxAt(size + 6, 1.2, 1.4, 0, 0.6, -half), boxAt(size + 6, 1.2, 1.4, 0, 0.6, half), boxAt(1.4, 1.2, size + 6, -half, 0.6, 0), boxAt(1.4, 1.2, size + 6, half, 0.6, 0)];
  const mesh = new THREE.Mesh(mergeGeometries(geoms), new THREE.MeshStandardMaterial({ color: 0x3f5f33, roughness: 1 }));
  mesh.castShadow = true; return mesh;
}

export function buildCity(city, rng) {
  const group = new THREE.Group();
  group.add(buildGroundAndRoads(city));
  group.add(buildBuildings(city, rng));
  group.add(buildProps(city));
  group.add(buildPerimeterHedge(city.size));
  return group;
}
