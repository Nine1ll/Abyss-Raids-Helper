// src/features/luck/hooks/useProcessingSim.js
import { useState, useMemo, useCallback } from "react";
import policyTableRaw from "../../../data/culculated_prob.json";

// --- 상수 정의 (Python DP 코드와 동일한 규칙) ---
const MODES = {
  SUPER_EPIC: "super_epic",
  UNIQUE: "unique",
};

// 실제 주사위 분포
const ACTION_A = [3, 4, 5, 6]; // +3 ~ +6
const ACTION_B = [-3, -2, -1, 0, 1, 2]; // -3 ~ +2
const ACTION_C = [0, 1, 2, 3, 4]; // 0 ~ +4

const isSuccess = (pos, mode) => {
  if (mode === MODES.SUPER_EPIC) return pos === 15; // 상급: 정확히 15
  if (mode === MODES.UNIQUE) return pos === 14 || pos === 16; // 최상급: 14 or 16
  return false;
};

const isFailure = (pos, mode) => {
  if (mode === MODES.SUPER_EPIC) return pos > 15;
  if (mode === MODES.UNIQUE) return pos > 16;
  return false;
};

const clampPos = (pos) => {
  if (!Number.isFinite(pos)) return 0;
  return Math.max(0, pos);
};

// --- DP 테이블 key 생성 & Map 변환 ---
const makeKey = (mode, pos, turns, b, c) =>
  `${mode}:${clampPos(pos)}:${turns}:${b}:${c}`;

const POLICY_TABLE = (() => {
  const map = new Map();
  if (Array.isArray(policyTableRaw)) {
    policyTableRaw.forEach((row) => {
      const key = makeKey(row.mode, row.pos, row.turns_left, row.b_left, row.c_left);
      map.set(key, row);
    });
  } else {
    // JSON 구조가 이상할 경우를 위한 방어코드
    console.warn("culculated_prob.json: 예상한 배열 형태가 아닙니다.");
  }
  return map;
})();

// DP 기준으로 "최적 액션" 고르기
const chooseBestActionFromPolicy = (row, bLeft, cLeft) => {
  if (!row) return "A";

  const candidates = [];

  // A는 항상 가능
  if (row.A) {
    candidates.push({
      key: "A",
      success: row.A.success ?? 0,
      failure: row.A.failure ?? 0,
    });
  }

  if (bLeft > 0 && row.B) {
    candidates.push({
      key: "B",
      success: row.B.success ?? 0,
      failure: row.B.failure ?? 0,
    });
  }

  if (cLeft > 0 && row.C) {
    candidates.push({
      key: "C",
      success: row.C.success ?? 0,
      failure: row.C.failure ?? 0,
    });
  }

  if (candidates.length === 0) return "A";

  // 성공률 최대, 동률이면 폭발(실패) 최소
  candidates.sort((a, b) => {
    if (b.success !== a.success) return b.success - a.success;
    return a.failure - b.failure;
  });

  return candidates[0].key;
};

// 완전 랜덤 전략
const pickRandomAction = (bLeft, cLeft) => {
  const options = ["A"];
  if (bLeft > 0) options.push("B");
  if (cLeft > 0) options.push("C");
  const idx = Math.floor(Math.random() * options.length);
  return options[idx];
};

// 액션별 실제 이동값 샘플링
const sampleStep = (actionKey) => {
  let arr = ACTION_A;
  if (actionKey === "B") arr = ACTION_B;
  else if (actionKey === "C") arr = ACTION_C;

  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
};

// 한 번의 가공 시퀀스를 시뮬레이션
const runSingleTrial = (params) => {
  const { mode, startPos, startTurns, startB, startC, strategy } = params;

  let pos = clampPos(startPos);
  let turns = startTurns;
  let bLeft = startB;
  let cLeft = startC;

  while (turns > 0) {
    // 이미 터져 있으면 바로 종료
    if (isFailure(pos, mode)) return "explode";

    let actionKey;

    if (strategy === "policy") {
      const key = makeKey(mode, pos, turns, bLeft, cLeft);
      const row = POLICY_TABLE.get(key);
      if (row) {
        actionKey = chooseBestActionFromPolicy(row, bLeft, cLeft);
      } else {
        // DP 테이블에 없는 상태면 랜덤으로 fallback
        actionKey = pickRandomAction(bLeft, cLeft);
      }
    } else {
      // 완전 랜덤 전략
      actionKey = pickRandomAction(bLeft, cLeft);
    }

    const delta = sampleStep(actionKey);
    pos = clampPos(pos + delta);

    if (actionKey === "B" && bLeft > 0) bLeft -= 1;
    if (actionKey === "C" && cLeft > 0) cLeft -= 1;

    if (isFailure(pos, mode)) return "explode";

    turns -= 1;
  }

  // 턴 다 쓰고 나서 최종 위치 판정
  if (isSuccess(pos, mode)) return "success";
  if (isFailure(pos, mode)) return "explode";
  return "middle";
};

// --- React Hook ---
export const useProcessingSim = () => {
  const [mode, setMode] = useState(MODES.SUPER_EPIC);
  const [pos, setPos] = useState(0);
  const [turns, setTurns] = useState(8);
  const [bLeft, setBLeft] = useState(3);
  const [cLeft, setCLeft] = useState(3);
  const [trials, setTrials] = useState(10000);

  // 전략: policy(최적 전략), random(무작위)
  const [strategy, setStrategy] = useState("policy");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  // 이론 DP row (UI 표시에 사용)
  const policyRow = useMemo(() => {
    const key = makeKey(
      mode,
      clampPos(Number(pos)),
      Number(turns),
      Number(bLeft),
      Number(cLeft)
    );
    return POLICY_TABLE.get(key) || null;
  }, [mode, pos, turns, bLeft, cLeft]);

  const runSim = useCallback(() => {
    const n = Math.max(1000, Number(trials) || 10000);

    const numericPos = clampPos(Number(pos));
    const numericTurns = Number(turns) || 0;
    const numericB = Math.max(0, Math.min(3, Number(bLeft) || 0));
    const numericC = Math.max(0, Math.min(3, Number(cLeft) || 0));

    setRunning(true);

    // 메인 스레드 블락 줄이려고 setTimeout으로 밀기
    setTimeout(() => {
      let success = 0;
      let explode = 0;
      let middle = 0;

      for (let i = 0; i < n; i += 1) {
        const outcome = runSingleTrial({
          mode,
          startPos: numericPos,
          startTurns: numericTurns,
          startB: numericB,
          startC: numericC,
          strategy,
        });

        if (outcome === "success") success += 1;
        else if (outcome === "explode") explode += 1;
        else middle += 1;
      }

      const inv = 1 / n;
      setResult({
        success: success * inv,
        explode: explode * inv,
        middle: middle * inv,
        trials: n,
        strategy,
        mode,
      });

      setRunning(false);
    }, 0);
  }, [mode, pos, turns, bLeft, cLeft, trials, strategy]);

  return {
    mode,
    setMode,
    pos,
    setPos,
    turns,
    setTurns,
    bLeft,
    setBLeft,
    cLeft,
    setCLeft,
    trials,
    setTrials,
    strategy,
    setStrategy,
    policyRow,
    result,
    running,
    runSim,
  };
};
