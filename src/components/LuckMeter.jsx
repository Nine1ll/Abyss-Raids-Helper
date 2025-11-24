import React, { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";

const clampPercent = (value) => Math.min(99, Math.max(1, Math.round(value)));

const estimatePercentile = ({ games, superEpics, siegeNights }) => {
  const plays = Math.max(0, Number.isFinite(games) ? games : 0);
  const superEpicHits = Math.max(0, Number.isFinite(superEpics) ? superEpics : 0);
  const siegeHits = Math.max(0, Number.isFinite(siegeNights) ? siegeNights : 0);

  if (plays <= 0) {
    return { percentile: null, score: 0 };
  }

  const baselineSuperEpicRate = 0.05;
  const baselineSiegeRate = 0.02;
  const weightedFinds = superEpicHits * 80 + siegeHits * 120;
  const expectedPerGame = baselineSuperEpicRate * 80 + baselineSiegeRate * 120;
  const observedPerGame = weightedFinds / plays;
  const delta = observedPerGame - expectedPerGame;
  const percentile = clampPercent(50 + delta * 400 + (superEpicHits + siegeHits > 0 ? 5 : 0));
  const score = Math.max(0, Math.round(observedPerGame * 10));

  return { percentile, score };
};

const LuckMeter = ({ onNavigate }) => {
  const { darkMode } = useContext(ThemeContext);
  const [gamesPlayed, setGamesPlayed] = useState(10);
  const [superEpicCount, setSuperEpicCount] = useState(0);
  const [siegeCount, setSiegeCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => estimatePercentile({ games: gamesPlayed, superEpics: superEpicCount, siegeNights: siegeCount }),
    [gamesPlayed, superEpicCount, siegeCount]
  );

  const handleInput = (setter) => (event) => {
    const value = Number(event.target.value);
    setter(Number.isFinite(value) ? value : 0);
  };

  const feedback = useMemo(() => {
    if (!submitted) return "오늘 플레이 데이터를 입력해 보세요.";
    if (result.percentile === null) return "플레이 횟수를 입력하면 운세를 볼 수 있어요.";
    if (result.percentile >= 80) return "축하합니다! 오늘 운이 상위권이네요.";
    if (result.percentile >= 50) return "무난한 하루였어요. 내일은 더 큰 행운을!";
    return "아쉬운 하루였지만, 다음 판에 역전할 수 있어요.";
  }, [result.percentile, submitted]);

  return (
    <div className={`luck-view ${darkMode ? "dark" : ""}`}>
      <div className="luck-header">
        <h1>🍀 오늘의 운세 측정기</h1>
        <p>오늘 플레이 기록을 입력하면 상위 몇 %인지 바로 알려드려요.</p>
      </div>

      <div className="luck-grid">
        <section className="luck-card">
          <h2>1. 오늘의 기록 입력</h2>
          <div className="luck-form">
            <label>
              오늘 플레이한 판수
              <input type="number" min="0" value={gamesPlayed} onChange={handleInput(setGamesPlayed)} />
            </label>
            <label>
              획득한 슈퍼에픽 설탕 유리조각 수
              <input type="number" min="0" value={superEpicCount} onChange={handleInput(setSuperEpicCount)} />
            </label>
            <label>
              획득한 시즈나이트 수
              <input type="number" min="0" value={siegeCount} onChange={handleInput(setSiegeCount)} />
            </label>
          </div>
          <button type="button" className="primary" onClick={() => setSubmitted(true)}>
            운세 계산하기
          </button>
        </section>

        <section className="luck-card">
          <h2>2. 결과 보기</h2>
          <div className="luck-result">
            <div className="luck-percentile">
              {result.percentile ? `상위 ${result.percentile}%` : "데이터를 입력하세요"}
            </div>
            <div className="luck-score">행운 지수: {result.score}</div>
            <p className="luck-feedback">{feedback}</p>
          </div>
          <div className="luck-actions">
            <button type="button" className="ghost" onClick={() => setSubmitted(false)}>
              값 초기화
            </button>
            <div className="luck-navigate">
              <span>다른 도구로 이동</span>
              <div className="luck-nav-buttons">
                <button type="button" className="ghost" onClick={() => onNavigate?.("siege")}>시즈나이트 추천</button>
                <button type="button" className="ghost" onClick={() => onNavigate?.("sugar")}>설탕 유리 배치</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LuckMeter;
