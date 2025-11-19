// src/components/StatePanel.jsx
import React from 'react';

const StatePanel = ({ pos, turnsLeft, bUsed, cUsed }) => {
  return (
    <div className="state-panel">
      <div className="state-item">
        <div className="state-label">📍 현재 위치</div>
        <div className="state-counter">{pos}</div>
      </div>
      <div className="state-item">
        <div className="state-label">⏳ 남은 턴</div>
        <div className="state-counter">{turnsLeft} / 8</div>
      </div>
      <div className="state-item">
        <div className="state-label">세공하기 남은 횟수</div>
        <div className="state-counter b">{3 - bUsed} / 3</div>
      </div>
      <div className="state-item">
        <div className="state-label">안정제 사용 남은 횟수</div>
        <div className="state-counter c">{3 - cUsed} / 3</div>
      </div>
    </div>
  );
};

export default StatePanel;
