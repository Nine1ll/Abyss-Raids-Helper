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
