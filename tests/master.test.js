import { test, expect, vi, beforeAll } from 'vitest';
import { drawMaster } from '../src/master.js';

beforeAll(() => { globalThis.Path2D = class { constructor(d) { this.d = d; } }; });
function fakeCtx() {
  const fills = [];
  const ctx = new Proxy({ fills }, {
    get(t, k) { if (k in t) return t[k]; if (k === 'fill') return () => fills.push(t._fillStyle); return () => {}; },
    set(t, k, v) { if (k === 'fillStyle') t._fillStyle = v; t[k] = v; return true; },
  });
  return ctx;
}
test('名人をキャンバスに描く（顔・ハチマキ・鉛筆）', () => {
  const ctx = fakeCtx(); drawMaster(ctx, 'A', 120);
  expect(ctx.fills).toContain('#f1c9a0'); expect(ctx.fills).toContain('#d6302b'); expect(ctx.fills).toContain('#f2b632');
});
test('S は星がきらきら、C は汗', () => {
  const s = fakeCtx(); drawMaster(s, 'S', 120); expect(s.fills).toContain('#ffd84d');
  const c = fakeCtx(); drawMaster(c, 'C', 120); expect(c.fills).toContain('#7fc8ff'); expect(c.fills).not.toContain('#ffd84d');
});
