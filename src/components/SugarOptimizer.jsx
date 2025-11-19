import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABELS, ROLE_MODIFIERS, GRADE_INFO } from "../constants/sugar";
import { SHAPE_OPTIONS } from "../utils/sugar/shapes";
import { solveSugarBoard } from "../utils/sugar/solver";
import { ThemeContext } from "../context/ThemeContext";

const DEFAULT_PIECES = [
  {
    id: "sample-1",
    role: "dealer",
    modifier: "광휘",
    grade: "rare",
    shapeKey: "3_L_sw",
    quantity: 1,
  },
  {
    id: "sample-2",
    role: "dealer",
    modifier: "관통",
    grade: "epic",
    shapeKey: "4_T_up",
    quantity: 1,
  },
  {
    id: "sample-3",
    role: "supporter",
    modifier: "축복",
    grade: "super_epic",
    shapeKey: "5_plus",
    quantity: 1,
  },
];

const BOARD_SIZE = 7;
const OPEN_ROWS = [2, 3, 4];
const OPEN_COLS = [1, 2, 3, 4, 5];

const cellKey = (row, col) => `${row},${col}`;

const createInitialBlockedCells = () => {
  const openRows = new Set(OPEN_ROWS);
  const openCols = new Set(OPEN_COLS);
  const initial = new Set();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!openRows.has(row) || !openCols.has(col)) {
        initial.add(cellKey(row, col));
      }
    }
  }
  return initial;
};

const gradeEntries = Object.entries(GRADE_INFO);
const shapeEntries = SHAPE_OPTIONS;

const ShapePreview = ({ shape, color = "#475569", cellSize = 16 }) => {
  if (!shape) return null;
  const previewStyle = {
    gridTemplateColumns: `repeat(${shape.width}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${shape.height}, ${cellSize}px)`,
  };
  const wrapperStyle = {
    width: `${cellSize * 5}px`,
    height: `${cellSize * 5}px`,
  };
  return (
    <div className="shape-preview-wrapper" style={wrapperStyle}>
      <div className="shape-preview" style={previewStyle}>
        {shape.matrix.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={`shape-preview-cell ${value ? "filled" : ""}`}
              style={value ? { backgroundColor: color } : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

const formatScore = (value) => value.toLocaleString("ko-KR");

const SugarOptimizer = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  const [blockedCells, setBlockedCells] = useState(() => createInitialBlockedCells());
  const [playerRole, setPlayerRole] = useState("dealer");
  const [pieces, setPieces] = useState(DEFAULT_PIECES);
  const [boardImage, setBoardImage] = useState(null);
  const [piecesImage, setPiecesImage] = useState(null);
  const [solution, setSolution] = useState(null);
  const [isSolving, setIsSolving] = useState(false);

  const pieceIdRef = useRef(DEFAULT_PIECES.length + 1);

  const [newPiece, setNewPiece] = useState(() => ({
    modifier: ROLE_MODIFIERS.dealer?.[0] || "",
    grade: "rare",
  }));

  useEffect(() => {
    setNewPiece((prev) => {
      const modifiers = ROLE_MODIFIERS[playerRole] || [];
      return {
        ...prev,
        modifier: modifiers.includes(prev.modifier) ? prev.modifier : modifiers[0] || "",
      };
    });
  }, [playerRole]);

  const highlightMap = useMemo(() => {
    if (!solution) return new Map();
    const map = new Map();
    solution.placements.forEach((placement, index) => {
      placement.cells.forEach(([row, col]) => {
        map.set(cellKey(row, col), {
          grade: placement.grade,
          modifier: placement.modifier,
          label: placement.label,
          order: index + 1,
        });
      });
    });
    return map;
  }, [solution]);

  const revokeUrl = (url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => () => revokeUrl(boardImage), [boardImage]);
  useEffect(() => () => revokeUrl(piecesImage), [piecesImage]);

  const handleImageChange = (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) {
      setter((prev) => {
        revokeUrl(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setter((prev) => {
      revokeUrl(prev);
      return url;
    });
  };

  const updateRole = (value) => {
    setPlayerRole(value);
    setSolution(null);
  };

  const toggleCell = (row, col) => {
    setSolution(null);
    setBlockedCells((prev) => {
      const next = new Set(prev);
      const key = cellKey(row, col);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleResetOpenCells = () => {
    setBlockedCells(createInitialBlockedCells());
    setSolution(null);
  };

  const handleNewPieceChange = (field, value) => {
    setNewPiece((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddShape = (shapeKey) => {
    const modifier = newPiece.modifier;
    const grade = newPiece.grade;
    if (!modifier || !grade) return;
    const gradeInfo = GRADE_INFO[grade];
    const shape = shapeEntries.find((entry) => entry.key === shapeKey);
    if (!shape) return;
    if (gradeInfo?.maxCells && shape.area > gradeInfo.maxCells) return;

    const piece = {
      id: `piece-${pieceIdRef.current}`,
      role: playerRole,
      modifier,
      grade,
      shapeKey,
      quantity: 1,
    };
    pieceIdRef.current += 1;
    setPieces((prev) => [...prev, piece]);
    setSolution(null);
  };

  const handleRemovePiece = (id) => {
    setPieces((prev) => prev.filter((piece) => piece.id !== id));
    setSolution(null);
  };

  const handleResetPieces = () => {
    setPieces([]);
    pieceIdRef.current = 1;
    setSolution(null);
  };

  const handleSolve = () => {
    setIsSolving(true);
    try {
      const blocked = Array.from(blockedCells).map((key) => {
        const [row, col] = key.split(",").map(Number);
        return { row, col };
      });

      const normalizedPieces = pieces.map((piece) => ({
        ...piece,
        quantity: Math.max(0, Number(piece.quantity) || 0),
      }));

      const result = solveSugarBoard({
        rows: BOARD_SIZE,
        cols: BOARD_SIZE,
        blocked,
        pieces: normalizedPieces,
        role: playerRole,
      });

      setSolution(result);
    } finally {
      setIsSolving(false);
    }
  };

  const renderCell = (row, col) => {
    const key = cellKey(row, col);
    const blocked = blockedCells.has(key);
    const highlight = highlightMap.get(key);
    const gradeColor = highlight ? GRADE_INFO[highlight.grade]?.color : null;
    const cellContent = highlight ? highlight.order : blocked ? "🔒" : "";
    return (
      <button
        key={key}
        type="button"
        className={`sugar-cell ${blocked ? "blocked" : ""} ${highlight ? "filled" : ""}`}
        style={{ backgroundColor: gradeColor || undefined }}
        onClick={() => toggleCell(row, col)}
        aria-label={
          blocked
            ? "잠긴 칸"
            : highlight
            ? `${highlight.label} (${highlight.order}번)`
            : "빈 칸"
        }
      >
        {cellContent}
      </button>
    );
  };

  const modifiersForRole = ROLE_MODIFIERS[playerRole] || [];
  const shapeLookup = useMemo(() => {
    const map = new Map();
    shapeEntries.forEach((shape) => map.set(shape.key, shape));
    return map;
  }, []);
  const gradeOrder = useMemo(() => {
    const order = new Map();
    gradeEntries.forEach(([grade], index) => {
      order.set(grade, index);
    });
    return order;
  }, []);
  const playerPieces = useMemo(
    () => pieces.filter((piece) => piece.role === playerRole),
    [pieces, playerRole]
  );
  const modifierOrder = useMemo(() => {
    const map = new Map();
    modifiersForRole.forEach((modifier, index) => {
      map.set(modifier, index);
    });
    return map;
  }, [modifiersForRole]);

  const groupedPieces = useMemo(() => {
    const groups = new Map();
    playerPieces.forEach((piece) => {
      const key = piece.modifier || "기타";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(piece);
    });

    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      const aOrder = modifierOrder.has(a) ? modifierOrder.get(a) : Number.MAX_SAFE_INTEGER;
      const bOrder = modifierOrder.has(b) ? modifierOrder.get(b) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b, "ko-KR");
    });

    return sorted.map(([modifier, list]) => ({
      modifier,
      pieces: list.sort((pieceA, pieceB) => {
        const gradeDiff =
          (gradeOrder.get(pieceA.grade) ?? Number.MAX_SAFE_INTEGER) -
          (gradeOrder.get(pieceB.grade) ?? Number.MAX_SAFE_INTEGER);
        if (gradeDiff !== 0) return gradeDiff;
        const areaA = shapeLookup.get(pieceA.shapeKey)?.area || 0;
        const areaB = shapeLookup.get(pieceB.shapeKey)?.area || 0;
        return areaA - areaB;
      }),
    }));
  }, [gradeOrder, modifierOrder, playerPieces, shapeLookup]);

  const gradeSelectionInfo = GRADE_INFO[newPiece.grade];
  const allowedShapeGroups = useMemo(() => {
    const limit = gradeSelectionInfo?.maxCells;
    const groups = new Map();
    shapeEntries.forEach((shape) => {
      if (limit && shape.area > limit) return;
      if (!groups.has(shape.area)) {
        groups.set(shape.area, []);
      }
      groups.get(shape.area).push(shape);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([area, shapes]) => ({
        area,
        shapes: shapes.sort((a, b) => a.key.localeCompare(b.key)),
      }));
  }, [gradeSelectionInfo?.maxCells]);

  return (
    <div className={`sugar-view ${darkMode ? "dark" : ""}`}>
      <div className="sugar-toolbar">
        <h1>🧊 설탕 유리 배치 도우미</h1>
        <button type="button" className="ghost" onClick={toggleDarkMode}>
          {darkMode ? "☀️ 라이트 모드" : "🌙 다크 모드"}
        </button>
      </div>
      <p className="sugar-subtitle">
        빈칸 사진과 조각 사진을 업로드한 뒤, 격자를 직접 표시하고 보유 중인 조각을
        입력하면 가장 높은 균열 저항력을 계산합니다.
      </p>

      <div className="sugar-layout">
        <section className="sugar-card">
          <div className="sugar-section-title">1. 보드 설정</div>
          <div className="role-selector">
            <div className="role-selector-header">
              <span>역할군 선택</span>
              <span>사용 가능한 수식어 목록을 한 번에 확인하세요.</span>
            </div>
            <div className="role-button-row" role="group" aria-label="역할군 선택">
              {Object.entries(ROLE_LABELS).map(([value, label]) => {
                const modifiers = ROLE_MODIFIERS[value] || [];
                const modifierLabel = modifiers.length ? modifiers.join(" · ") : "수식어 정보 없음";
                return (
                  <button
                    key={value}
                    type="button"
                    className={`role-button ${playerRole === value ? "active" : ""}`}
                    aria-pressed={playerRole === value}
                    onClick={() => updateRole(value)}
                  >
                    <span className="role-button-label">{label}</span>
                    <span className="role-button-modifiers">{modifierLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="board-hint-row">
            <p className="board-hint">
              잠긴 칸(🔒)을 다시 누르면 열리고, 열린 칸을 다시 누르면 잠글 수 있습니다.
            </p>
            <button type="button" className="ghost small" onClick={handleResetOpenCells}>
              열린 칸 초기화
            </button>
          </div>

          <div className="sugar-grid-frame">
            <div
              className={`sugar-grid ${isSolving ? "busy" : ""}`}
              aria-busy={isSolving}
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              }}
            >
              {Array.from({ length: BOARD_SIZE }).map((_, row) =>
                Array.from({ length: BOARD_SIZE }).map((__, col) => renderCell(row, col))
              )}
            </div>
          </div>

          <div className="image-uploaders">
            <div>
              <label className="upload-label">
                빈칸 사진 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setBoardImage)} />
              </label>
              {boardImage && <img src={boardImage} alt="보드 미리보기" className="preview-image" />}
            </div>
            <div>
              <label className="upload-label">
                조각 사진 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setPiecesImage)} />
              </label>
              {piecesImage && <img src={piecesImage} alt="조각 미리보기" className="preview-image" />}
            </div>
          </div>
        </section>

        <section className="sugar-card inventory-card">
          <div className="sugar-section-title inventory-title-row">
            <span>2. 보유 중인 설탕 유리조각</span>
            <button type="button" className="ghost small" onClick={handleResetPieces}>
              보유 조각 초기화
            </button>
          </div>
          <div className="inventory-panels">
            <div className="inventory-box scrollable">
              <div className="piece-form">
                <div className="piece-form-row compact">
                  <label>
                    수식어 ({ROLE_LABELS[playerRole]})
                    <select
                      value={newPiece.modifier}
                      onChange={(e) => handleNewPieceChange("modifier", e.target.value)}
                    >
                      {modifiersForRole.map((modifier) => (
                        <option key={modifier} value={modifier}>
                          {modifier}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    등급
                    <select value={newPiece.grade} onChange={(e) => handleNewPieceChange("grade", e.target.value)}>
                      {gradeEntries.map(([value, info]) => (
                        <option key={value} value={value}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="piece-hint">
                  최대 {gradeSelectionInfo?.maxCells || "무제한"}칸 조각까지 담을 수 있습니다. 아래 모양을
                  누르면 즉시 목록에 추가됩니다.
                </p>
              </div>

              <div className="shape-groups">
                {allowedShapeGroups.length === 0 && (
                  <p className="empty-text">선택한 등급에서 사용할 수 있는 모양이 없습니다.</p>
                )}
                {allowedShapeGroups.map((group) => (
                  <div key={group.area} className="shape-group">
                    <div className="shape-group-title">{group.area}칸 조각</div>
                    <div className="shape-group-grid">
                      {group.shapes.map((shape) => (
                        <button
                          key={shape.key}
                          type="button"
                          className="shape-option add"
                          onClick={() => handleAddShape(shape.key)}
                          aria-label={`${group.area}칸 모양 추가`}
                        >
                          <ShapePreview shape={shape} color={GRADE_INFO[newPiece.grade]?.color} />
                          <span className="shape-area-label">+{group.area}칸</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="piece-hint">{ROLE_LABELS[playerRole]} 전용 조각만 추가됩니다.</p>
            </div>

            <div className="inventory-box scrollable" aria-live="polite">
              {playerPieces.length > 0 ? (
                <div className="piece-tray">
                  <div className="piece-tray-header">
                    <div>
                      전체 조각 미리보기 <span className="piece-tray-count">({playerPieces.length}개)</span>
                    </div>
                    <span>스크롤하여 더 보기</span>
                  </div>
                  <div className="piece-tray-scroll">
                    {playerPieces.map((piece) => {
                      const info = GRADE_INFO[piece.grade];
                      const shape = shapeLookup.get(piece.shapeKey);
                      return (
                        <div key={piece.id} className="piece-chip">
                          <ShapePreview shape={shape} color={info?.color || "#475569"} cellSize={12} />
                          <div className="piece-chip-meta">
                            <span className="piece-chip-grade" style={{ color: info?.color || "#475569" }}>
                              {info?.label}
                            </span>
                            <span className="piece-chip-detail">
                              {piece.modifier} · {shape?.area ?? "?"}칸 · x{piece.quantity || 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleRemovePiece(piece.id)}
                            aria-label={`${piece.modifier} 조각 삭제`}
                          >
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="empty-text">추가된 조각이 없습니다.</p>
              )}

              <div className="modifier-groups-row">
                {groupedPieces.map((group) => (
                  <div key={group.modifier} className="modifier-group">
                    <div className="modifier-group-header">
                      <span>{group.modifier}</span>
                      <span>{group.pieces.length}개</span>
                    </div>
                    <div className="piece-gallery">
                      {group.pieces.map((piece) => {
                        const info = GRADE_INFO[piece.grade];
                        const shape = shapeLookup.get(piece.shapeKey);
                        return (
                          <div key={piece.id} className="piece-card compact">
                            <ShapePreview shape={shape} color={info?.color || "#475569"} cellSize={14} />
                            <div className="piece-card-body">
                              <div className="piece-card-grade" style={{ color: info?.color || "#475569" }}>
                                {info?.label}
                              </div>
                              <div className="piece-card-details">
                                <span>{shape?.area ?? "?"}칸 · x{piece.quantity || 1}</span>
                                <span className="piece-card-modifier">{piece.modifier}</span>
                              </div>
                            </div>
                            <button type="button" className="ghost" onClick={() => handleRemovePiece(piece.id)}>
                              삭제
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sugar-actions">
        <button type="button" className="primary" onClick={handleSolve} disabled={isSolving}>
          {isSolving ? "계산 중..." : "최적 배치 계산"}
        </button>
        <p className="actions-hint">잠긴 칸과 보유 조각을 설정한 뒤 계산 버튼을 눌러주세요.</p>
      </div>

      {isSolving && (
        <div className="solve-progress" role="status" aria-live="polite">
          <span className="solve-spinner" aria-hidden />
          <span>최적 배치를 계산 중입니다...</span>
        </div>
      )}

      {solution && (
        <section className="sugar-card solution-card">
          <div className="sugar-section-title">3. 결과 요약</div>
          <div className="solution-summary">
            <div>
              <div className="solution-label">총 점수</div>
              <div className="solution-value">{formatScore(solution.totalScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">기본 점수</div>
              <div className="solution-value">{formatScore(solution.baseScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">추가 점수</div>
              <div className="solution-value">{formatScore(solution.bonusScore)} 점</div>
            </div>
          </div>

          {solution.bonusBreakdown.length > 0 ? (
            <ul className="bonus-list">
              {solution.bonusBreakdown.map((bonus) => (
                <li key={bonus.modifier}>
                  <strong>{bonus.modifier}</strong> {bonus.cells}칸 → +{formatScore(bonus.bonus)}점
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">추가 점수를 받은 수식어가 없습니다.</p>
          )}

          <div className="placement-list">
            {solution.placements.map((placement, index) => {
              const info = GRADE_INFO[placement.grade];
              return (
                <div key={placement.id} className="placement-item">
                  <div className="placement-index" style={{ backgroundColor: info?.color || "#475569" }}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="placement-label">{placement.label}</div>
                    <div className="placement-meta">
                      {placement.modifier} · {info?.label} · +{formatScore(placement.baseScore)}점
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isSolving && (
        <div className="solve-overlay" role="alert" aria-live="assertive">
          <div className="solve-overlay-card">
            <span className="solve-spinner large" aria-hidden />
            <div>
              <h3>최적 배치를 찾는 중입니다</h3>
              <p>보유 조각이 많을수록 계산에 조금 더 시간이 필요할 수 있어요.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SugarOptimizer;
