import { useMemo, useState } from "react";
import { ABYSS_DUNGEON_CONFIG } from "../../../data/abyssDungeonConfig";
import {
  calcDungeonScore,
  computeDungeonDistribution,
  evalDungeonLuckPercentile,
} from "../../../domain/abyss/dungeonModel";

export function useDungeonLuck() {
  const [level, setLevel] = useState("1");
  const [runs, setRuns] = useState(0);

  const [knights, setKnights] = useState({
    top: "",
    rare: "",
    uncommon: "",
    common: "",
  });

  const [glass, setGlass] = useState({
    rare: "",
    epic: "",
    super_epic: "",
    unique: "",
  });

  const [bonusCount, setBonusCount] = useState(0);

  const config = ABYSS_DUNGEON_CONFIG[level];

  const distribution = useMemo(
    () => computeDungeonDistribution(level, runs),
    [level, runs]
  );

  const score = useMemo(
    () => calcDungeonScore(knights, glass, bonusCount),
    [knights, glass, bonusCount]
  );

  const { percentile, verdict } = useMemo(
    () => evalDungeonLuckPercentile(distribution, score),
    [distribution, score]
  );

  return {
    level,
    setLevel,
    runs,
    setRuns,
    config,
    knights,
    setKnights,
    glass,
    setGlass,
    bonusCount,
    setBonusCount,
    distribution,
    score,
    percentile,
    verdict,
  };
}
