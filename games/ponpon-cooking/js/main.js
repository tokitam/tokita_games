// ぽんぽんクッキング main.js — BabylonJS シーン・入力・UI連携

let engine, scene;
let panMesh = null;
let fallingMeshes = new Map(); // item → mesh
let sceneReady = false;

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);

  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.08, 0.04, 0.0, 1);

  // カメラ（正面固定、ほぼ2D構図）
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.5, 16, new BABYLON.Vector3(0, 0, 0), scene);
  cam.inputs.clear();

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  const spot = new BABYLON.PointLight('spot', new BABYLON.Vector3(0, 8, -2), scene);
  spot.intensity = 0.6;

  buildKitchen();
  buildPan();
  setupInput();

  let prev = performance.now();
  scene.registerBeforeRender(() => {
    if (!CookingGame.isOver()) {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      CookingGame.update(dt);
    }
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
}

function buildKitchen() {
  // 背景壁
  const wallMat = new BABYLON.StandardMaterial('wall', scene);
  wallMat.diffuseColor = new BABYLON.Color3(0.55, 0.35, 0.2);
  const wall = BABYLON.MeshBuilder.CreateBox('wall', { width: 16, height: 14, depth: 0.3 }, scene);
  wall.position.set(0, 0, 2);
  wall.material = wallMat;

  // タイル（床）
  const tileMat = new BABYLON.StandardMaterial('tile', scene);
  tileMat.diffuseColor = new BABYLON.Color3(0.8, 0.75, 0.7);
  const tile = BABYLON.MeshBuilder.CreateBox('tile', { width: 16, height: 0.2, depth: 8 }, scene);
  tile.position.set(0, -3, -1);
  tile.material = tileMat;

  // コンロ
  const conroMat = new BABYLON.StandardMaterial('conro', scene);
  conroMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.3);
  const conro = BABYLON.MeshBuilder.CreateBox('conro', { width: 5, height: 0.5, depth: 2.5 }, scene);
  conro.position.set(0, -2.4, -0.5);
  conro.material = conroMat;

  // コンロの火口（発光）
  const fireMat = new BABYLON.StandardMaterial('fire', scene);
  fireMat.emissiveColor = new BABYLON.Color3(0.9, 0.4, 0);
  const fire = BABYLON.MeshBuilder.CreateCylinder('fire', { diameter: 1.2, height: 0.08, tessellation: 12 }, scene);
  fire.position.set(0, -2.17, -0.5);
  fire.material = fireMat;
}

function buildPan() {
  const mat = new BABYLON.StandardMaterial('pan', scene);
  mat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.2);
  mat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);

  panMesh = new BABYLON.TransformNode('panRoot', scene);

  // フライパン本体（浅い皿状）
  const body = BABYLON.MeshBuilder.CreateCylinder('panBody', {
    diameterTop: 3.6,
    diameterBottom: 3.2,
    height: 0.25,
    tessellation: 24
  }, scene);
  body.parent = panMesh;
  body.material = mat;

  // フライパンの柄
  const handleMat = new BABYLON.StandardMaterial('handle', scene);
  handleMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
  const handle = BABYLON.MeshBuilder.CreateCylinder('handle', { diameter: 0.3, height: 2.2, tessellation: 8 }, scene);
  handle.parent = panMesh;
  handle.rotation.z = Math.PI / 2;
  handle.position.x = -2.6;
  handle.material = handleMat;

  panMesh.position.set(0, -2, 0);
}

function spawnFoodMesh(item) {
  const def = item.def;
  const mat = new BABYLON.StandardMaterial(`food_${item.key}_${Math.random()}`, scene);
  mat.diffuseColor = new BABYLON.Color3(...def.color);
  if (def.bad) mat.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0);

  // 食材のシェイプ
  let mesh;
  if (item.key === 'egg') {
    mesh = BABYLON.MeshBuilder.CreateSphere('egg', { diameterX: 0.6, diameterY: 0.7, diameterZ: 0.6, segments: 6 }, scene);
  } else if (item.key === 'rice') {
    mesh = BABYLON.MeshBuilder.CreateBox('rice', { width: 0.65, height: 0.55, depth: 0.65 }, scene);
  } else if (item.key === 'shrimp') {
    mesh = BABYLON.MeshBuilder.CreateCylinder('shrimp', { diameterTop: 0.2, diameterBottom: 0.45, height: 0.65, tessellation: 6 }, scene);
    mesh.rotation.x = 0.5;
  } else if (item.key === 'negi') {
    mesh = BABYLON.MeshBuilder.CreateCylinder('negi', { diameter: 0.3, height: 0.8, tessellation: 6 }, scene);
  } else if (item.key === 'carrot') {
    mesh = BABYLON.MeshBuilder.CreateCylinder('carrot', { diameterTop: 0.1, diameterBottom: 0.45, height: 0.7, tessellation: 8 }, scene);
  } else if (item.key === 'fly') {
    mesh = BABYLON.MeshBuilder.CreateSphere('fly', { diameter: 0.35, segments: 4 }, scene);
  } else {
    mesh = BABYLON.MeshBuilder.CreateBox('burnt', { width: 0.6, height: 0.2, depth: 0.6 }, scene);
  }

  mesh.material = mat;
  mesh.position.set(item.x, item.y, 0);

  // テキストビルボード（emoji）
  const plane = BABYLON.MeshBuilder.CreatePlane('label', { width: 0.8, height: 0.8 }, scene);
  plane.parent = mesh;
  plane.position.y = 0.5;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const tex = new BABYLON.DynamicTexture('emojiTex', { width: 64, height: 64 }, scene, false);
  const ctx = tex.getContext();
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.emoji, 32, 46);
  tex.update();
  const planeMat = new BABYLON.StandardMaterial('planeMat', scene);
  planeMat.diffuseTexture = tex;
  planeMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  planeMat.opacityTexture = tex;
  plane.material = planeMat;

  fallingMeshes.set(item, mesh);
}

// 入力
let psx = 0, psy = 0, dragging = false;
let startPanX = 0;

function setupInput() {
  const canvas = document.getElementById('renderCanvas');

  canvas.addEventListener('pointerdown', e => {
    psx = e.clientX;
    psy = e.clientY;
    dragging = false;
    startPanX = CookingGame.getPanX();
  });

  canvas.addEventListener('pointermove', e => {
    const dx = e.clientX - psx;
    if (Math.abs(dx) > 8) {
      dragging = true;
      const newX = Math.max(-3, Math.min(3, startPanX + dx * 0.012));
      CookingGame.setPanX(newX);
      panMesh.position.x = newX;
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (dragging) return;
    const dy = psy - e.clientY;
    const dx = e.clientX - psx;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dy > 50 && dist > 50) {
      // 上フリック = 捨てる
      CookingGame.throwItem();
    } else if (dist < 15) {
      // タップ = 炒める
      CookingGame.stir();
    }
  });
}

// ゲーム起動
function startGame() {
  const best = parseInt(localStorage.getItem('ponpon-cooking.highscore') || '0');
  document.getElementById('best').textContent = best;

  CookingGame.init({
    onSpawn(item) {
      spawnFoodMesh(item);
    },
    onUpdate(falling) {
      falling.forEach(fi => {
        const mesh = fallingMeshes.get(fi);
        if (mesh) mesh.position.y = fi.y;
      });
    },
    onItemDrop(fi, caught) {
      const mesh = fallingMeshes.get(fi);
      if (mesh) { mesh.dispose(); fallingMeshes.delete(fi); }
    },
    onCatch(fi, panContents) {
      showPopup(fi.def.emoji + ' GET！', '#ffdd55', 800);
    },
    onComplete(recipe, pts, consecutive) {
      showPopup(`${recipe.emoji} かんせい！ +${pts}`, '#55ff88', 1200);
    },
    onFail(msg) {
      showPopup('😱 ' + msg, '#ff5555', 1200);
    },
    onFeverStart() {
      document.getElementById('fever-bar').classList.remove('hidden');
      showPopup('🔥 フィーバー！', '#ff8800', 1500);
    },
    onFeverTick(ratio) {
      document.getElementById('fever-fill').style.width = `${ratio * 100}%`;
    },
    onFeverEnd() {
      document.getElementById('fever-bar').classList.add('hidden');
    },
    onEnd(score) {
      setTimeout(() => showResult(score), 800);
    }
  });
}

function showPopup(text, color, duration) {
  const el = document.getElementById('popup');
  el.textContent = text;
  el.style.color = color || '#fff';
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), duration || 1000);
}

function showResult(score) {
  const prev = parseInt(localStorage.getItem('ponpon-cooking.highscore') || '0');
  const best = Math.max(score, prev);
  localStorage.setItem('ponpon-cooking.highscore', best);
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-best').textContent = best;
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-result').classList.remove('hidden');
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('title-best').textContent =
    localStorage.getItem('ponpon-cooking.highscore') || '0';

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    initScene();
    startGame();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    fallingMeshes.forEach(m => m.dispose());
    fallingMeshes.clear();
    panMesh.position.x = 0;
    document.getElementById('fever-bar').classList.add('hidden');
    document.getElementById('timer').classList.remove('urgent');
    startGame();
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
    document.getElementById('title-best').textContent =
      localStorage.getItem('ponpon-cooking.highscore') || '0';
  });
});
