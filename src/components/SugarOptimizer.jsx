import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABELS, ROLE_MODIFIERS, GRADE_INFO } from "../constants/sugar";
import { SHAPE_OPTIONS } from "../utils/sugar/shapes";
// solveSugarBoard import 제거 (worker에서 사용)
import { ThemeContext } from "../context/ThemeContext";

// 초기 상태 정의 (App.js에서 전달된 상태가 없을 경우 사용)
const DEFAULT_PIECES = [];

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

const SugarOptimizer = ({ appState, setAppState }) => {
  const { darkMode, setDarkMode } = useContext(ThemeContext); // setDarkMode 사용

  // 상태를 App에서 관리하도록 변경
  const [localState, setLocalState] = useState(() => {
    // App에서 전달된 상태가 있으면 그것을 사용, 없으면 초기 상태 사용
    const initialBlocked = appState.blockedCells || createInitialBlockedCells();
    const initialNewPiece = {
      modifier: appState.newPiece.modifier || ROLE_MODIFIERS.dealer?.[0] || "",
      grade: appState.newPiece.grade || "rare",
    };
    return {
      blockedCells: initialBlocked,
      playerRole: appState.playerRole,
      pieces: appState.pieces,
      boardImage: appState.boardImage,
      piecesImage: appState.piecesImage,
      solution: appState.solution,
      isSolving: false, // isSolving은 로컬 상태로 유지
      newPiece: initialNewPiece,
    };
  });

  const pieceIdRef = useRef(appState.pieces.length > 0 ? Math.max(...appState.pieces.map(p => parseInt(p.id.split('-')[1]))) + 1 : 1);

  // 상태가 변경될 때마다 App으로 전달
  useEffect(() => {
    setAppState({
      blockedCells: localState.blockedCells,
      playerRole: localState.playerRole,
      pieces: localState.pieces,
      boardImage: localState.boardImage,
      piecesImage: localState.piecesImage,
      solution: localState.solution,
      newPiece: localState.newPiece,
    });
  }, [localState, setAppState]);

  const handleThemeSelect = (mode) => {
    if (mode === "dark") {
      setDarkMode(true); // useContext에서 받은 setDarkMode 사용
    } else if (mode === "light") {
      setDarkMode(false);
    }
  };

  useEffect(() => {
    setLocalState(prev => ({
      ...prev,
      newPiece: {
        ...prev.newPiece,
        modifier: ROLE_MODIFIERS[prev.playerRole]?.includes(prev.newPiece.modifier) ? prev.newPiece.modifier : ROLE_MODIFIERS[prev.playerRole]?.[0] || "",
      }
    }));
  }, [localState.playerRole]);

  const highlightMap = useMemo(() => {
    if (!localState.solution) return new Map();
    const map = new Map();
    localState.solution.placements.forEach((placement, index) => {
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
  }, [localState.solution]);

  const revokeUrl = (url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => () => revokeUrl(localState.boardImage), [localState.boardImage]);
  useEffect(() => () => revokeUrl(localState.piecesImage), [localState.piecesImage]);

  const handleImageChange = (event, field) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLocalState(prev => {
        revokeUrl(prev[field]);
        return { ...prev, [field]: null };
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalState(prev => {
      revokeUrl(prev[field]);
      return { ...prev, [field]: url };
    });
  };

  const updateRole = (value) => {
    setLocalState(prev => ({ ...prev, playerRole: value, solution: null }));
  };

  const toggleCell = (row, col) => {
    setLocalState(prev => {
      const next = new Set(prev.blockedCells);
      const key = cellKey(row, col);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...prev, blockedCells: next, solution: null };
    });
  };

  const handleResetOpenCells = () => {
    setLocalState(prev => ({ ...prev, blockedCells: createInitialBlockedCells(), solution: null }));
  };

  const handleNewPieceChange = (field, value) => {
    setLocalState(prev => ({ ...prev, newPiece: { ...prev.newPiece, [field]: value } }));
  };

  const handleAddShape = (shapeKey) => {
    const modifier = localState.newPiece.modifier;
    const grade = localState.newPiece.grade;
    if (!modifier || !grade) return;
    const gradeInfo = GRADE_INFO[grade];
    const shape = shapeEntries.find((entry) => entry.key === shapeKey);
    if (!shape) return;
    if (gradeInfo?.maxCells && shape.area > gradeInfo.maxCells) return;

    const piece = {
      id: `piece-${pieceIdRef.current}`,
      role: localState.playerRole,
      modifier,
      grade,
      shapeKey,
      quantity: 1,
    };
    pieceIdRef.current += 1;
    setLocalState(prev => ({ ...prev, pieces: [...prev.pieces, piece], solution: null }));
  };

  const handleRemovePiece = (id) => {
    setLocalState(prev => ({ ...prev, pieces: prev.pieces.filter((piece) => piece.id !== id), solution: null }));
  };

  const handleResetPieces = () => {
    pieceIdRef.current = 1; // pieceIdRef도 리셋
    setLocalState(prev => ({ ...prev, pieces: [], solution: null }));
  };

  // handleSolve 수정: Web Worker 사용
  const handleSolve = () => {
    setLocalState(prev => ({ ...prev, isSolving: true, solution: null })); // 기존 해를 지우고 시작

    const worker = new Worker(new URL("../utils/sugar/worker.js", import.meta.url));

    const blocked = Array.from(localState.blockedCells).map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row, col };
    });

    const normalizedPieces = localState.pieces.map((piece) => ({
      ...piece,
      quantity: Math.max(0, Number(piece.quantity) || 0),
    }));

    worker.postMessage({
      rows: BOARD_SIZE,
      cols: BOARD_SIZE,
      blocked,
      pieces: normalizedPieces,
      role: localState.playerRole,
    });

    worker.onmessage = (event) => {
      const { result } = event.data;
      setLocalState(prev => ({ ...prev, solution: result, isSolving: false }));
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      setLocalState(prev => ({ ...prev, isSolving: false }));
      worker.terminate();
    };
  };

  const renderCell = (row, col) => {
    const key = cellKey(row, col);
    const blocked = localState.blockedCells.has(key);
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

  const modifiersForRole = ROLE_MODIFIERS[localState.playerRole] || [];
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
    () => localState.pieces.filter((piece) => piece.role === localState.playerRole),
    [localState.pieces, localState.playerRole]
  );
  const playerPieceCount = useMemo(
    () => playerPieces.reduce((sum, piece) => sum + (Number(piece.quantity) || 0), 0),
    [playerPieces]
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

  const gradeSelectionInfo = GRADE_INFO[localState.newPiece.grade];
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
        <div className="theme-toggle" role="group" aria-label="테마 선택">
          <button
            type="button"
            className={`theme-chip ${!darkMode ? "active" : ""}`}
            onClick={() => handleThemeSelect("light")}
          >
            ☀️ 라이트
          </button>
          <button
            type="button"
            className={`theme-chip ${darkMode ? "active" : ""}`}
            onClick={() => handleThemeSelect("dark")}
          >
            🌙 다크
          </button>
        </div>
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
                    className={`role-button ${localState.playerRole === value ? "active" : ""}`}
                    aria-pressed={localState.playerRole === value}
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
              className={`sugar-grid ${localState.isSolving ? "busy" : ""}`}
              aria-busy={localState.isSolving}
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
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'boardImage')} />
              </label>
              {localState.boardImage && <img src={localState.boardImage} alt="보드 미리보기" className="preview-image" />}
            </div>
            <div>
              <label className="upload-label">
                조각 사진 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'piecesImage')} />
              </label>
              {localState.piecesImage && <img src={localState.piecesImage} alt="조각 미리보기" className="preview-image" />}
            </div>
          </div>
        </section>

        <section className="sugar-card inventory-card">
          <div className="sugar-section-title inventory-title-row">
            <span>
              2. 보유 중인 설탕 유리조각 <span className="inventory-count">({playerPieceCount}개)</span>
            </span>
            <button type="button" className="ghost small" onClick={handleResetPieces}>
              보유 조각 초기화
            </button>
          </div>
          <div className="inventory-panels">
            <div className="inventory-column">
              <div className="inventory-box scrollable">
                <div className="piece-form">
                  <div className="piece-form-row compact">
                    <label>
                      수식어 ({ROLE_LABELS[localState.playerRole]})
                      <select
                        value={localState.newPiece.modifier}
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
                      <select
                        value={localState.newPiece.grade}
                        onChange={(e) => handleNewPieceChange("grade", e.target.value)}
                      >
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
                          <ShapePreview shape={shape} color={GRADE_INFO[localState.newPiece.grade]?.color} />
                          <span className="shape-area-label">+{group.area}칸</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="piece-hint">{ROLE_LABELS[localState.playerRole]} 전용 조각만 추가됩니다.</p>
              </div>
            </div>

            <div className="inventory-column">
              <div className="inventory-box vertical-list" aria-live="polite">
                <div className="inventory-summary">
                  <span>수식어별로 조각을 확인하세요.</span>
                  <span>필요 시 스크롤하여 비교하세요.</span>
                </div>
                {groupedPieces.length > 0 ? (
                  <div className="modifier-groups-column">
                    {groupedPieces.map((group) => (
                      <div key={group.modifier} className="modifier-group">
                        <div className="modifier-group-header">
                          <span>{group.modifier}</span>
                          <span>{group.pieces.length}개</span>
                        </div>
                        <div className="piece-gallery" role="list">
                          {group.pieces.map((piece) => {
                            const info = GRADE_INFO[piece.grade];
                            const shape = shapeLookup.get(piece.shapeKey);
                            return (
                              <div key={piece.id} className="piece-card compact" role="listitem">
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
                ) : (
                  <p className="empty-text">추가된 조각이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sugar-actions">
        <button type="button" className="primary" onClick={handleSolve} disabled={localState.isSolving}>
          {localState.isSolving ? "계산 중..." : "최적 배치 계산"}
        </button>
        <p className="actions-hint">잠긴 칸과 보유 조각을 설정한 뒤 계산 버튼을 눌러주세요.</p>
      </div>

      {localState.isSolving && (
        <div className="solve-progress" role="status" aria-live="polite">
          <span className="solve-spinner" aria-hidden />
          <span>최적 배치를 계산 중입니다...</span>
        </div>
      )}

      {localState.solution && (
        <section className="sugar-card solution-card">
          <div className="sugar-section-title">3. 결과 요약</div>
          <div className="solution-summary">
            <div>
              <div className="solution-label">총 점수</div>
              <div className="solution-value">{formatScore(localState.solution.totalScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">기본 점수</div>
              <div className="solution-value">{formatScore(localState.solution.baseScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">추가 점수</div>
              <div className="solution-value">{formatScore(localState.solution.bonusScore)} 점</div>
            </div>
          </div>

          {localState.solution.bonusBreakdown.length > 0 ? (
            <ul className="bonus-list">
              {localState.solution.bonusBreakdown.map((bonus) => (
                <li key={bonus.modifier}>
                  <strong>{bonus.modifier}</strong> {bonus.cells}칸 → +{formatScore(bonus.bonus)}점
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">추가 점수를 받은 수식어가 없습니다.</p>
          )}

          <div className="placement-list">
            {localState.solution.placements.map((placement, index) => {
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

      {localState.isSolving && (
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