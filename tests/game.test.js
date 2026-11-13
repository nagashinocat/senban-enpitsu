// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from 'vitest';
import { createGame } from '../src/game.js';
import { PENCIL_RADIUS } from '../src/config.js';
import { _resetForTest } from '../src/storage.js';

function fakeDeps() {
  const scene = { view: { xMin: 0, xMax: 6, yMin: -1, yMax: 1 }, setProfile: vi.fn(), markDirty: vi.fn(), setTarget: vi.fn(),
    setTool: vi.fn(), emitChips: vi.fn(), flashBreak: vi.fn(), resize: vi.fn(), render: vi.fn(), snapshot: vi.fn(), dispose: vi.fn() };
  const audio = { unlock: vi.fn(), startCutSound: vi.fn(), setCutIntensity: vi.fn(), stopCutSound: vi.fn(), playBreak: vi.fn(), playDing: vi.fn(), vibrate: vi.fn() };
  let t = 0;
  return { scene, audio, deps: { createScene: () => scene, attachInput: vi.fn(() => () => {}), audio, now: () => t, raf: () => 0 }, tick: (s) => { t += s * 1000; } };
}
function setup() {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps();
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), f.deps);
  return { game, ...f };
}
beforeEach(() => { localStorage.clear(); _resetForTest(); URL.createObjectURL = () => 'blob:x'; });

test('C ランクでも次の面へ進める', () => {
  const { game } = setup();
  game.goto('cutting', 0);
  game.finish();
  expect(game.state.name).toBe('result');
  expect(game.lastResult.rank).toBe('C');
  game.next();
  expect(game.state).toEqual({ name: 'story', stage: 1 });
});
test('折れたら同じ面の cutting に戻り、輪郭が新品になる', () => {
  const { game, audio } = setup();
  game.goto('cutting', 2);
  game.handleStart(); game.handleMove({ x: 2, r: 0 }); game.handleMove({ x: 2, r: -3 });
  expect(game.state.name).toBe('broken');
  expect(audio.playBreak).toHaveBeenCalled();
  game.retry();
  expect(game.state).toEqual({ name: 'cutting', stage: 2 });
  expect(game.profile.radii.every(r => Math.abs(r - PENCIL_RADIUS) < 1e-6)).toBe(true);
});
test('ゆっくり削れば折れずに細くなる', () => {
  const { game } = setup();
  game.goto('cutting', 0);
  game.handleStart(); game.handleMove({ x: 2, r: 0 });
  for (let k = 1; k <= 60; k++) game.handleMove({ x: 2, r: -0.02 * k });
  expect(game.state.name).toBe('cutting');
  expect(Math.min(...game.profile.radii)).toBeLessThan(PENCIL_RADIUS - 0.05);
});
test('最終面の result の次は ending', () => {
  const { game } = setup();
  game.goto('cutting', 4); game.finish(); game.next();
  expect(game.state.name).toBe('ending');
});
test('完成のタイムは cutting に入ってからの秒数', () => {
  const { game, tick } = setup();
  game.goto('cutting', 0); tick(12.5); game.finish();
  expect(game.lastResult.seconds).toBeCloseTo(12.5);
});
test('記録が保存され、次の面が選べるようになる', () => {
  const { game } = setup();
  game.goto('cutting', 0); game.finish();
  expect(game.unlockedStages()).toEqual([0, 1]);
});
test('タイトルから始めると導入が出る', () => {
  const { game } = setup();
  game.start(); expect(game.state.name).toBe('title');
  game.newGame(); expect(game.state.name).toBe('intro');
});
test('共有できないとき、保存とコピーの案内が出る', async () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps();
  const share = { makeResultBlob: vi.fn(() => Promise.resolve(new Blob(['x']))), buildShareText: vi.fn(() => 'TEXT'),
    shareResult: vi.fn(async (b, t, info) => { info.copied = false; return 'fallback'; }) };
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, share });
  game.goto('cutting', 2); game.finish();
  await game.onShare();
  expect(share.makeResultBlob.mock.calls[0][0].stageName).toBe('こけし');
  const msg = document.querySelector('[data-share-msg]').textContent;
  expect(msg).toContain('長押し'); expect(msg).toContain('TEXT');
  expect(document.querySelector('[data-share-img] img')).not.toBeNull();
});
test('共有中にもう一度押しても二重に動かない', async () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps(); let release;
  const share = { makeResultBlob: vi.fn(() => Promise.resolve(new Blob(['x']))), buildShareText: vi.fn(() => 'T'),
    shareResult: vi.fn(() => new Promise((r) => { release = () => r('shared'); })) };
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, share });
  game.goto('cutting', 0); game.finish();
  const a = game.onShare(); await Promise.resolve(); await Promise.resolve();
  await game.onShare();
  release(); await a;
  expect(share.shareResult).toHaveBeenCalledTimes(1);
});
test('画像が作れなければ「保存しました」と言わず、投稿文を出す', async () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps();
  const share = { makeResultBlob: vi.fn(() => Promise.resolve(null)), buildShareText: vi.fn(() => 'TEXT'), shareResult: vi.fn() };
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, share });
  game.goto('cutting', 0); game.finish(); await game.onShare();
  const msg = document.querySelector('[data-share-msg]').textContent;
  expect(msg).not.toContain('保存しました'); expect(msg).toContain('TEXT');
});
test('共有の途中で例外が出ても落ちず、投稿文を出す', async () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps();
  const share = { makeResultBlob: vi.fn(() => Promise.resolve(new Blob(['x']))), buildShareText: vi.fn(() => 'TEXT'),
    shareResult: vi.fn(() => Promise.reject(new Error('File is not defined'))) };
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, share });
  game.goto('cutting', 0); game.finish();
  await expect(game.onShare()).resolves.toBeUndefined();
  expect(document.querySelector('[data-share-msg]').textContent).toContain('TEXT');
});
