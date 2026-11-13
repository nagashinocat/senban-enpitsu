import { test, expect } from 'vitest';
import { createProfile, xToIndex, cutSweep } from '../src/profile.js';
import { PENCIL_RADIUS } from '../src/config.js';

test('新しい鉛筆はどこも同じ太さ', () => {
  const p = createProfile();
  expect(p.radii.every(r => Math.abs(r - PENCIL_RADIUS) < 1e-6)).toBe(true);
});
test('刃より内側だけが細くなり、外側は変わらない', () => {
  const p = createProfile(); cutSweep(p, { x: 1, r: 0.3 }, { x: 1, r: 0.3 }, 0.05);
  expect(p.radii[xToIndex(p, 1)]).toBeCloseTo(0.3);
  expect(p.radii[xToIndex(p, 3)]).toBeCloseTo(PENCIL_RADIUS);
});
test('削った分は戻らない', () => {
  const p = createProfile();
  cutSweep(p, { x: 1, r: 0.2 }, { x: 1, r: 0.2 }, 0.05);
  cutSweep(p, { x: 1, r: 0.35 }, { x: 1, r: 0.35 }, 0.05);
  expect(p.radii[xToIndex(p, 1)]).toBeCloseTo(0.2);
});
test('大きく動いても間が飛ばない', () => {
  const p = createProfile(); cutSweep(p, { x: 0.5, r: 0.3 }, { x: 5.5, r: 0.3 }, 0.02);
  for (let x = 0.6; x < 5.4; x += 0.05) expect(p.radii[xToIndex(p, x)]).toBeLessThanOrEqual(0.3001);
});
test('半径は0未満にならない、maxBite を返す', () => {
  const p = createProfile(); const r = cutSweep(p, { x: 2, r: -1 }, { x: 2, r: -1 }, 0.05);
  expect(Math.min(...p.radii)).toBe(0);
  expect(r.maxBite).toBeCloseTo(PENCIL_RADIUS);
  expect(p.radii[r.biteAt]).toBe(0);
});
test('xToIndex は範囲外を端に丸める', () => {
  const p = createProfile();
  expect(xToIndex(p, -5)).toBe(0); expect(xToIndex(p, 99)).toBe(p.radii.length - 1);
});
