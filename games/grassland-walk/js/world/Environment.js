import * as THREE from 'three';
import { CONFIG } from '../config.js';

const SKY_VERT = `
varying vec3 vPos;
void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAG = `
uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent;
varying vec3 vPos;
void main() {
  float h = normalize(vPos + vec3(0.0, offset, 0.0)).y;
  vec3 col = mix(bottomColor, topColor, pow(max(h, 0.0), exponent));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export class Environment {
  constructor(scene) {
    const horizon = new THREE.Color(0xc8dfa8);
    scene.fog = new THREE.Fog(horizon, CONFIG.fogNear, CONFIG.fogFar);
    scene.background = horizon;

    scene.add(new THREE.HemisphereLight(0xd0e8ff, 0x5a7a3a, 1.0));
    scene.add(new THREE.AmbientLight(0xc0d8b0, 0.5));

    const sun = new THREE.DirectionalLight(0xfffde0, 2.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -40; cam.right = cam.top = 40;
    cam.near = 10; cam.far = 200;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    this._sun = sun;

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor:    { value: new THREE.Color(0x5fa8e8) },
        bottomColor: { value: new THREE.Color(0x91c26a) },
        offset:  { value: 40 },
        exponent:{ value: 0.7 },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this._sky = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 12), skyMat);
    scene.add(this._sky);
    this._sunOffset = new THREE.Vector3(80, 110, 60);
  }

  update(target) {
    this._sun.position.copy(target).add(this._sunOffset);
    this._sun.target.position.copy(target);
    this._sun.target.updateMatrixWorld();
    this._sky.position.copy(target);
  }
}
