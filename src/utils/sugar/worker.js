// worker.js
/* eslint-disable no-restricted-globals */ // 👈 이 줄을 추가하여 ESLint 규칙을 무시

import { solveSugarBoard } from "./solver";

self.onmessage = function (event) {
  const { rows, cols, blocked, pieces, role } = event.data;

  const result = solveSugarBoard({
    rows,
    cols,
    blocked,
    pieces,
    role,
  });

  self.postMessage({ result });
};