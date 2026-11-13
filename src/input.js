// 画面の座標 → 鉛筆の位置 x と刃先の半径 r（刃は鉛筆の下側、刃の y = -r）
export function screenToTool(px, py, rect, view) {
  const u = (px - rect.left) / rect.width;
  const v = (py - rect.top) / rect.height;
  const x = view.xMin + u * (view.xMax - view.xMin);
  const y = view.yMax - v * (view.yMax - view.yMin);
  return { x, r: -y };
}

// 最初の1本の指だけを使う。2本目が触れたら止めて、全部離れるまで受け付けない
export function attachInput(canvas, mapFn, { onMove, onStart, onEnd }) {
  let active = null;
  const down = new Set();
  let blocked = false;

  const end = () => { if (active !== null) { active = null; onEnd?.(); } };

  const handlers = {
    pointerdown(e) {
      down.add(e.pointerId);
      if (down.size > 1) { blocked = true; end(); return; }
      if (blocked) return;
      active = e.pointerId;
      try { canvas.setPointerCapture?.(e.pointerId); } catch { /* なくてもよい */ }
      e.preventDefault?.();
      onStart?.();
      onMove?.(mapFn(e.clientX, e.clientY));
    },
    pointermove(e) {
      if (e.pointerId !== active || blocked) return;
      e.preventDefault?.();
      onMove?.(mapFn(e.clientX, e.clientY));
    },
    pointerup(e) { release(e); },
    pointercancel(e) { release(e); },
    pointerleave(e) { if (e.pointerId === active) end(); },
  };
  function release(e) {
    down.delete(e.pointerId);
    if (e.pointerId === active) end();
    if (down.size === 0) blocked = false;
  }

  canvas.style && (canvas.style.touchAction = 'none');
  for (const [k, fn] of Object.entries(handlers)) canvas.addEventListener(k, fn, { passive: false });
  return () => { for (const [k, fn] of Object.entries(handlers)) canvas.removeEventListener(k, fn); end(); };
}
