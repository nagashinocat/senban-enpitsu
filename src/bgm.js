// BGM：音楽ファイルを使わず、その場で鳴らすオリジナル曲
//  story  … 和風コミカル（三味線ふうの音と小鼓、陽音階）
//  kiwami … 極みの緊張感（尺八ふうの音と太鼓、都節音階）
const SEMI = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 };
export function noteFreq(name) {
  const m = /^([A-G][b#]?)(\d)$/.exec(name);
  return 440 * Math.pow(2, (SEMI[m[1]] + (Number(m[2]) - 4) * 12) / 12);
}

export const TRACKS = {
  story: {
    bpm: 112, unit: 0.5, // 8分音符が1
    melody: [
      ['D5', 2], ['B4', 1], ['A4', 1], ['G4', 2], ['A4', 2],
      ['B4', 2], ['A4', 1], ['G4', 1], ['E4', 2], ['D4', 2],
      ['E4', 1], ['G4', 1], ['A4', 2], ['B4', 1], ['A4', 1], ['G4', 2],
      ['A4', 6], [null, 2],
      ['D5', 2], ['E5', 1], ['D5', 1], ['B4', 2], ['A4', 2],
      ['G4', 1], ['A4', 1], ['B4', 2], ['A4', 1], ['G4', 1], ['E4', 2],
      ['D4', 1], ['E4', 1], ['G4', 2], ['A4', 2], ['G4', 1], ['E4', 1],
      ['D4', 6], [null, 2],
    ],
  },
  kiwami: {
    bpm: 60, unit: 1, // 4分音符が1
    melody: [
      ['A4', 3], ['Bb4', 1], ['A4', 2], ['G4', 2], ['Eb4', 4], [null, 2], ['D4', 2],
      ['G4', 3], ['A4', 1], ['Bb4', 2], ['D5', 2], ['Eb5', 3], ['D5', 1], ['A4', 4],
    ],
  },
};

// 一周ぶんの音（秒）。配列の loop に一周の長さ
export function trackEvents(name) {
  const tr = TRACKS[name];
  const beat = 60 / tr.bpm, u = beat * tr.unit, loop = 8 * 4 * beat;
  const ev = [];
  let t = 0;
  if (name === 'story') {
    for (const [note, n] of tr.melody) { if (note) ev.push({ t, note, dur: n * u, inst: 'shamisen', vel: 0.5 }); t += n * u; }
    for (let bar = 0; bar < 8; bar++) {
      const b0 = bar * 4 * beat;
      const low = bar % 4 === 3 ? ['D3', 'D3'] : ['D3', 'A3'];
      ev.push({ t: b0, note: low[0], dur: beat, inst: 'shamisen', vel: 0.35 });
      ev.push({ t: b0 + 2 * beat, note: low[1], dur: beat, inst: 'shamisen', vel: 0.3 });
      for (const [k, hi] of [[0, false], [1.5, true], [2, false], [3.5, true]]) ev.push({ t: b0 + k * beat, inst: 'tsuzumi', hi, vel: hi ? 0.35 : 0.5 });
    }
  } else {
    for (const [note, n] of tr.melody) { if (note) ev.push({ t, note, dur: n * u, inst: 'shakuhachi', vel: 0.45 }); t += n * u; }
    ev.push({ t: 0, note: 'D2', dur: loop, inst: 'drone', vel: 0.12 });
    for (let k = 0; k < 4; k++) {
      const b0 = k * 8 * beat;
      ev.push({ t: b0, inst: 'taiko', big: true, vel: 0.9 });
      ev.push({ t: b0 + 5.5 * beat, inst: 'taiko', big: false, vel: 0.45 });
      ev.push({ t: b0 + 6 * beat, inst: 'taiko', big: false, vel: 0.55 });
    }
  }
  ev.loop = loop;
  return ev;
}


function makeInstruments(ctx, master, noise) {
    const env = (g, t, peak, attack, release) => {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
};

const INST = {
  shamisen(t, e) {
    const f = noteFreq(e.note), o = ctx.createOscillator(), o2 = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    o2.frequency.setValueAtTime(f * 2, t);
    bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.8;
    const rel = Math.min(e.dur, 0.7) + 0.15;
    env(g, t, e.vel, 0.004, rel);
    o.connect(bp); o2.connect(bp); bp.connect(g).connect(master);
    o.start(t); o2.start(t); o.stop(t + rel + 0.05); o2.stop(t + rel + 0.05);
  },
  tsuzumi(t, e) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(e.hi ? 430 : 270, t); o.frequency.exponentialRampToValueAtTime(e.hi ? 310 : 150, t + 0.12);
    env(g, t, e.vel, 0.003, 0.22);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
  },
  shakuhachi(t, e) {
    const f = noteFreq(e.note), o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.22); // メリから入る
    o2.frequency.setValueAtTime(f * 2, t);
    lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.6, e.dur * 0.6));
    lfo.connect(lg); lg.connect(o.frequency);
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vel, t + 0.25);
    g.gain.setValueAtTime(e.vel, t + Math.max(0.3, e.dur - 0.35)); g.gain.linearRampToValueAtTime(0.0001, t + e.dur + 0.1);
    o.connect(g); o2.connect(g2).connect(g); g.connect(master);
    // 息の音
    const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(e.vel * 0.18, t + 0.08); ng.gain.linearRampToValueAtTime(e.vel * 0.05, t + 0.5); ng.gain.linearRampToValueAtTime(0.0001, t + e.dur + 0.1);
    n.connect(bp).connect(ng).connect(master);
    for (const s of [o, o2, lfo, n]) { s.start(t); s.stop(t + e.dur + 0.2); }
  },
  taiko(t, e) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(e.big ? 120 : 180, t); o.frequency.exponentialRampToValueAtTime(e.big ? 46 : 90, t + (e.big ? 0.35 : 0.15));
    env(g, t, e.vel, 0.004, e.big ? 0.8 : 0.3);
    o.connect(g).connect(master); o.start(t); o.stop(t + 1);
    const n = ctx.createBufferSource(); n.buffer = noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const ng = ctx.createGain(); env(ng, t, e.vel * 0.4, 0.002, 0.12);
    n.connect(lp).connect(ng).connect(master); n.start(t); n.stop(t + 0.2);
  },
  drone(t, e) {
    const f = noteFreq(e.note), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 1.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vel, t + 3);
    g.gain.setValueAtTime(e.vel, t + e.dur - 3); g.gain.linearRampToValueAtTime(0.0001, t + e.dur);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + e.dur + 0.05); o2.stop(t + e.dur + 0.05);
  },
};

  return INST;
}

function makeNoise(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// 試聴用：曲の頭から seconds 秒を書き出す
export async function renderTrack(name, seconds, sampleRate = 44100) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  const master = ctx.createGain(); master.gain.value = 0.22 * 3; master.connect(ctx.destination);
  const inst = makeInstruments(ctx, master, makeNoise(ctx));
  const ev = trackEvents(name);
  for (let it = 0; it * ev.loop < seconds; it++) for (const e of ev) { const t = it * ev.loop + e.t; if (t < seconds) inst[e.inst](t, e); }
  return ctx.startRendering();
}

const MUTE_KEY = 'senban-enpitsu:bgm-muted';

export function createBgm() {
  let ctx = null, master = null, timer = null, current = null, startAt = 0, nextIdx = 0, iter = 0, events = null, noise = null;
  let muted = false;
  try { muted = globalThis.localStorage?.getItem(MUTE_KEY) === '1'; } catch { muted = false; }
  const VOL = 0.22;

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : VOL; master.connect(ctx.destination);
    noise = makeNoise(ctx);
    INST = makeInstruments(ctx, master, noise);
    return ctx;
  }
  let INST = null;

  function pump() {
    if (!ctx || !events) return;
    const horizon = ctx.currentTime + 0.3;
    for (;;) {
      if (nextIdx >= events.length) { nextIdx = 0; iter++; }
      const e = events[nextIdx];
      const at = startAt + iter * events.loop + e.t;
      if (at > horizon) break;
      if (at >= ctx.currentTime - 0.05) { try { INST[e.inst](at, e); } catch { /* 鳴らせない音は飛ばす */ } }
      nextIdx++;
    }
  }

  function begin() {
    if (!ctx || !current) return;
    events = trackEvents(current).slice().sort((a, b) => a.t - b.t);
    events.loop = trackEvents(current).loop;
    startAt = ctx.currentTime + 0.1; nextIdx = 0; iter = 0;
    if (!timer) timer = setInterval(pump, 60);
    pump();
  }

  return {
    get muted() { return muted; },
    play(name) {
      if (current === name) return;
      current = name;
      if (master && ctx) { // 切り替えは少しフェード
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.0001, t + 0.3);
        setTimeout(() => { if (!ctx) return; const t2 = ctx.currentTime; master.gain.cancelScheduledValues(t2); master.gain.setValueAtTime(0.0001, t2); master.gain.linearRampToValueAtTime(muted ? 0.0001 : VOL, t2 + 0.6); begin(); }, 320);
      } else begin();
    },
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (current && !events) begin();
    },
    setMuted(m) {
      muted = !!m;
      try { globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* 保存できなくてもよい */ }
      if (master && ctx) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(muted ? 0.0001 : VOL, t + 0.2); }
    },
  };
}
