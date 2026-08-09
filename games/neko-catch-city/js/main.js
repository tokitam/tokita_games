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
import { CatManager } from './cats/CatManager.js';
import { playMeow, playCatch, playFootstep, resume } from './sound.js';

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

// ── Character list (CC0 / Quaternius) ────────────────────────────────────────
const CHARACTERS = [
  { id: 'default', label: 'デフォルト',   emoji: '🧍', file: './models/character.glb',   rotY: Math.PI },
  { id: 'girl',    label: '冒険者',       emoji: '🗡️', file: './models/char_girl.glb',   rotY: 0 },
  { id: 'woman',   label: 'カジュアル',   emoji: '👩', file: './models/char_woman.glb',  rotY: 0 },
  { id: 'man',     label: '青年',         emoji: '🧑', file: './models/char_man.glb',    rotY: 0 },
  { id: 'agent',   label: 'エージェント', emoji: '🕵️', file: './models/char_agent.glb',  rotY: 0 },
  { id: 'costume', label: 'コスチューム', emoji: '🧙', file: './models/char_costume.glb', rotY: 0 },
];
let selectedCharId = localStorage.getItem('neko-catch-city.char') || 'default';

// ── Game state ────────────────────────────────────────────────────────────────
let renderer, scene, env, world, controller, anim, cam, catManager;
let lastTime = null, gameMode = null, gameSeed = null;
let elapsedTime = 0;
let gameRunning = false;
let footstepTimer = 0;
let goalMarker = null;

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

function updateHUD(caught, total) {
  el('hud-cats').textContent = `🐱 ${caught}/${total}`;
  el('hud-time').textContent = `⏱ ${fmtTime(elapsedTime)}`;
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function getBest(mode, seed) {
  if (mode === 'daily') return parseFloat(localStorage.getItem(`neko-catch-city.best.daily.${todayKey()}`) || '0');
  return parseFloat(localStorage.getItem('neko-catch-city.best') || '0');
}

function saveBest(mode, seed, time) {
  if (mode === 'daily') {
    const key = `neko-catch-city.best.daily.${todayKey()}`;
    const prev = parseFloat(localStorage.getItem(key) || '0');
    if (!prev || time < prev) localStorage.setItem(key, time);
  } else {
    const prev = parseFloat(localStorage.getItem('neko-catch-city.best') || '0');
    if (!prev || time < prev) localStorage.setItem('neko-catch-city.best', time);
  }
}

// ── Title screen setup ────────────────────────────────────────────────────────
function setupTitle() {
  const dailyBest = parseFloat(localStorage.getItem(`neko-catch-city.best.daily.${todayKey()}`) || '0');
  const randBest  = parseFloat(localStorage.getItem('neko-catch-city.best') || '0');
  el('title-daily-best').textContent = dailyBest ? fmtTime(dailyBest) : '--:--';
  el('title-rand-best').textContent  = randBest  ? fmtTime(randBest)  : '--:--';

  el('btn-daily').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random').onclick = () => startGame('random', randomSeed());

  // キャラ選択
  const grid = el('char-grid');
  grid.innerHTML = '';
  for (const ch of CHARACTERS) {
    const card = document.createElement('div');
    card.className = 'char-card' + (ch.id === selectedCharId ? ' selected' : '');
    card.innerHTML = `<span class="char-emoji">${ch.emoji}</span><span class="char-label">${ch.label}</span>`;
    card.onclick = () => {
      selectedCharId = ch.id;
      localStorage.setItem('neko-catch-city.char', ch.id);
      grid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    };
    grid.appendChild(card);
  }
}

// ── Game startup ──────────────────────────────────────────────────────────────
async function startGame(mode, seed) {
  gameMode = mode; gameSeed = seed; elapsedTime = 0; gameRunning = false;
  resume();
  showScreen('hud');

  if (!renderer) initRenderer();

  // Generate city
  const city = generateCity(seed);
  scene = new THREE.Scene();
  env   = new Environment(scene);
  scene.add(buildCity(city, subRng(seed, 100)));
  world = new CollisionWorld(city);

  // Character
  controller = new CharacterController(world, city.spawn);
  scene.add(controller.root);
  attachPlaceholder();
  anim = null;
  loadCharacter().catch(() => {});

  // Camera
  cam = new ThirdPersonCamera(renderer.domElement.width / renderer.domElement.height, city.spawn.heading);

  // Cats
  catManager = new CatManager(scene, city, world, seed);

  // Goal marker
  if (goalMarker) { scene.remove(goalMarker); goalMarker = null; }
  const ringG = new THREE.RingGeometry(0.25, 0.32, 20);
  ringG.rotateX(-Math.PI / 2);
  goalMarker = new THREE.Mesh(ringG, new THREE.MeshStandardMaterial({ color: 0x6c63ff, emissive: 0x6c63ff, emissiveIntensity: 1, transparent: true, opacity: 0.0, depthWrite: false }));
  goalMarker.position.y = 0.03;
  scene.add(goalMarker);

  updateHUD(0, catManager.total);
  el('minimap').classList.remove('hidden');
  lastTime = null;
  gameRunning = true;
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('canvas-wrap').appendChild(renderer.domElement);

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (cam) { cam.camera.aspect = window.innerWidth / window.innerHeight; cam.camera.updateProjectionMatrix(); }
  });

  // Pointer input — down on canvas, move/up on window to avoid losing events outside canvas
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.setAttribute('touch-action', 'none');

  // Keyboard
  window.addEventListener('keydown', e => { keyState[e.code] = true; });
  window.addEventListener('keyup',   e => { keyState[e.code] = false; });

  renderer.setAnimationLoop(tick);
}

// ── Raycaster for tap-to-move ─────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const groundHit = new THREE.Vector3();

function screenToGround(clientX, clientY) {
  const w = window.innerWidth, h = window.innerHeight;
  const ndc = new THREE.Vector2((clientX / w) * 2 - 1, -(clientY / h) * 2 + 1);
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
  if (isDragging) {
    dragDX += e.clientX - prevPX;
    dragDY += e.clientY - prevPY;
  }
  prevPX = e.clientX; prevPY = e.clientY;
}

function onPointerUp(e) {
  isPointerDown = false;
  if (!gameRunning) { isDragging = false; return; }
  const dx = e.clientX - ptStart.x, dy = e.clientY - ptStart.y;
  const moved = Math.hypot(dx, dy);
  if (moved < 10) {
    // tap or double-tap
    const now = performance.now();
    const isDouble = now - lastTapTime < 300;
    lastTapTime = now;
    const pos = screenToGround(e.clientX, e.clientY);
    if (pos) {
      controller.setGoal(pos.x, pos.z, isDouble);
      if (goalMarker) {
        goalMarker.position.set(pos.x, 0.03, pos.z);
        goalMarker.material.opacity = isDouble ? 0.9 : 0.7;
        goalMarker.material.color.setHex(isDouble ? 0xff6b9d : 0x6c63ff);
        goalMarker.material.emissive.setHex(isDouble ? 0xff6b9d : 0x6c63ff);
      }
    }
  }
  isDragging = false;
}

// ── Cat direction indicator ───────────────────────────────────────────────────
function updateCatIndicator() {
  const wrap = el('cat-indicator');
  if (!gameRunning || !catManager || !cam) { wrap.classList.add('hidden'); return; }

  let nearest = null, nearestDist = Infinity;
  for (const cat of catManager.cats) {
    if (cat.state === 'caught') continue;
    const dx = cat.root.position.x - controller.position.x;
    const dz = cat.root.position.z - controller.position.z;
    const d = Math.hypot(dx, dz);
    if (d < nearestDist) { nearestDist = d; nearest = { cat, dx, dz }; }
  }

  if (!nearest) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const { dx, dz, cat } = nearest;
  const yaw = cam.yaw;
  const sRight = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const sUp    = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  const angle  = Math.atan2(sRight, sUp);

  const icon = el('cat-arrow-icon');
  icon.style.transform = `rotate(${angle}rad)`;
  icon.style.color = cat.isGolden ? '#ffd700' : '#ff6b9d';

  const distEl = el('cat-dist-text');
  distEl.textContent = Math.round(nearestDist) + 'm';
  distEl.style.color = cat.isGolden ? '#ffd700' : 'rgba(255,255,255,0.8)';
}

// ── Minimap ───────────────────────────────────────────────────────────────────
let _mmCtx = null;
function getMinimapCtx() {
  if (!_mmCtx) { const c = document.getElementById('minimap'); if (c) _mmCtx = c.getContext('2d'); }
  return _mmCtx;
}

function drawMinimap() {
  const ctx = getMinimapCtx();
  if (!ctx || !catManager || !controller) return;
  const W = 110, H = 110;
  const half = CONFIG.citySize / 2;
  const scale = W / CONFIG.citySize;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 6); else ctx.rect(0, 0, W, H);
  ctx.fill();

  // City border
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Cats (dot — golden は大きめ)
  for (const cat of catManager.cats) {
    if (cat.state === 'caught') continue;
    const cx = (cat.root.position.x + half) * scale;
    const cy = (cat.root.position.z + half) * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, cat.isGolden ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = cat.isGolden ? '#ffd700' : '#ff6b9d';
    ctx.fill();
  }

  // Player (向き付き三角)
  const px = (controller.position.x + half) * scale;
  const py = (controller.position.z + half) * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(controller.yaw);
  ctx.beginPath();
  ctx.moveTo(0, 5);    // 先端（+Z 方向 = canvas 下）
  ctx.lineTo(4, -3);
  ctx.lineTo(-4, -3);
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

  // Keyboard input
  const has = c => keyState[c];
  let moveX = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
  let moveY = (has('KeyW') || has('ArrowUp')   ? 1 : 0) - (has('KeyS') || has('ArrowDown')  ? 1 : 0);
  const len = Math.hypot(moveX, moveY); if (len > 1) { moveX /= len; moveY /= len; }
  const runKey = has('ShiftLeft') || has('ShiftRight');

  // Camera drag — consume accumulated delta each frame
  const lDX = dragDX, lDY = dragDY;
  dragDX = 0; dragDY = 0;

  controller.update(dt, moveX, moveY, runKey, cam.yaw);
  anim?.update(dt, controller.speed);
  cam.update(dt, controller.position, lDX, lDY, world);
  env.update(controller.position);

  // Footstep sound
  if (controller.speed > 0.5) {
    footstepTimer += dt;
    const interval = controller.speed > CONFIG.runSpeed * 0.6 ? 0.25 : 0.4;
    if (footstepTimer > interval) { footstepTimer = 0; playFootstep(); }
  } else footstepTimer = 0;

  // Cat update
  const px = controller.position.x, pz = controller.position.z;
  const result = catManager.update(dt, px, pz);
  if (result) {
    const { caught } = result;
    playMeow(caught.isGolden);
    setTimeout(() => playCatch(caught.isGolden), 80);
    const name = caught.isGolden ? '✨ 金のねこを捕まえた！' : 'ねこを捕まえた！';
    showToast(name);
    updateHUD(catManager.caught, catManager.total);
    if (catManager.remaining === 0) {
      setTimeout(() => endGame(), 400);
    }
  } else {
    updateHUD(catManager.caught, catManager.total);
  }

  renderer.render(scene, cam.camera);
  drawMinimap();
  updateCatIndicator();
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  const time = elapsedTime;
  saveBest(gameMode, gameSeed, time);

  const prev = getBest(gameMode, gameSeed);
  const isNew = prev <= 0 || time <= prev;

  el('result-time').textContent = fmtTime(time);
  el('result-best').textContent = fmtTime(Math.min(time, prev > 0 ? prev : time));
  el('result-newbest').style.display = isNew ? 'block' : 'none';

  el('btn-retry').onclick  = () => startGame(gameMode, gameSeed);
  el('btn-daily2').onclick = () => startGame('daily',  todaySeed());
  el('btn-random2').onclick = () => startGame('random', randomSeed());
  el('btn-title2').onclick = () => { el('minimap').classList.add('hidden'); el('cat-indicator').classList.add('hidden'); showScreen('title'); setupTitle(); };

  el('minimap').classList.add('hidden');
  el('cat-indicator').classList.add('hidden');
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
  const ch = CHARACTERS.find(c => c.id === selectedCharId) || CHARACTERS[0];
  try {
    const gltf = await new GLTFLoader().loadAsync(ch.file);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const wrapper = new THREE.Group();
    wrapper.rotation.y = ch.rotY ?? Math.PI;
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
