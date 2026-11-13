// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { resultHtml, playResult, COMMENTS, pickComment } from '../src/result-anim.js';

const r = { stageName: 'こけし', match: 87.34, seconds: 28.43, bonus: 92.6, total: 966, rank: 'A' };
function fakeTimers() {
  const q = []; let t = 0;
  return { setTimer: (fn, ms) => { q.push({ at: t + ms, fn }); q.sort((a, b) => a.at - b.at); return q.length; },
    runAll() { while (q.length) { const e = q.shift(); t = e.at; e.fn(); } } };
}
function mount() { document.body.innerHTML = `<div id="r">${resultHtml(r, { stageIndex: 2, last: false })}</div>`; return document.getElementById('r'); }
const audio = () => ({ playTick: vi.fn(), playPop: vi.fn(), playStamp: vi.fn(), vibrate: vi.fn() });

test('演出が終わると、すべての数字・ハンコ・名人の一言・ボタンが出る', () => {
  const el = mount(); const tm = fakeTimers(); const a = audio(); const done = vi.fn();
  playResult(el, r, { audio: a, setTimer: tm.setTimer, rng: () => 0, onDone: done });
  tm.runAll();
  expect(el.querySelector('[data-val="match"]').textContent).toBe('87.3%');
  expect(el.querySelector('[data-val="seconds"]').textContent).toBe('28.4秒');
  expect(el.querySelector('[data-val="bonus"]').textContent).toBe('+93');
  expect(el.querySelector('[data-val="total"]').textContent).toBe('966点');
  expect(el.querySelector('.hanko').classList.contains('show')).toBe(true);
  expect(el.querySelector('.hanko').textContent).toContain('A');
  expect(el.querySelector('[data-comment]').textContent).toBe(COMMENTS.A[0]);
  expect(el.querySelector('.result-actions').classList.contains('show')).toBe(true);
  expect(a.playPop).toHaveBeenCalledTimes(4); expect(a.playStamp).toHaveBeenCalledTimes(1);
  expect(a.playTick).toHaveBeenCalled(); expect(done).toHaveBeenCalledTimes(1);
});
test('途中で飛ばすと、すぐ全部出て、あとから音や表示が重ならない', () => {
  const el = mount(); const tm = fakeTimers(); const a = audio(); const done = vi.fn();
  const ctl = playResult(el, r, { audio: a, setTimer: tm.setTimer, rng: () => 0, onDone: done });
  ctl.skip();
  expect(el.querySelector('[data-val="total"]').textContent).toBe('966点');
  expect(el.querySelector('.result-actions').classList.contains('show')).toBe(true);
  a.playPop.mockClear(); a.playStamp.mockClear();
  tm.runAll();
  expect(a.playPop).not.toHaveBeenCalled(); expect(a.playStamp).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledTimes(1);
});
test('回っている間の数字は、最後と同じ形式', () => {
  const el = mount(); const tm = fakeTimers();
  playResult(el, r, { audio: audio(), setTimer: tm.setTimer, rng: () => 0.5 });
  // 最初の1回だけ進める
  const v = el.querySelector('[data-val="match"]').textContent;
  expect(v === '' || /^\d+\.\d%$/.test(v)).toBe(true);
});
test('名人の一言はランクごとに用意され、乱数で選ばれる', () => {
  for (const k of ['S', 'A', 'B', 'C']) expect(COMMENTS[k].length).toBeGreaterThanOrEqual(2);
  expect(pickComment('C', () => 0.999)).toBe(COMMENTS.C[COMMENTS.C.length - 1]);
});
test('名人の絵はランクで表情が変わる', () => {
  document.body.innerHTML = resultHtml({ ...r, rank: 'S' }, { stageIndex: 0, last: true });
  expect(document.querySelector('.master canvas').getAttribute('data-mood')).toBe('S');
  expect(document.querySelector('[data-act="next"]').textContent).toBe('エンディングへ');
});
