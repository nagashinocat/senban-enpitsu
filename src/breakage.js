import { BITE_LIMIT, PENCIL_RADIUS } from './config.js';

export function isBroken(profile, cut, breakFactor = 1) {
  if (!cut || cut.biteAt < 0 || !(cut.maxBite > 0)) return false;
  const r = profile.radii[cut.biteAt];
  if (r <= 0) return true; // 芯を断ち切った
  return cut.maxBite > BITE_LIMIT * (r / PENCIL_RADIUS) * breakFactor;
}
