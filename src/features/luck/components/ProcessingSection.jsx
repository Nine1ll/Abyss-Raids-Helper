// src/features/luck/components/ProcessingSection.jsx
import React from "react";
import { useProcessingSim } from "../hooks/useProcessingSim";

const ProcessingSection = () => {
  const {
    mode,
    setMode,
    pos,
    setPos,
    turns,
    setTurns,
    bLeft,
    setBLeft,
    cLeft,
    setCLeft,
    trials,
    setTrials,
    strategy,
    setStrategy,
    result,
    running,
    runSim,
  } = useProcessingSim();

  const maxTurns = mode === "super_epic" ? 8 : 7;
  
  return (
    <div className="sugar-layout">
      {/* 좌측: 입력/전략/실행 */}
      <div className="sugar-card">
        <h2 className="sugar-section-title">시즈나이트 가공</h2>
        <p className="sugar-subtitle">
          아래 상태에서 시즈나이트를 굴렸을 때,
          <br />
          선택 전략에 따라 슈퍼 에픽 · 폭발 · 그 외 비율을
          근사합니다. (Feat. 큰수의 법칙)
        </p>

        {/* 전략 선택 토글 */}
        <div className="luck-section" style={{ marginBottom: 12 }}>
          <div className="luck-label">전략 선택</div>
          <div className="luck-activity-buttons">
            <button
              type="button"
              className={`luck-activity-btn ${
                strategy === "policy" ? "active" : ""
              }`}
              onClick={() => setStrategy("policy")}
            >
              최적 전략 기반
            </button>
            <button
              type="button"
              className={`luck-activity-btn ${
                strategy === "random" ? "active" : ""
              }`}
              onClick={() => setStrategy("random")}
            >
              무작위 선택 기반
            </button>
          </div>
        </div>

        {/* 상태 입력 */}
        <div className="piece-form-row">
          <label>
            목표 등급
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="super_epic">상급</option>
              <option value="unique">최상급</option>
            </select>
          </label>
          <label>
            현재 위치
            <input
              type="number"
              min="0"
              max="48"
              className="state-input"
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
            />
          </label>
          <label>
            남은 턴 수 (최대 {maxTurns})
            <input
              type="number"
              min="1"
              max={maxTurns}
              className="state-input"
              value={turns}
              onChange={(e) => setTurns(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="piece-form-row" style={{ marginTop: 12 }}>
          <label>
            남은 세공 사용 가능 횟수 (B)
            <input
              type="number"
              min="0"
              max="3"
              className="state-input"
              value={bLeft}
              onChange={(e) => setBLeft(Number(e.target.value))}
            />
          </label>
          <label>
            남은 안정제 사용 가능 횟수 (C)
            <input
              type="number"
              min="0"
              max="3"
              className="state-input"
              value={cLeft}
              onChange={(e) => setCLeft(Number(e.target.value))}
            />
          </label>
          <label>
            시뮬레이션 횟수
            <input
              type="number"
              min="1000"
              className="state-input"
              value={trials}
              onChange={(e) => setTrials(Number(e.target.value))}
            />
          </label>
        </div>
        {/* 실행 버튼 */}
        <div className="sugar-actions">
          <button
            type="button"
            className="primary"
            disabled={running}
            onClick={runSim}
          >
            {running
              ? "시뮬레이션 실행 중..."
              : "Monte Carlo 시뮬레이션 돌리기"}
          </button>
        </div>
      </div>

      {/* 우측: 결과 카드 */}
<div className="sugar-card">
  <h3 className="sugar-section-title">가공 시뮬 결과</h3>
  {!result ? (
    <p className="empty-text">
      왼쪽에서 상태와 전략을 설정하고 시뮬레이션을 실행하면,
      여기에서 결과가 표시됩니다.
    </p>
  ) : (
    <div className="luck-result-card">
      {/* ✅ 어떤 전략으로 이 결과가 나온 건지 뱃지로 보여주기 */}
      <div className="luck-result-strategy-row">
        <span className="luck-result-strategy-label">전략: </span>
        <span
          className={
            result.strategy === "policy"
              ? "luck-result-strategy-badge policy"
              : "luck-result-strategy-badge random"
          }
        >
          {result.strategy === "policy"
            ? "최적 전략 기반 "
            : "무작위 선택 기반 "}
        </span>
        <span className="luck-result-trials">
          (총 시뮬레이션 {result.trials.toLocaleString()}회)
        </span>
      </div>

      <div className="luck-result-main">
        <div>
          슈퍼에픽:{" "}
          <span className="luck-highlight">
            {(result.success * 100).toFixed(2)}%
          </span>
        </div>
        <div>
          폭발:{" "}
          <span className="luck-highlight">
            {(result.explode * 100).toFixed(2)}%
          </span>
        </div>
        <div>
          그 외:{" "}
          <span className="luck-highlight">
            {(result.middle * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <p className="small-note luck-note" style={{ marginTop: 8 }}>
        ※ 실제 게임에서의 체감 운빨을 근사하기 위한 실험 결과입니다.
        DP 이론값과 약간의 차이는 있을 수 있지만,
        시뮬레이션 횟수가 충분히 크면 큰 수의 법칙에 따라 수렴합니다.
      </p>
    </div>
  )}
</div>
    </div>
  );
};

export default ProcessingSection;
