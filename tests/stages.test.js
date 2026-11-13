import { test, expect } from 'vitest';
import { STAGES, buildTarget, INTRO, ENDING, tipStartIndex } from '../src/stages.js';
import { CORE_RADIUS, PENCIL_RADIUS, SAMPLES } from '../src/config.js';

const localMinima = (t) => { let n = 0; for (let i = 2; i < t.length - 2; i++) if (t[i] < t[i - 1] - 1e-6 && t[i] <= t[i + 1]) n++; return n; };

test('5面ある', () => expect(STAGES).toHaveLength(5));
test('どの目標も芯の半分より太く、元の鉛筆以下', () => {
  for (const s of STAGES) {
    const t = buildTarget(s); expect(t.length).toBe(SAMPLES);
    for (const r of t) { expect(r).toBeGreaterThanOrEqual(CORE_RADIUS * 0.5 - 1e-6); expect(r).toBeLessThanOrEqual(PENCIL_RADIUS + 1e-6); }
  }
});
test('後の面ほど折れやすい', () => {
  for (let i = 1; i < 5; i++) expect(STAGES[i].breakFactor).toBeLessThanOrEqual(STAGES[i - 1].breakFactor);
});
test('顔の面には凹凸が3つ以上ある', () => expect(localMinima(buildTarget(STAGES[4]))).toBeGreaterThanOrEqual(3));
test('どの面の話も1〜2行', () => {
  for (const s of STAGES) { expect(s.story.length).toBeGreaterThanOrEqual(1); expect(s.story.length).toBeLessThanOrEqual(2); }
});
test('1面目は先に向かって細くなる円すい', () => {
  const t = buildTarget(STAGES[0]);
  expect(t[0]).toBeCloseTo(PENCIL_RADIUS); expect(t[SAMPLES - 1]).toBeLessThan(t[Math.floor(SAMPLES * 0.85)]);
});
test('導入とエンディングがある', () => { expect(INTRO.length).toBeGreaterThan(0); expect(ENDING.length).toBeGreaterThan(0); });
test('どの面も、先端の部分より手前は元の太さのまま', () => {
  for (const s of STAGES) {
    const t = buildTarget(s); const k = tipStartIndex(s);
    expect(s.tip).toBeGreaterThan(0); expect(s.tip).toBeLessThanOrEqual(0.4);
    for (let i = 0; i < k; i++) expect(t[i]).toBeCloseTo(PENCIL_RADIUS);
    expect(Math.min(...t.slice(k))).toBeLessThan(PENCIL_RADIUS * 0.9);
  }
});
