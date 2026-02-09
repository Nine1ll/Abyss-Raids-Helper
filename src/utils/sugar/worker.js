// src/utils/sugar/worker.js
/* eslint-disable no-restricted-globals */

import { sugarShapes } from "./shapes";
import { BONUS_PER_STEP, GRADE_INFO } from "../../constants/sugar";

// ---------------------------------------------
// Bitmasking:
// 7x7 = 49 cells. We map each cell to a bit in a 64-bit BigInt.
// A board state is a single BigInt where 1 means occupied/blocked.
// This makes collision checks O(1) with bitwise AND.
// ---------------------------------------------

const bitForCell = (row, col, cols) => 1n << BigInt(row * cols + col);

const getPieceBaseScore = (grade, cellCount) => {
  const info = GRADE_INFO[grade];
  if (!info) return 0;
  return info.points * cellCount;
};

const getBonusFromModifier = (cellCount) => {
  if (!cellCount || cellCount < 9) return 0;
  const effectiveCells = Math.min(cellCount, 21);
  const extra = effectiveCells - 9;
  const bonusCount = 1 + Math.floor(extra / 3);
  return bonusCount * BONUS_PER_STEP;
};

const summarizeBonuses = (modifierMap) => {
  const breakdown = [];
  let total = 0;
  Object.entries(modifierMap).forEach(([modifier, cells]) => {
    const bonus = getBonusFromModifier(cells);
    if (bonus > 0) {
      breakdown.push({ modifier, cells: Math.min(cells, 21), bonus });
      total += bonus;
    }
  });
  return { totalBonus: total, breakdown };
};

const clonePlacements = (placements) =>
  placements.map((placement) => ({
    ...placement,
    cells: placement.cells.map(([row, col]) => [row, col]),
  }));

const createEmptyResult = () => ({
  totalScore: 0,
  baseScore: 0,
  bonusScore: 0,
  placements: [],
  bonusBreakdown: [],
});

const solveSugarBoard = ({ rows, cols, blocked = [], pieces = [], role }) => {
  const totalCells = rows * cols;
  if (totalCells <= 0) return createEmptyResult();

  const bitCache = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => bitForCell(row, col, cols))
  );

  const cellBits = new Array(totalCells);
  const bitToIndex = new Map();
  let boardMask = 0n;
  let blockedMask = 0n;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const bit = bitCache[row][col];
      cellBits[index] = bit;
      bitToIndex.set(bit, index);
      boardMask |= bit;
    }
  }

  blocked.forEach(({ row, col }) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      blockedMask |= bitCache[row][col];
    }
  });

  const placementsCache = new Map();
  const getPlacementsForShape = (shape) => {
    if (placementsCache.has(shape.key)) {
      return placementsCache.get(shape.key);
    }

    const placements = [];
    for (let startRow = 0; startRow <= rows - shape.height; startRow += 1) {
      for (let startCol = 0; startCol <= cols - shape.width; startCol += 1) {
        let mask = 0n;
        const coords = [];
        const cellIndexes = [];
        let fits = true;

        for (let i = 0; i < shape.cells.length; i += 1) {
          const cell = shape.cells[i];
          const row = startRow + cell.row;
          const col = startCol + cell.col;
          const bit = bitCache[row][col];
          if ((blockedMask & bit) !== 0n) {
            fits = false;
            break;
          }
          mask |= bit;
          coords.push([row, col]);
          cellIndexes.push(row * cols + col);
        }

        if (fits) {
          placements.push({ mask, cells: coords, cellIndexes });
        }
      }
    }

    placementsCache.set(shape.key, placements);
    return placements;
  };

  // ---------------------------------------------
  // Build piece pool
  // ---------------------------------------------
  const piecePool = [];
  pieces.forEach((piece, pieceIndex) => {
    if (!piece || piece.role !== role) return;

    const quantity = Math.max(0, Number(piece.quantity) || 0);
    if (quantity <= 0) return;

    const shape = sugarShapes[piece.shapeKey];
    if (!shape) return;

    const gradeInfo = GRADE_INFO[piece.grade];
    const maxCells = gradeInfo?.maxCells;
    if (maxCells && shape.area > maxCells) return;

    const placements = getPlacementsForShape(shape);
    if (!placements.length) return;

    const isUnique = piece.grade === "unique";
    const effectiveQuantity = isUnique ? Math.min(quantity, 1) : quantity;
    const baseScore = getPieceBaseScore(piece.grade, shape.area);

    const entry = {
      uid: piece.id || `${piece.shapeKey}-${pieceIndex}`,
      modifier: isUnique ? "-" : piece.modifier,
      grade: piece.grade,
      gradeLabel: gradeInfo?.label || piece.grade,
      shapeKey: piece.shapeKey,
      area: shape.area,
      baseScore,
      placements,
      placementsByCell: new Map(),
      remaining: effectiveQuantity,
      used: 0,
      isUnique,
    };

    placements.forEach((placement) => {
      placement.cellIndexes.forEach((index) => {
        if (!entry.placementsByCell.has(index)) {
          entry.placementsByCell.set(index, []);
        }
        entry.placementsByCell.get(index).push(placement);
      });
    });

    piecePool.push(entry);
  });

  if (!piecePool.length) return createEmptyResult();

  // ---------------------------------------------
  // Coverage count per cell for heuristic ordering
  // ---------------------------------------------
  const coverageCounts = new Array(totalCells).fill(0);
  piecePool.forEach((entry) => {
    entry.placements.forEach((placement) => {
      placement.cellIndexes.forEach((index) => {
        coverageCounts[index] += entry.remaining;
      });
    });
  });

  // ---------------------------------------------
  // Modifier potential and initial base score pool
  // ---------------------------------------------
  const modifierPotential = {};
  let unusedBaseScore = 0;
  piecePool.forEach((entry) => {
    unusedBaseScore += entry.baseScore * entry.remaining;
    if (!entry.isUnique) {
      modifierPotential[entry.modifier] =
        (modifierPotential[entry.modifier] || 0) + entry.area * entry.remaining;
    }
  });

  // Heuristic: larger area / higher base score first.
  piecePool.sort((a, b) => {
    if (b.area !== a.area) return b.area - a.area;
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    return a.modifier.localeCompare(b.modifier, "ko-KR");
  });

  const modifierTotals = {};
  const placementsStack = [];
  let bestResult = createEmptyResult();
  const visitedStates = new Map();

  const evaluate = (baseScore) => {
    const { totalBonus, breakdown } = summarizeBonuses(modifierTotals);
    const totalScore = baseScore + totalBonus;
    if (totalScore > bestResult.totalScore) {
      bestResult = {
        totalScore,
        baseScore,
        bonusScore: totalBonus,
        placements: clonePlacements(placementsStack),
        bonusBreakdown: breakdown,
      };
    }
  };

  const futureBonusBound = () => {
    let optimistic = 0;
    Object.keys(modifierPotential).forEach((modifier) => {
      const potential = modifierPotential[modifier];
      if (!potential) return;
      const placed = modifierTotals[modifier] || 0;
      const capped = Math.min(placed + potential, 21);
      optimistic += getBonusFromModifier(capped) - getBonusFromModifier(placed);
    });
    return optimistic;
  };

  const selectTargetBit = (freeMask) => {
    let bestBit = 0n;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < totalCells; index += 1) {
      const bit = cellBits[index];
      if ((freeMask & bit) === 0n) continue;
      const score = coverageCounts[index];
      if (score === 0) return bit;
      if (score < bestScore) {
        bestScore = score;
        bestBit = bit;
        if (score === 1) break;
      }
    }
    return bestBit || (freeMask & -freeMask);
  };

  // --------------------------------------------------------
  // DFS with Branch & Bound
  // Time Complexity (worst-case): O(P * B) exponential.
  // Pruning reduces typical runtime drastically by bounding
  // on remaining base score + optimistic bonus potential.
  // --------------------------------------------------------
  const dfs = (occupiedMask, baseScore, unusedScore, uniqueUsed = 0) => {
    const optimisticTotal = baseScore + unusedScore + futureBonusBound();
    if (optimisticTotal <= bestResult.totalScore) return;

    const stateKey = occupiedMask.toString(16) + "|" + uniqueUsed;
    const seenBest = visitedStates.get(stateKey);
    if (typeof seenBest !== "undefined" && optimisticTotal <= seenBest) {
      return;
    }
    visitedStates.set(stateKey, optimisticTotal);

    evaluate(baseScore);

    const freeMask = boardMask & ~occupiedMask;
    if (freeMask === 0n) return;

    const targetBit = selectTargetBit(freeMask);
    if (targetBit === 0n) return;

    const targetIndex = bitToIndex.get(targetBit);
    if (typeof targetIndex === "undefined") {
      dfs(occupiedMask | targetBit, baseScore, unusedScore, uniqueUsed);
      return;
    }

    // Option 1: place a piece covering targetIndex.
    for (let entryIndex = 0; entryIndex < piecePool.length; entryIndex += 1) {
      const entry = piecePool[entryIndex];
      if (entry.remaining <= 0) continue;
      if (entry.isUnique && uniqueUsed >= 1) continue;

      const placementList = entry.placementsByCell.get(targetIndex);
      if (!placementList || !placementList.length) continue;

      for (let i = 0; i < placementList.length; i += 1) {
        const placement = placementList[i];
        if ((placement.mask & occupiedMask) !== 0n) continue;

        entry.remaining -= 1;
        const placementId = `${entry.uid}-${entry.used}`;
        entry.used += 1;

        if (!entry.isUnique) {
          modifierTotals[entry.modifier] = (modifierTotals[entry.modifier] || 0) + entry.area;
          modifierPotential[entry.modifier] = Math.max(
            0,
            (modifierPotential[entry.modifier] || 0) - entry.area
          );
        }

        placementsStack.push({
          id: placementId,
          label: entry.isUnique
            ? `${entry.gradeLabel} · ${entry.area}칸`
            : `${entry.modifier} · ${entry.gradeLabel} · ${entry.area}칸`,
          grade: entry.grade,
          modifier: entry.modifier,
          baseScore: entry.baseScore,
          shapeKey: entry.shapeKey,
          cells: placement.cells,
        });

        const nextOccupied = occupiedMask | placement.mask;
        const nextBase = baseScore + entry.baseScore;
        const nextUnused = unusedScore - entry.baseScore;

        dfs(nextOccupied, nextBase, nextUnused, entry.isUnique ? uniqueUsed + 1 : uniqueUsed);

        placementsStack.pop();

        if (!entry.isUnique) {
          modifierTotals[entry.modifier] -= entry.area;
          if (modifierTotals[entry.modifier] <= 0) delete modifierTotals[entry.modifier];
          modifierPotential[entry.modifier] =
            (modifierPotential[entry.modifier] || 0) + entry.area;
        }

        entry.used -= 1;
        entry.remaining += 1;
      }
    }

    // Option 2: leave the target cell empty.
    dfs(occupiedMask | targetBit, baseScore, unusedScore, uniqueUsed);
  };

  dfs(blockedMask, 0, unusedBaseScore, 0);
  return bestResult;
};

self.onmessage = (event) => {
  const { rows, cols, blocked, pieces, role } = event.data;
  const result = solveSugarBoard({ rows, cols, blocked, pieces, role });
  self.postMessage({ result });
};
