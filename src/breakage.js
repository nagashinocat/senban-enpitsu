import { AREA_LIMIT, PENCIL_RADIUS } from './config.js';

// 一度に削った面積（removed × dx）が、削った所の細さに見合う上限を超えたら折れる。
// ゆっくり送れば深く削れるが、速く・深く・細い所ほど折れやすい
export function isBroken(profile, cut, breakFactor = 1) {
  if (!cut || cut.biteAt < 0 || !(cut.maxBite > 0)) return false;
  const r = profile.radii[cut.biteAt];
  if (r <= 0) return true; // 芯を断ち切った
  const area = cut.removed * profile.dx;
  return area > AREA_LIMIT * (r / PENCIL_RADIUS) * breakFactor;
}
