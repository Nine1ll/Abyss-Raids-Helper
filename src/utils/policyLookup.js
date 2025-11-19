// src/data/policyLookup.js
import rawData from "./culculated_prob.json";

// 내부에서 사용할 Map (검색 빠르게)
const policyMap = new Map();

// key 형식: `${mode}_${pos}_${turns}_${b}_${c}`
function makeKey(mode, pos, turnsLeft, bLeft, cLeft) {
  return `${mode}_${pos}_${turnsLeft}_${bLeft}_${cLeft}`;
}

// JSON 배열 → Map으로 변환
rawData.forEach((item) => {
  const key = makeKey(
    item.mode,
    item.pos,
    item.turns_left,
    item.b_left,
    item.c_left
  );
  policyMap.set(key, item);
});

/**
 * 현재 상태에 맞는 raw 정책 객체 가져오기
 */
export function getPolicy({ mode, pos, turnsLeft, bLeft, cLeft }) {
  const key = makeKey(mode, pos, turnsLeft, bLeft, cLeft);
  return policyMap.get(key) || null;
}

/**
 * UI에서 바로 쓰기 좋게 확률만 뽑아서 리턴
 * - A/B/C 성공 확률
 * - 최적 액션(bestActions) & 그 확률(bestValue)
 */
export function getActionProbabilities(state) {
  const policy = getPolicy(state);

  if (!policy) {
    return {
      probs: { A: null, B: null, C: null },
      bestActions: [],
      bestValue: null,
    };
  }

  // 숫자형으로 안전하게 변환
  const probs = {
    A: Number(policy.A?.success ?? 0),
    B: Number(policy.B?.success ?? 0),
    C: Number(policy.C?.success ?? 0),
  };

  const values = [probs.A, probs.B, probs.C];
  const bestValue = Math.max(...values);

  const bestActions = [];
  if (probs.A === bestValue) bestActions.push("A");
  if (probs.B === bestValue) bestActions.push("B");
  if (probs.C === bestValue) bestActions.push("C");

  return { probs, bestActions, bestValue };
}
