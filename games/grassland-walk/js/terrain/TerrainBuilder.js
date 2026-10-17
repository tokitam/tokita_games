import * as THREE from 'three';

export function getHeight(x, z) {
  return (
    Math.sin(x * 0.030) * Math.cos(z * 0.025) * 10.0 +
    Math.sin(x * 0.080 + 1.7) * Math.cos(z * 0.070) * 4.0 +
    Math.sin(x * 0.220 + 3.1) * Math.cos(z * 0.190) * 1.2
  );
}

export function buildTerrain(scene) {
  const SIZE = 512, SEGS = 128;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: 0x5a8a3c });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);
  return mesh;
}
