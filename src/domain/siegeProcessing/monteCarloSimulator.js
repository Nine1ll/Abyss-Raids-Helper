import { getPolicyRow, pickBestAction } from "./policyTable";

const ACTION_A = [3, 4, 5, 6];
const ACTION_B = [-3, -2, -1, 0, 1, 2];
const ACTION_C = [0, 1, 2, 3, 4];

function isSuccess(pos, mode) {
  if (mode === "super_epic") return pos === 15;
  if (mode === "unique") return pos === 14 || pos === 16;
  return false;
}

function isFailure(pos, mode) {
  if (mode === "super_epic") return pos > 15;
  if (mode === "unique") return pos > 16;
  return false;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function simulateOneRun(mode, startPos, startTurns, startB, startC) {
  let pos = startPos;
  let turns = startTurns;
  let bLeft = startB;
  let cLeft = startC;

  while (turns > 0) {
    const row = getPolicyRow(pos, turns, bLeft, cLeft, mode);
    let action = row ? pickBestAction(row, bLeft, cLeft) : null;
    if (!action) action = "A";

    let step = 0;
    if (action === "A") {
      step = sample(ACTION_A);
    } else if (action === "B") {
      step = sample(ACTION_B);
      bLeft = Math.max(0, bLeft - 1);
    } else if (action === "C") {
      step = sample(ACTION_C);
      cLeft = Math.max(0, cLeft - 1);
    }

    pos = Math.max(0, pos + step);
    turns -= 1;

    if (isFailure(pos, mode)) return "explode";
  }

  if (isSuccess(pos, mode)) return "success";
  if (isFailure(pos, mode)) return "explode";
  return "middle";
}

export function runMonteCarlo(
  mode,
  startPos,
  startTurns,
  startB,
  startC,
  trials
) {
  let success = 0;
  let explode = 0;
  let middle = 0;

  for (let i = 0; i < trials; i++) {
    const r = simulateOneRun(mode, startPos, startTurns, startB, startC);
    if (r === "success") success++;
    else if (r === "explode") explode++;
    else middle++;
  }

  return {
    success: success / trials,
    explode: explode / trials,
    middle: middle / trials,
  };
}
