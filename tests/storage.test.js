// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from 'vitest';
import { loadRecords, saveResult, clearedStageIds, _resetForTest } from '../src/storage.js';

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); _resetForTest(); });

test('保存して読める', () => {
  saveResult('point', { total: 900, rank: 'A', seconds: 12 });
  _resetForTest();
  expect(loadRecords().point).toEqual({ bestTotal: 900, bestRank: 'A', bestSeconds: 12 });
  expect(clearedStageIds().has('point')).toBe(true);
});
test('良い方だけ残る', () => {
  saveResult('point', { total: 900, rank: 'A', seconds: 12 });
  saveResult('point', { total: 700, rank: 'B', seconds: 20 });
  expect(loadRecords().point).toEqual({ bestTotal: 900, bestRank: 'A', bestSeconds: 12 });
  saveResult('point', { total: 800, rank: 'B', seconds: 9 });
  expect(loadRecords().point).toEqual({ bestTotal: 900, bestRank: 'A', bestSeconds: 9 });
});
test('localStorage が例外を投げても落ちない', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(() => saveResult('point', { total: 900, rank: 'A', seconds: 10 })).not.toThrow();
  expect(loadRecords().point.bestTotal).toBe(900);
});
test('壊れた JSON が入っていても空として読む', () => {
  localStorage.setItem('senban-enpitsu:v1', '{oops');
  expect(loadRecords()).toEqual({});
});
