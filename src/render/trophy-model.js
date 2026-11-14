// リザルトで見せる「削った鉛筆」の見た目をランクで決める（描画に依存しない部分）
import { PENCIL_LENGTH } from '../config.js';

export const WOOD_RGB = [0.91, 0.79, 0.6];
const GOLD = [1, 0.8, 0.3];

// 表示する半径。S は目標の形に寄せて整える、C は欠けさせる、A・B はそのまま
export function trophyRadii(profile, target, from, rank, rng = Math.random) {
  const r = Float32Array.from(profile.radii);
  if (rank === 'S') {
    for (let i = from; i < r.length; i++) r[i] = r[i] * 0.2 + target[i] * 0.8;
  } else if (rank === 'C') {
    for (let i = from; i < r.length; i++) {
      if (rng() < 0.12) {
        const len = 2 + Math.floor(rng() * 5), depth = 0.02 + rng() * 0.04;
        for (let j = i; j < Math.min(r.length, i + len); j++) r[j] = Math.max(0, r[j] - depth * Math.sin(((j - i + 0.5) / len) * Math.PI));
        i += len;
      }
    }
  }
  return r;
}

const C = {
  graphite: [0.17, 0.17, 0.18], lacquer: [0.86, 0.62, 0.35], red: [0.8, 0.14, 0.12], cream: [0.95, 0.9, 0.8], indigo: [0.16, 0.25, 0.55],
  yellow: [0.98, 0.8, 0.2], black: [0.07, 0.07, 0.08], skin: [0.98, 0.86, 0.74], green: [0.18, 0.6, 0.3], blue: [0.18, 0.35, 0.8],
  white: [0.95, 0.95, 0.94], porcelain: [0.93, 0.94, 0.96], amber: [0.85, 0.5, 0.15], rosewood: [0.35, 0.12, 0.08], string: [0.9, 0.85, 0.75],
  tile: [0.2, 0.25, 0.22], vermilion: [0.82, 0.22, 0.12], bronze: [0.55, 0.4, 0.2], gold: [0.85, 0.65, 0.2], lip: [0.75, 0.25, 0.25],
};
// 形ごとの塗り方。u：先端の部分の中の位置（0=根元側, 1=先）、angle：周りの角度、ratio：目標の太さの割合
const SCHEMES = {
  point: (u) => (u > 0.88 ? C.graphite : C.lacquer),
  steps: (u) => (u < 0.36 ? C.red : u < 0.66 ? C.cream : C.indigo),
  kokeshi: (u, a) => {
    if (u < 0.55) return Math.sin(a * 5) * Math.sin(u * 40) > 0.7 ? C.yellow : C.red;
    if (u < 0.68) return C.black;
    return u > 0.9 || Math.cos(a) < -0.3 ? C.black : C.skin;
  },
  chess: (u) => (u > 0.6 && u < 0.68 ? C.gold : C.black),
  face: (u) => (u > 0.82 ? C.black : u > 0.55 && u < 0.6 ? C.black : u > 0.3 && u < 0.36 ? C.lip : C.skin),
  'k-koma': (u) => (u > 0.94 ? C.graphite : [C.red, C.yellow, C.green, C.blue][Math.floor(u * 8) % 4]),
  'k-tokkuri': (u, a) => (u > 0.9 || (u < 0.5 && Math.sin(a * 6) > 0.6) ? C.indigo : C.porcelain),
  'k-pin': (u) => ((u > 0.62 && u < 0.66) || (u > 0.69 && u < 0.72) ? C.red : C.white),
  'k-juzu': (u, a, ratio) => (ratio < 0.4 ? C.string : Math.floor(u * 5) % 2 ? C.rosewood : C.amber),
  'k-tou': (u, a, ratio) => (u > 0.92 ? C.bronze : ratio > 0.62 ? C.tile : C.vermilion),
};

export function paintColor(stageId, rank, u, angle, ratio) {
  if (rank === 'B') return WOOD_RGB;
  if (rank === 'C') {
    const spot = Math.sin(u * 90) * Math.sin(angle * 7) > 0.6;
    return spot ? [0.25, 0.18, 0.12] : [0.55, 0.42, 0.28];
  }
  if (rank === 'S' && (u < 0.025 || u > 0.985)) return GOLD;
  return (SCHEMES[stageId] || SCHEMES.point)(u, angle, ratio);
}

// S のときの飾り。五重塔は相輪（九輪と宝珠）と、屋根ごとに4つの風鈴
export function decorations(stageId, rank, target, from) {
  if (rank !== 'S') return [];
  const n = target.length, dx = PENCIL_LENGTH / (n - 1), out = [];
  for (let k = 0; k < 24; k++) {
    const i = from + Math.floor(((k * 37) % 100) / 100 * (n - from));
    out.push({ kind: 'sparkle', x: i * dx, r: target[i] + 0.06 + ((k * 13) % 7) * 0.02, a: k * 2.39 });
  }
  if (stageId === 'k-tou') {
    const peak = Math.max(...target.slice(from));
    for (let i = from + 1; i < n - 1; i++) {
      if (target[i] >= target[i - 1] && target[i] > target[i + 1] && target[i] > 0.6 * peak) {
        for (let q = 0; q < 4; q++) out.push({ kind: 'bell', x: i * dx, r: target[i], a: Math.PI / 4 + (q * Math.PI) / 2 });
      }
    }
    for (let q = 0; q < 9; q++) out.push({ kind: 'ring', x: PENCIL_LENGTH + 0.03 + q * 0.035, r: 0.045 - q * 0.002 });
    out.push({ kind: 'jewel', x: PENCIL_LENGTH + 0.03 + 9 * 0.035 + 0.035, r: 0.035 });
  }
  return out;
}
