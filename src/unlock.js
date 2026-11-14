// スマホのブラウザは、決まった操作の中でしか音を開始できない。
// iPhone では指が触れた瞬間（pointerdown）は認められず、指を離した時（pointerup・touchend）や click が認められる
export const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

// 1秒の無音（48kHz・8bit）の WAV。短い・低い音質だと流し直しが多く、画面収録の音が途切れる
const RATE = 48000;
function silentWav() {
  const n = RATE, buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, RATE, true); dv.setUint32(28, RATE, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44);
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

let silentEl = null;
// iPhone：消音スイッチがオンでもブラウザの音が鳴るよう、音の種類を「再生」にする。
// それができない古い端末だけ、無音の音声を流し続けて同じ扱いにする
function iosPlayback() {
  // 新しい iOS（17以降）は音の種類を直接「再生」にできるので、無音の音声は流さない
  if (typeof navigator !== 'undefined' && navigator.audioSession) {
    try { navigator.audioSession.type = 'playback'; } catch { /* 対応していなくてもよい */ }
    return;
  }
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

export function _resetUnlockForTest() { if (silentEl) silentEl.remove?.(); silentEl = null; }
