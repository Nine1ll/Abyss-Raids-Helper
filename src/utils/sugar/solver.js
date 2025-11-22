import { sugarShapes } from "./shapes";
import {
  getPieceBaseScore,
  summarizeBonuses,
  getBonusFromModifier,
} from "./score";
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

const createMethodResult = (label) => ({
  key: label,
  label,
  result: createEmptyResult(),
  durationMs: 0,
});

const toPlacementLabel = (entry) => `${entry.modifier} · ${entry.gradeLabel} · ${entry.area}칸`;

const buildContext = ({ rows, cols, blocked, pieces, role }) => {
  const totalCells = rows * cols;
  if (totalCells <= 0) {
    return null;
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
    return null;
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

  return {
    rows,
    cols,
    boardMask,
    blockedMask,
    cellBits,
    bitToIndex,
    coverageCounts,
    modifierPotential,
    unusedBaseScore,
    piecePool,
    totalCells,
  };
};

const evaluateStack = (placementsStack, baseScore, modifierTotals) => {
  const { totalBonus, breakdown } = summarizeBonuses(modifierTotals);
  return {
    totalScore: baseScore + totalBonus,
    baseScore,
    bonusScore: totalBonus,
    placements: clonePlacements(placementsStack),
    bonusBreakdown: breakdown,
  };
};

const runBacktracking = (context, timeLimitMs) => {
  const start = performance.now();
  const deadline = start + timeLimitMs;
  const {
    boardMask,
    blockedMask,
    cellBits,
    bitToIndex,
    coverageCounts,
    modifierPotential,
    piecePool,
    totalCells,
    unusedBaseScore,
  } = context;

  const modifierTotals = {};
  const placementsStack = [];
  let bestResult = createEmptyResult();
  const visitedStates = new Map();

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
    if (performance.now() > deadline) return;
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

    const evaluated = evaluateStack(placementsStack, baseScore, modifierTotals);
    if (evaluated.totalScore > bestResult.totalScore) {
      bestResult = evaluated;
    }

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
          label: toPlacementLabel(entry),
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
        modifierPotential[entry.modifier] = (modifierPotential[entry.modifier] || 0) + entry.area;
        entry.used -= 1;
        entry.remaining += 1;
      }
    }

    // Option 2: intentionally leave the cell empty.
    dfs(occupiedMask | targetBit, baseScore, unusedScore);
  };

  dfs(blockedMask, 0, unusedBaseScore);

  return { result: bestResult, durationMs: performance.now() - start };
};

const buildExactCoverMatrix = (context) => {
  const { rows, cols, blockedMask, cellBits, piecePool } = context;

  const cellColumns = [];
  for (let i = 0; i < rows * cols; i += 1) {
    const bit = cellBits[i];
    if ((blockedMask & bit) !== 0n) continue;
    cellColumns.push({ type: "cell", bit, index: i });
  }

  const pieceColumns = [];
  piecePool.forEach((entry) => {
    for (let count = 0; count < entry.remaining; count += 1) {
      pieceColumns.push({ type: "piece", entry, id: `${entry.uid}#${count}` });
    }
  });

  const pieceColumnIndex = new Map();
  pieceColumns.forEach((col, index) => {
    pieceColumnIndex.set(col.id, index);
  });

  const columns = [...cellColumns, ...pieceColumns];
  const rowsData = [];
  const columnToRows = Array.from({ length: columns.length }, () => new Set());

  const addRow = (row) => {
    const rowIndex = rowsData.length;
    rowsData.push(row);
    row.columns.forEach((colIndex) => columnToRows[colIndex].add(rowIndex));
  };

  cellColumns.forEach((col, colIndex) => {
    const row = {
      label: "빈칸",
      modifier: null,
      grade: null,
      baseScore: 0,
      shapeKey: null,
      cells: [[Math.floor(col.index / cols), col.index % cols]],
      columns: [colIndex],
    };
    addRow(row);
  });

  piecePool.forEach((entry) => {
    entry.placements.forEach((placement) => {
      const placementColumns = [];
      const cells = [];
      placement.cellIndexes.forEach((cellIndex) => {
        const columnIndex = cellColumns.findIndex((col) => col.index === cellIndex);
        if (columnIndex >= 0) {
          placementColumns.push(columnIndex);
          cells.push([Math.floor(cellIndex / cols), cellIndex % cols]);
        }
      });

      if (!placementColumns.length) return;

      for (let count = 0; count < entry.remaining; count += 1) {
        const pieceColIndex = cellColumns.length + pieceColumnIndex.get(`${entry.uid}#${count}`);
        const row = {
          label: toPlacementLabel(entry),
          modifier: entry.modifier,
          grade: entry.grade,
          baseScore: entry.baseScore,
          shapeKey: entry.shapeKey,
          cells,
          columns: [...placementColumns, pieceColIndex],
        };
        addRow(row);
      }
    });
  });

  return { columns, rowsData, columnToRows };
};

const runAlgorithmX = (context, timeLimitMs) => {
  const start = performance.now();
  const deadline = start + timeLimitMs;
  const { modifierPotential } = context;
  const { columns, rowsData, columnToRows } = buildExactCoverMatrix(context);
  const activeColumns = new Set(columns.map((_, index) => index));
  const solutionRows = [];
  let bestResult = createEmptyResult();

  const modifierTotals = {};
  let baseScore = 0;

  const optimisticBonus = () => {
    let optimistic = 0;
    Object.keys(modifierPotential).forEach((modifier) => {
      const placed = modifierTotals[modifier] || 0;
      const capped = Math.min(placed + modifierPotential[modifier], 21);
      optimistic += getBonusFromModifier(capped) - getBonusFromModifier(placed);
    });
    return optimistic;
  };

  const cover = (colIndex) => {
    activeColumns.delete(colIndex);
    columnToRows[colIndex].forEach((rowIndex) => {
      const row = rowsData[rowIndex];
      row.columns.forEach((c) => {
        if (c !== colIndex) {
          columnToRows[c].delete(rowIndex);
        }
      });
    });
  };

  const uncover = (colIndex) => {
    columnToRows[colIndex].forEach((rowIndex) => {
      const row = rowsData[rowIndex];
      row.columns.forEach((c) => {
        if (c !== colIndex) {
          columnToRows[c].add(rowIndex);
        }
      });
    });
    activeColumns.add(colIndex);
  };

  const chooseColumn = () => {
    let best = null;
    let bestSize = Number.POSITIVE_INFINITY;
    activeColumns.forEach((colIndex) => {
      const size = columnToRows[colIndex].size;
      if (size < bestSize) {
        best = colIndex;
        bestSize = size;
      }
    });
    return best;
  };

  const search = () => {
    if (performance.now() > deadline) return;
    const columnIndex = chooseColumn();
    if (columnIndex === null) {
      const result = evaluateStack(solutionRows.filter((row) => row.modifier), baseScore, modifierTotals);
      if (result.totalScore > bestResult.totalScore) {
        bestResult = result;
      }
      return;
    }

    const optimistic = baseScore + optimisticBonus();
    if (optimistic <= bestResult.totalScore) return;

    const rows = Array.from(columnToRows[columnIndex]);
    for (let i = 0; i < rows.length; i += 1) {
      const rowIndex = rows[i];
      const row = rowsData[rowIndex];

      solutionRows.push(row);
      if (row.modifier) {
        modifierTotals[row.modifier] = (modifierTotals[row.modifier] || 0) + row.cells.length;
        baseScore += row.baseScore;
      }

      row.columns.forEach(cover);
      search();
      row.columns.forEach(uncover);

      if (row.modifier) {
        modifierTotals[row.modifier] -= row.cells.length;
        if (modifierTotals[row.modifier] <= 0) delete modifierTotals[row.modifier];
        baseScore -= row.baseScore;
      }
      solutionRows.pop();
      if (performance.now() > deadline) break;
    }
  };

  search();
  return { result: bestResult, durationMs: performance.now() - start };
};

const runCsp = (context, timeLimitMs) => {
  const start = performance.now();
  const deadline = start + timeLimitMs;
  const { boardMask, blockedMask, cellBits, bitToIndex, modifierPotential, piecePool, totalCells } = context;

  const placementsStack = [];
  const modifierTotals = {};
  let bestResult = createEmptyResult();

  const placementDomains = new Map();
  piecePool.forEach((entry) => {
    entry.placements.forEach((placement) => {
      placement.cellIndexes.forEach((index) => {
        if (!placementDomains.has(index)) placementDomains.set(index, []);
        placementDomains.get(index).push({ entry, placement });
      });
    });
  });

  const futureBonusBound = () => {
    let optimistic = 0;
    Object.keys(modifierPotential).forEach((modifier) => {
      const placed = modifierTotals[modifier] || 0;
      const capped = Math.min(placed + modifierPotential[modifier], 21);
      optimistic += getBonusFromModifier(capped) - getBonusFromModifier(placed);
    });
    return optimistic;
  };

  const selectCell = (freeMask) => {
    let bestIndex = -1;
    let bestSize = Number.POSITIVE_INFINITY;
    for (let index = 0; index < totalCells; index += 1) {
      const bit = cellBits[index];
      if ((freeMask & bit) === 0n) continue;
      const domain = placementDomains.get(index);
      const size = domain ? domain.length : 0;
      if (size < bestSize) {
        bestSize = size;
        bestIndex = index;
        if (size <= 1) break;
      }
    }
    return bestIndex;
  };

  const dfs = (occupiedMask, baseScore) => {
    if (performance.now() > deadline) return;
    const freeMask = boardMask & ~occupiedMask;
    if (freeMask === 0n) {
      const evaluated = evaluateStack(placementsStack, baseScore, modifierTotals);
      if (evaluated.totalScore > bestResult.totalScore) bestResult = evaluated;
      return;
    }

    const optimistic = baseScore + futureBonusBound();
    if (optimistic <= bestResult.totalScore) return;

    const cellIndex = selectCell(freeMask);
    if (cellIndex === -1) {
      const evaluated = evaluateStack(placementsStack, baseScore, modifierTotals);
      if (evaluated.totalScore > bestResult.totalScore) bestResult = evaluated;
      return;
    }

    const bit = cellBits[cellIndex];
    const domain = placementDomains.get(cellIndex) || [];
    for (let i = 0; i < domain.length; i += 1) {
      const { entry, placement } = domain[i];
      if (entry.remaining <= 0) continue;
      if ((placement.mask & occupiedMask) !== 0n) continue;

      entry.remaining -= 1;
      modifierTotals[entry.modifier] = (modifierTotals[entry.modifier] || 0) + entry.area;

      placementsStack.push({
        id: `${entry.uid}-${entry.used}`,
        label: toPlacementLabel(entry),
        grade: entry.grade,
        modifier: entry.modifier,
        baseScore: entry.baseScore,
        shapeKey: entry.shapeKey,
        cells: placement.cells,
      });
      entry.used += 1;

      dfs(occupiedMask | placement.mask, baseScore + entry.baseScore);

      entry.used -= 1;
      placementsStack.pop();
      modifierTotals[entry.modifier] -= entry.area;
      if (modifierTotals[entry.modifier] <= 0) delete modifierTotals[entry.modifier];
      entry.remaining += 1;
      if (performance.now() > deadline) break;
    }

    dfs(occupiedMask | bit, baseScore);
  };

  dfs(blockedMask, 0);
  return { result: bestResult, durationMs: performance.now() - start };
};

export const solveSugarBoard = ({
  rows,
  cols,
  blocked = [],
  pieces = [],
  role,
  timeLimitMs = 55000,
}) => {
  const context = buildContext({ rows, cols, blocked, pieces, role });
  if (!context) {
    return { best: createEmptyResult(), methods: [] };
  }

  const perMethodLimit = Math.max(5000, Math.floor(timeLimitMs / 3));

  const methods = [
    { key: "backtracking", label: "백트래킹 + 가지치기", runner: runBacktracking },
    { key: "algorithmx", label: "Algorithm X (정확 일치)", runner: runAlgorithmX },
    { key: "csp", label: "CSP 솔버", runner: runCsp },
  ];

  const results = methods.map((method) => {
    const clonedContext = {
      ...context,
      modifierPotential: { ...context.modifierPotential },
      piecePool: context.piecePool.map((entry) => ({
        ...entry,
        placements: entry.placements,
        placementsByCell: entry.placementsByCell,
        remaining: entry.remaining,
        used: 0,
      })),
    };

    const output = method.runner(clonedContext, perMethodLimit);
    return { ...createMethodResult(method.label), key: method.key, ...output };
  });

  const best = results.reduce((acc, item) => {
    if (!acc || item.result.totalScore > acc.totalScore) return item.result;
    return acc;
  }, null);

  return { best: best || createEmptyResult(), methods: results };
};
