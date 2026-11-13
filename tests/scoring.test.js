import { test, expect } from 'vitest';
import { createProfile } from '../src/profile.js';
import { matchRate, timeBonus, scoreResult, rankOf } from '../src/scoring.js';
import { SAMPLES } from '../src/config.js';
import { STAGES, buildTarget, tipStartIndex } from '../src/stages.js';

test('目標とぴったりなら一致率100', () => {
  const p = createProfile(); expect(matchRate(p, p.radii.slice())).toBe(100);
});
test('削りすぎは削り残しより低い', () => {
  const t = new Float32Array(SAMPLES).fill(0.3);
  const under = createProfile(); under.radii.fill(0.27);
  const over = createProfile(); over.radii.fill(0.33);
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
test('点線から1px（縦持ち画面）ずれただけなら、どの面も A 以上', () => {
  for (const st of STAGES) {
    const t = buildTarget(st); const p = createProfile();
    for (let i = 0; i < t.length; i++) p.radii[i] = Math.max(0, t[i] - 0.018);
    expect(scoreResult(p, t, 999, st.parSeconds, tipStartIndex(st)).total).toBeGreaterThanOrEqual(850);
  }
});
test('何も削らずにすぐ完成したら、どの面も C', () => {
  for (const st of STAGES) expect(scoreResult(createProfile(), buildTarget(st), 0, st.parSeconds, tipStartIndex(st)).rank).toBe('C');
});
test('採点は先端の部分の大きさで割る（手前の削らない部分で水増ししない）', () => {
  const st = STAGES[2]; const t = buildTarget(st); const k = tipStartIndex(st);
  expect(matchRate(createProfile(), t, k)).toBeLessThan(matchRate(createProfile(), t, 0));
});
test('先端の外を削りすぎたら減点される', () => {
  const st = STAGES[2]; const t = buildTarget(st); const k = tipStartIndex(st);
  const p = createProfile(); p.radii.set(t);
  expect(matchRate(p, t, k)).toBe(100);
  for (let i = 0; i < 20; i++) p.radii[i] = 0.25;
  expect(matchRate(p, t, k)).toBeLessThan(100);
});
test('許容幅を狭くすると、同じずれでも一致率が下がる', () => {
  const t = new Float32Array(SAMPLES).fill(0.3); const p = createProfile(); p.radii.fill(0.33);
  expect(scoreResult(p, t, 10, 30, 0, 0.1).match).toBeLessThan(scoreResult(p, t, 10, 30, 0).match);
});
