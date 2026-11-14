import { test, expect, vi } from 'vitest';
import { createCounter } from '../src/counter.js';

const cfg = { projectId: 'senban-enpitsu', apiKey: 'KEY' };
const res = (status, body) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });

test('設定がなければ数えない（null）', () => {
  expect(createCounter({})).toBeNull(); expect(createCounter(null)).toBeNull();
});
test('みんなの本数を読む', async () => {
  const f = vi.fn(() => res(200, { fields: { count: { integerValue: '12345' } } }));
  expect(await createCounter(cfg, f).get()).toBe(12345);
  expect(f.mock.calls[0][0]).toBe('https://firestore.googleapis.com/v1/projects/senban-enpitsu/databases/(default)/documents/stats/pencils?key=KEY');
});
test('まだ1本も無ければ 0', async () => {
  expect(await createCounter(cfg, () => res(404, {})).get()).toBe(0);
});
test('1本足して、足したあとの本数を返す（1ずつしか増やさない）', async () => {
  const f = vi.fn(() => res(200, { writeResults: [{ transformResults: [{ integerValue: '12346' }] }] }));
  expect(await createCounter(cfg, f).add()).toBe(12346);
  const [url, opt] = f.mock.calls[0];
  expect(url).toBe('https://firestore.googleapis.com/v1/projects/senban-enpitsu/databases/(default)/documents:commit?key=KEY');
  const body = JSON.parse(opt.body);
  expect(body.writes[0].transform.document).toBe('projects/senban-enpitsu/databases/(default)/documents/stats/pencils');
  expect(body.writes[0].transform.fieldTransforms).toEqual([{ fieldPath: 'count', increment: { integerValue: '1' } }]);
});
test('つながらない時は null で、ゲームは止まらない', async () => {
  const c = createCounter(cfg, () => Promise.reject(new Error('offline')));
  expect(await c.get()).toBeNull(); expect(await c.add()).toBeNull();
  expect(await createCounter(cfg, () => res(403, {})).add()).toBeNull();
});
