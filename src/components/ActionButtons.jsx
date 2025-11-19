// src/components/ActionButtons.jsx
import React from "react";
import { ACTION_LABEL } from "../constants/actionLabels";

export default function ActionButtons({
  recommendations,
  bestActions,
  bUsed,
  cUsed,
  turnsLeft,
  isGameOver,
  pendingAction,
  onChooseAction,
}) {
  return (
    <div className="action-buttons">
      {["A", "B", "C"].map((action) => {
        const disabled =
          isGameOver ||
          (action === "B" && bUsed >= 3) ||
          (action === "C" && cUsed >= 3) ||
          turnsLeft <= 0;

        const best =
          bestActions.length > 0 && bestActions[0].action === action;

        const isSelected = pendingAction === action;

        const handleClick = () => {
          if (disabled) return;
          if (typeof onChooseAction === "function") {
            onChooseAction(action);
          }
        };

        return (
          <button
            key={action}
            className={
              "action-btn" +
              (best ? " best-highlight" : "") +
              (isSelected ? " selected-action" : "") +
              (disabled ? " disabled" : "")
            }
            disabled={disabled}
            onClick={handleClick}
          >
            <div className="action-label">{ACTION_LABEL[action]}</div>
            <div className="prob">
              {(recommendations[action]?.success * 100).toFixed(2)}%
            </div>
          </button>
        );
      })}
    </div>
  );
}
