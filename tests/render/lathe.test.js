import { test, expect } from 'vitest';
import { createLatheGeometry, updateLatheGeometry, SEG } from '../../src/render/lathe.js';
import { createProfile } from '../../src/profile.js';

test('鉛筆の面は外向き（上側の頂点の法線が上を向く）', () => {
  const p = createProfile(); const g = createLatheGeometry(p.radii.length);
  updateLatheGeometry(g, p);
  const i = 50, top = i * (SEG + 1); // j=0 は角度0 → y=+r の上側
  const n = g.attributes.normal.array;
  expect(g.attributes.position.array[top * 3 + 1]).toBeGreaterThan(0);
  expect(n[top * 3 + 1]).toBeGreaterThan(0.9);
});
test('削っていない鉛筆の塗装は緑', () => {
  const p = createProfile(); const g = createLatheGeometry(p.radii.length);
  updateLatheGeometry(g, p);
  const c = g.attributes.color.array;
  expect(c[1]).toBeGreaterThan(c[0]); expect(c[1]).toBeGreaterThan(c[2]);   // 緑が一番強い
});
