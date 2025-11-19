import { sugarShapes } from "./shapes";
import { getPieceBaseScore, summarizeBonuses, getBonusFromModifier } from "./score";
import { GRADE_INFO } from "../../constants/sugar";

const clonePlacements = (placements) =>
  placements.map((p) => ({
    ...p,
    cells: p.cells.map(([r, c]) => [r, c]),
  }));

const bitForCell = (row, col, cols) => 1n << BigInt(row * cols + col);

const createEmptyResult = () => ({
  totalScore: 0,
  baseScore: 0,
  bonusScore: 0,
  placements: [],
  bonusBreakdown: [],
});

export const solveSugarBoard = ({ rows, cols, blocked = [], pieces = [], role }) => {
  const totalCells = rows * cols;
  if (totalCells <= 0) {
    return createEmptyResult();
  }

  const bitCache = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => bitForCell(row, col, cols))
  );

  const cellIndexMap = Array.from({ length: rows }, () => Array(cols).fill(0));
  const cellBits = [];
  const bitToIndex = new Map();
  let boardMask = 0n;

  let blockedMask = 0n;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const bit = bitCache[row][col];
      cellIndexMap[row][col] = index;
      cellBits[index] = bit;
      bitToIndex.set(bit, index);
      boardMask |= bit;
    }
  }

  blocked.forEach(({ row, col }) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const bit = bitCache[row][col];
      blockedMask |= bit;
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
          cellIndexes.push(cellIndexMap[row][col]);
        }

        if (fits) {
          placements.push({ mask, cells: coords, cellIndexes });
        }
      }
    }

    placementsCache.set(shape.key, placements);
    return placements;
  };

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

    const baseScore = getPieceBaseScore(piece.grade, shape.area);
    const entry = {
      uid: piece.id || `${piece.shapeKey}-${pieceIndex}`,
      modifier: piece.modifier,
      grade: piece.grade,
      gradeLabel: gradeInfo?.label || piece.grade,
      shapeKey: piece.shapeKey,
      area: shape.area,
      baseScore,
      placements,
      placementsByCell: new Map(),
      remaining: quantity,
      used: 0,
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

  if (!piecePool.length) {
    return createEmptyResult();
  }

  const coverageCounts = new Array(totalCells).fill(0);
  piecePool.forEach((entry) => {
    entry.placements.forEach((placement) => {
      placement.cellIndexes.forEach((index) => {
        coverageCounts[index] += entry.remaining;
      });
    });
  });

  const modifierPotential = {};
  let unusedBaseScore = 0;
  piecePool.forEach((entry) => {
    unusedBaseScore += entry.baseScore * entry.remaining;
    modifierPotential[entry.modifier] =
      (modifierPotential[entry.modifier] || 0) + entry.area * entry.remaining;
  });

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
      if (score === 0) {
        return bit;
      }
      if (score < bestScore) {
        bestScore = score;
        bestBit = bit;
        if (score === 1) break;
      }
    }
    return bestBit || (freeMask & -freeMask);
  };

  const dfs = (occupiedMask, baseScore, unusedScore) => {
    const optimisticBonus = futureBonusBound();
    const optimisticTotal = baseScore + unusedScore + optimisticBonus;
    if (optimisticTotal <= bestResult.totalScore) {
      return;
    }

    const stateKey = occupiedMask.toString(16);
    const seenBest = visitedStates.get(stateKey);
    if (typeof seenBest !== "undefined" && optimisticTotal <= seenBest) {
      return;
    }
    visitedStates.set(stateKey, optimisticTotal);

    evaluate(baseScore);

    const freeMask = boardMask & ~occupiedMask;
    if (freeMask === 0n) {
      return;
    }

    const targetBit = selectTargetBit(freeMask);
    if (targetBit === 0n) {
      return;
    }

    const targetIndex = bitToIndex.get(targetBit);
    if (typeof targetIndex === "undefined") {
      dfs(occupiedMask | targetBit, baseScore, unusedScore);
      return;
    }

    for (let entryIndex = 0; entryIndex < piecePool.length; entryIndex += 1) {
      const entry = piecePool[entryIndex];
      if (entry.remaining <= 0) continue;
      const placementList = entry.placementsByCell.get(targetIndex);
      if (!placementList || !placementList.length) continue;

      for (let i = 0; i < placementList.length; i += 1) {
        const placement = placementList[i];
        if ((placement.mask & occupiedMask) !== 0n) continue;

        entry.remaining -= 1;
        const placementId = `${entry.uid}-${entry.used}`;
        entry.used += 1;
        modifierTotals[entry.modifier] = (modifierTotals[entry.modifier] || 0) + entry.area;
        modifierPotential[entry.modifier] = Math.max(
          0,
          (modifierPotential[entry.modifier] || 0) - entry.area
        );

        placementsStack.push({
          id: placementId,
          label: `${entry.modifier} · ${entry.gradeLabel} · ${entry.area}칸`,
          grade: entry.grade,
          modifier: entry.modifier,
          baseScore: entry.baseScore,
          shapeKey: entry.shapeKey,
          cells: placement.cells,
        });

        dfs(occupiedMask | placement.mask, baseScore + entry.baseScore, unusedScore - entry.baseScore);

        placementsStack.pop();
        modifierTotals[entry.modifier] -= entry.area;
        if (modifierTotals[entry.modifier] <= 0) {
          delete modifierTotals[entry.modifier];
        }
        modifierPotential[entry.modifier] =
          (modifierPotential[entry.modifier] || 0) + entry.area;
        entry.used -= 1;
        entry.remaining += 1;
      }
    }

    // Option 2: intentionally leave the cell empty.
    dfs(occupiedMask | targetBit, baseScore, unusedScore);
  };

  dfs(blockedMask, 0, unusedBaseScore);

  return bestResult;
};
