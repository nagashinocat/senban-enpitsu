import { PENCIL_RADIUS, OVERCUT_WEIGHT, MATCH_TOLERANCE, MATCH_DEADBAND, TIME_BONUS_MAX, RANKS } from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// from：採点する先端の部分の始まり。手前は削りすぎだけが効き、割るのは先端の部分の大きさ
export function matchRate(profile, target, from = 0, tolerance = MATCH_TOLERANCE) {
  const { radii } = profile;
  const n = Math.min(radii.length, target.length);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = (radii[i] - target[i]) / PENCIL_RADIUS;
    const d = Math.max(0, Math.abs(e) - MATCH_DEADBAND);
    sum += e < 0 ? d * OVERCUT_WEIGHT : d;
  }
  const m = sum / Math.max(1, n - from);
  return 100 * clamp(1 - m / tolerance, 0, 1);
}

export function timeBonus(seconds, parSeconds) {
  if (!Number.isFinite(seconds) || !(parSeconds > 0)) return 0;
  return TIME_BONUS_MAX * clamp(1 - seconds / (2 * parSeconds), 0, 1);
}

export function rankOf(total) {
  for (const [rank, min] of RANKS) if (total >= min) return rank;
  return 'C';
}

export function scoreResult(profile, target, seconds, parSeconds, from = 0, tolerance = MATCH_TOLERANCE) {
  const match = matchRate(profile, target, from, tolerance);
  // 形が合っているほどタイムボーナスが効く（何も削らずに即完成で稼げないように）
  const bonus = timeBonus(seconds, parSeconds) * (match / 100);
  const total = Math.round(match * 10 + bonus);
  return { match, bonus, total, rank: rankOf(total) };
}
