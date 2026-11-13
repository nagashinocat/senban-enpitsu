// ハードモードの猫。旋盤のボタンに、たまにいたずらをする
//  idle → warn（横からそーっと近づく）→ hold（長押し：高速回転）または nyanya（連打）→ idle
export const CAT = { MIN_GAP: 8, MAX_GAP: 15, WARN: 2.5, HOLD: 3.0, NYA: 2.0, TAP_EVERY: 0.22 };

export function initCat(t, rng = Math.random) {
  return { phase: 'idle', until: t + CAT.MIN_GAP + rng() * (CAT.MAX_GAP - CAT.MIN_GAP) };
}

// 時刻 t まで進め、起きたこと（actions）を返す。1回に1段だけ進む
export function stepCat(cat, t, rng = Math.random) {
  const actions = [];
  if (t < cat.until) return { cat, actions };
  if (cat.phase === 'idle') {
    actions.push('warn');
    return { cat: { phase: 'warn', until: t + CAT.WARN }, actions };
  }
  if (cat.phase === 'warn') {
    if (rng() < 0.5) { actions.push('holdStart'); return { cat: { phase: 'hold', until: t + CAT.HOLD }, actions }; }
    actions.push('nyaStart', 'tap');
    return { cat: { phase: 'nyanya', until: t + CAT.TAP_EVERY, end: t + CAT.NYA }, actions };
  }
  if (cat.phase === 'hold') {
    actions.push('holdEnd');
    return { cat: initCat(t, rng), actions };
  }
  // nyanya
  if (t >= cat.end) { actions.push('nyaEnd'); return { cat: initCat(t, rng), actions }; }
  actions.push('tap');
  return { cat: { ...cat, until: t + CAT.TAP_EVERY }, actions };
}
