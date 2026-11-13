// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from 'vitest';
import { buildShareText, shareResult } from '../src/share.js';

let clicks;
beforeEach(() => {
  vi.restoreAllMocks();
  clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
  delete navigator.share; delete navigator.canShare;
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(() => Promise.resolve()) }, configurable: true });
});
const blob = new Blob(['x'], { type: 'image/png' });

test('投稿文に面の名前・ランク・タイムが入る', () => {
  const t = buildShareText({ stageName: 'こけし', rank: 'A', total: 912, seconds: 28.43 });
  expect(t).toContain('こけし'); expect(t).toContain('ランクA'); expect(t).toContain('912点'); expect(t).toContain('28.4秒'); expect(t).toContain('#旋盤で鉛筆を削る');
});
test('canShare がない端末では fallback', async () => {
  expect(await shareResult(blob, 'hi')).toBe('fallback');
  expect(clicks).toHaveBeenCalled(); expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hi');
});
test('canShare が false なら fallback', async () => {
  navigator.canShare = () => false; navigator.share = vi.fn();
  expect(await shareResult(blob, 'hi')).toBe('fallback'); expect(navigator.share).not.toHaveBeenCalled();
});
test('共有できる端末では画像付きで共有', async () => {
  navigator.canShare = () => true; navigator.share = vi.fn(() => Promise.resolve());
  expect(await shareResult(blob, 'hi')).toBe('shared');
  expect(navigator.share.mock.calls[0][0].files[0].name).toMatch(/\.png$/);
  expect(clicks).not.toHaveBeenCalled();
});
test('ユーザーが取り消したら cancelled で、ダウンロードしない', async () => {
  navigator.canShare = () => true;
  navigator.share = vi.fn(() => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })));
  expect(await shareResult(blob, 'hi')).toBe('cancelled'); expect(clicks).not.toHaveBeenCalled();
});
test('共有が失敗したら fallback', async () => {
  navigator.canShare = () => true; navigator.share = vi.fn(() => Promise.reject(new Error('NotAllowed')));
  expect(await shareResult(blob, 'hi')).toBe('fallback');
});
test('clipboard がなくても落ちない', async () => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  const r = await shareResult(blob, 'hi'); expect(r).toBe('fallback');
});
test('ハードのときは投稿文にハードと入る', () => {
  expect(buildShareText({ stageName: 'こけし', rank: 'A', total: 912, seconds: 28.43, hard: true })).toContain('ハード');
});
