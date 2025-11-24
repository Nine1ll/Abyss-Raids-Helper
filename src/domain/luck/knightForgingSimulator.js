// src/domain/luck/knightForgingSimulator.js

// --- 규칙 상수 ---
// 이동 폭
const ACTION_A = [3, 4, 5, 6];        // +3 ~ +6
const ACTION_B = [-3, -2, -1, 0, 1, 2]; // -3 ~ +2
const ACTION_C = [0, 1, 2, 3, 4];     // 0 ~ +4

// 총 턴 수 / 사용 제한
const TOTAL_TURNS = 8;
const MAX_B = 3;
const MAX_C = 2;

// 모드(예: 슈퍼 에픽, 유니크)
export const MODES = {
  SUPER_EPIC: "super_epic",
  UNIQUE: "unique",
};

// --- 성공 / 실패 판정 ---
function isSuccess(pos, mode) {
  if (mode === MODES.SUPER_EPIC) return pos === 15;           // 15칸 = 슈퍼 에픽
  if (mode === MODES.UNIQUE) return pos === 14 || pos === 16; // 양옆 허용
  return false;
}

function isFailure(pos, mode) {
  if (mode === MODES.SUPER_EPIC) return pos > 15;
  if (mode === MODES.UNIQUE) return pos > 16;
  return false;
}

// --- DP (성공 확률) ---
const dpCache = new Map(); // key: "pos|turns|b|c|mode"

function dp(pos, turnsLeft, bLeft, cLeft, mode) {
  if (isFailure(pos, mode)) return 0;

  if (turnsLeft === 0) {
    return isSuccess(pos, mode) ? 1 : 0;
  }

  const key = `${pos}|${turnsLeft}|${bLeft}|${cLeft}|${mode}`;
  if (dpCache.has(key)) return dpCache.get(key);

  // A
  let sumA = 0;
  for (const d of ACTION_A) sumA += dp(pos + d, turnsLeft - 1, bLeft, cLeft, mode);
  const valA = sumA / ACTION_A.length;

  // B
  let valB = -1;
  if (bLeft > 0) {
    let sumB = 0;
    for (const d of ACTION_B)
      sumB += dp(pos + d, turnsLeft - 1, bLeft - 1, cLeft, mode);
    valB = sumB / ACTION_B.length;
  }

  // C
  let valC = -1;
  if (cLeft > 0) {
    let sumC = 0;
    for (const d of ACTION_C)
      sumC += dp(pos + d, turnsLeft - 1, bLeft, cLeft - 1, mode);
    valC = sumC / ACTION_C.length;
  }

  const best = Math.max(valA, valB, valC);
  dpCache.set(key, best);
  return best;
}

// DP 기준 최적 액션
function getBestAction(pos, turnsLeft, bLeft, cLeft, mode) {
  if (turnsLeft === 0 || isFailure(pos, mode)) return "A";

  const candidates = [];

  // A
  {
    let sum = 0;
    for (const d of ACTION_A)
      sum += dp(pos + d, turnsLeft - 1, bLeft, cLeft, mode);
    candidates.push({ action: "A", value: sum / ACTION_A.length });
  }

  // B
  if (bLeft > 0) {
    let sum = 0;
    for (const d of ACTION_B)
      sum += dp(pos + d, turnsLeft - 1, bLeft - 1, cLeft, mode);
    candidates.push({ action: "B", value: sum / ACTION_B.length });
  }

  // C
  if (cLeft > 0) {
    let sum = 0;
    for (const d of ACTION_C)
      sum += dp(pos + d, turnsLeft - 1, bLeft, cLeft - 1, mode);
    candidates.push({ action: "C", value: sum / ACTION_C.length });
  }

  let best = candidates[0];
  for (const cand of candidates) {
    if (cand.value > best.value + 1e-9) best = cand;
  }
  return best.action;
}

// --- 1회 시뮬레이션 ---
// strategy: "optimal" | "random"
function simulateSingleRun(strategy, mode, rng = Math.random) {
  let pos = 0;
  let bLeft = MAX_B;
  let cLeft = MAX_C;
  let turnsLeft = TOTAL_TURNS;

  while (turnsLeft > 0 && !isFailure(pos, mode)) {
    let action;

    if (strategy === "optimal") {
      action = getBestAction(pos, turnsLeft, bLeft, cLeft, mode);
    } else {
      const available = ["A"];
      if (bLeft > 0) available.push("B");
      if (cLeft > 0) available.push("C");
      action = available[Math.floor(rng() * available.length)];
    }

    let pool;
    if (action === "A") pool = ACTION_A;
    else if (action === "B") {
      pool = ACTION_B;
      bLeft = Math.max(0, bLeft - 1);
    } else {
      pool = ACTION_C;
      cLeft = Math.max(0, cLeft - 1);
    }

    const delta = pool[Math.floor(rng() * pool.length)];
    pos += delta;
    turnsLeft -= 1;
  }

  return {
    finalPos: pos,
    success: isSuccess(pos, mode),
    failure: isFailure(pos, mode),
  };
}

// --- 몬테카를로: DP vs 무작위 둘 다 ---
// 반환값은 React 쪽에서 그대로 써먹기 좋게 구성
export function runKnightForgingComparison({
  trials = 10000,
  mode = MODES.SUPER_EPIC,
  rng = Math.random,
} = {}) {
  dpCache.clear();

  const strategies = ["optimal", "random"];
  const results = {};

  for (const strategy of strategies) {
    let successCount = 0;
    let failureCount = 0;
    const posCounts = new Map();

    for (let i = 0; i < trials; i += 1) {
      const { finalPos, success, failure } = simulateSingleRun(
        strategy,
        mode,
        rng
      );

      if (success) successCount += 1;
      if (failure) failureCount += 1;

      const key = String(finalPos);
      posCounts.set(key, (posCounts.get(key) ?? 0) + 1);
    }

    results[strategy] = {
      strategy,
      trials,
      successCount,
      failureCount,
      successRate: successCount / trials,
      failureRate: failureCount / trials,
      posCounts,
    };
  }

  return {
    mode,
    trials,
    optimal: results.optimal,
    random: results.random,
  };
}
