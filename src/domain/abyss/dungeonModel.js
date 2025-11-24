import {
  ABYSS_DUNGEON_CONFIG,
  DUNGEON_SCORE_WEIGHTS,
  GLASS_SCORE_WEIGHTS,
  BONUS_STAGE_PROB,
} from "../../data/abyssDungeonConfig";
import { clamp, normalCdfApprox } from "../common/stats";

export function computeDungeonDistribution(level, runs) {
  const cfg = ABYSS_DUNGEON_CONFIG[level];
  const nRuns = Number(runs || 0);
  if (!cfg || !nRuns) return { mean: 0, std: 0 };

  const nKnights = nRuns * cfg.knightsPerRun;
  const nGlass = nRuns * cfg.glassPerRun;

  // 시즈나이트 1개 기준 모멘트
  let kMean1 = 0;
  let kSecond1 = 0;
  Object.entries(cfg.knightProbs).forEach(([tier, p]) => {
    const w = DUNGEON_SCORE_WEIGHTS[tier];
    if (!w || !p) return;
    kMean1 += p * w;
    kSecond1 += p * w * w;
  });
  const kVar1 = kSecond1 - kMean1 * kMean1;

  // 유리조각 1개 기준 모멘트
  let gMean1 = 0;
  let gSecond1 = 0;
  Object.entries(cfg.glassProbs).forEach(([tier, p]) => {
    const w = GLASS_SCORE_WEIGHTS[tier];
    if (!w || !p) return;
    gMean1 += p * w;
    gSecond1 += p * w * w;
  });
  const gVar1 = gSecond1 - gMean1 * gMean1;

  // 보너스 스테이지: 상급 1개 확정 드랍
  const bonusMean = nRuns * BONUS_STAGE_PROB * DUNGEON_SCORE_WEIGHTS.top;
  const bonusVar =
    nRuns *
    BONUS_STAGE_PROB *
    (1 - BONUS_STAGE_PROB) *
    DUNGEON_SCORE_WEIGHTS.top *
    DUNGEON_SCORE_WEIGHTS.top;

  const totalMean = nKnights * kMean1 + nGlass * gMean1 + bonusMean;
  const totalVar = nKnights * kVar1 + nGlass * gVar1 + bonusVar;

  return { mean: totalMean, std: Math.sqrt(totalVar) };
}

// 유저 입력값을 점수로 환산
export function calcDungeonScore(knightCounts, glassCounts, bonusStageCount) {
  let score = 0;

  Object.entries(knightCounts).forEach(([tier, val]) => {
    const n = Number(val || 0);
    const w = DUNGEON_SCORE_WEIGHTS[tier];
    if (!w || !n) return;
    score += n * w;
  });

  Object.entries(glassCounts).forEach(([tier, val]) => {
    const n = Number(val || 0);
    const w = GLASS_SCORE_WEIGHTS[tier];
    if (!w || !n) return;
    score += n * w;
  });

  const b = Number(bonusStageCount || 0);
  if (b > 0) {
    score += b * DUNGEON_SCORE_WEIGHTS.top;
  }
  return score;
}

export function evalDungeonLuckPercentile(distribution, score) {
  const { mean, std } = distribution;
  if (!score || !std || std === 0) return { percentile: null, verdict: "" };

  const z = (score - mean) / std;
  const p = normalCdfApprox(z);
  const topPercent = clamp((1 - p) * 100, 0, 100);

  let verdict = "";
  if (topPercent <= 5) verdict = "던전 기준 오늘은 찐상위 운빨 🔥";
  else if (topPercent <= 20) verdict = "상위권 운빨입니다 😎";
  else if (topPercent <= 50) verdict = "적당한 평균 정도 운입니다 🙂";
  else verdict = "살짝 저점… 내일은 상단 구간 기대해볼 만 합니다 🙏";

  return { percentile: topPercent, verdict };
}
