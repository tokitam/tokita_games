// BabylonJS scene and game loop for ヘクサバースト
(function() {
  var COLOR_MAP = {
    red:    '#f43f5e',
    blue:   '#3b82f6',
    green:  '#22c55e',
    yellow: '#eab308',
    purple: '#a855f7'
  };

  var engine, scene, camera;
  var cellMeshes  = new Map(); // key -> BABYLON.Mesh
  var ghostMeshes = [];        // temp ghost meshes
  var animating   = false;

  // DOM refs
  var elScore     = document.getElementById('score');
  var elNextDots  = document.getElementById('next-dots');
  var elHUD       = document.getElementById('hud');
  var elOverlay   = document.getElementById('overlay');
  var elOvTitle   = document.getElementById('ov-title');
  var elOvGameover= document.getElementById('ov-gameover');
  var elTitleBest = document.getElementById('title-best');
  var elGoScore   = document.getElementById('go-score');
  var elGoBest    = document.getElementById('go-best');

  // ---- helpers ----

  function hexColor(str) {
    return BABYLON.Color3.FromHexString(COLOR_MAP[str] || '#ffffff');
  }

  function makeCylinder(q, r, h, color, alpha) {
    var pos  = HexGrid.hexToWorld(q, r, h);
    var mesh = BABYLON.MeshBuilder.CreateCylinder('hex_' + q + '_' + r + '_' + h, {
      diameter:      HexGrid.HEX_SIZE * 1.8,
      height:        HexGrid.HEX_H * 0.88,
      tessellation:  6
    }, scene);
    mesh.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
    var mat = new BABYLON.StandardMaterial('mat_' + q + '_' + r + '_' + h, scene);
    mat.diffuseColor  = hexColor(color);
    mat.emissiveColor = hexColor(color).scale(0.25);
    mat.alpha         = alpha || 1;
    mesh.material     = mat;
    return mesh;
  }

  // ---- ghost clicks ----

  function clearGhosts() {
    ghostMeshes.forEach(function(m) { m.dispose(); });
    ghostMeshes = [];
  }

  function buildGhosts() {
    clearGhosts();
    if (Game.getPhase() !== 'playing' || animating) return;
    var nextColor = Game.nextQueue()[0];
    Game.emptyAdjacents().forEach(function(pos) {
      var m = makeCylinder(pos.q, pos.r, pos.h, nextColor, 0.35);
      m.isPickable = true;
      (function(q, r, h) {
        m.actionManager = new BABYLON.ActionManager(scene);
        // hover highlight
        m.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPointerOverTrigger, function() {
            m.material.alpha = 0.6;
          }
        ));
        m.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPointerOutTrigger, function() {
            m.material.alpha = 0.35;
          }
        ));
        m.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPickTrigger, function() {
            if (Game.getPhase() !== 'playing' || animating) return;
            Sound.init();
            doPlace(q, r, h);
          }
        ));
      })(pos.q, pos.r, pos.h);
      ghostMeshes.push(m);
    });
  }

  // ---- cell mesh sync ----

  function syncCellMeshes() {
    // remove obsolete
    cellMeshes.forEach(function(mesh, k) {
      if (!Game.cells().has(k)) { mesh.dispose(); cellMeshes.delete(k); }
    });
    // add new
    Game.cells().forEach(function(cell, k) {
      if (!cellMeshes.has(k)) {
        var m = makeCylinder(cell.q, cell.r, cell.h, cell.color, 1);
        m.isPickable = false;
        cellMeshes.set(k, m);
      }
    });
  }

  // ---- flash animation ----

  function flashAndRemove(keys, callback) {
    animating = true;
    var meshes = keys.map(function(k) { return cellMeshes.get(k); }).filter(Boolean);
    var t = 0;
    var id = setInterval(function() {
      t++;
      meshes.forEach(function(m) {
        if (m && m.material) m.material.emissiveColor = (t % 2 === 0)
          ? m.material.diffuseColor.scale(0.25)
          : BABYLON.Color3.White();
      });
      if (t >= 6) {
        clearInterval(id);
        keys.forEach(function(k) { Game.cells().delete(k); });
        syncCellMeshes();
        animating = false;
        if (callback) callback();
      }
    }, 80);
  }

  // ---- place logic ----

  function doPlace(q, r, h) {
    clearGhosts();
    Sound.play('place');
    var cleared = Game.place(q, r, h);
    syncCellMeshes();

    if (cleared.length) {
      Sound.play('clear');
      var bonus = Game.clearCells(cleared);
      flashAndRemove(cleared, function() {
        checkChains(function() {
          updateHUD();
          if (Game.isGameOver()) { endGame(); return; }
          buildGhosts();
        });
      });
    } else {
      updateHUD();
      if (Game.isGameOver()) { endGame(); return; }
      buildGhosts();
    }
  }

  function checkChains(callback) {
    var chains = Game.findChains();
    if (!chains.length) { if (callback) callback(); return; }
    Sound.play('chain');
    Game.clearCells(chains);
    flashAndRemove(chains, function() { checkChains(callback); });
  }

  // ---- HUD ----

  function updateHUD() {
    elScore.textContent = Game.score();
    var q = Game.nextQueue();
    elNextDots.innerHTML = '';
    q.forEach(function(color) {
      var d = document.createElement('div');
      d.className = 'next-dot';
      d.style.background = COLOR_MAP[color] || '#fff';
      elNextDots.appendChild(d);
    });
  }

  // ---- game flow ----

  function startGame() {
    // dispose all old meshes
    cellMeshes.forEach(function(m) { m.dispose(); });
    cellMeshes.clear();
    clearGhosts();

    Game.init();
    syncCellMeshes();
    buildGhosts();
    updateHUD();

    elOverlay.classList.add('hidden');
    elHUD.classList.remove('hidden');
    Game.setPhase('playing');
  }

  function endGame() {
    Sound.play('gameover');
    clearGhosts();
    Game.setPhase('gameover');
    elHUD.classList.add('hidden');
    elOvTitle.classList.add('hidden');
    elOvGameover.classList.remove('hidden');
    elGoScore.textContent = Game.score();
    elGoBest.textContent  = Game.highScore();
    elOverlay.classList.remove('hidden');
  }

  function showTitle() {
    elTitleBest.textContent = parseInt(localStorage.getItem('hex-block-3d.hs') || '0', 10);
    elOvTitle.classList.remove('hidden');
    elOvGameover.classList.add('hidden');
    elOverlay.classList.remove('hidden');
    elHUD.classList.add('hidden');
    Game.setPhase('title');
  }

  // ---- BabylonJS init ----

  function initScene() {
    var canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true);
    scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.03, 0.047, 0.078, 1);

    camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 3, Math.PI / 3.5, 18, BABYLON.Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 6;
    camera.upperRadiusLimit = 35;
    camera.upperBetaLimit   = Math.PI / 2 - 0.05;
    camera.attachControl(canvas, true);

    var light1 = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    light1.intensity = 0.8;
    var light2 = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene);
    light2.intensity = 0.5;

    // ground grid (visual only)
    var ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, scene);
    var gm = new BABYLON.StandardMaterial('gmat', scene);
    gm.diffuseColor  = new BABYLON.Color3(0.07, 0.09, 0.15);
    gm.emissiveColor = new BABYLON.Color3(0.03, 0.04, 0.08);
    ground.material  = gm;
    ground.isPickable = false;

    engine.runRenderLoop(function() { scene.render(); });
    window.addEventListener('resize', function() { engine.resize(); });

    // overlay click
    elOverlay.addEventListener('click', function() {
      Sound.init();
      startGame();
    });

    showTitle();
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
  } else {
    initScene();
  }
})();
