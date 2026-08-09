import * as THREE from 'three';
import { CONFIG } from '../config.js';

const C = CONFIG.camera;
const clamp = THREE.MathUtils.clamp;

export class ThirdPersonCamera {
  constructor(aspect, heading) {
    this.camera = new THREE.PerspectiveCamera(C.fov, aspect, C.near, C.far);
    this.yaw = heading + Math.PI;
    this._tYaw = this.yaw;
    this._elev = C.initElev; this._tElev = C.initElev;
    this._dist = C.distance; this._tDist = C.distance; this._occl = C.distance;
    this._pivot = new THREE.Vector3(); this._pivotInit = false;
    this._dir = new THREE.Vector3(); this._desiredPivot = new THREE.Vector3();
  }

  update(dt, targetPos, lookDX, lookDY, world) {
    this._tYaw -= lookDX * C.sensitivity;
    this._tElev = clamp(this._tElev - lookDY * C.sensitivity, C.minElev, C.maxElev);

    const kRot = 1 - Math.exp(-dt / C.rotTau);
    this.yaw += (this._tYaw - this.yaw) * kRot;
    this._elev += (this._tElev - this._elev) * kRot;
    this._dist += (this._tDist - this._dist) * (1 - Math.exp(-dt / C.distTau));

    this._desiredPivot.set(targetPos.x, targetPos.y + C.pivotHeight, targetPos.z);
    if (!this._pivotInit) { this._pivot.copy(this._desiredPivot); this._pivotInit = true; }
    else this._pivot.lerp(this._desiredPivot, 1 - Math.exp(-dt / C.pivotTau));

    const cosE = Math.cos(this._elev);
    this._dir.set(Math.sin(this.yaw) * cosE, Math.sin(this._elev), Math.cos(this.yaw) * cosE);

    const hit = world.raycast(this._pivot, this._dir, this._dist);
    const target = hit !== null ? Math.max(C.minOccl, hit - C.collisionPad) : this._dist;
    if (target < this._occl) this._occl = target;
    else this._occl += (target - this._occl) * (1 - Math.exp(-dt / C.occlRecoverTau));
    this._occl = Math.min(this._occl, this._dist);

    this.camera.position.copy(this._pivot).addScaledVector(this._dir, this._occl);
    this.camera.lookAt(this._pivot);
  }
}
