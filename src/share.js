import { drawSilhouette } from './silhouette.js';

export const GAME_NAME = '旋盤で鉛筆を削る';

export function buildShareText({ stageName, rank, total, seconds, hard }) {
  return `【${GAME_NAME}】${hard ? '【ハード】' : ''}${stageName} ランク${rank}（${total}点・${seconds.toFixed(1)}秒）\n#旋盤で鉛筆を削る`;
}

const RANK_COLOR = { S: '#ffd84d', A: '#7fe3ff', B: '#a8e07a', C: '#c9b9a6' };

// 1080×1080 の結果カード
export function drawResultCard(ctx, { image, target, profile, from = 0, stageName, rank, total, seconds }) {
  const S = 1080;
  ctx.fillStyle = '#20242b'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#f2b632'; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(GAME_NAME, S / 2, 100);
  ctx.fillStyle = '#f4f1ea'; ctx.font = '40px sans-serif'; ctx.fillText(stageName, S / 2, 170);
  if (image) {
    // 3D 画面の中央（鉛筆のあたり）を切り出す
    const iw = image.width, ih = image.height, cw = iw, ch = Math.min(ih, iw * 0.4);
    try { ctx.drawImage(image, 0, (ih - ch) / 2, cw, ch, 40, 210, S - 80, (S - 80) * (ch / cw)); } catch { /* 描けなくても続ける */ }
  }
  const box = { x: 90, y: 645, w: S - 180, h: 200 };
  ctx.fillStyle = '#ffffff10'; ctx.fillRect(60, 630, S - 120, 230);
  // 彫った先端の部分だけを大きく見せる
  if (profile) drawSilhouette(ctx, profile.radii.slice(from), box, { fill: '#e8c99a' });
  if (target) drawSilhouette(ctx, target.slice(from), box, { dashed: true, lineWidth: 5 });
  ctx.fillStyle = RANK_COLOR[rank] || '#fff'; ctx.font = '900 200px sans-serif';
  ctx.fillText(rank, 260, 1050);
  ctx.textAlign = 'left'; ctx.fillStyle = '#f4f1ea'; ctx.font = 'bold 60px sans-serif';
  ctx.fillText(`${total}点`, 480, 960);
  ctx.font = '48px sans-serif'; ctx.fillText(`${seconds.toFixed(1)}秒`, 480, 1035);
}

export function makeResultBlob(data) {
  const c = document.createElement('canvas'); c.width = c.height = 1080;
  const ctx = c.getContext('2d'); if (!ctx) return Promise.resolve(null);
  drawResultCard(ctx, data);
  return new Promise((res) => { try { c.toBlob((b) => res(b), 'image/png'); } catch { res(null); } });
}

function download(blob) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'senban-enpitsu.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// 'shared' | 'fallback' | 'cancelled'。info.copied に投稿文をコピーできたかを入れる
export async function shareResult(blob, text, info = {}) {
  info.copied = false;
  const file = blob ? new File([blob], 'senban-enpitsu.png', { type: 'image/png' }) : null;
  let canShare = false;
  try { canShare = !!(file && navigator.share && navigator.canShare?.({ files: [file] })); } catch { canShare = false; }
  if (canShare) {
    try { await navigator.share({ files: [file], text }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  download(blob);
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); info.copied = true; } } catch { info.copied = false; }
  return 'fallback';
}
