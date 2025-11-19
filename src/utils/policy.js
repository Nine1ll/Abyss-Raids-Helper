// src/utils/policy.js
import rawPolicyData from "../data/culculated_prob.json";

export const DEFAULT_PROBS = {
  A: { success: 0, failure: 0 },
  B: { success: 0, failure: 0 },
  C: { success: 0, failure: 0 },
};

// JSON(배열) → Map 변환
export const policyMap = (() => {
  const map = new Map();
  rawPolicyData.forEach((item) => {
    const key = `${item.pos}_${item.turns_left}_${item.b_left}_${item.c_left}_${item.mode}`;
    map.set(key, {
      A: item.A ?? { success: 0, failure: 0 },
      B: item.B ?? { success: 0, failure: 0 },
      C: item.C ?? { success: 0, failure: 0 },
    });
  });
  return map;
})();
