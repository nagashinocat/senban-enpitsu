// 伝説の鉛筆削り名人：画像をキャンバスに描き、ランクに合わせて光や色を重ねる
// 画像の中の顔のあたり（割合）。冷や汗や光の位置に使う
const FACE = { x: 0.36, y: 0.32 };
const FOREHEAD = { x: 0.43, y: 0.12 };
const FOCUS_X = 0.5;

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

export function drawMasterPhoto(ctx, img, mood = 'A', w = 680, h = 300) {
  ctx.save();
  ctx.fillStyle = '#1b1d22'; ctx.fillRect(0, 0, w, h);
  if (!img || !img.width) { ctx.restore(); return; }
  // 窓いっぱいに切り抜く（cover）
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  const dx = Math.min(0, Math.max(w - dw, w / 2 - FOCUS_X * dw)), dy = (h - dh) / 2;
  const at = (p) => ({ x: dx + p.x * dw, y: dy + p.y * dh });
  ctx.drawImage(img, dx, dy, dw, dh);

  if (mood === 'S') {
    const f = at(FACE);
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, w * 0.6);
    g.addColorStop(0, 'rgba(255,214,90,0.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd84d';
    for (const [px, py, r] of [[0.08, 0.2, 0.06], [0.2, 0.75, 0.04], [0.62, 0.18, 0.05], [0.78, 0.62, 0.035], [0.5, 0.88, 0.03]]) star(ctx, px * w, py * h, r * h * 1.6);
  } else if (mood === 'B') {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.55)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if (mood === 'C') {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.7)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#8aa2cf'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    // 冷や汗
    const f = at(FOREHEAD), r = h * 0.05;
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.moveTo(f.x, f.y - r * 1.8);
    ctx.quadraticCurveTo(f.x + r * 1.1, f.y, f.x, f.y + r); ctx.quadraticCurveTo(f.x - r * 1.1, f.y, f.x, f.y - r * 1.8);
    ctx.fill();
  }
  // まわりを少し暗く
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, w * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
