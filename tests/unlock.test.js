// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { installAudioUnlock, UNLOCK_EVENTS, _resetUnlockForTest } from '../src/unlock.js';

test('iPhone で音を鳴らしてよい操作（指を離す・クリック・キー）でも音を開始する', () => {
  expect(UNLOCK_EVENTS).toEqual(expect.arrayContaining(['pointerup', 'touchend', 'click', 'keydown']));
  const fn = vi.fn(); installAudioUnlock(window, [fn]);
  window.dispatchEvent(new Event('touchend')); expect(fn).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('click')); expect(fn).toHaveBeenCalledTimes(2);
});
test('どれかが例外を投げても、ほかは開始する', () => {
  const bad = () => { throw new Error('x'); }; const ok = vi.fn();
  installAudioUnlock(window, [bad, ok]);
  window.dispatchEvent(new Event('pointerup')); expect(ok).toHaveBeenCalled();
});
test('iPhone の消音スイッチがオンでも鳴るよう、音の種類を「再生」にする', () => {
  const session = { type: 'auto' };
  Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
  installAudioUnlock(window, []);
  window.dispatchEvent(new Event('touchend'));
  expect(session.type).toBe('playback');
  delete navigator.audioSession;
});
test('タップの中で、無音の音声を一度流して音の出口を開く', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  installAudioUnlock(window, []);
  window.dispatchEvent(new Event('click'));
  expect(play).toHaveBeenCalled();
  const el = document.querySelector('audio[data-unlock]');
  expect(el).not.toBeNull(); expect(el.src.startsWith('data:audio/wav')).toBe(true); expect(el.loop).toBe(true);
  play.mockRestore();
});
test('音の種類を直接「再生」にできる端末では、無音の音声は流さない（画面収録の音が途切れないように）', () => {
  document.querySelectorAll('audio[data-unlock]').forEach((e) => e.remove());
  _resetUnlockForTest();
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true });
  installAudioUnlock(window, []);
  window.dispatchEvent(new Event('touchend'));
  expect(play).not.toHaveBeenCalled(); expect(document.querySelector('audio[data-unlock]')).toBeNull();
  delete navigator.audioSession; play.mockRestore();
});
test('無音の音声を流す時は、1秒・48kHz で、流し直しを少なくする', () => {
  document.querySelectorAll('audio[data-unlock]').forEach((e) => e.remove());
  _resetUnlockForTest();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  installAudioUnlock(window, []);
  window.dispatchEvent(new Event('click'));
  const b64 = document.querySelector('audio[data-unlock]').src.split(',')[1];
  const bin = atob(b64); const dv = new DataView(Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer);
  const rate = dv.getUint32(24, true), bytes = dv.getUint32(40, true), bps = dv.getUint16(34, true) / 8;
  expect(rate).toBe(48000); expect(bytes / bps / rate).toBeCloseTo(1, 2);
});
