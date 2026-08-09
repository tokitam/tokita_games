import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { generateCity } from './citygen/generateCity.js';
import { subRng } from './citygen/rng.js';
import { buildCity } from './world/CityBuilder.js';
import { Environment } from './world/Environment.js';
import { CollisionWorld } from './collision/CollisionWorld.js';
import { CharacterController } from './player/CharacterController.js';
import { AnimationController } from './player/AnimationController.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { RobotManager } from './robots/RobotManager.js';
import { CoinManager } from './coins/CoinManager.js';
import { playCoin, playWave, playWarning, playGameOver, playFootstep, resume } from './sound.js';

// ── Game state ────────────────────────────────────────────────────────────────
let renderer, scene, env, world, controller, anim, cam;
let robotManager, coinManager;
let lastTime = null;
let elapsedTime = 0;
let gameRunning = false;
let footstepTimer = 0;
let warnTimer = 0;

// ── Pointer input ─────────────────────────────────────────────────────────────
const ptStart = { x: 0, y: 0, t: 0 };
let lastTapTime = 0;
let isPointerDown = false;
let isDragging = false;
let dragDX = 0, dragDY = 0;
let prevPX = 0, prevPY = 0;
let keyState = {};

// ── DOM helpers ───────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);

function showScreen(name) {
  ['title', 'hud', 'result'].forEach(s => el('screen-' + s).classList.toggle('hidden', s !== name));
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateHUD() {
  if (!coinManager) return;
  el('hud-score').textContent = `🪙 ${coinManager.score}`;
  el('hud-time').textContent  = `⏱ ${fmtTime(elapsedTime)}`;
  el('hud-wave').textContent  = `Wave ${coinManager.wave}`;
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Title screen setup ────────────────────────────────────────────────────────
function setupTitle() {
  const best = parseInt(localStorage.getItem('robo-panic.best') || '0');
  el('title-best').textContent = best > 0 ? best : '---';
  el('btn-start').onclick = () => startGame();
}

// ── Game startup ──────────────────────────────────────────────────────────────
function startGame() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  elapsedTime = 0; gameRunning = false; warnTimer = 0;
  resume();
  showScreen('hud');

  if (!renderer) initRenderer();

  const city = generateCity(seed);
  scene = new THREE.Scene();
  env   = new Environment(scene);
  scene.add(buildCity(city, subRng(seed, 100)));
  world = new CollisionWorld(city);

  controller = new CharacterController(world, city.spawn);
  scene.add(controller.root);
  attachPlaceholder();
  anim = null;
  loadCharacter().catch(() => {});

  cam = new ThirdPersonCamera(renderer.domElement.width / renderer.domElement.height, city.spawn.heading);

  if (robotManager) robotManager.dispose();
  if (coinManager) coinManager.dispose();
  robotManager = new RobotManager(scene, city, world, seed);
  coinManager  = new CoinManager(scene, city, world);

  el('screen-glow').style.opacity = 0;
  updateHUD();
  lastTime = null;
  gameRunning = true;
}

// ── Renderer & input init ─────────────────────────────────────────────────────
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('canvas-wrap').appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (cam) { cam.camera.aspect = window.innerWidth / window.innerHeight; cam.camera.updateProjectionMatrix(); }
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.setAttribute('touch-action', 'none');

  window.addEventListener('keydown', e => { keyState[e.code] = true; });
  window.addEventListener('keyup',   e => { keyState[e.code] = false; });

  renderer.setAnimationLoop(tick);
}

// ── Raycaster ─────────────────────────────────────────────────────────────────
const raycaster   = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const groundHit   = new THREE.Vector3();

function screenToGround(clientX, clientY) {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, cam.camera);
  return raycaster.ray.intersectPlane(groundPlane, groundHit) ? { x: groundHit.x, z: groundHit.z } : null;
}

// ── Pointer handlers ──────────────────────────────────────────────────────────
function onPointerDown(e) {
  ptStart.x = e.clientX; ptStart.y = e.clientY; ptStart.t = performance.now();
  prevPX = e.clientX; prevPY = e.clientY;
  isPointerDown = true;
  isDragging = false; dragDX = 0; dragDY = 0;
  renderer.domElement.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!isPointerDown) { prevPX = e.clientX; prevPY = e.clientY; return; }
  const dx = e.clientX - ptStart.x, dy = e.clientY - ptStart.y;
  if (!isDragging && Math.hypot(dx, dy) > 10) isDragging = true;
  if (isDragging) { dragDX += e.clientX - prevPX; dragDY += e.clientY - prevPY; }
  prevPX = e.clientX; prevPY = e.clientY;
}

function onPointerUp(e) {
  isPointerDown = false;
  if (!gameRunning) { isDragging = false; return; }
  const dx = e.clientX - ptStart.x, dy = e.clientY - ptStart.y;
  if (Math.hypot(dx, dy) < 10) {
    const now = performance.now();
    const isDouble = now - lastTapTime < 300;
    lastTapTime = now;
    const pos = screenToGround(e.clientX, e.clientY);
    if (pos) controller.setGoal(pos.x, pos.z, isDouble);
  }
  isDragging = false;
}

// ── Warning glow ──────────────────────────────────────────────────────────────
const WARN_DIST = 10;
function updateWarningGlow(nearestDist) {
  const glow = el('screen-glow');
  if (nearestDist < WARN_DIST) {
    const t = 1 - nearestDist / WARN_DIST;
    glow.style.opacity = t * 0.55;
    warnTimer += 1 / 60;
    if (warnTimer > 0.3) { warnTimer = 0; playWarning(); }
  } else {
    glow.style.opacity = 0;
    warnTimer = 0;
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function tick(time) {
  const dt = Math.min(lastTime === null ? 0 : (time - lastTime) / 1000, CONFIG.maxDt);
  lastTime = time;
  if (!gameRunning || !controller) return;

  elapsedTime += dt;

  const has = c => keyState[c];
  let moveX = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
  let moveY = (has('KeyW') || has('ArrowUp')   ? 1 : 0) - (has('KeyS') || has('ArrowDown')  ? 1 : 0);
  const len = Math.hypot(moveX, moveY); if (len > 1) { moveX /= len; moveY /= len; }
  const runKey = has('ShiftLeft') || has('ShiftRight');

  const lDX = dragDX, lDY = dragDY; dragDX = 0; dragDY = 0;

  controller.update(dt, moveX, moveY, runKey, cam.yaw);
  anim?.update(dt, controller.speed);
  cam.update(dt, controller.position, lDX, lDY, world);
  env.update(controller.position);

  if (controller.speed > 0.5) {
    footstepTimer += dt;
    const interval = controller.speed > CONFIG.runSpeed * 0.6 ? 0.25 : 0.4;
    if (footstepTimer > interval) { footstepTimer = 0; playFootstep(); }
  } else footstepTimer = 0;

  const px = controller.position.x, pz = controller.position.z;

  const robotResult = robotManager.update(dt, px, pz);
  updateWarningGlow(robotResult.nearestDist);

  if (robotResult.caught) {
    endGame();
    return;
  }

  const coinResult = coinManager.update(dt, px, pz);
  if (coinResult.coinGot) {
    playCoin();
    updateHUD();
  }
  if (coinResult.wave != null) {
    playWave();
    showToast(`Wave ${coinResult.wave}！ ロボが増えるよ！`);
    updateHUD();
  }

  renderer.render(scene, cam.camera);
  updateHUD();
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  el('screen-glow').style.opacity = 0;
  playGameOver();

  const coinPts = coinManager.score;
  const survPts = Math.floor(elapsedTime);
  const score   = coinPts + survPts;
  const wave    = coinManager.wave;
  const prev    = parseInt(localStorage.getItem('robo-panic.best') || '0');
  const isNew   = score > prev;
  if (isNew) localStorage.setItem('robo-panic.best', score);

  el('result-score').textContent    = score;
  el('result-coin-pts').textContent = coinPts;
  el('result-surv-pts').textContent = survPts;
  el('result-time').textContent     = fmtTime(elapsedTime);
  el('result-wave').textContent     = wave;
  el('result-best').textContent     = Math.max(score, prev);
  el('result-newbest').style.display = isNew ? 'block' : 'none';

  el('btn-retry').onclick  = () => startGame();
  el('btn-title2').onclick = () => { showScreen('title'); setupTitle(); };

  showScreen('result');
}

// ── Character model ───────────────────────────────────────────────────────────
function attachPlaceholder() {
  const geom = new THREE.CapsuleGeometry(CONFIG.charRadius, CONFIG.charHeight - CONFIG.charRadius * 2, 4, 12);
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x6c63ff, roughness: 0.6 }));
  mesh.position.y = CONFIG.charHeight / 2; mesh.castShadow = true;
  controller.root.add(mesh);
  controller._placeholder = mesh;
}

async function loadCharacter() {
  try {
    const gltf = await new GLTFLoader().loadAsync('./models/character.glb');
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const wrapper = new THREE.Group();
    wrapper.rotation.y = Math.PI;
    wrapper.scale.setScalar(height > 0.01 ? CONFIG.charHeight / height : 1);
    wrapper.add(model);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    if (controller._placeholder) { controller.root.remove(controller._placeholder); controller._placeholder = null; }
    controller.root.add(wrapper);
    anim = AnimationController.create(model, gltf.animations);
  } catch (e) {
    console.warn('character.glb load failed, using capsule placeholder');
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
setupTitle();
showScreen('title');
