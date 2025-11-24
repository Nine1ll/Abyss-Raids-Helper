// src/components/LuckMeter.jsx
import React, { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import culculatedProbRaw from "../data/culculated_prob.json"; // DP 테이블

/**
 * 1. 어비스 레이드 확률
 * [최상급, 상급, 조각(최대), 조각(중간), 조각(최소)]
 */
const ABYSS_RAID_PROBS = {
  normal: {
    label: "노말",
    shards: [100, 50, 30],
    phases: [
      [0, 2.25, 14.66, 24.44, 58.65],
      [0, 3, 14.55, 24.25, 58.2],
      [1.75, 3.75, 14.18, 23.63, 56.69],
      [3.25, 6, 13.61, 22.69, 54.45],
    ],
  },
  hard: {
    label: "하드",
    shards: [150, 75, 45],
    phases: [
      [0, 3.75, 14.44, 24.06, 57.75],
      [0, 5, 14.25, 23.75, 57],
      [2.92, 6.25, 13.62, 22.71, 54.5],
      [5.42, 10, 12.69, 21.15, 50.74],
    ],
  },
  hell: {
    label: "헬",
    shards: [200, 100, 60],
    phases: [
      [0, 4.69, 14.3, 23.83, 57.18],
      [0, 6.25, 14.06, 23.44, 56.25],
      [3.65, 7.81, 13.28, 22.14, 53.12],
      [6.77, 12.5, 12.11, 20.18, 48.44],
    ],
  },
  challenge: {
    label: "챌린지",
    shards: [200, 100, 60],
    phases: [
      [0, 4.69, 14.3, 23.83, 57.18],
      [0, 6.25, 14.06, 23.44, 56.25],
      [3.65, 7.81, 13.28, 22.14, 53.12],
      [6.77, 12.5, 12.11, 20.18, 48.44],
    ],
  },
};

const RAID_SCORE_WEIGHTS = [5, 4, 3, 2, 1];

/**
 * 2. 어비스 던전 설정
 */
const ABYSS_DUNGEON_CONFIG = {
  1: {
    label: "1단계",
    knightsPerRun: 2,
    glassPerRun: 5,
    knightProbs: {
      top: 0.009,
      rare: 0.051,
      uncommon: 0.1,
      common: 0.84,
    },
    glassProbs: {
      rare: 0.95,
      epic: 0.05,
      super: 0,
      unique: 0,
    },
  },
  2: {
    label: "2단계",
    knightsPerRun: 2,
    glassPerRun: 6,
    knightProbs: {
      top: 0.015,
      rare: 0.063,
      uncommon: 0.12,
      common: 0.803,
    },
    glassProbs: {
      rare: 0.9,
      epic: 0.1,
      super: 0,
      unique: 0,
    },
  },
  3: {
    label: "3단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.021,
      rare: 0.075,
      uncommon: 0.14,
      common: 0.765,
    },
    glassProbs: {
      rare: 0.8,
      epic: 0.15,
      super: 0.05,
      unique: 0,
    },
  },
  4: {
    label: "4단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.024,
      rare: 0.09,
      uncommon: 0.16,
      common: 0.725,
    },
    glassProbs: {
      rare: 0.7,
      epic: 0.2,
      super: 0.1,
      unique: 0,
    },
  },
  5: {
    label: "5단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.033,
      rare: 0.099,
      uncommon: 0.18,
      common: 0.688,
    },
    glassProbs: {
      rare: 0.58,
      epic: 0.25,
      super: 0.15,
      unique: 0.05,
    },
  },
};

const DUNGEON_SCORE_WEIGHTS = {
  top: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const GLASS_SCORE_WEIGHTS = {
  rare: 1,
  epic: 2,
  super: 3,
  unique: 4,
};

// 보너스 스테이지 확률
const BONUS_STAGE_PROB = 0.02;

// 정규분포 CDF 근사
const normalCdfApprox = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-0.5 * z * z);
  let prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return prob;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** 레이드 분포 계산 */
function computeRaidDistribution(difficultyKey) {
  const cfg = ABYSS_RAID_PROBS[difficultyKey];
  if (!cfg) return { mean: 0, std: 0 };

  let totalMean = 0;
  let totalVar = 0;

  cfg.phases.forEach((phaseProbs) => {
    const probs = phaseProbs.map((p) => p / 100);
    let mean = 0;
    let second = 0;

    for (let i = 0; i < probs.length; i++) {
      const w = RAID_SCORE_WEIGHTS[i];
      const p = probs[i];
      mean += p * w;
      second += p * w * w;
    }
    const variance = second - mean * mean;
    totalMean += mean;
    totalVar += variance;
  });

  return { mean: totalMean, std: Math.sqrt(totalVar) };
}

/** 던전 분포 계산 (단일 레벨 + 판 수 + 보너스 2%) */
function computeDungeonDistribution(levelKey, runs) {
  const cfg = ABYSS_DUNGEON_CONFIG[levelKey];
  if (!cfg || !runs) return { mean: 0, std: 0 };

  const nRuns = Number(runs || 0);
  if (!nRuns) return { mean: 0, std: 0 };

  const nKnights = nRuns * cfg.knightsPerRun;
  const nGlass = nRuns * cfg.glassPerRun;

  // 시즈나이트 1개
  let kMeanOne = 0;
  let kSecondOne = 0;
  Object.entries(cfg.knightProbs).forEach(([tier, p]) => {
    const w = DUNGEON_SCORE_WEIGHTS[tier];
    kMeanOne += p * w;
    kSecondOne += p * w * w;
  });
  const kVarOne = kSecondOne - kMeanOne * kMeanOne;

  // 유리조각 1개
  let gMeanOne = 0;
  let gSecondOne = 0;
  Object.entries(cfg.glassProbs).forEach(([tier, p]) => {
    const w = GLASS_SCORE_WEIGHTS[tier];
    gMeanOne += p * w;
    gSecondOne += p * w * w;
  });
  const gVarOne = gSecondOne - gMeanOne * gMeanOne;

  // 보너스 스테이지 (상급 1개 추가)
  const wTop = DUNGEON_SCORE_WEIGHTS.top;
  const bonusMean = nRuns * BONUS_STAGE_PROB * wTop;
  const bonusVar =
    nRuns * BONUS_STAGE_PROB * (1 - BONUS_STAGE_PROB) * wTop * wTop;

  const totalMean = nKnights * kMeanOne + nGlass * gMeanOne + bonusMean;
  const totalVar = nKnights * kVarOne + nGlass * gVarOne + bonusVar;

  return { mean: totalMean, std: Math.sqrt(totalVar) };
}

/** 3. 시즈나이트 가공 DP 테이블 인덱싱 */
const culculatedProbIndex = (() => {
  const map = new Map();
  // JSON: [{pos, turns_left, b_left, c_left, mode, A:{success,failure}, ...}, ...]
  culculatedProbRaw.forEach((row) => {
    const key = `${row.pos}|${row.turns_left}|${row.b_left}|${row.c_left}|${row.mode}`;
    map.set(key, row);
  });
  return map;
})();

const LuckMeter = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  // 하위 모드: 레이드 / 던전 / 가공
  const [mode, setMode] = useState("raid");

  // ── 레이드 상태 ──────────────────────────
  const [raidDifficulty, setRaidDifficulty] = useState("normal");
  const [raidSelections, setRaidSelections] = useState(["", "", "", ""]); // 페이즈별 보상 index

  // ── 던전 상태 ──────────────────────────
  const [dungeonLevel, setDungeonLevel] = useState("3");
  const [dungeonRuns, setDungeonRuns] = useState("");
  const [bonusStageCount, setBonusStageCount] = useState("");

  const [dungeonKnightCounts, setDungeonKnightCounts] = useState({
    top: "",
    rare: "",
    uncommon: "",
    common: "",
  });

  const [dungeonGlassCounts, setDungeonGlassCounts] = useState({
    rare: "",
    epic: "",
    super: "",
    unique: "",
  });

  // ── 가공 상태 ──────────────────────────
  const [procMode, setProcMode] = useState("super_epic"); // "super_epic" | "unique"
  const [procPos, setProcPos] = useState(0);
  const [procTurns, setProcTurns] = useState(8); // super_epic: 1~8, unique: 1~7
  const [procB, setProcB] = useState(3);
  const [procC, setProcC] = useState(3);

  // 내부 운빨 스코어 (레이드/던전에서만 사용)
  const myInternalScore = useMemo(() => {
    if (mode === "raid") {
      let score = 0;
      raidSelections.forEach((sel) => {
        if (sel === "" || sel == null) return;
        const idx = Number(sel);
        if (Number.isNaN(idx)) return;
        score += RAID_SCORE_WEIGHTS[idx];
      });
      return score;
    }

    if (mode === "dungeon") {
      let score = 0;

      Object.entries(dungeonKnightCounts).forEach(([tier, v]) => {
        const n = Number(v || 0);
        const w = DUNGEON_SCORE_WEIGHTS[tier];
        if (!w || !n) return;
        score += n * w;
      });

      Object.entries(dungeonGlassCounts).forEach(([tier, v]) => {
        const n = Number(v || 0);
        const w = GLASS_SCORE_WEIGHTS[tier];
        if (!w || !n) return;
        score += n * w;
      });

      const bonusCnt = Number(bonusStageCount || 0);
      if (bonusCnt > 0) {
        score += bonusCnt * DUNGEON_SCORE_WEIGHTS.top;
      }

      return score;
    }

    // 가공 모드에서는 percentile 안 씀
    return 0;
  }, [
    mode,
    raidSelections,
    dungeonKnightCounts,
    dungeonGlassCounts,
    bonusStageCount,
  ]);

  // 기저 분포 (레이드/던전)
  const baseDistribution = useMemo(() => {
    if (mode === "raid") {
      return computeRaidDistribution(raidDifficulty);
    }
    if (mode === "dungeon") {
      return computeDungeonDistribution(dungeonLevel, dungeonRuns);
    }
    return { mean: 0, std: 0 };
  }, [mode, raidDifficulty, dungeonLevel, dungeonRuns]);

  // 상위 % 계산 (레이드/던전)
  const percentileInfo = useMemo(() => {
    if (mode === "process") {
      return { percentile: null, verdict: "" };
    }

    const { mean, std } = baseDistribution;
    const score = myInternalScore;

    if (!score || !std || std === 0) {
      return { percentile: null, verdict: "" };
    }

    const z = (score - mean) / std;
    const p = normalCdfApprox(z);
    const topPercent = clamp((1 - p) * 100, 0, 100);

    let verdict = "";
    if (topPercent <= 5) verdict = "오늘은 완전 대박 운빨 날입니다 🎉";
    else if (topPercent <= 20)
      verdict = "상위권 운빨이네요. 꽤 잘 나온 편이에요 😎";
    else if (topPercent <= 50)
      verdict = "무난무난한 평범한 하루…! 다음 판에 기대해봐도 좋겠어요 🙂";
    else verdict = "오늘은 살짝 저점… 내일은 분명 복리로 돌아옵니다 🙏";

    return { percentile: topPercent, verdict };
  }, [mode, baseDistribution, myInternalScore]);

  const currentRaidConfig = ABYSS_RAID_PROBS[raidDifficulty];
  const currentDungeonConfig = ABYSS_DUNGEON_CONFIG[dungeonLevel];

  // 가공 모드용: 현재 상태로 DP 테이블 조회
  const procState = useMemo(() => {
    if (mode !== "process") return null;

    const pos = Math.max(0, Math.min(48, Number(procPos || 0)));
    const turns = Math.max(
      1,
      Math.min(procMode === "super_epic" ? 8 : 7, Number(procTurns || 1))
    );
    const b = Math.max(0, Math.min(3, Number(procB || 0)));
    const c = Math.max(0, Math.min(3, Number(procC || 0)));
    const key = `${pos}|${turns}|${b}|${c}|${procMode}`;
    const row = culculatedProbIndex.get(key) || null;

    if (!row) {
      return {
        pos,
        turns,
        b,
        c,
        mode: procMode,
        row: null,
        bestAction: null,
      };
    }

    let bestAction = null;
    let bestSuccess = -1;
    ["A", "B", "C"].forEach((act) => {
      const info = row[act];
      if (!info) return;
      if (info.success > bestSuccess) {
        bestSuccess = info.success;
        bestAction = act;
      }
    });

    return {
      pos,
      turns,
      b,
      c,
      mode: procMode,
      row,
      bestAction,
    };
  }, [mode, procMode, procPos, procTurns, procB, procC]);

  return (
    <div className="sugar-view luck-view">
      {/* 라이트/다크 토글 */}
      <div className="theme-toggle-right">
        <div className="theme-toggle">
          <button
            type="button"
            className={`theme-chip ${!darkMode ? "active" : ""}`}
            onClick={() => setDarkMode(false)}
          >
            라이트
          </button>
          <button
            type="button"
            className={`theme-chip ${darkMode ? "active" : ""}`}
            onClick={() => setDarkMode(true)}
          >
            다크
          </button>
        </div>
      </div>

      <h1 className="sugar-title">오늘의 운빨</h1>
      <p className="sugar-subtitle luck-subtitle">
        오늘 어비스 레이드 / 던전 / 시즈나이트 가공 결과를 기반으로
        <br />
        <strong>오늘 운빨이 어느 정도였는지</strong> 감각적으로 확인하는
        페이지입니다.
      </p>

      {/* 하위 탭 3개 */}
      <div className="view-tabs" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={mode === "raid" ? "active" : ""}
          onClick={() => setMode("raid")}
        >
          어비스 레이드 기준
        </button>
        <button
          type="button"
          className={mode === "dungeon" ? "active" : ""}
          onClick={() => setMode("dungeon")}
        >
          어비스 던전 기준
        </button>
        <button
          type="button"
          className={mode === "process" ? "active" : ""}
          onClick={() => setMode("process")}
        >
          시즈나이트 가공 기준
        </button>
      </div>

      <div className="sugar-layout">
        {/* 왼쪽 카드: 입력 영역 */}
        <div className="sugar-card">
          {mode === "raid" && currentRaidConfig && (
            <>
              <h2 className="sugar-section-title">어비스 레이드</h2>

              {/* 난이도 선택 */}
              <div className="luck-section">
                <div className="luck-label">난이도</div>
                <select
                  className="state-input"
                  value={raidDifficulty}
                  onChange={(e) => setRaidDifficulty(e.target.value)}
                >
                  {Object.entries(ABYSS_RAID_PROBS).map(
                    ([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <p className="small-note luck-note">
                  각 페이즈는 주 1회만 클리어 가능하며, 클리어 시 아래 보상 중
                  하나를 받습니다.
                </p>
              </div>

              {/* 페이즈별 보상 선택 */}
              <div className="luck-section">
                <div className="luck-label">페이즈별 실제로 받은 보상</div>
                <div className="raid-phase-grid">
                  {currentRaidConfig.phases.map((probs, phaseIdx) => {
                    const shards = currentRaidConfig.shards;
                    const selected = raidSelections[phaseIdx];

                    const rewardLabels = [
                      "최상급 시즈나이트",
                      "상급 시즈나이트",
                      `시즈 조각 ${shards[0]}개`,
                      `시즈 조각 ${shards[1]}개`,
                      `시즈 조각 ${shards[2]}개`,
                    ];

                    return (
                      <div className="raid-phase-card" key={phaseIdx}>
                        <div className="raid-phase-title">
                          {phaseIdx + 1}페이즈
                        </div>
                        <select
                          className="state-input"
                          value={selected}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRaidSelections((prev) => {
                              const next = [...prev];
                              next[phaseIdx] = val;
                              return next;
                            });
                          }}
                        >
                          <option value="">이번 주 미클리어 / 선택 안 함</option>
                          {rewardLabels.map((label, rIdx) => (
                            <option key={rIdx} value={rIdx}>
                              {label} (확률 {probs[rIdx].toFixed(2)}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {mode === "dungeon" && currentDungeonConfig && (
            <>
              <h2 className="sugar-section-title">어비스 던전</h2>
              <p className="small-note luck-note">
                오늘 주로 돌았던 던전 단계를 선택하고,
                <br />
                판 수와 실제로 나온 시즈나이트 / 유리조각 개수를 입력해 주세요.
              </p>

              {/* 레벨 선택 + 판 수 */}
              <div className="luck-section">
                <div className="luck-label">던전 단계</div>
                <select
                  className="state-input"
                  value={dungeonLevel}
                  onChange={(e) => setDungeonLevel(e.target.value)}
                >
                  {Object.entries(ABYSS_DUNGEON_CONFIG).map(
                    ([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="luck-section">
                <div className="luck-label">오늘 돈 판 수</div>
                <input
                  type="number"
                  min="0"
                  className="state-input"
                  value={dungeonRuns}
                  onChange={(e) => setDungeonRuns(e.target.value)}
                  placeholder="예: 10"
                />
                {dungeonRuns && (
                  <p className="small-note luck-note">
                    이론상 시즈나이트{" "}
                    {Number(dungeonRuns || 0) * currentDungeonConfig.knightsPerRun}
                    개, 유리조각{" "}
                    {Number(dungeonRuns || 0) * currentDungeonConfig.glassPerRun}
                    개가 떨어집니다.
                  </p>
                )}
              </div>

              {/* 보너스 스테이지 */}
              <div className="luck-section">
                <div className="luck-label">
                  보너스 스테이지 (멜랑크림 환영) 등장 횟수
                </div>
                <input
                  type="number"
                  min="0"
                  className="state-input"
                  value={bonusStageCount}
                  onChange={(e) => setBonusStageCount(e.target.value)}
                  placeholder="예: 0 또는 1"
                />
                {dungeonRuns && (
                  <p className="small-note luck-note">
                    이론상 보너스 스테이지 기대값은{" "}
                    {(Number(dungeonRuns || 0) * BONUS_STAGE_PROB).toFixed(2)}회
                    입니다. (판당 2% 확률 기준)
                  </p>
                )}
              </div>

              {/* 시즈나이트 개수 */}
              <div className="luck-section">
                <div className="luck-label">시즈나이트 드랍 개수</div>
                <div className="dungeon-count-grid">
                  {["top", "rare", "uncommon", "common"].map((tier) => {
                    const label =
                      tier === "top"
                        ? "상급"
                        : tier === "rare"
                        ? "레어"
                        : tier === "uncommon"
                        ? "언커먼"
                        : "커먼";
                    return (
                      <label key={tier}>
                        {label} 시즈나이트
                        <input
                          type="number"
                          min="0"
                          className="state-input"
                          value={dungeonKnightCounts[tier]}
                          onChange={(e) =>
                            setDungeonKnightCounts((prev) => ({
                              ...prev,
                              [tier]: e.target.value,
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 유리조각 개수 */}
              <div className="luck-section">
                <div className="luck-label">설탕 유리조각 드랍 개수</div>
                <div className="dungeon-count-grid">
                  {["rare", "epic", "super", "unique"].map((tier) => {
                    const label =
                      tier === "rare"
                        ? "레어"
                        : tier === "epic"
                        ? "에픽"
                        : tier === "super"
                        ? "슈퍼 에픽"
                        : "유니크";
                    return (
                      <label key={tier}>
                        {label} 유리조각
                        <input
                          type="number"
                          min="0"
                          className="state-input"
                          value={dungeonGlassCounts[tier]}
                          onChange={(e) =>
                            setDungeonGlassCounts((prev) => ({
                              ...prev,
                              [tier]: e.target.value,
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {mode === "process" && (
            <>
              <h2 className="sugar-section-title">시즈나이트 가공 상태</h2>
              <p className="small-note luck-note">
                Python DP로 미리 계산해 둔 <code>culculated_prob.json</code>을
                사용해서,
                <br />
                현재 상태 기준 A/B/C 선택 시{" "}
                <strong>최종 성공 확률 / 폭발 확률</strong>을 보여줍니다.
              </p>

              <div className="luck-section">
                <div className="luck-label">목표 모드</div>
                <select
                  className="state-input"
                  value={procMode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProcMode(next);
                    // unique 모드에서 턴이 8로 되어 있으면 7로 클램프
                    setProcTurns((prev) => {
                      const val = Number(prev || 1);
                      const maxTurns = next === "super_epic" ? 8 : 7;
                      return Math.min(maxTurns, Math.max(1, val));
                    });
                  }}
                >
                  <option value="super_epic">상급(슈퍼 에픽) 목표</option>
                  <option value="unique">최상급(유니크) 목표</option>
                </select>
              </div>

              <div className="luck-section">
                <div className="dungeon-count-grid">
                  <label>
                    현재 위치 (칸)
                    <input
                      type="number"
                      min="0"
                      max="48"
                      className="state-input"
                      value={procPos}
                      onChange={(e) => setProcPos(e.target.value)}
                    />
                  </label>
                  <label>
                    남은 턴 수
                    <input
                      type="number"
                      min="1"
                      max={procMode === "super_epic" ? 8 : 7}
                      className="state-input"
                      value={procTurns}
                      onChange={(e) => setProcTurns(e.target.value)}
                    />
                  </label>
                  <label>
                    세공 (B) 남은 횟수
                    <input
                      type="number"
                      min="0"
                      max="3"
                      className="state-input"
                      value={procB}
                      onChange={(e) => setProcB(e.target.value)}
                    />
                  </label>
                  <label>
                    안정제 (C) 남은 횟수
                    <input
                      type="number"
                      min="0"
                      max="3"
                      className="state-input"
                      value={procC}
                      onChange={(e) => setProcC(e.target.value)}
                    />
                  </label>
                </div>
                <p className="small-note luck-note">
                  DP 스크립트의 설정과 동일하게{" "}
                  <code>pos 0~48 / B,C 0~3 / super_epic: 턴 1~8 / unique: 턴 1~7</code>{" "}
                  범위만 유효합니다.
                </p>
              </div>
            </>
          )}
        </div>

        {/* 오른쪽 카드: 결과 영역 */}
        <div className="sugar-card">
          {mode === "process" ? (
            <>
              <h2 className="sugar-section-title">가공 확률 조회 결과</h2>
              {!procState || !procState.row ? (
                <p className="empty-text">
                  현재 입력 값에 해당하는 상태를 DP 테이블에서 찾지 못했습니다.
                  <br />
                  위치 / 남은 턴 / B / C 범위를 다시 확인해 주세요.
                </p>
              ) : (
                <>
                  <p className="small-note luck-note">
                    현재 상태: 위치 {procState.pos}칸, 남은 턴{" "}
                    {procState.turns}, 세공 {procState.b}회, 안정제{" "}
                    {procState.c}회, 모드 {procState.mode}
                  </p>

                  <div className="luck-section">
                    <div className="luck-label">선택지별 최종 확률</div>
                    <table
                      style={{
                        width: "100%",
                        fontSize: 13,
                        borderCollapse: "collapse",
                        marginTop: 8,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: 4 }}>
                            선택지
                          </th>
                          <th style={{ textAlign: "right", padding: 4 }}>
                            성공 확률
                          </th>
                          <th style={{ textAlign: "right", padding: 4 }}>
                            폭발(실패) 확률
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {["A", "B", "C"].map((act) => {
                          const info = procState.row[act];
                          const disabled =
                            !info ||
                            (act === "B" && procState.b === 0) ||
                            (act === "C" && procState.c === 0);
                          return (
                            <tr
                              key={act}
                              className={
                                procState.bestAction === act ? "best-row" : ""
                              }
                            >
                              <td style={{ padding: 4 }}>
                                {act}{" "}
                                {procState.bestAction === act && (
                                  <span className="luck-highlight">
                                    (추천)
                                  </span>
                                )}
                                {disabled && (
                                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                    - 사용 불가
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: 4,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {info
                                  ? `${(info.success * 100).toFixed(2)}%`
                                  : "-"}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: 4,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {info
                                  ? `${(info.failure * 100).toFixed(2)}%`
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="small-note luck-note" style={{ marginTop: 8 }}>
                      각 확률은 지금 상태에서 해당 선택지를 눌렀을 때, 이후
                      최적의 플레이를 했다고 가정했을 때의
                      <br />
                      최종 목표 도달(성공) / 목표 초과(폭발) 확률입니다.
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="sugar-section-title">오늘의 운빨 결과</h2>
              {mode === "raid" ? (
                <p className="small-note luck-note">
                  선택한 난이도에서 각 페이즈별 실제 보상을 기반으로, 동일
                  확률 구조에서 보상을 받는
                  <br />
                  가상의 많은 유저들 중에서 운빨 상위 %를 계산합니다.
                </p>
              ) : (
                <p className="small-note luck-note">
                  선택한 단계 / 판 수 / 보너스 스테이지 / 시즈나이트 /
                  유리조각 개수를 모두 반영해서,
                  <br />
                  내부 운빨 지표를 만들고 전 서버 기준 분포와 비교합니다.
                </p>
              )}

              {!percentileInfo.percentile ? (
                <p className="empty-text">
                  좌측에서 정보를 입력하면, 여기에서 오늘 운빨이 상위 몇 %인지
                  표시됩니다.
                </p>
              ) : (
                <div className="luck-result-card">
                  <div className="luck-result-main">
                    오늘 당신의 결과는{" "}
                    <span className="luck-highlight">
                      상위 {percentileInfo.percentile.toFixed(1)}%
                    </span>
                    에 해당하는 운빨입니다.
                  </div>
                  <div className="luck-result-sub">
                    {percentileInfo.verdict}
                  </div>
                  <p className="small-note luck-note" style={{ marginTop: 8 }}>
                    ※ 확률표를 기반으로, 같은 조건에서 무작위로 보상을 받는
                    &quot;가상의 많은 유저들&quot;을 가정하고 정규분포 근사로
                    계산한 값입니다. 실제 게임 서버 통계는 아닙니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LuckMeter;
