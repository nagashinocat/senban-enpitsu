import { test, expect } from 'vitest';
import { createProfile } from '../src/profile.js';
import { matchRate, timeBonus, scoreResult, rankOf } from '../src/scoring.js';
import { SAMPLES } from '../src/config.js';

test('目標とぴったりなら一致率100', () => {
  const p = createProfile(); expect(matchRate(p, p.radii.slice())).toBe(100);
});
test('削りすぎは削り残しより低い', () => {
  const t = new Float32Array(SAMPLES).fill(0.3);
  const under = createProfile(); under.radii.fill(0.29);
  const over = createProfile(); over.radii.fill(0.31);
  expect(matchRate(under, t)).toBeLessThan(matchRate(over, t));
});
test('何も削らずに完成しても NaN にならない', () => {
  const p = createProfile(); const t = new Float32Array(SAMPLES).fill(0.15);
  const s = scoreResult(p, t, 3, 30);
  expect(Number.isFinite(s.total)).toBe(true); expect(s.rank).toBe('C');
});
test('ランクの境目', () => {
  expect(rankOf(1000)).toBe('S'); expect(rankOf(999)).toBe('A'); expect(rankOf(850)).toBe('A');
  expect(rankOf(700)).toBe('B'); expect(rankOf(699)).toBe('C');
});
test('タイムボーナスは0..TIME_BONUS_MAX', () => {
  expect(timeBonus(0, 30)).toBe(200); expect(timeBonus(999, 30)).toBe(0);
});
test('時間が NaN でも点数は数になる', () => {
  const p = createProfile(); expect(Number.isFinite(scoreResult(p, p.radii.slice(), NaN, 30).total)).toBe(true);
});
test('形が合っていなければタイムボーナスはつかない', () => {
  const p = createProfile(); const t = new Float32Array(SAMPLES).fill(0.15);
  expect(scoreResult(p, t, 1, 30).bonus).toBe(0);
});
test('一致率が高いほどタイムボーナスがそのまま効く', () => {
  const p = createProfile(); expect(scoreResult(p, p.radii.slice(), 0, 30).bonus).toBe(200);
});
