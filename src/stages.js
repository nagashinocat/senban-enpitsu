import { SAMPLES, PENCIL_RADIUS, CORE_RADIUS } from './config.js';

// 形は先端の部分の中での位置 u（0=根元側, 1=先端）で書く。制御点 [u, 太さの割合] の間をなめらか（コサイン）につなぐ
function curve(points) {
  return (u) => {
    if (u <= points[0][0]) return points[0][1];
    for (let k = 1; k < points.length; k++) {
      const [u1, r1] = points[k];
      if (u <= u1) {
        const [u0, r0] = points[k - 1];
        const t = (u - u0) / (u1 - u0 || 1);
        const s = (1 - Math.cos(Math.PI * t)) / 2;
        return r0 + (r1 - r0) * s;
      }
    }
    return points[points.length - 1][1];
  };
}

const MIN_RATIO = (CORE_RADIUS * 0.5) / PENCIL_RADIUS;

export const INTRO = [
  '試験の朝。筆箱を開けたら、鉛筆削りがない。',
  '…でも大丈夫。うちには旋盤がある。',
];

export const STAGES = [
  {
    id: 'point', name: '鉛筆の先',
    story: ['試験の朝。鉛筆削りを忘れた。', '…家に旋盤があってよかった。'],
    bubble: 'とがらせるだけ',
    tip: 0.3,
    shape: (u) => 1 - (1 - MIN_RATIO) * u,
    parSeconds: 20, breakFactor: 1.0,
  },
  {
    id: 'steps', name: '段つき',
    story: ['削りすぎて短くなった。', '段をつけて長く見せよう。'],
    bubble: '長く見える…はず',
    tip: 0.35,
    shape: curve([[0, 1], [0.3, 1], [0.36, 0.75], [0.6, 0.75], [0.66, 0.5], [1, 0.5]]),
    parSeconds: 25, breakFactor: 1.0,
  },
  {
    id: 'kokeshi', name: 'こけし',
    story: ['先生に見つかった。', '『工作の課題です』と言い張るしかない。'],
    bubble: '工作の課題です',
    tip: 0.35,
    shape: curve([[0, 0.7], [0.12, 0.85], [0.35, 0.8], [0.55, 0.6], [0.62, 0.4], [0.7, 0.85], [0.8, 0.95], [0.92, 0.8], [1, 0.3]]),
    parSeconds: 35, breakFactor: 0.9,
  },
  {
    id: 'chess', name: 'チェスの駒',
    story: ['工作にしては尖りすぎだと言われた。', '『美術部の作品です』'],
    bubble: '美術部の作品です',
    tip: 0.35,
    shape: curve([[0, 1], [0.12, 1], [0.18, 0.6], [0.55, 0.38], [0.62, 0.65], [0.66, 0.65], [0.72, 0.3], [0.85, 0.8], [0.95, 0.6], [1, 0.2]]),
    parSeconds: 40, breakFactor: 0.7,
  },
  {
    id: 'face', name: '試験官の顔',
    story: ['試験会場。試験官がこちらを見ている。', '…試験官を彫るしかない。'],
    bubble: '…似てる',
    tip: 0.4,
    // 左から：首・あご・唇・鼻・眉・額・頭
    shape: curve([[0, 0.5], [0.12, 0.55], [0.22, 0.8], [0.3, 0.6], [0.35, 0.72], [0.4, 0.6], [0.5, 0.95], [0.58, 0.66], [0.66, 0.82], [0.75, 0.75], [0.88, 0.85], [1, 0.3]]),
    parSeconds: 45, breakFactor: 0.5,
  },
];

export const ENDING = [
  '試験官は、自分そっくりの鉛筆を見つめて言った。',
  '「…合格」　なにに？',
];

// 形を彫るのは先端の部分（鉛筆の長さの stage.tip）だけ。手前は元の鉛筆のまま
export function tipStartIndex(stage, samples = SAMPLES) {
  return Math.round((1 - stage.tip) * (samples - 1));
}

export function buildTarget(stage, samples = SAMPLES) {
  const t = new Float32Array(samples);
  const k = tipStartIndex(stage, samples);
  for (let i = 0; i < samples; i++) {
    const ratio = i < k ? 1 : Math.max(MIN_RATIO, Math.min(1, stage.shape((i - k) / (samples - 1 - k))));
    t[i] = ratio * PENCIL_RADIUS;
  }
  return t;
}
