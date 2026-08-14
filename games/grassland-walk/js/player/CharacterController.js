import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getHeight } from '../terrain/TerrainBuilder.js';

const TWO_PI = Math.PI * 2;
const wrapAngle = a => (((a + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI - Math.PI;

export class CharacterController {
  constructor(world) {
    this.root = new THREE.Group();
    this.root.position.set(0, getHeight(0, 0), 0);
    this.yaw = 0;
    this.root.rotation.y = this.yaw;
    this.speed = 0;
    this._world = world;
    this._velX = 0; this._velZ = 0;
    this._goalX = 0; this._goalZ = 0; this._goalRun = false; this._hasGoal = false;
  }

  get position() { return this.root.position; }

  setGoal(x, z, run) { this._goalX = x; this._goalZ = z; this._goalRun = run; this._hasGoal = true; }

  update(dt, moveX, moveY, run, cameraYaw) {
    const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
    const rx = -fz, rz = fx;
    let dirX = fx * moveY + rx * moveX;
    let dirZ = fz * moveY + rz * moveX;
    let isRunning = run;

    if (Math.hypot(dirX, dirZ) < 1e-4 && this._hasGoal) {
      const dx = this._goalX - this.root.position.x;
      const dz = this._goalZ - this.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3) { dirX = dx / dist; dirZ = dz / dist; isRunning = this._goalRun; }
      else { this._hasGoal = false; }
    }

    const len = Math.hypot(dirX, dirZ);
    let targetVX = 0, targetVZ = 0;
    if (len > 1e-4) {
      const sp = (isRunning ? CONFIG.runSpeed : CONFIG.walkSpeed) * Math.min(len, 1);
      targetVX = (dirX / len) * sp; targetVZ = (dirZ / len) * sp;
    }

    const moving = Math.hypot(targetVX, targetVZ) > Math.hypot(this._velX, this._velZ);
    const k = 1 - Math.exp(-dt / (moving ? CONFIG.accelTau : CONFIG.decelTau));
    this._velX += (targetVX - this._velX) * k;
    this._velZ += (targetVZ - this._velZ) * k;

    const p = this.root.position;
    const solved = this._world.resolveCircle(p.x + this._velX * dt, p.z + this._velZ * dt, CONFIG.charRadius);
    if (dt > 0) { this._velX = (solved.x - p.x) / dt; this._velZ = (solved.z - p.z) / dt; }

    // Snap Y to terrain height
    p.set(solved.x, getHeight(solved.x, solved.z), solved.z);
    this.speed = Math.hypot(this._velX, this._velZ);

    if (this.speed > 0.1) {
      const targetYaw = Math.atan2(this._velX, this._velZ);
      this.yaw += wrapAngle(targetYaw - this.yaw) * (1 - Math.exp(-CONFIG.turnRate * dt));
      this.root.rotation.y = this.yaw;
    }
  }
}
