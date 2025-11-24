// src/features/luck/hooks/useKnightForgingComparison.js
import { useMemo } from "react";
import {
  runKnightForgingComparison,
  MODES,
} from "../../../domain/luck/knightForgingSimulator";

export { MODES };

export function useKnightForgingComparison({ trials = 10000, mode = MODES.SUPER_EPIC }) {
  const result = useMemo(
    () => runKnightForgingComparison({ trials, mode }),
    [trials, mode]
  );

  return result; // { mode, trials, optimal, random }
}
