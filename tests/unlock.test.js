// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { installAudioUnlock, UNLOCK_EVENTS } from '../src/unlock.js';

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
