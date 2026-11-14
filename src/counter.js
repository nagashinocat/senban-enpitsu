// みんなが削った鉛筆の本数（Firebase Firestore の stats/pencils.count）
// ルールで「1ずつ増やす」ことしか許していない。つながらない時は null を返し、ゲームは止めない
export function createCounter(config, fetchImpl = globalThis.fetch) {
  if (!config || !config.projectId || !config.apiKey || !fetchImpl) return null;
  const base = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
  const doc = `projects/${config.projectId}/databases/(default)/documents/stats/pencils`;
  const withTimeout = (p, ms = 6000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  return {
    async get() {
      try {
        const r = await withTimeout(fetchImpl(`${base}/stats/pencils?key=${config.apiKey}`));
        if (r.status === 404) return 0;
        if (!r.ok) return null;
        const j = await r.json();
        return Number(j?.fields?.count?.integerValue ?? 0);
      } catch { return null; }
    },
    async add() {
      try {
        const r = await withTimeout(fetchImpl(`${base}:commit?key=${config.apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes: [{ transform: { document: doc, fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }] } }] }),
        }));
        if (!r.ok) return null;
        const j = await r.json();
        const v = j?.writeResults?.[0]?.transformResults?.[0]?.integerValue;
        return v == null ? null : Number(v);
      } catch { return null; }
    },
  };
}
