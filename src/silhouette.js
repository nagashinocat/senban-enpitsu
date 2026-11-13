import { PENCIL_RADIUS } from './config.js';

// 輪郭（半径の配列）を横向きのシルエットとして描く
export function drawSilhouette(ctx, radii, box, { fill = '#e8c99a', dashed = false, color = '#7fe3ff', lineWidth = 3 } = {}) {
  const n = radii.length;
  const sx = box.w / (n - 1), sy = (box.h * 0.45) / PENCIL_RADIUS, cy = box.y + box.h / 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.lineTo(box.x + i * sx, cy - radii[i] * sy);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(box.x + i * sx, cy + radii[i] * sy);
  ctx.closePath();
  if (dashed) { ctx.setLineDash([lineWidth * 3, lineWidth * 2]); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke(); ctx.setLineDash([]); }
  else { ctx.fillStyle = fill; ctx.fill(); }
}
