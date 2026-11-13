import { test, expect } from 'vitest';
import { createProfile, cutSweep } from '../src/profile.js';
import { isBroken } from '../src/breakage.js';

test('太い所の浅い削りでは折れない', () => {
  const p = createProfile(); const c = cutSweep(p, { x: 2, r: 0.35 }, { x: 2, r: 0.35 }, 0.05);
  expect(isBroken(p, c)).toBe(false);
});
test('細い所に深く当てると折れる', () => {
  const p = createProfile();
  for (let r = 0.38; r >= 0.12; r -= 0.02) cutSweep(p, { x: 2, r }, { x: 2, r }, 0.05);
  const c = cutSweep(p, { x: 2, r: 0.02 }, { x: 2, r: 0.02 }, 0.05);
  expect(isBroken(p, c)).toBe(true);
});
test('同じ削りでも breakFactor が小さいと折れる', () => {
  const a = createProfile(); const ca = cutSweep(a, { x: 2, r: 0.33 }, { x: 2, r: 0.33 }, 0.05);
  expect(isBroken(a, ca, 1)).toBe(false);
  expect(isBroken(a, ca, 0.2)).toBe(true);
});
test('何も削れていなければ折れない', () => {
  const p = createProfile(); const c = cutSweep(p, { x: 2, r: 1 }, { x: 2, r: 1 }, 0.05);
  expect(isBroken(p, c)).toBe(false);
});
test('芯を断ち切ったら折れる', () => {
  const p = createProfile();
  for (let r = 0.38; r >= 0.02; r -= 0.005) cutSweep(p, { x: 2, r }, { x: 2, r }, 0.05);
  const c = cutSweep(p, { x: 2, r: 0 }, { x: 2, r: 0 }, 0.05);
  expect(isBroken(p, c)).toBe(true);
});
test('横に送って削っても、ゆっくりなら折れない', () => {
  const p = createProfile();
  let broke = false;
  for (let x = 1; x < 4; x += 0.02) { const c = cutSweep(p, { x, r: 0.25 }, { x: x + 0.02, r: 0.25 }, 0.04); broke ||= isBroken(p, c); }
  expect(broke).toBe(false);
});
test('同じ深さでも、横に速く送ると折れる', () => {
  const p = createProfile(); const c = cutSweep(p, { x: 1, r: 0.15 }, { x: 2, r: 0.15 }, 0.04);
  expect(isBroken(p, c)).toBe(true);
});
