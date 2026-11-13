import * as THREE from 'three';
import { PENCIL_RADIUS, CORE_RADIUS } from '../config.js';

export const SEG = 40; // 周方向の分割
const PAINT = new THREE.Color('#f2b632');
const WOOD = new THREE.Color('#e8c99a');
const LEAD = new THREE.Color('#2b2b2e');

// x 軸まわりの回転体。面は外向き
export function createLatheGeometry(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * (SEG + 1) * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * (SEG + 1) * 3), 3));
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < SEG; j++) {
    const a = i * (SEG + 1) + j, b = a + SEG + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  g.setIndex(idx);
  return g;
}

export function updateLatheGeometry(geom, profile) {
  const { radii, dx } = profile;
  const pos = geom.attributes.position.array, col = geom.attributes.color.array;
  let k = 0;
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i];
    const c = r <= CORE_RADIUS + 1e-4 ? LEAD : r >= PENCIL_RADIUS - 1e-4 ? PAINT : WOOD;
    for (let j = 0; j <= SEG; j++) {
      const t = (j / SEG) * Math.PI * 2;
      pos[k] = i * dx; pos[k + 1] = Math.cos(t) * r; pos[k + 2] = Math.sin(t) * r;
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; k += 3;
    }
  }
  geom.attributes.position.needsUpdate = true; geom.attributes.color.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}
