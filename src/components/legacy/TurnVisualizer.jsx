// src/components/TurnVisualizer.jsx
import React from 'react';

const TurnVisualizer = ({ turnsLeft, pos, mode }) => {
  const boxes = [];
  for (let i = 0; i < 8; i++) {
    const turnNum = i + 1;
    let className = "turn-box";
    if (turnNum > 8 - turnsLeft) {
      className += " used";
    } else if (turnNum === 8 - turnsLeft + 1) {
      className += " current";
    }

    // 현재 위치가 이 턴 이후 도달 가능한지? → 그냥 턴 시각화는 위치와 무관하므로,
    // 위치는 별도로 표시 (위 입력 칸에서 처리)
    boxes.push(<div key={turnNum} className={className}>{turnNum}</div>);
  }
  return <div className="turn-container">{boxes}</div>;
};

export default TurnVisualizer;