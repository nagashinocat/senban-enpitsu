import { test, expect } from 'vitest';
import { drawMasterPhoto } from '../src/master.js';

function fakeCtx() {
  const log = { images: 0, fills: [], ops: [] };
  const ctx = new Proxy(log, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'drawImage') return () => { t.images++; };
      if (k === 'fillRect' || k === 'fill') return () => t.fills.push(t._fillStyle);
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, k, v) { if (k === 'fillStyle') t._fillStyle = v; if (k === 'globalCompositeOperation') t.ops.push(v); t[k] = v; return true; },
  });
  return ctx;
}
const img = { width: 1206, height: 575 };

test('名人の画像を窓いっぱいに描く', () => {
  const ctx = fakeCtx(); drawMasterPhoto(ctx, img, 'A', 600, 300);
  expect(ctx.images).toBe(1);
});
test('S は金色の光と星', () => {
  const ctx = fakeCtx(); drawMasterPhoto(ctx, img, 'S', 600, 300);
  expect(ctx.fills).toContain('#ffd84d'); expect(ctx.ops).toContain('screen');
});
test('B は色あせ、C は青ざめて冷や汗', () => {
  const b = fakeCtx(); drawMasterPhoto(b, img, 'B', 600, 300); expect(b.ops).toContain('saturation');
  const c = fakeCtx(); drawMasterPhoto(c, img, 'C', 600, 300);
  expect(c.ops).toContain('multiply'); expect(c.fills).toContain('#9fd8ff'); expect(c.fills).not.toContain('#ffd84d');
});
test('画像がまだ読めていなくても落ちない', () => {
  const ctx = fakeCtx(); expect(() => drawMasterPhoto(ctx, null, 'S', 600, 300)).not.toThrow();
});
test('画像も効果も窓の中だけに描く（はみ出した所に効果がかからない部分を作らない）', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => calls.push([k, ...a])), set: (t, k, v) => { t[k] = v; return true; } });
  drawMasterPhoto(ctx, img, 'C', 600, 300);
  const clipAt = calls.findIndex((c) => c[0] === 'clip');
  const drawAt = calls.findIndex((c) => c[0] === 'drawImage');
  expect(clipAt).toBeGreaterThanOrEqual(0); expect(clipAt).toBeLessThan(drawAt);
  expect(calls.find((c) => c[0] === 'rect')).toEqual(['rect', 0, 0, 600, 300]);
});
