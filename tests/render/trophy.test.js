import { test, expect } from 'vitest';
import { trophyRadii, paintColor, decorations, WOOD_RGB } from '../../src/render/trophy-model.js';
import { STAGES, KIWAMI, buildTarget, tipStartIndex } from '../../src/stages.js';
import { createProfile } from '../../src/profile.js';

const seeded = (s = 1) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
function carved(stage, err) { const t = buildTarget(stage); const p = createProfile(); for (let i = 0; i < t.length; i++) p.radii[i] = Math.max(0, t[i] - err); return { p, t }; }
const meanErr = (a, t, from) => { let s = 0; for (let i = from; i < t.length; i++) s += Math.abs(a[i] - t[i]); return s / (t.length - from); };

test('S は削った形が目標の形に近づいて、整って見える', () => {
  const st = STAGES[2]; const { p, t } = carved(st, 0.04); const k = tipStartIndex(st);
  const r = trophyRadii(p, t, k, 'S', seeded());
  expect(meanErr(r, t, k)).toBeLessThan(meanErr(p.radii, t, k) / 2);
});
test('A・B は削ったまま', () => {
  const st = STAGES[2]; const { p, t } = carved(st, 0.04); const k = tipStartIndex(st);
  expect(Array.from(trophyRadii(p, t, k, 'B', seeded()))).toEqual(Array.from(p.radii));
});
test('C はぼろぼろ：あちこち欠けている', () => {
  const st = STAGES[2]; const { p, t } = carved(st, 0.04); const k = tipStartIndex(st);
  const r = trophyRadii(p, t, k, 'C', seeded());
  let chips = 0; for (let i = k; i < r.length; i++) if (r[i] < p.radii[i] - 0.01) chips++;
  expect(chips).toBeGreaterThan(8);
  for (const v of r) expect(v).toBeGreaterThanOrEqual(0);
});
test('B と C は色を塗らない（木の地肌、C は黒ずむ）', () => {
  expect(paintColor('kokeshi', 'B', 0.3, 0, 0.8)).toEqual(WOOD_RGB);
  const c = paintColor('kokeshi', 'C', 0.3, 0, 0.8); expect(c[0] + c[1] + c[2]).toBeLessThan(WOOD_RGB[0] + WOOD_RGB[1] + WOOD_RGB[2]);
});
test('A と S は形らしい色を塗る（こけしは赤い着物と黒髪）', () => {
  const body = paintColor('kokeshi', 'A', 0.3, 1.2, 0.8); expect(body[0]).toBeGreaterThan(body[1] + 0.2);
  const hair = paintColor('kokeshi', 'A', 0.95, Math.PI, 0.8); expect(hair[0] + hair[1] + hair[2]).toBeLessThan(0.5);
});
test('どの形にも塗り方がある', () => {
  for (const s of [...STAGES, ...KIWAMI]) {
    const c = paintColor(s.id, 'S', 0.5, 0.3, 0.7);
    expect(c).toHaveLength(3); expect(c.some((v, i) => Math.abs(v - WOOD_RGB[i]) > 0.05)).toBe(true);
  }
});
test('S の五重塔は、相輪（輪が9つと宝珠）と屋根ごとの風鈴がつく', () => {
  const st = KIWAMI[4]; const t = buildTarget(st); const k = tipStartIndex(st);
  const d = decorations(st.id, 'S', t, k);
  expect(d.filter((x) => x.kind === 'ring')).toHaveLength(9);
  expect(d.filter((x) => x.kind === 'jewel')).toHaveLength(1);
  expect(d.filter((x) => x.kind === 'bell').length).toBeGreaterThanOrEqual(20);
  expect(decorations(st.id, 'A', t, k).filter((x) => x.kind !== 'sparkle')).toHaveLength(0);
});
test('S はどの形にも光の粒、A 以下にはつかない', () => {
  const st = STAGES[0]; const t = buildTarget(st); const k = tipStartIndex(st);
  expect(decorations(st.id, 'S', t, k).some((x) => x.kind === 'sparkle')).toBe(true);
  expect(decorations(st.id, 'B', t, k)).toHaveLength(0);
});
