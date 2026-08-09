const FishDefs = [
  { name: 'コアジ',   emoji: '🐟', color: [0.4, 0.8, 0.9], rate: 50, score: 10 },
  { name: 'マダイ',   emoji: '🎏', color: [1.0, 0.5, 0.6], rate: 30, score: 30 },
  { name: 'キンギョ', emoji: '🐠', color: [1.0, 0.8, 0.1], rate: 15, score: 50 },
  { name: 'ニジマス', emoji: '🌈', color: [0.5, 0.9, 0.7], rate:  5, score: 100 },
];

function drawFish(def) {
  const scene = window._fishScene;
  if (!scene) return null;

  const root = new BABYLON.TransformNode(`fish_root_${Math.random()}`, scene);

  const bodyMat = new BABYLON.StandardMaterial('fishMat_' + def.name + Math.random(), scene);
  bodyMat.diffuseColor = new BABYLON.Color3(...def.color);
  bodyMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

  const body = BABYLON.MeshBuilder.CreateSphere('fishBody', { diameterX: 0.9, diameterY: 0.45, diameterZ: 0.45, segments: 6 }, scene);
  body.parent = root;
  body.material = bodyMat;

  const tail = BABYLON.MeshBuilder.CreateCylinder('fishTail', {
    diameterTop: 0,
    diameterBottom: 0.4,
    height: 0.4,
    tessellation: 4
  }, scene);
  tail.parent = root;
  tail.position.x = -0.55;
  tail.rotation.z = Math.PI / 2;
  tail.material = bodyMat;

  // 目（DynamicTexture）
  const eyeTex = new BABYLON.DynamicTexture('eyeTex', { width: 32, height: 32 }, scene, false);
  const ctx2d = eyeTex.getContext();
  ctx2d.fillStyle = '#fff';
  ctx2d.beginPath();
  ctx2d.arc(16, 16, 12, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.fillStyle = '#000';
  ctx2d.beginPath();
  ctx2d.arc(18, 16, 6, 0, Math.PI * 2);
  ctx2d.fill();
  eyeTex.update();
  const eyeMat = new BABYLON.StandardMaterial('eyeMat' + Math.random(), scene);
  eyeMat.diffuseTexture = eyeTex;
  eyeMat.emissiveColor = new BABYLON.Color3(1, 1, 1);

  const eye = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 0.14, segments: 4 }, scene);
  eye.parent = root;
  eye.position.set(0.3, 0.1, 0.2);
  eye.material = eyeMat;

  // ニジマスは追加カラー
  if (def.name === 'ニジマス') {
    const stripeMat = new BABYLON.StandardMaterial('stripe' + Math.random(), scene);
    stripeMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.8);
    stripeMat.alpha = 0.6;
    const stripe = BABYLON.MeshBuilder.CreateSphere('stripe', { diameterX: 0.85, diameterY: 0.42, diameterZ: 0.42, segments: 4 }, scene);
    stripe.parent = root;
    stripe.material = stripeMat;
  }

  return root;
}

function lotteryFish() {
  const total = FishDefs.reduce((s, d) => s + d.rate, 0);
  let r = Math.random() * total;
  for (const d of FishDefs) {
    r -= d.rate;
    if (r <= 0) return d;
  }
  return FishDefs[0];
}
