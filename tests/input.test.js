// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { screenToTool, attachInput } from '../src/input.js';

const view = { xMin: 0, xMax: 6, yMin: -1, yMax: 1 };
const rect = { left: 0, top: 0, width: 100, height: 100 };

test('画面中央は鉛筆の中央・軸の高さ', () => {
  const t = screenToTool(50, 50, rect, view);
  expect(t.x).toBeCloseTo(3); expect(t.r).toBeCloseTo(0);
});
test('下に行くほど r は大きく（刃は外側）なる', () => {
  expect(screenToTool(50, 90, rect, view).r).toBeGreaterThan(screenToTool(50, 70, rect, view).r);
  expect(screenToTool(50, 100, rect, view).r).toBeCloseTo(1);
});

function ev(type, id, x = 10, y = 10) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { pointerId: id, clientX: x, clientY: y });
  return e;
}
function setup() {
  const canvas = document.createElement('canvas');
  const cb = { onStart: vi.fn(), onMove: vi.fn(), onEnd: vi.fn() };
  const detach = attachInput(canvas, (px, py) => ({ x: px, r: py }), cb);
  return { canvas, cb, detach };
}

test('指で触って動かすと onStart と onMove', () => {
  const { canvas, cb } = setup();
  canvas.dispatchEvent(ev('pointerdown', 1)); canvas.dispatchEvent(ev('pointermove', 1, 20, 30));
  expect(cb.onStart).toHaveBeenCalledTimes(1);
  expect(cb.onMove).toHaveBeenLastCalledWith({ x: 20, r: 30 });
});
test('pointercancel で onEnd が呼ばれる', () => {
  const { canvas, cb } = setup();
  canvas.dispatchEvent(ev('pointerdown', 1)); canvas.dispatchEvent(ev('pointercancel', 1));
  expect(cb.onEnd).toHaveBeenCalledTimes(1);
});
test('2本目の指で onEnd が呼ばれ、以後 onMove しない', () => {
  const { canvas, cb } = setup();
  canvas.dispatchEvent(ev('pointerdown', 1)); canvas.dispatchEvent(ev('pointerdown', 2));
  expect(cb.onEnd).toHaveBeenCalledTimes(1);
  cb.onMove.mockClear();
  canvas.dispatchEvent(ev('pointermove', 1, 40, 40)); canvas.dispatchEvent(ev('pointermove', 2, 40, 40));
  expect(cb.onMove).not.toHaveBeenCalled();
});
test('指が画面外に出たら onEnd', () => {
  const { canvas, cb } = setup();
  canvas.dispatchEvent(ev('pointerdown', 1)); canvas.dispatchEvent(ev('pointerleave', 1));
  expect(cb.onEnd).toHaveBeenCalledTimes(1);
});
test('detach 後は何も呼ばれない', () => {
  const { canvas, cb, detach } = setup(); detach();
  canvas.dispatchEvent(ev('pointerdown', 1));
  expect(cb.onStart).not.toHaveBeenCalled();
});
