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
