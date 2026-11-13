import { SAMPLES, PENCIL_LENGTH, PENCIL_RADIUS } from './config.js';

export function createProfile(samples = SAMPLES, length = PENCIL_LENGTH, radius = PENCIL_RADIUS) {
  return { radii: new Float32Array(samples).fill(radius), length, dx: length / (samples - 1) };
}

export function xToIndex(profile, x) {
  const i = Math.round(x / profile.dx);
  return Math.max(0, Math.min(profile.radii.length - 1, i));
}

// 刃先を from から to へ直線で動かし、帯にかかる所を削る
export function cutSweep(profile, from, to, halfWidth) {
  const { radii, dx } = profile;
  let maxBite = 0, biteAt = -1, removed = 0;
  const x0 = Math.min(from.x, to.x) - halfWidth;
  const x1 = Math.max(from.x, to.x) + halfWidth;
  const i0 = Math.max(0, Math.ceil(x0 / dx));
  const i1 = Math.min(radii.length - 1, Math.floor(x1 / dx));
  const span = to.x - from.x;
  for (let i = i0; i <= i1; i++) {
    const x = i * dx;
    // その位置で刃にかかる最も深い半径（帯の幅も考える）
    let toolR;
    if (Math.abs(span) < 1e-9) toolR = Math.min(from.r, to.r);
    else {
      const ta = Math.max(0, Math.min(1, (x - halfWidth - from.x) / span));
      const tb = Math.max(0, Math.min(1, (x + halfWidth - from.x) / span));
      const ra = from.r + (to.r - from.r) * ta;
      const rb = from.r + (to.r - from.r) * tb;
      toolR = Math.min(ra, rb);
    }
    toolR = Math.max(0, toolR);
    if (toolR < radii[i]) {
      const bite = radii[i] - toolR;
      removed += bite;
      if (bite > maxBite) { maxBite = bite; biteAt = i; }
      radii[i] = toolR;
    }
  }
  return { maxBite, biteAt, removed };
}
