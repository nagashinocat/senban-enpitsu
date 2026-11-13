import { PENCIL_LENGTH } from '../config.js';
import { xToIndex } from '../profile.js';

const HUD_PX = 96; // 上の表示（面の名前・一致率・2行のヒント）の高さ

// 拡大窓の位置（CSS px、左上原点）。縦持ちは鉛筆の上に横長、横持ちは右上
export function zoomRect(w, h, { pencilTopPx }) {
  if (h >= w) {
    const x = Math.round(w * 0.05), ww = w - 2 * x;
    const y = HUD_PX;
    const hh = Math.max(60, Math.min(ww * 0.6, pencilTopPx - 16 - y));
    return { x, y, w: ww, h: hh };
  }
  const ww = Math.round(w * 0.34), x = w - ww - 10;
  const y = 64;
  const hh = Math.max(44, Math.min(ww * 0.45, pencilTopPx - 8 - y));
  return { x, y, w: ww, h: hh };
}

// 窓の中心：刃の位置の、鉛筆の今の表面（下側）
export function zoomCenter(profile, tool) {
  const x = Math.max(0, Math.min(PENCIL_LENGTH, tool.x));
  return { x, y: -profile.radii[xToIndex(profile, x)] };
}

// 先端に寄せた画角：xFrom（先端の部分の始まり）から鉛筆の端までが収まる
export function focusFrame(xFrom, w, h) {
  const left = xFrom - 0.6, right = PENCIL_LENGTH + 0.6;
  let hw = (right - left) / 2, hh = hw * (h / w);
  const MIN_HH = 1.4;
  if (hh < MIN_HH) { hh = MIN_HH; hw = hh * (w / h); }
  return { cx: (left + right) / 2, hw, hh };
}
