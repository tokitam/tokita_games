// くるくるコマ対決 main.js — BabylonJS シーン・メッシュ・入力・UI

let engine, scene;
let playerMesh, cpuMesh;
let sceneReady = false;
let lastTime = 0;

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);

  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.06, 0.02, 0.12, 1);

  // カメラ（斜め見下ろし固定）
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 0.85, 18, BABYLON.Vector3.Zero(), scene);
  cam.inputs.clear();

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.65;
  const spot = new BABYLON.PointLight('spot', new BABYLON.Vector3(0, 12, 0), scene);
  spot.intensity = 0.6;

  buildArena();
  playerMesh = buildKoma('player', new BABYLON.Color3(0.2, 0.5, 1.0));
  cpuMesh    = buildKoma('cpu',    new BABYLON.Color3(1.0, 0.2, 0.2));

  setupInput();

  let prev = performance.now();
  scene.registerBeforeRender(() => {
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    if (Battle.getState() === 'battle' || Battle.getState() === 'roundEnd') {
      Battle.update(dt);
    }

    syncMeshes();
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
}

function buildArena() {
  // 土俵の台座
  const baseMat = new BABYLON.StandardMaterial('base', scene);
  baseMat.diffuseColor = new BABYLON.Color3(0.22, 0.16, 0.1);
  const base = BABYLON.MeshBuilder.CreateCylinder('base', { diameter: 13, height: 0.4, tessellation: 40 }, scene);
  base.position.y = -0.3;
  base.material = baseMat;

  // 土俵面
  const surfMat = new BABYLON.StandardMaterial('surf', scene);
  surfMat.diffuseColor = new BABYLON.Color3(0.85, 0.72, 0.5);
  const surf = BABYLON.MeshBuilder.CreateCylinder('surf', { diameter: 11, height: 0.1, tessellation: 40 }, scene);
  surf.position.y = -0.05;
  surf.material = surfMat;

  // 土俵の縁（赤白綱）
  const ropeMat = new BABYLON.StandardMaterial('rope', scene);
  ropeMat.diffuseColor = new BABYLON.Color3(0.9, 0.1, 0.1);
  const rope = BABYLON.MeshBuilder.CreateTorus('rope', { diameter: 11, thickness: 0.18, tessellation: 60 }, scene);
  rope.position.y = 0.08;
  rope.material = ropeMat;

  // 格子模様（床の線）
  const lineMat = new BABYLON.StandardMaterial('line', scene);
  lineMat.diffuseColor = new BABYLON.Color3(0.65, 0.52, 0.3);
  for (let i = -2; i <= 2; i++) {
    const l = BABYLON.MeshBuilder.CreateBox(`lh_${i}`, { width: 10.8, height: 0.01, depth: 0.05 }, scene);
    l.position.set(0, 0.01, i * 1.8);
    l.material = lineMat;
    const lv = BABYLON.MeshBuilder.CreateBox(`lv_${i}`, { width: 0.05, height: 0.01, depth: 10.8 }, scene);
    lv.position.set(i * 1.8, 0.01, 0);
    lv.material = lineMat;
  }
}

function buildKoma(id, color) {
  const mat = new BABYLON.StandardMaterial(`koma_${id}`, scene);
  mat.diffuseColor = color;
  mat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  mat.specularPower = 32;

  const root = new BABYLON.TransformNode(`koma_root_${id}`, scene);

  // 胴体（Cylinder）
  const body = BABYLON.MeshBuilder.CreateCylinder(`koma_body_${id}`, {
    diameterTop: 0.6,
    diameterBottom: 1.1,
    height: 0.9,
    tessellation: 12
  }, scene);
  body.parent = root;
  body.position.y = 0.55;
  body.material = mat;

  // 軸先（Cone）
  const axMat = new BABYLON.StandardMaterial(`ax_${id}`, scene);
  axMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.2);
  const axis = BABYLON.MeshBuilder.CreateCylinder(`koma_axis_${id}`, {
    diameterTop: 0, diameterBottom: 0.15, height: 0.55, tessellation: 8
  }, scene);
  axis.parent = root;
  axis.position.y = 0.02;
  axis.material = axMat;

  // リング
  const ringMat = new BABYLON.StandardMaterial(`ring_${id}`, scene);
  ringMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  const ring = BABYLON.MeshBuilder.CreateTorus(`koma_ring_${id}`, {
    diameter: 1.1, thickness: 0.06, tessellation: 24
  }, scene);
  ring.parent = root;
  ring.position.y = 0.42;
  ring.material = ringMat;

  return root;
}

function syncMeshes() {
  const p = Battle.getPlayer();
  const c = Battle.getCpu();

  playerMesh.position.x = p.x;
  playerMesh.position.z = p.z;
  cpuMesh.position.x    = c.x;
  cpuMesh.position.z    = c.z;

  // スピン量で回転速度を決定
  playerMesh.rotation.y += p.spin * 0.005;
  cpuMesh.rotation.y    += c.spin * 0.005;

  // 歳差運動（スピンが弱ると傾く）
  const pPrec = (1 - p.spin / 100) * 0.25;
  const cPrec = (1 - c.spin / 100) * 0.25;
  playerMesh.rotation.x = Math.sin(performance.now() * 0.003) * pPrec;
  playerMesh.rotation.z = Math.cos(performance.now() * 0.0025) * pPrec;
  cpuMesh.rotation.x    = Math.sin(performance.now() * 0.0028) * cPrec;
  cpuMesh.rotation.z    = Math.cos(performance.now() * 0.0022) * cPrec;

  // 場外落下アニメ
  const pr = Math.sqrt(p.x * p.x + p.z * p.z);
  const cr = Math.sqrt(c.x * c.x + c.z * c.z);
  if (pr > 5.5) playerMesh.position.y = Math.max(-5, playerMesh.position.y - 0.05);
  if (cr > 5.5) cpuMesh.position.y    = Math.max(-5, cpuMesh.position.y    - 0.05);
}

// 入力
let sx = 0, sy = 0;

function setupInput() {
  const canvas = document.getElementById('renderCanvas');

  canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  canvas.addEventListener('pointerup', e => {
    const state = Battle.getState();
    if (state !== 'launch' && state !== 'battle') return;

    const dx = e.clientX - sx;
    const dy = sy - e.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) return;

    const nx = dx / dist;
    const nz = -(dy / dist); // 画面Y → ゲームZ（-方向が手前）
    const spd = Math.min(0.18, dist * 0.0012);
    const spinBoost = Math.min(1, dist / 300);

    Battle.playerInput(nx * spd, nz * spd, spinBoost);
    document.getElementById('cooldown-bar').classList.remove('hidden');
  });
}

// UI
function updateHearts(playerWins, cpuWins) {
  const ph = document.getElementById('player-hearts');
  const ch = document.getElementById('cpu-hearts');
  ph.textContent = '🔵'.repeat(playerWins) + '⚫'.repeat(Math.max(0, 3 - playerWins));
  ch.textContent = '🔴'.repeat(cpuWins)    + '⚫'.repeat(Math.max(0, 3 - cpuWins));
}

function showOverlay(text, color, duration) {
  const el = document.getElementById('overlay');
  const txt = document.getElementById('overlay-text');
  txt.textContent = text;
  txt.style.color = color || '#fff';
  el.classList.remove('hidden');
  if (duration) setTimeout(() => el.classList.add('hidden'), duration);
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function setHint(text) {
  document.getElementById('state-hint').textContent = text;
}

// ゲーム開始
function startBattle() {
  playerMesh.position.y = 0;
  cpuMesh.position.y = 0;
  updateHearts(0, 0);
  setHint('スワイプで発射！');

  Battle.init({
    onRoundStart(round) {
      document.getElementById('round-info').textContent = `${round}ラウンド目`;
      setHint('カウントダウン中…');
    },
    onCountdown(count) {
      if (count === 0) {
        showOverlay('GO！', '#ffe000', 700);
      } else {
        showOverlay(String(count), '#fff', 700);
      }
    },
    onBattle() {
      hideOverlay();
      setHint('スワイプで加速！（1秒クールタイム）');
      document.getElementById('cooldown-bar').classList.add('hidden');
    },
    onClash() {
      // 衝突フラッシュ
    },
    onCooldown(ratio) {
      document.getElementById('cooldown-fill').style.width = `${(1 - ratio) * 100}%`;
      if (ratio <= 0) document.getElementById('cooldown-bar').classList.add('hidden');
    },
    onUpdate(player, cpu, cooldown, timeLeft) {},
    onRoundEnd(winner, reason, ps, cs) {
      updateHearts(ps, cs);
      const pWon = winner === 'player';
      const msg = reason === 'knockout'
        ? (pWon ? '場外 KO！' : '場外に落ちた！')
        : (pWon ? 'スピンアウト！' : 'スピンが止まった！');
      showOverlay(msg, pWon ? '#55ff88' : '#ff5555', 2000);
      playerMesh.position.y = 0;
      cpuMesh.position.y = 0;
    },
    onMatchEnd(winner) {
      hideOverlay();
      document.getElementById('screen-game').classList.add('hidden');
      document.getElementById('screen-result').classList.remove('hidden');
      if (winner === 'player') {
        document.getElementById('result-emoji').textContent = '🏆';
        document.getElementById('result-title').textContent = 'あなたの勝ち！';
      } else {
        document.getElementById('result-emoji').textContent = '😭';
        document.getElementById('result-title').textContent = 'CPUの勝ち…';
      }
    }
  });
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    initScene();
    startBattle();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    playerMesh.position.y = 0;
    cpuMesh.position.y = 0;
    hideOverlay();
    startBattle();
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
  });
});
