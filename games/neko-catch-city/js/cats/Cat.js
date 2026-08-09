import * as THREE from 'three';

const COLORS = {
  white:  { body: 0xf5f0eb, ear: 0xffb6b6, eye: 0x2d7a2d },
  black:  { body: 0x222222, ear: 0x442222, eye: 0xffdd00 },
  tora:   { body: 0xe08840, ear: 0xff9966, eye: 0x33aa33 },
  mike:   { body: 0xf5f0eb, ear: 0xffb6b6, eye: 0x2d7a2d },
  gray:   { body: 0x9a9a9a, ear: 0xbb8888, eye: 0x44aaff },
  cream:  { body: 0xeedd99, ear: 0xffbb88, eye: 0x338833 },
  golden: { body: 0xffd700, ear: 0xffaa00, eye: 0xff4400 },
};
const COLOR_KEYS = ['white', 'black', 'tora', 'mike', 'gray', 'cream'];

export class Cat {
  constructor(x, z, isGolden, colorKey) {
    this.isGolden = isGolden;
    this.state = 'idle'; // idle | flee | caught
    this._vel = new THREE.Vector2(0, 0);
    this._idleTimer = 0;

    const ck = isGolden ? 'golden' : (colorKey || COLOR_KEYS[0]);
    const c = COLORS[ck] || COLORS.white;

    this.root = new THREE.Group();
    this.root.position.set(x, 0, z);
    this._buildMesh(c, isGolden);
    this._tailAngle = 0;
    this._legAngle = 0;
  }

  _buildMesh(c, isGolden) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.9 });
    const earMat  = new THREE.MeshStandardMaterial({ color: c.ear,  roughness: 0.9 });
    const eyeMat  = new THREE.MeshStandardMaterial({ color: c.eye, emissive: c.eye, emissiveIntensity: 0.3 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff9999, roughness: 0.9 });

    // Body (capsule-like via scaled sphere)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), bodyMat);
    body.scale.set(1, 0.85, 1.3); body.position.y = 0.22; this.root.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat);
    head.position.set(0, 0.5, 0.16); this.root.add(head);
    this._head = head;

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.11, 4), earMat);
      ear.position.set(s * 0.1, 0.63, 0.16); ear.rotation.z = s * 0.3; head.add(ear);
    }

    // Eyes
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
      eye.position.set(s * 0.07, 0.03, 0.14); head.add(eye);
    }

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), noseMat);
    nose.position.set(0, -0.02, 0.155); head.add(nose);

    // Tail
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI * 1.5), bodyMat);
    tail.position.set(0, 0.2, -0.25); tail.rotation.y = Math.PI / 2; this.root.add(tail);
    this._tail = tail;

    // Legs
    this._legs = [];
    const legG = new THREE.CylinderGeometry(0.035, 0.025, 0.18, 5);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legG, bodyMat);
      const sx = (i < 2 ? -1 : 1) * 0.1;
      const sz = (i % 2 === 0 ? 1 : -1) * 0.1;
      leg.position.set(sx, 0.1, sz); this.root.add(leg);
      this._legs.push(leg);
    }

    // Golden glow
    if (isGolden) {
      const glow = new THREE.PointLight(0xffd700, 1.5, 3.5);
      glow.position.y = 0.4; this.root.add(glow);
      this._glow = glow;
    }

    // Ring marker on ground
    const ringG = new THREE.RingGeometry(0.35, 0.42, 24);
    ringG.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringG, new THREE.MeshStandardMaterial({ color: isGolden ? 0xffd700 : 0x88ccff, emissive: isGolden ? 0xffaa00 : 0x4488ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.7, depthWrite: false }));
    ring.position.y = 0.02; this.root.add(ring);
    this._ring = ring;
  }

  update(dt, playerX, playerZ) {
    if (this.state === 'caught') return;

    const dx = this.root.position.x - playerX;
    const dz = this.root.position.z - playerZ;
    const dist = Math.hypot(dx, dz);
    const fleeStart = this.isGolden ? 12 : 8;
    const stopDist  = this.isGolden ? 20 : 14;
    const fleeSpeed = this.isGolden ? 4.5 : 3.2;

    if (this.state === 'idle') {
      if (dist < fleeStart) this.state = 'flee';
      // idle animation: tail wag + head bob
      this._tailAngle += dt * 2;
      this._tail.rotation.z = Math.sin(this._tailAngle) * 0.4;
      this._head.rotation.x = Math.sin(this._tailAngle * 0.5) * 0.06;
    } else if (this.state === 'flee') {
      if (dist > stopDist) { this.state = 'idle'; return; }
      // run away
      const len = Math.hypot(dx, dz);
      if (len > 0.1) {
        const nx = dx / len, nz = dz / len;
        this._vel.x += (nx * fleeSpeed - this._vel.x) * (1 - Math.exp(-dt / 0.15));
        this._vel.y += (nz * fleeSpeed - this._vel.y) * (1 - Math.exp(-dt / 0.15));
      }
      this.root.position.x += this._vel.x * dt;
      this.root.position.z += this._vel.y * dt;
      this.root.rotation.y = Math.atan2(this._vel.x, this._vel.y);

      // running animation
      this._legAngle += dt * 12;
      this._legs.forEach((l, i) => { l.rotation.x = Math.sin(this._legAngle + i * Math.PI * 0.5) * 0.5; });
    }
  }

  catch() {
    this.state = 'caught';
    this._ring.visible = false;
    // float up and fade
    this._catchTimer = 0;
  }

  updateCatch(dt) {
    if (this.state !== 'caught') return false;
    this._catchTimer = (this._catchTimer || 0) + dt;
    this.root.position.y += dt * 2;
    this.root.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = Math.max(0, 1 - this._catchTimer * 2); } });
    return this._catchTimer > 0.7;
  }
}
