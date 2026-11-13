// 調整用の定数はすべてここに集める
export const SAMPLES = 200;
export const PENCIL_LENGTH = 6;
export const PENCIL_RADIUS = 0.4;
export const CORE_RADIUS = 0.1;

// 折れ：1か所で一度に削れる量の上限（太さに比例）
export const BITE_LIMIT = 0.12;
// 採点
export const OVERCUT_WEIGHT = 2;
export const MATCH_TOLERANCE = 0.1; // PENCIL_RADIUS に対する割合
export const TIME_BONUS_MAX = 200;
export const RANKS = [['S', 1000], ['A', 850], ['B', 700], ['C', 0]];
