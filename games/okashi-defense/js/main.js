(function () {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true);
  const scene  = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.1, 0.06, 0.18, 1);

  // --- Camera ---
  const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, 18, new BABYLON.Vector3(3.5, 0, 4.5), scene);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 28;
  camera.lowerBetaLimit   = Math.PI / 5;
  camera.upperBetaLimit   = Math.PI / 2.5;
  camera.lowerAlphaLimit  = camera.upperAlphaLimit = camera.alpha; // lock rotation
  camera.attachControl(canvas, true);

  // --- Lights ---
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);
  hemi.intensity = 0.7;
  const dir = new BABYLON.DirectionalLight('d', new BABYLON.Vector3(-1,-2,-1), scene);
  dir.intensity = 0.6;

  // --- Constants ---
  const CELL = 1.2; // world units per grid cell

  function gridToWorld(col, row) {
    return new BABYLON.Vector3(col * CELL, 0, row * CELL);
  }

  // Build waypoints in world coords
  const worldWaypoints = WAYPOINTS_GRID.map(wp => ({
    x: wp.c * CELL,
    z: wp.r * CELL,
  }));
  Game.init(worldWaypoints);

  // --- Build ground grid ---
  const pathMat = new BABYLON.StandardMaterial('pathMat', scene);
  pathMat.diffuseColor = new BABYLON.Color3(0.42, 0.28, 0.14);

  const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.55, 0.82, 0.38);

  const cellMeshes = {}; // col_row → mesh
  const cellPlaceHighlight = {};

  for (let r = 0; r < GRID.length; r++) {
    for (let c = 0; c < GRID[r].length; c++) {
      const type = GRID[r][c];
      const box  = BABYLON.MeshBuilder.CreateBox('cell_'+c+'_'+r, {
        width: CELL - 0.05, height: 0.1, depth: CELL - 0.05
      }, scene);
      box.position = gridToWorld(c, r);
      box.position.y = -0.05;
      box.material  = type === 1 ? pathMat : groundMat;
      box.metadata  = { col: c, row: r, type };
      if (type === 0) cellMeshes[c+'_'+r] = box;

      // Click-selectable highlight plane for empty cells
      if (type === 0) {
        const hl = BABYLON.MeshBuilder.CreatePlane('hl_'+c+'_'+r, { size: CELL - 0.08 }, scene);
        hl.rotation.x = Math.PI / 2;
        hl.position   = gridToWorld(c, r);
        hl.position.y = 0.06;
        const hm = new BABYLON.StandardMaterial('hm_'+c+'_'+r, scene);
        hm.diffuseColor = new BABYLON.Color3(0.2, 1, 0.3);
        hm.alpha = 0.0;
        hl.material = hm;
        hl.metadata = { col: c, row: r, type: 'cell' };
        cellPlaceHighlight[c+'_'+r] = hl;
      }
    }
  }

  // --- Goal: cake castle ---
  function makeCastle() {
    const root = new BABYLON.TransformNode('castle', scene);
    root.position = new BABYLON.Vector3(5 * CELL, 0, 10 * CELL);
    const mats = [0.9, 0.7, 0.5].map((l, i) => {
      const m = new BABYLON.StandardMaterial('cm'+i, scene);
      m.diffuseColor = new BABYLON.Color3(1, l, 0.7);
      return m;
    });
    [[1.2, 0.5], [0.9, 1.0], [0.6, 1.5]].forEach(([r, y], i) => {
      const cyl = BABYLON.MeshBuilder.CreateCylinder('ct'+i, { diameter: r, height: 0.4 }, scene);
      cyl.parent = root;
      cyl.position.y = y * 0.4;
      cyl.material = mats[i];
    });
    const berry = BABYLON.MeshBuilder.CreateSphere('berry', { diameter: 0.22 }, scene);
    berry.parent = root;
    berry.position.y = 0.75;
    const bm = new BABYLON.StandardMaterial('bm', scene);
    bm.diffuseColor = new BABYLON.Color3(0.9, 0.1, 0.2);
    berry.material = bm;
  }
  makeCastle();

  // --- Tower meshes ---
  const towerMeshMap = new Map(); // tower obj → {root, mesh}

  function colorFromHex(hex) {
    return BABYLON.Color3.FromHexString(hex);
  }

  function buildTowerMesh(tower) {
    const def = TOWERS[tower.id];
    const pos = gridToWorld(tower.col, tower.row);
    const root = new BABYLON.TransformNode('tw_'+tower.col+'_'+tower.row, scene);
    root.position = new BABYLON.Vector3(pos.x, 0, pos.z);

    const mat = new BABYLON.StandardMaterial('twm_'+tower.col, scene);
    mat.diffuseColor = colorFromHex(def.color);

    let mesh;
    if (tower.id === 'candy') {
      mesh = BABYLON.MeshBuilder.CreateCylinder('ts', { diameter: 0.5, height: 0.8, tessellation: 12 }, scene);
      const top = BABYLON.MeshBuilder.CreateSphere('tt', { diameter: 0.35 }, scene);
      top.parent = root;
      top.position.y = 0.65;
      top.material = mat;
    } else if (tower.id === 'cookie') {
      mesh = BABYLON.MeshBuilder.CreateCylinder('ts', { diameter: 0.55, height: 0.2 }, scene);
    } else if (tower.id === 'lollipop') {
      mesh = BABYLON.MeshBuilder.CreateCylinder('ts', { diameter: 0.12, height: 1.0 }, scene);
      const ball = BABYLON.MeshBuilder.CreateSphere('tb', { diameter: 0.5 }, scene);
      ball.parent = root;
      ball.position.y = 0.75;
      ball.material = mat;
    } else {
      mesh = BABYLON.MeshBuilder.CreateCylinder('ts', { diameter: 0.5, height: 0.6 }, scene);
      const barrel = BABYLON.MeshBuilder.CreateCylinder('tb', { diameter: 0.25, height: 0.5 }, scene);
      barrel.parent = root;
      barrel.position.y = 0.55;
      barrel.rotation.x = Math.PI / 4;
      barrel.material = mat;
    }
    mesh.parent = root;
    mesh.position.y = 0.3;
    mesh.material = mat;

    // Click target
    mesh.metadata = { type: 'tower', tower };
    towerMeshMap.set(tower, { root, mesh });

    // Store world pos on tower for game logic
    tower.wx = pos.x;
    tower.wz = pos.z;
  }

  function removeTowerMesh(tower) {
    const m = towerMeshMap.get(tower);
    if (m) {
      m.root.dispose();
      m.mesh.dispose();
      towerMeshMap.delete(tower);
    }
  }

  // --- Enemy meshes ---
  function hexFromColor3(c) {
    const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return '#' + toHex(c.r) + toHex(c.g) + toHex(c.b);
  }

  Game.cb.onSpawnEnemy = function (e) {
    const def = ENEMIES[e.type];
    const s   = def.scale;
    const root = new BABYLON.TransformNode('en_'+Math.random(), scene);
    root.position.y = 0.25;

    const mat = new BABYLON.StandardMaterial('em_'+e.type, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(def.color);

    // Macaron: two discs + cream layer
    const top = BABYLON.MeshBuilder.CreateCylinder('et', { diameter: s*1.8, height: s*0.5 }, scene);
    top.parent = root; top.position.y = s*0.35; top.material = mat;

    const bot = BABYLON.MeshBuilder.CreateCylinder('eb', { diameter: s*1.8, height: s*0.5 }, scene);
    bot.parent = root; bot.position.y = -s*0.35; bot.material = mat;

    const creamMat = new BABYLON.StandardMaterial('ec', scene);
    creamMat.diffuseColor = new BABYLON.Color3(1, 0.95, 0.9);
    const cream = BABYLON.MeshBuilder.CreateCylinder('ec', { diameter: s*1.6, height: s*0.28 }, scene);
    cream.parent = root; cream.material = creamMat;

    // HP bar
    const barRoot = new BABYLON.TransformNode('hbr', scene);
    barRoot.position.y = s * 1.3;
    const barBg = BABYLON.MeshBuilder.CreatePlane('hbg', { width: 0.7, height: 0.1 }, scene);
    barBg.parent = barRoot;
    barBg.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const bgMat = new BABYLON.StandardMaterial('hbgm', scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    bgMat.backFaceCulling = false;
    barBg.material = bgMat;

    const barFg = BABYLON.MeshBuilder.CreatePlane('hbf', { width: 0.68, height: 0.08 }, scene);
    barFg.parent = barRoot;
    barFg.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    barFg.position.z = -0.01;
    const fgMat = new BABYLON.StandardMaterial('hbfm', scene);
    fgMat.diffuseColor = new BABYLON.Color3(0.2, 0.9, 0.2);
    fgMat.backFaceCulling = false;
    barFg.material = fgMat;

    e.mesh   = root;
    e.hpBar  = barRoot;
    e._barFg = barFg;
    e._barFgMat = fgMat;
  };

  Game.cb.onHitEnemy = function (e) {
    if (!e._barFg || !e._barFgMat) return;
    const ratio = Math.max(0, e.hp / e.maxHp);
    e._barFg.scaling.x = ratio;
    e._barFg.position.x = (ratio - 1) * 0.34;
    e._barFgMat.diffuseColor = ratio > 0.5
      ? new BABYLON.Color3(0.2, 0.9, 0.2)
      : ratio > 0.25
        ? new BABYLON.Color3(1, 0.8, 0)
        : new BABYLON.Color3(0.9, 0.15, 0.1);
    if (e.mesh) {
      const p = e.hpBar;
      if (p) { p.position.x = e.mesh.position.x; p.position.z = e.mesh.position.z; }
    }
  };

  Game.cb.onRemoveMesh = function (mesh, hpBar) {
    if (mesh) mesh.dispose();
    if (hpBar) hpBar.dispose();
  };

  // --- Bullets ---
  const bulletMats = {};
  function getBulletMat(color) {
    if (!bulletMats[color]) {
      const m = new BABYLON.StandardMaterial('bm_'+color, scene);
      m.diffuseColor  = BABYLON.Color3.FromHexString(color);
      m.emissiveColor = BABYLON.Color3.FromHexString(color);
      bulletMats[color] = m;
    }
    return bulletMats[color];
  }

  Game.cb.onSpawnBullet = function (b, color) {
    const sph = BABYLON.MeshBuilder.CreateSphere('blt', { diameter: 0.18 }, scene);
    sph.position.set(b.x, b.y, b.z);
    sph.material = getBulletMat(color);
    b.mesh = sph;
  };

  // --- Explosions ---
  Game.cb.onExplode = function (x, z) {
    const ps = new BABYLON.ParticleSystem('exp', 60, scene);
    ps.particleTexture = new BABYLON.Texture('https://cdn.babylonjs.com/textures/flare.png', scene);
    ps.emitter = new BABYLON.Vector3(x, 0.3, z);
    ps.minSize = 0.1; ps.maxSize = 0.5;
    ps.minLifeTime = 0.2; ps.maxLifeTime = 0.5;
    ps.emitRate = 200;
    ps.minEmitPower = 2; ps.maxEmitPower = 4;
    ps.color1 = new BABYLON.Color4(1, 0.6, 0.1, 1);
    ps.color2 = new BABYLON.Color4(0.8, 0.1, 0.1, 1);
    ps.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    ps.start();
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 600); }, 200);
  };

  // --- HUD ---
  const lifeEl   = document.getElementById('life');
  const sugarEl  = document.getElementById('sugar');
  const waveEl   = document.getElementById('wave');
  const killsEl  = document.getElementById('kills');
  const btnNext  = document.getElementById('btn-next-wave');
  const hudEl    = document.getElementById('hud');

  Game.cb.onLifeChange  = v => { lifeEl.textContent  = v; };
  Game.cb.onSugarChange = v => { sugarEl.textContent = v; };
  Game.cb.onScoreChange = () => {};
  Game.cb.onKillsChange = v => { killsEl.textContent = v; };
  Game.cb.onWaveDone    = (w, timer) => {
    waveEl.textContent = w;
    btnNext.classList.remove('hidden');
  };

  // --- UI ---
  const UI = {
    selectedCell: null,
    selectedTower: null,

    openTowerPlaceMenu(col, row) {
      this.selectedCell  = { col, row };
      this.selectedTower = null;
      const menu    = document.getElementById('tower-menu');
      const btnsEl  = document.getElementById('tower-menu-buttons');
      const titleEl = document.getElementById('tower-menu-title');
      titleEl.textContent = '砲台を設置';
      btnsEl.innerHTML = '';
      Object.values(TOWERS).forEach(def => {
        const btn = document.createElement('button');
        btn.className = 'tower-btn';
        const afford = Game.getSugar() >= def.cost;
        if (!afford) btn.classList.add('disabled');
        btn.innerHTML = `<span class="t-emoji">${def.emoji}</span><span class="t-name">${def.name}</span><span class="t-cost">🍭${def.cost}</span>`;
        btn.onclick = () => {
          if (!afford) return;
          const t = Game.placeTower(def.id, col, row);
          if (t) {
            buildTowerMesh(t);
            GRID[row][col] = 9; // mark occupied
            if (cellPlaceHighlight[col+'_'+row]) {
              cellPlaceHighlight[col+'_'+row].material.alpha = 0;
            }
          }
          this.closeTowerMenu();
        };
        btnsEl.appendChild(btn);
      });
      menu.classList.remove('hidden');
    },

    openTowerUpgradeMenu(tower) {
      this.selectedTower = tower;
      this.selectedCell  = null;
      const menu    = document.getElementById('tower-menu');
      const btnsEl  = document.getElementById('tower-menu-buttons');
      const titleEl = document.getElementById('tower-menu-title');
      const def = TOWERS[tower.id];
      titleEl.textContent = def.name + ' Lv' + (tower.level + 1);
      btnsEl.innerHTML = '';

      if (tower.level < 2) {
        const upCost = Math.floor(def.cost * def.upgradeCostMul);
        const afford  = Game.getSugar() >= upCost;
        const upBtn   = document.createElement('button');
        upBtn.className = 'tower-btn' + (afford ? '' : ' disabled');
        upBtn.innerHTML = `<span class="t-emoji">⬆️</span><span class="t-name">強化</span><span class="t-cost">🍭${upCost}</span>`;
        upBtn.onclick = () => {
          Game.upgradeTower(tower);
          this.closeTowerMenu();
        };
        btnsEl.appendChild(upBtn);
      }

      const refund = Math.floor(def.cost * 0.5);
      const sellBtn = document.createElement('button');
      sellBtn.className = 'tower-btn';
      sellBtn.innerHTML = `<span class="t-emoji">💰</span><span class="t-name">売却</span><span class="t-cost">🍭+${refund}</span>`;
      sellBtn.onclick = () => {
        removeTowerMesh(tower);
        GRID[tower.row][tower.col] = 0;
        if (cellPlaceHighlight[tower.col+'_'+tower.row]) {
          cellPlaceHighlight[tower.col+'_'+tower.row].material.alpha = 0;
        }
        Game.sellTower(tower);
        this.closeTowerMenu();
      };
      btnsEl.appendChild(sellBtn);
      menu.classList.remove('hidden');
    },

    closeTowerMenu() {
      document.getElementById('tower-menu').classList.add('hidden');
      this.selectedCell  = null;
      this.selectedTower = null;
    },
  };
  window.UI = UI;

  // --- Tap input ---
  const LS_KEY = 'okashi-defense.highscore';
  let highscore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  let gamePhase = 'title'; // title | playing | over | clear

  function showOverlay(id) {
    ['overlay-title','overlay-clear','overlay-gameover'].forEach(n => {
      document.getElementById(n).classList.add('hidden');
    });
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  function startGame() {
    gamePhase = 'playing';
    showOverlay(null);
    hudEl.classList.remove('hidden');
    btnNext.classList.add('hidden');
    waveEl.textContent  = '0';

    // Clear old tower meshes
    towerMeshMap.forEach((v, k) => { v.root.dispose(); });
    towerMeshMap.clear();
    // Reset grid occupied markers
    for (let r = 0; r < GRID.length; r++)
      for (let c = 0; c < GRID[r].length; c++)
        if (GRID[r][c] === 9) GRID[r][c] = 0;

    Game.startGame();
  }

  Game.cb.onGameOver = function (s) {
    gamePhase = 'over';
    Sound.play('gameover');
    if (s > highscore) { highscore = s; localStorage.setItem(LS_KEY, highscore); }
    document.getElementById('go-score').textContent = s;
    document.getElementById('go-best').textContent  = highscore;
    hudEl.classList.add('hidden');
    showOverlay('overlay-gameover');
  };

  Game.cb.onClear = function (s) {
    gamePhase = 'clear';
    Sound.play('clear');
    if (s > highscore) { highscore = s; localStorage.setItem(LS_KEY, highscore); }
    document.getElementById('clear-score').textContent = s;
    document.getElementById('clear-best').textContent  = highscore;
    hudEl.classList.add('hidden');
    showOverlay('overlay-clear');
  };

  let lastTap = 0;
  canvas.addEventListener('pointerdown', e => {
    const now = Date.now();
    if (now - lastTap < 120) return;
    lastTap = now;

    if (gamePhase === 'title' || gamePhase === 'over' || gamePhase === 'clear') {
      startGame();
      return;
    }
    if (gamePhase !== 'playing') return;

    // Check if tower menu is open
    if (!document.getElementById('tower-menu').classList.contains('hidden')) {
      UI.closeTowerMenu();
      return;
    }

    const pick = scene.pick(e.clientX, e.clientY);
    if (!pick.hit || !pick.pickedMesh) return;
    const meta = pick.pickedMesh.metadata;
    if (!meta) return;

    if (meta.type === 'cell') {
      const key = meta.col + '_' + meta.row;
      if (GRID[meta.row][meta.col] === 0) {
        UI.openTowerPlaceMenu(meta.col, meta.row);
      }
    } else if (meta.type === 'tower') {
      UI.openTowerUpgradeMenu(meta.tower);
    }
  });

  btnNext.addEventListener('click', e => {
    e.stopPropagation();
    Game.skipPrep();
    btnNext.classList.add('hidden');
  });

  // --- Render loop ---
  engine.runRenderLoop(() => {
    if (gamePhase === 'playing') {
      Game.tick();
      waveEl.textContent = Game.getWave();
    }
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
})();
