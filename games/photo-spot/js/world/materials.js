import * as THREE from 'three';

export const WALL_PALETTE = [
  '#c9bfae','#b7b1a8','#c2a08a','#a9b0bb','#b4bfae','#cec6b2','#9aa1a8','#b39f96',
].map(c => new THREE.Color(c));

const WINDOW_STYLES = [
  { cols: 6, rows: 6, lit: 0.22 },
  { cols: 8, rows: 8, lit: 0.3 },
  { cols: 8, rows: 12, lit: 0.25 },
  { cols: 10, rows: 16, lit: 0.32 },
];

export function createWindowTexture(styleIndex, rng) {
  const { cols, rows, lit } = WINDOW_STYLES[styleIndex % WINDOW_STYLES.length];
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d9d6cd';
  ctx.fillRect(0, 0, size, size);
  const cw = size / cols, ch = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rng() < lit) {
        const g = 220 + Math.floor(rng() * 25);
        ctx.fillStyle = `rgb(255, ${g}, 165)`;
      } else {
        const n = Math.floor(rng() * 14);
        ctx.fillStyle = `rgb(${34 + n}, ${42 + n}, ${52 + n})`;
      }
      ctx.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.25, cw * 0.56, ch * 0.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
