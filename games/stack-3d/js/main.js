(function () {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });

  const overlay      = document.getElementById('overlay');
  const ovTitle      = document.getElementById('overlay-title');
  const ovGameover   = document.getElementById('overlay-gameover');
  const hud          = document.getElementById('hud');
  const scoreEl      = document.getElementById('score');
  const bestEl       = document.getElementById('best');
  const titleBestEl  = document.getElementById('title-best');
  const goScoreEl    = document.getElementById('go-score');
  const goBestEl     = document.getElementById('go-best');
  const perfectMsg   = document.getElementById('perfect-msg');

  const LS_KEY = 'stack-3d.highscore';
  let highscore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  titleBestEl.textContent = highscore;
  bestEl.textContent = highscore;

  // Scene
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.07, 0.07, 0.13, 1);

  // Camera — isometric-ish perspective from upper-right
  const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 4, Math.PI / 3.2, 20, BABYLON.Vector3.Zero(), scene);
  camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;
  camera.lowerBetaLimit   = camera.upperBetaLimit   = camera.beta;
  camera.lowerAlphaLimit  = camera.upperAlphaLimit  = camera.alpha;

  // Lights
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
  const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene);
  dir.intensity = 0.8;

  // Camera target Y (lerp)
  let camTargetY = 0;
  let camRadius  = 20;

  // Game state
  let gameState = 'title'; // title | playing | gameover
  let movingMesh = null;
  let fallingMeshes = [];
  let stackMeshes   = [];
  let tAcc = 0;
  let lastTapTime = 0;

  // Color helper
  function hexFromHsl(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
    return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  function colorFromHsl(hslStr) {
    const m = hslStr.match(/hsl\((\d+(?:\.\d+)?),(\d+)%,(\d+)%\)/);
    if (!m) return new BABYLON.Color3(0.5, 0.7, 1);
    const hex = hexFromHsl(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    return BABYLON.Color3.FromHexString(hex);
  }

  function makeMat(colorStr) {
    const mat = new BABYLON.StandardMaterial('m_' + Math.random(), scene);
    mat.diffuseColor = colorFromHsl(colorStr);
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    return mat;
  }

  function makeBlock(b) {
    const box = BABYLON.MeshBuilder.CreateBox('blk', { width: b.w, height: 0.45, depth: b.d }, scene);
    box.position.x = b.x;
    box.position.y = b.y * 0.5;
    box.position.z = b.z;
    box.material = makeMat(b.color);
    return box;
  }

  function spawnMovingBlock() {
    if (movingMesh) { movingMesh.dispose(); movingMesh = null; }
    const prev  = StackGame.getTopBlock();
    const axis  = StackGame.getAxis();
    const w     = StackGame.getCurrentW();
    const d     = StackGame.getCurrentD();
    const y     = prev.y + 1;
    const color = `hsl(${(StackGame.getLevel() * 8) % 360},70%,55%)`;

    const box = BABYLON.MeshBuilder.CreateBox('moving', { width: w, height: 0.45, depth: d }, scene);
    box.position.y = y * 0.5;
    box.position.x = prev.x;
    box.position.z = prev.z;
    box.material   = makeMat(color);
    movingMesh = box;
    tAcc = 0;
  }

  function clearScene() {
    stackMeshes.forEach(m => m.dispose());
    stackMeshes = [];
    fallingMeshes.forEach(m => m.dispose());
    fallingMeshes = [];
    if (movingMesh) { movingMesh.dispose(); movingMesh = null; }
  }

  function startGame() {
    clearScene();
    const base = StackGame.init();
    camTargetY = 0;
    camRadius  = 20;
    camera.target.y = 0;
    camera.radius   = 20;

    // Draw base block
    const baseBox = makeBlock(base);
    stackMeshes.push(baseBox);

    // HUD
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
    bestEl.textContent = highscore;

    gameState = 'playing';
    spawnMovingBlock();
  }

  function showPerfect() {
    perfectMsg.classList.remove('hidden');
    clearTimeout(showPerfect._timer);
    showPerfect._timer = setTimeout(() => perfectMsg.classList.add('hidden'), 900);
  }

  StackGame.onScoreUpdate = function (s) {
    scoreEl.textContent = s;
  };

  StackGame.onPerfect = function () {
    Sound.play('perfect');
    showPerfect();
  };

  StackGame.onPlace = function (placed, fallen, perfect) {
    if (!perfect) Sound.play(fallen ? 'cut' : 'place');
    else          Sound.play('place');

    // Solidify placed block
    const pm = makeBlock(placed);
    stackMeshes.push(pm);

    // Animate: slight bounce
    const targetY = placed.y * 0.5;
    pm.position.y = targetY + 0.25;
    let bounce = 0;
    const unsub = scene.onBeforeRenderObservable.add(() => {
      bounce += 0.15;
      if (bounce >= 1) {
        pm.position.y = targetY;
        scene.onBeforeRenderObservable.remove(unsub);
        return;
      }
      pm.position.y = targetY + 0.25 * Math.sin(bounce * Math.PI);
    });

    // Falling piece
    if (fallen) {
      const fm = makeBlock(fallen);
      let vy = 0;
      fallingMeshes.push(fm);
      const fUnsub = scene.onBeforeRenderObservable.add(() => {
        vy -= 0.018;
        fm.position.y += vy;
        fm.rotation.x += 0.04;
        fm.rotation.z += 0.02;
        if (fm.position.y < -10) {
          fm.dispose();
          fallingMeshes = fallingMeshes.filter(m => m !== fm);
          scene.onBeforeRenderObservable.remove(fUnsub);
        }
      });
    }

    // Camera target update
    camTargetY = placed.y * 0.5;
    spawnMovingBlock();
  };

  StackGame.onGameOver = function (s) {
    Sound.play('gameover');
    gameState = 'gameover';

    if (movingMesh) { movingMesh.dispose(); movingMesh = null; }

    if (s > highscore) {
      highscore = s;
      localStorage.setItem(LS_KEY, highscore);
    }

    hud.classList.add('hidden');
    goScoreEl.textContent = s;
    goBestEl.textContent  = highscore;
    ovTitle.classList.add('hidden');
    ovGameover.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Zoom out
    camRadius = 30;
  };

  // Input
  function onTap() {
    const now = Date.now();
    if (now - lastTapTime < 150) return;
    lastTapTime = now;

    if (gameState === 'title' || gameState === 'gameover') {
      startGame();
      return;
    }
    if (gameState !== 'playing' || !movingMesh) return;

    const axis = StackGame.getAxis();
    const pos  = axis === 'x' ? movingMesh.position.x : movingMesh.position.z;
    StackGame.place(pos);
  }

  canvas.addEventListener('pointerdown', onTap);
  document.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') onTap(); });

  // Render loop
  const AMP = 5;

  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (gameState === 'playing' && movingMesh) {
      tAcc += dt * StackGame.getSpeed();
      const axis = StackGame.getAxis();
      const prev = StackGame.getTopBlock();
      if (axis === 'x') {
        movingMesh.position.x = prev.x + AMP * Math.sin(tAcc);
        movingMesh.position.z = prev.z;
      } else {
        movingMesh.position.x = prev.x;
        movingMesh.position.z = prev.z + AMP * Math.sin(tAcc);
      }
    }

    // Smooth camera follow
    camera.target.y += (camTargetY + 1 - camera.target.y) * 0.08;
    camera.radius  += (camRadius - camera.radius) * 0.06;

    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
})();
