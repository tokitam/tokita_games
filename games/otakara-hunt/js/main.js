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
import { TreasureManager } from './treasure/TreasureManager.js';
import { playSonar, playFind, playFootstep, resume } from './sound.js';

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
let renderer, scene, env, world, controller, anim, cam, treasureManager;
let lastTime = null, gameMode = null, gameSeed = null;
let elapsedTime = 0;
let gameRunning = false;
let footstepTimer = 0;
let sonarTimer = 0;

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
  if (!treasureManager) return;
  el('hud-found').textContent = `💎 ${treasureManager.foundCount}/${treasureManager.total}`;
  el('hud-time').textContent  = `⏱ ${fmtTime(elapsedTime)}`;
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function getBest(mode) {
  if (mode === 'daily') return parseFloat(localStorage.getItem(`otakara-hunt.best.daily.${todayKey()}`) || '0');
  return parseFloat(localStorage.getItem('otakara-hunt.best') || '0');
}

function saveBest(mode, time) {
  if (mode === 'daily') {
    const key = `otakara-hunt.best.daily.${todayKey()}`;
    const prev = parseFloat(localStorage.getItem(key) || '0');
    if (!prev || time < prev) localStorage.setItem(key, time);
  } else {
    const prev = parseFloat(localStorage.getItem('otakara-hunt.best') || '0');
    if (!prev || time < prev) localStorage.setItem('otakara-hunt.best', time);
  }
}

// ── Title screen setup ────────────────────────────────────────────────────────
function setupTitle() {
  const dailyBest = parseFloat(localStorage.getItem(`otakara-hunt.best.daily.${todayKey()}`) || '0');
  const randBest  = parseFloat(localStorage.getItem('otakara-hunt.best') || '0');
  el('title-daily-best').textContent = dailyBest ? fmtTime(dailyBest) : '--:--';
  el('title-rand-best').textContent  = randBest  ? fmtTime(randBest)  : '--:--';
  el('btn-daily').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random').onclick = () => startGame('random', randomSeed());
}

// ── Game startup ──────────────────────────────────────────────────────────────
async function startGame(mode, seed) {
  gameMode = mode; gameSeed = seed; elapsedTime = 0; gameRunning = false;
  sonarTimer = 0;
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

  treasureManager = new TreasureManager(scene, city, world, seed);

  updateHUD();
  el('minimap').classList.remove('hidden');
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

// ── Treasure direction indicator ──────────────────────────────────────────────
function updateTreasureIndicator() {
  const wrap = el('treasure-indicator');
  if (!gameRunning || !treasureManager || !cam) { wrap.classList.add('hidden'); return; }

  let nearestDist = Infinity, nearestT = null, nearestDX = 0, nearestDZ = 0;
  for (const t of treasureManager.treasures) {
    if (t.found) continue;
    const dx = t.x - controller.position.x;
    const dz = t.z - controller.position.z;
    const d  = Math.hypot(dx, dz);
    if (d < nearestDist) { nearestDist = d; nearestT = t; nearestDX = dx; nearestDZ = dz; }
  }

  if (!nearestT) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const yaw    = cam.yaw;
  const sRight = nearestDX * Math.cos(yaw) - nearestDZ * Math.sin(yaw);
  const sUp    = -nearestDX * Math.sin(yaw) - nearestDZ * Math.cos(yaw);
  const angle  = Math.atan2(sRight, sUp);

  const icon = el('treasure-arrow-icon');
  icon.style.transform = `rotate(${angle}rad)`;
  icon.style.color = nearestT.isGolden ? '#ffd700' : '#66ccff';

  const distEl = el('treasure-dist-text');
  distEl.textContent = Math.round(nearestDist) + 'm';
  distEl.style.color = nearestT.isGolden ? '#ffd700' : 'rgba(255,255,255,0.8)';
}

// ── Screen glow (proximity) ───────────────────────────────────────────────────
function updateGlow(nearestDist) {
  const glow = el('screen-glow');
  const opacity = nearestDist < 20 ? Math.min(0.5, (20 - nearestDist) / 20 * 0.5) : 0;
  glow.style.opacity = opacity;
}

// ── Minimap ───────────────────────────────────────────────────────────────────
let _mmCtx = null;
function getMinimapCtx() {
  if (!_mmCtx) { const c = el('minimap'); if (c) _mmCtx = c.getContext('2d'); }
  return _mmCtx;
}

function drawMinimap() {
  const ctx = getMinimapCtx();
  if (!ctx || !treasureManager || !controller) return;
  const W = 110, H = 110;
  const half  = CONFIG.citySize / 2;
  const scale = W / CONFIG.citySize;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 6); else ctx.rect(0, 0, W, H);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  for (const t of treasureManager.treasures) {
    if (t.found) continue;
    const cx = (t.x + half) * scale;
    const cy = (t.z + half) * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, t.isGolden ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = t.isGolden ? '#ffd700' : '#66ccff';
    ctx.fill();
  }

  const px = (controller.position.x + half) * scale;
  const py = (controller.position.z + half) * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(controller.yaw);
  ctx.beginPath();
  ctx.moveTo(0, 5); ctx.lineTo(4, -3); ctx.lineTo(-4, -3);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
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
  const result = treasureManager.update(dt, px, pz);

  if (result.found) {
    playFind(result.found.isGolden);
    showToast(result.found.isGolden ? '✨ 金のおたからを発掘！' : '💎 おたからを発掘！');
    updateHUD();
    sonarTimer = 0;
    if (treasureManager.remaining === 0) setTimeout(() => endGame(), 400);
  } else {
    updateHUD();
    if (result.nearestDist < Infinity) {
      const d = result.nearestDist;
      const interval = Math.max(0.2, Math.min(1.2, 0.2 + (Math.max(0, d - 5) / 55) * 1.0));
      const freq     = Math.max(440, Math.min(1200, 1200 - (Math.max(0, d - 5) / 55) * 760));
      sonarTimer += dt;
      if (sonarTimer >= interval) { sonarTimer = 0; playSonar(freq); }
      updateGlow(d);
    }
  }

  renderer.render(scene, cam.camera);
  drawMinimap();
  updateTreasureIndicator();
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  const time = elapsedTime;
  saveBest(gameMode, time);

  const prev  = getBest(gameMode);
  const isNew = prev <= 0 || time <= prev;

  el('result-time').textContent = fmtTime(time);
  el('result-best').textContent = fmtTime(Math.min(time, prev > 0 ? prev : time));
  el('result-newbest').style.display = isNew ? 'block' : 'none';

  el('btn-retry').onclick   = () => startGame(gameMode, gameSeed);
  el('btn-daily2').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random2').onclick = () => startGame('random', randomSeed());
  el('btn-title2').onclick  = () => {
    el('minimap').classList.add('hidden');
    el('treasure-indicator').classList.add('hidden');
    el('screen-glow').style.opacity = 0;
    showScreen('title'); setupTitle();
  };

  el('minimap').classList.add('hidden');
  el('treasure-indicator').classList.add('hidden');
  el('screen-glow').style.opacity = 0;
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
