// フィッシングフレンズ main.js — BabylonJS シーン・入力・UI

let engine, scene;
let float, fishNodes = [], fishData = [];
let waveT = 0;
let waterMesh = null;
let floatInWater = false;
let bitingFishIdx = -1;
let bitingTimer = null;
let biteWindow = false;
let biteWindowTimer = null;
let catchAnim = false;
let sceneReady = false;

const WATER_Y = 0;
const FISH_COUNT = 8;
const BITE_WINDOW = 0.8;

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);

  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.1, 0.22, 1);

  window._fishScene = scene;

  // カメラ（水面斜め上、固定）
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.15, 16, new BABYLON.Vector3(0, 0, 2), scene);
  cam.inputs.clear();

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
  hemi.groundColor = new BABYLON.Color3(0, 0.1, 0.3);
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -1), scene);
  sun.intensity = 0.5;

  buildWater();
  buildUnderwater();
  buildFloat();
  spawnFishes();
  setupInput();

  scene.registerBeforeRender(update);
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
}

function buildWater() {
  const mat = new BABYLON.StandardMaterial('water', scene);
  mat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.7);
  mat.alpha = 0.55;
  mat.specularColor = new BABYLON.Color3(0.8, 0.9, 1.0);
  mat.specularPower = 48;

  waterMesh = BABYLON.MeshBuilder.CreateGround('water', { width: 20, height: 20, subdivisions: 16 }, scene);
  waterMesh.position.y = WATER_Y;
  waterMesh.material = mat;
}

function buildUnderwater() {
  // 砂底
  const sandMat = new BABYLON.StandardMaterial('sand', scene);
  sandMat.diffuseColor = new BABYLON.Color3(0.65, 0.55, 0.3);
  const sand = BABYLON.MeshBuilder.CreateGround('sand', { width: 22, height: 22 }, scene);
  sand.position.y = -5;
  sand.material = sandMat;

  // 海藻
  const seaweedMat = new BABYLON.StandardMaterial('seaweed', scene);
  seaweedMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.2);
  const weedPositions = [[-3, 4], [2, -2], [-1, 3], [4, 1], [-2, -3], [3, -4], [0, 5], [-4, 0]];
  weedPositions.forEach(([x, z], i) => {
    const h = 1.2 + Math.random() * 0.8;
    const w = BABYLON.MeshBuilder.CreateCylinder(`weed_${i}`, {
      diameterTop: 0.05,
      diameterBottom: 0.15,
      height: h,
      tessellation: 5
    }, scene);
    w.position.set(x, -5 + h / 2, z);
    w.material = seaweedMat;
  });

  // 泡パーティクル
  const ps = new BABYLON.ParticleSystem('bubbles', 40, scene);
  ps.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAS0lEQVQoU2NkIAL8////fyBdwMiADhjRNYCMYMQmgdUJMEOwKcLqBGwK8DoBmwJsijE8jU0xhqexKcZwGTbFGC7DphjDZdgUA4QBACvgIAssCYHrAAAAAElFTkSuQmCC', scene);
  ps.emitter = new BABYLON.Vector3(0, -4, 0);
  ps.minEmitBox = new BABYLON.Vector3(-4, 0, -4);
  ps.maxEmitBox = new BABYLON.Vector3(4, 0, 4);
  ps.color1 = new BABYLON.Color4(0.6, 0.8, 1, 0.6);
  ps.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.4);
  ps.colorDead = new BABYLON.Color4(1, 1, 1, 0);
  ps.minSize = 0.04; ps.maxSize = 0.14;
  ps.minLifeTime = 2; ps.maxLifeTime = 5;
  ps.emitRate = 8;
  ps.gravity = new BABYLON.Vector3(0, 0.3, 0);
  ps.direction1 = new BABYLON.Vector3(-0.1, 1, -0.1);
  ps.direction2 = new BABYLON.Vector3(0.1, 1, 0.1);
  ps.minEmitPower = 0.1; ps.maxEmitPower = 0.3;
  ps.updateSpeed = 0.01;
  ps.start();
}

function buildFloat() {
  const mat = new BABYLON.StandardMaterial('floatMat', scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);

  float = BABYLON.MeshBuilder.CreateSphere('float', { diameter: 0.22, segments: 6 }, scene);
  float.material = mat;
  float.position.set(0, 3, 2);
  float.setEnabled(false);

  // ウキの棒
  const stickMat = new BABYLON.StandardMaterial('stick', scene);
  stickMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.5);
  const stick = BABYLON.MeshBuilder.CreateCylinder('stick', { diameter: 0.04, height: 0.5, tessellation: 6 }, scene);
  stick.material = stickMat;
  stick.parent = float;
  stick.position.y = 0.35;
}

function spawnFishes() {
  fishNodes = [];
  fishData = [];

  for (let i = 0; i < FISH_COUNT; i++) {
    const def = lotteryFish();
    const node = drawFish(def);
    const angle = (i / FISH_COUNT) * Math.PI * 2;
    const r = 2 + Math.random() * 4;
    node.position.set(
      Math.cos(angle) * r,
      -1.5 - Math.random() * 2,
      Math.sin(angle) * r + 2
    );
    const scaleF = def.name === 'コアジ' ? 0.55 : def.name === 'マダイ' ? 0.8 : def.name === 'キンギョ' ? 0.65 : 1.0;
    node.scaling.setAll(scaleF);

    fishData.push({
      def,
      node,
      waypoint: randomWaypoint(),
      phaseOff: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.01,
      interested: false,
      cooldown: 0
    });
    fishNodes.push(node);
  }
}

function randomWaypoint() {
  return new BABYLON.Vector3(
    (Math.random() - 0.5) * 8,
    -1.5 - Math.random() * 2,
    (Math.random() - 0.5) * 8 + 2
  );
}

function update() {
  waveT += 0.016;
  animateWater();
  animateFishes();

  if (floatInWater) {
    const base = Math.sin(waveT * 2) * 0.05;
    float.position.y = WATER_Y - 0.1 + base;
  }
}

function animateWater() {
  if (!waterMesh) return;
  const positions = waterMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions) return;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    positions[i + 1] = 0.06 * Math.sin(x * 1.5 + waveT) * Math.cos(z * 1.2 + waveT * 0.7);
  }
  waterMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
}

function animateFishes() {
  fishData.forEach((fd, i) => {
    if (!fd.node) return;
    if (fd.cooldown > 0) fd.cooldown -= 0.016;

    if (fd.interested && floatInWater) {
      fd.node.position = BABYLON.Vector3.Lerp(fd.node.position,
        new BABYLON.Vector3(float.position.x, float.position.y - 0.5, float.position.z),
        fd.speed * 0.8
      );
    } else {
      const dist = BABYLON.Vector3.Distance(fd.node.position, fd.waypoint);
      if (dist < 0.3) fd.waypoint = randomWaypoint();
      fd.node.position = BABYLON.Vector3.Lerp(fd.node.position, fd.waypoint, fd.speed);
      fd.node.position.y += Math.sin(waveT * 2 + fd.phaseOff) * 0.003;
    }

    // 進行方向に向ける
    const dir = fd.waypoint.subtract(fd.node.position).normalize();
    if (dir.length() > 0.01) {
      const angle = Math.atan2(dir.x, dir.z);
      fd.node.rotation.y = angle;
    }

    // 尾びれふりふり
    const tail = fd.node.getChildMeshes().find(m => m.name.startsWith('fishTail'));
    if (tail) tail.rotation.y = Math.sin(waveT * 5 + fd.phaseOff) * 0.3;
  });
}

// 入力
let sx = 0, sy = 0;
let castDone = false;

function setupInput() {
  const canvas = document.getElementById('renderCanvas');

  canvas.addEventListener('pointerdown', e => {
    sx = e.clientX;
    sy = e.clientY;
    castDone = false;
    // biting中のタップ = フッキング
    if (GameState.getState() === 'biting' && biteWindow) {
      doHook();
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (GameState.isOver()) return;
    const dy = sy - e.clientY;
    const dx = e.clientX - sx;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (GameState.getState() === 'ready' && dy > 50 && !castDone) {
      castDone = true;
      doCast(dx, dy, dist);
    }
  });
}

function doCast(dx, dy, dist) {
  GameState.setState('casting');
  Sound.play('cast');
  setHint('魚を待っています…');

  const angle = Math.atan2(dx, dy) * 0.5;
  const throwDist = Math.min(6, Math.max(2, dist * 0.04));
  const landX = Math.sin(angle) * throwDist;
  const landZ = 2 + Math.cos(angle) * throwDist * 0.5;

  float.setEnabled(true);
  float.position.set(landX, 3, landZ);
  floatInWater = false;

  // 投げるアニメ（弧を描いて着水）
  let t = 0;
  const startY = 3;
  const anim = setInterval(() => {
    t += 0.08;
    float.position.x = landX * Math.min(t, 1);
    float.position.z = (2 + (landZ - 2) * Math.min(t, 1));
    float.position.y = startY * (1 - t) + Math.sin(t * Math.PI) * 2;
    if (t >= 1) {
      clearInterval(anim);
      float.position.set(landX, WATER_Y - 0.1, landZ);
      floatInWater = true;
      GameState.setState('waiting');
      scheduleBite(landX, landZ);
    }
  }, 30);
}

function scheduleBite(lx, lz) {
  const floatPos = new BABYLON.Vector3(lx, WATER_Y, lz);
  const nearFishes = fishData.filter(fd =>
    !fd.interested &&
    fd.cooldown <= 0 &&
    BABYLON.Vector3.Distance(fd.node.position, floatPos) < 4
  );

  if (nearFishes.length === 0) {
    bitingTimer = setTimeout(() => {
      if (GameState.getState() !== 'waiting') return;
      setHint('↑スワイプでキャスト');
      resetFloat();
    }, 3000);
    return;
  }

  const target = nearFishes[Math.floor(Math.random() * nearFishes.length)];
  const idx = fishData.indexOf(target);
  target.interested = true;
  bitingFishIdx = idx;

  const delay = 1000 + Math.random() * 2000;
  bitingTimer = setTimeout(() => {
    if (GameState.getState() !== 'waiting') return;
    startBite();
  }, delay);
}

function startBite() {
  GameState.setState('biting');
  biteWindow = true;
  Sound.play('atari');

  const mark = document.getElementById('atari-mark');
  mark.classList.remove('hidden');
  setHint('タップ！');

  float.position.y = WATER_Y - 0.3;

  biteWindowTimer = setTimeout(() => {
    if (GameState.getState() === 'biting') {
      biteWindow = false;
      doEscape();
    }
  }, BITE_WINDOW * 1000);
}

function doHook() {
  clearTimeout(biteWindowTimer);
  biteWindow = false;
  document.getElementById('atari-mark').classList.add('hidden');

  if (bitingFishIdx < 0) return;
  const fd = fishData[bitingFishIdx];
  GameState.setState('catching');
  Sound.play('catch');

  // 釣り上げアニメ
  catchAnim = true;
  const startPos = fd.node.position.clone();
  let t = 0;
  const anim = setInterval(() => {
    t += 0.1;
    fd.node.position.y = startPos.y + t * 5;
    if (t >= 1) {
      clearInterval(anim);
      catchAnim = false;

      GameState.addScore(fd.def.score);
      showCatchPopup(fd.def);

      fd.node.position.set(-999, -999, -999);
      fd.interested = false;
      fd.cooldown = 5;

      setTimeout(() => {
        respawnFish(bitingFishIdx);
        resetFloat();
        bitingFishIdx = -1;
      }, 1200);
    }
  }, 40);
}

function doEscape() {
  GameState.setState('escaped');
  document.getElementById('atari-mark').classList.add('hidden');
  Sound.play('escape');

  if (bitingFishIdx >= 0) {
    fishData[bitingFishIdx].interested = false;
    fishData[bitingFishIdx].cooldown = 3;
    fishData[bitingFishIdx].waypoint = randomWaypoint();
  }
  bitingFishIdx = -1;

  setTimeout(() => {
    resetFloat();
  }, 800);
}

function resetFloat() {
  floatInWater = false;
  float.setEnabled(false);
  if (GameState.getState() !== 'result') {
    GameState.setState('ready');
    setHint('↑スワイプでキャスト');
  }
}

function respawnFish(idx) {
  const oldNode = fishData[idx].node;
  if (oldNode) oldNode.dispose();

  const def = lotteryFish();
  const node = drawFish(def);
  const angle = Math.random() * Math.PI * 2;
  const r = 3 + Math.random() * 3;
  node.position.set(Math.cos(angle) * r, -1.5 - Math.random() * 2, Math.sin(angle) * r + 2);
  const scaleF = def.name === 'コアジ' ? 0.55 : def.name === 'マダイ' ? 0.8 : def.name === 'キンギョ' ? 0.65 : 1.0;
  node.scaling.setAll(scaleF);

  fishData[idx] = {
    def, node,
    waypoint: randomWaypoint(),
    phaseOff: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.01,
    interested: false,
    cooldown: 0
  };
  fishNodes[idx] = node;
}

function showCatchPopup(def) {
  const el = document.getElementById('catch-popup');
  el.textContent = `${def.emoji} ${def.name}！ +${def.score}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 1500);
}

function setHint(text) {
  document.getElementById('state-hint').textContent = text;
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('title-best').textContent =
    localStorage.getItem('fishing-friends.highscore') || '0';

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    initScene();
    startGame();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    restartGame();
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
    document.getElementById('title-best').textContent =
      localStorage.getItem('fishing-friends.highscore') || '0';
  });
});

function startGame() {
  GameState.init({
    onTick: () => {},
    onEnd: (score) => {
      GameState.setState('result');
      GameState.stopTimer();
      clearTimeout(bitingTimer);
      clearTimeout(biteWindowTimer);
      resetFloat();
      setTimeout(() => showResult(score), 1000);
    }
  });
  setHint('↑スワイプでキャスト');
  GameState.startTimer();
  GameState.setState('ready');
}

function restartGame() {
  clearTimeout(bitingTimer);
  clearTimeout(biteWindowTimer);
  biteWindow = false;
  bitingFishIdx = -1;
  floatInWater = false;
  if (float) float.setEnabled(false);
  document.getElementById('atari-mark').classList.add('hidden');
  document.getElementById('catch-popup').classList.add('hidden');

  fishData.forEach((fd, i) => {
    if (fd.node) fd.node.dispose();
  });
  fishData = []; fishNodes = [];
  spawnFishes();

  startGame();
}

function showResult(score) {
  const prev = parseInt(localStorage.getItem('fishing-friends.highscore') || '0');
  const best = Math.max(score, prev);
  localStorage.setItem('fishing-friends.highscore', best);
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-best').textContent = best;
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-result').classList.remove('hidden');
}
