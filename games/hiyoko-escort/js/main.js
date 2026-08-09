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
import { ChickManager } from './chicks/ChickManager.js';
import { playPiyo, playJoin, playDeliver, playDrop, playFootstep, resume } from './sound.js';

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
let renderer, scene, env, world, controller, anim, cam, chickManager;
let lastTime = null, gameMode = null, gameSeed = null;
let elapsedTime = 0;
let gameRunning = false;
let footstepTimer = 0;
let piyoTimer = 0;

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

function updateHUD(following = 0) {
  if (!chickManager) return;
  el('hud-delivered').textContent = `🐣 ${chickManager.delivered}/${chickManager.total}`;
  el('hud-following').textContent = `🐤×${following}`;
  el('hud-time').textContent      = `⏱ ${fmtTime(elapsedTime)}`;
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function getBest(mode) {
  if (mode === 'daily') return parseInt(localStorage.getItem(`hiyoko-escort.best.daily.${todayKey()}`) || '0');
  return parseInt(localStorage.getItem('hiyoko-escort.best') || '0');
}

function saveBest(mode, score) {
  if (mode === 'daily') {
    const key = `hiyoko-escort.best.daily.${todayKey()}`;
    const prev = parseInt(localStorage.getItem(key) || '0');
    if (score > prev) localStorage.setItem(key, score);
  } else {
    const prev = parseInt(localStorage.getItem('hiyoko-escort.best') || '0');
    if (score > prev) localStorage.setItem('hiyoko-escort.best', score);
  }
}

// ── Title screen setup ────────────────────────────────────────────────────────
function setupTitle() {
  const dailyBest = parseInt(localStorage.getItem(`hiyoko-escort.best.daily.${todayKey()}`) || '0');
  const randBest  = parseInt(localStorage.getItem('hiyoko-escort.best') || '0');
  el('title-daily-best').textContent = dailyBest > 0 ? dailyBest : '---';
  el('title-rand-best').textContent  = randBest  > 0 ? randBest  : '---';
  el('btn-daily').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random').onclick = () => startGame('random', randomSeed());
}

// ── Game startup ──────────────────────────────────────────────────────────────
async function startGame(mode, seed) {
  gameMode = mode; gameSeed = seed; elapsedTime = 0; gameRunning = false;
  piyoTimer = 0;
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

  if (chickManager) chickManager.dispose();
  chickManager = new ChickManager(scene, city, world, seed);

  el('minimap').classList.remove('hidden');
  updateHUD(0);
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

// ── Nest direction indicator ──────────────────────────────────────────────────
function updateNestIndicator(followingCount) {
  const wrap = el('nest-indicator');
  if (!gameRunning || !chickManager || !cam) { wrap.classList.add('hidden'); return; }

  if (followingCount === 0) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const dx   = chickManager.nestX - controller.position.x;
  const dz   = chickManager.nestZ - controller.position.z;
  const dist = Math.hypot(dx, dz);
  const yaw  = cam.yaw;
  const sRight = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const sUp    = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  const angle  = Math.atan2(sRight, sUp);

  const icon = el('nest-arrow-icon');
  icon.style.transform = `rotate(${angle}rad)`;
  el('nest-dist-text').textContent = Math.round(dist) + 'm';
}

// ── Minimap ───────────────────────────────────────────────────────────────────
let _mmCtx = null;
function getMinimapCtx() {
  if (!_mmCtx) { const c = el('minimap'); if (c) _mmCtx = c.getContext('2d'); }
  return _mmCtx;
}

function drawMinimap() {
  const ctx = getMinimapCtx();
  if (!ctx || !chickManager || !controller) return;
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

  // Nest star
  const nx = (chickManager.nestX + half) * scale;
  const ny = (chickManager.nestZ + half) * scale;
  ctx.fillStyle = '#ffff44';
  ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI * 2); ctx.fill();

  // Lost chicks
  for (const chick of chickManager.chicks) {
    if (chick.state !== 'lost') continue;
    const cx = (chick.position.x + half) * scale;
    const cy = (chick.position.z + half) * scale;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066'; ctx.fill();
  }

  // Player
  const px = (controller.position.x + half) * scale;
  const py = (controller.position.z + half) * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(controller.yaw);
  ctx.beginPath();
  ctx.moveTo(0, 5); ctx.lineTo(4, -3); ctx.lineTo(-4, -3);
  ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill();
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
  const isRunning = controller.speed > CONFIG.runSpeed * 0.6;
  anim?.update(dt, controller.speed);
  cam.update(dt, controller.position, lDX, lDY, world);
  env.update(controller.position);

  if (controller.speed > 0.5) {
    footstepTimer += dt;
    const interval = isRunning ? 0.25 : 0.4;
    if (footstepTimer > interval) { footstepTimer = 0; playFootstep(); }
  } else footstepTimer = 0;

  const px = controller.position.x, pz = controller.position.z;
  const r  = chickManager.update(dt, px, pz, isRunning);

  if (r.joined) {
    playJoin();
    showToast(`ひよこが仲間になった！🐤×${r.followingCount}`);
  }
  if (r.droppedChick) {
    playDrop();
    showToast('ひよこがはぐれた…💦 歩いて連れ直そう');
  }
  if (r.delivered) {
    const { count, pts, bonus } = r.delivered;
    playDeliver(count);
    const bonusTxt = bonus > 1 ? ` ×${bonus.toFixed(1)} ボーナス！` : '';
    showToast(`${count}羽とどけた！ +${pts}点${bonusTxt}`);
    if (r.allDone) { setTimeout(() => endGame(), 500); return; }
  }

  // Piyo sound for nearest lost chick (distance-based volume)
  const nearestLost = chickManager.chicks
    .filter(c => c.state === 'lost')
    .map(c => Math.hypot(c.position.x - px, c.position.z - pz))
    .reduce((a, b) => Math.min(a, b), Infinity);
  if (nearestLost < 30) {
    piyoTimer += dt;
    const interval = Math.max(0.3, Math.min(1.8, 0.3 + nearestLost / 20 * 1.5));
    if (piyoTimer >= interval) { piyoTimer = 0; playPiyo(); }
  }

  updateHUD(r.followingCount);
  updateNestIndicator(r.followingCount);
  renderer.render(scene, cam.camera);
  drawMinimap();
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  const score = chickManager.score;
  saveBest(gameMode, score);
  const prev  = getBest(gameMode);
  const isNew = score >= prev;

  el('result-score').textContent = score;
  el('result-time').textContent  = fmtTime(elapsedTime);
  el('result-best').textContent  = Math.max(score, prev);
  el('result-newbest').style.display = isNew ? 'block' : 'none';

  el('btn-retry').onclick   = () => startGame(gameMode, gameSeed);
  el('btn-daily2').onclick  = () => startGame('daily',  todaySeed());
  el('btn-random2').onclick = () => startGame('random', randomSeed());
  el('btn-title2').onclick  = () => {
    el('minimap').classList.add('hidden');
    el('nest-indicator').classList.add('hidden');
    showScreen('title'); setupTitle();
  };

  el('minimap').classList.add('hidden');
  el('nest-indicator').classList.add('hidden');
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
