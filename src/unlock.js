// スマホのブラウザは、決まった操作の中でしか音を開始できない。
// iPhone では指が触れた瞬間（pointerdown）は認められず、指を離した時（pointerup・touchend）や click が認められる
export const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

// 0.5秒の無音（8kHz・8bit）の WAV
function silentWav() {
  const n = 4000, buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44);
  let bin = ''; for (const b of buf) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

let silentEl = null;
// iPhone：消音スイッチがオンでもブラウザの音が鳴るよう、音の種類を「再生」にする。
// 対応していない端末では、無音の音声を流し続けると同じ扱いになる
function iosPlayback() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* 対応していなくてもよい */ }
  if (typeof document === 'undefined') return;
  if (!silentEl) {
    silentEl = document.createElement('audio');
    silentEl.setAttribute('data-unlock', '');
    silentEl.setAttribute('playsinline', '');
    silentEl.loop = true; silentEl.preload = 'auto';
    silentEl.src = silentWav();
    silentEl.style.display = 'none';
    document.body.appendChild(silentEl);
    document.addEventListener('visibilitychange', () => { if (document.hidden) silentEl.pause(); else silentEl.play()?.catch?.(() => {}); });
  }
  if (silentEl.paused !== false || !silentEl.__started) {
    silentEl.__started = true;
    try { silentEl.play()?.catch?.(() => { silentEl.__started = false; }); } catch { silentEl.__started = false; }
  }
}

export function installAudioUnlock(target, fns) {
  const run = () => {
    iosPlayback();
    for (const fn of fns) { try { fn(); } catch { /* ほかは続ける */ } }
  };
  for (const ev of UNLOCK_EVENTS) target.addEventListener(ev, run, { capture: true, passive: true });
  return () => { for (const ev of UNLOCK_EVENTS) target.removeEventListener(ev, run, { capture: true }); };
}
