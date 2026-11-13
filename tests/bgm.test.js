import { test, expect } from 'vitest';
import { TRACKS, trackEvents, noteFreq } from '../src/bgm.js';

const pc = (name) => name.replace(/\d/g, '');
test('音の高さ', () => {
  expect(noteFreq('A4')).toBeCloseTo(440); expect(noteFreq('D5')).toBeCloseTo(587.33, 1); expect(noteFreq('Eb4')).toBeCloseTo(311.13, 1);
});
test('ストーリーの曲は陽音階（D E G A B）だけで、8小節で一周', () => {
  const ev = trackEvents('story');
  const melodic = ev.filter((e) => e.note);
  for (const e of melodic) expect(['D', 'E', 'G', 'A', 'B']).toContain(pc(e.note));
  const t = TRACKS.story; expect(ev.loop).toBeCloseTo((8 * 4 * 60) / t.bpm);
  expect(ev.some((e) => e.inst === 'shamisen')).toBe(true); expect(ev.some((e) => e.inst === 'tsuzumi')).toBe(true);
});
test('極みの曲は都節音階（D Eb G A Bb）で、ゆっくり、尺八と太鼓', () => {
  const ev = trackEvents('kiwami');
  for (const e of ev.filter((e) => e.note && e.inst === 'shakuhachi')) expect(['D', 'Eb', 'G', 'A', 'Bb']).toContain(pc(e.note));
  expect(TRACKS.kiwami.bpm).toBeLessThan(TRACKS.story.bpm);
  expect(ev.some((e) => e.inst === 'shakuhachi')).toBe(true); expect(ev.some((e) => e.inst === 'taiko')).toBe(true);
});
test('どの音も一周の中に収まる', () => {
  for (const k of Object.keys(TRACKS)) { const ev = trackEvents(k); for (const e of ev) { expect(e.t).toBeGreaterThanOrEqual(0); expect(e.t).toBeLessThan(ev.loop); } }
});
test('音を開始する前に止まっていたら、開始のたびに再開を試す', async () => {
  const resumes = [];
  class FakeAC { constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { resumes.push(1); return Promise.resolve(); }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() { return this; } }; }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } }
  globalThis.AudioContext = FakeAC;
  const { createBgm } = await import('../src/bgm.js');
  const bgm = createBgm(); bgm.play('story');
  bgm.unlock(); bgm.unlock();
  expect(resumes.length).toBe(2);
  delete globalThis.AudioContext;
});
test('音を開始するとき、無音の音を一度流して音の出口を開く', async () => {
  const started = [];
  class FakeAC { constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() { return this; } }; }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createBufferSource() { return { connect() { return this; }, start() { started.push(1); } }; } }
  globalThis.AudioContext = FakeAC;
  const { createBgm } = await import('../src/bgm.js?silent');
  const bgm = createBgm(); bgm.unlock();
  expect(started.length).toBeGreaterThanOrEqual(1);
  delete globalThis.AudioContext;
});
