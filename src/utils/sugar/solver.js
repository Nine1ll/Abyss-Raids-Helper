import { sugarShapes } from "./shapes";
import { getPieceBaseScore, summarizeBonuses, getBonusFromModifier } from "./score";
import { GRADE_INFO } from "../../constants/sugar";

const clonePlacements = (placements) =>
  placements.map((p) => ({
    ...p,
    cells: p.cells.map(([r, c]) => [r, c]),
  }));

const bitForCell = (row, col, cols) => 1n << BigInt(row * cols + col);

export const solveSugarBoard = ({ rows, cols, blocked = [], pieces = [], role }) => {
  const totalCells = rows * cols;
  let blockedMask = 0n;
  const blockedKeySet = new Set();

  const bitCache = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => bitForCell(row, col, cols))
  );

  blocked.forEach(({ row, col }) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      blockedMask |= bitForCell(row, col, cols);
      blockedKeySet.add(`${row},${col}`);
    }
  });

  const totalFreeCells = totalCells - blockedKeySet.size;

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
        }

        if (fits) {
          placements.push({ mask, cells: coords });
        }
      }
    }

    placementsCache.set(shape.key, placements);
    return placements;
  };

  const expandedPieces = [];
  pieces.forEach((piece) => {
    if (!piece || piece.role !== role) return;
    const shape = sugarShapes[piece.shapeKey];
    if (!shape) return;
    const gradeInfo = GRADE_INFO[piece.grade];
    const maxCells = gradeInfo?.maxCells;
    if (maxCells && shape.area > maxCells) return;
    const placements = getPlacementsForShape(shape);
    if (!placements.length) return;
    const quantity = Number(piece.quantity) || 0;
    for (let i = 0; i < quantity; i += 1) {
      expandedPieces.push({
        ...piece,
        uid: `${piece.id || piece.shapeKey}-${i}-${expandedPieces.length}`,
        shape,
        area: shape.area,
        baseScore: getPieceBaseScore(piece.grade, shape.area),
        gradeLabel: gradeInfo?.label || piece.grade,
        placements,
      });
    }
  });

  if (!expandedPieces.length) {
    return {
      totalScore: 0,
      baseScore: 0,
      bonusScore: 0,
      placements: [],
      bonusBreakdown: [],
    };
  }

  expandedPieces.sort((a, b) => {
    if (a.placements.length !== b.placements.length) {
      return a.placements.length - b.placements.length;
    }
    if (b.baseScore !== a.baseScore) {
      return b.baseScore - a.baseScore;
    }
    return b.area - a.area;
  });

  const suffixBase = new Array(expandedPieces.length + 1).fill(0);
  for (let i = expandedPieces.length - 1; i >= 0; i -= 1) {
    suffixBase[i] = suffixBase[i + 1] + expandedPieces[i].baseScore;
  }

  const modifierSuffix = new Array(expandedPieces.length + 1);
  modifierSuffix[expandedPieces.length] = new Map();
  for (let i = expandedPieces.length - 1; i >= 0; i -= 1) {
    const next = new Map(modifierSuffix[i + 1]);
    const piece = expandedPieces[i];
    next.set(piece.modifier, (next.get(piece.modifier) || 0) + piece.area);
    modifierSuffix[i] = next;
  }

  let bestResult = {
    totalScore: 0,
    baseScore: 0,
    bonusScore: 0,
    placements: [],
    bonusBreakdown: [],
  };

  const placementsStack = [];
  const modifierTotals = {};

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

  const futureBonusBound = (index) => {
    const future = modifierSuffix[index];
    if (!future) return 0;
    let optimistic = 0;
    future.forEach((area, modifier) => {
      const placed = modifierTotals[modifier] || 0;
      const maxCells = Math.min(placed + area, 21);
      const potential = getBonusFromModifier(maxCells);
      const existing = getBonusFromModifier(placed);
      optimistic += potential - existing;
    });
    return optimistic;
  };

  const dfs = (index, baseScore, remainingFree, occupiedMask) => {
    if (index === expandedPieces.length) {
      evaluate(baseScore);
      return;
    }

    const optimisticBonus = futureBonusBound(index);
    if (baseScore + suffixBase[index] + optimisticBonus <= bestResult.totalScore) {
      return;
    }

    const piece = expandedPieces[index];

    // Skip current piece
    dfs(index + 1, baseScore, remainingFree, occupiedMask);

    if (piece.area > remainingFree) {
      return;
    }

    for (let i = 0; i < piece.placements.length; i += 1) {
      const placement = piece.placements[i];
      if ((placement.mask & occupiedMask) !== 0n) continue;

      placementsStack.push({
        id: piece.uid,
        label: `${piece.modifier} · ${piece.gradeLabel} · ${piece.area}칸`,
        grade: piece.grade,
        modifier: piece.modifier,
        baseScore: piece.baseScore,
        shapeKey: piece.shapeKey,
        cells: placement.cells,
      });

      modifierTotals[piece.modifier] =
        (modifierTotals[piece.modifier] || 0) + piece.area;

      dfs(
        index + 1,
        baseScore + piece.baseScore,
        remainingFree - piece.area,
        occupiedMask | placement.mask
      );

      modifierTotals[piece.modifier] -= piece.area;
      if (modifierTotals[piece.modifier] <= 0) {
        delete modifierTotals[piece.modifier];
      }

      placementsStack.pop();
    }
  };

  dfs(0, 0, totalFreeCells, blockedMask);

  return bestResult;
};
