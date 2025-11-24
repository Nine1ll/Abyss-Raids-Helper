import { useMemo, useState } from "react";
import {
  ABYSS_RAID_CONFIG,
  RAID_REWARD_LABELS,
} from "../../../data/abyssRaidConfig";
import {
  calcRaidScoreFromSelections,
  computeRaidDistribution,
  evalRaidLuckPercentile,
} from "../../../domain/abyss/raidModel";

export function useRaidLuck() {
  const [difficulty, setDifficulty] = useState("normal");
  // phase별 선택된 보상 index (0~4 또는 null)
  const [phaseSelections, setPhaseSelections] = useState([null, null, null, null]);

  const config = ABYSS_RAID_CONFIG[difficulty];

  const distribution = useMemo(
    () => computeRaidDistribution(difficulty),
    [difficulty]
  );

  const score = useMemo(
    () => calcRaidScoreFromSelections(phaseSelections),
    [phaseSelections]
  );

  const { percentile, verdict } = useMemo(
    () => evalRaidLuckPercentile(distribution, score),
    [distribution, score]
  );

  const setPhaseSelection = (phaseIndex, value) => {
    setPhaseSelections((prev) => {
      const next = [...prev];
      next[phaseIndex] =
        value === "" || value === null ? null : Number(value);
      return next;
    });
  };

  return {
    difficulty,
    setDifficulty,
    config,
    rewardLabels: RAID_REWARD_LABELS,
    phaseSelections,
    setPhaseSelection,
    distribution,
    score,
    percentile,
    verdict,
  };
}
