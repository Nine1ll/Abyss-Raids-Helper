import React from "react";
import { useRaidLuck } from "../hooks/useRaidLuck";
import {
  ABYSS_RAID_CONFIG,
  RAID_REWARD_LABELS,
  RAID_REWARD_COUNTS,
} from "../../../data/abyssRaidConfig";

const difficultyOptions = [
  { value: "normal", label: "노말" },
  { value: "hard", label: "하드" },
  { value: "hell", label: "헬" },
  { value: "challenge", label: "챌린지" },
];

const RaidSection = () => {
  const {
    difficulty,
    setDifficulty,
    config,
    phaseSelections,
    setPhaseSelection,
    percentile,
    verdict,
  } = useRaidLuck();

  // ✅ 현재 난이도에 해당하는 개수 정보
  const countsForDifficulty = RAID_REWARD_COUNTS[difficulty];

  return (
    <div className="sugar-layout">
      <div className="sugar-card">
        <h2 className="sugar-section-title">어비스 레이드</h2>
        <p className="sugar-subtitle">
          난이도와 각 페이즈에서 실제로 받은 보상을 선택하면,
          통계적으로 이번 주 레이드 운빨이 상위 몇 %인지 보여줍니다.
        </p>

        <div className="board-settings" style={{ marginBottom: 16 }}>
          <label>
            난이도
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {difficultyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {config && (
          <>
            <div className="board-hint" style={{ marginBottom: 8 }}>
              실제로 받은 보상을 선택해 주세요.
            </div>

            {config.phases.map((phase, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div style={{ width: 70, fontWeight: 600 }}>
                  {idx + 1}페이즈
                </div>
                <select
                    className="state-input"
                    style={{ height: 36, fontSize: 14 }}
                    value={
                      phaseSelections[idx] === null
                        ? ""
                        : String(phaseSelections[idx])
                    }
                    onChange={(e) =>
                      setPhaseSelection(
                        idx,
                        e.target.value === "" ? null : e.target.value
                      )
                    }
                  >
                    <option value="">선택 안 함</option>

                    {phase.map((prob, i) => {
                      // 🔥 확률 0%거나 정의 안 된 애들은 드롭다운에서 숨기기
                      if (!prob || prob <= 0) return null;

                      const baseLabel = RAID_REWARD_LABELS[i];
                      const count = countsForDifficulty?.[i];

                      // ✅ 표시용 라벨 생성
                      let label = baseLabel;
                      if (i >= 2 && typeof count === "number") {
                        // 조각 구간은 개수 같이 붙여주기
                        label = `${baseLabel} (${count}개)`;
                      }

                      return (
                        <option key={i} value={i}>
                          {label} (확률 {prob}%)
                        </option>
                      );
                    })}
                  </select>

              </div>
            ))}
          </>
        )}
      </div>

      <div className="sugar-card">
        <h3 className="sugar-section-title">이번 주 어비스 레이드 운빨 결과</h3>
        {percentile == null ? ( // ← 0%도 표시되게 null 체크로 바꾸는게 좋음
          <p className="empty-text">
            난이도와 각 페이즈의 보상을 선택하면, 여기에서 결과가 표시됩니다.
          </p>
        ) : (
          <div className="luck-result-card">
            <div className="luck-result-main">
              <div style={{ marginBottom: 12 }}>
                <span>레이드 기준 상위 비율:</span>{" "}
                <span className="luck-highlight">
                  상위 {percentile.toFixed(2)}%
                </span>
              </div>
              <div>{verdict}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RaidSection;
