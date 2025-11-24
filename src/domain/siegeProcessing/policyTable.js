// DP로 뽑아둔 culculated_prob.json을 메모리에 올리고,
// (pos, turns_left, b_left, c_left, mode) → row 인덱스 제공

import rawTable from "../../data/culculated_prob.json";

const index = new Map();

rawTable.forEach((row) => {
  const key = `${row.pos}|${row.turns_left}|${row.b_left}|${row.c_left}|${row.mode}`;
  index.set(key, row);
});

export function getPolicyRow(pos, turns, bLeft, cLeft, mode) {
  const key = `${pos}|${turns}|${bLeft}|${cLeft}|${mode}`;
  return index.get(key) || null;
}

export function pickBestAction(row, bLeft, cLeft) {
  if (!row) return null;

  const candidates = [];

  if (row.A) candidates.push({ act: "A", s: row.A.success });
  if (bLeft > 0 && row.B) candidates.push({ act: "B", s: row.B.success });
  if (cLeft > 0 && row.C) candidates.push({ act: "C", s: row.C.success });

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.s - a.s);
  return candidates[0].act;
}
