import React from "react";
import { useDungeonLuck } from "../hooks/useDungeonLuck";
import { ABYSS_DUNGEON_CONFIG } from "../../../data/abyssDungeonConfig";

const levelOptions = [
  { value: "1", label: "1단계" },
  { value: "2", label: "2단계" },
  { value: "3", label: "3단계" },
  { value: "4", label: "4단계" },
  { value: "5", label: "5단계" },
];

const DungeonSection = () => {
  const {
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
    percentile,
    verdict,
  } = useDungeonLuck();

  const numericRuns = Number(runs) || 0;
  const numericBonus = Number(bonusCount) || 0;

  // 이론상 최대 드랍 개수 (설명용 + 입력 상한)
  const knightsMax = config
    ? config.knightsPerRun * numericRuns + numericBonus
    : null;
  const glassMax = config ? config.glassPerRun * numericRuns : null;

  /** 시즈나이트 입력 변경 핸들러 (합이 knightsMax 넘지 않도록 캡) */
  const handleKnightChange = (tier, raw) => {
    const v = Math.max(0, Number(raw) || 0);

    setKnights((prev) => {
      if (!knightsMax || knightsMax <= 0) {
        // 상한 정보 없으면 그냥 저장
        return { ...prev, [tier]: v };
      }

      const othersSum = Object.entries(prev)
        .filter(([k]) => k !== tier)
        .reduce((acc, [, val]) => acc + (Number(val) || 0), 0);

      const allowed = Math.max(0, knightsMax - othersSum);
      const capped = Math.min(v, allowed);

      return { ...prev, [tier]: capped };
    });
  };

  /** 설탕 유리조각 입력 변경 핸들러 (합이 glassMax 넘지 않도록 캡) */
  const handleGlassChange = (tier, raw) => {
    const v = Math.max(0, Number(raw) || 0);

    setGlass((prev) => {
      if (!glassMax || glassMax <= 0) {
        return { ...prev, [tier]: v };
      }

      const othersSum = Object.entries(prev)
        .filter(([k]) => k !== tier)
        .reduce((acc, [, val]) => acc + (Number(val) || 0), 0);

      const allowed = Math.max(0, glassMax - othersSum);
      const capped = Math.min(v, allowed);

      return { ...prev, [tier]: capped };
    });
  };

  return (
    <div className="sugar-layout">
      <div className="sugar-card">
        <h2 className="sugar-section-title">어비스 던전 기준</h2>
        <p className="sugar-subtitle">
          클리어한 단계와 판 수, 실제로 얻은 시즈나이트·설탕 유리조각 개수를 입력하면
          오늘 던전 운빨을 계산합니다.
        </p>

        <div className="board-settings" style={{ marginBottom: 16 }}>
          <label>
            던전 단계
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            클리어 판 수
            <input
              type="number"
              min="0"
              className="state-input"
              value={runs}
              onChange={(e) => setRuns(e.target.value)}
            />
          </label>
        </div>

        {config && (
          <p className="small-note luck-note" style={{ marginBottom: 12 }}>
            이론 분포는 {config.name}에서 시즈나이트 {config.knightsPerRun}개,
            설탕 유리조각 {config.glassPerRun}개 드랍 기준으로 계산합니다. <br />
            보너스 스테이지는 2% 확률로 상급 1개 추가라고 가정하며, <br />
            위 입력 칸의 최대치는{" "}
            <strong>
              시즈나이트 {knightsMax ?? 0}개, 설탕 유리조각 {glassMax ?? 0}개
            </strong>
            로 제한됩니다.
          </p>
        )}

        {/* 시즈나이트 */}
        <h4 style={{ marginTop: 8, marginBottom: 6 }}>시즈나이트 획득 개수</h4>
        <div className="luck-input-row">
          <div className="luck-input-card">
            <span className="luck-input-card-label">상급</span>
            <input
              type="number"
              min="0"
              value={knights.top}
              onChange={(e) => handleKnightChange("top", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">레어</span>
            <input
              type="number"
              min="0"
              value={knights.rare}
              onChange={(e) => handleKnightChange("rare", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">언커먼</span>
            <input
              type="number"
              min="0"
              value={knights.uncommon}
              onChange={(e) => handleKnightChange("uncommon", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">커먼</span>
            <input
              type="number"
              min="0"
              value={knights.common}
              onChange={(e) => handleKnightChange("common", e.target.value)}
            />
          </div>
        </div>

        {/* 설탕 유리조각 */}
        <h4 style={{ marginTop: 16, marginBottom: 6 }}>설탕 유리조각 획득 개수</h4>
        <div className="luck-input-row">
          <div className="luck-input-card">
            <span className="luck-input-card-label">레어</span>
            <input
              type="number"
              min="0"
              value={glass.rare}
              onChange={(e) => handleGlassChange("rare", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">에픽</span>
            <input
              type="number"
              min="0"
              value={glass.epic}
              onChange={(e) => handleGlassChange("epic", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">슈퍼에픽</span>
            <input
              type="number"
              min="0"
              value={glass.super_epic}
              onChange={(e) => handleGlassChange("super_epic", e.target.value)}
            />
          </div>
          <div className="luck-input-card">
            <span className="luck-input-card-label">유니크</span>
            <input
              type="number"
              min="0"
              value={glass.unique}
              onChange={(e) => handleGlassChange("unique", e.target.value)}
            />
          </div>
        </div>

        {/* 보너스 스테이지 */}
        <h4 style={{ marginTop: 16, marginBottom: 6 }}>보너스 스테이지 클리어 횟수</h4>
        <label>
          (2% 확률로 멜랑크림 환영 등장 가정)
          <input
            type="number"
            min="0"
            className="state-input"
            value={bonusCount}
            onChange={(e) => setBonusCount(e.target.value)}
          />
        </label>
      </div>

      {/* 결과 카드 */}
      <div className="sugar-card">
        <h3 className="sugar-section-title">오늘 던전 운빨 결과</h3>
        {!percentile ? (
          <p className="empty-text">
            단계·판 수·보상 개수를 입력하면, 여기에서 결과가 표시됩니다.
          </p>
        ) : (
          <div className="luck-result-card">
            <div className="luck-result-main">
              <div style={{ marginBottom: 12 }}>
                <span>던전 기준 상위 비율:</span>{" "}
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

export default DungeonSection;
