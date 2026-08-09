(function () {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true);
  const scene  = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.01, 0.10, 1);

  // Camera — inside the sphere looking out
  const camera = new BABYLON.ArcRotateCamera('cam', 0, Math.PI / 2, 0.01, BABYLON.Vector3.Zero(), scene);
  camera.fov = 1.6;

  // Lights
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);
  hemi.intensity = 0.5;
  const point = new BABYLON.PointLight('p', BABYLON.Vector3.Zero(), scene);
  point.intensity = 1.2;

  // --- Bubble master mesh (reused via InstancedMesh) ---
  const masterBubble = BABYLON.MeshBuilder.CreateSphere('master', { diameter: 0.85, segments: 8 }, scene);
  masterBubble.isVisible = false;

  const colorMats = {};
  function getMat(colorName) {
    if (colorMats[colorName]) return colorMats[colorName];
    const m = new BABYLON.StandardMaterial('bm_'+colorName, scene);
    const hex = BubbleGrid.getColorHex(colorName);
    const c3  = BABYLON.Color3.FromHexString(hex);
    m.diffuseColor   = c3;
    m.emissiveColor  = c3.scale(0.15);
    m.specularColor  = new BABYLON.Color3(0.8, 0.8, 0.8);
    m.alpha          = 0.88;
    colorMats[colorName] = m;
    return m;
  }

  // Cell id → InstancedMesh
  const cellMeshes = {};

  BubbleGame.cb.onSpawnBubble = function (cellId, color) {
    const cell = BubbleGrid.getCell(cellId);
    const inst = masterBubble.createInstance('b_'+cellId);
    inst.position.set(cell.position.x, cell.position.y, cell.position.z);
    inst.material = getMat(color);
    cellMeshes[cellId] = inst;
  };

  BubbleGame.cb.onSnap = function (cellId, color) {
    const cell = BubbleGrid.getCell(cellId);
    const inst = masterBubble.createInstance('b_'+cellId);
    inst.position.set(cell.position.x, cell.position.y, cell.position.z);
    inst.material = getMat(color);
    // Snap animation — scale up
    inst.scaling.setAll(0.1);
    let t = 0;
    const unsub = scene.onBeforeRenderObservable.add(() => {
      t += 0.15;
      if (t >= 1) { inst.scaling.setAll(1); scene.onBeforeRenderObservable.remove(unsub); return; }
      inst.scaling.setAll(Math.min(1, t * 1.3));
    });
    cellMeshes[cellId] = inst;
  };

  BubbleGame.cb.onRemoveBubble = function (cellId, isPopped) {
    const m = cellMeshes[cellId];
    if (!m) return;
    if (isPopped) {
      // Pop particle burst
      const cell = BubbleGrid.getCell(cellId);
      const color = BABYLON.Color3.FromHexString(BubbleGrid.getColorHex(
        Object.keys(colorMats).find(k => colorMats[k] === m.material) || 'red'
      ));
      const ps = new BABYLON.ParticleSystem('pp', 30, scene);
      ps.particleTexture = new BABYLON.Texture('https://cdn.babylonjs.com/textures/flare.png', scene);
      ps.emitter = new BABYLON.Vector3(cell.position.x, cell.position.y, cell.position.z);
      ps.minSize = 0.05; ps.maxSize = 0.25;
      ps.minLifeTime = 0.15; ps.maxLifeTime = 0.4;
      ps.emitRate = 200;
      ps.minEmitPower = 1.5; ps.maxEmitPower = 3;
      ps.color1 = new BABYLON.Color4(color.r, color.g, color.b, 1);
      ps.color2 = new BABYLON.Color4(1, 1, 1, 0.5);
      ps.colorDead = new BABYLON.Color4(0,0,0,0);
      ps.start();
      setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 500); }, 150);
    } else {
      // Fall — drop the mesh
      let vy = 0;
      const unsub = scene.onBeforeRenderObservable.add(() => {
        vy -= 0.018;
        m.position.y += vy;
        if (m.position.y < -15) { m.dispose(); scene.onBeforeRenderObservable.remove(unsub); }
      });
    }
    if (isPopped) m.dispose();
    delete cellMeshes[cellId];
  };

  // Bullet mesh
  const bulletSphere = BABYLON.MeshBuilder.CreateSphere('bullet', { diameter: 0.6 }, scene);
  bulletSphere.isVisible = false;
  let bulletInst = null;

  BubbleGame.cb.onSpawnBullet = function (color) {
    if (bulletInst) { bulletInst.dispose(); bulletInst = null; }
    bulletInst = bulletSphere.createInstance('bi');
    bulletInst.material  = getMat(color);
    bulletInst.position.setAll(0);
    bulletInst.isVisible = true;
  };

  BubbleGame.cb.onRemoveBullet = function () {
    if (bulletInst) { bulletInst.dispose(); bulletInst = null; }
  };

  BubbleGame.cb.onMoveBullet = function (x, y, z) {
    if (bulletInst) bulletInst.position.set(x, y, z);
  };

  // HUD
  const hpBarEl    = document.getElementById('hp-bar');
  const scoreEl    = document.getElementById('score');
  const stageNumEl = document.getElementById('stage-num');
  const nextBubbleEl = document.getElementById('next-bubble');
  const bigMsgEl   = document.getElementById('big-msg');
  const hudEl      = document.getElementById('hud');
  const nextWrapEl = document.getElementById('next-bubble-wrap');

  BubbleGame.cb.onHpChange = function (hp, max) {
    hpBarEl.style.width = (hp / max * 100) + '%';
  };
  BubbleGame.cb.onScoreChange = function (s) {
    scoreEl.textContent = s;
  };
  BubbleGame.cb.onNextColor = function (color) {
    nextBubbleEl.style.background = BubbleGrid.getColorHex(color);
  };

  function showBigMsg(text) {
    bigMsgEl.textContent = text;
    bigMsgEl.classList.remove('hidden');
    clearTimeout(showBigMsg._t);
    showBigMsg._t = setTimeout(() => bigMsgEl.classList.add('hidden'), 1000);
  }

  // Stage / game over callbacks
  const LS_KEY = 'bubble-shooter-3d.highscore';
  let highscore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  let gamePhase = 'title';

  function showOverlay(id) {
    ['overlay-title','overlay-stage','overlay-clear','overlay-gameover']
      .forEach(n => document.getElementById(n).classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  BubbleGame.cb.onStageComplete = function (stageNum, s) {
    gamePhase = 'stageclear';
    document.getElementById('stage-title').textContent = 'ステージ' + stageNum + ' クリア！';
    document.getElementById('stage-score').textContent = s;
    showOverlay('overlay-stage');
    hudEl.classList.add('hidden');
    nextWrapEl.classList.add('hidden');
  };

  BubbleGame.cb.onGameClear = function (s) {
    gamePhase = 'clear';
    Sound.play('clear');
    if (s > highscore) { highscore = s; localStorage.setItem(LS_KEY, highscore); }
    document.getElementById('clear-score').textContent = s;
    document.getElementById('clear-best').textContent  = highscore;
    showOverlay('overlay-clear');
    hudEl.classList.add('hidden');
    nextWrapEl.classList.add('hidden');
  };

  BubbleGame.cb.onGameOver = function (s) {
    gamePhase = 'over';
    Sound.play('gameover');
    if (s > highscore) { highscore = s; localStorage.setItem(LS_KEY, highscore); }
    document.getElementById('go-score').textContent = s;
    document.getElementById('go-best').textContent  = highscore;
    showOverlay('overlay-gameover');
    hudEl.classList.add('hidden');
    nextWrapEl.classList.add('hidden');
  };

  function clearBubbleMeshes() {
    Object.values(cellMeshes).forEach(m => m.dispose());
    Object.keys(cellMeshes).forEach(k => delete cellMeshes[k]);
    if (bulletInst) { bulletInst.dispose(); bulletInst = null; }
  }

  function startGame() {
    gamePhase = 'playing';
    clearBubbleMeshes();
    showOverlay(null);
    hudEl.classList.remove('hidden');
    nextWrapEl.classList.remove('hidden');
    stageNumEl.textContent = '1';
    BubbleGame.startGame();
  }

  // --- Camera swipe ---
  let swipeStart = null;
  let swipeAlpha = 0, swipeBeta = Math.PI / 2;
  let velAlpha = 0, velBeta = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  canvas.addEventListener('pointerdown', e => {
    swipeStart = { x: e.clientX, y: e.clientY, time: Date.now() };
  });

  canvas.addEventListener('pointermove', e => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeAlpha -= dx * 0.003;
    swipeBeta   = clamp(swipeBeta - dy * 0.003, 0.2, Math.PI - 0.2);
    swipeStart  = { x: e.clientX, y: e.clientY, time: Date.now() };
  });

  canvas.addEventListener('pointerup', e => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 10) {
      // Tap
      if (gamePhase === 'title' || gamePhase === 'over' || gamePhase === 'clear') {
        startGame();
      } else if (gamePhase === 'stageclear') {
        showOverlay(null);
        clearBubbleMeshes();
        hudEl.classList.remove('hidden');
        nextWrapEl.classList.remove('hidden');
        gamePhase = 'playing';
        stageNumEl.textContent = BubbleGame.getStage() + 1;
        BubbleGame.nextStage();
      } else if (gamePhase === 'playing') {
        // Shoot toward screen center → camera forward direction
        const ray = scene.createPickingRay(
          canvas.clientWidth / 2,
          canvas.clientHeight / 2,
          null,
          camera
        );
        const d = ray.direction;
        BubbleGame.shoot(d.x, d.y, d.z);
      }
    }

    swipeStart = null;
  });

  // --- Render loop ---
  engine.runRenderLoop(() => {
    // Apply camera
    camera.alpha = swipeAlpha;
    camera.beta  = swipeBeta;

    if (gamePhase === 'playing') {
      BubbleGame.tick();
      stageNumEl.textContent = BubbleGame.getStage();
      scoreEl.textContent    = BubbleGame.getScore();
    }

    // Subtle bubble float animation
    const t = performance.now() * 0.001;
    Object.entries(cellMeshes).forEach(([id, m]) => {
      const phase = parseInt(id) * 1.3;
      m.scaling.setAll(1 + Math.sin(t * 1.8 + phase) * 0.03);
    });

    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
})();
