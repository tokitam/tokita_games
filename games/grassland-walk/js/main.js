import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { buildTerrain, getHeight } from './terrain/TerrainBuilder.js';
import { Environment } from './world/Environment.js';
import { GrasslandWorld } from './world/GrasslandWorld.js';
import { buildNature } from './nature/NatureGenerator.js';
import { AnimalManager } from './nature/AnimalManager.js';
import { CharacterController } from './player/CharacterController.js';
import { AnimationController } from './player/AnimationController.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';

// ── Globals ───────────────────────────────────────────────────────────────────
let renderer, scene, env, terrain, world, controller, anim, cam, animals;
let lastTime = null;

// ── Input state ───────────────────────────────────────────────────────────────
const keyState = {};
let isPointerDown = false, isDragging = false;
let ptStart = { x: 0, y: 0, t: 0 }, lastTapTime = 0;
let dragDX = 0, dragDY = 0, prevPX = 0, prevPY = 0;

// ── Raycaster for tap-to-move ─────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();

function screenToTerrain(clientX, clientY) {
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth)  * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, cam.camera);
  const hits = raycaster.intersectObject(terrain, false);
  return hits.length ? { x: hits[0].point.x, z: hits[0].point.z } : null;
}

// ── Pointer handlers ──────────────────────────────────────────────────────────
function onPointerDown(e) {
  ptStart.x = e.clientX; ptStart.y = e.clientY; ptStart.t = performance.now();
  prevPX = e.clientX; prevPY = e.clientY;
  isPointerDown = true; isDragging = false; dragDX = 0; dragDY = 0;
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
  const dx = e.clientX - ptStart.x, dy = e.clientY - ptStart.y;
  if (Math.hypot(dx, dy) < 10) {
    const now = performance.now();
    const isDouble = now - lastTapTime < 300;
    lastTapTime = now;
    const pos = screenToTerrain(e.clientX, e.clientY);
    if (pos) controller.setGoal(pos.x, pos.z, isDouble);
  }
  isDragging = false;
}

// ── Main init ─────────────────────────────────────────────────────────────────
async function init() {
  // Renderer
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
  window.addEventListener('pointerup',   onPointerUp);
  window.addEventListener('keydown', e => { keyState[e.code] = true; });
  window.addEventListener('keyup',   e => { keyState[e.code] = false; });

  // Scene
  scene = new THREE.Scene();
  env   = new Environment(scene);
  world = new GrasslandWorld();
  terrain = buildTerrain(scene);
  buildNature(scene, world);
  animals = new AnimalManager(scene);

  // Player
  controller = new CharacterController(world);
  scene.add(controller.root);
  anim = null;

  // Camera
  cam = new ThirdPersonCamera(window.innerWidth / window.innerHeight);

  // シーン構築完了でローディングを解除してゲームを開始
  // GLB 読み込みはバックグラウンドで行い、失敗してもカプセルのまま続行
  document.getElementById('loading').classList.add('hidden');
  setTimeout(() => document.getElementById('hint').classList.add('hidden'), 4000);
  renderer.setAnimationLoop(tick);

  loadCharacter().catch(e => console.warn('Character load error:', e));
}

// ── Character model ───────────────────────────────────────────────────────────
async function loadCharacter() {
  // Capsule placeholder while model loads
  const geom = new THREE.CapsuleGeometry(CONFIG.charRadius, CONFIG.charHeight - CONFIG.charRadius * 2, 4, 12);
  const ph = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x6c63ff, roughness: 0.6 }));
  ph.position.y = CONFIG.charHeight / 2; ph.castShadow = true;
  controller.root.add(ph);
  controller._placeholder = ph;

  try {
    const gltf = await new GLTFLoader().loadAsync('../neko-catch-city/models/character.glb');
    const model = gltf.scene;
    const box    = new THREE.Box3().setFromObject(model);
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
    console.warn('GLB load failed, using capsule');
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
function tick(time) {
  const dt = Math.min(lastTime === null ? 0 : (time - lastTime) / 1000, CONFIG.maxDt);
  lastTime = time;
  if (!controller) return;

  const has = c => keyState[c];
  let moveX = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
  let moveY = (has('KeyW') || has('ArrowUp')   ? 1 : 0) - (has('KeyS') || has('ArrowDown')  ? 1 : 0);
  const len = Math.hypot(moveX, moveY); if (len > 1) { moveX /= len; moveY /= len; }
  const runKey = has('ShiftLeft') || has('ShiftRight');

  const lDX = dragDX, lDY = dragDY;
  dragDX = 0; dragDY = 0;

  controller.update(dt, moveX, moveY, runKey, cam.yaw);
  anim?.update(dt, controller.speed);
  cam.update(dt, controller.position, lDX, lDY, world);
  env.update(controller.position);
  animals.update(dt, controller.position);

  renderer.render(scene, cam.camera);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init().catch(e => {
  console.error(e);
  // 万が一 init でエラーが出てもローディングを消してエラー表示する
  const ld = document.getElementById('loading');
  if (ld) { ld.innerHTML = '<div style="color:#f66;font-family:sans-serif;padding:20px">エラーが発生しました。<br>ブラウザの開発者ツールで詳細を確認してください。</div>'; }
});
