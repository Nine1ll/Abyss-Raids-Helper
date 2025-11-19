// src/components/BestActionBar.jsx
import React from 'react';

// 화면용 표시 (번호 + 범위)
const ACTION_DISPLAY = {
  A: '1번: +3~+6',
  B: '2번: -2~+3',
  C: '3번: 0~+4',
};

const BestActionBar = ({ bestActions, isGameOver }) => {
  if (!bestActions.length || isGameOver) return null;

  const top = bestActions[0];           // 최고 확률 액션
  const others = bestActions.slice(1);  // 나머지(있으면)

  const percent = (top.prob * 100).toFixed(2);

  return (
    <div className="best-wrapper">
      {/* 메인 카드 */}
      <div className="best-card">
        <div className="best-card-header">
          <span className="best-card-title">
            {ACTION_DISPLAY[top.action] ?? top.action}
          </span>
          <span className="best-card-badge">최고 확률</span>
        </div>
        <div className="best-card-body">
          <span className="best-card-percent">{percent}%</span>
        </div>
      </div>

      {/* 보조 안내: 다른 액션들 */}
      {others.length > 0 && (
        <div className="best-others">
          <span>다른 선택지:</span>
          {others.map((a, i) => (
            <span key={i} className="best-other-item">
              {ACTION_DISPLAY[a.action] ?? a.action}{' '}
              ({(a.prob * 100).toFixed(2)}%)
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BestActionBar;
