import {
  ABYSS_RAID_CONFIG,
  RAID_SCORE_WEIGHTS,
} from "../../data/abyssRaidConfig";
import { clamp, normalCdfApprox } from "../common/stats";

export function computeRaidDistribution(difficulty) {
  const cfg = ABYSS_RAID_CONFIG[difficulty];
  if (!cfg) return { mean: 0, std: 0 };

  let totalMean = 0;
  let totalVar = 0;

  cfg.phases.forEach((phase) => {
    const probs = phase.map((p) => p / 100);
    let mean = 0;
    let second = 0;

    probs.forEach((p, idx) => {
      const w = RAID_SCORE_WEIGHTS[idx];
      mean += p * w;
      second += p * w * w;
    });

    const variance = second - mean * mean;
    totalMean += mean;
    totalVar += variance;
  });

  return { mean: totalMean, std: Math.sqrt(totalVar) };
}

// 유저가 고른 보상 (phase별 rewardIndex) → 내부 점수
export function calcRaidScoreFromSelections(selections) {
  // selections: [0~4 또는 null]
  return selections.reduce((acc, val) => {
    if (val === null || val === "" || val === undefined) return acc;
    const idx = Number(val);
    if (Number.isNaN(idx) || idx < 0 || idx >= RAID_SCORE_WEIGHTS.length)
      return acc;
    return acc + RAID_SCORE_WEIGHTS[idx];
  }, 0);
}

export function evalRaidLuckPercentile(distribution, score) {
  const { mean, std } = distribution;
  if (!score || !std || std === 0) return { percentile: null, verdict: "" };

  const z = (score - mean) / std;
  const p = normalCdfApprox(z);
  const topPercent = clamp((1 - p) * 100, 0, 100);

  let verdict = "";
  if (topPercent <= 5) verdict = "오늘은 레이드 대박 운빨 🔥";
  else if (topPercent <= 20) verdict = "꽤 잘 나온 상위권 운빨 😎";
  else if (topPercent <= 50) verdict = "무난무난한 중간 정도 운입니다 🙂";
  else verdict = "오늘은 저점… 내일은 복리로 돌아올 예정 🙏";

  return { percentile: topPercent, verdict };
}
