import * as THREE from 'three';

const YELLOW = 0xffe066;
const ORANGE = 0xff8800;
const PINK   = 0xffaacc;

export class Chick {
  constructor(x, z, scene) {
    this.x = x; this.z = z;
    this.state = 'lost'; // lost | following | delivered
    this._scene = scene;
    this._bounce = 0;
    this._dropTimer = 0;
    this._label = null;
    this._root = this._build();
    this._root.position.set(x, 0, z);
    scene.add(this._root);
    this._addCryLabel();
  }

  _build() {
    const g = new THREE.Group();

    // Body (fat sphere)
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.7 })
    );
    body.position.y = 0.22;
    body.scale.set(1, 0.85, 1);
    body.castShadow = true;
    g.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.7 })
    );
    head.position.set(0, 0.47, 0.08);
    head.castShadow = true;
    g.add(head);
    this._head = head;

    // Beak (orange cone)
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: ORANGE })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.47, 0.22);
    g.add(beak);

    // Eyes
    for (const sx of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      eye.position.set(sx, 0.51, 0.19);
      g.add(eye);
    }

    // Legs
    for (const sx of [-0.07, 0.07]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: ORANGE })
      );
      leg.position.set(sx, 0.06, 0);
      g.add(leg);
    }

    return g;
  }

  _addCryLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💧', 32, 26);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    this._label = new THREE.Sprite(mat);
    this._label.scale.set(0.5, 0.25, 1);
    this._label.position.set(0, 0.9, 0);
    this._label.visible = true;
    this._root.add(this._label);
  }

  update(dt, followX, followZ) {
    this._bounce = (this._bounce + dt * 6) % (Math.PI * 2);
    const bobY = Math.abs(Math.sin(this._bounce)) * 0.06;

    if (this.state === 'following') {
      const dx = followX - this._root.position.x;
      const dz = followZ - this._root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const speed = Math.min(dist * 6, 5.5);
        this._root.position.x += (dx / dist) * speed * dt;
        this._root.position.z += (dz / dist) * speed * dt;
        this._root.rotation.y = Math.atan2(dx, dz);
      }
      this._root.position.y = bobY;
      this._label.visible = false;
    } else {
      // lost / dropped: stand in place and bob
      this._root.position.y = bobY * 0.5;
      this._label.visible = true;
    }
  }

  join() {
    this.state = 'following';
    this._label.visible = false;
  }

  drop() {
    this.state = 'lost';
    this._label.visible = true;
    this.x = this._root.position.x;
    this.z = this._root.position.z;
  }

  deliver(scene) {
    this.state = 'delivered';
    this._root.visible = false;
  }

  get position() { return this._root.position; }

  dispose(scene) {
    scene.remove(this._root);
  }
}
