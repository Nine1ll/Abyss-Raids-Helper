// src/components/SiegeProcessingSimulator.jsx
import React, { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";

// 실제 게임 확률에 맞게 수정해서 사용 가능
const SIEGE_PROCESSING_PROBS = {
  rare: 0.7,   // 70%
  epic: 0.2,   // 20%
  super: 0.08, // 8%
  unique: 0.02 // 2%
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const SiegeProcessingSimulator = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [count, setCount] = useState("");

  const n = Number(count || 0);

  const expected = useMemo(() => {
    if (!n) return null;
    return {
      rare: n * (SIEGE_PROCESSING_PROBS.rare || 0),
      epic: n * (SIEGE_PROCESSING_PROBS.epic || 0),
      super: n * (SIEGE_PROCESSING_PROBS.super || 0),
      unique: n * (SIEGE_PROCESSING_PROBS.unique || 0),
    };
  }, [n]);

  const probAtLeast = useMemo(() => {
    if (!n) return null;
    const pU = SIEGE_PROCESSING_PROBS.unique || 0;
    const pS = SIEGE_PROCESSING_PROBS.super || 0;
    const pE = SIEGE_PROCESSING_PROBS.epic || 0;

    const atLeastOne = (p) =>
      n <= 0 ? 0 : clamp(1 - Math.pow(1 - p, n), 0, 1);

    return {
      unique: atLeastOne(pU),
      superOrHigher: atLeastOne(pU + pS),
      epicOrHigher: atLeastOne(pU + pS + pE),
    };
  }, [n]);

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

      <h1 className="sugar-title">시즈나이트 가공 시뮬레이터</h1>
      <p className="sugar-subtitle luck-subtitle">
        가공 횟수를 입력하면, 설정된 확률에 따라{" "}
        <strong>기대 개수와 &quot;한 번 이상&quot; 뜰 확률</strong>을 계산해줍니다.
        <br />
        실제 게임 확률을 알고 있다면 코드 상단의{" "}
        <code>SIEGE_PROCESSING_PROBS</code>를 수정해서 사용할 수 있습니다.
      </p>

      <div className="sugar-layout">
        <div className="sugar-card">
          <h2 className="sugar-section-title">가공 설정</h2>

          <div className="luck-section">
            <div className="luck-label">가공 횟수</div>
            <input
              type="number"
              min="0"
              className="state-input"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="예: 100"
            />
          </div>

          <div className="luck-section">
            <div className="luck-label">현재 확률 설정</div>
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
                  <th style={{ textAlign: "left", padding: 4 }}>등급</th>
                  <th style={{ textAlign: "right", padding: 4 }}>
                    확률 (1회 기준)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 4 }}>레어</td>
                  <td style={{ textAlign: "right", padding: 4 }}>
                    {(SIEGE_PROCESSING_PROBS.rare * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 4 }}>에픽</td>
                  <td style={{ textAlign: "right", padding: 4 }}>
                    {(SIEGE_PROCESSING_PROBS.epic * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 4 }}>슈퍼 에픽</td>
                  <td style={{ textAlign: "right", padding: 4 }}>
                    {(SIEGE_PROCESSING_PROBS.super * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 4 }}>유니크</td>
                  <td style={{ textAlign: "right", padding: 4 }}>
                    {(SIEGE_PROCESSING_PROBS.unique * 100).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="sugar-card">
          <h2 className="sugar-section-title">예상 결과</h2>

          {!n || !expected ? (
            <p className="empty-text">
              가공 횟수를 입력하면, 예상 개수와 한 번 이상 뜰 확률이 표시됩니다.
            </p>
          ) : (
            <>
              <div className="luck-section">
                <div className="luck-label">기대 개수 (평균)</div>
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
                      <th style={{ textAlign: "left", padding: 4 }}>등급</th>
                      <th style={{ textAlign: "right", padding: 4 }}>
                        기대 개수
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: 4 }}>레어</td>
                      <td style={{ textAlign: "right", padding: 4 }}>
                        {expected.rare.toFixed(1)}개
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 4 }}>에픽</td>
                      <td style={{ textAlign: "right", padding: 4 }}>
                        {expected.epic.toFixed(1)}개
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 4 }}>슈퍼 에픽</td>
                      <td style={{ textAlign: "right", padding: 4 }}>
                        {expected.super.toFixed(1)}개
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 4 }}>유니크</td>
                      <td style={{ textAlign: "right", padding: 4 }}>
                        {expected.unique.toFixed(1)}개
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="luck-section" style={{ marginTop: 16 }}>
                <div className="luck-label">한 번 이상 뜰 확률</div>
                <ul className="bonus-list">
                  <li>
                    유니크 1개 이상 뜰 확률:{" "}
                    <strong>
                      {(probAtLeast.unique * 100).toFixed(2)}%
                    </strong>
                  </li>
                  <li>
                    슈퍼 에픽 이상 1개 이상 뜰 확률:{" "}
                    <strong>
                      {(probAtLeast.superOrHigher * 100).toFixed(2)}%
                    </strong>
                  </li>
                  <li>
                    에픽 이상 1개 이상 뜰 확률:{" "}
                    <strong>
                      {(probAtLeast.epicOrHigher * 100).toFixed(2)}%
                    </strong>
                  </li>
                </ul>
                <p className="small-note luck-note">
                  ※ 단순 독립 시행(복원 추출) 가정으로 계산한 값입니다. 실제
                  게임 내부 로직과는 차이가 있을 수 있습니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiegeProcessingSimulator;
