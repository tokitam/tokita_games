import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getHeight } from '../terrain/TerrainBuilder.js';

// Seeded LCG for deterministic placement
function makeLCG(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 0x100000000; };
}

function placeInstances(geo, mat, count, rng, minH, scale, world) {
  const half = CONFIG.worldSize / 2;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * CONFIG.worldSize * 0.9;
    const z = (rng() - 0.5) * CONFIG.worldSize * 0.9;
    const y = getHeight(x, z);
    const sc = typeof scale === 'function' ? scale(rng) : scale;
    dummy.position.set(x, y + minH, z);
    dummy.scale.setScalar(sc);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function buildNature(scene, world) {
  const N = CONFIG.nature;
  const rng = makeLCG(0xdeadbeef);

  // ---- Big trees ----
  const trunkGeo  = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 8);
  const leafGeo   = new THREE.ConeGeometry(1.5, 2.4, 8);
  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const leafMat   = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
  const leaf2Mat  = new THREE.MeshLambertMaterial({ color: 0x3a7a3a });
  const leaf3Mat  = new THREE.MeshLambertMaterial({ color: 0x4a9a4a });

  const treePositions = [];
  const bigRng = makeLCG(0xdeadbeef); // same seed, replicate for collision

  function addTree(count, scaleMin, scaleMax, trunkR, rngSrc) {
    for (let i = 0; i < count; i++) {
      const x = (rngSrc() - 0.5) * CONFIG.worldSize * 0.9;
      const z = (rngSrc() - 0.5) * CONFIG.worldSize * 0.9;
      const sc = scaleMin + rngSrc() * (scaleMax - scaleMin);
      rngSrc(); // rotation consumed
      const y = getHeight(x, z);

      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.scale.setScalar(sc);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.2; trunk.castShadow = true;
      group.add(trunk);

      // 3-tier cone canopy
      [[0, 3.8, leafMat], [0.5, 2.6, leaf2Mat], [1.0, 1.5, leaf3Mat]].forEach(([oy, cx, m]) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(cx, 2.2, 8), m);
        cone.position.y = 2.6 + oy * 1.2; cone.castShadow = true;
        group.add(cone);
      });

      scene.add(group);
      treePositions.push({ x, z, r: trunkR * sc });
      world.addTree(x, z, trunkR * sc);
    }
  }

  const bigRng2 = makeLCG(0xdeadbeef);
  addTree(N.bigTreeCount,   1.6, 2.4, 0.6, bigRng2);
  addTree(N.smallTreeCount, 0.6, 1.2, 0.4, bigRng2);

  // ---- Grass (cross billboard) ----
  const grassGeo = new THREE.PlaneGeometry(0.7, 0.9);
  const crossGeo = (() => {
    const g = new THREE.BufferGeometry();
    const p = grassGeo.getAttribute('position');
    // Two planes crossed at 90°
    const pos = [], uv = [], idx = [];
    for (let angle of [0, Math.PI / 2]) {
      const base = pos.length / 3;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        pos.push(Math.cos(angle) * x, y, Math.sin(angle) * x);
        uv.push(grassGeo.getAttribute('uv').getX(i), grassGeo.getAttribute('uv').getY(i));
      }
      const fi = grassGeo.getIndex();
      for (let i = 0; i < fi.count; i++) idx.push(fi.getX(i) + base);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const grassMat = new THREE.MeshBasicMaterial({ color: 0x6bb84a, side: THREE.DoubleSide, alphaTest: 0.1 });
  const grassMesh = placeInstances(crossGeo, grassMat, N.grassCount, makeLCG(0xaabbcc), 0, r => 0.6 + r() * 0.6, world);
  scene.add(grassMesh);

  // ---- Flowers ----
  const flowerColors = [0xe84040, 0xf5cc30, 0xffffff];
  const stemMat   = new THREE.MeshLambertMaterial({ color: 0x5a8a3a });
  const stemGeo   = new THREE.CylinderGeometry(0.02, 0.03, 0.35, 5);
  const petalGeo  = new THREE.SphereGeometry(0.12, 5, 4);
  flowerColors.forEach((col, ci) => {
    const pMat = new THREE.MeshLambertMaterial({ color: col });
    const count = Math.floor(N.flowerCount / 3);
    const fRng = makeLCG(0xff00ff + ci * 137);
    for (let i = 0; i < count; i++) {
      const x = (fRng() - 0.5) * CONFIG.worldSize * 0.9;
      const z = (fRng() - 0.5) * CONFIG.worldSize * 0.9;
      const y = getHeight(x, z);
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.175; g.add(stem);
      const petal = new THREE.Mesh(petalGeo, pMat);
      petal.position.y = 0.38; g.add(petal);
      scene.add(g);
    }
  });
}
