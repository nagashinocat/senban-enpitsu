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
export function playTick() { blip(1500 + Math.random() * 400, 0.03, 'square', 0.06); }
export function playPop() { blip(660, 0.08, 'triangle', 0.3); setTimeout(() => blip(990, 0.1, 'triangle', 0.22), 40); }
export function playStamp() {
  const c = ensure(); if (!c) return;
  blip(70, 0.35, 'sine', 0.7);
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 0.12);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
  const g = c.createGain(); g.gain.setValueAtTime(0.7, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  s.connect(f).connect(g).connect(c.destination); s.start();
}
let motor = null;
export function startMotor() {
  const c = ensure(); if (!c || motor) return;
  const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(20, c.currentTime); o.frequency.linearRampToValueAtTime(58, c.currentTime + 0.8);
  o2.type = 'square'; o2.frequency.setValueAtTime(40, c.currentTime); o2.frequency.linearRampToValueAtTime(116, c.currentTime + 0.8);
  f.type = 'lowpass'; f.frequency.value = 380;
  g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.09, c.currentTime + 0.4);
  o.connect(f); o2.connect(f); f.connect(g).connect(c.destination); o.start(); o2.start();
  motor = { o, o2, g };
}
export function stopMotor() {
  const c = ctx; if (!c || !motor) return;
  const { o, o2, g } = motor; motor = null;
  const t = c.currentTime;
  o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(o.frequency.value, t); o.frequency.linearRampToValueAtTime(15, t + 1);
  o2.frequency.cancelScheduledValues(t); o2.frequency.setValueAtTime(o2.frequency.value, t); o2.frequency.linearRampToValueAtTime(30, t + 1);
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1);
  o.stop(t + 1.05); o2.stop(t + 1.05);
}
export function setMotorSpeed(speed = 1) {
  const c = ctx; if (!c || !motor) return;
  const t = c.currentTime;
  motor.o.frequency.cancelScheduledValues(t); motor.o.frequency.setValueAtTime(motor.o.frequency.value, t); motor.o.frequency.linearRampToValueAtTime(58 * speed, t + 0.15);
  motor.o2.frequency.cancelScheduledValues(t); motor.o2.frequency.setValueAtTime(motor.o2.frequency.value, t); motor.o2.frequency.linearRampToValueAtTime(116 * speed, t + 0.15);
}
// にゃー（声の高さを上下させた音に、口の形のフィルターをかける）
export function playMeow(kind = 'short') {
  const c = ensure(); if (!c) return;
  const one = (t0, dur, f0, f1) => {
    const o = c.createOscillator(), bp = c.createBiquadFilter(), bp2 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f1, t0 + dur * 0.35); o.frequency.linearRampToValueAtTime(f0 * 0.8, t0 + dur);
    bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(700, t0); bp.frequency.linearRampToValueAtTime(1600, t0 + dur * 0.4); bp.frequency.linearRampToValueAtTime(900, t0 + dur);
    bp2.type = 'bandpass'; bp2.Q.value = 8; bp2.frequency.value = 2800;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.04); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(bp).connect(g); o.connect(bp2).connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const t = c.currentTime;
  if (kind === 'nya') for (let i = 0; i < 4; i++) one(t + i * 0.17, 0.15, 620, 900);
  else if (kind === 'long') one(t, 0.8, 520, 760);
  else one(t, 0.35, 600, 880);
}
