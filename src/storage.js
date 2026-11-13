// 記録の保存。端末で保存できなくても、メモリ上の値で遊び続けられる
const KEY = 'senban-enpitsu:v1';
let memory = null;

function read() {
  if (memory) return memory;
  let data = {};
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') data = parsed; }
  } catch { data = {}; }
  memory = data;
  return memory;
}

export function loadRecords() { return read(); }

export function saveResult(stageId, { total, rank, seconds }) {
  const records = read();
  const prev = records[stageId];
  const next = prev ? { ...prev } : { bestTotal: total, bestRank: rank, bestSeconds: seconds };
  if (prev) {
    if (total > prev.bestTotal) { next.bestTotal = total; next.bestRank = rank; }
    if (seconds < prev.bestSeconds) next.bestSeconds = seconds;
  }
  records[stageId] = next;
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(records)); } catch { /* 保存できなくても続ける */ }
  return records;
}

export function clearedStageIds() { return new Set(Object.keys(read())); }

export function _resetForTest() { memory = null; }
