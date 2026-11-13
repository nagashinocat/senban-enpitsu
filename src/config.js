// 調整用の定数はすべてここに集める
export const SAMPLES = 200;
export const PENCIL_LENGTH = 6;
export const PENCIL_RADIUS = 0.4;
export const CORE_RADIUS = 0.1;

// 折れ：一度（指の1回の動き）に削れる面積の上限。削った所の細さに比例して小さくなる
export const AREA_LIMIT = 0.03;
// 採点
export const OVERCUT_WEIGHT = 2;
export const MATCH_TOLERANCE = 0.1; // PENCIL_RADIUS に対する割合
export const TIME_BONUS_MAX = 200;
export const RANKS = [['S', 1000], ['A', 850], ['B', 700], ['C', 0]];

// 操作：指の上下の動きに対する刃の深さの動き（小さいほど細かい）
export const DEPTH_GAIN = 0.35;
export const TOOL_HALF_WIDTH = 0.04;
export const TOOL_REST_R = 0.6; // 刃の待機位置（鉛筆の外）
