// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from 'vitest';
import { createGame } from '../src/game.js';
import { PENCIL_RADIUS } from '../src/config.js';
import { _resetForTest } from '../src/storage.js';
import { CAT } from '../src/cat.js';
import { STAGES } from '../src/stages.js';
const STAGES0_BF = STAGES[0].breakFactor;
import { SPEED_MAX } from '../src/config.js';

function fakeDeps() {
  const scene = { view: { xMin: 0, xMax: 6, yMin: -1, yMax: 1 }, setProfile: vi.fn(), markDirty: vi.fn(), setTarget: vi.fn(),
    setTool: vi.fn(), setZoom: vi.fn(), setSpin: vi.fn(), setFocus: vi.fn(), emitChips: vi.fn(), flashBreak: vi.fn(), resize: vi.fn(), render: vi.fn(), snapshot: vi.fn(), dispose: vi.fn() };
  const audio = { unlock: vi.fn(), startCutSound: vi.fn(), setCutIntensity: vi.fn(), stopCutSound: vi.fn(), playBreak: vi.fn(), playDing: vi.fn(), playTick: vi.fn(), playPop: vi.fn(), playStamp: vi.fn(), startMotor: vi.fn(), stopMotor: vi.fn(), setMotorSpeed: vi.fn(), playMeow: vi.fn(), vibrate: vi.fn() };
  let t = 0;
  return { scene, audio, deps: { createScene: () => scene, attachInput: vi.fn(() => () => {}), audio, now: () => t, raf: () => 0 }, tick: (s) => { t += s * 1000; } };
}
function setup() {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps();
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), f.deps);
  return { game, ...f };
}
const spinUp = (game, tick, sec = 0.5) => { game.latheDown(); for (let t = 0; t < sec - 1e-9; t += 0.05) { tick(0.05); game.tickLathe(); } };
const coast = (game, tick, sec) => { for (let t = 0; t < sec - 1e-9; t += 0.05) { tick(0.05); game.tickLathe(); } };
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
  const { game, audio, tick } = setup();
  game.goto('cutting', 2);
  spinUp(game, tick, 0.4);
  game.handleStart(); game.handleMove({ x: 2, r: 0 }); game.handleMove({ x: 2, r: -3 });
  expect(game.state.name).toBe('broken');
  expect(audio.playBreak).toHaveBeenCalled();
  game.retry();
  expect(game.state).toEqual({ name: 'cutting', stage: 2 });
  expect(game.profile.radii.every(r => Math.abs(r - PENCIL_RADIUS) < 1e-6)).toBe(true);
});
test('ゆっくり削れば折れずに細くなる', () => {
  const { game, tick } = setup();
  game.goto('cutting', 0);
  spinUp(game, tick, 0.4);
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
test('完成のタイムは、最初に旋盤を回してからの秒数', () => {
  const { game, tick } = setup();
  game.goto('cutting', 0); tick(30); game.latheDown(); tick(12.5); game.finish();
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
test('削っている間だけ拡大窓が出る', () => {
  const { game, scene } = setup();
  game.goto('cutting', 0); expect(scene.setZoom).toHaveBeenLastCalledWith(true);
  game.finish(); expect(scene.setZoom).toHaveBeenLastCalledWith(false);
});
test('削り始めたらヒントが消える（拡大窓と重ならないように）', () => {
  const { game } = setup();
  game.goto('cutting', 0); expect(document.querySelector('.hud-hint')).not.toBeNull();
  game.handleStart(); expect(document.querySelector('.hud-hint')).toBeNull();
});
test('削る面では、カメラが先端の部分に寄る', () => {
  const { game, scene } = setup();
  game.goto('cutting', 3); expect(scene.setFocus).toHaveBeenLastCalledWith(expect.any(Number));
  expect(scene.setFocus.mock.lastCall[0]).toBeGreaterThan(2.5);
});
test('結果の画面では演出が進み、タップで飛ばせる', () => {
  const { game } = setup();
  game.goto('cutting', 0); game.finish();
  const panel = document.querySelector('[data-result]');
  expect(document.querySelector('.result-actions').classList.contains('show')).toBe(false);
  panel.click();
  expect(document.querySelector('.result-actions').classList.contains('show')).toBe(true);
  expect(document.querySelector('[data-comment]').textContent.length).toBeGreaterThan(0);
});
test('極みはストーリーをクリアするまで遊べない', () => {
  const { game } = setup();
  expect(game.kiwamiUnlocked()).toBe(false);
  game.start(); expect(document.querySelector('[data-act="kiwami"]')).toBeNull();
  game.goto('cutting', 4); game.finish(); game.next();
  expect(game.state.name).toBe('ending');
  expect(game.kiwamiUnlocked()).toBe(true);
  expect(document.querySelector('[data-act="kiwami"]')).not.toBeNull();
  game.goto('title', 0); expect(document.querySelector('[data-act="kiwami"]')).not.toBeNull();
});
test('極みの面を遊んでも、ストーリーの進み具合は変わらない', () => {
  const { game } = setup();
  game.goto('cutting', 4); game.finish();
  const before = game.unlockedStages();
  game.startKiwami(3);
  expect(game.mode).toBe('kiwami'); expect(game.state).toEqual({ name: 'story', stage: 3 });
  expect(document.querySelector('h2').textContent).toBe('数珠');
  game.goto('cutting'); game.finish();
  expect(game.lastResult.stageName).toBe('数珠');
  expect(game.unlockedStages()).toEqual(before);
});
test('極みの最後の形の次は、極みの一覧に戻る', () => {
  const { game } = setup();
  game.goto('cutting', 4); game.finish();
  game.startKiwami(4); game.goto('cutting'); game.finish(); game.next();
  expect(game.state.name).toBe('kiwami');
  game.goto('title', 0); expect(game.mode).toBe('story');
});
test('旋盤が止まっている間は削れず、刃は表面で止まる', () => {
  const { game } = setup();
  game.goto('cutting', 0);
  expect(game.spinning).toBe(false);
  game.handleStart(); game.handleMove({ x: 2, r: 0 });
  for (let k = 1; k <= 120; k++) game.handleMove({ x: 2, r: -0.02 * k });
  expect(game.profile.radii.every((r) => Math.abs(r - PENCIL_RADIUS) < 1e-6)).toBe(true);
  expect(game.tool.r).toBeGreaterThanOrEqual(PENCIL_RADIUS - 1e-6);
  expect(game.state.name).toBe('cutting');
});
test('ボタンを押している間は回って削れ、離すとゆっくり止まる', () => {
  const { game, scene, audio, tick } = setup();
  game.goto('cutting', 0);
  spinUp(game, tick, 0.5);
  expect(game.spinning).toBe(true); expect(audio.startMotor).toHaveBeenCalled();
  expect(scene.setSpin.mock.lastCall[0]).toBe(true);
  game.handleStart(); game.handleMove({ x: 2, r: 0 });
  for (let k = 1; k <= 60; k++) game.handleMove({ x: 2, r: -0.02 * k });
  expect(Math.min(...game.profile.radii)).toBeLessThan(PENCIL_RADIUS - 0.05);
  game.latheUp();
  const sp = game.speed;
  coast(game, tick, 0.3); expect(game.spinning).toBe(true); expect(game.speed).toBeLessThan(sp);   // ゆっくり
  coast(game, tick, 3); expect(game.spinning).toBe(false); expect(game.speed).toBe(0);
  expect(audio.stopMotor).toHaveBeenCalled();
});
test('面を終えたり折れたりすると旋盤は止まる', () => {
  const { game, scene, tick } = setup();
  game.goto('cutting', 0); spinUp(game, tick); game.finish();
  expect(game.spinning).toBe(false); expect(scene.setSpin).toHaveBeenLastCalledWith(false, 0);
});
test('場面に合わせて曲が切り替わる', () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps(); const bgm = { play: vi.fn() };
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, bgm });
  game.start(); expect(bgm.play).toHaveBeenLastCalledWith('story');
  game.goto('cutting', 4); game.finish(); game.startKiwami(0); expect(bgm.play).toHaveBeenLastCalledWith('kiwami');
  game.goto('cutting'); expect(bgm.play).toHaveBeenLastCalledWith('kiwami');
  game.goto('title', 0); expect(bgm.play).toHaveBeenLastCalledWith('story');
});

function hardSetup(rngValues) {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps(); let i = 0;
  const rng = () => rngValues[i++ % rngValues.length];
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, rng });
  return { game, ...f };
}
test('難易度はタイトルで切り替えられ、次に開いた時も残る', () => {
  const { game } = setup();
  game.start(); expect(document.querySelector('[data-act="difficulty"]').textContent).toContain('ふつう');
  document.querySelector('[data-act="difficulty"]').click();
  expect(game.difficulty).toBe('hard'); expect(document.querySelector('[data-act="difficulty"]').textContent).toContain('ハード');
  const again = setup(); expect(again.game.difficulty).toBe('hard');
});
test('ふつうでは猫は来ない', () => {
  const { game, tick } = hardSetup([0]);
  game.goto('cutting', 0); game.latheDown();
  for (let k = 0; k < 60; k++) { tick(1); game.tickCat(); }
  expect(document.querySelector('[data-cat]').className).not.toContain('show');
});
test('ハード：猫が長押しすると、止められない最高速になる', () => {
  const { game, tick, scene, audio } = hardSetup([0, 0.2, 0.5]);
  game.setDifficulty('hard');
  game.goto('cutting', 0); spinUp(game, tick, 0.3); game.latheUp(); coast(game, tick, 3); // 回して止めておく
  tick(4.7); game.tickCat();
  expect(document.querySelector('[data-cat]').className).toContain('sneak');
  expect(document.querySelector('.cat-say').textContent).toContain('そろ');
  expect(document.querySelector('[data-cat] img')).not.toBeNull();
  tick(CAT.WARN); game.tickCat(); coast(game, tick, 2.5);
  expect(game.spinning).toBe(true); expect(game.speed).toBeCloseTo(SPEED_MAX);
  expect(scene.setSpin).toHaveBeenLastCalledWith(true, SPEED_MAX);
  game.latheDown(); game.latheUp(); coast(game, tick, 0.2); expect(game.speed).toBeCloseTo(SPEED_MAX); // 離しても止まらない
  expect(document.querySelector('.cat-say').textContent).toContain('ぐいーっ');
  tick(0.3); game.tickCat();                                        // 猫が離す
  coast(game, tick, 3);
  expect(game.spinning).toBe(false);                                // ゆっくり止まる
  expect(document.querySelector('[data-cat]').className).not.toContain('show');
  expect(document.querySelector('[data-cat]').className).toContain('leave');
  expect(audio.playMeow).toHaveBeenCalled();
});
test('ハード：にゃにゃにゃにゃで回ったり止まったりする', () => {
  const { game, tick } = hardSetup([0, 0.9, 0.5]);
  game.setDifficulty('hard');
  game.goto('cutting', 0); game.latheDown(); game.latheUp(); coast(game, tick, 3);
  tick(8); game.tickCat(); tick(CAT.WARN); game.tickCat();
  expect(document.querySelector('.cat-say').textContent).toBe('にゃにゃにゃにゃ！');
  let ups = 0, downs = 0, prev = game.speed;
  for (let k = 0; k < 40; k++) { tick(0.05); game.tickCat(); game.tickLathe(); if (game.speed > prev + 1e-6) ups++; if (game.speed < prev - 1e-6) downs++; prev = game.speed; }
  expect(ups).toBeGreaterThanOrEqual(5); expect(downs).toBeGreaterThanOrEqual(5);   // 回ったり止まりかけたり
  expect(document.querySelector('[data-cat]').className).not.toContain('show');
});
test('ハード：旋盤を回すまでは猫は来ず、面を出ると猫もいなくなる', () => {
  const { game, tick } = hardSetup([0, 0.2]);
  game.setDifficulty('hard');
  game.goto('cutting', 0); tick(30); game.tickCat();
  expect(document.querySelector('[data-cat]').className).not.toContain('show');
  game.latheDown(); tick(8); game.tickCat(); tick(CAT.WARN); game.tickCat();
  game.finish();
  expect(game.spinning).toBe(false); expect(document.querySelector('[data-cat]')).toBeNull();
  expect(game.lastResult.hard).toBe(true);
  expect(document.querySelector('[data-result] .kicker').textContent).toContain('ハード');
});
test('押し続けるほど速くなり、最高速で止まる', () => {
  const { game, tick } = setup();
  game.goto('cutting', 0);
  spinUp(game, tick, 0.5); const s1 = game.speed;
  coast(game, tick, 1); expect(game.speed).toBeGreaterThan(s1);
  expect(document.querySelector('[data-speed]').textContent).toBe(`×${game.speed.toFixed(1)}`);
  coast(game, tick, 10); expect(game.speed).toBeCloseTo(SPEED_MAX);
});
test('速く回すと、太い所は折れにくく、細い所は折れやすい', () => {
  const { game, tick } = setup();
  game.goto('cutting', 0); spinUp(game, tick, 3);
  expect(game.breakFactorAt(0.35)).toBeCloseTo(STAGES0_BF * game.speed);
  expect(game.breakFactorAt(0.1)).toBeCloseTo(STAGES0_BF / game.speed);
});
test('タイトル画面にゲームの名前', () => {
  const { game } = setup(); game.start();
  expect(document.querySelector('h1').textContent.replace(/\s/g, '')).toBe('鉛筆削りがなかった僕は、旋盤で削ることにした。');
});
test('リザルト画面の左で、削った鉛筆を立体で見せる', () => {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="ui"></div>';
  const f = fakeDeps(); const view = { show: vi.fn(), dispose: vi.fn() };
  const createTrophyView = vi.fn(() => view);
  const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { ...f.deps, createTrophyView });
  game.goto('cutting', 2); game.finish();
  const cv = document.querySelector('.result-top [data-trophy]');
  expect(cv).not.toBeNull();
  expect(cv.compareDocumentPosition(document.querySelector('.score-board')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 左（先）
  expect(createTrophyView).toHaveBeenCalledWith(cv);
  const arg = view.show.mock.calls[0][0];
  expect(arg.stageId).toBe('kokeshi'); expect(arg.rank).toBe(game.lastResult.rank); expect(arg.profile).toBe(game.profile);
  game.next(); expect(view.dispose).toHaveBeenCalled();
});
