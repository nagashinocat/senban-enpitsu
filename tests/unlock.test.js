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
