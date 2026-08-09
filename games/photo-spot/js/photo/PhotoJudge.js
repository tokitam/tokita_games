import * as THREE from 'three';

const FRUSTUM = new THREE.Frustum();
const PROJ_SCREEN = new THREE.Matrix4();

export class PhotoJudge {
  constructor(camera, scene) {
    this._camera = camera;
    this._scene  = scene;
    this._raycaster = new THREE.Raycaster();
  }

  judge(landmark, playerPos) {
    const camera = this._camera;
    PROJ_SCREEN.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    FRUSTUM.setFromProjectionMatrix(PROJ_SCREEN);

    // Target point = top of landmark
    const targetWorld = new THREE.Vector3(landmark.x, landmark.targetY, landmark.z);

    // Must be inside frustum
    if (!FRUSTUM.containsPoint(targetWorld)) return null;

    // Occlusion check: raycast from camera to landmark target
    const camPos = camera.position;
    const dir = targetWorld.clone().sub(camPos).normalize();
    this._raycaster.set(camPos, dir);
    const dist = camPos.distanceTo(targetWorld);
    const hits = this._raycaster.intersectObjects(this._scene.children, true);
    const blocked = hits.some(h => h.distance < dist - 1.5 && h.object.castShadow);
    if (blocked) return 0; // something in the way

    // NDC position of target (0=center, 1=edge)
    const ndc = targetWorld.clone().project(camera);
    const centerDeg = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));

    // Distance to landmark
    const d = Math.hypot(landmark.x - playerPos.x, landmark.z - playerPos.z);

    let stars = 1; // base: in frame + not blocked = at least 1 star
    if (d >= landmark.def.minDist && d <= landmark.def.maxDist) stars++;
    if (centerDeg < 0.3) stars++; // within central 30% of frame

    return stars;
  }
}
