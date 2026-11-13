// 猫（オリジナル）をキャンバスに描く。pose: peek（のぞく）/ hold（ぐいーっ）/ nya（連打）
export function drawCat(ctx, pose = 'peek', w = 160, h = 140) {
  const k = w / 160;
  ctx.save(); ctx.clearRect(0, 0, w, h); ctx.scale(k, k);
  const fur = '#f0a54a', dark = '#c97a2a', light = '#fff3e0';
  const blob = (fn, color) => { ctx.beginPath(); fn(); ctx.fillStyle = color; ctx.fill(); };
  // 前足（hold / nya のとき、ボタンの方へのばす）
  if (pose !== 'peek') {
    const py = pose === 'hold' ? 112 : 104;
    blob(() => { ctx.ellipse(118, py, 26, 15, -0.3, 0, Math.PI * 2); }, fur);
    blob(() => { ctx.ellipse(132, py + 5, 11, 8, -0.3, 0, Math.PI * 2); }, light);
    for (const [x, y] of [[124, py - 2], [133, py - 4], [141, py]]) blob(() => ctx.arc(x, y + 5, 3, 0, Math.PI * 2), '#f6a6b2');
  }
  // 耳
  blob(() => { ctx.moveTo(30, 40); ctx.lineTo(40, 6); ctx.lineTo(62, 30); ctx.closePath(); }, fur);
  blob(() => { ctx.moveTo(98, 30); ctx.lineTo(120, 6); ctx.lineTo(128, 40); ctx.closePath(); }, fur);
  blob(() => { ctx.moveTo(38, 34); ctx.lineTo(43, 15); ctx.lineTo(55, 29); ctx.closePath(); }, '#f6a6b2');
  blob(() => { ctx.moveTo(105, 29); ctx.lineTo(117, 15); ctx.lineTo(121, 34); ctx.closePath(); }, '#f6a6b2');
  // 顔
  blob(() => ctx.ellipse(80, 66, 54, 46, 0, 0, Math.PI * 2), fur);
  // しま模様
  ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(80, 22); ctx.lineTo(80, 38); ctx.moveTo(66, 24); ctx.lineTo(70, 37); ctx.moveTo(94, 24); ctx.lineTo(90, 37); ctx.stroke();
  blob(() => ctx.ellipse(80, 86, 30, 22, 0, 0, Math.PI * 2), light);
  // 目
  ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 4;
  if (pose === 'hold') { // ＞＜
    ctx.beginPath(); ctx.moveTo(52, 56); ctx.lineTo(64, 63); ctx.lineTo(52, 70); ctx.moveTo(108, 56); ctx.lineTo(96, 63); ctx.lineTo(108, 70); ctx.stroke();
  } else {
    for (const x of [60, 100]) {
      blob(() => ctx.ellipse(x, 62, 9, pose === 'nya' ? 11 : 9, 0, 0, Math.PI * 2), '#6fd36a');
      blob(() => ctx.ellipse(x, 62, 3, pose === 'nya' ? 9 : 7, 0, 0, Math.PI * 2), '#1b1b1b');
      blob(() => ctx.arc(x + 3, 58, 2, 0, Math.PI * 2), '#fff');
    }
  }
  // 鼻と口
  blob(() => { ctx.moveTo(74, 76); ctx.lineTo(86, 76); ctx.lineTo(80, 83); ctx.closePath(); }, '#f07a8a');
  ctx.lineWidth = 3;
  if (pose === 'nya') blob(() => { ctx.moveTo(70, 88); ctx.quadraticCurveTo(80, 104, 90, 88); ctx.closePath(); }, '#b8384a');
  else { ctx.beginPath(); ctx.moveTo(80, 83); ctx.quadraticCurveTo(74, 92, 68, 88); ctx.moveTo(80, 83); ctx.quadraticCurveTo(86, 92, 92, 88); ctx.stroke(); }
  // ひげ
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [y, d] of [[80, -4], [86, 0], [92, 4]]) { ctx.moveTo(56, y); ctx.lineTo(20, y + d); ctx.moveTo(104, y); ctx.lineTo(140, y + d); }
  ctx.stroke();
  ctx.restore();
}
