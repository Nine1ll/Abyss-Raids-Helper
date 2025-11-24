// src/features/luck/components/KnightForgingSummary.jsx
import React from "react";

const formatPercent = (x) => (x * 100).toFixed(2) + "%";

function KnightForgingSummary({ result }) {
  if (!result) return null;

  const { trials, optimal, random } = result;

  return (
    <section className="luck-card">
      <h2>시즈나이트 가공 – 최적 전략 vs 무작위</h2>
      <p className="luck-caption">
        {trials.toLocaleString("ko-KR")}회 시뮬레이션 기준 결과입니다.
      </p>

      <table className="luck-table">
        <thead>
          <tr>
            <th>전략</th>
            <th>성공 횟수</th>
            <th>성공 확률</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>최적 전략 (DP)</td>
            <td>{optimal.successCount.toLocaleString("ko-KR")}</td>
            <td>{formatPercent(optimal.successRate)}</td>
          </tr>
          <tr>
            <td>완전 무작위</td>
            <td>{random.successCount.toLocaleString("ko-KR")}</td>
            <td>{formatPercent(random.successRate)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export default KnightForgingSummary;
