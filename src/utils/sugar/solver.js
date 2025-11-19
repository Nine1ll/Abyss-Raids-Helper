import { sugarShapes } from "./shapes";
import { getPieceBaseScore, summarizeBonuses } from "./score";
import { GRADE_INFO } from "../../constants/sugar";

const clonePlacements = (placements) =>
  placements.map((p) => ({
    ...p,
    cells: p.cells.map(([r, c]) => [r, c]),
  }));

export const solveSugarBoard = ({ rows, cols, blocked = [], pieces = [], role }) => {
  const boardSize = rows * cols;
  const board = new Array(boardSize).fill(null);

  blocked.forEach(({ row, col }) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const idx = row * cols + col;
      board[idx] = "#";
    }
  });

  let totalFreeCells = board.filter((cell) => cell !== "#").length;

  const expandedPieces = [];
  pieces.forEach((piece) => {
    if (!piece || piece.role !== role) return;
    const shape = sugarShapes[piece.shapeKey];
    if (!shape) return;
    const gradeInfo = GRADE_INFO[piece.grade];
    const maxCells = gradeInfo?.maxCells;
    if (maxCells && shape.area > maxCells) return;
    const quantity = Number(piece.quantity) || 0;
    for (let i = 0; i < quantity; i += 1) {
      expandedPieces.push({
        ...piece,
        uid: `${piece.id || piece.shapeKey}-${i}-${expandedPieces.length}`,
        shape,
        area: shape.area,
        baseScore: getPieceBaseScore(piece.grade, shape.area),
        gradeLabel: gradeInfo?.label || piece.grade,
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

  expandedPieces.sort((a, b) => b.baseScore - a.baseScore || b.area - a.area);

  let bestResult = {
    totalScore: 0,
    baseScore: 0,
    bonusScore: 0,
    placements: [],
    bonusBreakdown: [],
  };

  const placements = [];
  const modifierTotals = {};

  const canPlace = (piece, startRow, startCol) => {
    if (startRow + piece.shape.height > rows) return false;
    if (startCol + piece.shape.width > cols) return false;

    for (let i = 0; i < piece.shape.cells.length; i += 1) {
      const cell = piece.shape.cells[i];
      const r = startRow + cell.row;
      const c = startCol + cell.col;
      const idx = r * cols + c;
      if (board[idx] !== null) {
        return false;
      }
    }

    return true;
  };

  const placePiece = (piece, startRow, startCol) => {
    const coords = [];
    piece.shape.cells.forEach(({ row, col }) => {
      const r = startRow + row;
      const c = startCol + col;
      const idx = r * cols + c;
      board[idx] = piece.uid;
      coords.push([r, c]);
    });
    return coords;
  };

  const removePiece = (coords) => {
    coords.forEach(([row, col]) => {
      const idx = row * cols + col;
      board[idx] = null;
    });
  };

  const evaluate = (baseScore) => {
    const { totalBonus, breakdown } = summarizeBonuses(modifierTotals);
    const totalScore = baseScore + totalBonus;
    if (totalScore > bestResult.totalScore) {
      bestResult = {
        totalScore,
        baseScore,
        bonusScore: totalBonus,
        placements: clonePlacements(placements),
        bonusBreakdown: breakdown,
      };
    }
  };

  const dfs = (index, baseScore, remainingFree) => {
    if (index === expandedPieces.length) {
      evaluate(baseScore);
      return;
    }

    // Option: skip this piece entirely
    dfs(index + 1, baseScore, remainingFree);

    const piece = expandedPieces[index];
    if (piece.area > remainingFree) {
      return;
    }

    for (let row = 0; row <= rows - piece.shape.height; row += 1) {
      for (let col = 0; col <= cols - piece.shape.width; col += 1) {
        if (!canPlace(piece, row, col)) continue;
        const coords = placePiece(piece, row, col);
        placements.push({
          id: piece.uid,
          label: `${piece.modifier} · ${piece.gradeLabel} · ${piece.area}칸`,
          grade: piece.grade,
          modifier: piece.modifier,
          baseScore: piece.baseScore,
          shapeKey: piece.shapeKey,
          cells: coords,
        });

        modifierTotals[piece.modifier] =
          (modifierTotals[piece.modifier] || 0) + piece.area;

        dfs(index + 1, baseScore + piece.baseScore, remainingFree - piece.area);

        modifierTotals[piece.modifier] -= piece.area;
        if (modifierTotals[piece.modifier] <= 0) {
          delete modifierTotals[piece.modifier];
        }

        placements.pop();
        removePiece(coords);
      }
    }
  };

  dfs(0, 0, totalFreeCells);

  return bestResult;
};
