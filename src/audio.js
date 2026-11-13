// 削る音（ノイズ＋バンドパス）、折れる音、振動。どれも使えない端末では何もしない
let ctx = null, noiseSrc = null, gain = null, filter = null;

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}
function noiseBuffer(c, seconds = 1) {
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }

export function startCutSound() {
  const c = ensure(); if (!c || noiseSrc) return;
  noiseSrc = c.createBufferSource(); noiseSrc.buffer = noiseBuffer(c); noiseSrc.loop = true;
  filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 1.2;
  gain = c.createGain(); gain.gain.value = 0;
  noiseSrc.connect(filter).connect(gain).connect(c.destination);
  noiseSrc.start();
}
export function setCutIntensity(v) {
  if (!gain || !ctx) return;
  const t = ctx.currentTime;
  gain.gain.setTargetAtTime(Math.min(1, v) * 0.35, t, 0.03);
  filter.frequency.setTargetAtTime(1200 + Math.min(1, v) * 2400, t, 0.05);
}
export function stopCutSound() {
  if (!noiseSrc) return;
  try { noiseSrc.stop(); } catch { /* 停止済み */ }
  noiseSrc.disconnect(); noiseSrc = null; gain = null; filter = null;
}
function blip(freq, dur, type = 'square', vol = 0.25) {
  const c = ensure(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
}
export function playBreak() {
  const c = ensure(); if (!c) return;
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 0.15);
  const g = c.createGain(); g.gain.setValueAtTime(0.6, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  s.connect(g).connect(c.destination); s.start();
  blip(140, 0.2, 'triangle', 0.4);
}
export function playDing() { blip(880, 0.25, 'sine', 0.2); setTimeout(() => blip(1320, 0.35, 'sine', 0.2), 120); }
export function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* 非対応 */ } }
