// ころころ迷路 main.js — BabylonJS シーン・迷路メッシュ・傾き入力・UI

let engine, scene, mazeRoot, ballMesh;
let sceneReady = false;
let currentStageIdx = 0;
let elapsed = 0;
let timerRunning = false;
let rollSoundT = 0;

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.92, 1);

  // カメラ（俯瞰固定）
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 0.9, 18, BABYLON.Vector3.Zero(), scene);
  cam.inputs.clear();

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene);
  dir.intensity = 0.4;

  buildBall();

  let prev = performance.now();
  scene.registerBeforeRender(() => {
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    if (timerRunning) {
      elapsed += dt;
      document.getElementById('timer').textContent = elapsed.toFixed(1);
    }

    MazeGame.update(dt);
    syncBall();

    // 転がり音（速度がある時のみ）
    const b = MazeGame.getBall();
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
}

function buildMaze(stage) {
  // 既存の迷路を削除
  if (mazeRoot) { mazeRoot.getChildMeshes().forEach(m => m.dispose()); mazeRoot.dispose(); }
  mazeRoot = new BABYLON.TransformNode('mazeRoot', scene);

  const grid = stage.grid;
  const rows = grid.length;
  const cols = grid[0].length;

  const floorMat = new BABYLON.StandardMaterial('floor', scene);
  floorMat.diffuseColor = new BABYLON.Color3(0.85, 0.8, 0.65);

  const wallMat = new BABYLON.StandardMaterial('wall', scene);
  wallMat.diffuseColor = new BABYLON.Color3(0.5, 0.7, 0.9);

  const goalMat = new BABYLON.StandardMaterial('goal', scene);
  goalMat.diffuseColor = new BABYLON.Color3(0.2, 0.9, 0.4);
  goalMat.emissiveColor = new BABYLON.Color3(0, 0.3, 0.1);

  const holeMat = new BABYLON.StandardMaterial('hole', scene);
  holeMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  // 床全体
  const floorBase = BABYLON.MeshBuilder.CreateBox('floorBase', { width: cols, height: 0.1, depth: rows }, scene);
  floorBase.parent = mazeRoot;
  floorBase.position.y = -0.05;
  floorBase.material = floorMat;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const x = c - cols / 2 + 0.5;
      const z = r - rows / 2 + 0.5;

      if (cell === 1) {
        const w = BABYLON.MeshBuilder.CreateBox(`wall_${r}_${c}`, { width: 1, height: 0.6, depth: 1 }, scene);
        w.parent = mazeRoot;
        w.position.set(x, 0.3, z);
        w.material = wallMat;
      } else if (cell === 'G') {
        const g = BABYLON.MeshBuilder.CreateCylinder(`goal`, { diameter: 0.9, height: 0.05, tessellation: 16 }, scene);
        g.parent = mazeRoot;
        g.position.set(x, 0.03, z);
        g.material = goalMat;
      } else if (cell === 'H') {
        const h = BABYLON.MeshBuilder.CreateCylinder(`hole_${r}_${c}`, { diameter: 0.7, height: 0.1, tessellation: 12 }, scene);
        h.parent = mazeRoot;
        h.position.set(x, 0.01, z);
        h.material = holeMat;
      }
    }
  }
}

function buildBall() {
  const mat = new BABYLON.StandardMaterial('ballMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.15);
  mat.specularColor = new BABYLON.Color3(1, 1, 0.8);
  mat.specularPower = 48;

  ballMesh = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: BALL_DIAMETER, segments: 10 }, scene);
  ballMesh.material = mat;
}

const BALL_DIAMETER = 0.75;

function syncBall() {
  if (!ballMesh) return;
  const b = MazeGame.getBall();
  if (mazeRoot) {
    ballMesh.position.x = mazeRoot.position.x + b.x;
    ballMesh.position.z = mazeRoot.position.z + b.z;
    ballMesh.position.y = 0.37;
  } else {
    ballMesh.position.set(b.x, 0.37, b.z);
  }
}

// 入力
let psx = 0, psy = 0, pointerDown = false;
let tiltX = 0, tiltZ = 0;

function setupInput() {
  const canvas = document.getElementById('renderCanvas');

  canvas.addEventListener('pointerdown', e => {
    psx = e.clientX; psy = e.clientY;
    pointerDown = true;
  });

  canvas.addEventListener('pointermove', e => {
    if (!pointerDown) return;
    const dx = e.clientX - psx;
    const dy = e.clientY - psy;
    tiltZ = dx * 0.0015;
    tiltX = dy * 0.0015;
    MazeGame.setTilt(tiltX, tiltZ);
  });

  canvas.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  canvas.addEventListener('pointerleave', () => {
    pointerDown = false;
  });

  // キーボード対応
  const keyState = {};
  window.addEventListener('keydown', e => { keyState[e.key] = true; });
  window.addEventListener('keyup', e => { keyState[e.key] = false; });
  scene.registerBeforeRender(() => {
    if (!pointerDown) {
      let tx = 0, tz = 0;
      if (keyState['ArrowLeft'])  tz = -0.25;
      if (keyState['ArrowRight']) tz =  0.25;
      if (keyState['ArrowUp'])    tx = -0.25;
      if (keyState['ArrowDown'])  tx =  0.25;
      if (tx !== 0 || tz !== 0) MazeGame.setTilt(tx, tz);
      else MazeGame.dampTilt();
    } else {
      // ドラッグ中は傾き維持、離したら戻す処理は pointerup で
    }
    if (!pointerDown) MazeGame.dampTilt();
  });
}

function startStage(idx) {
  currentStageIdx = idx;
  elapsed = 0;
  timerRunning = false;
  document.getElementById('timer').textContent = '0.0';

  const stage = STAGES[idx];
  document.getElementById('stage-label').textContent = stage.name;
  const bestKey = `korokoro-maze.best.stage${idx}`;
  const best = localStorage.getItem(bestKey);
  document.getElementById('best-current').textContent = best ? best + ' 秒' : '-';

  buildMaze(stage);

  MazeGame.init(stage, {
    onUpdate(bx, bz, vx, vz) {
      if (!timerRunning && (Math.abs(vx) > 0.01 || Math.abs(vz) > 0.01)) {
        timerRunning = true;
      }
    },
    onFall() {
      timerRunning = false;
      document.getElementById('fall-msg').classList.remove('hidden');
      setTimeout(() => {
        document.getElementById('fall-msg').classList.add('hidden');
        MazeGame.resetBall();
        timerRunning = true;
      }, 1200);
    },
    onGoal() {
      timerRunning = false;
      const time = parseFloat(elapsed.toFixed(1));
      const bestKey = `korokoro-maze.best.stage${currentStageIdx}`;
      const prev = parseFloat(localStorage.getItem(bestKey) || '9999');
      const best = Math.min(time, prev);
      if (time < prev) localStorage.setItem(bestKey, time);

      document.getElementById('clear-time').textContent = time.toFixed(1);
      document.getElementById('clear-best').textContent = best.toFixed(1);

      const btnNext = document.getElementById('btn-next');
      btnNext.style.display = currentStageIdx < STAGES.length - 1 ? '' : 'none';

      setTimeout(() => {
        document.getElementById('screen-game').classList.add('hidden');
        document.getElementById('screen-clear').classList.remove('hidden');
      }, 600);
    }
  });

  setupInput();
  timerRunning = true;
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  // タイトルのベストタイム表示
  STAGES.forEach((_, i) => {
    const best = localStorage.getItem(`korokoro-maze.best.stage${i}`);
    const el = document.getElementById(`best-${i}`);
    if (el) el.textContent = best ? best + ' 秒' : 'ベストなし';
  });

  document.querySelectorAll('.btn-stage').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stage);
      document.getElementById('screen-title').classList.add('hidden');
      document.getElementById('screen-game').classList.remove('hidden');
      initScene();
      startStage(idx);
    });
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    document.getElementById('screen-clear').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    startStage(currentStageIdx + 1);
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('screen-clear').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    startStage(currentStageIdx);
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-clear').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
    STAGES.forEach((_, i) => {
      const best = localStorage.getItem(`korokoro-maze.best.stage${i}`);
      const el = document.getElementById(`best-${i}`);
      if (el) el.textContent = best ? best + ' 秒' : 'ベストなし';
    });
  });
});
