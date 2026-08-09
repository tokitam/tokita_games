import * as THREE from 'three';

const BODY_COLOR  = 0xc0c0c0;
const DOME_COLOR  = 0xe8e8e8;
const LED_COLOR   = 0xff2222;
const BRUSH_COLOR = 0x333333;

export class Robot {
  constructor(x, z, scene) {
    this.root = new THREE.Group();
    this.root.position.set(x, 0, z);
    this._buildMesh();
    scene.add(this.root);
    this._brushAngle = 0;
  }

  _buildMesh() {
    // Disk body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.35, metalness: 0.6 })
    );
    body.position.y = 0.09;
    body.castShadow = true;
    this.root.add(body);

    // Dome top
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: DOME_COLOR, roughness: 0.2, metalness: 0.5 })
    );
    dome.position.y = 0.18;
    dome.castShadow = true;
    this.root.add(dome);

    // Red LED eye (front)
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshStandardMaterial({ color: LED_COLOR, emissive: LED_COLOR, emissiveIntensity: 2 })
    );
    led.position.set(0, 0.22, 0.28);
    this.root.add(led);

    // Rotating brush disc under body
    this._brush = new THREE.Group();
    this._brush.position.y = 0.02;
    for (let i = 0; i < 3; i++) {
      const bristle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6),
        new THREE.MeshStandardMaterial({ color: BRUSH_COLOR })
      );
      bristle.rotation.z = Math.PI / 2;
      bristle.rotation.y = (i / 3) * Math.PI * 2;
      bristle.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.22, 0, Math.sin((i / 3) * Math.PI * 2) * 0.22);
      this._brush.add(bristle);
    }
    this.root.add(this._brush);
  }

  update(dt, playerX, playerZ, world, speed) {
    const p = this.root.position;
    const dx = playerX - p.x, dz = playerZ - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;

    const nx = dx / dist, nz = dz / dist;
    const nx2 = p.x + nx * speed * dt, nz2 = p.z + nz * speed * dt;
    const solved = world.resolveCircle(nx2, nz2, 0.42);
    p.set(solved.x, 0, solved.z);

    // face player
    this.root.rotation.y = Math.atan2(dx, dz);

    // spin brush
    this._brushAngle += speed * dt * 4;
    this._brush.rotation.y = this._brushAngle;
  }

  get position() { return this.root.position; }

  dispose(scene) {
    scene.remove(this.root);
  }
}
