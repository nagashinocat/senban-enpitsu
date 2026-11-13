// スマホのブラウザは、決まった操作の中でしか音を開始できない。
// iPhone では指が触れた瞬間（pointerdown）は認められず、指を離した時（pointerup・touchend）や click が認められる
export const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

export function installAudioUnlock(target, fns) {
  const run = () => { for (const fn of fns) { try { fn(); } catch { /* ほかは続ける */ } } };
  for (const ev of UNLOCK_EVENTS) target.addEventListener(ev, run, { capture: true, passive: true });
  return () => { for (const ev of UNLOCK_EVENTS) target.removeEventListener(ev, run, { capture: true }); };
}
