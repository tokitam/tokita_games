(function () {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true);
  const scene  = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.55, 0.82, 0.95, 1);

  // Physics
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), new BABYLON.CannonJSPlugin());

  // Camera
  const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.5, 16, new BABYLON.Vector3(0, 1.5, 0), scene);
  camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;
  camera.lowerAlphaLimit  = camera.upperAlphaLimit  = camera.alpha;
  camera.lowerBetaLimit   = camera.upperBetaLimit   = camera.beta;

  // Lights
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  const dir = new BABYLON.DirectionalLight('d', new BABYLON.Vector3(-1, -2, -0.5), scene);
  dir.intensity = 0.7;

  // --- Room geometry ---
  const ROOM_W = 12, ROOM_D = 10, ROOM_H = 6;
  const floorMat = new BABYLON.StandardMaterial('floor', scene);
  floorMat.diffuseColor = new BABYLON.Color3(0.92, 0.85, 0.72);

  function makeWall(name, w, h, px, py, pz, ry) {
    const m = new BABYLON.StandardMaterial(name+'m', scene);
    m.diffuseColor = new BABYLON.Color3(0.85, 0.82, 0.95);
    const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: 0.2 }, scene);
    box.position.set(px, py, pz);
    if (ry) box.rotation.y = ry;
    box.material = m;
    box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.2 }, scene);
    return box;
  }

  // Floor
  const floor = BABYLON.MeshBuilder.CreateBox('floor', { width: ROOM_W, height: 0.2, depth: ROOM_D }, scene);
  floor.position.set(0, -0.1, 0);
  floor.material = floorMat;
  floor.physicsImpostor = new BABYLON.PhysicsImpostor(floor, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.3 }, scene);

  // Back wall
  makeWall('backWall', ROOM_W, ROOM_H, 0, ROOM_H/2, -ROOM_D/2);
  // Side walls
  makeWall('leftWall',  ROOM_D, ROOM_H, -ROOM_W/2, ROOM_H/2, 0, Math.PI/2);
  makeWall('rightWall', ROOM_D, ROOM_H,  ROOM_W/2, ROOM_H/2, 0, Math.PI/2);
  // Ceiling
  const ceil = BABYLON.MeshBuilder.CreateBox('ceil', { width: ROOM_W, height: 0.2, depth: ROOM_D }, scene);
  ceil.position.set(0, ROOM_H, 0);
  ceil.isVisible = false;
  ceil.physicsImpostor = new BABYLON.PhysicsImpostor(ceil, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);
  // Front wall (invisible)
  const frontWall = BABYLON.MeshBuilder.CreateBox('front', { width: ROOM_W, height: ROOM_H, depth: 0.2 }, scene);
  frontWall.position.set(0, ROOM_H/2, ROOM_D/2);
  frontWall.isVisible = false;
  frontWall.physicsImpostor = new BABYLON.PhysicsImpostor(frontWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);

  // --- Storage boxes ---
  const BOX_COLORS = {
    red:    new BABYLON.Color3(0.9, 0.2, 0.2),
    blue:   new BABYLON.Color3(0.2, 0.4, 0.9),
    yellow: new BABYLON.Color3(0.95, 0.82, 0.1),
  };
  const BOX_COLOR_NAMES = ['red', 'blue', 'yellow'];

  function makeStorageBox(colorName, px, pz) {
    const color  = BOX_COLORS[colorName];
    const bw = 2.4, bh = 1.5, bd = 2.0;
    const thick  = 0.15;
    const mat    = new BABYLON.StandardMaterial('bxm_'+colorName, scene);
    mat.diffuseColor = color;
    mat.alpha = 0.85;

    const parts = [
      // bottom
      { w: bw, h: thick, d: bd, y: 0 },
      // back
      { w: bw, h: bh, d: thick, y: bh/2, z: -bd/2 },
      // left
      { w: thick, h: bh, d: bd, y: bh/2, x: -bw/2 },
      // right
      { w: thick, h: bh, d: bd, y: bh/2, x:  bw/2 },
    ];
    parts.forEach((p, i) => {
      const b = BABYLON.MeshBuilder.CreateBox('bxp_'+i+'_'+colorName, { width: p.w, height: p.h, depth: p.d }, scene);
      b.position.set(px + (p.x||0), (p.y||0), pz + (p.z||0));
      b.material = mat;
      b.physicsImpostor = new BABYLON.PhysicsImpostor(b, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);
    });

    // Label
    const plane = BABYLON.MeshBuilder.CreatePlane('lbl_'+colorName, { width: 0.8, height: 0.4 }, scene);
    plane.position.set(px, bh + 0.1, pz - bd/2 + 0.1);
    const lmat  = new BABYLON.StandardMaterial('lbm_'+colorName, scene);
    const tex   = new BABYLON.DynamicTexture('lbt_'+colorName, { width: 128, height: 64 }, scene);
    tex.drawText(colorName === 'red' ? '🔴' : colorName === 'blue' ? '🔵' : '🟡', 8, 50, '36px serif', 'white', 'transparent');
    lmat.diffuseTexture  = tex;
    lmat.backFaceCulling = false;
    lmat.hasAlpha = true;
    plane.material = lmat;

    // Register AABB for scoring
    OkatGame.addBox({
      minX: px - bw/2 + thick, maxX: px + bw/2 - thick,
      minY: 0,                   maxY: bh - 0.1,
      minZ: pz - bd/2 + thick,  maxZ: pz + bd/2,
      color: colorName,
    });
  }

  const BOX_Z = -ROOM_D/2 + 1.2;
  makeStorageBox('red',    -4, BOX_Z);
  makeStorageBox('blue',    0, BOX_Z);
  makeStorageBox('yellow',  4, BOX_Z);

  // --- Toys ---
  const TOYS = [
    { type: 'box',    name: 'つみき',     restitution: 0.3 },
    { type: 'sphere', name: 'ボール',      restitution: 0.7 },
    { type: 'cyl',    name: 'つつ',        restitution: 0.3 },
    { type: 'plush',  name: 'ぬいぐるみ',  restitution: 0.05 },
  ];

  const toyObjects = []; // {mesh, imposter, color, stored}

  function makeToy(toyDef, colorName, px, py, pz) {
    const color = BOX_COLORS[colorName];
    const mat   = new BABYLON.StandardMaterial('tm_'+Math.random(), scene);
    mat.diffuseColor = color;

    let mesh;
    if (toyDef.type === 'box') {
      mesh = BABYLON.MeshBuilder.CreateBox('toy', { size: 0.7 }, scene);
    } else if (toyDef.type === 'sphere') {
      mesh = BABYLON.MeshBuilder.CreateSphere('toy', { diameter: 0.7 }, scene);
    } else if (toyDef.type === 'cyl') {
      mesh = BABYLON.MeshBuilder.CreateCylinder('toy', { diameter: 0.5, height: 0.9 }, scene);
    } else {
      // plush: round sphere + ears
      mesh = BABYLON.MeshBuilder.CreateSphere('toy', { diameter: 0.7 }, scene);
      const ear1 = BABYLON.MeshBuilder.CreateSphere('ear1', { diameter: 0.28 }, scene);
      ear1.parent = mesh; ear1.position.set(-0.25, 0.35, 0); ear1.material = mat;
      const ear2 = BABYLON.MeshBuilder.CreateSphere('ear2', { diameter: 0.28 }, scene);
      ear2.parent = mesh; ear2.position.set(0.25, 0.35, 0); ear2.material = mat;
    }
    mesh.position.set(px, py, pz);
    mesh.material = mat;

    const impostorType = toyDef.type === 'box' ? BABYLON.PhysicsImpostor.BoxImpostor
                      : toyDef.type === 'cyl'  ? BABYLON.PhysicsImpostor.CylinderImpostor
                      :                           BABYLON.PhysicsImpostor.SphereImpostor;
    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, impostorType, {
      mass: 1, restitution: toyDef.restitution, friction: 0.5,
    }, scene);

    // Invisible pick-hit enlarger (slightly bigger sphere)
    const hitSphere = BABYLON.MeshBuilder.CreateSphere('hit_'+Math.random(), { diameter: 1.0 }, scene);
    hitSphere.parent   = mesh;
    hitSphere.isVisible = false;
    hitSphere.isPickable = true;
    hitSphere.metadata = { toy: null }; // set below

    const obj = { mesh, colorName, stored: false, hitSphere };
    hitSphere.metadata.toy = obj;
    toyObjects.push(obj);
    return obj;
  }

  function spawnToys() {
    toyObjects.length = 0;
    OkatGame.clearBoxes();
    // re-add boxes (they're already built but we need to re-register bounds)
    // Actually clearBoxes only clears the array used by tryStore; re-register:
    OkatGame.addBox({ minX:-5.2, maxX:-2.8, minY:0, maxY:1.4, minZ:-4.9, maxZ:-2.7, color:'red'    });
    OkatGame.addBox({ minX:-1.2, maxX: 1.2, minY:0, maxY:1.4, minZ:-4.9, maxZ:-2.7, color:'blue'   });
    OkatGame.addBox({ minX: 2.8, maxX: 5.2, minY:0, maxY:1.4, minZ:-4.9, maxZ:-2.7, color:'yellow' });

    // Use simple positions for 15 toys
    for (let i = 0; i < 15; i++) {
      const toyDef    = TOYS[i % TOYS.length];
      const colorName = BOX_COLOR_NAMES[i % 3];
      const col = (i % 5) - 2;
      const row = Math.floor(i / 5);
      makeToy(toyDef, colorName, col * 2.0, 1.0 + row * 0.5, row * 1.5);
    }
  }

  // --- Grab & throw ---
  let grabbed     = null; // { obj, savedImpostor }
  let swipeTrail  = [];   // last 5 pointer positions with timestamps
  let isDragging  = false;

  canvas.addEventListener('pointerdown', e => {
    if (OkatGame.getState() !== 'playing') return;
    const pick = scene.pick(e.clientX, e.clientY, m => m.isPickable && m.metadata && m.metadata.toy);
    if (!pick.hit || !pick.pickedMesh || !pick.pickedMesh.metadata || !pick.pickedMesh.metadata.toy) return;

    const obj = pick.pickedMesh.metadata.toy;
    if (!obj || obj.stored) return;

    Sound.play('grab');
    grabbed    = obj;
    isDragging = false;
    swipeTrail = [{ x: e.clientX, y: e.clientY, t: Date.now() }];

    // Suspend physics by zeroing velocity and fixing
    obj.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
    obj.mesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
    obj.mesh.physicsImpostor.sleep();
  });

  canvas.addEventListener('pointermove', e => {
    if (!grabbed) return;
    isDragging = true;
    swipeTrail.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (swipeTrail.length > 6) swipeTrail.shift();

    // Move toy to follow finger in screen space → world plane at toy's y
    const ray  = scene.createPickingRay(e.clientX, e.clientY, null, camera);
    const t    = (grabbed.mesh.position.y - ray.origin.y) / ray.direction.y;
    if (t > 0) {
      const wp = ray.origin.add(ray.direction.scale(t));
      grabbed.mesh.position.set(
        Math.max(-ROOM_W/2 + 0.5, Math.min(ROOM_W/2 - 0.5, wp.x)),
        grabbed.mesh.position.y,
        Math.max(-ROOM_D/2 + 0.5, Math.min(ROOM_D/2 - 0.5, wp.z)),
      );
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (!grabbed) return;
    const obj = grabbed;
    grabbed = null;

    obj.mesh.physicsImpostor.wakeUp();

    if (!isDragging || swipeTrail.length < 2) { isDragging = false; return; }

    // Compute swipe velocity from recent trail
    const recent = swipeTrail.filter(p => Date.now() - p.t < 200);
    if (recent.length < 2) { isDragging = false; return; }
    const a = recent[0], b = recent[recent.length - 1];
    const dt = Math.max((b.t - a.t) / 1000, 0.016);
    const dxPx = b.x - a.x;
    const dyPx = b.y - a.y;

    const factor = 18;
    const vx = (dxPx / dt / canvas.clientWidth)  * factor;
    const vz = (dyPx / dt / canvas.clientHeight) * factor * -1; // dy → -Z
    const vy = 4.5 + Math.abs(dyPx / dt / canvas.clientHeight) * 3;

    obj.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vx, vy, vz));
    obj.mesh.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(
      (Math.random()-0.5)*4, (Math.random()-0.5)*4, (Math.random()-0.5)*4
    ));
    isDragging = false;
  });

  // --- Storage check ---
  let storeCheckInterval = null;

  function startStoreCheck() {
    clearInterval(storeCheckInterval);
    storeCheckInterval = setInterval(() => {
      if (OkatGame.getState() !== 'playing') return;
      for (const obj of toyObjects) {
        if (obj.stored) continue;
        const p = obj.mesh.position;
        const v = obj.mesh.physicsImpostor.getLinearVelocity();
        const speed = v ? v.length() : 0;
        if (speed < 0.5) {
          const result = OkatGame.tryStore(obj.colorName, p.x, p.y, p.z);
          if (result) {
            obj.stored = true;
            // Shrink and remove
            let t = 0;
            const unsub = scene.onBeforeRenderObservable.add(() => {
              t += 0.08;
              obj.mesh.scaling.setAll(1 - t);
              if (t >= 1) {
                obj.mesh.physicsImpostor.setMass(0);
                obj.mesh.isVisible = false;
                scene.onBeforeRenderObservable.remove(unsub);
              }
            });
            // Star particles
            const ps = new BABYLON.ParticleSystem('stars', 40, scene);
            ps.particleTexture = new BABYLON.Texture('https://cdn.babylonjs.com/textures/flare.png', scene);
            ps.emitter = new BABYLON.Vector3(p.x, p.y + 0.5, p.z);
            ps.color1  = result.isMatch ? new BABYLON.Color4(1,1,0,1) : new BABYLON.Color4(1,1,1,1);
            ps.color2  = new BABYLON.Color4(0.8, 0.4, 1, 0.8);
            ps.colorDead = new BABYLON.Color4(0,0,0,0);
            ps.minSize = 0.05; ps.maxSize = 0.2;
            ps.minLifeTime = 0.3; ps.maxLifeTime = 0.6;
            ps.emitRate = 200; ps.minEmitPower = 1.5; ps.maxEmitPower = 3;
            ps.start();
            setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 700); }, 200);

            // HUD flash
            showFlash(result.isMatch ? '✨ ピッタリ！ +' + result.pts : '+' + result.pts);
          }
        }
      }
    }, 300);
  }

  // --- HUD ---
  const timerEl   = document.getElementById('timer');
  const storedEl  = document.getElementById('stored');
  const scoreHud  = document.getElementById('score-el');
  const comboEl   = document.getElementById('combo-msg');
  const flashEl   = document.getElementById('store-flash');
  const hudEl     = document.getElementById('hud');

  OkatGame.cb.onTimer  = v => { timerEl.textContent = v; };
  OkatGame.cb.onStored = (s, t) => { storedEl.textContent = s + '/' + t; };
  OkatGame.cb.onScore  = v => { scoreHud.textContent = v; };
  OkatGame.cb.onCombo  = (c, pts) => {
    comboEl.textContent = 'コンボ×' + c + '！';
    comboEl.classList.remove('hidden');
    clearTimeout(comboEl._t);
    comboEl._t = setTimeout(() => comboEl.classList.add('hidden'), 1200);
  };

  function showFlash(text) {
    flashEl.textContent = text;
    flashEl.classList.remove('hidden');
    clearTimeout(flashEl._t);
    flashEl._t = setTimeout(() => flashEl.classList.add('hidden'), 700);
  }

  // Game end callbacks
  const LS_KEY = 'okataduke-panic.highscore';
  let highscore  = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  let gamePhase  = 'title';

  function showOverlay(id) {
    ['overlay-title','overlay-gameover']
      .forEach(n => document.getElementById(n).classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  function endGame(cleared, s) {
    gamePhase = 'over';
    clearInterval(storeCheckInterval);
    hudEl.classList.add('hidden');
    if (s > highscore) { highscore = s; localStorage.setItem(LS_KEY, highscore); }
    document.getElementById('go-emoji').textContent  = cleared ? '🎉' : '⏰';
    document.getElementById('go-title').textContent  = cleared ? 'おかたづけ完了！' : 'タイムアップ！';
    document.getElementById('go-score').textContent  = s;
    document.getElementById('go-best').textContent   = highscore;
    showOverlay('overlay-gameover');
    // Room glow on clear
    if (cleared) {
      let phase = 0;
      const glow = scene.onBeforeRenderObservable.add(() => {
        phase += 0.08;
        hemi.intensity = 0.7 + Math.sin(phase) * 0.5;
        if (phase > Math.PI * 4) { hemi.intensity = 0.7; scene.onBeforeRenderObservable.remove(glow); }
      });
    }
  }

  OkatGame.cb.onClear    = (s) => endGame(true,  s);
  OkatGame.cb.onGameOver = (s) => endGame(false, s);

  function startGame() {
    gamePhase = 'playing';
    // Dispose old toys
    toyObjects.forEach(o => o.mesh.dispose());
    showOverlay(null);
    hudEl.classList.remove('hidden');
    spawnToys();
    OkatGame.start();
    startStoreCheck();
  }

  // --- Tap to start/restart ---
  canvas.addEventListener('pointerup', e => {
    if (gamePhase === 'title' || gamePhase === 'over') {
      const pick = scene.pick(e.clientX, e.clientY, m => m.isPickable && m.metadata && m.metadata.toy);
      if (!pick.hit) {
        startGame();
      }
    }
  }, true);

  document.getElementById('overlay-title').addEventListener('pointerdown', () => startGame());
  document.getElementById('overlay-gameover').addEventListener('pointerdown', () => startGame());

  // --- Render loop ---
  engine.runRenderLoop(() => { scene.render(); });
  window.addEventListener('resize', () => engine.resize());
})();
