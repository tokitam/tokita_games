// ジャンプとジャンプ main.js — BabylonJS シーン・カメラ・入力・演出

let engine, scene, camera;
let charMesh = null;
let platMeshMap = new Map();   // platform → mesh
let squashT = 0;
let camTargetY = 0;
let sceneReady = false;

// 背景色の段階
const BG_PHASES = [
  { y:   0, r: [0.53, 0.81, 0.92] },  // 空色
  { y: 200, r: [0.9, 0.45, 0.2]   },  // 夕焼け
  { y: 400, r: [0.05, 0.05, 0.12] },  // 星空
];

// 足場マテリアル
const PLAT_COLORS = {
  normal:  [0.2, 0.8, 0.3],
  moving:  [0.2, 0.4, 0.9],
  cloud:   [0.9, 0.9, 0.95],
  spring:  [0.95, 0.85, 0.1],
};

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.92, 1);

  // カメラ（FreeCamera、固定向き）
  camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 4, -12), scene);
  camera.setTarget(new BABYLON.Vector3(0, 4, 0));

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;

  // キャラクター
  buildChar();

  // 星空用パーティクル（高度400+で表示）
  buildStars();

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
}

function buildChar() {
  const mat = new BABYLON.StandardMaterial('charMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.3, 0.8, 0.3);
  mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

  charMesh = BABYLON.MeshBuilder.CreateSphere('char', { diameter: 0.7, segments: 10 }, scene);
  charMesh.material = mat;

  // 顔（目）
  const eyeMat = new BABYLON.StandardMaterial('eye', scene);
  eyeMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  eyeMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
  [-0.15, 0.15].forEach(ox => {
    const eye = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 0.1, segments: 4 }, scene);
    eye.parent = charMesh;
    eye.position.set(ox, 0.1, -0.3);
    eye.material = eyeMat;
  });
}

let starPS = null;
function buildStars() {
  starPS = new BABYLON.ParticleSystem('stars', 200, scene);
  starPS.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAS0lEQVQoU2NkIAL8////fyBdwMiADhjRNYCMYMQmgdUJMEOwKcLqBGwK8DoBmwJsijE8jU0xhqexKcZwGTbFGC7DphjDZdgUA4QBACvgIAssCYHrAAAAAElFTkSuQmCC', scene);
  starPS.emitter = new BABYLON.Vector3(0, 0, 0);
  starPS.minEmitBox = new BABYLON.Vector3(-5, 0, -3);
  starPS.maxEmitBox = new BABYLON.Vector3(5, 4, 3);
  starPS.color1 = new BABYLON.Color4(1, 1, 0.8, 0.9);
  starPS.color2 = new BABYLON.Color4(0.8, 0.8, 1, 0.7);
  starPS.colorDead = new BABYLON.Color4(1, 1, 1, 0);
  starPS.minSize = 0.03; starPS.maxSize = 0.1;
  starPS.minLifeTime = 1.5; starPS.maxLifeTime = 4;
  starPS.emitRate = 30;
  starPS.gravity = new BABYLON.Vector3(0, 0, 0);
  starPS.direction1 = new BABYLON.Vector3(-0.1, 0, -0.1);
  starPS.direction2 = new BABYLON.Vector3(0.1, 0, 0.1);
  starPS.minEmitPower = 0; starPS.maxEmitPower = 0.1;
  starPS.updateSpeed = 0.02;
  // 最初は非アクティブ
}

function makePlatMesh(p) {
  const col = PLAT_COLORS[p.type] || PLAT_COLORS.normal;
  const mat = new BABYLON.StandardMaterial(`pmat_${p.type}_${Math.random()}`, scene);
  mat.diffuseColor = new BABYLON.Color3(...col);
  if (p.type === 'cloud') { mat.alpha = 0.85; }

  const mesh = BABYLON.MeshBuilder.CreateBox(`plat_${p.type}`, { width: 1.8, height: 0.22, depth: 0.9 }, scene);
  mesh.position.set(p.x, p.y, p.z);
  mesh.material = mat;

  // スプリング装飾
  if (p.type === 'spring') {
    const springMat = new BABYLON.StandardMaterial('spr', scene);
    springMat.diffuseColor = new BABYLON.Color3(0.9, 0.2, 0.1);
    const spr = BABYLON.MeshBuilder.CreateCylinder('spr', { diameter: 0.3, height: 0.4, tessellation: 6 }, scene);
    spr.parent = mesh;
    spr.position.y = 0.3;
    spr.material = springMat;
  }

  platMeshMap.set(p, mesh);
  return mesh;
}

function removePlatMesh(p) {
  const mesh = platMeshMap.get(p);
  if (mesh) { mesh.dispose(); platMeshMap.delete(p); }
}

function updateBackground(height) {
  let phase0, phase1, t;
  if (height < BG_PHASES[1].y) {
    phase0 = BG_PHASES[0]; phase1 = BG_PHASES[1];
    t = height / BG_PHASES[1].y;
  } else if (height < BG_PHASES[2].y) {
    phase0 = BG_PHASES[1]; phase1 = BG_PHASES[2];
    t = (height - BG_PHASES[1].y) / (BG_PHASES[2].y - BG_PHASES[1].y);
  } else {
    scene.clearColor = new BABYLON.Color4(...BG_PHASES[2].r, 1);
    // 星パーティクルをカメラ位置に追従
    if (starPS && !starPS._started) {
      starPS._started = true;
      starPS.start();
    }
    if (starPS) starPS.emitter = camera.position.add(new BABYLON.Vector3(0, 0, 6));
    return;
  }
  const r = phase0.r.map((v, i) => v + (phase1.r[i] - v) * t);
  scene.clearColor = new BABYLON.Color4(...r, 1);
}

// 入力
let leftActive = false, rightActive = false;

function setupInput() {
  const zoneL = document.getElementById('zone-left');
  const zoneR = document.getElementById('zone-right');
  const canvas = document.getElementById('renderCanvas');

  function setDir() {
    JumpGame.setInput(leftActive ? -1 : rightActive ? 1 : 0);
  }

  zoneL.addEventListener('pointerdown', () => { leftActive = true; setDir(); });
  zoneL.addEventListener('pointerup',   () => { leftActive = false; setDir(); });
  zoneL.addEventListener('pointerleave',() => { leftActive = false; setDir(); });

  zoneR.addEventListener('pointerdown', () => { rightActive = true; setDir(); });
  zoneR.addEventListener('pointerup',   () => { rightActive = false; setDir(); });
  zoneR.addEventListener('pointerleave',() => { rightActive = false; setDir(); });

  // キーボード
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { leftActive  = true;  setDir(); }
    if (e.key === 'ArrowRight') { rightActive = true;  setDir(); }
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft')  { leftActive  = false; setDir(); }
    if (e.key === 'ArrowRight') { rightActive = false; setDir(); }
  });

  // canvas 左半分・右半分のタッチも対応
  canvas.addEventListener('pointerdown', e => {
    const half = canvas.clientWidth / 2;
    if (e.clientX < half) leftActive = true;
    else rightActive = true;
    setDir();
  });
  canvas.addEventListener('pointerup', e => {
    const half = canvas.clientWidth / 2;
    if (e.clientX < half) leftActive = false;
    else rightActive = false;
    setDir();
  });
}

// ゲームループ
let gameLoopHandle = null;

function startGameLoop() {
  if (gameLoopHandle) scene.unregisterBeforeRender(gameLoopHandle);
  gameLoopHandle = () => {
    if (!JumpGame.isAlive()) return;

    JumpGame.update(1, camTargetY - 2);

    const c = JumpGame.getChar();
    charMesh.position.x = c.x;
    charMesh.position.y = c.y;
    charMesh.position.z = 0;

    // スクワッシュ&ストレッチ
    squashT += 0.1;
    const sy = 1 + 0.06 * Math.abs(Math.sin(squashT * 10));
    charMesh.scaling.set(1 / sy, sy, 1 / sy);

    // カメラ追従（下には下げない）
    const targetCamY = c.y + 3;
    if (targetCamY > camTargetY) {
      camTargetY += (targetCamY - camTargetY) * 0.1;
    }
    camera.position.y = camTargetY;
    camera.setTarget(new BABYLON.Vector3(0, camTargetY, 0));

    // 背景更新
    updateBackground(JumpGame.getScore());
  };
  scene.registerBeforeRender(gameLoopHandle);
}

function startGame() {
  camTargetY = 4;
  camera.position.y = 4;
  leftActive = false;
  rightActive = false;
  JumpGame.setInput(0);

  // 既存の足場メッシュを全削除
  platMeshMap.forEach(m => m.dispose());
  platMeshMap.clear();
  if (starPS && starPS._started) { starPS.stop(); starPS._started = false; }

  JumpGame.init({
    onPlatformCreate(p)  { makePlatMesh(p); },
    onPlatformRemove(p)  { removePlatMesh(p); },
    onCloudPop(p)        {
      const m = platMeshMap.get(p);
      if (m) m.setEnabled(false);
    },
    onSpring(p)          {},
    onCharUpdate(x, y)   {},
    onScoreUpdate(s)     {
      document.getElementById('score').textContent = s;
    },
    onHeightUpdate(h)    {},
    onDie(s)             {
      setTimeout(() => showGameover(s), 600);
    }
  });

  setupInput();
  startGameLoop();
}

function showGameover(score) {
  const prev = parseInt(localStorage.getItem('jump-and-jump.highscore') || '0');
  const best = Math.max(score, prev);
  localStorage.setItem('jump-and-jump.highscore', best);
  document.getElementById('go-score').textContent = score;
  document.getElementById('go-best').textContent = best;
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-gameover').classList.remove('hidden');
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('title-best').textContent =
    localStorage.getItem('jump-and-jump.highscore') || '0';

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    initScene();
    document.getElementById('best').textContent =
      localStorage.getItem('jump-and-jump.highscore') || '0';
    startGame();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    document.getElementById('best').textContent =
      localStorage.getItem('jump-and-jump.highscore') || '0';
    startGame();
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
    document.getElementById('title-best').textContent =
      localStorage.getItem('jump-and-jump.highscore') || '0';
  });
});
