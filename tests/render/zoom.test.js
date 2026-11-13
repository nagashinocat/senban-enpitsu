import { test, expect } from 'vitest';
import { zoomRect, zoomCenter } from '../../src/render/zoom.js';
import { createProfile, cutSweep } from '../../src/profile.js';
import { PENCIL_LENGTH } from '../../src/config.js';

test('縦持ちでは、鉛筆より上に横長の大きな窓', () => {
  const r = zoomRect(390, 844, { pencilTopPx: 400 });
  expect(r.w).toBeGreaterThanOrEqual(390 * 0.85);
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.w).toBeLessThanOrEqual(390);
  expect(r.y).toBeGreaterThanOrEqual(80);           // 上の表示と重ならない
  expect(r.y + r.h).toBeLessThanOrEqual(400 - 10);  // 鉛筆と重ならない
  expect(r.h).toBeGreaterThan(150);
});
test('横持ちでは右上、鉛筆と重ならない', () => {
  const r = zoomRect(844, 390, { pencilTopPx: 150 });
  expect(r.x).toBeGreaterThan(844 / 2); expect(r.x + r.w).toBeLessThanOrEqual(844);
  expect(r.y + r.h).toBeLessThanOrEqual(150 - 4); expect(r.h).toBeGreaterThan(40);
});
test('窓の中心は刃の位置の、鉛筆の今の表面', () => {
  const p = createProfile(); cutSweep(p, { x: 2, r: 0.25 }, { x: 2, r: 0.25 }, 0.05);
  const c = zoomCenter(p, { x: 2, r: 0.6 });
  expect(c.x).toBeCloseTo(2); expect(c.y).toBeCloseTo(-0.25);
});
test('刃が鉛筆の外に出ても中心は鉛筆の範囲内', () => {
  const p = createProfile();
  expect(zoomCenter(p, { x: -3, r: 0.6 }).x).toBe(0);
  expect(zoomCenter(p, { x: 99, r: 0.6 }).x).toBe(PENCIL_LENGTH);
});
