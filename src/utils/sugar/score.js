// src/utils/sugar/score.js

import { BONUS_PER_STEP, GRADE_INFO } from "../../constants/sugar";

export const getPieceBaseScore = (grade, cellCount) => {
  const info = GRADE_INFO[grade];
  if (!info) return 0;
  return info.points * cellCount;
};

export const getBonusFromModifier = (cellCount) => {
  if (!cellCount || cellCount < 9) return 0;
  const effectiveCells = Math.min(cellCount, 21);
  const extra = effectiveCells - 9;
  const bonusCount = 1 + Math.floor(extra / 3);
  return bonusCount * BONUS_PER_STEP;
};

// ✅ 수정: 유니크 등급은 수식어 보너스가 없으므로, summarizeBonuses 함수는 기존 로직 유지
// (solver.js에서 modifierPotential, modifierTotals를 계산할 때 유니크를 제외하면 충분)
export const summarizeBonuses = (modifierMap) => {
  const breakdown = [];
  let total = 0;
  Object.entries(modifierMap).forEach(([modifier, cells]) => {
    const bonus = getBonusFromModifier(cells);
    if (bonus > 0) {
      breakdown.push({ modifier, cells: Math.min(cells, 21), bonus });
      total += bonus;
    }
  });
  return { totalBonus: total, breakdown };
};