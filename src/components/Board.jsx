// src/components/Board.jsx
import React from 'react';

const Board = ({ mode, pos, maxPosition, onCellClick }) => {
  const boxes = [];

  for (let p = 0; p <= maxPosition; p++) {
    let className = 'pos-box clickable';
    let reward = '';

    if (p === pos) className += ' current-pos';

    if (p === 0) {
      className += ' start-pos';
      reward = '시작';
    } else if (mode === 'super_epic') {
      if (p === 15) {
        className += ' goal';
        reward = '슈퍼에픽';
      } else if (p > 15) {
        className += ' fail';
        reward = '터짐';
      } else if (p >= 10 && p <= 12) {
        className += ' epic';
        reward = '에픽';
      } else {
        className += ' rare';
        reward = '레어';
      }
    } else {
      // unique
      if (p === 14 || p === 16) {
        className += ' goal';
        reward = '유니크';
      } else if (p > 16) {
        className += ' fail';
        reward = '터짐';
      } else {
        className += ' epic';
        reward = '에픽';
      }
    }

    boxes.push(
      <div
        key={p}
        className={className}
        title={reward}
        onClick={() => onCellClick(p)}
      >
        {p}
      </div>
    );
  }

  return <div className="position-visualizer">{boxes}</div>;
};

export default Board;
