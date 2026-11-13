import { test, expect } from 'vitest';
import { initCat, stepCat, CAT } from '../src/cat.js';

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('最初のいたずらは8〜15秒後、その前に顔をのぞかせる', () => {
  let cat = initCat(0, seq(0));            // rng 0 → 8秒後
  expect(cat.phase).toBe('idle'); expect(cat.until).toBeCloseTo(CAT.MIN_GAP);
  let r = stepCat(cat, 7.9, seq(0)); expect(r.actions).toEqual([]);
  r = stepCat(r.cat, 8.0, seq(0)); expect(r.actions).toEqual(['warn']); expect(r.cat.phase).toBe('warn');
});
test('長押し：3秒押さえて離す', () => {
  let { cat } = stepCat(initCat(0, seq(0)), 8, seq(0));        // warn
  let r = stepCat(cat, 8 + CAT.WARN, seq(0.2));                  // rng < 0.5 → hold
  expect(r.actions).toEqual(['holdStart']); expect(r.cat.phase).toBe('hold');
  r = stepCat(r.cat, 8 + CAT.WARN + CAT.HOLD, seq(0.5));
  expect(r.actions).toEqual(['holdEnd']); expect(r.cat.phase).toBe('idle');
  expect(r.cat.until).toBeGreaterThanOrEqual(8 + CAT.WARN + CAT.HOLD + CAT.MIN_GAP);
});
test('にゃにゃにゃにゃ：2秒のあいだ何度もボタンを押す', () => {
  let { cat } = stepCat(initCat(0, seq(0)), 8, seq(0));
  let r = stepCat(cat, 8 + CAT.WARN, seq(0.9));                  // rng >= 0.5 → nyanya
  expect(r.actions).toEqual(['nyaStart', 'tap']);
  let taps = 1, t = 8 + CAT.WARN;
  while (r.cat.phase === 'nyanya') { t += 0.05; r = stepCat(r.cat, t, seq(0.5)); taps += r.actions.filter((a) => a === 'tap').length; }
  expect(taps).toBeGreaterThanOrEqual(8);
  expect(r.actions).toContain('nyaEnd');
});
test('1フレームが長くても、いたずらを飛ばさず順に進む', () => {
  const r = stepCat(initCat(0, seq(0)), 30, seq(0.2));
  expect(r.actions[0]).toBe('warn');
});
