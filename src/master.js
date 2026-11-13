// 伝説の鉛筆削り名人（オリジナルのキャラクター）をキャンバスに描く。
// 120×140 の座標で描き、width に合わせて拡大する。mood はランク S/A/B/C で表情が変わる
export function drawMaster(ctx, mood = 'A', width = 120) {
  const k = width / 120;
  const fill = (d, color) => { ctx.fillStyle = color; ctx.fill(new Path2D(d)); };
  const line = (d, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); };
  ctx.save();
  ctx.scale(k, k);

  // 体（藍色の作務衣）と襟
  fill('M14 140 Q18 104 60 100 Q102 104 106 140Z', '#2f3f6b');
  fill('M60 100 L46 140 L52 140 L60 112 L68 140 L74 140Z', '#e9e2d0');
  // 首にかけた手ぬぐい
  fill('M38 108 Q60 120 82 108 L84 114 Q60 128 36 114Z', '#f2b632');
  // 顔
  fill('M92 68 A32 32 0 1 1 28 68 A32 32 0 1 1 92 68Z', '#f1c9a0');
  fill('M30 72 A30 30 0 0 0 90 72 L90 80 A30 30 0 0 1 30 80Z', '#e0b088');
  // 耳
  fill('M28 66 q-8 2 -6 10 q2 6 8 4Z M92 66 q8 2 6 10 q-2 6 -8 4Z', '#e8b98f');
  // 白髪とひげ
  line('M28 62 q-6 10 2 22 M92 62 q6 10 -2 22', '#ffffff', 7);
  fill('M32 82 Q36 114 60 118 Q84 114 88 82 Q80 92 60 92 Q40 92 32 82Z', '#ffffff');
  fill('M44 86 Q52 80 60 84 Q68 80 76 86 Q68 90 60 88 Q52 90 44 86Z', '#ffffff'); // 口ひげ
  // ハチマキ（結び目つき）
  fill('M28 46 Q60 32 92 46 L92 55 Q60 42 28 55Z', '#ffffff');
  line('M28 47 Q60 33 92 47', '#d6302b', 3);
  line('M28 54 Q60 41 92 54', '#d6302b', 2);
  fill('M90 46 L104 37 L101 51Z M90 49 L106 55 L95 59Z', '#d6302b');
  // 耳にはさんだ鉛筆
  ctx.save(); ctx.translate(96, 60); ctx.rotate(-0.6);
  fill('M-8 -3 h26 v6 h-26Z', '#f2b632');
  fill('M-13 -3 h5 v6 h-5Z', '#f29ab0');
  fill('M18 -3 l8 3 l-8 3Z', '#e8c99a');
  fill('M24 -0.8 l2 0.8 l-2 0.8Z', '#2b2b2e');
  ctx.restore();

  // 眉
  if (mood === 'C') line('M40 54 L57 61 M80 54 L63 61', '#ffffff', 6);
  else if (mood === 'S') line('M40 56 Q48 48 57 54 M80 56 Q72 48 63 54', '#ffffff', 6);
  else line('M40 57 Q48 53 57 57 M80 57 Q72 53 63 57', '#ffffff', 6);
  // 目
  if (mood === 'S') line('M44 67 Q50 60 56 67 M64 67 Q70 60 76 67', '#2b1d12', 3);
  else if (mood === 'B') line('M45 66 H55 M65 66 H75', '#2b1d12', 3);
  else {
    const r = mood === 'C' ? 2.6 : 3.2;
    fill(`M${50 + r} 67 A${r} ${r} 0 1 1 ${50 - r} 67 A${r} ${r} 0 1 1 ${50 + r} 67Z M${70 + r} 67 A${r} ${r} 0 1 1 ${70 - r} 67 A${r} ${r} 0 1 1 ${70 + r} 67Z`, '#2b1d12');
  }
  // 鼻
  line('M58 70 q2 8 -2 12 q4 2 8 0', '#c99470', 2.5);
  // 口
  if (mood === 'S') fill('M50 90 Q60 102 70 90Z', '#8a2b2b');
  else if (mood === 'A') line('M52 92 Q60 97 68 92', '#5a2b1a', 2.5);
  else if (mood === 'B') line('M53 93 H67', '#5a2b1a', 2.5);
  else line('M52 95 Q60 89 68 95', '#5a2b1a', 2.5);
  // ランクごとの飾り
  if (mood === 'S') {
    fill('M42 79 A5 3 0 1 1 42.01 79Z M78 79 A5 3 0 1 1 78.01 79Z', '#f29a8a');
    fill('M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z M104 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z M8 70 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2Z', '#ffd84d');
  }
  if (mood === 'C') fill('M86 50 Q91 60 86 64 Q81 60 86 50Z', '#7fc8ff');
  ctx.restore();
}
