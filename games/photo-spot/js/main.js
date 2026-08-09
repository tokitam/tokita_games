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
import { Landmarks } from './landmarks/Landmarks.js';
import { PhotoJudge } from './photo/PhotoJudge.js';
import { playShutter, playNoShot, playComplete, playFootstep, resume } from './sound.js';

// ── Seed helpers ──────────────────────────────────────────────────────────────
function todaySeed() {
  const d = new Date();
  const s = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}
function randomSeed() { return (Math.random() * 0xffffffff) >>> 0; }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

// ── Game state ────────────────────────────────────────────────────────────────
let renderer, scene, env, world, controller, anim, cam, landmarks, judge;
let lastTime = null, gameMode = null, gameSeed = null;
let elapsedTime = 0;
let gameRunning = false;
let footstepTimer = 0;
let finderGlowVisible = false;

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

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function starsText(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

function getBest(mode) {
  if (mode === 'daily') return parseInt(localStorage.getItem(`photo-spot.best.daily.${todayKey()}`) || '0');
  return parseInt(localStorage.getItem('photo-spot.best') || '0');
}

function saveBest(mode, time) {
  const t = Math.floor(time);
  if (mode === 'daily') {
    const key = `photo-spot.best.daily.${todayKey()}`;
    const prev = parseInt(localStorage.getItem(key) || '0');
    if (!prev || t < prev) localStorage.setItem(key, t);
  } else {
    const prev = parseInt(localStorage.getItem('photo-spot.best') || '0');
    if (!prev || t < prev) localStorage.setItem('photo-spot.best', t);
  }
}

// ── Mission chips ─────────────────────────────────────────────────────────────
function updateMissionChips() {
  if (!landmarks) return;
  const bar = el('mission-bar');
  bar.innerHTML = '';
  for (const lm of landmarks.list) {
    const chip = document.createElement('div');
    chip.className = `mission-chip${lm.stars > 0 ? ' shot' : ''}`;
    chip.innerHTML = `<span class="mc-emoji">${lm.def.emoji}</span><span class="mc-stars">${lm.stars > 0 ? starsText(lm.stars) : '---'}</span>`;
    bar.appendChild(chip);
  }
}

// ── Finder glow (landmark in frame) ──────────────────────────────────────────
function updateFinderGlow() {
  if (!landmarks || !cam) return;
  const FRUSTUM = new THREE.Frustum();
  const PM = new THREE.Matrix4();
  PM.multiplyMatrices(cam.camera.projectionMatrix, cam.camera.matrixWorldInverse);
  FRUSTUM.setFromProjectionMatrix(PM);

  const anyInFrame = landmarks.list.some(lm => {
    if (lm.stars >= 3) return false;
    const pt = new THREE.Vector3(lm.x, lm.targetY, lm.z);
    return FRUSTUM.containsPoint(pt);
  });

  const frame = el('finder-frame');
  if (anyInFrame !== finderGlowVisible) {
    finderGlowVisible = anyInFrame;
    frame.classList.toggle('glow', anyInFrame);
  }
}

// ── Flash effect ──────────────────────────────────────────────────────────────
function flashScreen() {
  const overlay = el('flash-overlay');
  overlay.style.opacity = 1;
  setTimeout(() => { overlay.style.opacity = 0; }, 120);
}

// ── Title screen setup ────────────────────────────────────────────────────────
function setupTitle() {
  const dailyBest = parseInt(localStorage.getItem(`photo-spot.best.daily.${todayKey()}`) || '0');
  const randBest  = parseInt(localStorage.getItem('photo-spot.best') || '0');
  el('title-daily-best').textContent = dailyBest ? fmtTime(dailyBest) : '--:--';
  el('title-rand-best').textContent  = randBest  ? fmtTime(randBest)  : '--:--';
  el('btn-daily').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random').onclick = () => startGame('random', randomSeed());
}

// ── Game startup ──────────────────────────────────────────────────────────────
async function startGame(mode, seed) {
  gameMode = mode; gameSeed = seed; elapsedTime = 0; gameRunning = false;
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

  if (landmarks) landmarks.dispose();
  landmarks = new Landmarks(scene, city, world, seed);
  judge     = new PhotoJudge(cam.camera, scene);

  el('hud-time').textContent = '⏱ 0:00';
  updateMissionChips();
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

  // Shutter button
  el('shutter-btn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!gameRunning) return;
    takePhoto();
  });

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

// ── Photo ─────────────────────────────────────────────────────────────────────
function takePhoto() {
  const playerPos = controller.position;
  let bestStars = null, bestLm = null;
  for (const lm of landmarks.list) {
    const stars = judge.judge(lm, playerPos);
    if (stars === null) continue;
    if (stars === 0) { if (bestStars === null) { bestStars = 0; bestLm = lm; } continue; }
    if (bestStars === null || stars > bestStars) { bestStars = stars; bestLm = lm; }
  }

  flashScreen();

  if (bestLm === null || bestStars === 0) {
    playNoShot();
    showToast('なにも写っていない…📷');
    return;
  }

  playShutter(bestStars);
  const improved = bestStars > bestLm.stars;
  if (improved) bestLm.stars = bestStars;

  showToast(`${bestLm.def.emoji} ${bestLm.def.label}を撮影！${starsText(bestStars)}`);
  updateMissionChips();

  const allThree = landmarks.list.every(lm => lm.stars >= 3);
  if (allThree) setTimeout(() => endGame(true), 500);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function tick(time) {
  const dt = Math.min(lastTime === null ? 0 : (time - lastTime) / 1000, CONFIG.maxDt);
  lastTime = time;
  if (!gameRunning || !controller) return;

  elapsedTime += dt;
  el('hud-time').textContent = `⏱ ${fmtTime(elapsedTime)}`;

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
  landmarks.update(dt);

  if (controller.speed > 0.5) {
    footstepTimer += dt;
    const interval = controller.speed > CONFIG.runSpeed * 0.6 ? 0.25 : 0.4;
    if (footstepTimer > interval) { footstepTimer = 0; playFootstep(); }
  } else footstepTimer = 0;

  renderer.render(scene, cam.camera);
  updateFinderGlow();
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame(complete) {
  gameRunning = false;
  if (complete) {
    playComplete();
    saveBest(gameMode, elapsedTime);
  }

  const totalStars = landmarks ? landmarks.list.reduce((s, lm) => s + lm.stars, 0) : 0;
  const prev = getBest(gameMode);
  const isNew = complete && (prev === 0 || elapsedTime < prev);

  el('result-stars').textContent    = `${totalStars}/15 ★`;
  el('result-time').textContent     = fmtTime(elapsedTime);
  el('result-best').textContent     = prev ? fmtTime(prev) : '--:--';
  el('result-newbest').style.display = isNew ? 'block' : 'none';
  el('result-complete').style.display = complete ? 'block' : 'none';

  el('btn-retry').onclick   = () => startGame(gameMode, gameSeed);
  el('btn-daily2').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random2').onclick = () => startGame('random', randomSeed());
  el('btn-title2').onclick  = () => { showScreen('title'); setupTitle(); };

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
