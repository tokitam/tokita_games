// スライムボウリング main.js — BabylonJS シーン・物理・入力・演出

const PARTICLE_TEX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAS0lEQVQoU2NkIAL8////fyBdwMiADhjRNYCMYMQmgdUJMEOwKcLqBGwK8DoBmwJsijE8jU0xhqexKcZwGTbFGC7DphjDZdgUA4QBACvgIAssCYHrAAAAAElFTkSuQmCC';

// ピン配置（10ピン正三角形）
const PIN_POSITIONS = (() => {
  const positions = [];
  const sp = 0.9;
  const baseZ = 15;
  for (let row = 0; row < 4; row++) {
    const count = row + 1;
    const startX = -(row * sp / 2);
    for (let col = 0; col < count; col++) {
      positions.push({ x: startX + col * sp, z: baseZ - row * sp * 0.866 });
    }
  }
  return positions;
})();

let engine, scene, ball, pinMeshes = [];
let standingPins = new Array(10).fill(true);
let isRolling = false;
let panX = 0, targetPanX = 0;
let squashT = 0;
let ballFollowCam = false;
let judgeTimer = null;
let sceneReady = false;

function initScene() {
  if (sceneReady) return;
  sceneReady = true;

  const canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true);

  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.06, 0.06, 0.14, 1);

  // 物理
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), new BABYLON.CannonJSPlugin());

  // カメラ（固定・投球者目線）
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.05, 24, new BABYLON.Vector3(0, 1.5, 9), scene);
  cam.inputs.clear();

  // ライト
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.75;
  const spot = new BABYLON.PointLight('spot', new BABYLON.Vector3(0, 10, 9), scene);
  spot.intensity = 0.55;

  buildLane();
  buildBall();
  buildPins(false);

  scene.registerBeforeRender(() => {
    if (!isRolling) {
      squashT += 0.1;
      const s = 1 + 0.04 * Math.sin(squashT * 8);
      ball.scaling.set(1 / s, s, 1 / s);
      panX += (targetPanX - panX) * 0.14;
      ball.position.x = panX;
    }
    if (ballFollowCam) {
      const target = ball.position.add(new BABYLON.Vector3(0, 1.5, 4));
      cam.target = BABYLON.Vector3.Lerp(cam.target, target, 0.07);
    }
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  setTimeout(() => engine.resize(), 50);
  setupInput();
}

function buildLane() {
  const laneMat = new BABYLON.StandardMaterial('lane', scene);
  laneMat.diffuseColor = new BABYLON.Color3(0.82, 0.68, 0.38);

  const lane = BABYLON.MeshBuilder.CreateBox('lane', { width: 4.4, height: 0.2, depth: 22 }, scene);
  lane.position.set(0, -0.1, 10);
  lane.material = laneMat;
  lane.physicsImpostor = new BABYLON.PhysicsImpostor(lane, BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, restitution: 0.05, friction: 0.85 }, scene);

  // 矢印ガイド（レーン上の的）
  const arrowMat = new BABYLON.StandardMaterial('arrow', scene);
  arrowMat.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.2);
  [-1, 0, 1].forEach(ox => {
    const tri = BABYLON.MeshBuilder.CreateBox(`arrow_${ox}`, { width: 0.12, height: 0.01, depth: 0.4 }, scene);
    tri.position.set(ox * 0.7, 0.01, 5);
    tri.material = arrowMat;
  });

  const gutMat = new BABYLON.StandardMaterial('gut', scene);
  gutMat.diffuseColor = new BABYLON.Color3(0.32, 0.22, 0.12);
  [-2.9, 2.9].forEach(x => {
    const g = BABYLON.MeshBuilder.CreateBox(`gut_${x}`, { width: 0.7, height: 0.15, depth: 22 }, scene);
    g.position.set(x, -0.175, 10);
    g.material = gutMat;
    g.physicsImpostor = new BABYLON.PhysicsImpostor(g, BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.05, friction: 0.5 }, scene);
  });

  const wall = BABYLON.MeshBuilder.CreateBox('wall', { width: 8, height: 4, depth: 0.5 }, scene);
  wall.position.set(0, 2, 21.5);
  wall.material = gutMat;
  wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, restitution: 0.15 }, scene);
}

function buildBall() {
  const mat = new BABYLON.StandardMaterial('ballMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.12, 0.88, 0.32);
  mat.alpha = 0.85;
  mat.specularColor = new BABYLON.Color3(1, 1, 1);
  mat.specularPower = 28;

  ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 0.85, segments: 12 }, scene);
  ball.material = mat;
  resetBall();
}

function resetBall() {
  if (ball.physicsImpostor) ball.physicsImpostor.dispose();
  ball.position.set(panX, 0.425, 0.5);
  ball.scaling.set(1, 1, 1);
  ball.physicsImpostor = new BABYLON.PhysicsImpostor(ball, BABYLON.PhysicsImpostor.SphereImpostor,
    { mass: 5, restitution: 0.2, friction: 0.7 }, scene);
  isRolling = false;
  ballFollowCam = false;
  const cam = scene.activeCamera;
  cam.target = new BABYLON.Vector3(0, 1.5, 9);
  cam.alpha = -Math.PI / 2;
  cam.beta = 1.05;
  cam.radius = 24;
}

function buildPins(rebuildOnly) {
  if (rebuildOnly) {
    pinMeshes.forEach(p => p && p.dispose());
    pinMeshes = [];
  }

  const bodyMat = new BABYLON.StandardMaterial('pinMat', scene);
  bodyMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  const stripeMat = new BABYLON.StandardMaterial('pinStripe', scene);
  stripeMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);

  PIN_POSITIONS.forEach((pos, i) => {
    if (rebuildOnly && !standingPins[i]) {
      pinMeshes[i] = null;
      return;
    }
    const body = BABYLON.MeshBuilder.CreateCylinder(`pin_${i}`, {
      diameterTop: 0.26,
      diameterBottom: 0.38,
      height: 1.4,
      tessellation: 10
    }, scene);
    body.position.set(pos.x, 0.7, pos.z);
    body.material = i % 3 === 0 ? stripeMat : bodyMat;
    body.physicsImpostor = new BABYLON.PhysicsImpostor(body, BABYLON.PhysicsImpostor.CylinderImpostor,
      { mass: 1, restitution: 0.35, friction: 0.5 }, scene);
    pinMeshes[i] = body;
  });
}

// 入力
let sx = 0, sy = 0, movedX = 0;

function setupInput() {
  const canvas = document.getElementById('renderCanvas');

  canvas.addEventListener('pointerdown', e => {
    sx = e.clientX;
    sy = e.clientY;
    movedX = 0;
  });

  canvas.addEventListener('pointermove', e => {
    if (Game.getState() !== 'aiming') return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 6) {
      movedX = dx;
      targetPanX = Math.max(-1.5, Math.min(1.5, panX + dx * 0.005));
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (Game.getState() !== 'aiming') return;
    const dy = sy - e.clientY;
    const dx = e.clientX - sx;
    if (dy > 55 && Math.abs(movedX) < 25) {
      const angle = Math.atan2(dx, dy) * 0.38;
      const speed = Math.min(28, Math.max(13, Math.sqrt(dx * dx + dy * dy) * 0.14));
      throwBall(angle, speed);
    } else {
      panX = targetPanX;
    }
  });
}

function throwBall(angle, speed) {
  Game.setState('rolling');
  isRolling = true;
  Sound.play('roll');

  ball.scaling.set(1.3, 0.65, 1.3);
  setTimeout(() => ball.scaling.set(1, 1, 1), 160);

  ball.physicsImpostor.setLinearVelocity(
    new BABYLON.Vector3(Math.sin(angle) * speed, 0, speed)
  );
  ball.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(-speed * 0.35, 0, 0));
  ballFollowCam = true;

  pinMeshes.forEach(pin => {
    if (!pin) return;
    ball.physicsImpostor.registerOnPhysicsCollide(pin.physicsImpostor, () => {
      Sound.play('hit');
      ball.scaling.set(1.25, 0.65, 1.25);
      setTimeout(() => ball.scaling.set(1, 1, 1), 180);
    });
  });

  clearTimeout(judgeTimer);
  judgeTimer = setTimeout(doJudge, 3000);
}

function doJudge() {
  ballFollowCam = false;
  const cam = scene.activeCamera;
  cam.target = new BABYLON.Vector3(0, 1.5, 9);
  cam.alpha = -Math.PI / 2;
  cam.beta = 1.05;
  cam.radius = 24;

  const localY = new BABYLON.Vector3(0, 1, 0);
  const worldUp = BABYLON.Vector3.Up();
  let knocked = 0;

  const preFrame = Game.getCurrentFrame();
  const preThrow = Game.getCurrentThrow();

  pinMeshes.forEach((pin, i) => {
    if (!pin) return;
    const worldY = BABYLON.Vector3.TransformNormal(localY, pin.getWorldMatrix()).normalize();
    if (BABYLON.Vector3.Dot(worldY, worldUp) < 0.7) {
      knocked++;
      standingPins[i] = false;
      pin.setEnabled(false);
    }
  });

  Game.recordThrow(knocked);
  const frames = Game.getFrames();

  if (preThrow === 0 && knocked === 10) {
    showMsg('STRIKE！ ⭐', '#ffe000');
    Sound.play('strike');
    spawnParticles(ball.position.clone());
  } else if (preThrow === 1 && (frames[preFrame][0] + knocked) === 10) {
    showMsg('SPARE！ 👏', '#00eeff');
    Sound.play('spare');
  }

  const next = Game.advance();
  updateHUD();

  setTimeout(() => {
    if (next === 'next-throw') {
      resetBall();
      ball.position.x = panX;
      Game.setState('aiming');
    } else if (next === 'next-frame') {
      standingPins = new Array(10).fill(true);
      buildPins(true);
      panX = 0;
      targetPanX = 0;
      resetBall();
      Game.setState('aiming');
    } else {
      showResult();
    }
  }, 1800);
}

function spawnParticles(pos) {
  const ps = new BABYLON.ParticleSystem('stars', 120, scene);
  ps.particleTexture = new BABYLON.Texture(PARTICLE_TEX, scene);
  ps.emitter = pos;
  ps.minEmitBox = new BABYLON.Vector3(-0.4, 0, -0.4);
  ps.maxEmitBox = new BABYLON.Vector3(0.4, 0.4, 0.4);
  ps.color1 = new BABYLON.Color4(1, 0.9, 0, 1);
  ps.color2 = new BABYLON.Color4(0.2, 0.8, 1, 1);
  ps.colorDead = new BABYLON.Color4(1, 0.3, 0, 0);
  ps.minSize = 0.08; ps.maxSize = 0.3;
  ps.minLifeTime = 0.6; ps.maxLifeTime = 1.6;
  ps.emitRate = 120;
  ps.gravity = new BABYLON.Vector3(0, -4, 0);
  ps.direction1 = new BABYLON.Vector3(-5, 10, -5);
  ps.direction2 = new BABYLON.Vector3(5, 10, 5);
  ps.minEmitPower = 2; ps.maxEmitPower = 5;
  ps.updateSpeed = 0.015;
  ps.start();
  setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 2000); }, 900);
}

function showMsg(text, color) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function updateHUD() {
  document.getElementById('current-frame').textContent =
    `${Math.min(Game.getCurrentFrame() + 1, 5)} / 5`;
  document.getElementById('current-throw').textContent =
    `${Game.getCurrentThrow() + 1} 投目`;
}

function showResult() {
  const score = Game.calcTotal();
  const prev = parseInt(localStorage.getItem('slime-bowling.highscore') || '0');
  const best = Math.max(score, prev);
  localStorage.setItem('slime-bowling.highscore', best);
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-best').textContent = best;
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-result').classList.remove('hidden');
}

// 画面遷移
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('title-best').textContent =
    localStorage.getItem('slime-bowling.highscore') || '0';

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    initScene();
    Game.init();
    updateHUD();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    standingPins = new Array(10).fill(true);
    buildPins(true);
    panX = 0; targetPanX = 0;
    resetBall();
    Game.init();
    updateHUD();
  });

  document.getElementById('btn-title').addEventListener('click', () => {
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
    document.getElementById('title-best').textContent =
      localStorage.getItem('slime-bowling.highscore') || '0';
  });
});
